import { eq, or, isNull } from 'drizzle-orm';
import { db, activities } from '../db';
import type { Activity, CreateActivity, UpdateActivity } from '../types';
import { DEFAULT_ACTIVITIES } from '../constants';
import { generateEmoji } from './emoji';

// ============================================
// Helpers
// ============================================

const dbActivityToActivity = (
  dbActivity: typeof activities.$inferSelect,
): Activity => {
  return {
    activityId: dbActivity.id,
    userId: dbActivity.userId,
    name: dbActivity.name,
    emoji: dbActivity.emoji,
    isDefault: dbActivity.isDefault,
    createdAt: dbActivity.createdAt.toISOString(),
  };
};

// ============================================
// Activity Operations
// ============================================

export const getActivities = async (userId: string): Promise<Activity[]> => {
  // Ensure default activities exist
  await ensureDefaultActivities();

  // Get both default activities (userId is null) and user's custom activities
  const results = await db
    .select()
    .from(activities)
    .where(or(isNull(activities.userId), eq(activities.userId, userId)));

  return results.map(dbActivityToActivity);
};

export const getActivity = async (
  activityId: string,
): Promise<Activity | null> => {
  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  const activity = result[0];
  return activity ? dbActivityToActivity(activity) : null;
};

export const createActivity = async (
  userId: string,
  input: CreateActivity,
): Promise<Activity> => {
  // Generate emoji if not provided
  const emoji = input.emoji ?? (await generateEmoji(input.name));

  const [newActivity] = await db
    .insert(activities)
    .values({
      userId,
      name: input.name,
      emoji,
      isDefault: false,
    })
    .returning();

  if (!newActivity) {
    throw new Error('Failed to create activity');
  }

  return dbActivityToActivity(newActivity);
};

export const updateActivity = async (
  activityId: string,
  userId: string,
  updates: UpdateActivity,
): Promise<{ success: boolean; activity?: Activity; message?: string }> => {
  const existing = await getActivity(activityId);

  if (!existing) {
    return { success: false, message: 'Activity not found' };
  }

  if (existing.isDefault) {
    return { success: false, message: 'Cannot modify default activities' };
  }

  if (existing.userId !== userId) {
    return {
      success: false,
      message: 'Not authorized to update this activity',
    };
  }

  const updateData: Partial<typeof activities.$inferInsert> = {};
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.emoji !== undefined) {
    updateData.emoji = updates.emoji;
  }

  const [updated] = await db
    .update(activities)
    .set(updateData)
    .where(eq(activities.id, activityId))
    .returning();

  return {
    success: true,
    activity: updated ? dbActivityToActivity(updated) : undefined,
  };
};

export const deleteActivity = async (
  activityId: string,
  userId: string,
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getActivity(activityId);

  if (!existing) {
    return { success: false, message: 'Activity not found' };
  }

  if (existing.isDefault) {
    return { success: false, message: 'Cannot delete default activities' };
  }

  if (existing.userId !== userId) {
    return {
      success: false,
      message: 'Not authorized to delete this activity',
    };
  }

  await db.delete(activities).where(eq(activities.id, activityId));
  return { success: true };
};

// ============================================
// Default Activities
// ============================================

const ensureDefaultActivities = async (): Promise<void> => {
  // Check if default activities already exist
  const existing = await db
    .select()
    .from(activities)
    .where(eq(activities.isDefault, true))
    .limit(1);

  if (existing.length > 0) return;

  const activityValues = DEFAULT_ACTIVITIES.map((activity) => ({
    userId: null,
    name: activity.name,
    emoji: activity.emoji,
    isDefault: true,
  }));

  await db.insert(activities).values(activityValues);
};
