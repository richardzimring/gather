import { z } from '@hono/zod-openapi';
import { BaseModel, db, stripDynamoKeys } from './base';
import { User } from './User';

// ============================================
// Schema
// ============================================

export const FriendshipStatusSchema = z.enum([
  'pending',
  'accepted',
  'blocked',
]);

export const FriendshipSchema = z.object({
  userId: z.string().uuid(),
  friendId: z.string().uuid(),
  status: FriendshipStatusSchema,
  initiatedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  customName: z.string().max(50).optional(),
});

export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>;
export type FriendshipData = z.infer<typeof FriendshipSchema>;

// ============================================
// Record Type
// ============================================

interface FriendshipRecord extends FriendshipData {
  pk: string; // USER#<userId>
  sk: string; // FRIEND#<friendId>
}

// ============================================
// Extended Types
// ============================================

export interface FriendshipWithUser extends FriendshipData {
  friend: User;
}

// ============================================
// Model Class
// ============================================

export class Friendship extends BaseModel<FriendshipRecord> {
  // Key builders
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }
  private static friendSk(friendId: string) {
    return `FRIEND#${friendId}`;
  }

  // ============================================
  // Accessors
  // ============================================

  get userId(): string {
    return this.record.userId;
  }
  get friendId(): string {
    return this.record.friendId;
  }
  get status(): FriendshipStatus {
    return this.record.status;
  }
  get initiatedBy(): string {
    return this.record.initiatedBy;
  }
  get createdAt(): string {
    return this.record.createdAt;
  }
  get acceptedAt(): string | undefined {
    return this.record.acceptedAt;
  }
  get customName(): string | undefined {
    return this.record.customName;
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Find a specific friendship between two users
   */
  static async findByUserIds(
    userId: string,
    friendId: string,
  ): Promise<Friendship | null> {
    const record = await db.getItem<FriendshipRecord>(
      Friendship.userPk(userId),
      Friendship.friendSk(friendId),
    );
    return record ? new Friendship(record) : null;
  }

  /**
   * Get all friendships for a user
   */
  static async findAllForUser(userId: string): Promise<Friendship[]> {
    const records = await db.queryByPk<FriendshipRecord>(
      Friendship.userPk(userId),
      'FRIEND#',
    );
    return records.map((r) => new Friendship(r));
  }

  /**
   * Get all friendships with user details populated
   */
  static async findAllWithUsers(userId: string): Promise<FriendshipWithUser[]> {
    const friendships = await Friendship.findAllForUser(userId);
    const results: FriendshipWithUser[] = [];

    for (const friendship of friendships) {
      const friend = await User.findById(friendship.friendId);
      if (friend) {
        results.push({
          ...friendship.toJSON(),
          friend,
        });
      }
    }

    return results;
  }

  /**
   * Get accepted friend IDs for a user
   */
  static async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const friendships = await Friendship.findAllForUser(userId);
    return friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => f.friendId);
  }

  /**
   * Send a friend request
   */
  static async sendRequest(
    userId: string,
    targetUserId?: string,
    inviteCode?: string,
  ): Promise<{ success: boolean; message: string; friendship?: Friendship }> {
    let targetUser: User | null = null;

    // Find target user
    if (targetUserId) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return { success: false, message: 'User not found' };
      }
    } else if (inviteCode) {
      targetUser = await User.findByInviteCode(inviteCode);
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

    // Check existing friendship
    const existing = await Friendship.findByUserIds(userId, targetUser.userId);
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

    // Check reverse friendship (if they already requested us)
    const reverse = await Friendship.findByUserIds(targetUser.userId, userId);
    if (reverse) {
      if (reverse.status === 'blocked') {
        return { success: false, message: 'Cannot send friend request' };
      }
      if (reverse.status === 'pending') {
        // Auto-accept their request
        return Friendship.accept(userId, targetUser.userId);
      }
    }

    const now = new Date().toISOString();

    // Create bidirectional friendship records
    const requesterRecord: FriendshipRecord = {
      pk: Friendship.userPk(userId),
      sk: Friendship.friendSk(targetUser.userId),
      userId,
      friendId: targetUser.userId,
      status: 'pending',
      initiatedBy: userId,
      createdAt: now,
    };

    const targetRecord: FriendshipRecord = {
      pk: Friendship.userPk(targetUser.userId),
      sk: Friendship.friendSk(userId),
      userId: targetUser.userId,
      friendId: userId,
      status: 'pending',
      initiatedBy: userId,
      createdAt: now,
    };

    await db.batchWriteItems([{ put: requesterRecord }, { put: targetRecord }]);

    return {
      success: true,
      message: 'Friend request sent',
      friendship: new Friendship(requesterRecord),
    };
  }

  /**
   * Accept a friend request
   */
  static async accept(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string; friendship?: Friendship }> {
    const friendship = await Friendship.findByUserIds(userId, friendId);

    if (!friendship) {
      return { success: false, message: 'Friend request not found' };
    }

    if (friendship.status === 'accepted') {
      return { success: false, message: 'Already friends' };
    }

    if (friendship.status === 'blocked') {
      return { success: false, message: 'Cannot accept this request' };
    }

    if (friendship.initiatedBy === userId) {
      return {
        success: false,
        message: 'Cannot accept your own friend request',
      };
    }

    const now = new Date().toISOString();

    // Update both records
    await db.updateItem<FriendshipRecord>(
      Friendship.userPk(userId),
      Friendship.friendSk(friendId),
      { status: 'accepted' as FriendshipStatus, acceptedAt: now },
    );

    await db.updateItem<FriendshipRecord>(
      Friendship.userPk(friendId),
      Friendship.friendSk(userId),
      { status: 'accepted' as FriendshipStatus, acceptedAt: now },
    );

    const updated = await Friendship.findByUserIds(userId, friendId);
    return {
      success: true,
      message: 'Friend request accepted',
      friendship: updated ?? undefined,
    };
  }

  /**
   * Decline a friend request
   */
  static async decline(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const friendship = await Friendship.findByUserIds(userId, friendId);

    if (!friendship) {
      return { success: false, message: 'Friend request not found' };
    }

    if (friendship.status !== 'pending') {
      return { success: false, message: 'Can only decline pending requests' };
    }

    // Delete both records
    await db.deleteItem(
      Friendship.userPk(userId),
      Friendship.friendSk(friendId),
    );
    await db.deleteItem(
      Friendship.userPk(friendId),
      Friendship.friendSk(userId),
    );

    return { success: true, message: 'Friend request declined' };
  }

  /**
   * Remove a friendship
   */
  static async remove(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const friendship = await Friendship.findByUserIds(userId, friendId);

    if (!friendship) {
      return { success: false, message: 'Friendship not found' };
    }

    // Delete both records
    await db.deleteItem(
      Friendship.userPk(userId),
      Friendship.friendSk(friendId),
    );
    await db.deleteItem(
      Friendship.userPk(friendId),
      Friendship.friendSk(userId),
    );

    return { success: true, message: 'Friend removed' };
  }

  /**
   * Block a user
   */
  static async block(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString();

    // Delete their record of us
    await db.deleteItem(
      Friendship.userPk(friendId),
      Friendship.friendSk(userId),
    );

    // Update or create our record as blocked
    const existing = await Friendship.findByUserIds(userId, friendId);

    if (existing) {
      await db.updateItem<FriendshipRecord>(
        Friendship.userPk(userId),
        Friendship.friendSk(friendId),
        { status: 'blocked' as FriendshipStatus },
      );
    } else {
      const blockRecord: FriendshipRecord = {
        pk: Friendship.userPk(userId),
        sk: Friendship.friendSk(friendId),
        userId,
        friendId,
        status: 'blocked',
        initiatedBy: userId,
        createdAt: now,
      };
      await db.putItem(blockRecord);
    }

    return { success: true, message: 'User blocked' };
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Convert to JSON-safe object
   */
  toJSON(): FriendshipData {
    return stripDynamoKeys(this.record) as FriendshipData;
  }
}
