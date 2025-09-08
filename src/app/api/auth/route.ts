import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.admin";

export async function POST(req: Request) {
  const { idToken } = await req.json();
  try {
    const expiresIn = 1000 * 60 * 60 * 12; // 12시간
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      maxAge: expiresIn / 1000,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
