'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionDraft = {
  title: string;
  dateTimeISO: string; // 'YYYY-MM-DDTHH:mm'
  maxParticipants: number;
};

export default function ConventionCreatePage() {
  const router = useRouter();

  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(""); // 'YYYY-MM-DD'
  const [endDate, setEndDate] = useState("");     // 'YYYY-MM-DD'
  const [sessions, setSessions] = useState<SessionDraft[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function addSession() {
    setSessions(s => [
      ...s,
      { title: "", dateTimeISO: "", maxParticipants: 0 }
    ]);
  }

  function updateSession(idx: number, patch: Partial<SessionDraft>) {
    setSessions(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeSession(idx: number) {
    setSessions(prev => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOkMsg(null);

    // 최소 검증 (클라이언트)
    if (!name.trim()) {
      setError("컨벤션 이름을 입력하세요.");
      setSubmitting(false);
      return;
    }
    if (!startDate || !endDate) {
      setError("기간(시작일/종료일)을 선택하세요.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/conventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDateISO: startDate,
          endDateISO: endDate,
          sessions,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "생성 실패");
      } else {
        const j = await res.json();
        setOkMsg("컨벤션이 생성되었습니다.");
        // 생성 후 상세 페이지로 이동하고 싶다면:
        // router.replace(`/admin/conventions/${j.id}`);
        // 일단 대시보드로:
        setTimeout(() => router.replace("/admin"), 600);
      }
    } catch (err: any) {
      setError(err?.message || "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  // 세션이 기간 밖으로 나가지 않도록 안내
  const dateHint =
    startDate && endDate
      ? `세션 시간은 ${startDate} 00:00 ~ ${endDate} 23:59 사이여야 합니다.`
      : "기간을 먼저 선택하세요.";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>컨벤션 생성</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">컨벤션 이름 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border rounded px-3 py-2"
                  placeholder="예) 2025 여름 컨벤션"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">설명</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border rounded px-3 py-2"
                  placeholder="간단한 설명"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">시작일 *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">종료일 *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* 세션들 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{dateHint}</div>
                <button
                  type="button"
                  onClick={addSession}
                  className="border rounded px-3 py-2 hover:bg-gray-50"
                >
                  세션 추가
                </button>
              </div>

              {sessions.length === 0 && (
                <div className="text-sm text-gray-500">아직 세션이 없습니다. “세션 추가” 버튼을 눌러 추가하세요.</div>
              )}

              {sessions.map((s, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border rounded p-3">
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-medium">세션 제목 *</label>
                    <input
                      value={s.title}
                      onChange={(e) => updateSession(idx, { title: e.target.value })}
                      className="border rounded px-3 py-2"
                      placeholder="예) 오프닝 세션"
                      required
                    />
                  </div>

                  <div className="md:col-span-3 flex flex-col gap-2">
                    <label className="text-sm font-medium">세션 시간 *</label>
                    <input
                      type="datetime-local"
                      value={s.dateTimeISO}
                      onChange={(e) => updateSession(idx, { dateTimeISO: e.target.value })}
                      className="border rounded px-3 py-2"
                      required
                      min={startDate ? `${startDate}T00:00` : undefined}
                      max={endDate ? `${endDate}T23:59` : undefined}
                    />
                  </div>

                  <div className="md:col-span-1 flex flex-col gap-2">
                    <label className="text-sm font-medium">정원</label>
                    <input
                      type="number"
                      min={0}
                      value={s.maxParticipants}
                      onChange={(e) => updateSession(idx, { maxParticipants: Number(e.target.value) })}
                      className="border rounded px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeSession(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      세션 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 상태 메시지 / 제출 */}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {okMsg && <div className="text-sm text-green-600">{okMsg}</div>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="border rounded px-4 py-2 bg-black text-white disabled:opacity-60"
              >
                {submitting ? "생성 중..." : "컨벤션 생성"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border rounded px-4 py-2"
              >
                돌아가기
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
