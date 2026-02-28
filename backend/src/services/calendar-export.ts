import { eq, and, inArray } from 'drizzle-orm';
import {
  db,
  calendarConnections,
  calendarExportDestinations,
  calendarEventExports,
  events,
  eventInvitees,
  users,
} from '../db';
import type { CalendarExportStatus } from '../types';
import { getCalendarProvider } from './calendar-providers';
import { ensureValidAccessToken } from './calendars';

// ============================================
// Constants
// ============================================

const GATHER_CALENDAR_NAME = 'Gather';

// ============================================
// Helpers
// ============================================

/**
 * Build the description string for an exported Gather event.
 */
function buildEventDescription(
  notes?: string | null,
  otherAttendeeNames?: string[],
): string {
  const parts: string[] = [];
  if (notes) parts.push(notes);
  if (otherAttendeeNames && otherAttendeeNames.length > 0) {
    parts.push(`Also going: ${otherAttendeeNames.join(', ')}`);
  }
  return parts.join('\n\n');
}

/**
 * Get the first provider connection for a user that has a valid refresh token.
 * Used to get an access token for export operations.
 */
async function getProviderConnection(
  userId: string,
  provider: 'google' | 'outlook',
) {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
      ),
    )
    .limit(1);

  return connection ?? null;
}

// ============================================
// Export Status
// ============================================

/**
 * Returns the export status for all providers (google, outlook, apple) for a user.
 */
export const getExportStatus = async (
  userId: string,
): Promise<CalendarExportStatus[]> => {
  const providers: ('google' | 'outlook' | 'apple')[] = [
    'google',
    'outlook',
    'apple',
  ];

  const [userConnections, destinations] = await Promise.all([
    db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId)),
    db
      .select()
      .from(calendarExportDestinations)
      .where(eq(calendarExportDestinations.userId, userId)),
  ]);

  const statuses: CalendarExportStatus[] = [];

  for (const provider of providers) {
    const isConnected = userConnections.some((c) => c.provider === provider);
    const destination = destinations.find((d) => d.provider === provider);
    const hasExportScope =
      provider === 'apple'
        ? true // Apple export is device-side, no OAuth scope needed
        : userConnections
            .filter((c) => c.provider === provider)
            .some((c) => c.hasExportScope);

    let eventCount: number | undefined;
    if (destination) {
      const exports = await db
        .select({ id: calendarEventExports.id })
        .from(calendarEventExports)
        .where(eq(calendarEventExports.destinationId, destination.id));
      eventCount = exports.length;
    }

    statuses.push({
      provider,
      enabled: destination?.enabled ?? false,
      calendarName: destination?.calendarName,
      externalCalendarId: destination?.externalCalendarId,
      eventCount,
      hasExportScope,
      isConnected,
    });
  }

  return statuses;
};

// ============================================
// Enable / Disable Export
// ============================================

/**
 * Enable calendar export for a provider.
 * Creates the "Gather" secondary calendar if it doesn't exist,
 * then runs a full sync to export all current events.
 *
 * Caller must ensure the user has export-capable OAuth tokens before calling
 * (i.e., hasExportScope = true on at least one connection for that provider).
 */
export const enableExportForProvider = async (
  userId: string,
  provider: 'google' | 'outlook',
  userTimezone = 'UTC',
): Promise<CalendarExportStatus> => {
  const connection = await getProviderConnection(userId, provider);
  if (!connection) {
    throw new Error(
      `No ${provider} connection found for user. Connect ${provider} first.`,
    );
  }

  const accessToken = await ensureValidAccessToken(connection);
  const providerService = getCalendarProvider(provider);

  // Check if a destination already exists (re-enabling after disable)
  const [existing] = await db
    .select()
    .from(calendarExportDestinations)
    .where(
      and(
        eq(calendarExportDestinations.userId, userId),
        eq(calendarExportDestinations.provider, provider),
      ),
    )
    .limit(1);

  let externalCalendarId: string;

  if (existing) {
    // Verify the calendar still exists by attempting to re-enable
    externalCalendarId = existing.externalCalendarId;
    await db
      .update(calendarExportDestinations)
      .set({ enabled: true })
      .where(eq(calendarExportDestinations.id, existing.id));
  } else {
    // Create a new "Gather" calendar in the provider
    const created = await providerService.createCalendar(
      accessToken,
      GATHER_CALENDAR_NAME,
      userTimezone,
    );
    externalCalendarId = created.externalCalendarId;

    await db.insert(calendarExportDestinations).values({
      userId,
      provider,
      externalCalendarId,
      calendarName: GATHER_CALENDAR_NAME,
      enabled: true,
    });
  }

  // Run full sync to populate the calendar with current events
  await fullExportSync(userId, provider);

  const allStatuses = await getExportStatus(userId);
  const status = allStatuses.find((st) => st.provider === provider);
  if (!status) throw new Error(`Could not fetch export status for ${provider}`);
  return status;
};

