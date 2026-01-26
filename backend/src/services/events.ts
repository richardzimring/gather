import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type {
  Event,
  EventRecord,
  EventInvitee,
  EventInviteeRecord,
  CreateEvent,
  UpdateEvent,
  EventResponse,
  InviteeStatus,
  EventStatus,
} from '../types';
import { getUserById } from './users';
import {
  notifyEventInvitation,
  notifyEventResponse,
  notifyEventUpdated,
  notifyEventCancelled,
  notifyCounterProposal,
} from './notifications';

// ============================================
// Key Builders
// ============================================

const eventPk = (eventId: string) => `EVENT#${eventId}`;
const userPk = (userId: string) => `USER#${userId}`;
const inviteeSk = (userId: string) => `INVITEE#${userId}`;

// ============================================
// Event Operations
// ============================================

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const record = await db.getItem<EventRecord>(eventPk(eventId), 'METADATA');
  if (!record) return null;

  // Get all invitees for this event
  const inviteeRecords = await db.queryByPk<EventInviteeRecord>(
    eventPk(eventId),
    'INVITEE#',
  );
  const invitees: EventInvitee[] = inviteeRecords.map((r) => ({
    userId: r.userId,
    status: r.status,
    respondedAt: r.respondedAt,
    counterProposal: r.counterProposal,
  }));

  return recordToEvent(record, invitees);
};

export const getEventsForUser = async (userId: string): Promise<Event[]> => {
  // Get events hosted by user
  const hostedRecords = await db.queryByGsi1<EventRecord>(
    userPk(userId),
    'EVENT#',
  );

  // Get events user is invited to
  const inviteRecords = await db.queryByGsi1<EventInviteeRecord>(
    userPk(userId),
    'INVITE#',
  );

  // Collect unique event IDs
  const eventIds = new Set<string>();
  hostedRecords.forEach((r) => eventIds.add(r.eventId));
  inviteRecords.forEach((r) => eventIds.add(r.eventId));

  // Fetch full event details
  const events: Event[] = [];
  for (const eventId of eventIds) {
    const event = await getEvent(eventId);
    if (event && event.status !== 'cancelled') {
      events.push(event);
    }
  }

  // Sort by start time
  events.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return events;
};

export const createEvent = async (
  hostId: string,
  input: CreateEvent,
): Promise<Event> => {
  const eventId = uuidv4();
  const now = new Date().toISOString();

  // Create event record
  const eventRecord: EventRecord = {
    pk: eventPk(eventId),
    sk: 'METADATA',
    gsi1pk: userPk(hostId),
    gsi1sk: `EVENT#${input.startTime}#${eventId}`,
    eventId,
    hostId,
    title: input.title,
    activityId: input.activityId,
    emoji: input.emoji,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    notes: input.notes,
    invitees: [], // Will be populated from invitee records
    showInviteList: input.showInviteList ?? true,
    status: 'sent',
    createdAt: now,
    updatedAt: now,
  };

  await db.putItem(eventRecord);

  // Create invitee records
  const inviteeRecords: EventInviteeRecord[] = input.inviteeIds.map(
    (userId) => ({
      pk: eventPk(eventId),
      sk: inviteeSk(userId),
      gsi1pk: userPk(userId),
      gsi1sk: `INVITE#pending#${input.startTime}#${eventId}`,
      eventId,
      userId,
      status: 'pending' as InviteeStatus,
    }),
  );

  if (inviteeRecords.length > 0) {
    await db.batchWriteItems(inviteeRecords.map((r) => ({ put: r })));
  }

  // Return full event
  const invitees: EventInvitee[] = inviteeRecords.map((r) => ({
    userId: r.userId,
    status: r.status,
  }));

  const event = recordToEvent(eventRecord, invitees);

  // Send notifications to invitees
  if (input.inviteeIds.length > 0) {
    const host = await getUserById(hostId);
    if (host) {
      await notifyEventInvitation(input.inviteeIds, event, host.fullName);
    }
  }

  return event;
};

