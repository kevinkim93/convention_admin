'use client';

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useBusyFetch } from "@/lib/busyFetch";
import { Loader2 } from "lucide-react";

export default function DeleteConventionButton({ id }: { id: string }) {
  const router = useRouter();
  const busyFetch = useBusyFetch();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onDelete() {
    if (!confirm("정말 삭제하시겠어요? 관련 세션/등록 데이터가 함께 삭제될 수 있습니다.")) return;
    setLoading(true);
    try {
      const res = await busyFetch(`/api/admin/conventions/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "삭제 실패");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || isPending;

  return (
    <button
      onClick={onDelete}
      disabled={disabled}
      aria-busy={disabled}
      className="border border-red-300 text-red-600 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-60 inline-flex items-center gap-2"
    >
      {disabled && <Loader2 className="h-4 w-4 animate-spin" />}
      {disabled ? "삭제 중…" : "삭제"}
    </button>
  );
}
