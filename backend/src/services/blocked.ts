import { eq, and } from 'drizzle-orm';
import { db, blockedWindows } from '../db';
import type { BlockedWindow, CreateBlockedWindow, UpdateBlockedWindow, Recurring } from '../types';

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
