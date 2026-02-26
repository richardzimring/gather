import * as crypto from 'crypto';
import { eq, ilike, or, and, ne } from 'drizzle-orm';
import { db, users, groups } from '../db';
import type {
  User,
  CreateUser,
  UpdateUser,
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '../types';
import { DEFAULT_GROUPS, FRIEND_CODE_LENGTH } from '../constants';

// ============================================
// Friend Code Generation
// ============================================

const generateFriendCode = (): string => {
  const bytes = crypto.randomBytes(FRIEND_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, FRIEND_CODE_LENGTH).toUpperCase();
};

// ============================================
// Helpers
// ============================================

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName.trim()[0] ?? '';
  const last = lastName.trim()[0] ?? '';
  return `${first}${last}`.toUpperCase();
};

const dbUserToUser = (dbUser: typeof users.$inferSelect): User => {
  return {
    userId: dbUser.id,
    appleUserId: dbUser.appleUserId,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    fullName: `${dbUser.firstName} ${dbUser.lastName}`,
    initials: getInitials(dbUser.firstName, dbUser.lastName),
    avatarUrl: dbUser.avatarUrl ?? undefined,
    createdAt: dbUser.createdAt.toISOString(),
    calendarSyncEnabled: dbUser.calendarSyncEnabled,
    pushToken: dbUser.pushToken ?? undefined,
    timezone: dbUser.timezone,
    friendCode: dbUser.friendCode ?? undefined,
  };
};

// ============================================
// User Operations
// ============================================

export const getUserById = async (userId: string): Promise<User | null> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = result[0];
  return user ? dbUserToUser(user) : null;
};

export const getUserByAppleUserId = async (
  appleUserId: string,
): Promise<User | null> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.appleUserId, appleUserId))
    .limit(1);
  const user = result[0];
  return user ? dbUserToUser(user) : null;
};

export const getUserByFriendCode = async (
  friendCode: string,
): Promise<User | null> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.friendCode, friendCode.toUpperCase()))
    .limit(1);
  const user = result[0];
  return user ? dbUserToUser(user) : null;
};

export const searchUsersByName = async (
  query: string,
  excludeUserId?: string,
  limit = 20,
): Promise<User[]> => {
  const searchPattern = `%${query}%`;

  const conditions = [
    or(
      ilike(users.firstName, searchPattern),
      ilike(users.lastName, searchPattern),
    ),
  ];

  if (excludeUserId) {
    conditions.push(ne(users.id, excludeUserId));
  }

  const result = await db
    .select()
    .from(users)
    .where(and(...conditions))
    .limit(limit);

  return result.map(dbUserToUser);
};

export const createUser = async (input: CreateUser): Promise<User> => {
  const friendCode = generateFriendCode();

  const [newUser] = await db
    .insert(users)
    .values({
      appleUserId: input.appleUserId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      timezone: input.timezone ?? 'America/New_York',
      friendCode,
      calendarSyncEnabled: false,
    })
    .returning();

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  // Create default groups for this user
  await createDefaultGroups(newUser.id);

  return dbUserToUser(newUser);
};

export const updateUser = async (
  userId: string,
  updates: UpdateUser,
): Promise<User | null> => {
  const updateData: Partial<typeof users.$inferInsert> = {};

  if (updates.avatarUrl !== undefined) {
    updateData.avatarUrl =
      updates.avatarUrl === null ? null : updates.avatarUrl;
  }
  if (updates.timezone !== undefined) {
    updateData.timezone = updates.timezone;
  }
  if (updates.calendarSyncEnabled !== undefined) {
    updateData.calendarSyncEnabled = updates.calendarSyncEnabled;
  }

  if (Object.keys(updateData).length === 0) {
    return getUserById(userId);
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  return updated ? dbUserToUser(updated) : null;
};

export const updatePushToken = async (
  userId: string,
  pushToken: string,
): Promise<void> => {
  await db.update(users).set({ pushToken }).where(eq(users.id, userId));
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  eventInvites: true,
  eventUpdates: true,
  friendRequests: true,
  messages: true,
};

export const getNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const result = await db
    .select({ notificationPreferences: users.notificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = result[0];
  if (!user?.notificationPreferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(user.notificationPreferences as Partial<NotificationPreferences>),
  };
};

export const updateNotificationPreferences = async (
  userId: string,
  updates: UpdateNotificationPreferences,
): Promise<NotificationPreferences> => {
  // Get current preferences
  const current = await getNotificationPreferences(userId);
  const merged = { ...current, ...updates };

  await db
    .update(users)
    .set({ notificationPreferences: merged })
    .where(eq(users.id, userId));

  return merged;
};

export const deleteUser = async (userId: string): Promise<void> => {
  // Cascade delete will handle related records (friendships, groups, etc.)
  await db.delete(users).where(eq(users.id, userId));
};

export const regenerateFriendCode = async (
  userId: string,
): Promise<string | null> => {
  const user = await getUserById(userId);
  if (!user) return null;

  const newFriendCode = generateFriendCode();

  await db
    .update(users)
    .set({ friendCode: newFriendCode })
    .where(eq(users.id, userId));

  return newFriendCode;
};

// ============================================
// Default Data Setup
// ============================================

const createDefaultGroups = async (userId: string): Promise<void> => {
  const groupValues = DEFAULT_GROUPS.map((group) => ({
    ownerId: userId,
    name: group.name,
    emoji: group.emoji,
    isDefault: true,
  }));

  await db.insert(groups).values(groupValues);
};
