import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS className을 합쳐주는 유틸
 * - 조건부로 클래스 적용
 * - 중복된 클래스는 마지막 걸로 정리
 *
 * 사용 예시:
 * cn("px-2", isActive && "bg-blue-500", "px-4")
 * -> "bg-blue-500 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
