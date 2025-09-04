'use client';

import { createContext, useContext, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type BusyCtx = {
  busy: boolean;
  start: () => void;
  stop: () => void;
};

const Ctx = createContext<BusyCtx | null>(null);

export function BusyProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const value = useMemo<BusyCtx>(() => ({
    busy: count > 0,
    start: () => setCount((c) => c + 1),
    stop: () => setCount((c) => Math.max(0, c - 1)),
  }), [count]);

  return (
    <Ctx.Provider value={value}>
      {/* 상단 얇은 진행바 (선택) */}
      <div
        className={`fixed top-0 left-0 right-0 z-[110] h-0.5 bg-black/80 origin-left transition-transform ${
          count > 0 ? "scale-x-100 animate-pulse" : "scale-x-0"
        }`}
        aria-hidden
      />
      {children}
      {/* 반투명 오버레이 */}
      {count > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-3 rounded-md bg-white px-4 py-3 shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">처리 중…</span>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useBusy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBusy must be used within <BusyProvider>");
  return ctx;
}
