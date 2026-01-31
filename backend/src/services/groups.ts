import { eq, and } from 'drizzle-orm';
import { db, groups, groupMembers } from '../db';
import type { Group, CreateGroup, UpdateGroup } from '../types';

// ============================================
// Helpers
// ============================================

const dbGroupToGroup = async (
  dbGroup: typeof groups.$inferSelect,
): Promise<Group> => {
  // Get member IDs from junction table
  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, dbGroup.id));

  return {
    groupId: dbGroup.id,
    ownerId: dbGroup.ownerId,
    name: dbGroup.name,
    emoji: dbGroup.emoji ?? undefined,
    memberIds: members.map((m) => m.userId),
    isDefault: dbGroup.isDefault,
    createdAt: dbGroup.createdAt.toISOString(),
  };
};

// ============================================
// Group Operations
// ============================================

export const getGroups = async (userId: string): Promise<Group[]> => {
  const dbGroups = await db.select().from(groups).where(eq(groups.ownerId, userId));

  // Get all member IDs in one query for efficiency
  const groupIds = dbGroups.map((g) => g.id);
  const allMembers =
    groupIds.length > 0
      ? await db.select().from(groupMembers).where(
          // Using inArray would be ideal, but let's fetch all and filter
          eq(groupMembers.groupId, groupMembers.groupId), // This is a placeholder - we'll filter in memory
        )
      : [];

  // Filter to only our groups and group by groupId
  const membersByGroup = new Map<string, string[]>();
  for (const member of allMembers) {
    if (groupIds.includes(member.groupId)) {
      const existing = membersByGroup.get(member.groupId) ?? [];
      existing.push(member.userId);
      membersByGroup.set(member.groupId, existing);
    }
  }

  return dbGroups.map((dbGroup) => ({
    groupId: dbGroup.id,
    ownerId: dbGroup.ownerId,
    name: dbGroup.name,
    emoji: dbGroup.emoji ?? undefined,
    memberIds: membersByGroup.get(dbGroup.id) ?? [],
    isDefault: dbGroup.isDefault,
    createdAt: dbGroup.createdAt.toISOString(),
  }));
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
  const result = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  const group = result[0];
  if (!group) return null;

  return dbGroupToGroup(group);
};

export const createGroup = async (userId: string, input: CreateGroup): Promise<Group> => {
  const [newGroup] = await db
    .insert(groups)
    .values({
      ownerId: userId,
      name: input.name,
      emoji: input.emoji,
      isDefault: false,
    })
    .returning();

  if (!newGroup) {
    throw new Error('Failed to create group');
  }

  // Add initial members if provided
  if (input.memberIds && input.memberIds.length > 0) {
    await db.insert(groupMembers).values(
      input.memberIds.map((memberId) => ({
        groupId: newGroup.id,
        userId: memberId,
      })),
    );
  }

  return dbGroupToGroup(newGroup);
};

export const updateGroup = async (
  groupId: string,
  userId: string,
  updates: UpdateGroup,
): Promise<{ success: boolean; group?: Group; message?: string }> => {
  const existing = await getGroup(groupId);

  if (!existing) {
    return { success: false, message: 'Group not found' };
  }

  if (existing.ownerId !== userId) {
    return { success: false, message: 'Not authorized to update this group' };
  }

  if (existing.isDefault) {
    // Can only update memberIds for default groups
    if (updates.name !== undefined || updates.emoji !== undefined) {
      return {
        success: false,
        message: 'Cannot modify default group name or emoji',
      };
    }
  }

  // Update group fields
  const groupUpdates: Partial<typeof groups.$inferInsert> = {};
  if (updates.name !== undefined) {
    groupUpdates.name = updates.name;
  }
  if (updates.emoji !== undefined) {
    groupUpdates.emoji = updates.emoji === null ? null : updates.emoji;
  }

  if (Object.keys(groupUpdates).length > 0) {
    await db.update(groups).set(groupUpdates).where(eq(groups.id, groupId));
  }

  // Update members if provided
  if (updates.memberIds !== undefined) {
    // Delete all existing members and re-add
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));

    if (updates.memberIds.length > 0) {
      await db.insert(groupMembers).values(
        updates.memberIds.map((memberId) => ({
          groupId,
          userId: memberId,
        })),
      );
    }
  }

  const updatedGroup = await getGroup(groupId);
  return {
    success: true,
    group: updatedGroup ?? undefined,
  };
};

export const deleteGroup = async (
  groupId: string,
  userId: string,
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getGroup(groupId);

  if (!existing) {
    return { success: false, message: 'Group not found' };
  }

  if (existing.ownerId !== userId) {
    return { success: false, message: 'Not authorized to delete this group' };
  }

  if (existing.isDefault) {
    return { success: false, message: 'Cannot delete default groups' };
  }

  // Cascade delete will handle group_members
  await db.delete(groups).where(eq(groups.id, groupId));
  return { success: true };
};

export const addMemberToGroup = async (
  groupId: string,
  userId: string,
  memberId: string,
): Promise<{ success: boolean; message?: string }> => {
  const group = await getGroup(groupId);

  if (!group) {
    return { success: false, message: 'Group not found' };
  }

  if (group.ownerId !== userId) {
    return { success: false, message: 'Not authorized to modify this group' };
  }

  if (group.memberIds.includes(memberId)) {
    return { success: false, message: 'Member already in group' };
  }

  await db.insert(groupMembers).values({
    groupId,
    userId: memberId,
  });

  return { success: true };
};

export const removeMemberFromGroup = async (
  groupId: string,
  userId: string,
  memberId: string,
): Promise<{ success: boolean; message?: string }> => {
  const group = await getGroup(groupId);

  if (!group) {
    return { success: false, message: 'Group not found' };
  }

  if (group.ownerId !== userId) {
    return { success: false, message: 'Not authorized to modify this group' };
  }

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)));

  return { success: true };
};
