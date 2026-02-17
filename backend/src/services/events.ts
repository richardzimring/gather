import { eq, and, or, ne, inArray } from 'drizzle-orm';
import { db, events, eventInvitees, users } from '../db';
import type {
  Event,
  EventInvitee,
  CreateEvent,
  UpdateEvent,
  EventResponse,
  CounterProposal,
} from '../types';
import { getUserById } from './users';
import {
  notifyEventInvitation,
  notifyEventResponse,
  notifyEventUpdated,
  notifyEventCancelled,
  notifyCounterProposal,
} from './notifications';
import { generateEmoji } from './emoji';

// ============================================
// Helpers
// ============================================

type InviteeWithUser = typeof eventInvitees.$inferSelect & {
  user: typeof users.$inferSelect | null;
};

const dbInviteeToEventInvitee = (dbInvitee: InviteeWithUser): EventInvitee => {
  const counterProposal: CounterProposal | undefined =
    dbInvitee.counterProposalStartTime ||
    dbInvitee.counterProposalEndTime ||
    dbInvitee.counterProposalLocation ||
    dbInvitee.counterProposalMessage
      ? {
          startTime: dbInvitee.counterProposalStartTime?.toISOString(),
          endTime: dbInvitee.counterProposalEndTime?.toISOString(),
          location: dbInvitee.counterProposalLocation ?? undefined,
          message: dbInvitee.counterProposalMessage ?? undefined,
        }
      : undefined;

  const user = dbInvitee.user;
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '??';

  return {
    userId: dbInvitee.userId,
    fullName,
    initials,
    avatarUrl: user?.avatarUrl ?? undefined,
    status: dbInvitee.status,
    respondedAt: dbInvitee.respondedAt?.toISOString(),
    counterProposal,
  };
};

interface HostInfo {
  hostName: string;
  hostInitials: string;
  hostAvatarUrl?: string;
}

const dbEventToEvent = (
  dbEvent: typeof events.$inferSelect,
  invitees: EventInvitee[],
  host: HostInfo,
): Event => {
  return {
    eventId: dbEvent.id,
    hostId: dbEvent.hostId,
    hostName: host.hostName,
    hostInitials: host.hostInitials,
    hostAvatarUrl: host.hostAvatarUrl,
    title: dbEvent.title,
    emoji: dbEvent.emoji ?? undefined,
    startTime: dbEvent.startTime.toISOString(),
    endTime: dbEvent.endTime.toISOString(),
    location: dbEvent.location ?? undefined,
    locationPlaceId: dbEvent.locationPlaceId ?? undefined,
    locationAddress: dbEvent.locationAddress ?? undefined,
    latitude: dbEvent.latitude ?? undefined,
    longitude: dbEvent.longitude ?? undefined,
    notes: dbEvent.notes ?? undefined,
    invitees,
    showInviteList: dbEvent.showInviteList,
    status: dbEvent.status,
    calendarEventId: dbEvent.calendarEventId ?? undefined,
    createdAt: dbEvent.createdAt.toISOString(),
    updatedAt: dbEvent.updatedAt.toISOString(),
  };
};

const getHostInfo = (hostUser: typeof users.$inferSelect | null): HostInfo => {
  if (!hostUser) {
    return { hostName: 'Unknown', hostInitials: '??' };
  }
  return {
    hostName: `${hostUser.firstName} ${hostUser.lastName}`,
    hostInitials: `${hostUser.firstName.charAt(0)}${hostUser.lastName.charAt(0)}`.toUpperCase(),
    hostAvatarUrl: hostUser.avatarUrl ?? undefined,
  };
};

// ============================================
// Event Operations
// ============================================

