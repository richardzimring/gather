import { eq, and } from 'drizzle-orm';
import { db, calendarConnections } from '../src/db';
import { syncProviderConnection } from '../src/services/calendars';
import { runPeriodicExportSync } from '../src/services/calendar-export';

/**
 * Scheduled Lambda handler for periodic calendar sync.
 * Runs on a cron schedule (e.g., every 15 minutes) and:
 * 1. Re-syncs import events for all server-side connections (Google/Outlook)
 *    so that availability changes are reflected in Gather.
 * 2. Runs export sync as a safety net to ensure any missed or stale Gather
 *    events are pushed back out to users' external calendars.
 */
export const handler = async (): Promise<void> => {
  console.log('Starting scheduled calendar sync...');

  // -------------------------------------------------------
  // Phase 1: Import sync (availability → Gather)
  // -------------------------------------------------------

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
    `Found ${serverConnections.length} server-side calendar connections to import-sync`,
  );

  let importSuccessCount = 0;
  let importErrorCount = 0;

  for (const connection of serverConnections) {
    try {
      await syncProviderConnection(connection);
      importSuccessCount++;
    } catch (error) {
      importErrorCount++;
      console.error(
        `Failed to import-sync connection ${connection.id} (${connection.provider}/${connection.calendarName} for user ${connection.userId}):`,
        error,
      );
    }
  }

  console.log(
    `Import sync complete: ${importSuccessCount} succeeded, ${importErrorCount} failed out of ${serverConnections.length} total`,
  );

  // -------------------------------------------------------
  // Phase 2: Export sync (Gather events → external calendar)
  // -------------------------------------------------------

  console.log('Starting periodic export sync...');

  try {
    const { processed, errors } = await runPeriodicExportSync();
    console.log(
      `Export sync complete: ${processed} users processed, ${errors} errors`,
    );
  } catch (error) {
    console.error('Periodic export sync failed:', error);
  }

  console.log('Scheduled calendar sync complete.');
};
