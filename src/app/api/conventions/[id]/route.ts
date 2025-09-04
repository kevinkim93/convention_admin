import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase.admin";
import { Timestamp } from "firebase-admin/firestore";

/** 공통 인증 */
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

/** PATCH: 이름/설명/기간 업데이트 (세션 범위 검증 포함) */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const id = params.id;
  const docRef = adminDb.collection("conventions").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }

  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const startDateISO = body.startDateISO;
  const endDateISO = body.endDateISO;

  if (!name) return NextResponse.json({ error: "name-required" }, { status: 400 });
  if (!startDateISO || !endDateISO) {
    return NextResponse.json({ error: "date-range-required" }, { status: 400 });
  }

  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "invalid-dates" }, { status: 400 });
  }
  const startOfStart = new Date(start); startOfStart.setHours(0,0,0,0);
  const endOfEnd = new Date(end); endOfEnd.setHours(23,59,59,999);

  // 세션들이 새 기간을 벗어나는지 검증
  const sSnap = await docRef.collection("sessions").select("dateTime").get();
  let outOfRange = 0;
  sSnap.docs.forEach((d) => {
    const ts = d.get("dateTime") as Timestamp | undefined;
    const t = ts?.toDate();
    if (!t) return;
    if (t < startOfStart || t > endOfEnd) outOfRange++;
  });
  if (outOfRange > 0) {
    return NextResponse.json(
      { error: `sessions-out-of-range:${outOfRange}` },
      { status: 400 }
    );
  }

  try {
    await docRef.update({
      name,
      description,
      startDate: Timestamp.fromDate(startOfStart),
      endDate: Timestamp.fromDate(endOfEnd),
      // updatedAt: Timestamp.now(), // 필요하면 추가
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[convention patch]", e?.message || e);
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
}

/** DELETE: 컨벤션 + 하위 세션(+registrations) 삭제 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const id = params.id;
  const docRef = adminDb.collection("conventions").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });

  try {
    // 세션 및 registrations 삭제 (작은 규모 가정)
    const sessionsSnap = await docRef.collection("sessions").get();
    for (const s of sessionsSnap.docs) {
      // registrations 서브컬렉션도 있으면 삭제
      const regsSnap = await s.ref.collection("registrations").get().catch(() => null);
      if (regsSnap) {
        const batch1 = adminDb.batch();
        regsSnap.docs.forEach((r) => batch1.delete(r.ref));
        await batch1.commit();
      }
      await s.ref.delete();
    }
    await docRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[convention delete]", e?.message || e);
    return NextResponse.json({ error: "delete-failed" }, { status: 500 });
  }
}
