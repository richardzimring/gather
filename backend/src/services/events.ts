import { eq, and, or, ne, inArray, isNull } from 'drizzle-orm';
import { db, events, eventInvitees, users, pendingInvites } from '../db';
import type {
  Event,
  EventInvitee,
  PendingInvitee,
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
  notifyCounterProposalRetracted,
} from './notifications';
import { generateEmoji } from './emoji';
import {
  exportEventForUser,
  exportEventForAllUsers,
  removeExportedEventForUser,
  removeExportedEventForAllUsers,
} from './calendar-export';

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
  pendingInvitees: PendingInvitee[] = [],
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
    pendingInvitees,
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
    hostInitials:
      `${hostUser.firstName.charAt(0)}${hostUser.lastName.charAt(0)}`.toUpperCase(),
    hostAvatarUrl: hostUser.avatarUrl ?? undefined,
  };
};

/**
 * Fetch unclaimed (still-pending) non-user invites for the given events,
 * grouped by event id. These are people the host invited via SMS who have not
 * yet joined Gather. Only an opaque id is returned (no phone).
 */
const getPendingInviteesByEvent = async (
  eventIds: string[],
): Promise<Map<string, PendingInvitee[]>> => {
  const byEvent = new Map<string, PendingInvitee[]>();
  if (eventIds.length === 0) return byEvent;

  const rows = await db
    .select({ id: pendingInvites.id, eventId: pendingInvites.eventId })
    .from(pendingInvites)
    .where(
      and(
        inArray(pendingInvites.eventId, eventIds),
        eq(pendingInvites.type, 'event'),
        isNull(pendingInvites.claimedByUserId),
      ),
    );

  for (const row of rows) {
    if (!row.eventId) continue;
    const existing = byEvent.get(row.eventId) ?? [];
    existing.push({ id: row.id });
    byEvent.set(row.eventId, existing);
  }
  return byEvent;
};

// ============================================
// Event Operations
// ============================================

/** Relations loaded for every event read. */
const withEventRelations = {
  host: true,
  invitees: { with: { user: true } },
} as const;

type EventRow = typeof events.$inferSelect & {
  host: typeof users.$inferSelect | null;
  invitees: InviteeWithUser[];
};

const toEvent = (row: EventRow, pendingInvitees: PendingInvitee[]): Event =>
  dbEventToEvent(
    row,
    row.invitees.map(dbInviteeToEventInvitee),
    getHostInfo(row.host),
    pendingInvitees,
  );

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const row = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: withEventRelations,
  });
  if (!row) return null;

  const pendingByEvent = await getPendingInviteesByEvent([eventId]);
  return toEvent(row, pendingByEvent.get(eventId) ?? []);
};

export const getEventsForUser = async (userId: string): Promise<Event[]> => {
  // All events where the user is host or invitee, excluding cancelled
  const rows = await db.query.events.findMany({
    where: and(
      ne(events.status, 'cancelled'),
      or(
        eq(events.hostId, userId),
        inArray(
          events.id,
          db
            .select({ id: eventInvitees.eventId })
            .from(eventInvitees)
            .where(eq(eventInvitees.userId, userId)),
        ),
      ),
    ),
    with: withEventRelations,
    orderBy: events.startTime,
  });

  const pendingByEvent = await getPendingInviteesByEvent(rows.map((r) => r.id));
  return rows.map((row) => toEvent(row, pendingByEvent.get(row.id) ?? []));
};

