import { eq, and, inArray } from 'drizzle-orm';
import { db, calendarConnections, calendarEventsCache } from '../db';
import type { CalendarConnection, SyncCalendars } from '../types';
import { getCalendarProvider, OAuthRevokedError } from './calendar-providers';

// ============================================
// Helpers
// ============================================

const dbConnectionToCalendarConnection = (
  dbConn: typeof calendarConnections.$inferSelect,
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
    hasExportScope: dbConn.hasExportScope,
    lastSyncAt: dbConn.lastSyncAt?.toISOString(),
    createdAt: dbConn.createdAt.toISOString(),
  };
};

// ============================================
// Calendar Connection Operations
// ============================================

export const getCalendarConnections = async (
  userId: string,
): Promise<CalendarConnection[]> => {
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .orderBy(calendarConnections.createdAt);

  return connections.map(dbConnectionToCalendarConnection);
};

/**
 * Delete all calendar connections for a given provider and user.
 * Used when disconnecting an entire provider account (e.g. Google, Outlook).
 * Cached events are cascade-deleted via FK.
 */
export const deleteProviderConnections = async (
  userId: string,
  provider: 'apple' | 'google' | 'outlook',
): Promise<{ success: boolean; deletedCount: number }> => {
  const existing = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
      ),
    );

  if (existing.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  await db
    .delete(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
      ),
    );

  return { success: true, deletedCount: existing.length };
};

export const syncCalendarEvents = async (
  connectionId: string,
  events: {
    externalEventId: string;
    startTime: Date;
    endTime: Date;
    isBusy: boolean;
  }[],
): Promise<void> => {
  // Delete existing cached events for this connection
  await db
    .delete(calendarEventsCache)
    .where(eq(calendarEventsCache.connectionId, connectionId));

  if (events.length > 0) {
    await db
      .insert(calendarEventsCache)
      .values(
        events.map((event) => ({
          connectionId,
          externalEventId: event.externalEventId,
          startTime: event.startTime,
          endTime: event.endTime,
          isBusy: event.isBusy,
        })),
      )
      // If we receive the same event multiple times, ignore instead of erroring on unique index violation
      .onConflictDoNothing();
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
  provider: 'apple' | 'google' | 'outlook' = 'apple',
): Promise<CalendarConnection[]> => {
  // 1. Get existing connections for this provider
  const existingConnections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
      ),
    );

  const existingByExternalId = new Map(
    existingConnections.map((c) => [c.externalCalendarId, c]),
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
        throw new Error(
          `Failed to create calendar connection for ${cal.calendarName}`,
        );
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
      })),
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
          inArray(calendarConnections.id, removedIds),
        ),
      );
  }

  // 4. Return updated connections
  return getCalendarConnections(userId);
};

// ============================================
// Server-Side Provider Sync (Google, Outlook, etc.)
// ============================================

/** How far into the future to sync events (3 months) */
const SYNC_RANGE_MS = 3 * 30 * 24 * 60 * 60 * 1000;

/**
 * Ensure the access token for a connection is still valid.
 * If expired, refresh it and persist the new tokens to the DB.
 * Returns a valid access token.
 */
export const ensureValidAccessToken = async (
  connection: typeof calendarConnections.$inferSelect,
): Promise<string> => {
  if (!connection.refreshToken) {
    throw new Error(`No refresh token stored for connection ${connection.id}`);
  }

  // If token is still valid (with 5 min buffer), return it
  if (
    connection.accessToken &&
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return connection.accessToken;
  }

  // Token expired or missing — refresh it
  const provider = getCalendarProvider(connection.provider);

  try {
    const tokens = await provider.refreshAccessToken(connection.refreshToken);

    // Persist the new tokens
    await db
      .update(calendarConnections)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
      })
      .where(eq(calendarConnections.id, connection.id));

    return tokens.accessToken;
  } catch (error) {
    if (error instanceof OAuthRevokedError) {
      // Clean up all stale connections for this provider — cached events
      // cascade-delete via FK. After this, the user will be prompted to
      // re-authenticate when they next visit the calendar connect screen.
      await deleteProviderConnections(
        connection.userId,
        connection.provider as 'google' | 'outlook',
      );
    }
    throw error;
  }
};

/**
 * Server-side sync for a single calendar connection.
 * Fetches events from the provider API and caches them in the DB.
 */
export const syncProviderConnection = async (
  connection: typeof calendarConnections.$inferSelect,
): Promise<void> => {
  const accessToken = await ensureValidAccessToken(connection);
  const provider = getCalendarProvider(connection.provider);

  const timeMin = new Date();
  const timeMax = new Date(Date.now() + SYNC_RANGE_MS);

  const events = await provider.fetchEvents(
    accessToken,
    connection.externalCalendarId,
    timeMin,
    timeMax,
  );

  await syncCalendarEvents(
    connection.id,
    events.map((e) => ({
      externalEventId: e.externalEventId,
      startTime: e.startTime,
      endTime: e.endTime,
      isBusy: e.isBusy,
    })),
  );
};

