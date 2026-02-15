import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { db, calendarConnections, calendarEventsCache } from '../db';
import type {
  CalendarConnection,
  CreateCalendarConnection,
  UpdateCalendarConnection,
  BusySlot,
  SyncCalendars,
} from '../types';

// ============================================
// Helpers
// ============================================

const dbConnectionToCalendarConnection = (
  dbConn: typeof calendarConnections.$inferSelect
): CalendarConnection => {
  return {
    connectionId: dbConn.id,
    userId: dbConn.userId,
    provider: dbConn.provider,
    externalCalendarId: dbConn.externalCalendarId,
    calendarName: dbConn.calendarName,
    color: dbConn.color ?? undefined,
    importEnabled: dbConn.importEnabled,
    exportEnabled: dbConn.exportEnabled,
    lastSyncAt: dbConn.lastSyncAt?.toISOString(),
    createdAt: dbConn.createdAt.toISOString(),
  };
};

// ============================================
// Calendar Connection Operations
// ============================================

export const getCalendarConnections = async (userId: string): Promise<CalendarConnection[]> => {
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .orderBy(calendarConnections.createdAt);

  return connections.map(dbConnectionToCalendarConnection);
};

export const getCalendarConnection = async (
  connectionId: string,
  userId: string
): Promise<CalendarConnection | null> => {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.id, connectionId),
        eq(calendarConnections.userId, userId)
      )
    )
    .limit(1);

  return connection ? dbConnectionToCalendarConnection(connection) : null;
};

export const createCalendarConnection = async (
  userId: string,
  input: CreateCalendarConnection
): Promise<CalendarConnection> => {
  const [newConnection] = await db
    .insert(calendarConnections)
    .values({
      userId,
      provider: input.provider,
      externalCalendarId: input.externalCalendarId,
      calendarName: input.calendarName,
      color: input.color,
      importEnabled: input.importEnabled ?? true,
      exportEnabled: input.exportEnabled ?? false,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
    })
    .returning();

  if (!newConnection) {
    throw new Error('Failed to create calendar connection');
  }

  return dbConnectionToCalendarConnection(newConnection);
};

export const updateCalendarConnection = async (
  connectionId: string,
  userId: string,
  updates: UpdateCalendarConnection
): Promise<{ success: boolean; connection?: CalendarConnection; message?: string }> => {
  const existing = await getCalendarConnection(connectionId, userId);

  if (!existing) {
    return { success: false, message: 'Calendar connection not found' };
  }

  const updateData: Partial<typeof calendarConnections.$inferInsert> = {};

  if (updates.importEnabled !== undefined) {
    updateData.importEnabled = updates.importEnabled;
  }
  if (updates.exportEnabled !== undefined) {
    updateData.exportEnabled = updates.exportEnabled;
  }
  if (updates.accessToken !== undefined) {
    updateData.accessToken = updates.accessToken;
  }
  if (updates.refreshToken !== undefined) {
    updateData.refreshToken = updates.refreshToken;
  }
  if (updates.tokenExpiresAt !== undefined) {
    updateData.tokenExpiresAt = new Date(updates.tokenExpiresAt);
  }

  await db
    .update(calendarConnections)
    .set(updateData)
    .where(eq(calendarConnections.id, connectionId));

  const updatedConnection = await getCalendarConnection(connectionId, userId);
  return { success: true, connection: updatedConnection ?? undefined };
};