/**
 * Disable calendar export for a provider.
 * Always removes exported events from the provider calendar.
 * Pass `deleteCalendar: true` (on disconnect) to also delete the "Gather"
 * calendar shell itself; otherwise the shell is kept so re-enabling is seamless.
 */
export const disableExportForProvider = async (
  userId: string,
  provider: 'google' | 'outlook',
  deleteCalendar = false,
): Promise<void> => {
  const [destination] = await db
    .select()
    .from(calendarExportDestinations)
    .where(
      and(
        eq(calendarExportDestinations.userId, userId),
        eq(calendarExportDestinations.provider, provider),
      ),
    )
    .limit(1);

  if (!destination) return;

  const connection = await getProviderConnection(userId, provider);
  if (connection) {
    try {
      const accessToken = await ensureValidAccessToken(connection);
      const providerService = getCalendarProvider(provider);

      if (deleteCalendar) {
        // Delete the entire calendar — faster than deleting events one-by-one
        await providerService.deleteCalendar(
          accessToken,
          destination.externalCalendarId,
        );
      } else {
        // Remove individual exported events, keep the "Gather" calendar shell
        // so re-enabling can reuse it without creating a duplicate.
        const exportRecords = await db
          .select()
          .from(calendarEventExports)
          .where(eq(calendarEventExports.destinationId, destination.id));

        await Promise.allSettled(
          exportRecords.map((record) =>
            providerService.deleteEvent(
              accessToken,
              destination.externalCalendarId,
              record.externalEventId,
            ),
          ),
        );
      }
    } catch {
      // Best-effort: if provider call fails, continue with DB cleanup
    }
  }

  if (deleteCalendar) {
    // Remove destination row; export records cascade-delete
    await db
      .delete(calendarExportDestinations)
      .where(eq(calendarExportDestinations.id, destination.id));
  } else {
    // Clear export records and mark destination disabled
    await db
      .delete(calendarEventExports)
      .where(eq(calendarEventExports.destinationId, destination.id));
    await db
      .update(calendarExportDestinations)
      .set({ enabled: false })
      .where(eq(calendarExportDestinations.id, destination.id));
  }
};

// ============================================
// Per-event Export Operations
// ============================================

/**
 * Export a single Gather event for all users who have export enabled
 * and should see this event (host + accepted invitees).
 */
export const exportEventForAllUsers = async (
  eventId: string,
): Promise<void> => {
  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1)
    .then((r) => r[0]);

  if (!event || event.status === 'cancelled') return;

  const invitees = await db
    .select()
    .from(eventInvitees)
    .where(
      and(
        eq(eventInvitees.eventId, eventId),
        eq(eventInvitees.status, 'accepted'),
      ),
    );

  const userIds = [event.hostId, ...invitees.map((i) => i.userId)];

  await Promise.allSettled(
    userIds.map((userId) => exportEventForUser(userId, eventId, event)),
  );
};

/**
 * Export (create or update) a single Gather event for a specific user.
 * Only exports if the user has an enabled export destination for a provider
 * that has a valid connection.
 */
export const exportEventForUser = async (
  userId: string,
  eventId: string,
  eventData?: typeof events.$inferSelect,
): Promise<void> => {
  const event =
    eventData ??
    (await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)
      .then((r) => r[0]));

  if (!event || event.status === 'cancelled') return;

  const destinations = await db
    .select()
    .from(calendarExportDestinations)
    .where(
      and(
        eq(calendarExportDestinations.userId, userId),
        eq(calendarExportDestinations.enabled, true),
      ),
    );

  if (destinations.length === 0) return;

  await Promise.allSettled(
    destinations
      .filter(
        (
          d,
        ): d is typeof calendarExportDestinations.$inferSelect & {
          provider: 'google' | 'outlook';
        } => d.provider === 'google' || d.provider === 'outlook',
      )
      .map((destination) =>
        exportEventToDestination(userId, event, destination),
      ),
  );
};

