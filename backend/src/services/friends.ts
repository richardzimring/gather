import { eq, and, or } from 'drizzle-orm';
import { db, users, friendships, groups, groupMembers } from '../db';
import type { Friendship, User } from '../types';
import { getUserById, getUserByInviteCode } from './users';
import { notifyFriendRequest, notifyFriendAccepted } from './notifications';

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

const dbFriendshipToFriendship = (dbFriendship: typeof friendships.$inferSelect): Friendship => {
  return {
    userId: dbFriendship.userId,
    friendId: dbFriendship.friendId,
    status: dbFriendship.status,
    initiatedBy: dbFriendship.initiatedBy,
    createdAt: dbFriendship.createdAt.toISOString(),
    acceptedAt: dbFriendship.acceptedAt?.toISOString(),
  };
};

/**
 * Get the "All Friends" default group for a user
 */
const getAllFriendsGroup = async (userId: string): Promise<string | null> => {
  const result = await db
    .select({ id: groups.id })
    .from(groups)
    .where(
      and(eq(groups.ownerId, userId), eq(groups.isDefault, true), eq(groups.name, 'All Friends')),
    )
    .limit(1);

  return result[0]?.id ?? null;
};

// ============================================
// Friendship Operations
// ============================================

export interface FriendWithUser extends Friendship {
  friend: User;
}

export const getFriendships = async (userId: string): Promise<FriendWithUser[]> => {
  // Use JOIN to get friendship and friend user data in one query
  const results = await db
    .select({
      friendship: friendships,
      friend: users,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.friendId, users.id))
    .where(eq(friendships.userId, userId));

  return results.map((row) => ({
    ...dbFriendshipToFriendship(row.friendship),
    friend: dbUserToUser(row.friend),
  }));
};

export const getFriendship = async (
  userId: string,
  friendId: string,
): Promise<Friendship | null> => {
  const result = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)))
    .limit(1);

  const friendship = result[0];
  return friendship ? dbFriendshipToFriendship(friendship) : null;
};

/**
 * Send a friend request using either a direct userId or an invite code
 */
export const sendFriendRequest = async (
  userId: string,
  targetUserId?: string,
  inviteCode?: string,
): Promise<{ success: boolean; message: string; friendship?: Friendship }> => {
  let targetUser: User | null = null;

  // Find target user by userId or invite code
  if (targetUserId) {
    targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }
  } else if (inviteCode) {
    targetUser = await getUserByInviteCode(inviteCode);
    if (!targetUser) {
      return { success: false, message: 'Invalid invite code' };
    }
  } else {
    return {
      success: false,
      message: 'Either friendUserId or inviteCode is required',
    };
  }

  if (targetUser.userId === userId) {
    return {
      success: false,
      message: 'Cannot send friend request to yourself',
    };
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

  // Create bidirectional friendship records
  const [requesterFriendship] = await db
    .insert(friendships)
    .values([
      {
        userId,
        friendId: targetUser.userId,
        status: 'pending',
        initiatedBy: userId,
      },
      {
        userId: targetUser.userId,
        friendId: userId,
        status: 'pending',
        initiatedBy: userId,
      },
    ])
    .returning();

  // Send push notification to target user
  const requester = await getUserById(userId);
  if (requester) {
    await notifyFriendRequest(targetUser.userId, requester.fullName);
  }

  return {
    success: true,
    message: 'Friend request sent',
    friendship: requesterFriendship ? dbFriendshipToFriendship(requesterFriendship) : undefined,
  };
};

export const acceptFriendRequest = async (
  userId: string,
  friendId: string,
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

  const now = new Date();

  // Update both friendship records
  await db
    .update(friendships)
    .set({ status: 'accepted', acceptedAt: now })
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)),
      ),
    );

  // Add each user to the other's "All Friends" group
  const userAllFriendsGroup = await getAllFriendsGroup(userId);
  const friendAllFriendsGroup = await getAllFriendsGroup(friendId);

  if (userAllFriendsGroup) {
    await db
      .insert(groupMembers)
      .values({
        groupId: userAllFriendsGroup,
        userId: friendId,
      })
      .onConflictDoNothing();
  }

  if (friendAllFriendsGroup) {
    await db
      .insert(groupMembers)
      .values({
        groupId: friendAllFriendsGroup,
        userId: userId,
      })
      .onConflictDoNothing();
  }

  const updatedFriendship = await getFriendship(userId, friendId);

  // Send push notification to the original requester
  const accepter = await getUserById(userId);
  if (accepter) {
    await notifyFriendAccepted(friendId, accepter.fullName);
  }

  return {
    success: true,
    message: 'Friend request accepted',
    friendship: updatedFriendship ?? undefined,
  };
};

export const declineFriendRequest = async (
  userId: string,
  friendId: string,
): Promise<{ success: boolean; message: string }> => {
  const friendship = await getFriendship(userId, friendId);

  if (!friendship) {
    return { success: false, message: 'Friend request not found' };
  }

  if (friendship.status !== 'pending') {
    return { success: false, message: 'Can only decline pending requests' };
  }

  // Delete both records
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)),
      ),
    );

  return { success: true, message: 'Friend request declined' };
};

export const removeFriend = async (
  userId: string,
  friendId: string,
): Promise<{ success: boolean; message: string }> => {
  const friendship = await getFriendship(userId, friendId);

  if (!friendship) {
    return { success: false, message: 'Friendship not found' };
  }

  // Remove each user from the other's "All Friends" group
  const userAllFriendsGroup = await getAllFriendsGroup(userId);
  const friendAllFriendsGroup = await getAllFriendsGroup(friendId);

  if (userAllFriendsGroup) {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, userAllFriendsGroup), eq(groupMembers.userId, friendId)));
  }

  if (friendAllFriendsGroup) {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, friendAllFriendsGroup), eq(groupMembers.userId, userId)));
  }

  // Delete both friendship records
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)),
      ),
    );

  return { success: true, message: 'Friend removed' };
};

export const blockUser = async (
  userId: string,
  friendId: string,
): Promise<{ success: boolean; message: string }> => {
  // Delete the other user's record of us
  await db
    .delete(friendships)
    .where(and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)));

  // Update or create our record as blocked
  const existing = await getFriendship(userId, friendId);

  if (existing) {
    await db
      .update(friendships)
      .set({ status: 'blocked' })
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)));
  } else {
    await db.insert(friendships).values({
      userId,
      friendId,
      status: 'blocked',
      initiatedBy: userId,
    });
  }

  return { success: true, message: 'User blocked' };
};

export const getAcceptedFriendIds = async (userId: string): Promise<string[]> => {
  const results = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.status, 'accepted')));

  return results.map((r) => r.friendId);
};