export const updateEvent = async (
  eventId: string,
  hostId: string,
  updates: UpdateEvent,
): Promise<{ success: boolean; event?: Event; message?: string }> => {
  const existing = await getEvent(eventId);

  if (!existing) {
    return { success: false, message: 'Event not found' };
  }

  if (existing.hostId !== hostId) {
    return { success: false, message: 'Not authorized to update this event' };
  }

  if (existing.status === 'cancelled') {
    return { success: false, message: 'Cannot update cancelled event' };
  }

  const now = new Date().toISOString();
  const cleanUpdates: Record<string, unknown> = { updatedAt: now };

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      cleanUpdates[key] = undefined;
    } else if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  await db.updateItem<EventRecord>(eventPk(eventId), 'METADATA', cleanUpdates);

  const updatedEvent = await getEvent(eventId);

  // Notify invitees of the update
  if (updatedEvent) {
    const inviteeIds = updatedEvent.invitees.map((i) => i.userId);
    if (inviteeIds.length > 0) {
      await notifyEventUpdated(inviteeIds, updatedEvent);
    }
  }

  return { success: true, event: updatedEvent ?? undefined };
};

export const cancelEvent = async (
  eventId: string,
  hostId: string,
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getEvent(eventId);

  if (!existing) {
    return { success: false, message: 'Event not found' };
  }

  if (existing.hostId !== hostId) {
    return { success: false, message: 'Not authorized to cancel this event' };
  }

  if (existing.status === 'cancelled') {
    return { success: false, message: 'Event already cancelled' };
  }

  const now = new Date().toISOString();
  await db.updateItem<EventRecord>(eventPk(eventId), 'METADATA', {
    status: 'cancelled' as EventStatus,
    updatedAt: now,
  });

  // Notify invitees of cancellation
  const inviteeIds = existing.invitees.map((i) => i.userId);
  if (inviteeIds.length > 0) {
    await notifyEventCancelled(inviteeIds, existing);
  }

  return { success: true };
};

export const respondToEvent = async (
  eventId: string,
  userId: string,
  responseData: EventResponse,
): Promise<{ success: boolean; message?: string }> => {
  const event = await getEvent(eventId);

  if (!event) {
    return { success: false, message: 'Event not found' };
  }

  if (event.status === 'cancelled') {
    return { success: false, message: 'Cannot respond to cancelled event' };
  }

  // Check if user is an invitee
  const invitee = event.invitees.find((i) => i.userId === userId);
  if (!invitee) {
    return { success: false, message: 'You are not invited to this event' };
  }

  const now = new Date().toISOString();

  // Update invitee record
  const inviteeRecord = await db.getItem<EventInviteeRecord>(
    eventPk(eventId),
    inviteeSk(userId),
  );
  if (!inviteeRecord) {
    return { success: false, message: 'Invitation not found' };
  }

  // Update the GSI sort key to reflect new status
  const newGsi1sk = `INVITE#${responseData.status}#${event.startTime}#${eventId}`;

  const updates: Partial<EventInviteeRecord> = {
    status: responseData.status,
    respondedAt: now,
    gsi1sk: newGsi1sk,
  };

  if (responseData.counterProposal) {
    updates.counterProposal = responseData.counterProposal;
  }

  await db.updateItem<EventInviteeRecord>(
    eventPk(eventId),
    inviteeSk(userId),
    updates,
  );

  // Notify the host of the response
  const responder = await getUserById(userId);
  if (responder) {
    await notifyEventResponse(
      event.hostId,
      event,
      responder.fullName,
      responseData.status,
    );

    // If there's a counter proposal, send additional notification
    if (responseData.counterProposal) {
      await notifyCounterProposal(event.hostId, event, responder.fullName);
    }
  }

  // Check if all invitees have responded and all accepted - mark event as confirmed
  const updatedEvent = await getEvent(eventId);
  if (updatedEvent) {
    const allResponded = updatedEvent.invitees.every(
      (i) => i.status !== 'pending',
    );
    const allAccepted = updatedEvent.invitees.every(
      (i) => i.status === 'accepted',
    );

    if (allResponded && allAccepted && updatedEvent.status === 'sent') {
      await db.updateItem<EventRecord>(eventPk(eventId), 'METADATA', {
        status: 'confirmed' as EventStatus,
        updatedAt: now,
      });
    }
  }

  return { success: true };
};

// ============================================
// Helpers
// ============================================

const recordToEvent = (
  record: EventRecord,
  invitees: EventInvitee[],
): Event => {
  return {
    eventId: record.eventId,
    hostId: record.hostId,
    title: record.title,
    activityId: record.activityId,
    emoji: record.emoji,
    startTime: record.startTime,
    endTime: record.endTime,
    location: record.location,
    notes: record.notes,
    invitees,
    showInviteList: record.showInviteList,
    status: record.status,
    calendarEventId: record.calendarEventId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};