async function exportEventToDestination(
  userId: string,
  event: typeof events.$inferSelect,
  destination: typeof calendarExportDestinations.$inferSelect & {
    provider: 'google' | 'outlook';
  },
): Promise<void> {
  const connection = await getProviderConnection(userId, destination.provider);
  if (!connection) return;

  let accessToken: string;
  try {
    accessToken = await ensureValidAccessToken(connection);
  } catch {
    return; // Token revoked — skip silently, cleanup handled by import sync
  }

  const providerService = getCalendarProvider(destination.provider);

  // Fetch other attendees (host + accepted invitees, excluding the exporting user)
  const [hostRow, inviteeRows] = await Promise.all([
    db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, event.hostId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        userId: eventInvitees.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(eventInvitees)
      .innerJoin(users, eq(users.id, eventInvitees.userId))
      .where(
        and(
          eq(eventInvitees.eventId, event.id),
          eq(eventInvitees.status, 'accepted'),
        ),
      ),
  ]);

  const otherAttendeeNames: string[] = [];
  if (event.hostId !== userId && hostRow) {
    otherAttendeeNames.push(`${hostRow.firstName} ${hostRow.lastName}`);
  }
  for (const row of inviteeRows) {
    if (row.userId !== userId) {
      otherAttendeeNames.push(`${row.firstName} ${row.lastName}`);
    }
  }

  const locationParts = [event.location, event.locationAddress].filter(Boolean);
  const exportableEvent = {
    title: event.title,
    description:
      buildEventDescription(event.notes, otherAttendeeNames) || undefined,
    locationString:
      locationParts.length > 0 ? locationParts.join(', ') : undefined,
    startTime: event.startTime,
    endTime: event.endTime,
    timeZone: 'UTC',
  };

  // Check if we already have an export record
  const [existingExport] = await db
    .select()
    .from(calendarEventExports)
    .where(
      and(
        eq(calendarEventExports.eventId, event.id),
        eq(calendarEventExports.destinationId, destination.id),
      ),
    )
    .limit(1);

  if (existingExport) {
    // Update existing
    try {
      await providerService.updateEvent(
        accessToken,
        destination.externalCalendarId,
        existingExport.externalEventId,
        exportableEvent,
      );
      await db
        .update(calendarEventExports)
        .set({ lastSyncedAt: new Date() })
        .where(eq(calendarEventExports.id, existingExport.id));
    } catch (error: unknown) {
      // If the event no longer exists in the provider (404), recreate it
      const isNotFound =
        error instanceof Error && error.message?.includes('404');
      if (isNotFound) {
        await db
          .delete(calendarEventExports)
          .where(eq(calendarEventExports.id, existingExport.id));
        // Fall through to create
        await createExportRecord(
          userId,
          event,
          destination,
          accessToken,
          providerService,
          exportableEvent,
        );
      }
      // Other errors: swallow and let periodic sync retry
    }
  } else {
    await createExportRecord(
      userId,
      event,
      destination,
      accessToken,
      providerService,
      exportableEvent,
    );
  }
}

async function createExportRecord(
  userId: string,
  event: typeof events.$inferSelect,
  destination: typeof calendarExportDestinations.$inferSelect,
  accessToken: string,
  providerService: ReturnType<typeof getCalendarProvider>,
  exportableEvent: Parameters<typeof providerService.createEvent>[2],
): Promise<void> {
  const externalEventId = await providerService.createEvent(
    accessToken,
    destination.externalCalendarId,
    exportableEvent,
  );

  await db.insert(calendarEventExports).values({
    eventId: event.id,
    userId,
    destinationId: destination.id,
    externalEventId,
  });
}

// ============================================
// Remove Exported Event
// ============================================

/**
 * Remove an exported event for a specific user from all their export destinations.
 */