export const getEvent = async (eventId: string): Promise<Event | null> => {
  // Get event with host user data
  const result = await db
    .select({
      event: events,
      host: users,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(eq(events.id, eventId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  // Get all invitees for this event with user data
  const inviteeRecords = await db
    .select({
      eventId: eventInvitees.eventId,
      userId: eventInvitees.userId,
      status: eventInvitees.status,
      respondedAt: eventInvitees.respondedAt,
      counterProposalStartTime: eventInvitees.counterProposalStartTime,
      counterProposalEndTime: eventInvitees.counterProposalEndTime,
      counterProposalLocation: eventInvitees.counterProposalLocation,
      counterProposalMessage: eventInvitees.counterProposalMessage,
      user: users,
    })
    .from(eventInvitees)
    .leftJoin(users, eq(eventInvitees.userId, users.id))
    .where(eq(eventInvitees.eventId, eventId));

  const invitees = inviteeRecords.map(dbInviteeToEventInvitee);
  const hostInfo = getHostInfo(row.host);
  return dbEventToEvent(row.event, invitees, hostInfo);
};

export const getEventsForUser = async (userId: string): Promise<Event[]> => {
  // Get all events where user is host OR invitee, excluding cancelled
  // First, get event IDs where user is an invitee
  const invitedEventIds = await db
    .select({ eventId: eventInvitees.eventId })
    .from(eventInvitees)
    .where(eq(eventInvitees.userId, userId));

  const invitedIds = invitedEventIds.map((r) => r.eventId);

  // Get all events with host user data, excluding cancelled
  const eventResults = await db
    .select({
      event: events,
      host: users,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(
      and(
        ne(events.status, 'cancelled'),
        invitedIds.length > 0
          ? or(eq(events.hostId, userId), inArray(events.id, invitedIds))
          : eq(events.hostId, userId),
      ),
    )
    .orderBy(events.startTime);

  if (eventResults.length === 0) return [];

  // Get all invitees for these events with user data in one query
  const eventIds = eventResults.map((r) => r.event.id);
  const allInvitees = await db
    .select({
      eventId: eventInvitees.eventId,
      userId: eventInvitees.userId,
      status: eventInvitees.status,
      respondedAt: eventInvitees.respondedAt,
      counterProposalStartTime: eventInvitees.counterProposalStartTime,
      counterProposalEndTime: eventInvitees.counterProposalEndTime,
      counterProposalLocation: eventInvitees.counterProposalLocation,
      counterProposalMessage: eventInvitees.counterProposalMessage,
      user: users,
    })
    .from(eventInvitees)
    .leftJoin(users, eq(eventInvitees.userId, users.id))
    .where(inArray(eventInvitees.eventId, eventIds));

  // Group invitees by event
  const inviteesByEvent = new Map<string, EventInvitee[]>();
  for (const invitee of allInvitees) {
    const existing = inviteesByEvent.get(invitee.eventId) ?? [];
    existing.push(dbInviteeToEventInvitee(invitee));
    inviteesByEvent.set(invitee.eventId, existing);
  }

  return eventResults.map((r) => {
    const hostInfo = getHostInfo(r.host);
    return dbEventToEvent(r.event, inviteesByEvent.get(r.event.id) ?? [], hostInfo);
  });
};

export const createEvent = async (hostId: string, input: CreateEvent): Promise<Event> => {
  // Handle location data - if locationData is provided, use it; otherwise fall back to location string
  const locationName = input.locationData?.name ?? input.location;
  const locationPlaceId = input.locationData?.placeId;
  const locationAddress = input.locationData?.address;
  const latitude = input.locationData?.latitude;
  const longitude = input.locationData?.longitude;

  // Generate emoji if not provided
  const emoji = input.emoji ?? (await generateEmoji(input.title));

  const [newEvent] = await db
    .insert(events)
    .values({
      hostId,
      title: input.title,
      emoji,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      location: locationName,
      locationPlaceId,
      locationAddress,
      latitude,
      longitude,
      notes: input.notes,
      showInviteList: input.showInviteList ?? true,
      status: 'active',
    })
    .returning();

  if (!newEvent) {
    throw new Error('Failed to create event');
  }

  // Create invitee records
  if (input.inviteeIds.length > 0) {
    const inviteeValues = input.inviteeIds.map((userId) => ({
      eventId: newEvent.id,
      userId,
      status: 'pending' as const,
    }));

    await db.insert(eventInvitees).values(inviteeValues);
  }

  // Fetch the complete event with user data
  const event = await getEvent(newEvent.id);
  if (!event) {
    throw new Error('Failed to fetch created event');
  }

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

  const updateData: Partial<typeof events.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }
  if (updates.emoji !== undefined) {
    updateData.emoji = updates.emoji === null ? null : updates.emoji;
  }
  if (updates.startTime !== undefined) {
    updateData.startTime = new Date(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    updateData.endTime = new Date(updates.endTime);
  }
  if (updates.locationData !== undefined) {
    if (updates.locationData === null) {
      // Clear all location fields
      updateData.location = null;
      updateData.locationPlaceId = null;
      updateData.locationAddress = null;
      updateData.latitude = null;
      updateData.longitude = null;
    } else {
      // Update with structured location data
      updateData.location = updates.locationData.name;
      updateData.locationPlaceId = updates.locationData.placeId;
      updateData.locationAddress = updates.locationData.address;
      updateData.latitude = updates.locationData.latitude ?? null;
      updateData.longitude = updates.locationData.longitude ?? null;
    }
  } else if (updates.location !== undefined) {
    // Backward compatibility: simple string location update
    updateData.location = updates.location === null ? null : updates.location;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes === null ? null : updates.notes;
  }
  if (updates.showInviteList !== undefined) {
    updateData.showInviteList = updates.showInviteList;
  }

  // Determine if significant details changed (location, time, date)
  // These changes require invitees to re-confirm their attendance
  const hasSignificantChanges = (() => {
    const timeChanged =
      (updates.startTime !== undefined &&
        new Date(updates.startTime).getTime() !== new Date(existing.startTime).getTime()) ||
      (updates.endTime !== undefined &&
        new Date(updates.endTime).getTime() !== new Date(existing.endTime).getTime());

    const locationChanged =
      (updates.locationData !== undefined &&
        (updates.locationData === null
          ? existing.location != null
          : updates.locationData.name !== existing.location ||
            updates.locationData.placeId !== existing.locationPlaceId ||
            updates.locationData.address !== existing.locationAddress)) ||
      (updates.location !== undefined &&
        updates.locationData === undefined &&
        (updates.location === null
          ? existing.location != null
          : updates.location !== existing.location));

    return timeChanged || locationChanged;
  })();

  await db.update(events).set(updateData).where(eq(events.id, eventId));

  // If significant details changed, reset all invitee approvals to pending
  if (hasSignificantChanges && existing.invitees.length > 0) {
    await db
      .update(eventInvitees)
      .set({
        status: 'pending',
        respondedAt: null,
        counterProposalStartTime: null,
        counterProposalEndTime: null,
        counterProposalLocation: null,
        counterProposalMessage: null,
      })
      .where(eq(eventInvitees.eventId, eventId));
  }

  const updatedEvent = await getEvent(eventId);

  // Notify invitees of the update
  if (updatedEvent) {
    const inviteeIds = updatedEvent.invitees.map((i) => i.userId);
    if (inviteeIds.length > 0) {
      await notifyEventUpdated(inviteeIds, updatedEvent, hasSignificantChanges);
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

  await db
    .update(events)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(events.id, eventId));

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

  const now = new Date();

  // Build update data
  const updateData: Partial<typeof eventInvitees.$inferInsert> = {
    status: responseData.status,
    respondedAt: now,
  };

  if (responseData.counterProposal) {
    updateData.counterProposalStartTime = responseData.counterProposal.startTime
      ? new Date(responseData.counterProposal.startTime)
      : null;
    updateData.counterProposalEndTime = responseData.counterProposal.endTime
      ? new Date(responseData.counterProposal.endTime)
      : null;
    updateData.counterProposalLocation = responseData.counterProposal.location ?? null;
    updateData.counterProposalMessage = responseData.counterProposal.message ?? null;
  }

  await db
    .update(eventInvitees)
    .set(updateData)
    .where(and(eq(eventInvitees.eventId, eventId), eq(eventInvitees.userId, userId)));

  // Notify the host of the response
  const responder = await getUserById(userId);
  if (responder) {
    await notifyEventResponse(event.hostId, event, responder.fullName, responseData.status);

    // If there's a counter proposal, send additional notification
    if (responseData.counterProposal) {
      await notifyCounterProposal(event.hostId, event, responder.fullName);
    }
  }

  return { success: true };
};
