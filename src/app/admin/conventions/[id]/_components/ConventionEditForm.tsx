'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConventionEditForm({
  initial,
}: {
  initial: { id: string; name: string; description: string; startDate: string; endDate: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/conventions/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, startDateISO: startDate, endDateISO: endDate }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || "수정 실패");
        return;
      }
      setMsg("저장되었습니다.");
      setTimeout(() => router.replace("/admin/conventions"), 500);
    } catch (e: any) {
      setErr(e?.message || "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">이름 *</label>
        <input
          className="border rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">설명</label>
        <input
          className="border rounded px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="간단한 설명"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">시작일 *</label>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">종료일 *</label>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>

      {err && <div className="md:col-span-2 text-sm text-red-600">{err}</div>}
      {msg && <div className="md:col-span-2 text-sm text-green-600">{msg}</div>}

      <div className="md:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="border rounded px-4 py-2 bg-black text-white disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border rounded px-4 py-2"
        >
          취소
        </button>
      </div>
    </form>
  );
}
