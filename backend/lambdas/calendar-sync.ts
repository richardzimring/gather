import { eq, and } from 'drizzle-orm';
import { db, calendarConnections } from '../src/db';
import { syncProviderConnection } from '../src/services/calendars';

/**
 * Scheduled Lambda handler for periodic Google Calendar sync.
 * Runs on a cron schedule (e.g., every 15 minutes) and re-syncs
 * events for all server-side calendar provider connections.
 *
 * This ensures that changes made in Google Calendar (outside of the app)
 * are reflected in the user's availability within Gather.
 */
export const handler = async (): Promise<void> => {
  console.log('Starting scheduled calendar sync...');

  // Fetch all import-enabled non-Apple connections
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.importEnabled, true),
        // We only sync server-side providers (not Apple)
        // Google and Outlook connections have refresh tokens
      ),
    );

  const serverConnections = connections.filter(
    (c) => c.provider !== 'apple' && c.refreshToken,
  );

  console.log(
    `Found ${serverConnections.length} server-side calendar connections to sync`,
  );

  let successCount = 0;
  let errorCount = 0;

  for (const connection of serverConnections) {
    try {
      await syncProviderConnection(connection);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(
        `Failed to sync connection ${connection.id} (${connection.provider}/${connection.calendarName} for user ${connection.userId}):`,
        error,
      );
    }
  }

  console.log(
    `Scheduled calendar sync complete: ${successCount} succeeded, ${errorCount} failed out of ${serverConnections.length} total`,
  );
};
