import { z } from '@hono/zod-openapi';
import { v4 as uuidv4 } from 'uuid';
import { BaseModel, db, stripDynamoKeys } from './base';

// ============================================
// Schema
// ============================================

export const RecurringPatternSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
]);

export const RecurringSchema = z.object({
  pattern: RecurringPatternSchema,
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  endDate: z.string().datetime().optional(),
});

export const VisibilityTypeSchema = z.enum(['all', 'groups', 'specific']);

export const VisibilitySchema = z.object({
  type: VisibilityTypeSchema,
  groupIds: z.array(z.string().uuid()).optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

export const AvailabilityWindowSchema = z.object({
  userId: z.string().uuid(),
  windowId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: RecurringSchema.optional(),
  visibleTo: VisibilitySchema,
  preferredActivities: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});

export const CreateAvailabilityInput = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: RecurringSchema.optional(),
  visibleTo: VisibilitySchema,
  preferredActivities: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateAvailabilityInput = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  recurring: RecurringSchema.nullable().optional(),
  visibleTo: VisibilitySchema.optional(),
  preferredActivities: z.array(z.string().uuid()).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type RecurringPattern = z.infer<typeof RecurringPatternSchema>;
export type Recurring = z.infer<typeof RecurringSchema>;
export type VisibilityType = z.infer<typeof VisibilityTypeSchema>;
export type Visibility = z.infer<typeof VisibilitySchema>;
export type AvailabilityWindowData = z.infer<typeof AvailabilityWindowSchema>;
export type CreateAvailabilityData = z.infer<typeof CreateAvailabilityInput>;
export type UpdateAvailabilityData = z.infer<typeof UpdateAvailabilityInput>;

// ============================================
// Record Type
// ============================================

interface AvailabilityRecord extends AvailabilityWindowData {
  pk: string; // USER#<userId>
  sk: string; // AVAILABILITY#<windowId>
}

// ============================================
// Model Class
// ============================================

export class AvailabilityWindow extends BaseModel<AvailabilityRecord> {
  // Key builders
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }
  private static availabilitySk(windowId: string) {
    return `AVAILABILITY#${windowId}`;
  }

  // ============================================
  // Accessors
  // ============================================

  get userId(): string {
    return this.record.userId;
  }
  get windowId(): string {
    return this.record.windowId;
  }
  get startTime(): string {
    return this.record.startTime;
  }
  get endTime(): string {
    return this.record.endTime;
  }
  get recurring(): Recurring | undefined {
    return this.record.recurring;
  }
  get visibleTo(): Visibility {
    return this.record.visibleTo;
  }
  get preferredActivities(): string[] | undefined {
    return this.record.preferredActivities;
  }
  get notes(): string | undefined {
    return this.record.notes;
  }
  get createdAt(): string {
    return this.record.createdAt;
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Find an availability window by ID
   */
  static async findById(
    userId: string,
    windowId: string,
  ): Promise<AvailabilityWindow | null> {
    const record = await db.getItem<AvailabilityRecord>(
      AvailabilityWindow.userPk(userId),
      AvailabilityWindow.availabilitySk(windowId),
    );
    return record ? new AvailabilityWindow(record) : null;
  }

  /**
   * Get all availability windows for a user
   */
  static async findByUser(userId: string): Promise<AvailabilityWindow[]> {
    const records = await db.queryByPk<AvailabilityRecord>(
      AvailabilityWindow.userPk(userId),
      'AVAILABILITY#',
    );
    return records.map((r) => new AvailabilityWindow(r));
  }

  /**
   * Get availability windows for multiple users
   */
  static async findByUsers(
    userIds: string[],
  ): Promise<Map<string, AvailabilityWindow[]>> {
    const result = new Map<string, AvailabilityWindow[]>();

    for (const userId of userIds) {
      const windows = await AvailabilityWindow.findByUser(userId);
      result.set(userId, windows);
    }

    return result;
  }

  /**
   * Create a new availability window
   */
  static async create(
    userId: string,
    input: CreateAvailabilityData,
  ): Promise<AvailabilityWindow> {
    const validated = CreateAvailabilityInput.parse(input);
    const windowId = uuidv4();
    const now = new Date().toISOString();

    const record: AvailabilityRecord = {
      pk: AvailabilityWindow.userPk(userId),
      sk: AvailabilityWindow.availabilitySk(windowId),
      userId,
      windowId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      recurring: validated.recurring,
      visibleTo: validated.visibleTo,
      preferredActivities: validated.preferredActivities,
      notes: validated.notes,
      createdAt: now,
    };

    await db.putItem(record);
    return new AvailabilityWindow(record);
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Check if this window is visible to a specific user
   */
  isVisibleTo(userId: string, userGroupIds: string[] = []): boolean {
    switch (this.visibleTo.type) {
      case 'all':
        return true;
      case 'specific':
        return this.visibleTo.userIds?.includes(userId) ?? false;
      case 'groups':
        return (
          this.visibleTo.groupIds?.some((gid) => userGroupIds.includes(gid)) ??
          false
        );
      default:
        return false;
    }
  }

  /**
   * Update availability window fields
   */
  async update(updates: UpdateAvailabilityData): Promise<AvailabilityWindow> {
    const validated = UpdateAvailabilityInput.parse(updates);
    const cleanUpdates: Partial<AvailabilityRecord> = {};

    if (validated.startTime !== undefined) {
      cleanUpdates.startTime = validated.startTime;
    }
    if (validated.endTime !== undefined) {
      cleanUpdates.endTime = validated.endTime;
    }
    if (validated.recurring !== undefined) {
      cleanUpdates.recurring =
        validated.recurring === null ? undefined : validated.recurring;
    }
    if (validated.visibleTo !== undefined) {
      cleanUpdates.visibleTo = validated.visibleTo;
    }
    if (validated.preferredActivities !== undefined) {
      cleanUpdates.preferredActivities =
        validated.preferredActivities === null
          ? undefined
          : validated.preferredActivities;
    }
    if (validated.notes !== undefined) {
      cleanUpdates.notes =
        validated.notes === null ? undefined : validated.notes;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      const updated = await db.updateItem<AvailabilityRecord>(
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
   * Convert to JSON-safe object
   */
  toJSON(): AvailabilityWindowData {
    return stripDynamoKeys(this.record) as AvailabilityWindowData;
  }
}
