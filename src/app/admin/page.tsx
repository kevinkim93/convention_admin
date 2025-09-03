import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase.admin";

export const dynamic = "force-dynamic"; // SSR 강제

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login?next=/admin");

  const decoded = await adminAuth.verifySessionCookie(sessionCookie!, true);

  // ✅ 허용된 이메일만 관리자
  const allowed = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) {
    redirect("/login?next=/admin"); // 관리자 이메일 아니면 홈으로
  }


  try {
    // 여기까지 통과 → 관리자
    const { users } = await adminAuth.listUsers(20);

    return (
      <main className="p-6">
        <h1 className="text-xl font-bold">관리자 페이지</h1>
        <ul>
          {users.map((u) => (
            <li key={u.uid}>
              {u.email} {allowed.includes(u.email==undefined?"":u.email)? "(관리자)" : ""}
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (err) {
    console.error("검증 실패:", err);
    redirect("/login?next=/admin");
  }
}
