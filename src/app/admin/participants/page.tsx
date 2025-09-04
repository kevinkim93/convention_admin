import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtDate(ts?: Timestamp) {
  if (!ts) return "-";
  const d = ts.toDate();
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ✅ 반드시 default export 함수가 JSX를 반환해야 합니다.
export default async function ParticipantsPage() {
  // SSR 보호 (세션 쿠키 + 허용 이메일)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login?next=/admin/participants");

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map((s) => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) redirect("/");

  // 간단 리스트 (필요시 나중에 검색/필터/페이지네이션 추가)
  const snap = await adminDb
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(30)
    .get()
    .catch(() => null);

  const rows =
    snap?.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        email: data.email ?? "",
        name: data.name ?? "",
        createdAt: data.createdAt as Timestamp | undefined,
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>참여자 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 px-4">이메일</th>
                  <th className="py-2 px-4">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">{u.name || "(이름 없음)"}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      아직 등록된 사용자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
