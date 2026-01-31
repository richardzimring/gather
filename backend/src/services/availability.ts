import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { db, availabilityWindows, friendships } from '../db';
import type { AvailabilityWindow, CreateAvailability, UpdateAvailability, Recurring } from '../types';

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
