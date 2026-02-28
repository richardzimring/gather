import { useEffect, useRef } from 'react';

import type { Event } from '../api/client';
import { batchSyncGatherCalendar } from '../services/calendar';
import { useAppleExport } from './useAppleExport';

/**
 * Reactively syncs Gather events to the device's "Gather" Apple Calendar
 * whenever export is enabled or the events list changes.
 *
 * - On first enable: backfills all past and future active events immediately.
 * - On subsequent event refreshes: creates/updates new events, removes stale ones.
 * - On disable: the calendar and its events are cleaned up by useAppleExport.disable().
 *
 * Place this hook in the tab layout alongside useCalendarAutoSync().
 */
export function useAppleExportSync(
  events: Event[] | undefined,
  userId: string | undefined,
) {
  const { enabled } = useAppleExport();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !events || !userId) return;
    if (isSyncingRef.current) return;

    const sync = async () => {
      isSyncingRef.current = true;
      try {
        // Determine which events should be in the Gather calendar:
        // active events where the user is host or has accepted the invitation.
        const eventsToExport = events.filter((event) => {
          if (event.status !== 'active') return false;
          if (event.hostId === userId) return true;
          const userInvitee = event.invitees.find((i) => i.userId === userId);
          return userInvitee?.status === 'accepted';
        });

        // Atomically remove stale events, create/update eligible ones, and
        // persist the map in a single save to prevent race-condition duplicates.
        await batchSyncGatherCalendar(eventsToExport, userId ?? undefined);
      } catch (error) {
        console.error('[useAppleExportSync] Sync failed:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    sync();
  }, [enabled, events, userId]);
}
