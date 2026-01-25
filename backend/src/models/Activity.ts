import { z } from '@hono/zod-openapi';
import { v4 as uuidv4 } from 'uuid';
import { BaseModel, db, stripDynamoKeys } from './base';
import { DEFAULT_ACTIVITIES } from '../constants';

// ============================================
// Schema
// ============================================

export const ActivitySchema = z.object({
  activityId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(4),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const CreateActivityInput = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(4),
});

export const UpdateActivityInput = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().min(1).max(4).optional(),
});

export type ActivityData = z.infer<typeof ActivitySchema>;
export type CreateActivityData = z.infer<typeof CreateActivityInput>;
export type UpdateActivityData = z.infer<typeof UpdateActivityInput>;

// ============================================
// Record Type
// ============================================

interface ActivityRecord extends ActivityData {
  pk: string; // ACTIVITY#<activityId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<userId> or SYSTEM
  gsi1sk: string; // ACTIVITY#<activityId>
}

// ============================================
// Model Class
// ============================================

export class Activity extends BaseModel<ActivityRecord> {
  // Key builders
  private static activityPk(activityId: string) {
    return `ACTIVITY#${activityId}`;
  }
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }

  // ============================================
  // Accessors
  // ============================================

  get activityId(): string {
    return this.record.activityId;
  }
  get userId(): string | null {
    return this.record.userId;
  }
  get name(): string {
    return this.record.name;
  }
  get emoji(): string {
    return this.record.emoji;
  }
  get isDefault(): boolean {
    return this.record.isDefault;
  }
  get createdAt(): string {
    return this.record.createdAt;
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Find an activity by ID
   */
  static async findById(activityId: string): Promise<Activity | null> {
    const record = await db.getItem<ActivityRecord>(
      Activity.activityPk(activityId),
      'METADATA',
    );
    return record ? new Activity(record) : null;
  }

  /**
   * Get all activities for a user (including system defaults)
   */
  static async findForUser(userId: string): Promise<Activity[]> {
    // Get system default activities
    const defaultRecords = await db.queryByGsi1<ActivityRecord>(
      'SYSTEM',
      'ACTIVITY',
    );

    // Get user's custom activities
    const userRecords = await db.queryByGsi1<ActivityRecord>(
      Activity.userPk(userId),
      'ACTIVITY',
    );

    const allRecords = [...defaultRecords, ...userRecords];
    return allRecords.map((r) => new Activity(r));
  }

  /**
   * Get only system default activities
   */
  static async findDefaults(): Promise<Activity[]> {
    const records = await db.queryByGsi1<ActivityRecord>('SYSTEM', 'ACTIVITY');
    return records.map((r) => new Activity(r));
  }

  /**
   * Create a new custom activity for a user
   */
  static async create(
    userId: string,
    input: CreateActivityData,
  ): Promise<Activity> {
    const validated = CreateActivityInput.parse(input);
    const activityId = uuidv4();
    const now = new Date().toISOString();

    const record: ActivityRecord = {
      pk: Activity.activityPk(activityId),
      sk: 'METADATA',
      gsi1pk: Activity.userPk(userId),
      gsi1sk: `ACTIVITY#${activityId}`,
      activityId,
      userId,
      name: validated.name,
      emoji: validated.emoji,
      isDefault: false,
      createdAt: now,
    };

    await db.putItem(record);
    return new Activity(record);
  }

  /**
   * Ensure default activities exist in the database
   */
  static async ensureDefaults(): Promise<void> {
    const existing = await Activity.findDefaults();
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const records: ActivityRecord[] = DEFAULT_ACTIVITIES.map((activity) => {
      const activityId = uuidv4();
      return {
        pk: Activity.activityPk(activityId),
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
    });

    await db.batchWriteItems(records.map((r) => ({ put: r })));
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Update activity fields (only for non-default activities)
   */
  async update(updates: UpdateActivityData): Promise<Activity> {
    if (this.isDefault) {
      throw new Error('Cannot update default activities');
    }

    const validated = UpdateActivityInput.parse(updates);
    const cleanUpdates: Partial<ActivityRecord> = {};

    if (validated.name !== undefined) {
      cleanUpdates.name = validated.name;
    }
    if (validated.emoji !== undefined) {
      cleanUpdates.emoji = validated.emoji;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      const updated = await db.updateItem<ActivityRecord>(
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
   * Delete the activity (only non-default activities)
   */
  override async delete(): Promise<void> {
    if (this.isDefault) {
      throw new Error('Cannot delete default activities');
    }
    await super.delete();
  }

  /**
   * Convert to JSON-safe object
   */
  toJSON(): ActivityData {
    return stripDynamoKeys(this.record) as ActivityData;
  }
}
