import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import type { Query } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RegistrationsChart from "./_components/RegistrationsChart";
import { Mail, Users, CalendarClock, CalendarDays, UserCheck } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* 날짜 유틸 */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(date: Date) {
  return date.toISOString().slice(5, 10); // "MM-DD"
}

/* 안전 count: 인덱스 없으면 0 반환 */
async function safeCount(q: Query, label: string) {
  try {
    const agg = await q.count().get();
    return Number(agg.data().count || 0);
  } catch (e: any) {
    console.error(`[index?] ${label}`, e?.message || e);
    try {
      const snap = await q.select("__name__").get();
      return snap.size;
    } catch (e2: any) {
      console.error(`[fallback failed] ${label}`, e2?.message || e2);
      return 0;
    }
  }
}

/* 오늘 세션/참석자 합산: collectionGroup 우선, 실패 시 per-convention fallback */
async function getTodaySessionsAndParticipants(todayStart: Date, tomorrowStart: Date) {
  const s = Timestamp.fromDate(todayStart);
  const e = Timestamp.fromDate(tomorrowStart);

  // 1) collectionGroup 우선
  try {
    const q = adminDb
      .collectionGroup("sessions")
      .where("dateTime", ">=", s)
      .where("dateTime", "<", e);

    const snap = await q.select("participants").get();
    const count = snap.size;
    const participants = snap.docs.reduce((acc, d) => {
      const arr = (d.get("participants") as unknown[]) || [];
      return acc + (Array.isArray(arr) ? arr.length : 0);
    }, 0);

    return { count, participants };
  } catch {
    console.warn("[sessions today] collectionGroup 인덱스 없음 → per-convention fallback");
  }

  // 2) per-convention fallback
  try {
    const convSnap = await adminDb.collection("conventions").select("__name__").get();
    let count = 0;
    let participants = 0;

    for (const c of convSnap.docs) {
      const sSnap = await c.ref
        .collection("sessions")
        .where("dateTime", ">=", s)
        .where("dateTime", "<", e)
        .get();

      count += sSnap.size;
      for (const d of sSnap.docs) {
        const arr = (d.get("participants") as unknown[]) || [];
        participants += Array.isArray(arr) ? arr.length : 0;
      }
    }
    return { count, participants };
  } catch (e2: any) {
    console.error("[sessions today fallback] 실패:", e2?.message || e2);
    return { count: 0, participants: 0 };
  }
}

/* 최근 세션 25개 가져오고(정렬), UI에선 5행 높이만 보여줌 */
async function getRecentSessions(limitN = 25) {
  // 1) collectionGroup + orderBy 시도
  try {
    const snap = await adminDb
      .collectionGroup("sessions")
      .orderBy("dateTime", "desc")
      .limit(limitN)
      .select("title", "dateTime", "participants")
      .get();

    return snap.docs.map((d) => {
      const data = d.data() as any;
      const dt = (data.dateTime as Timestamp | undefined)?.toDate();
      const participants = Array.isArray(data.participants) ? data.participants.length : 0;
      return {
        id: d.id,
        title: data.title ?? "(제목 없음)",
        date: dt,
        dateText: dt
          ? dt.toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
        participants,
      };
    });
  } catch {
    console.warn("[recent sessions] collectionGroup 인덱스 없음 → per-convention fallback");
  }

  // 2) per-convention fallback: 각 컨벤션에서 최신 세션 모아서 합치고 상위 limitN만
  const all: {
    id: string;
    title: string;
    date?: Date;
    dateText: string;
    participants: number;
  }[] = [];
  try {
    const convSnap = await adminDb.collection("conventions").select("__name__").get();
    for (const c of convSnap.docs) {
      const sSnap = await c.ref
        .collection("sessions")
        .orderBy("dateTime", "desc")
        .limit(limitN)
        .get();

      sSnap.docs.forEach((d) => {
        const data = d.data() as any;
        const dt = (data.dateTime as Timestamp | undefined)?.toDate();
        const participants = Array.isArray(data.participants) ? data.participants.length : 0;
        all.push({
          id: d.id,
          title: data.title ?? "(제목 없음)",
          date: dt,
          dateText: dt
            ? dt.toLocaleString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          participants,
        });
      });
    }
    all.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return all.slice(0, limitN);
  } catch (e2: any) {
    console.error("[recent sessions fallback] 실패:", e2?.message || e2);
    return [];
  }
}

