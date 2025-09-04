import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConventionEditForm from "./_components/ConventionEditForm";
import AddSessionForm from "./_components/AddSessionForm";
import DeleteSessionButton from "./_components/DeleteSessionButton";

export const dynamic = "force-dynamic";

function toDateInputValue(ts?: Timestamp) {
  if (!ts) return "";
  const d = ts.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fmtDateTime(ts?: Timestamp) {
  if (!ts) return "-";
  const d = ts.toDate();
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function ConventionEditPage({
  params,
}: {
  // ✅ params는 Promise로 받고, 내부에서 await 해서 꺼내 쓴다
  params: Promise<{ id: string }>;
}) {
  // -------- 보호(SSR 인증) --------
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const { id } = await params; // ✅ 먼저 await
  if (!sessionCookie) redirect(`/login?next=/admin/conventions/${id}`);

  const decoded = await adminAuth.verifySessionCookie(sessionCookie!, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map((s) => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) redirect("/");

  // -------- 데이터 로드 --------
  const docRef = adminDb.collection("conventions").doc(id); // ❌ 불필요한 await 제거
  const doc = await docRef.get();
  if (!doc.exists) redirect("/admin/conventions");

  const data = doc.data() as any;
  const startDate = data.startDate as Timestamp | undefined;
  const endDate = data.endDate as Timestamp | undefined;

  // 세션 목록
  const sessionsSnap = await docRef.collection("sessions").orderBy("dateTime", "asc").get();
  const sessions = sessionsSnap.docs.map((d) => {
    const s = d.data() as any;
    return {
      id: d.id,
      title: s.title ?? "(제목 없음)",
      dateTime: s.dateTime as Timestamp | undefined,
      participantsCount: Number(s.participantsCount ?? 0),
      maxParticipants: typeof s.maxParticipants === "number" ? s.maxParticipants : undefined,
    };
  });

  const initial = {
    id: doc.id,
    name: data.name ?? "",
    description: data.description ?? "",
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
  };

  // -------- UI --------
  return (
    <div className="space-y-6">
      {/* 컨벤션 기본 정보 수정 */}
      <Card>
        <CardHeader>
          <CardTitle>컨벤션 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <ConventionEditForm initial={initial} />
        </CardContent>
      </Card>

      {/* 세션 추가 */}
      <Card>
        <CardHeader>
          <CardTitle>세션 추가</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ✅ 여기서도 params.id 대신 위에서 await 받은 id 사용 */}
          <AddSessionForm conventionId={id} startDate={initial.startDate} endDate={initial.endDate} />
        </CardContent>
      </Card>

      {/* 세션 목록 + 삭제 */}
      <Card>
        <CardHeader>
          <CardTitle>세션 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-gray-500">{fmtDateTime(s.dateTime)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-600">
                    참가자 <span className="font-semibold">{s.participantsCount}</span>
                    {typeof s.maxParticipants === "number" && <> / {s.maxParticipants}</>} 명
                  </div>
                  {/* ✅ params.id 대신 id 사용 */}
                  <DeleteSessionButton conventionId={id} sessionId={s.id} />
                </div>
              </li>
            ))}
            {sessions.length === 0 && <div className="text-sm text-gray-500 py-6">세션이 없습니다.</div>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
