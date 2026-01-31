import * as crypto from 'crypto';
import { eq, ilike, or, and, ne } from 'drizzle-orm';
import { db, users, groups, activities } from '../db';
import type { User, CreateUser, UpdateUser } from '../types';
import { DEFAULT_GROUPS, DEFAULT_ACTIVITIES, INVITE_CODE_LENGTH } from '../constants';

// ============================================
// Invite Code Generation
// ============================================

const generateInviteCode = (): string => {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, INVITE_CODE_LENGTH).toUpperCase();
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
    inviteCode: dbUser.inviteCode ?? undefined,
  };
};

// ============================================
// User Operations
// ============================================

export const getUserById = async (userId: string): Promise<User | null> => {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = result[0];
  return user ? dbUserToUser(user) : null;
};

export const getUserByAppleUserId = async (appleUserId: string): Promise<User | null> => {
  const result = await db.select().from(users).where(eq(users.appleUserId, appleUserId)).limit(1);
  const user = result[0];
  return user ? dbUserToUser(user) : null;
};

export const getUserByInviteCode = async (inviteCode: string): Promise<User | null> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.inviteCode, inviteCode.toUpperCase()))
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
    or(ilike(users.firstName, searchPattern), ilike(users.lastName, searchPattern)),
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
  const inviteCode = generateInviteCode();

  const [newUser] = await db
    .insert(users)
    .values({
      appleUserId: input.appleUserId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      timezone: input.timezone ?? 'America/New_York',
      inviteCode,
      calendarSyncEnabled: false,
    })
    .returning();

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  // Create default groups and seed default activities for this user
  await createDefaultGroups(newUser.id);
  await ensureDefaultActivities();

  return dbUserToUser(newUser);
};

export const updateUser = async (userId: string, updates: UpdateUser): Promise<User | null> => {
  const updateData: Partial<typeof users.$inferInsert> = {};

  if (updates.avatarUrl !== undefined) {
    updateData.avatarUrl = updates.avatarUrl === null ? null : updates.avatarUrl;
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

  const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

  return updated ? dbUserToUser(updated) : null;
};

export const updatePushToken = async (userId: string, pushToken: string): Promise<void> => {
  await db.update(users).set({ pushToken }).where(eq(users.id, userId));
};

export const deleteUser = async (userId: string): Promise<void> => {
  // Cascade delete will handle related records (friendships, groups, etc.)
  await db.delete(users).where(eq(users.id, userId));
};

export const regenerateInviteCode = async (userId: string): Promise<string | null> => {
  const user = await getUserById(userId);
  if (!user) return null;

  const newInviteCode = generateInviteCode();

  await db.update(users).set({ inviteCode: newInviteCode }).where(eq(users.id, userId));

  return newInviteCode;
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

const ensureDefaultActivities = async (): Promise<void> => {
  // Check if default activities already exist
  const existing = await db.select().from(activities).where(eq(activities.isDefault, true)).limit(1);

  if (existing.length > 0) return;

  const activityValues = DEFAULT_ACTIVITIES.map((activity) => ({
    userId: null,
    name: activity.name,
    emoji: activity.emoji,
    isDefault: true,
  }));

  await db.insert(activities).values(activityValues);
};