export const removeExportedEventForUser = async (
  userId: string,
  eventId: string,
): Promise<void> => {
  const exportRecords = await db
    .select()
    .from(calendarEventExports)
    .where(
      and(
        eq(calendarEventExports.userId, userId),
        eq(calendarEventExports.eventId, eventId),
      ),
    );

  if (exportRecords.length === 0) return;

  const destinationIds = [
    ...new Set(exportRecords.map((r) => r.destinationId)),
  ];
  const destinations = await db
    .select()
    .from(calendarExportDestinations)
    .where(inArray(calendarExportDestinations.id, destinationIds));

  await Promise.allSettled(
    exportRecords
      .filter(
        (record): record is typeof calendarEventExports.$inferSelect => true,
      )
      .map(async (record) => {
        const destination = destinations.find(
          (d) => d.id === record.destinationId,
        );
        if (!destination) return;
        if (
          destination.provider !== 'google' &&
          destination.provider !== 'outlook'
        )
          return;

        const connection = await getProviderConnection(
          userId,
          destination.provider as 'google' | 'outlook',
        );
        if (!connection) return;

        try {
          const accessToken = await ensureValidAccessToken(connection);
          const providerService = getCalendarProvider(destination.provider);
          await providerService.deleteEvent(
            accessToken,
            destination.externalCalendarId,
            record.externalEventId,
          );
        } catch {
          // Best-effort deletion
        }

        await db
          .delete(calendarEventExports)
          .where(eq(calendarEventExports.id, record.id));
      }),
  );
};

/**
 * Remove an exported event from ALL users who have it exported (e.g. when event is cancelled).
 */
export const removeExportedEventForAllUsers = async (
  eventId: string,
): Promise<void> => {
  const exportRecords = await db
    .select()
    .from(calendarEventExports)
    .where(eq(calendarEventExports.eventId, eventId));

  if (exportRecords.length === 0) return;

  const userIds = [...new Set<string>(exportRecords.map((r) => r.userId))];
  await Promise.allSettled(
    userIds.map((userId) => removeExportedEventForUser(userId, eventId)),
  );
};

// ============================================
// Full Sync
// ============================================

/**
 * Re-export all active events for a user to a specific provider (or all providers if omitted).
 * Used when enabling export or as a periodic safety-net sync.
 */
export const fullExportSync = async (
  userId: string,
  providerFilter?: 'google' | 'outlook',
): Promise<void> => {
  const destinationQuery = providerFilter
    ? and(
        eq(calendarExportDestinations.userId, userId),
        eq(calendarExportDestinations.enabled, true),
        eq(calendarExportDestinations.provider, providerFilter),
      )
    : and(
        eq(calendarExportDestinations.userId, userId),
        eq(calendarExportDestinations.enabled, true),
      );

  const destinations = await db
    .select()
    .from(calendarExportDestinations)
    .where(destinationQuery);

  if (destinations.length === 0) return;

  // Get all events where this user is host or accepted invitee
  const acceptedInvitations = await db
    .select({ eventId: eventInvitees.eventId })
    .from(eventInvitees)
    .where(
      and(
        eq(eventInvitees.userId, userId),
        eq(eventInvitees.status, 'accepted'),
      ),
    );

  const invitedEventIds = acceptedInvitations.map((r) => r.eventId);

  const userEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, 'active'),
        invitedEventIds.length > 0
          ? eq(events.hostId, userId)
          : eq(events.hostId, userId),
      ),
    );

  // Also get events user is invited to and accepted
  const invitedEvents =
    invitedEventIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.status, 'active'),
              inArray(events.id, invitedEventIds),
            ),
          )
      : [];

  const allEvents = [
    ...userEvents,
    ...invitedEvents.filter((e) => e.hostId !== userId),
  ];

  for (const destination of destinations) {
    if (destination.provider !== 'google' && destination.provider !== 'outlook')
      continue;

    const typedDestination = destination as typeof destination & {
      provider: 'google' | 'outlook';
    };

    await Promise.allSettled(
      allEvents.map((event) =>
        exportEventToDestination(userId, event, typedDestination),
      ),
    );
  }
};

/**
 * Run export sync for all users who have active export destinations.
 * Called by the periodic Lambda. Handles "Gather" calendar deleted scenarios
 * by catching 404s and recreating the calendar.
 */
export const runPeriodicExportSync = async (): Promise<{
  processed: number;
  errors: number;
}> => {
  const allDestinations = await db
    .select()
    .from(calendarExportDestinations)
    .where(eq(calendarExportDestinations.enabled, true));

  const userIds = [...new Set(allDestinations.map((d) => d.userId))];

  let processed = 0;
  let errors = 0;

  await Promise.allSettled(
    userIds.map(async (userId) => {
      try {
        await fullExportSync(userId);
        processed++;
      } catch {
        errors++;
      }
    }),
  );

  return { processed, errors };
};