/**
 * Sync all server-side provider connections for a user (Google, Outlook, etc.).
 * Skips Apple connections since those are synced from the device.
 */
export const syncServerProviderConnections = async (
  userId: string,
  providerFilter?: 'google' | 'outlook',
): Promise<CalendarConnection[]> => {
  const conditions = [
    eq(calendarConnections.userId, userId),
    eq(calendarConnections.importEnabled, true),
  ];

  if (providerFilter) {
    conditions.push(eq(calendarConnections.provider, providerFilter));
  }

  const connections = await db
    .select()
    .from(calendarConnections)
    .where(and(...conditions));

  // Only sync non-Apple connections (server-side providers)
  const serverConnections = connections.filter((c) => c.provider !== 'apple');

  for (const connection of serverConnections) {
    try {
      await syncProviderConnection(connection);
    } catch (error) {
      console.error(
        `Failed to sync connection ${connection.id} (${connection.provider}/${connection.calendarName}):`,
        error,
      );
      // Continue syncing other connections even if one fails
    }
  }

  return getCalendarConnections(userId);
};

/**
 * Handle the OAuth callback for a server-side provider.
 * Exchanges the code for tokens, fetches the user's calendars,
 * creates connections for each calendar, and triggers an initial sync.
 */
const EXPORT_SCOPE_BY_PROVIDER: Record<'google' | 'outlook', string> = {
  google: 'https://www.googleapis.com/auth/calendar.app.created',
  outlook: 'Calendars.ReadWrite',
};

export const handleProviderOAuthCallback = async (
  userId: string,
  provider: 'google' | 'outlook',
  code: string,
): Promise<CalendarConnection[]> => {
  const providerService = getCalendarProvider(provider);

  // 1. Exchange code for tokens
  const tokens = await providerService.exchangeCode(code);

  // Detect whether the user actually granted the export scope. Providers return
  // the granted scopes in the token response, so we can check without a
  // separate API call. Fall back to false if scope info is unavailable.
  const exportScopeGranted =
    tokens.grantedScopes?.includes(EXPORT_SCOPE_BY_PROVIDER[provider]) ?? false;

  // 2. Fetch the user's calendars from the provider
  const calendars = await providerService.fetchCalendars(tokens.accessToken);

  // 3. Upsert calendar connections with tokens
  for (const cal of calendars) {
    const existing = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, provider),
          eq(calendarConnections.externalCalendarId, cal.externalCalendarId),
        ),
      )
      .limit(1);

    const existingConnection = existing[0];
    if (existingConnection) {
      // Update tokens, metadata, and export scope status.
      // Only promote hasExportScope to true — never demote it on a re-auth
      // that didn't request export scope (the user may have granted it before).
      await db
        .update(calendarConnections)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.tokenExpiresAt,
          calendarName: cal.calendarName,
          color: cal.color ?? existingConnection.color,
          ...(exportScopeGranted ? { hasExportScope: true } : {}),
        })
        .where(eq(calendarConnections.id, existingConnection.id));
    } else {
      // Create new connection with importEnabled=false
      // User must explicitly enable calendars via the selection screen
      await db.insert(calendarConnections).values({
        userId,
        provider,
        externalCalendarId: cal.externalCalendarId,
        calendarName: cal.calendarName,
        color: cal.color,
        importEnabled: false,
        exportEnabled: false,
        hasExportScope: exportScopeGranted,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
      });
    }
  }

  // 4. Only sync if there are existing import-enabled connections
  // (This prevents unnecessary sync on first-time OAuth)
  const hasImportEnabledConnections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
        eq(calendarConnections.importEnabled, true),
      ),
    )
    .limit(1);

  if (hasImportEnabledConnections.length > 0) {
    await syncServerProviderConnections(userId, provider);
  }

  return getCalendarConnections(userId);
};

/**
 * Get a valid access token for the first Google connection of a user.
 * Used when fetching live calendar lists from the Google API.
 */
export const getValidProviderAccessToken = async (
  userId: string,
  provider: 'google' | 'outlook',
): Promise<string | null> => {
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

  if (!connection) return null;

  return ensureValidAccessToken(connection);
};

/**
 * Update which provider calendars are imported for a user.
 * Sets importEnabled=true for selected calendars and false for the rest.
 */
export const selectProviderCalendars = async (
  userId: string,
  provider: 'google' | 'outlook',
  selectedCalendarIds: string[],
): Promise<CalendarConnection[]> => {
  const userConnections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider),
      ),
    );

  for (const connection of userConnections) {
    const shouldImport = selectedCalendarIds.includes(
      connection.externalCalendarId,
    );
    if (connection.importEnabled !== shouldImport) {
      await db
        .update(calendarConnections)
        .set({ importEnabled: shouldImport })
        .where(eq(calendarConnections.id, connection.id));
    }
  }

  // Sync events for newly enabled connections
  await syncServerProviderConnections(userId, provider);

  return getCalendarConnections(userId);
};
