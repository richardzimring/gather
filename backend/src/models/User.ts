import { z } from '@hono/zod-openapi';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { BaseModel, db, stripDynamoKeys } from './base';
import { INVITE_CODE_LENGTH } from '../constants';

// ============================================
// Schema
// ============================================

export const UserSchema = z.object({
  userId: z.string().uuid(),
  appleUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  calendarSyncEnabled: z.boolean().default(false),
  pushToken: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  inviteCode: z.string().optional(),
});

export const CreateUserInput = z.object({
  appleUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
});

export const UpdateUserInput = z.object({
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  calendarSyncEnabled: z.boolean().optional(),
});

export type UserData = z.infer<typeof UserSchema>;
export type CreateUserData = z.infer<typeof CreateUserInput>;
export type UpdateUserData = z.infer<typeof UpdateUserInput>;

// ============================================
// Record Type
// ============================================

interface UserRecord extends UserData {
  pk: string; // USER#<userId>
  sk: string; // PROFILE
  gsi1pk: string; // APPLE#<appleUserId>
  gsi1sk: string; // USER
}

interface InviteCodeRecord {
  pk: string; // INVITE#<inviteCode>
  sk: string; // METADATA
  inviteCode: string;
  userId: string;
  createdAt: string;
}

// ============================================
// Model Class
// ============================================

export class User extends BaseModel<UserRecord> {
  // Key builders
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }
  private static applePk(appleUserId: string) {
    return `APPLE#${appleUserId}`;
  }
  private static inviteCodePk(code: string) {
    return `INVITE#${code}`;
  }

  // ============================================
  // Accessors
  // ============================================

  get userId(): string {
    return this.record.userId;
  }
  get appleUserId(): string {
    return this.record.appleUserId;
  }
  get email(): string {
    return this.record.email;
  }
  get firstName(): string {
    return this.record.firstName;
  }
  get lastName(): string {
    return this.record.lastName;
  }
  get fullName(): string {
    return `${this.record.firstName} ${this.record.lastName}`;
  }
  get avatarUrl(): string | undefined {
    return this.record.avatarUrl;
  }
  get createdAt(): string {
    return this.record.createdAt;
  }
  get calendarSyncEnabled(): boolean {
    return this.record.calendarSyncEnabled;
  }
  get pushToken(): string | undefined {
    return this.record.pushToken;
  }
  get timezone(): string {
    return this.record.timezone;
  }
  get inviteCode(): string | undefined {
    return this.record.inviteCode;
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Find a user by their internal userId
   */
  static async findById(userId: string): Promise<User | null> {
    const record = await db.getItem<UserRecord>(User.userPk(userId), 'PROFILE');
    return record ? new User(record) : null;
  }

  /**
   * Find a user by their Apple User ID (sub claim from Apple JWT)
   */
  static async findByAppleUserId(appleUserId: string): Promise<User | null> {
    const records = await db.queryByGsi1<UserRecord>(
      User.applePk(appleUserId),
      'USER',
    );
    return records[0] ? new User(records[0]) : null;
  }

  /**
   * Find a user by their invite code
   */
  static async findByInviteCode(inviteCode: string): Promise<User | null> {
    const inviteRecord = await db.getItem<InviteCodeRecord>(
      User.inviteCodePk(inviteCode.toUpperCase()),
      'METADATA',
    );
    if (!inviteRecord) return null;
    return User.findById(inviteRecord.userId);
  }

  /**
   * Create a new user
   */
  static async create(input: CreateUserData): Promise<User> {
    const validated = CreateUserInput.parse(input);
    const userId = uuidv4();
    const now = new Date().toISOString();
    const inviteCode = User.generateInviteCode();

    const record: UserRecord = {
      pk: User.userPk(userId),
      sk: 'PROFILE',
      gsi1pk: User.applePk(validated.appleUserId),
      gsi1sk: 'USER',
      userId,
      appleUserId: validated.appleUserId,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      avatarUrl: validated.avatarUrl,
      createdAt: now,
      calendarSyncEnabled: false,
      timezone: validated.timezone ?? 'America/New_York',
      inviteCode,
    };

    const inviteCodeRecord: InviteCodeRecord = {
      pk: User.inviteCodePk(inviteCode),
      sk: 'METADATA',
      inviteCode,
      userId,
      createdAt: now,
    };

    await db.batchWriteItems([{ put: record }, { put: inviteCodeRecord }]);

    return new User(record);
  }

  /**
   * Generate a URL-safe invite code
   */
  private static generateInviteCode(): string {
    const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
    return bytes
      .toString('base64url')
      .slice(0, INVITE_CODE_LENGTH)
      .toUpperCase();
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Update user fields
   */
  async update(updates: UpdateUserData): Promise<User> {
    const validated = UpdateUserInput.parse(updates);

    const cleanUpdates: Partial<UserRecord> = {};
    if (validated.avatarUrl !== undefined) {
      cleanUpdates.avatarUrl =
        validated.avatarUrl === null ? undefined : validated.avatarUrl;
    }
    if (validated.timezone !== undefined) {
      cleanUpdates.timezone = validated.timezone;
    }
    if (validated.calendarSyncEnabled !== undefined) {
      cleanUpdates.calendarSyncEnabled = validated.calendarSyncEnabled;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      const updated = await db.updateItem<UserRecord>(
        this.pk,
        this.sk,
        cleanUpdates,
      );
      if (updated) {
        this.record = updated;
      }
    }

    return this;
  }

  /**
   * Update the push token for notifications
   */
  async updatePushToken(pushToken: string): Promise<void> {
    await db.updateItem(this.pk, this.sk, { pushToken });
    this.record.pushToken = pushToken;
  }

  /**
   * Regenerate the user's invite code
   */
  async regenerateInviteCode(): Promise<string> {
    const newInviteCode = User.generateInviteCode();
    const now = new Date().toISOString();

    // Delete old invite code record
    if (this.record.inviteCode) {
      await db.deleteItem(
        User.inviteCodePk(this.record.inviteCode),
        'METADATA',
      );
    }

    // Create new invite code record
    const inviteCodeRecord: InviteCodeRecord = {
      pk: User.inviteCodePk(newInviteCode),
      sk: 'METADATA',
      inviteCode: newInviteCode,
      userId: this.userId,
      createdAt: now,
    };

    await db.putItem(inviteCodeRecord);
    await db.updateItem(this.pk, this.sk, { inviteCode: newInviteCode });

    this.record.inviteCode = newInviteCode;
    return newInviteCode;
  }

  /**
   * Delete the user and their invite code
   */
  override async delete(): Promise<void> {
    const deleteOps: { delete: { pk: string; sk: string } }[] = [
      { delete: { pk: this.pk, sk: this.sk } },
    ];

    if (this.record.inviteCode) {
      deleteOps.push({
        delete: {
          pk: User.inviteCodePk(this.record.inviteCode),
          sk: 'METADATA',
        },
      });
    }

    await db.batchWriteItems(deleteOps);
  }

  /**
   * Convert to JSON-safe object
   */
  toJSON(): UserData {
    return stripDynamoKeys(this.record) as UserData;
  }
}
