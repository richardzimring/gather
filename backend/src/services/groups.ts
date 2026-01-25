import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type { Group, GroupRecord, CreateGroup, UpdateGroup } from '../types';

// ============================================
// Key Builders
// ============================================

const groupPk = (groupId: string) => `GROUP#${groupId}`;
const userPk = (userId: string) => `USER#${userId}`;

// ============================================
// Group Operations
// ============================================

export const getGroups = async (userId: string): Promise<Group[]> => {
  const records = await db.queryByGsi1<GroupRecord>(userPk(userId), 'GROUP#');
  return records.map(recordToGroup);
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
  const record = await db.getItem<GroupRecord>(groupPk(groupId), 'METADATA');
  return record ? recordToGroup(record) : null;
};

export const createGroup = async (
  userId: string,
  input: CreateGroup,
): Promise<Group> => {
  const groupId = uuidv4();
  const now = new Date().toISOString();

  const record: GroupRecord = {
    pk: groupPk(groupId),
    sk: 'METADATA',
    gsi1pk: userPk(userId),
    gsi1sk: `GROUP#${groupId}`,
    groupId,
    ownerId: userId,
    name: input.name,
    emoji: input.emoji,
    memberIds: input.memberIds ?? [],
    isDefault: false,
    createdAt: now,
  };

  await db.putItem(record);
  return recordToGroup(record);
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

  // Convert null values to undefined for DynamoDB compatibility
  const cleanedUpdates: Partial<GroupRecord> = {
    ...updates,
    emoji: updates.emoji === null ? undefined : updates.emoji,
  };

  const record = await db.updateItem<GroupRecord>(
    groupPk(groupId),
    'METADATA',
    cleanedUpdates,
  );

  return {
    success: true,
    group: record ? recordToGroup(record) : undefined,
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

  await db.deleteItem(groupPk(groupId), 'METADATA');
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

  const newMemberIds = [...group.memberIds, memberId];
  await db.updateItem<GroupRecord>(groupPk(groupId), 'METADATA', {
    memberIds: newMemberIds,
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

  const newMemberIds = group.memberIds.filter((id) => id !== memberId);
  await db.updateItem<GroupRecord>(groupPk(groupId), 'METADATA', {
    memberIds: newMemberIds,
  });

  return { success: true };
};

// ============================================
// Helpers
// ============================================

const recordToGroup = (record: GroupRecord): Group => {
  return {
    groupId: record.groupId,
    ownerId: record.ownerId,
    name: record.name,
    emoji: record.emoji,
    memberIds: record.memberIds,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
  };
};
