'use client';

import { useBusy } from "@/components/system/BusyProvider";

/** 모든 클라이언트 API 호출을 이 래퍼로 감싸면 전역 Busy 오버레이가 자동으로 나옵니다. */
export function useBusyFetch() {
  const { start, stop } = useBusy();
  return async function busyFetch(input: RequestInfo | URL, init?: RequestInit) {
    start();
    try {
      const res = await fetch(input, init);
      return res;
    } finally {
      stop();
    }
  };
}
