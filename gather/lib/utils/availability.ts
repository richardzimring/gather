import type { BusyTimeInterval } from "../api/generated/types.gen";

// ============================================
// Types
// ============================================

export interface TimeSlot {
  startTime: number; // epoch ms
  endTime: number; // epoch ms
}

export interface CommonFreeTimeSlot {
  date: string; // "YYYY-MM-DD"
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  friendIds: string[]; // user IDs who are free during this slot
}

// ============================================
// Helpers
// ============================================

/**
 * Snap a time up to the next :00 or :30 boundary.
 */
function snapToHalfHour(date: Date): Date {
  const snapped = new Date(date);
  const minutes = snapped.getMinutes();
  if (minutes === 0 || minutes === 30) return snapped;
  if (minutes < 30) {
    snapped.setMinutes(30, 0, 0);
  } else {
    snapped.setHours(snapped.getHours() + 1, 0, 0, 0);
  }
  return snapped;
}

/**
 * Convert a Date to a "YYYY-MM-DD" date key.
 */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================================
// Free Time Calculation
// ============================================

/**
 * Given a user's busy intervals and a date range, calculate the free intervals.
 * Users are available 24/7 by default, minus their busy times.
 */
function calculateFreeTime(
  busyIntervals: BusyTimeInterval[],
  rangeStart: number,
  rangeEnd: number,
): TimeSlot[] {
  if (busyIntervals.length === 0) {
    return [{ startTime: rangeStart, endTime: rangeEnd }];
  }

  const freeSlots: TimeSlot[] = [];

  // Sort and merge overlapping busy slots (should already be merged from backend, but be defensive)
  const sorted = [...busyIntervals].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const merged: TimeSlot[] = [];
  for (const interval of sorted) {
    const s = Math.max(new Date(interval.startTime).getTime(), rangeStart);
    const e = Math.min(new Date(interval.endTime).getTime(), rangeEnd);
    if (s >= e) continue;

    const last = merged[merged.length - 1];
    if (last && s <= last.endTime) {
      last.endTime = Math.max(last.endTime, e);
    } else {
      merged.push({ startTime: s, endTime: e });
    }
  }

  // Calculate free slots as gaps between busy slots
  let freeStart = rangeStart;
  for (const busy of merged) {
    if (freeStart < busy.startTime) {
      freeSlots.push({ startTime: freeStart, endTime: busy.startTime });
    }
    freeStart = Math.max(freeStart, busy.endTime);
  }
  if (freeStart < rangeEnd) {
    freeSlots.push({ startTime: freeStart, endTime: rangeEnd });
  }

  return freeSlots;
}

// ============================================
// Common Free Time Computation
// ============================================

/**
 * Compute time slots from per-user busy times.
 *
 * Generates a slot at every :00/:30 boundary across the requested date range,
 * each annotated with which users are free for the full requested duration.
 * Slots where nobody is free are still included (friendIds will be empty)
 * so the UI can show a complete picture of the day.
 */
export function computeCommonFreeTimeSlots(
  busyTimes: Record<string, BusyTimeInterval[]>,
  startDate: string, // ISO datetime
  endDate: string, // ISO datetime
  durationMinutes: number,
): CommonFreeTimeSlot[] {
  const userIds = Object.keys(busyTimes);
  if (userIds.length === 0) return [];

  const rangeStart = new Date(startDate).getTime();
  const rangeEnd = new Date(endDate).getTime();
  const durationMs = durationMinutes * 60 * 1000;
  const STEP_MS = 30 * 60 * 1000; // 30 minutes

  // Step 1: Calculate free time for each user
  const perUserFree: Map<string, TimeSlot[]> = new Map();
  for (const userId of userIds) {
    perUserFree.set(
      userId,
      calculateFreeTime(busyTimes[userId], rangeStart, rangeEnd),
    );
  }

  /**
   * Check if a user is free for the entire [slotStart, slotEnd) window.
   */
  function isUserFree(userId: string, slotStart: number, slotEnd: number): boolean {
    const freeIntervals = perUserFree.get(userId);
    if (!freeIntervals) return false;
    return freeIntervals.some(
      (interval) => interval.startTime <= slotStart && interval.endTime >= slotEnd,
    );
  }

  // Step 2: Generate a slot at every 30-min boundary across the range
  const results: CommonFreeTimeSlot[] = [];
  let cursor = snapToHalfHour(new Date(rangeStart)).getTime();

  while (cursor + durationMs <= rangeEnd) {
    const candidateEnd = cursor + durationMs;

    const freeUserIds = userIds.filter((uid) =>
      isUserFree(uid, cursor, candidateEnd),
    );

    const slotStart = new Date(cursor);
    results.push({
      date: toDateKey(slotStart),
      startTime: slotStart.toISOString(),
      endTime: new Date(candidateEnd).toISOString(),
      friendIds: freeUserIds,
    });

    cursor += STEP_MS;
  }

  return results;
}
