'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBusyFetch } from "@/lib/busyFetch";
import { Loader2 } from "lucide-react";

export default function AddSessionForm({
  conventionId,
  startDate,
  endDate,
}: { conventionId: string; startDate?: string; endDate?: string }) {
  const router = useRouter();
  const busyFetch = useBusyFetch();
  const [title, setTitle] = useState("");
  const [dateTimeISO, setDateTimeISO] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null); setErr(null);

    try {
      const res = await busyFetch(`/api/admin/conventions/${conventionId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dateTimeISO, maxParticipants }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error || "생성 실패"); return; }
      setMsg("세션이 추가되었습니다.");
      setTitle(""); setDateTimeISO(""); setMaxParticipants(0);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setErr(e?.message || "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || isPending;

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
      <div className="md:col-span-2 flex flex-col gap-2">
        <label className="text-sm font-medium">세션 제목 *</label>
        <input
          className="border rounded px-3 py-2"
          placeholder="예) 오프닝"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-3 flex flex-col gap-2">
        <label className="text-sm font-medium">세션 시간 *</label>
        <input
          type="datetime-local"
          className="border rounded px-3 py-2"
          value={dateTimeISO}
          onChange={(e) => setDateTimeISO(e.target.value)}
          required
          min={startDate ? `${startDate}T00:00` : undefined}
          max={endDate ? `${endDate}T23:59` : undefined}
        />
        {(startDate && endDate) && (
          <div className="text-xs text-gray-500">세션 시간은 {startDate} 00:00 ~ {endDate} 23:59 사이</div>
        )}
      </div>
      <div className="md:col-span-1 flex flex-col gap-2">
        <label className="text-sm font-medium">정원</label>
        <input
          type="number"
          min={0}
          className="border rounded px-3 py-2"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(Number(e.target.value))}
        />
      </div>

      {err && <div className="md:col-span-6 text-sm text-red-600">{err}</div>}
      {msg && <div className="md:col-span-6 text-sm text-green-600">{msg}</div>}

      <div className="md:col-span-6">
        <button
          type="submit"
          disabled={disabled}
          aria-busy={disabled}
          className="border rounded px-4 py-2 bg-black text-white disabled:opacity-60 inline-flex items-center gap-2"
        >
          {disabled && <Loader2 className="h-4 w-4 animate-spin" />}
          {disabled ? "추가 중…" : "세션 추가"}
        </button>
      </div>
    </form>
  );
}
