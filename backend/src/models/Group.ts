import { z } from '@hono/zod-openapi';
import { v4 as uuidv4 } from 'uuid';
import { BaseModel, db, stripDynamoKeys } from './base';

// ============================================
// Schema
// ============================================

export const GroupSchema = z.object({
  groupId: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(50),
  emoji: z.string().optional(),
  memberIds: z.array(z.string().uuid()),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const CreateGroupInput = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
});

export const UpdateGroupInput = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().nullable().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export type GroupData = z.infer<typeof GroupSchema>;
export type CreateGroupData = z.infer<typeof CreateGroupInput>;
export type UpdateGroupData = z.infer<typeof UpdateGroupInput>;

// ============================================
// Record Type
// ============================================

interface GroupRecord extends GroupData {
  pk: string; // GROUP#<groupId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<ownerId>
  gsi1sk: string; // GROUP#<groupId>
}

// ============================================
// Model Class
// ============================================

export class Group extends BaseModel<GroupRecord> {
  // Key builders
  private static groupPk(groupId: string) {
    return `GROUP#${groupId}`;
  }
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }

  // ============================================
  // Accessors
  // ============================================

  get groupId(): string {
    return this.record.groupId;
  }
  get ownerId(): string {
    return this.record.ownerId;
  }
  get name(): string {
    return this.record.name;
  }
  get emoji(): string | undefined {
    return this.record.emoji;
  }
  get memberIds(): string[] {
    return this.record.memberIds;
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
   * Find a group by ID
   */
  static async findById(groupId: string): Promise<Group | null> {
    const record = await db.getItem<GroupRecord>(
      Group.groupPk(groupId),
      'METADATA',
    );
    return record ? new Group(record) : null;
  }

  /**
   * Get all groups for a user
   */
  static async findByOwner(ownerId: string): Promise<Group[]> {
    const records = await db.queryByGsi1<GroupRecord>(
      Group.userPk(ownerId),
      'GROUP#',
    );
    return records.map((r) => new Group(r));
  }

  /**
   * Create a new group
   */
  static async create(ownerId: string, input: CreateGroupData): Promise<Group> {
    const validated = CreateGroupInput.parse(input);
    const groupId = uuidv4();
    const now = new Date().toISOString();

    const record: GroupRecord = {
      pk: Group.groupPk(groupId),
      sk: 'METADATA',
      gsi1pk: Group.userPk(ownerId),
      gsi1sk: `GROUP#${groupId}`,
      groupId,
      ownerId,
      name: validated.name,
      emoji: validated.emoji,
      memberIds: validated.memberIds,
      isDefault: false,
      createdAt: now,
    };

    await db.putItem(record);
    return new Group(record);
  }

  /**
   * Create default groups for a new user
   */
  static async createDefaults(ownerId: string): Promise<Group[]> {
    const defaults = [
      { name: 'All Friends', emoji: '👥' },
      { name: 'Close Friends', emoji: '💫' },
    ];

    const now = new Date().toISOString();
    const records: GroupRecord[] = defaults.map((group) => {
      const groupId = uuidv4();
      return {
        pk: Group.groupPk(groupId),
        sk: 'METADATA',
        gsi1pk: Group.userPk(ownerId),
        gsi1sk: `GROUP#${groupId}`,
        groupId,
        ownerId,
        name: group.name,
        emoji: group.emoji,
        memberIds: [],
        isDefault: true,
        createdAt: now,
      };
    });

    await db.batchWriteItems(records.map((r) => ({ put: r })));
    return records.map((r) => new Group(r));
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Update group fields
   */
  async update(updates: UpdateGroupData): Promise<Group> {
    if (this.isDefault) {
      // Only allow updating members for default groups
      if (updates.name !== undefined || updates.emoji !== undefined) {
        throw new Error('Cannot update name or emoji of default groups');
      }
    }

    const validated = UpdateGroupInput.parse(updates);
    const cleanUpdates: Partial<GroupRecord> = {};

    if (validated.name !== undefined) {
      cleanUpdates.name = validated.name;
    }
    if (validated.emoji !== undefined) {
      cleanUpdates.emoji =
        validated.emoji === null ? undefined : validated.emoji;
    }
    if (validated.memberIds !== undefined) {
      cleanUpdates.memberIds = validated.memberIds;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      const updated = await db.updateItem<GroupRecord>(
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
   * Add a member to the group
   */
  async addMember(userId: string): Promise<void> {
    if (!this.record.memberIds.includes(userId)) {
      const updatedMembers = [...this.record.memberIds, userId];
      await db.updateItem(this.pk, this.sk, { memberIds: updatedMembers });
      this.record.memberIds = updatedMembers;
    }
  }

  /**
   * Remove a member from the group
   */
  async removeMember(userId: string): Promise<void> {
    const updatedMembers = this.record.memberIds.filter((id) => id !== userId);
    await db.updateItem(this.pk, this.sk, { memberIds: updatedMembers });
    this.record.memberIds = updatedMembers;
  }

  /**
   * Delete the group (only non-default groups)
   */
  override async delete(): Promise<void> {
    if (this.isDefault) {
      throw new Error('Cannot delete default groups');
    }
    await super.delete();
  }

  /**
   * Convert to JSON-safe object
   */
  toJSON(): GroupData {
    return stripDynamoKeys(this.record) as GroupData;
  }
}
