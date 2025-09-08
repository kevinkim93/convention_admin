// src/app/api/participants/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase.admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const allowed = process.env.ADMIN_EMAILS?.split(",").map((s) => s.trim()) ?? [];
  if (!decoded.email || !allowed.includes(decoded.email)) return null;
  return decoded;
}

// 참여자 전체 목록 조회
export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const snap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(50).get();
    const users = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    console.error("[participants GET]", e);
    return NextResponse.json({ error: "fetch-failed" }, { status: 500 });
  }
}
