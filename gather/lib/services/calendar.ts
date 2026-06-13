import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Event } from '../api/client';

// ============================================
// Constants
// ============================================

const GATHER_CALENDAR_TITLE = 'Gather';
const GATHER_CALENDAR_ID_KEY = '@gather/apple_export_calendar_id';
const EXPORTED_EVENTS_KEY = '@gather/apple_exported_events';

/**
 * Request calendar permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if we have calendar permissions.
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

// ============================================
// Gather Calendar (dedicated secondary calendar for export)
// ============================================

/**
 * Load the persisted map of gatherEventId → appleCalendarEventId.
 */
async function loadExportedEvents(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(EXPORTED_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function saveExportedEvents(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(EXPORTED_EVENTS_KEY, JSON.stringify(map));
}

/**
 * Find an existing "Gather" calendar on the device or create one.
 * Persists the calendar ID to AsyncStorage to avoid duplicate creation.
 */
export async function getOrCreateGatherCalendar(): Promise<string | null> {
  try {
    // Try persisted ID first
    const stored = await AsyncStorage.getItem(GATHER_CALENDAR_ID_KEY);
    if (stored) {
      // Verify it still exists
      const allCals = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      if (allCals.some((c) => c.id === stored)) return stored;
    }

    // Check if a "Gather" calendar already exists on the device
    const allCals = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const existing = allCals.find(
      (c) => c.title === GATHER_CALENDAR_TITLE && c.allowsModifications,
    );
    if (existing) {
      await AsyncStorage.setItem(GATHER_CALENDAR_ID_KEY, existing.id);
      return existing.id;
    }

    if (Platform.OS !== 'ios') return null;

    // Create a new local calendar
    const sources = await Calendar.getSourcesAsync();
    const localSource = sources.find(
      (s) => s.type === Calendar.SourceType.LOCAL,
    );
    if (!localSource) return null;

    const calendarId = await Calendar.createCalendarAsync({
      title: GATHER_CALENDAR_TITLE,
      color: '#6366F1', // Gather brand indigo
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: localSource.id,
      source: localSource,
      name: GATHER_CALENDAR_TITLE,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    await AsyncStorage.setItem(GATHER_CALENDAR_ID_KEY, calendarId);
    return calendarId;
  } catch (error) {
    console.error('[calendar] Failed to get or create Gather calendar:', error);
    return null;
  }
}

/**
 * Delete the "Gather" calendar from the device and clear all related AsyncStorage keys.
 * Called when the user disables Apple Calendar export.
 */
export async function deleteGatherCalendar(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(GATHER_CALENDAR_ID_KEY);
    if (stored) {
      try {
        await Calendar.deleteCalendarAsync(stored);
      } catch {
        // Calendar may already be gone — that's fine
      }
    }
  } catch {
    // Ignore errors reading AsyncStorage
  }
  await AsyncStorage.multiRemove([GATHER_CALENDAR_ID_KEY, EXPORTED_EVENTS_KEY]);
}

/**
 * Build the notes string for an exported Gather event, including the attendee list.
 * The deep link is set separately as the native `url` property.
 */
function buildExportNotes(gatherEvent: Event, userId?: string): string {
  const parts: string[] = [];

  if (gatherEvent.notes) parts.push(gatherEvent.notes);

  const otherAttendees: string[] = [];
  if (gatherEvent.hostId !== userId) {
    otherAttendees.push(gatherEvent.hostName);
  }
  for (const invitee of gatherEvent.invitees) {
    if (invitee.status === 'accepted' && invitee.userId !== userId) {
      otherAttendees.push(invitee.fullName);
    }
  }
  if (otherAttendees.length > 0) {
    parts.push(`Also going: ${otherAttendees.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Atomically sync a set of Gather events to the dedicated Apple "Gather" calendar.
 *
 * Loads the exported-events map once, removes events that are no longer eligible,
 * creates/updates all eligible events concurrently, then saves the map once.
 * This avoids the race condition that occurs when concurrent individual calls each
 * load and save the map independently (last-write-wins causes entries to be lost,
 * leading to duplicate events on subsequent syncs).
 */
export async function batchSyncGatherCalendar(
  eventsToExport: Event[],
  userId?: string,
): Promise<void> {
  try {
    const calendarId = await getOrCreateGatherCalendar();
    if (!calendarId) return;

    // Single load — all reads and writes operate on this snapshot
    const map = await loadExportedEvents();

    const shouldExportIds = new Set(eventsToExport.map((e) => e.eventId));

    // Remove stale events (no longer eligible) from the device calendar
    await Promise.allSettled(
      Object.entries(map)
        .filter(([id]) => !shouldExportIds.has(id))
        .map(async ([id, deviceEventId]) => {
          try {
            await Calendar.deleteEventAsync(deviceEventId);
          } catch {
            // Event already gone — that's fine
          }
          delete map[id];
        }),
    );

    // Create or update all eligible events concurrently
    await Promise.allSettled(
      eventsToExport.map(async (gatherEvent) => {
        const locationParts = [
          gatherEvent.location,
          gatherEvent.locationAddress,
        ].filter(Boolean);
        const details: Partial<Calendar.Event> = {
          title: gatherEvent.title,
          startDate: new Date(gatherEvent.startTime),
          endDate: new Date(gatherEvent.endTime),
          location: locationParts.length > 0 ? locationParts.join(', ') : null,
          notes: buildExportNotes(gatherEvent, userId),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          alarms: [{ relativeOffset: -60 }],
        };

        const existingDeviceId = map[gatherEvent.eventId];
        if (existingDeviceId) {
          try {
            await Calendar.updateEventAsync(existingDeviceId, details);
            return;
          } catch {
            // Event was deleted on device — fall through to recreate
          }
        }

        const newDeviceId = await Calendar.createEventAsync(
          calendarId,
          details,
        );
        map[gatherEvent.eventId] = newDeviceId;
      }),
    );

    // Single save — writes the complete, consistent map
    await saveExportedEvents(map);
  } catch (error) {
    console.error('[calendar] batchSyncGatherCalendar failed:', error);
  }
}
