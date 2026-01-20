import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type { User, UserRecord, CreateUser, UpdateUser } from '../types';
import { DEFAULT_GROUPS, DEFAULT_ACTIVITIES } from '../constants';
import type { GroupRecord, ActivityRecord } from '../types';

// ============================================
// Key Builders
// ============================================

const userPk = (userId: string) => `USER#${userId}`;
const phonePk = (phone: string) => `PHONE#${phone}`;
const groupPk = (groupId: string) => `GROUP#${groupId}`;
const activityPk = (activityId: string) => `ACTIVITY#${activityId}`;

// ============================================
// User Operations
// ============================================

export const getUserById = async (userId: string): Promise<User | null> => {
  const record = await db.getItem<UserRecord>(userPk(userId), 'PROFILE');
  if (!record) return null;
  
  return recordToUser(record);
};

export const getUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  const records = await db.queryByGsi1<UserRecord>(phonePk(phoneNumber), 'USER');
  const firstRecord = records[0];
  if (!firstRecord) return null;
  
  return recordToUser(firstRecord);
};

export const createUser = async (input: CreateUser): Promise<User> => {
  const userId = uuidv4();
  const now = new Date().toISOString();
  
  const record: UserRecord = {
    pk: userPk(userId),
    sk: 'PROFILE',
    gsi1pk: phonePk(input.phoneNumber),
    gsi1sk: 'USER',
    userId,
    phoneNumber: input.phoneNumber,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    createdAt: now,
    calendarSyncEnabled: false,
    timezone: input.timezone ?? 'America/New_York',
  };
  
  await db.putItem(record);
  
  // Create default groups and seed default activities for this user
  await createDefaultGroups(userId);
  await ensureDefaultActivities();
  
  return recordToUser(record);
};

export const updateUser = async (
  userId: string,
  updates: UpdateUser
): Promise<User | null> => {
  // Convert null values to undefined for DynamoDB compatibility
  const cleanedUpdates: Partial<UserRecord> = {
    ...updates,
    avatarUrl: updates.avatarUrl === null ? undefined : updates.avatarUrl,
  };

  const record = await db.updateItem<UserRecord>(
    userPk(userId),
    'PROFILE',
    cleanedUpdates
  );
  
  return record ? recordToUser(record) : null;
};

export const updatePushToken = async (
  userId: string,
  pushToken: string
): Promise<void> => {
  await db.updateItem(userPk(userId), 'PROFILE', { pushToken });
};

export const deleteUser = async (userId: string): Promise<void> => {
  // TODO: Also delete related data (friendships, groups, events, etc.)
  await db.deleteItem(userPk(userId), 'PROFILE');
};

// ============================================
// Default Data Setup
// ============================================

const createDefaultGroups = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();
  
  const groupRecords: GroupRecord[] = DEFAULT_GROUPS.map(group => {
    const groupId = uuidv4();
    return {
      pk: groupPk(groupId),
      sk: 'METADATA',
      gsi1pk: userPk(userId),
      gsi1sk: `GROUP#${groupId}`,
      groupId,
      ownerId: userId,
      name: group.name,
      emoji: group.emoji,
      memberIds: [],
      isDefault: true,
      createdAt: now,
    };
  });
  
  await db.batchWriteItems(groupRecords.map(record => ({ put: record })));
};

const ensureDefaultActivities = async (): Promise<void> => {
  // Check if default activities already exist
  const existing = await db.queryByGsi1<ActivityRecord>('SYSTEM', 'ACTIVITY');
  if (existing.length > 0) return;
  
  const now = new Date().toISOString();
  
  const activityRecords: ActivityRecord[] = DEFAULT_ACTIVITIES.map(activity => {
    const activityId = uuidv4();
    return {
      pk: activityPk(activityId),
      sk: 'METADATA',
      gsi1pk: 'SYSTEM',
      gsi1sk: `ACTIVITY#${activityId}`,
      activityId,
      userId: null,
      name: activity.name,
      emoji: activity.emoji,
      isDefault: true,
      createdAt: now,
    };
  });
  
  await db.batchWriteItems(activityRecords.map(record => ({ put: record })));
};

// ============================================
// Helpers
// ============================================

const recordToUser = (record: UserRecord): User => {
  return {
    userId: record.userId,
    phoneNumber: record.phoneNumber,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
    calendarSyncEnabled: record.calendarSyncEnabled,
    pushToken: record.pushToken,
    timezone: record.timezone,
  };
};
