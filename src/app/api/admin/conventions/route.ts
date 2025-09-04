import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewSession = {
  title: string;
  dateTimeISO: string; // 'YYYY-MM-DDTHH:mm' or ISO string
  maxParticipants: number;
};

type Payload = {
  name: string;
  description?: string;
  startDateISO: string; // 'YYYY-MM-DD'
  endDateISO: string;   // 'YYYY-MM-DD'
  sessions: NewSession[];
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return { ok: false as const, status: 401 };

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map(s => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function POST(req: Request) {
  // 1) 인증/권한
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  // 2) 입력 파싱
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const { name, description = "", startDateISO, endDateISO, sessions = [] } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name-required" }, { status: 400 });
  if (!startDateISO || !endDateISO)
    return NextResponse.json({ error: "date-range-required" }, { status: 400 });

  // 3) 날짜 변환/검증
  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime()))
    return NextResponse.json({ error: "invalid-dates" }, { status: 400 });

  const startOfStart = new Date(start); startOfStart.setHours(0,0,0,0);
  const endOfEnd = new Date(end);       endOfEnd.setHours(23,59,59,999);

  // 4) 세션 검증
  for (const s of sessions) {
    if (!s.title?.trim())
      return NextResponse.json({ error: "session-title-required" }, { status: 400 });

    const dt = new Date(s.dateTimeISO);
    if (isNaN(dt.getTime()))
      return NextResponse.json({ error: "session-datetime-invalid" }, { status: 400 });

    if (dt < startOfStart || dt > endOfEnd)
      return NextResponse.json({ error: "session-out-of-range" }, { status: 400 });

    if (typeof s.maxParticipants !== "number" || s.maxParticipants < 0)
      return NextResponse.json({ error: "session-maxParticipants-invalid" }, { status: 400 });
  }

  // 5) 쓰기(batch)
  const batch = adminDb.batch();
  const convRef = adminDb.collection("conventions").doc();

  batch.set(convRef, {
    name: name.trim(),
    description: description.trim(),
    startDate: Timestamp.fromDate(startOfStart),
    endDate: Timestamp.fromDate(endOfEnd),
    createdAt: Timestamp.now(),
  });

  for (const s of sessions) {
    const dt = new Date(s.dateTimeISO);
    const sessRef = convRef.collection("sessions").doc();
    batch.set(sessRef, {
      title: s.title.trim(),
      dateTime: Timestamp.fromDate(dt),
      maxParticipants: s.maxParticipants,
      participantsCount: 0,
      createdAt: Timestamp.now(),
    });
  }

  try {
    await batch.commit();
    return NextResponse.json({ ok: true, id: convRef.id }, { status: 201 });
  } catch (e: any) {
    console.error("[convention create] write-failed:", e?.message || e);
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
}