export const deleteCalendarConnection = async (
  connectionId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> => {
  const existing = await getCalendarConnection(connectionId, userId);

  if (!existing) {
    return { success: false, message: 'Calendar connection not found' };
  }

  await db.delete(calendarConnections).where(eq(calendarConnections.id, connectionId));

  return { success: true };
};

// ============================================
// Busy Slots Operations
// ============================================

export const getBusySlotsForUser = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<BusySlot[]> => {
  // Get all import-enabled connections for the user
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.importEnabled, true)
      )
    );

  if (connections.length === 0) {
    return [];
  }

  const connectionIds = connections.map((c) => c.id);
  const connectionNameMap = new Map(connections.map((c) => [c.id, c.calendarName]));

  // Get cached events within the date range
  const cachedEvents = await db
    .select()
    .from(calendarEventsCache)
    .where(
      and(
        inArray(calendarEventsCache.connectionId, connectionIds),
        gte(calendarEventsCache.startTime, startDate),
        lte(calendarEventsCache.endTime, endDate),
        eq(calendarEventsCache.isBusy, true)
      )
    )
    .orderBy(calendarEventsCache.startTime);

  return cachedEvents.map((event) => ({
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    calendarName: connectionNameMap.get(event.connectionId),
  }));
};

export const syncCalendarEvents = async (
  connectionId: string,
  events: {
    externalEventId: string;
    startTime: Date;
    endTime: Date;
    isBusy: boolean;
  }[]
): Promise<void> => {
  // Delete existing cached events for this connection
  await db.delete(calendarEventsCache).where(eq(calendarEventsCache.connectionId, connectionId));

  // Insert new events
  if (events.length > 0) {
    await db.insert(calendarEventsCache).values(
      events.map((event) => ({
        connectionId,
        externalEventId: event.externalEventId,
        startTime: event.startTime,
        endTime: event.endTime,
        isBusy: event.isBusy,
      }))
    );
  }

  // Update last sync time
  await db
    .update(calendarConnections)
    .set({ lastSyncAt: new Date() })
    .where(eq(calendarConnections.id, connectionId));
};

// ============================================
// Bulk Sync (device calendars)
// ============================================

/**
 * Sync multiple device calendars and their events in a single operation.
 * - Upserts calendar connections for the given provider
 * - Syncs cached events for each connection
 * - Removes any connections for this provider that are no longer selected
 */
export const syncCalendarsForUser = async (
  userId: string,
  input: SyncCalendars,
  provider: 'apple' | 'google' | 'outlook' = 'apple'
): Promise<CalendarConnection[]> => {
  const incomingCalendarIds = input.calendars.map((c) => c.externalCalendarId);

  // 1. Get existing connections for this provider
  const existingConnections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider)
      )
    );

  const existingByExternalId = new Map(
    existingConnections.map((c) => [c.externalCalendarId, c])
  );

  // 2. Upsert each calendar and sync its events
  const connectionIds: string[] = [];

  for (const cal of input.calendars) {
    let connectionId: string;
    const existing = existingByExternalId.get(cal.externalCalendarId);

    if (existing) {
      // Update existing connection
      await db
        .update(calendarConnections)
        .set({
          calendarName: cal.calendarName,
          color: cal.color ?? existing.color,
          importEnabled: true,
        })
        .where(eq(calendarConnections.id, existing.id));
      connectionId = existing.id;
    } else {
      // Create new connection
      const [newConn] = await db
        .insert(calendarConnections)
        .values({
          userId,
          provider,
          externalCalendarId: cal.externalCalendarId,
          calendarName: cal.calendarName,
          color: cal.color,
          importEnabled: true,
          exportEnabled: false,
        })
        .returning();

      if (!newConn) {
        throw new Error(`Failed to create calendar connection for ${cal.calendarName}`);
      }
      connectionId = newConn.id;
    }

    connectionIds.push(connectionId);

    // Sync events for this connection
    await syncCalendarEvents(
      connectionId,
      cal.events.map((e) => ({
        externalEventId: e.externalEventId,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        isBusy: e.isBusy,
      }))
    );
  }

  // 3. Remove connections for this provider that are no longer selected
  const existingIds = existingConnections.map((c) => c.id);
  const removedIds = existingIds.filter((id) => !connectionIds.includes(id));

  if (removedIds.length > 0) {
    // Cached events are cascade-deleted via FK
    await db
      .delete(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, provider),
          inArray(calendarConnections.id, removedIds)
        )
      );
  }

  // 4. Return updated connections
  return getCalendarConnections(userId);
};
