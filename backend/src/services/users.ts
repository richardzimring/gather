import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as db from './dynamodb';
import type {
  User,
  UserRecord,
  CreateUser,
  UpdateUser,
  InviteCodeRecord,
} from '../types';
import {
  DEFAULT_GROUPS,
  DEFAULT_ACTIVITIES,
  INVITE_CODE_LENGTH,
} from '../constants';
import type { GroupRecord, ActivityRecord } from '../types';

// ============================================
// Key Builders
// ============================================

const userPk = (userId: string) => `USER#${userId}`;
const applePk = (appleUserId: string) => `APPLE#${appleUserId}`;
const groupPk = (groupId: string) => `GROUP#${groupId}`;
const activityPk = (activityId: string) => `ACTIVITY#${activityId}`;
const inviteCodePk = (code: string) => `INVITE#${code}`;

// ============================================
// Invite Code Generation
// ============================================

const generateInviteCode = (): string => {
  // Generate a URL-safe invite code
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, INVITE_CODE_LENGTH).toUpperCase();
};

// ============================================
// User Operations
// ============================================

export const getUserById = async (userId: string): Promise<User | null> => {
  const record = await db.getItem<UserRecord>(userPk(userId), 'PROFILE');
  if (!record) return null;

  return recordToUser(record);
};

export const getUserByAppleUserId = async (
  appleUserId: string,
): Promise<User | null> => {
  const records = await db.queryByGsi1<UserRecord>(
    applePk(appleUserId),
    'USER',
  );
  const firstRecord = records[0];
  if (!firstRecord) return null;

  return recordToUser(firstRecord);
};

export const getUserByInviteCode = async (
  inviteCode: string,
): Promise<User | null> => {
  const inviteRecord = await db.getItem<InviteCodeRecord>(
    inviteCodePk(inviteCode.toUpperCase()),
    'METADATA',
  );
  if (!inviteRecord) return null;

  return getUserById(inviteRecord.userId);
};

export const searchUsersByName = async (
  query: string,
  excludeUserId?: string,
  limit = 20,
): Promise<User[]> => {
  // Note: DynamoDB doesn't support text search natively.
  // For MVP, we'll do a scan with filter. In production, consider:
  // - OpenSearch/Elasticsearch
  // - DynamoDB with a search-optimized GSI
  // - Third-party search service

  // For now, this is a placeholder that returns empty results
  // The proper implementation would require a GSI on firstName/lastName
  // or integration with a search service
  console.log(
    `Search users by name: "${query}" (excluding: ${excludeUserId}, limit: ${limit})`,
  );

  // TODO: Implement proper user search
  // Options:
  // 1. GSI on firstName/lastName (limited - exact match only)
  // 2. Scan with filter (expensive for large datasets)
  // 3. External search service (OpenSearch, Algolia, etc.)

  return [];
};

export const createUser = async (input: CreateUser): Promise<User> => {
  const userId = uuidv4();
  const now = new Date().toISOString();
  const inviteCode = generateInviteCode();

  const record: UserRecord = {
    pk: userPk(userId),
    sk: 'PROFILE',
    gsi1pk: applePk(input.appleUserId),
    gsi1sk: 'USER',
    userId,
    appleUserId: input.appleUserId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    fullName: `${input.firstName} ${input.lastName}`,
    avatarUrl: input.avatarUrl,
    createdAt: now,
    calendarSyncEnabled: false,
    timezone: input.timezone ?? 'America/New_York',
    inviteCode,
  };

  // Also create invite code lookup record
  const inviteCodeRecord: InviteCodeRecord = {
    pk: inviteCodePk(inviteCode),
    sk: 'METADATA',
    inviteCode,
    userId,
    createdAt: now,
  };

  await db.batchWriteItems([{ put: record }, { put: inviteCodeRecord }]);

  // Create default groups and seed default activities for this user
  await createDefaultGroups(userId);
  await ensureDefaultActivities();

  return recordToUser(record);
};

export const updateUser = async (
  userId: string,
  updates: UpdateUser,
): Promise<User | null> => {
  // Convert null values to undefined for DynamoDB compatibility
  const cleanedUpdates: Partial<UserRecord> = {
    ...updates,
    avatarUrl: updates.avatarUrl === null ? undefined : updates.avatarUrl,
  };

  const record = await db.updateItem<UserRecord>(
    userPk(userId),
    'PROFILE',
    cleanedUpdates,
  );

  return record ? recordToUser(record) : null;
};

export const updatePushToken = async (
  userId: string,
  pushToken: string,
): Promise<void> => {
  await db.updateItem(userPk(userId), 'PROFILE', { pushToken });
};

export const deleteUser = async (userId: string): Promise<void> => {
  // Get the user to find their invite code
  const user = await getUserById(userId);

  if (user?.inviteCode) {
    // Delete both user record and invite code record
    await db.batchWriteItems([
      { delete: { pk: userPk(userId), sk: 'PROFILE' } },
      { delete: { pk: inviteCodePk(user.inviteCode), sk: 'METADATA' } },
    ]);
  } else {
    await db.deleteItem(userPk(userId), 'PROFILE');
  }

  // TODO: Also delete related data (friendships, groups, events, etc.)
};

export const regenerateInviteCode = async (
  userId: string,
): Promise<string | null> => {
  const user = await getUserById(userId);
  if (!user) return null;

  const newInviteCode = generateInviteCode();
  const now = new Date().toISOString();

  // Delete old invite code record if exists
  const deleteOps: { delete: { pk: string; sk: string } }[] = [];
  if (user.inviteCode) {
    deleteOps.push({
      delete: { pk: inviteCodePk(user.inviteCode), sk: 'METADATA' },
    });
  }

  // Create new invite code record
  const newInviteCodeRecord: InviteCodeRecord = {
    pk: inviteCodePk(newInviteCode),
    sk: 'METADATA',
    inviteCode: newInviteCode,
    userId,
    createdAt: now,
  };

  // Update user with new invite code and create new invite code record
  await db.batchWriteItems([...deleteOps, { put: newInviteCodeRecord }]);

  await db.updateItem(userPk(userId), 'PROFILE', { inviteCode: newInviteCode });

  return newInviteCode;
};

// ============================================
// Default Data Setup
// ============================================

const createDefaultGroups = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();

  const groupRecords: GroupRecord[] = DEFAULT_GROUPS.map((group) => {
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

  await db.batchWriteItems(groupRecords.map((record) => ({ put: record })));
};

const ensureDefaultActivities = async (): Promise<void> => {
  // Check if default activities already exist
  const existing = await db.queryByGsi1<ActivityRecord>('SYSTEM', 'ACTIVITY');
  if (existing.length > 0) return;

  const now = new Date().toISOString();

  const activityRecords: ActivityRecord[] = DEFAULT_ACTIVITIES.map(
    (activity) => {
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
    },
  );

  await db.batchWriteItems(activityRecords.map((record) => ({ put: record })));
};

// ============================================
// Helpers
// ============================================

const recordToUser = (record: UserRecord): User => {
  return {
    userId: record.userId,
    appleUserId: record.appleUserId,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: `${record.firstName} ${record.lastName}`,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
    calendarSyncEnabled: record.calendarSyncEnabled,
    pushToken: record.pushToken,
    timezone: record.timezone,
    inviteCode: record.inviteCode,
  };
};
