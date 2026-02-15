import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { db, blockedWindows, friendships, calendarConnections, calendarEventsCache } from '../db';
import type { BlockedWindow, CreateBlockedWindow, UpdateBlockedWindow, Recurring, BusySlot, FreeTimeSlot } from '../types';

// ============================================
// Helpers
// ============================================

const dbWindowToBlockedWindow = (
  dbWindow: typeof blockedWindows.$inferSelect,
): BlockedWindow => {
  // Build recurring object if pattern exists
  let recurring: Recurring | undefined;
  if (dbWindow.recurringPattern) {
    recurring = {
      pattern: dbWindow.recurringPattern,
      daysOfWeek: dbWindow.recurringDaysOfWeek ?? undefined,
      endDate: dbWindow.recurringEndDate?.toISOString(),
    };
  }

  return {
    userId: dbWindow.userId,
    windowId: dbWindow.id,
    startTime: dbWindow.startTime.toISOString(),
    endTime: dbWindow.endTime.toISOString(),
    recurring,
    notes: dbWindow.notes ?? undefined,
    createdAt: dbWindow.createdAt.toISOString(),
  };
};

// ============================================
// Blocked Window Operations
// ============================================

export const getBlockedWindows = async (userId: string): Promise<BlockedWindow[]> => {
  const windows = await db
    .select()
    .from(blockedWindows)
    .where(eq(blockedWindows.userId, userId));

  return windows.map((w) => dbWindowToBlockedWindow(w));
};

export const getBlockedWindow = async (
  userId: string,
  windowId: string,
): Promise<BlockedWindow | null> => {
  const result = await db
    .select()
    .from(blockedWindows)
    .where(and(eq(blockedWindows.userId, userId), eq(blockedWindows.id, windowId)))
    .limit(1);

  const window = result[0];
  if (!window) return null;

  return dbWindowToBlockedWindow(window);
};

export const createBlockedWindow = async (
  userId: string,
  input: CreateBlockedWindow,
): Promise<BlockedWindow> => {
  const [newWindow] = await db
    .insert(blockedWindows)
    .values({
      userId,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      recurringPattern: input.recurring?.pattern,
      recurringDaysOfWeek: input.recurring?.daysOfWeek,
      recurringEndDate: input.recurring?.endDate ? new Date(input.recurring.endDate) : null,
      notes: input.notes,
    })
    .returning();

  if (!newWindow) {
    throw new Error('Failed to create blocked window');
  }

  return dbWindowToBlockedWindow(newWindow);
};

export const updateBlockedWindow = async (
  userId: string,
  windowId: string,
  updates: UpdateBlockedWindow,
): Promise<{
  success: boolean;
  window?: BlockedWindow;
  message?: string;
}> => {
  const existing = await getBlockedWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Blocked window not found' };
  }

  // Build update data
  const updateData: Partial<typeof blockedWindows.$inferInsert> = {};

  if (updates.startTime !== undefined) {
    updateData.startTime = new Date(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    updateData.endTime = new Date(updates.endTime);
  }
  if (updates.recurring !== undefined) {
    if (updates.recurring === null) {
      updateData.recurringPattern = null;
      updateData.recurringDaysOfWeek = null;
      updateData.recurringEndDate = null;
    } else {
      updateData.recurringPattern = updates.recurring.pattern;
      updateData.recurringDaysOfWeek = updates.recurring.daysOfWeek ?? null;
      updateData.recurringEndDate = updates.recurring.endDate
        ? new Date(updates.recurring.endDate)
        : null;
    }
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes === null ? null : updates.notes;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(blockedWindows).set(updateData).where(eq(blockedWindows.id, windowId));
  }

  const updatedWindow = await getBlockedWindow(userId, windowId);

  return {
    success: true,
    window: updatedWindow ?? undefined,
  };
};

export const deleteBlockedWindow = async (
  userId: string,
  windowId: string,
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getBlockedWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Blocked window not found' };
  }

  await db.delete(blockedWindows).where(eq(blockedWindows.id, windowId));
  return { success: true };
};

// ============================================
// Time Slot Types
// ============================================

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

// ============================================
// Calendar Busy Slots
// ============================================

/**
 * Get busy slots from external calendars for a user
 */
export const getCalendarBusySlots = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<BusySlot[]> => {
  // Get all import-enabled connections for the user
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.importEnabled, true)
      )
    );

  if (connections.length === 0) {
    return [];
  }

  const connectionIds = connections.map((c) => c.id);
  const connectionNameMap = new Map(connections.map((c) => [c.id, c.calendarName]));

  // Get cached events within the date range
  const cachedEvents = await db
    .select()
    .from(calendarEventsCache)
    .where(
      and(
        inArray(calendarEventsCache.connectionId, connectionIds),
        gte(calendarEventsCache.startTime, startDate),
        lte(calendarEventsCache.endTime, endDate),
        eq(calendarEventsCache.isBusy, true)
      )
    )
    .orderBy(calendarEventsCache.startTime);

  return cachedEvents.map((event) => ({
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    calendarName: connectionNameMap.get(event.connectionId),
  }));
};

// ============================================
// Free Time Calculation (24/7 availability by default)
// ============================================

/**
 * Get all busy slots for a user (manual blocked windows + calendar events)
 */
export const getAllBusySlots = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSlot[]> => {
  const busySlots: TimeSlot[] = [];

  // Get manual blocked windows
  const manualWindows = await db
    .select()
    .from(blockedWindows)
    .where(
      and(
        eq(blockedWindows.userId, userId),
        gte(blockedWindows.endTime, startDate),
        lte(blockedWindows.startTime, endDate)
      )
    );

  for (const window of manualWindows) {
    busySlots.push({
      startTime: window.startTime,
      endTime: window.endTime,
    });
  }

  // Get calendar busy slots
  const calendarSlots = await getCalendarBusySlots(userId, startDate, endDate);
  for (const slot of calendarSlots) {
    busySlots.push({
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    });
  }

  return busySlots;
};

