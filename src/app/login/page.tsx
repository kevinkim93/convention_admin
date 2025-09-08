'use client';

import { auth } from '@/lib/firebase.client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

/** 외부 URL로 리디렉션되는 걸 방지하는 간단한 필터 */
function safeNext(p: string | null) {
  if (!p) return '/';
  // 절대 URL 또는 프로토콜이 포함된 경우 차단
  if (p.startsWith('http://') || p.startsWith('https://')) return '/';
  // 슬래시로 시작하지 않으면 루트로
  if (!p.startsWith('/')) return '/';
  return p;
}

function LoginInner() {
  const router = useRouter();
  const qs = useSearchParams();
  const nextPath = safeNext(qs.get('next'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginGoogle() {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      // ✅ 세션 쿠키 발급 (서버 route: /api/auth/session)
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        // 로그인 성공 → next로 이동
        router.replace(nextPath);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || '세션 발급 실패');
      }
    } catch (e: any) {
      setError(e?.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 shadow rounded w-80">
        <h1 className="text-xl font-bold mb-4">로그인</h1>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={loginGoogle}
          disabled={loading}
          className="w-full border p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
          aria-busy={loading}
        >
          {loading ? '로그인 중…' : 'Google로 로그인'}
        </button>

        {/* 선택: next 미리 보여주기 */}
        <p className="mt-3 text-xs text-gray-500">
          로그인 후 이동: <span className="font-mono">{nextPath}</span>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // 🔑 useSearchParams()는 CSR 전환을 보장하기 위해 Suspense로 감싸야 합니다.
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">로딩 중…</div>
      </main>
    }>
      <LoginInner />
    </Suspense>
  );
}
