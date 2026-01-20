import * as db from './dynamodb';
import type { Friendship, FriendshipRecord, FriendshipStatus, User } from '../types';
import { getUserByPhone, getUserById } from './users';

// ============================================
// Key Builders
// ============================================

const userPk = (userId: string) => `USER#${userId}`;
const friendSk = (friendId: string) => `FRIEND#${friendId}`;

// ============================================
// Friendship Operations
// ============================================

export interface FriendWithUser extends Friendship {
  friend: User;
}

export const getFriendships = async (userId: string): Promise<FriendWithUser[]> => {
  const records = await db.queryByPk<FriendshipRecord>(userPk(userId), 'FRIEND#');
  
  // Fetch user details for each friend
  const friendships: FriendWithUser[] = [];
  for (const record of records) {
    const friend = await getUserById(record.friendId);
    if (friend) {
      friendships.push({
        ...recordToFriendship(record),
        friend,
      });
    }
  }
  
  return friendships;
};

export const getFriendship = async (
  userId: string,
  friendId: string
): Promise<Friendship | null> => {
  const record = await db.getItem<FriendshipRecord>(userPk(userId), friendSk(friendId));
  return record ? recordToFriendship(record) : null;
};

export const sendFriendRequest = async (
  userId: string,
  phoneNumber: string
): Promise<{ success: boolean; message: string; friendship?: Friendship }> => {
  // Find user by phone number
  const targetUser = await getUserByPhone(phoneNumber);
  
  if (!targetUser) {
    return { success: false, message: 'User not found with this phone number' };
  }
  
  if (targetUser.userId === userId) {
    return { success: false, message: 'Cannot send friend request to yourself' };
  }
  
  // Check if friendship already exists
  const existing = await getFriendship(userId, targetUser.userId);
  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, message: 'Already friends with this user' };
    }
    if (existing.status === 'pending') {
      return { success: false, message: 'Friend request already sent' };
    }
    if (existing.status === 'blocked') {
      return { success: false, message: 'Cannot send friend request' };
    }
  }
  
  // Check if other user has blocked us or already sent a request
  const reverseExisting = await getFriendship(targetUser.userId, userId);
  if (reverseExisting) {
    if (reverseExisting.status === 'blocked') {
      return { success: false, message: 'Cannot send friend request' };
    }
    if (reverseExisting.status === 'pending') {
      // They already sent us a request - auto accept
      return acceptFriendRequest(userId, targetUser.userId);
    }
  }
  
  const now = new Date().toISOString();
  
  // Create friendship record for requester
  const requesterRecord: FriendshipRecord = {
    pk: userPk(userId),
    sk: friendSk(targetUser.userId),
    userId,
    friendId: targetUser.userId,
    status: 'pending',
    initiatedBy: userId,
    createdAt: now,
  };
  
  // Create friendship record for target (so they see the request)
  const targetRecord: FriendshipRecord = {
    pk: userPk(targetUser.userId),
    sk: friendSk(userId),
    userId: targetUser.userId,
    friendId: userId,
    status: 'pending',
    initiatedBy: userId,
    createdAt: now,
  };
  
  await db.batchWriteItems([
    { put: requesterRecord },
    { put: targetRecord },
  ]);
  
  return {
    success: true,
    message: 'Friend request sent',
    friendship: recordToFriendship(requesterRecord),
  };
};

export const acceptFriendRequest = async (
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string; friendship?: Friendship }> => {
  const friendship = await getFriendship(userId, friendId);
  
  if (!friendship) {
    return { success: false, message: 'Friend request not found' };
  }
  
  if (friendship.status === 'accepted') {
    return { success: false, message: 'Already friends' };
  }
  
  if (friendship.status === 'blocked') {
    return { success: false, message: 'Cannot accept this request' };
  }
  
  // User cannot accept their own request
  if (friendship.initiatedBy === userId) {
    return { success: false, message: 'Cannot accept your own friend request' };
  }
  
  const now = new Date().toISOString();
  
  // Update both friendship records
  await db.updateItem<FriendshipRecord>(userPk(userId), friendSk(friendId), {
    status: 'accepted' as FriendshipStatus,
    acceptedAt: now,
  });
  
  await db.updateItem<FriendshipRecord>(userPk(friendId), friendSk(userId), {
    status: 'accepted' as FriendshipStatus,
    acceptedAt: now,
  });
  
  const updatedFriendship = await getFriendship(userId, friendId);
  
  return {
    success: true,
    message: 'Friend request accepted',
    friendship: updatedFriendship ?? undefined,
  };
};

export const declineFriendRequest = async (
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> => {
  const friendship = await getFriendship(userId, friendId);
  
  if (!friendship) {
    return { success: false, message: 'Friend request not found' };
  }
  
  if (friendship.status !== 'pending') {
    return { success: false, message: 'Can only decline pending requests' };
  }
  
  // Delete both records
  await db.deleteItem(userPk(userId), friendSk(friendId));
  await db.deleteItem(userPk(friendId), friendSk(userId));
  
  return { success: true, message: 'Friend request declined' };
};

export const removeFriend = async (
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> => {
  const friendship = await getFriendship(userId, friendId);
  
  if (!friendship) {
    return { success: false, message: 'Friendship not found' };
  }
  
  // Delete both records
  await db.deleteItem(userPk(userId), friendSk(friendId));
  await db.deleteItem(userPk(friendId), friendSk(userId));
  
  return { success: true, message: 'Friend removed' };
};

export const blockUser = async (
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> => {
  const now = new Date().toISOString();
  
  // Delete the other user's record of us
  await db.deleteItem(userPk(friendId), friendSk(userId));
  
  // Update or create our record as blocked
  const existing = await getFriendship(userId, friendId);
  
  if (existing) {
    await db.updateItem<FriendshipRecord>(userPk(userId), friendSk(friendId), {
      status: 'blocked' as FriendshipStatus,
    });
  } else {
    const blockRecord: FriendshipRecord = {
      pk: userPk(userId),
      sk: friendSk(friendId),
      userId,
      friendId,
      status: 'blocked',
      initiatedBy: userId,
      createdAt: now,
    };
    await db.putItem(blockRecord);
  }
  
  return { success: true, message: 'User blocked' };
};

export const getAcceptedFriendIds = async (userId: string): Promise<string[]> => {
  const friendships = await getFriendships(userId);
  return friendships
    .filter(f => f.status === 'accepted')
    .map(f => f.friendId);
};

// ============================================
// Helpers
// ============================================

const recordToFriendship = (record: FriendshipRecord): Friendship => {
  return {
    userId: record.userId,
    friendId: record.friendId,
    status: record.status,
    initiatedBy: record.initiatedBy,
    createdAt: record.createdAt,
    acceptedAt: record.acceptedAt,
    customName: record.customName,
  };
};