/**
 * Calculate free time slots given busy periods within a date range.
 * Users are available 24/7 by default, minus their blocked times.
 */
export const calculateFreeTime = (
  busySlots: TimeSlot[],
  startDate: Date,
  endDate: Date,
): TimeSlot[] => {
  // If no busy slots, return the entire range as free
  if (busySlots.length === 0) {
    return [{
      startTime: new Date(startDate),
      endTime: new Date(endDate),
    }];
  }

  const freeSlots: TimeSlot[] = [];
  
  // Sort busy slots by start time
  const sortedBusy = [...busySlots].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
  
  // Merge overlapping busy slots
  const mergedBusy: TimeSlot[] = [];
  for (const slot of sortedBusy) {
    const last = mergedBusy[mergedBusy.length - 1];
    if (!last) {
      mergedBusy.push({ 
        startTime: new Date(slot.startTime), 
        endTime: new Date(slot.endTime) 
      });
    } else if (slot.startTime.getTime() <= last.endTime.getTime()) {
      // Overlapping or adjacent, extend the last slot
      last.endTime = new Date(Math.max(last.endTime.getTime(), slot.endTime.getTime()));
    } else {
      mergedBusy.push({ 
        startTime: new Date(slot.startTime), 
        endTime: new Date(slot.endTime) 
      });
    }
  }
  
  // Calculate free slots by finding gaps between busy slots
  let freeStart = new Date(startDate);
  
  for (const busy of mergedBusy) {
    // Clamp busy slot to the date range
    const busyStart = new Date(Math.max(busy.startTime.getTime(), startDate.getTime()));
    const busyEnd = new Date(Math.min(busy.endTime.getTime(), endDate.getTime()));
    
    // If there's a gap before this busy slot, it's free time
    if (freeStart.getTime() < busyStart.getTime()) {
      freeSlots.push({
        startTime: new Date(freeStart),
        endTime: new Date(busyStart),
      });
    }
    
    // Move free start to end of this busy slot
    freeStart = new Date(Math.max(freeStart.getTime(), busyEnd.getTime()));
  }
  
  // Add remaining free time until end of range
  if (freeStart.getTime() < endDate.getTime()) {
    freeSlots.push({
      startTime: new Date(freeStart),
      endTime: new Date(endDate),
    });
  }
  
  return freeSlots;
};

/**
 * Get free time for a user (24/7 minus blocked windows and calendar busy slots)
 */
export const getUserFreeTime = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSlot[]> => {
  // Get all busy slots (manual + calendar)
  const busySlots = await getAllBusySlots(userId, startDate, endDate);
  
  // Calculate free time (24/7 minus busy)
  return calculateFreeTime(busySlots, startDate, endDate);
};

// ============================================
// Friends' Free Time
// ============================================

export interface FriendFreeTime {
  userId: string;
  freeSlots: FreeTimeSlot[];
}

/**
 * Get computed free time for all friends (and the current user) within a date range.
 * Each person is available 24/7 by default, minus their blocked windows and calendar events.
 * The current user is included so the planning UI can factor in their own availability.
 */
export const getFriendsFreeTime = async (
  userId: string,
  startDate: string,
  endDate: string,
): Promise<FriendFreeTime[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get accepted friend IDs
  const friendIds = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.status, 'accepted')));

  const friendIdList = friendIds.map((f) => f.friendId);

  // Include the current user alongside their friends
  const allUserIds = [userId, ...friendIdList];

  // Get free time for each person (current user + friends)
  const results: FriendFreeTime[] = [];
  
  for (const id of allUserIds) {
    const freeSlots = await getUserFreeTime(id, start, end);
    
    results.push({
      userId: id,
      freeSlots: freeSlots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      })),
    });
  }

  return results;
};

/**
 * Find common free time slots among multiple users
 */
export const findCommonFreeTime = async (
  userIds: string[],
  startDate: Date,
  endDate: Date,
  minimumDurationMinutes = 30
): Promise<TimeSlot[]> => {
  if (userIds.length === 0) {
    return [];
  }
  
  // Get free time for each user
  const userFreeTimes = await Promise.all(
    userIds.map((userId) => getUserFreeTime(userId, startDate, endDate))
  );
  
  // Start with the first user's free time
  let commonSlots = userFreeTimes[0] ?? [];
  
  // Intersect with each subsequent user's free time
  for (let i = 1; i < userFreeTimes.length; i++) {
    const otherSlots = userFreeTimes[i];
    if (otherSlots) {
      commonSlots = intersectTimeSlots(commonSlots, otherSlots);
    }
  }
  
  // Filter out slots shorter than minimum duration
  const minDuration = minimumDurationMinutes * 60 * 1000;
  return commonSlots.filter(
    (slot) => slot.endTime.getTime() - slot.startTime.getTime() >= minDuration
  );
};

/**
 * Find the intersection of two sets of time slots
 */
const intersectTimeSlots = (slotsA: TimeSlot[], slotsB: TimeSlot[]): TimeSlot[] => {
  const result: TimeSlot[] = [];
  
  for (const a of slotsA) {
    for (const b of slotsB) {
      const start = new Date(Math.max(a.startTime.getTime(), b.startTime.getTime()));
      const end = new Date(Math.min(a.endTime.getTime(), b.endTime.getTime()));
      
      if (start < end) {
        result.push({ startTime: start, endTime: end });
      }
    }
  }
  
  return result;
};
