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
  if (!decoded.email || !allowed.includes(decoded.email)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const docRef = adminDb.collection("conventions").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 });

  try {
    await docRef.update({
      name,
      description: String(body.description ?? "").trim(),
      startDate: Timestamp.fromDate(new Date(body.startDateISO)),
      endDate: Timestamp.fromDate(new Date(body.endDateISO)),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "write-failed", detail: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  try {
    await adminDb.collection("conventions").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "delete-failed", detail: e?.message }, { status: 500 });
  }
}
