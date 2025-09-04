import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase.admin";

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

export async function DELETE(_req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const convRef = adminDb.collection("conventions").doc(params.id);
  const sessRef = convRef.collection("sessions").doc(params.sessionId);
  const sess = await sessRef.get();
  if (!sess.exists) return NextResponse.json({ error: "session-not-found" }, { status: 404 });

  try {
    const regsSnap = await sessRef.collection("registrations").get().catch(() => null);
    if (regsSnap) {
      const batch = adminDb.batch();
      regsSnap.docs.forEach((r) => batch.delete(r.ref));
      await batch.commit();
    }
    await sessRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[session delete]", e?.message || e);
    return NextResponse.json({ error: "delete-failed" }, { status: 500 });
  }
}
