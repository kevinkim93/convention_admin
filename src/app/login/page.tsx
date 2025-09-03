'use client';

import { auth } from '@/lib/firebase.client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const nextPath = qs.get('next') || '/';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginGoogle() {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      // ✅ 세션 쿠키 발급
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        router.replace(nextPath);
      } else {
        setError("세션 발급 실패");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 shadow rounded w-80">
        <h1 className="text-xl font-bold mb-4">로그인</h1>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={loginGoogle}
          disabled={loading}
          className="w-full border p-2 rounded bg-gray-100 hover:bg-gray-200"
        >
          {loading ? '로그인 중…' : 'Google로 로그인'}
        </button>
      </div>
    </main>
  );
}
