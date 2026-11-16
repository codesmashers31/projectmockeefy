import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats evaluation scores cleanly without unnecessary trailing zeros:
 * - Whole numbers: 5.0 -> "5", 4.0 -> "4", 1.0 -> "1"
 * - Decimals: 2.4 -> "2.4", 3.2 -> "3.2", 4.5 -> "4.5"
 * - Handles missing/invalid: null / undefined / NaN -> "N/A"
 */
export function formatScoreDisplay(score: number | string | null | undefined): string {
  if (score == null || score === "") return "N/A";
  const num = Number(score);
  if (isNaN(num) || !isFinite(num)) return "N/A";
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(1)));
}
