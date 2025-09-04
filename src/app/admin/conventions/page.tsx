import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DeleteConventionButton from "./_components/DeleteConventionButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* 유틸 */
function fmtDate(ts?: Timestamp) {
  if (!ts) return "-";
  const d = ts.toDate();
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(ts?: Timestamp) {
  if (!ts) return "-";
  const d = ts.toDate();
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function ConventionsListPage() {
  // 보호
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login?next=/admin/conventions");

  const decoded = await adminAuth.verifySessionCookie(sessionCookie!, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map((s) => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) redirect("/");

  // 목록 로드
  const snap =
    (await adminDb.collection("conventions").orderBy("createdAt", "desc").get().catch(() => null)) ||
    (await adminDb.collection("conventions").orderBy("startDate", "desc").get());

  // 각 컨벤션의 세션 목록 + 참가자 합산
  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as any;
      const sessionsSnap = await d.ref.collection("sessions").orderBy("dateTime", "asc").get();
      const sessions = sessionsSnap.docs.map((s) => {
        const sd = s.data() as any;
        return {
          id: s.id,
          title: sd.title ?? "(제목 없음)",
          dateTime: sd.dateTime as Timestamp | undefined,
          participantsCount: Number(sd.participantsCount ?? 0),
          maxParticipants: typeof sd.maxParticipants === "number" ? sd.maxParticipants : undefined,
        };
      });
      const totalParticipants = sessions.reduce((a, b) => a + (b.participantsCount || 0), 0);

      return {
        id: d.id,
        name: data.name ?? "(제목 없음)",
        description: data.description ?? "",
        startDate: data.startDate as Timestamp | undefined,
        endDate: data.endDate as Timestamp | undefined,
        createdAt: data.createdAt as Timestamp | undefined,
        sessions,
        totalParticipants,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">컨벤션 목록</h1>
        <Link className="border rounded px-3 py-2 bg-black text-white hover:opacity-90" href="/admin/conventions/new">
          + 컨벤션 생성
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>총 {rows.length.toLocaleString()}개</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 px-4">기간</th>
                  <th className="py-2 px-4">총 참가자</th>
                  <th className="py-2 pl-4 text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <>
                    {/* 메인 행 */}
                    <tr key={r.id}>
                      <td className="py-3 pr-4 align-top">
                        <div className="font-medium">{r.name}</div>
                        {r.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {fmtDate(r.startDate)} ~ {fmtDate(r.endDate)}
                      </td>
                      <td className="py-3 px-4 align-top">{r.totalParticipants.toLocaleString()}명</td>
                      <td className="py-3 pl-4 align-top">
                        <div className="flex gap-2 justify-end">
                          <Link
                            href={`/admin/conventions/${r.id}`}
                            className="border rounded px-2 py-1 hover:bg-gray-50"
                          >
                            수정
                          </Link>
                          <DeleteConventionButton id={r.id} />
                        </div>
                      </td>
                    </tr>

                    {/* 세션 디테일 행 */}
                    <tr>
                      <td colSpan={4} className="py-2 pl-6 pr-2 bg-gray-50">
                        <ul className="divide-y">
                          {r.sessions.map((s) => (
                            <li key={s.id} className="flex items-center justify-between py-2">
                              <div>
                                <div className="text-sm font-medium">{s.title}</div>
                                <div className="text-xs text-gray-500">{fmtDateTime(s.dateTime)}</div>
                              </div>
                              <div className="text-xs text-gray-600">
                                참가자 <span className="font-semibold">{s.participantsCount.toLocaleString()}</span>
                                {typeof s.maxParticipants === "number" && (
                                  <> / {s.maxParticipants.toLocaleString()}</>
                                )}{" "}
                                명
                              </div>
                            </li>
                          ))}
                          {r.sessions.length === 0 && (
                            <div className="text-xs text-gray-500 py-2">세션이 없습니다.</div>
                          )}
                        </ul>
                      </td>
                    </tr>
                  </>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      아직 컨벤션이 없습니다. “컨벤션 생성”을 눌러 추가하세요.
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
