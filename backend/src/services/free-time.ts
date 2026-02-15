import { eq, and, lt, gt, inArray } from 'drizzle-orm';
import {
  db,
  blockedWindows,
  friendships,
  calendarConnections,
  calendarEventsCache,
  events,
  eventInvitees,
} from '../db';
import type { BusyTimeInterval } from '../types';

// ============================================
// Validate User IDs
// ============================================

/**
 * Validate that all requested userIds are either the current user or accepted friends.
 */
export const validateUserIds = async (
  currentUserId: string,
  requestedUserIds: string[],
): Promise<void> => {
  const otherIds = requestedUserIds.filter((id) => id !== currentUserId);

  if (otherIds.length === 0) return;

  const friendRows = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(
      and(
        eq(friendships.userId, currentUserId),
        eq(friendships.status, 'accepted'),
        inArray(friendships.friendId, otherIds),
      ),
    );

  const validFriendIds = new Set(friendRows.map((r) => r.friendId));
  const invalidIds = otherIds.filter((id) => !validFriendIds.has(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid user IDs: ${invalidIds.join(', ')}. Users must be accepted friends.`);
  }
};

// ============================================
// Busy Times Query
// ============================================

/**
 * Merge overlapping or adjacent intervals into contiguous ranges.
 * Input must be sorted by startTime.
 */
function mergeIntervals(intervals: { startTime: Date; endTime: Date }[]): BusyTimeInterval[] {
  const first = intervals[0];
  if (!first) return [];

  const merged: BusyTimeInterval[] = [];
  let currentStart = first.startTime;
  let currentEnd = first.endTime;

  for (let i = 1; i < intervals.length; i++) {
    const interval = intervals[i] as { startTime: Date; endTime: Date };
    if (interval.startTime.getTime() <= currentEnd.getTime()) {
      // Overlapping or adjacent — extend
      if (interval.endTime.getTime() > currentEnd.getTime()) {
        currentEnd = interval.endTime;
      }
    } else {
      // Gap — flush current
      merged.push({
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
      });
      currentStart = interval.startTime;
      currentEnd = interval.endTime;
    }
  }

  // Flush last
  merged.push({
    startTime: currentStart.toISOString(),
    endTime: currentEnd.toISOString(),
  });

  return merged;
}

/**
 * Get busy times for multiple users in a date range.
 *
 * Queries all four busy sources in parallel using Drizzle ORM:
 *   1. blocked_windows
 *   2. calendar_events_cache (via calendar_connections)
 *   3. events (as host)
 *   4. event_invitees (as accepted invitee)
 *
 * Then groups by user and merges overlapping intervals.
 * Returns a map of userId → sorted, merged BusyTimeInterval[].
 */
export const getBusyTimesForUsers = async (
  userIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<Record<string, BusyTimeInterval[]>> => {
  if (userIds.length === 0) return {};

  // Run all four queries in parallel
  const [blockedRows, calendarRows, hostEventRows, inviteeEventRows] = await Promise.all([
    // 1. Blocked windows
    db
      .select({
        userId: blockedWindows.userId,
        startTime: blockedWindows.startTime,
        endTime: blockedWindows.endTime,
      })
      .from(blockedWindows)
      .where(
        and(
          inArray(blockedWindows.userId, userIds),
          lt(blockedWindows.startTime, endDate),
          gt(blockedWindows.endTime, startDate),
        ),
      ),

    // 2. Calendar events (busy only) via calendar_connections
    db
      .select({
        userId: calendarConnections.userId,
        startTime: calendarEventsCache.startTime,
        endTime: calendarEventsCache.endTime,
      })
      .from(calendarEventsCache)
      .innerJoin(calendarConnections, eq(calendarConnections.id, calendarEventsCache.connectionId))
      .where(
        and(
          inArray(calendarConnections.userId, userIds),
          eq(calendarConnections.importEnabled, true),
          eq(calendarEventsCache.isBusy, true),
          lt(calendarEventsCache.startTime, endDate),
          gt(calendarEventsCache.endTime, startDate),
        ),
      ),

    // 3. In-app events where user is host
    db
      .select({
        userId: events.hostId,
        startTime: events.startTime,
        endTime: events.endTime,
      })
      .from(events)
      .where(
        and(
          inArray(events.hostId, userIds),
          eq(events.status, 'active'),
          lt(events.startTime, endDate),
          gt(events.endTime, startDate),
        ),
      ),

    // 4. In-app events where user is accepted invitee
    db
      .select({
        userId: eventInvitees.userId,
        startTime: events.startTime,
        endTime: events.endTime,
      })
      .from(eventInvitees)
      .innerJoin(events, eq(events.id, eventInvitees.eventId))
      .where(
        and(
          inArray(eventInvitees.userId, userIds),
          eq(eventInvitees.status, 'accepted'),
          eq(events.status, 'active'),
          lt(events.startTime, endDate),
          gt(events.endTime, startDate),
        ),
      ),
  ]);

  // Combine all rows
  const allRows = [...blockedRows, ...calendarRows, ...hostEventRows, ...inviteeEventRows];

  // Group by userId
  const grouped = new Map<string, { startTime: Date; endTime: Date }[]>();

  // Initialise all requested users so even users with no busy times get an empty array
  for (const userId of userIds) {
    grouped.set(userId, []);
  }

  for (const row of allRows) {
    const { userId, startTime, endTime } = row;

    // Clip to the requested range
    const clippedStart = startTime.getTime() < startDate.getTime() ? startDate : startTime;
    const clippedEnd = endTime.getTime() > endDate.getTime() ? endDate : endTime;

    const list = grouped.get(userId);
    if (list) {
      list.push({ startTime: clippedStart, endTime: clippedEnd });
    } else {
      grouped.set(userId, [{ startTime: clippedStart, endTime: clippedEnd }]);
    }
  }

  // Sort by startTime and merge overlapping intervals per user
  const result: Record<string, BusyTimeInterval[]> = {};
  for (const [userId, intervals] of grouped) {
    intervals.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    result[userId] = mergeIntervals(intervals);
  }

  return result;
};
