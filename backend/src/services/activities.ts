import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type { Activity, ActivityRecord, CreateActivity, UpdateActivity } from '../types';

// ============================================
// Key Builders
// ============================================

const activityPk = (activityId: string) => `ACTIVITY#${activityId}`;
const userPk = (userId: string) => `USER#${userId}`;

// ============================================
// Activity Operations
// ============================================

export const getActivities = async (userId: string): Promise<Activity[]> => {
  // Get default activities
  const defaultActivities = await db.queryByGsi1<ActivityRecord>('SYSTEM', 'ACTIVITY#');
  
  // Get user's custom activities
  const userActivities = await db.queryByGsi1<ActivityRecord>(userPk(userId), 'ACTIVITY#');
  
  return [...defaultActivities, ...userActivities].map(recordToActivity);
};

export const getActivity = async (activityId: string): Promise<Activity | null> => {
  const record = await db.getItem<ActivityRecord>(activityPk(activityId), 'METADATA');
  return record ? recordToActivity(record) : null;
};

export const createActivity = async (
  userId: string,
  input: CreateActivity
): Promise<Activity> => {
  const activityId = uuidv4();
  const now = new Date().toISOString();

  const record: ActivityRecord = {
    pk: activityPk(activityId),
    sk: 'METADATA',
    gsi1pk: userPk(userId),
    gsi1sk: `ACTIVITY#${activityId}`,
    activityId,
    userId,
    name: input.name,
    emoji: input.emoji,
    isDefault: false,
    createdAt: now,
  };

  await db.putItem(record);
  return recordToActivity(record);
};

export const updateActivity = async (
  activityId: string,
  userId: string,
  updates: UpdateActivity
): Promise<{ success: boolean; activity?: Activity; message?: string }> => {
  const existing = await getActivity(activityId);

  if (!existing) {
    return { success: false, message: 'Activity not found' };
  }

  if (existing.isDefault) {
    return { success: false, message: 'Cannot modify default activities' };
  }

  if (existing.userId !== userId) {
    return { success: false, message: 'Not authorized to update this activity' };
  }

  const record = await db.updateItem<ActivityRecord>(
    activityPk(activityId),
    'METADATA',
    updates
  );

  return {
    success: true,
    activity: record ? recordToActivity(record) : undefined,
  };
};

export const deleteActivity = async (
  activityId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getActivity(activityId);

  if (!existing) {
    return { success: false, message: 'Activity not found' };
  }

  if (existing.isDefault) {
    return { success: false, message: 'Cannot delete default activities' };
  }

  if (existing.userId !== userId) {
    return { success: false, message: 'Not authorized to delete this activity' };
  }

  await db.deleteItem(activityPk(activityId), 'METADATA');
  return { success: true };
};

// ============================================
// Helpers
// ============================================

const recordToActivity = (record: ActivityRecord): Activity => {
  return {
    activityId: record.activityId,
    userId: record.userId,
    name: record.name,
    emoji: record.emoji,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
  };
};
