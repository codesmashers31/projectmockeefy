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

/**
 * Capitalizes the first letter of each word in a user's display name cleanly:
 * "test expert" -> "Test Expert"
 * "testuser" -> "Testuser"
 * "joel peter" -> "Joel Peter"
 */
export function formatDisplayName(name?: string | null, fallback = "User"): string {
  if (!name || typeof name !== "string") return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
