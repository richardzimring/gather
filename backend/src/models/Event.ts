import { z } from '@hono/zod-openapi';
import { v4 as uuidv4 } from 'uuid';
import { BaseModel, db, stripDynamoKeys } from './base';

// ============================================
// Schema
// ============================================

export const InviteeStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'maybe',
]);
export const EventStatusSchema = z.enum([
  'draft',
  'sent',
  'confirmed',
  'cancelled',
]);

export const CounterProposalSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  activityId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

export const EventInviteeSchema = z.object({
  userId: z.string().uuid(),
  status: InviteeStatusSchema,
  respondedAt: z.string().datetime().optional(),
  counterProposal: CounterProposalSchema.optional(),
});

export const EventSchema = z.object({
  eventId: z.string().uuid(),
  hostId: z.string().uuid(),
  title: z.string().min(1).max(100),
  activityId: z.string().uuid().optional(),
  emoji: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  invitees: z.array(EventInviteeSchema),
  showInviteList: z.boolean().default(true),
  status: EventStatusSchema,
  calendarEventId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateEventInput = z.object({
  title: z.string().min(1).max(100),
  activityId: z.string().uuid().optional(),
  emoji: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  inviteeIds: z.array(z.string().uuid()),
  showInviteList: z.boolean().default(true),
});

export const UpdateEventInput = z.object({
  title: z.string().min(1).max(100).optional(),
  activityId: z.string().uuid().nullable().optional(),
  emoji: z.string().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  showInviteList: z.boolean().optional(),
});

export const EventResponseInput = z.object({
  status: InviteeStatusSchema,
  counterProposal: CounterProposalSchema.optional(),
});

export type InviteeStatus = z.infer<typeof InviteeStatusSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type CounterProposal = z.infer<typeof CounterProposalSchema>;
export type EventInvitee = z.infer<typeof EventInviteeSchema>;
export type EventData = z.infer<typeof EventSchema>;
export type CreateEventData = z.infer<typeof CreateEventInput>;
export type UpdateEventData = z.infer<typeof UpdateEventInput>;
export type EventResponseData = z.infer<typeof EventResponseInput>;

// ============================================
// Record Types
// ============================================

interface EventRecord extends Omit<EventData, 'invitees'> {
  pk: string; // EVENT#<eventId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<hostId>
  gsi1sk: string; // EVENT#<startTime>#<eventId>
  invitees: EventInvitee[];
}

interface EventInviteeRecord {
  pk: string; // EVENT#<eventId>
  sk: string; // INVITEE#<userId>
  gsi1pk: string; // USER#<userId>
  gsi1sk: string; // INVITE#<status>#<startTime>#<eventId>
  eventId: string;
  userId: string;
  status: InviteeStatus;
  respondedAt?: string;
  counterProposal?: CounterProposal;
}

// ============================================
// Model Class
// ============================================

export class Event extends BaseModel<EventRecord> {
  private inviteeList: EventInvitee[] = [];

  // Key builders
  private static eventPk(eventId: string) {
    return `EVENT#${eventId}`;
  }
  private static userPk(userId: string) {
    return `USER#${userId}`;
  }
  private static inviteeSk(userId: string) {
    return `INVITEE#${userId}`;
  }

  constructor(record: EventRecord, invitees?: EventInvitee[]) {
    super(record);
    this.inviteeList = invitees ?? record.invitees ?? [];
  }

  // ============================================
  // Accessors
  // ============================================

  get eventId(): string {
    return this.record.eventId;
  }
  get hostId(): string {
    return this.record.hostId;
  }
  get title(): string {
    return this.record.title;
  }
  get activityId(): string | undefined {
    return this.record.activityId;
  }
  get emoji(): string | undefined {
    return this.record.emoji;
  }
  get startTime(): string {
    return this.record.startTime;
  }
  get endTime(): string {
    return this.record.endTime;
  }
  get location(): string | undefined {
    return this.record.location;
  }
  get notes(): string | undefined {
    return this.record.notes;
  }
  get invitees(): EventInvitee[] {
    return this.inviteeList;
  }
  get showInviteList(): boolean {
    return this.record.showInviteList;
  }
  get status(): EventStatus {
    return this.record.status;
  }
  get calendarEventId(): string | undefined {
    return this.record.calendarEventId;
  }
  get createdAt(): string {
    return this.record.createdAt;
  }
  get updatedAt(): string {
    return this.record.updatedAt;
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Find an event by ID (includes invitees)
   */
  static async findById(eventId: string): Promise<Event | null> {
    const record = await db.getItem<EventRecord>(
      Event.eventPk(eventId),
      'METADATA',
    );
    if (!record) return null;

    // Get all invitees
    const inviteeRecords = await db.queryByPk<EventInviteeRecord>(
      Event.eventPk(eventId),
      'INVITEE#',
    );

    const invitees: EventInvitee[] = inviteeRecords.map((r) => ({
      userId: r.userId,
      status: r.status,
      respondedAt: r.respondedAt,
      counterProposal: r.counterProposal,
    }));

    return new Event(record, invitees);
  }

  /**
   * Get all events for a user (as host or invitee)
   */
  static async findForUser(userId: string): Promise<Event[]> {
    // Get events hosted by user
    const hostedRecords = await db.queryByGsi1<EventRecord>(
      Event.userPk(userId),
      'EVENT#',
    );

    // Get events user is invited to
    const inviteRecords = await db.queryByGsi1<EventInviteeRecord>(
      Event.userPk(userId),
      'INVITE#',
    );

    // Collect unique event IDs
    const eventIds = new Set<string>();
    hostedRecords.forEach((r) => eventIds.add(r.eventId));
    inviteRecords.forEach((r) => eventIds.add(r.eventId));

    // Fetch full event details
    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await Event.findById(eventId);
      if (event && event.status !== 'cancelled') {
        events.push(event);
      }
    }

    // Sort by start time
    events.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return events;
  }

  /**
   * Create a new event
   */
  static async create(hostId: string, input: CreateEventData): Promise<Event> {
    const validated = CreateEventInput.parse(input);
    const eventId = uuidv4();
    const now = new Date().toISOString();

    // Create event record
    const eventRecord: EventRecord = {
      pk: Event.eventPk(eventId),
      sk: 'METADATA',
      gsi1pk: Event.userPk(hostId),
      gsi1sk: `EVENT#${validated.startTime}#${eventId}`,
      eventId,
      hostId,
      title: validated.title,
      activityId: validated.activityId,
      emoji: validated.emoji,
      startTime: validated.startTime,
      endTime: validated.endTime,
      location: validated.location,
      notes: validated.notes,
      invitees: [],
      showInviteList: validated.showInviteList,
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };

    await db.putItem(eventRecord);

    // Create invitee records
    const inviteeRecords: EventInviteeRecord[] = validated.inviteeIds.map(
      (userId) => ({
        pk: Event.eventPk(eventId),
        sk: Event.inviteeSk(userId),
        gsi1pk: Event.userPk(userId),
        gsi1sk: `INVITE#pending#${validated.startTime}#${eventId}`,
        eventId,
        userId,
        status: 'pending' as InviteeStatus,
      }),
    );

    if (inviteeRecords.length > 0) {
      await db.batchWriteItems(inviteeRecords.map((r) => ({ put: r })));
    }

    const invitees: EventInvitee[] = inviteeRecords.map((r) => ({
      userId: r.userId,
      status: r.status,
    }));

    return new Event(eventRecord, invitees);
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Update event fields (only host can update)
   */
  async update(
    hostId: string,
    updates: UpdateEventData,
  ): Promise<{ success: boolean; message?: string }> {
    if (this.hostId !== hostId) {
      return { success: false, message: 'Not authorized to update this event' };
    }

    if (this.status === 'cancelled') {
      return { success: false, message: 'Cannot update cancelled event' };
    }

    const validated = UpdateEventInput.parse(updates);
    const now = new Date().toISOString();
    const cleanUpdates: Record<string, unknown> = { updatedAt: now };

    for (const [key, value] of Object.entries(validated)) {
      if (value === null) {
        cleanUpdates[key] = undefined;
      } else if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    const updated = await db.updateItem<EventRecord>(
      this.pk,
      this.sk,
      cleanUpdates,
    );
    if (updated) {
      this.record = updated;
    }

    return { success: true };
  }

  /**
   * Cancel the event (only host can cancel)
   */
  async cancel(
    hostId: string,
  ): Promise<{ success: boolean; message?: string }> {
    if (this.hostId !== hostId) {
      return { success: false, message: 'Not authorized to cancel this event' };
    }

    if (this.status === 'cancelled') {
      return { success: false, message: 'Event already cancelled' };
    }

    const now = new Date().toISOString();
    await db.updateItem<EventRecord>(this.pk, this.sk, {
      status: 'cancelled' as EventStatus,
      updatedAt: now,
    });

    this.record.status = 'cancelled';
    this.record.updatedAt = now;

    return { success: true };
  }

  /**
   * Respond to an event invitation
   */
  async respond(
    userId: string,
    response: EventResponseData,
  ): Promise<{ success: boolean; message?: string }> {
    if (this.status === 'cancelled') {
      return { success: false, message: 'Cannot respond to cancelled event' };
    }

    // Check if user is an invitee
    const invitee = this.inviteeList.find((i) => i.userId === userId);
    if (!invitee) {
      return { success: false, message: 'You are not invited to this event' };
    }

    const validated = EventResponseInput.parse(response);
    const now = new Date().toISOString();

    // Update the GSI sort key to reflect new status
    const newGsi1sk = `INVITE#${validated.status}#${this.startTime}#${this.eventId}`;

    const updates: Partial<EventInviteeRecord> = {
      status: validated.status,
      respondedAt: now,
      gsi1sk: newGsi1sk,
    };

    if (validated.counterProposal) {
      updates.counterProposal = validated.counterProposal;
    }

    await db.updateItem<EventInviteeRecord>(
      Event.eventPk(this.eventId),
      Event.inviteeSk(userId),
      updates,
    );

    // Update local invitee list
    const idx = this.inviteeList.findIndex((i) => i.userId === userId);
    if (idx >= 0) {
      this.inviteeList[idx] = {
        userId,
        status: validated.status,
        respondedAt: now,
        counterProposal: validated.counterProposal,
      };
    }

    // Check if all invitees responded and all accepted
    const allResponded = this.inviteeList.every((i) => i.status !== 'pending');
    const allAccepted = this.inviteeList.every((i) => i.status === 'accepted');

    if (allResponded && allAccepted && this.status === 'sent') {
      await db.updateItem<EventRecord>(this.pk, this.sk, {
        status: 'confirmed' as EventStatus,
        updatedAt: now,
      });
      this.record.status = 'confirmed';
      this.record.updatedAt = now;
    }

    return { success: true };
  }

  /**
   * Convert to JSON-safe object
   */
  toJSON(): EventData {
    const base = stripDynamoKeys(this.record);
    return {
      ...base,
      invitees: this.inviteeList,
    } as EventData;
  }
}
