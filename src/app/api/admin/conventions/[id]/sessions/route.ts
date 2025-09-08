import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return { ok: false as const, status: 401 };
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map((s) => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }   // ✅ Promise로 받고
) {
  const { id } = await params;                       // ✅ await으로 꺼내서 사용

  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const convRef = adminDb.collection("conventions").doc(id);
  const conv = await convRef.get();
  if (!conv.exists) return NextResponse.json({ error: "convention-not-found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }

  const title = String(body.title ?? "").trim();
  const dateTimeISO = body.dateTimeISO as string | undefined;
  const maxParticipants = Number(body.maxParticipants ?? 0);

  if (!title) return NextResponse.json({ error: "title-required" }, { status: 400 });
  if (!dateTimeISO) return NextResponse.json({ error: "datetime-required" }, { status: 400 });

  const dt = new Date(dateTimeISO);
  if (isNaN(dt.getTime())) return NextResponse.json({ error: "datetime-invalid" }, { status: 400 });

  try {
    const ref = await convRef.collection("sessions").add({
      title,
      dateTime: Timestamp.fromDate(dt),
      maxParticipants: isNaN(maxParticipants) || maxParticipants < 0 ? 0 : maxParticipants,
      participantsCount: 0,
      createdAt: Timestamp.now(),
    });
    return NextResponse.json({ ok: true, sessionId: ref.id }, { status: 201 });
  } catch (e: any) {
    console.error("[session create]", e?.message || e);
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
}
