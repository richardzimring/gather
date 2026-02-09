import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { db, availabilityWindows, friendships, calendarConnections, calendarEventsCache } from '../db';
import type { AvailabilityWindow, CreateAvailability, UpdateAvailability, Recurring, BusySlot } from '../types';

// ============================================
// Helpers
// ============================================

const dbWindowToAvailabilityWindow = (
  dbWindow: typeof availabilityWindows.$inferSelect,
): AvailabilityWindow => {
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
// Availability Operations
// ============================================

export const getAvailabilityWindows = async (userId: string): Promise<AvailabilityWindow[]> => {
  const windows = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.userId, userId));

  return windows.map((w) => dbWindowToAvailabilityWindow(w));
};

export const getAvailabilityWindow = async (
  userId: string,
  windowId: string,
): Promise<AvailabilityWindow | null> => {
  const result = await db
    .select()
    .from(availabilityWindows)
    .where(and(eq(availabilityWindows.userId, userId), eq(availabilityWindows.id, windowId)))
    .limit(1);

  const window = result[0];
  if (!window) return null;

  return dbWindowToAvailabilityWindow(window);
};

export const createAvailabilityWindow = async (
  userId: string,
  input: CreateAvailability,
): Promise<AvailabilityWindow> => {
  const [newWindow] = await db
    .insert(availabilityWindows)
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
    throw new Error('Failed to create availability window');
  }

  return dbWindowToAvailabilityWindow(newWindow);
};

export const updateAvailabilityWindow = async (
  userId: string,
  windowId: string,
  updates: UpdateAvailability,
): Promise<{
  success: boolean;
  window?: AvailabilityWindow;
  message?: string;
}> => {
  const existing = await getAvailabilityWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Availability window not found' };
  }

  // Build update data
  const updateData: Partial<typeof availabilityWindows.$inferInsert> = {};

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
    await db.update(availabilityWindows).set(updateData).where(eq(availabilityWindows.id, windowId));
  }

  const updatedWindow = await getAvailabilityWindow(userId, windowId);

  return {
    success: true,
    window: updatedWindow ?? undefined,
  };
};

export const deleteAvailabilityWindow = async (
  userId: string,
  windowId: string,
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getAvailabilityWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Availability window not found' };
  }

  await db.delete(availabilityWindows).where(eq(availabilityWindows.id, windowId));
  return { success: true };
};

// ============================================
// Friends' Availability
// ============================================

export interface FriendAvailability {
  userId: string;
  windows: AvailabilityWindow[];
}

export const getFriendsAvailability = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<FriendAvailability[]> => {
  // Get accepted friend IDs using a subquery join
  const friendIds = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.status, 'accepted')));

  if (friendIds.length === 0) {
    return [];
  }

  const friendIdList = friendIds.map((f) => f.friendId);

  // Build query conditions
  const conditions = [inArray(availabilityWindows.userId, friendIdList)];

  if (startDate) {
    conditions.push(gte(availabilityWindows.endTime, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(availabilityWindows.startTime, new Date(endDate)));
  }

  // Get all friends' availability windows in one query
  const allWindows = await db
    .select()
    .from(availabilityWindows)
    .where(and(...conditions));

  if (allWindows.length === 0) {
    return [];
  }

  // Group windows by userId
  const windowsByUser = new Map<string, AvailabilityWindow[]>();
  for (const window of allWindows) {
    const existing = windowsByUser.get(window.userId) ?? [];
    existing.push(dbWindowToAvailabilityWindow(window));
    windowsByUser.set(window.userId, existing);
  }

  // Convert to array
  const results: FriendAvailability[] = [];
  for (const [friendUserId, windows] of windowsByUser) {
    results.push({ userId: friendUserId, windows });
  }

  return results;
};

// ============================================
// Combined Availability Engine
// ============================================

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

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

/**
 * Calculate free time slots given busy periods within a date range
 */
export const calculateFreeTime = (
  busySlots: TimeSlot[],
  startDate: Date,
  endDate: Date,
  workingHoursStart = 9, // 9 AM
  workingHoursEnd = 21,   // 9 PM
): TimeSlot[] => {
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
      mergedBusy.push({ ...slot });
    } else if (slot.startTime <= last.endTime) {
      // Overlapping, extend the last slot
      last.endTime = new Date(Math.max(last.endTime.getTime(), slot.endTime.getTime()));
    } else {
      mergedBusy.push({ ...slot });
    }
  }
  
  // Iterate through each day in the range
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    const dayStart = new Date(current);
    dayStart.setHours(workingHoursStart, 0, 0, 0);
    
    const dayEnd = new Date(current);
    dayEnd.setHours(workingHoursEnd, 0, 0, 0);
    
    // Find busy slots that overlap with this day's working hours
    const dayBusy = mergedBusy.filter(
      (slot) => slot.startTime < dayEnd && slot.endTime > dayStart
    );
    
    // Calculate free slots for this day
    let freeStart = dayStart;
    
    for (const busy of dayBusy) {
      const busyStart = new Date(Math.max(busy.startTime.getTime(), dayStart.getTime()));
      const busyEnd = new Date(Math.min(busy.endTime.getTime(), dayEnd.getTime()));
      
      if (freeStart < busyStart) {
        freeSlots.push({
          startTime: new Date(freeStart),
          endTime: new Date(busyStart),
        });
      }
      
      freeStart = busyEnd;
    }
    
    // Add remaining free time until end of working hours
    if (freeStart < dayEnd) {
      freeSlots.push({
        startTime: new Date(freeStart),
        endTime: new Date(dayEnd),
      });
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return freeSlots;
};

/**
 * Get combined free time for a user, considering calendar busy slots and manual availability
 */
export const getUserFreeTime = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSlot[]> => {
  // Get calendar busy slots
  const busySlots = await getCalendarBusySlots(userId, startDate, endDate);
  
  // Convert to TimeSlot format
  const busyTimeSlots: TimeSlot[] = busySlots.map((slot) => ({
    startTime: new Date(slot.startTime),
    endTime: new Date(slot.endTime),
  }));
  
  // Calculate free time
  return calculateFreeTime(busyTimeSlots, startDate, endDate);
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
