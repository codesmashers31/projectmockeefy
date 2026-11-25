export interface PendingBookingIntent {
  expertId: string;
  expertName?: string;
  expertRole?: string;
  expertAvatar?: string;
  selectedLevel?: string;
  selectedDuration?: number;
  selectedDateStr?: string;
  selectedSlot?: { time: string; available: boolean; [key: string]: any } | null;
  selectedDomain?: string;
  cachedProfile?: any;
  rawExpert?: any;
  sourceUrl?: string;
  timestamp: number;
}

const STORAGE_KEY = "mockeefy_pending_booking";
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour validity

export function savePendingBooking(intent: PendingBookingIntent): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch (err) {
    console.error("Failed to save pending booking intent", err);
  }
}

export function getPendingBooking(): PendingBookingIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: PendingBookingIntent = JSON.parse(raw);
    if (!parsed || !parsed.expertId) return null;
    if (Date.now() - (parsed.timestamp || 0) > EXPIRY_MS) {
      clearPendingBooking();
      return null;
    }
    return parsed;
  } catch (err) {
    console.error("Failed to read pending booking intent", err);
    return null;
  }
}

export function clearPendingBooking(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear pending booking intent", err);
  }
}

export function hasPendingBooking(): boolean {
  return getPendingBooking() !== null;
}