export const createEvent = async (
  hostId: string,
  input: CreateEvent,
): Promise<Event> => {
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

  // Fire-and-forget: export to host's calendar sync destinations
  exportEventForUser(hostId, newEvent.id).catch((err) =>
    console.error(
      `[calendar-export] Failed to export event ${newEvent.id} for host:`,
      err,
    ),
  );

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
        new Date(updates.startTime).getTime() !==
          new Date(existing.startTime).getTime()) ||
      (updates.endTime !== undefined &&
        new Date(updates.endTime).getTime() !==
          new Date(existing.endTime).getTime());

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

  // Add new invitees if requested
  let newlyAddedInviteeIds: string[] = [];
  if (updates.addInviteeIds && updates.addInviteeIds.length > 0) {
    const existingInviteeIds = new Set(existing.invitees.map((i) => i.userId));
    existingInviteeIds.add(hostId); // also exclude the host
    newlyAddedInviteeIds = updates.addInviteeIds.filter(
      (id) => !existingInviteeIds.has(id),
    );

    if (newlyAddedInviteeIds.length > 0) {
      await db.insert(eventInvitees).values(
        newlyAddedInviteeIds.map((userId) => ({
          eventId,
          userId,
          status: 'pending' as const,
        })),
      );
    }
  }

  const updatedEvent = await getEvent(eventId);

  if (updatedEvent) {
    const existingInviteeIds = existing.invitees.map((i) => i.userId);

    // Only notify existing invitees about the event update if actual event
    // fields changed (not just because new people were added)
    const eventFieldsChanged =
      Object.keys(updateData).filter((k) => k !== 'updatedAt').length > 0;
    if (eventFieldsChanged && existingInviteeIds.length > 0) {
      await notifyEventUpdated(
        existingInviteeIds,
        updatedEvent,
        hasSignificantChanges,
      );
    }

    // Notify newly added invitees with the invitation notification
    if (newlyAddedInviteeIds.length > 0) {
      const hostUser = await getUserById(hostId);
      const hostName = hostUser
        ? `${hostUser.firstName} ${hostUser.lastName}`
        : 'Someone';
      await notifyEventInvitation(newlyAddedInviteeIds, updatedEvent, hostName);
    }
  }

  // Fire-and-forget: update exported calendar events for all users who have this synced
  exportEventForAllUsers(eventId).catch((err) =>
    console.error(
      `[calendar-export] Failed to update exports for event ${eventId}:`,
      err,
    ),
  );

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

  // Fire-and-forget: remove this event from all users' exported calendars
  removeExportedEventForAllUsers(eventId).catch((err) =>
    console.error(
      `[calendar-export] Failed to remove exports for cancelled event ${eventId}:`,
      err,
    ),
  );

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

  if (responseData.counterProposal === null) {
    updateData.counterProposalStartTime = null;
    updateData.counterProposalEndTime = null;
    updateData.counterProposalLocation = null;
    updateData.counterProposalMessage = null;
  } else if (responseData.counterProposal) {
    updateData.counterProposalStartTime = responseData.counterProposal.startTime
      ? new Date(responseData.counterProposal.startTime)
      : null;
    updateData.counterProposalEndTime = responseData.counterProposal.endTime
      ? new Date(responseData.counterProposal.endTime)
      : null;
    updateData.counterProposalLocation =
      responseData.counterProposal.location ?? null;
    updateData.counterProposalMessage =
      responseData.counterProposal.message ?? null;
  }

  await db
    .update(eventInvitees)
    .set(updateData)
    .where(
      and(eq(eventInvitees.eventId, eventId), eq(eventInvitees.userId, userId)),
    );

  // Notify the host of the response
  const responder = await getUserById(userId);
  if (responder) {
    const statusChanged = invitee.status !== responseData.status;

    if (statusChanged) {
      await notifyEventResponse(
        event.hostId,
        event,
        responder.fullName,
        responseData.status,
      );
    }

    // Notify host when a counter proposal is submitted, updated, or withdrawn
    if (responseData.counterProposal) {
      await notifyCounterProposal(event.hostId, event, responder.fullName);
    } else if (responseData.counterProposal === null) {
      await notifyCounterProposalRetracted(
        event.hostId,
        event,
        responder.fullName,
      );
    }
  }

  // Fire-and-forget: sync calendar export based on RSVP status change
  if (invitee.status !== responseData.status) {
    if (responseData.status === 'accepted') {
      // User accepted — export event to their calendar
      exportEventForUser(userId, eventId).catch((err) =>
        console.error(
          `[calendar-export] Failed to export event ${eventId} for invitee ${userId}:`,
          err,
        ),
      );
    } else if (
      responseData.status === 'declined' &&
      invitee.status === 'accepted'
    ) {
      // User declined after previously accepting — remove from their calendar
      removeExportedEventForUser(userId, eventId).catch((err) =>
        console.error(
          `[calendar-export] Failed to remove export for event ${eventId} user ${userId}:`,
          err,
        ),
      );
    }
  }

  return { success: true };
};
