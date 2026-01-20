import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type {
  AvailabilityWindow,
  AvailabilityRecord,
  CreateAvailability,
  UpdateAvailability,
} from '../types';
import { getAcceptedFriendIds } from './friends';
import { getGroups } from './groups';

// ============================================
// Key Builders
// ============================================

const userPk = (userId: string) => `USER#${userId}`;
const availabilitySk = (windowId: string) => `AVAILABILITY#${windowId}`;

// ============================================
// Availability Operations
// ============================================

export const getAvailabilityWindows = async (userId: string): Promise<AvailabilityWindow[]> => {
  const records = await db.queryByPk<AvailabilityRecord>(userPk(userId), 'AVAILABILITY#');
  return records.map(recordToAvailability);
};

export const getAvailabilityWindow = async (
  userId: string,
  windowId: string
): Promise<AvailabilityWindow | null> => {
  const record = await db.getItem<AvailabilityRecord>(userPk(userId), availabilitySk(windowId));
  return record ? recordToAvailability(record) : null;
};

export const createAvailabilityWindow = async (
  userId: string,
  input: CreateAvailability
): Promise<AvailabilityWindow> => {
  const windowId = uuidv4();
  const now = new Date().toISOString();

  const record: AvailabilityRecord = {
    pk: userPk(userId),
    sk: availabilitySk(windowId),
    userId,
    windowId,
    startTime: input.startTime,
    endTime: input.endTime,
    recurring: input.recurring,
    visibleTo: input.visibleTo,
    preferredActivities: input.preferredActivities,
    notes: input.notes,
    createdAt: now,
  };

  await db.putItem(record);
  return recordToAvailability(record);
};

export const updateAvailabilityWindow = async (
  userId: string,
  windowId: string,
  updates: UpdateAvailability
): Promise<{ success: boolean; window?: AvailabilityWindow; message?: string }> => {
  const existing = await getAvailabilityWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Availability window not found' };
  }

  // Handle null values for optional fields (to clear them)
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      cleanUpdates[key] = undefined;
    } else if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  const record = await db.updateItem<AvailabilityRecord>(
    userPk(userId),
    availabilitySk(windowId),
    cleanUpdates
  );

  return {
    success: true,
    window: record ? recordToAvailability(record) : undefined,
  };
};

export const deleteAvailabilityWindow = async (
  userId: string,
  windowId: string
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getAvailabilityWindow(userId, windowId);

  if (!existing) {
    return { success: false, message: 'Availability window not found' };
  }

  await db.deleteItem(userPk(userId), availabilitySk(windowId));
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
  endDate?: string
): Promise<FriendAvailability[]> => {
  // Get accepted friends
  const friendIds = await getAcceptedFriendIds(userId);
  
  if (friendIds.length === 0) {
    return [];
  }

  // Get user's groups to check visibility
  // Note: userGroups/userGroupIds are fetched for future group membership checks
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userGroups = await getGroups(userId);
  
  // Determine which groups the user is a member of (from friends' perspectives)
  // This is done per-friend when filtering visibility

  const results: FriendAvailability[] = [];

  for (const friendId of friendIds) {
    const friendWindows = await getAvailabilityWindows(friendId);
    
    // Filter to windows visible to this user
    const visibleWindows = friendWindows.filter(window => {
      // Check visibility rules
      if (window.visibleTo.type === 'all') {
        return true;
      }
      
      if (window.visibleTo.type === 'specific') {
        return window.visibleTo.userIds?.includes(userId) ?? false;
      }
      
      if (window.visibleTo.type === 'groups') {
        // Check if user is in any of the specified groups
        // Note: Groups are owned by the friend, so we need to check friend's groups
        return window.visibleTo.groupIds?.some(() => {
          // For now, we'll check if user is a member of any of the friend's groups
          // This requires fetching the friend's groups
          return false; // TODO: Implement proper group membership check
        }) ?? false;
      }
      
      return false;
    });

    // Filter by date range if provided
    const filteredWindows = visibleWindows.filter(window => {
      if (startDate && window.endTime < startDate) return false;
      if (endDate && window.startTime > endDate) return false;
      return true;
    });

    if (filteredWindows.length > 0) {
      results.push({
        userId: friendId,
        windows: filteredWindows,
      });
    }
  }

  return results;
};

// ============================================
// Helpers
// ============================================

const recordToAvailability = (record: AvailabilityRecord): AvailabilityWindow => {
  return {
    userId: record.userId,
    windowId: record.windowId,
    startTime: record.startTime,
    endTime: record.endTime,
    recurring: record.recurring,
    visibleTo: record.visibleTo,
    preferredActivities: record.preferredActivities,
    notes: record.notes,
    createdAt: record.createdAt,
  };
};