export default async function AdminPage() {
  /* 1) SSR 보호 */
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login?next=/admin");

  const decoded = await adminAuth.verifySessionCookie(sessionCookie!, true);

  const allowed = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) {
    redirect("/");
  }

  /* 2) 시간 범위 */
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  const chartStart = addDays(todayStart, -6);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(chartStart, i));

  /* 3) 집계 */
  const todayRegistrations = await safeCount(
    adminDb
      .collection("users")
      .where("createdAt", ">=", Timestamp.fromDate(todayStart))
      .where("createdAt", "<", Timestamp.fromDate(tomorrowStart)),
    "users:today"
  );

  const totalUsers = await safeCount(adminDb.collection("users"), "users:total");
  const totalConventions = await safeCount(adminDb.collection("conventions"), "conventions:total");

  const { count: todaySessions, participants: todayParticipants } =
    await getTodaySessionsAndParticipants(todayStart, tomorrowStart);

  // 최근 등록자(25 가져오고 UI는 5행 높이만)
  let recentUsers:
    | { id: string; email: string; name: string; createdAtText: string }[]
    | [] = [];
  try {
    const recentSnap = await adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(25)
      .get();
    recentUsers = recentSnap.docs.map((d) => {
      const data = d.data() as any;
      const ts = data.createdAt as Timestamp | undefined;
      const createdAt = ts ? ts.toDate() : undefined;
      return {
        id: d.id,
        email: data.email ?? "",
        name: data.name ?? "",
        createdAtText: createdAt
          ? createdAt.toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      };
    });
  } catch (e: any) {
    console.error("[recent users] 실패:", e?.message || e);
    recentUsers = [];
  }

  // 최근 세션(25 가져오고 UI는 5행 높이만)
  const recentSessions = await getRecentSessions(25);

  // 최근 7일 등록 추이
  let chartData: { date: string; count: number }[] = [];
  try {
    const chartSnap = await adminDb
      .collection("users")
      .where("createdAt", ">=", Timestamp.fromDate(chartStart))
      .get();

    const buckets: Record<string, number> = {};
    for (const d of days) buckets[ymd(d)] = 0;

    chartSnap.docs.forEach((doc) => {
      const ts = (doc.data() as any).createdAt as Timestamp | undefined;
      if (!ts) return;
      const k = ymd(startOfDay(ts.toDate()));
      if (buckets[k] !== undefined) buckets[k] += 1;
    });

    chartData = days.map((d) => ({ date: ymd(d), count: buckets[ymd(d)] || 0 }));
  } catch (e: any) {
    console.error("[chart users] 실패:", e?.message || e);
    chartData = days.map((d) => ({ date: ymd(d), count: 0 }));
  }

  /* 4) UI */
  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <KpiCard title="오늘 신규 등록" value={todayRegistrations} icon={<Mail size={18} />} />
        <KpiCard title="총 유저 수" value={totalUsers} icon={<Users size={18} />} />
        <KpiCard title="총 컨벤션 수" value={totalConventions} icon={<CalendarDays size={18} />} />
      </div>

      {/* 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 7일 등록 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <RegistrationsChart data={chartData} />
        </CardContent>
      </Card>

      {/* 최근 리스트들: 좌/우 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 최근 등록자 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 등록자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[260px] overflow-y-auto pr-1">
              <ul className="divide-y">
                {recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                        {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{u.name || u.email || "(이름 없음)"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{u.createdAtText}</div>
                  </li>
                ))}
                {recentUsers.length === 0 && (
                  <div className="text-sm text-gray-500 py-6">아직 등록자가 없습니다.</div>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 최근 세션 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 등록한 세션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[260px] overflow-y-auto pr-1">
              <ul className="divide-y">
                {recentSessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                        {(s.title || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-gray-500">{s.dateText}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      참가자 <span className="font-semibold">{s.participants}</span>명
                    </div>
                  </li>
                ))}
                {recentSessions.length === 0 && (
                  <div className="text-sm text-gray-500 py-6">아직 세션이 없습니다.</div>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* 소형 KPI 카드 */
function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
