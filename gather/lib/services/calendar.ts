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

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  calendarId: string;
}

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

/**
 * Get the default calendar for adding events.
 * On iOS, this gets the default calendar for new events.
 */
export async function getDefaultCalendar(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  if (Platform.OS === 'ios') {
    // Try to find the default calendar
    const defaultCalendar = calendars.find(
      (cal) => cal.allowsModifications && cal.source.type === 'local',
    );
    if (defaultCalendar) return defaultCalendar.id;

    // Fall back to any modifiable calendar
    const modifiableCalendar = calendars.find((cal) => cal.allowsModifications);
    return modifiableCalendar?.id ?? null;
  }

  // For other platforms
  const modifiableCalendar = calendars.find((cal) => cal.allowsModifications);
  return modifiableCalendar?.id ?? null;
}

/**
 * Get all calendars available on the device.
 */
export async function getCalendars() {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  return calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color,
    allowsModifications: cal.allowsModifications,
    source: cal.source.name,
  }));
}

/**
 * Get all events from all calendars within a date range.
 * Useful for determining "busy" times.
 */
export async function getAllEvents(
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const calendarIds = calendars.map((cal) => cal.id);

  if (calendarIds.length === 0) return [];

  const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    location: event.location ?? undefined,
    notes: event.notes ?? undefined,
    calendarId: event.calendarId,
  }));
}

// ============================================
// Gather Calendar (dedicated secondary calendar for export)
// ============================================

/**
 * Load the persisted map of gatherEventId → appleCalendarEventId.
 */
export async function loadExportedEvents(): Promise<Record<string, string>> {
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
 * Export a Gather event to the dedicated "Gather" Apple calendar.
 * Tracks the mapping so we can update/delete later.
 * Returns the device calendar event ID.
 */
export async function exportEventToGatherCalendar(
  gatherEvent: Event,
  userId?: string,
): Promise<string | null> {
  try {
    const calendarId = await getOrCreateGatherCalendar();
    if (!calendarId) return null;

    const map = await loadExportedEvents();

    // Build event details
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
      // Update existing event; if it's gone on device, fall through to recreate
      try {
        await Calendar.updateEventAsync(existingDeviceId, details);
        await saveExportedEvents(map);
        return existingDeviceId;
      } catch {
        // Event was deleted on device — fall through to recreate
      }
    }

    // Create new event
    const eventId = await Calendar.createEventAsync(calendarId, details);
    map[gatherEvent.eventId] = eventId;
    await saveExportedEvents(map);
    return eventId;
  } catch (error) {
    console.error(
      '[calendar] Failed to export event to Gather calendar:',
      error,
    );
    return null;
  }
}

/**
 * Remove an exported Gather event from the device calendar.
 */
export async function removeEventFromGatherCalendar(
  gatherEventId: string,
): Promise<void> {
  try {
    const map = await loadExportedEvents();
    const deviceEventId = map[gatherEventId];
    if (!deviceEventId) return;

    try {
      await Calendar.deleteEventAsync(deviceEventId);
    } catch {
      // Event already gone on device — that's fine
    }

    delete map[gatherEventId];
    await saveExportedEvents(map);
  } catch (error) {
    console.error(
      '[calendar] Failed to remove event from Gather calendar:',
      error,
    );
  }
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

/**
 * Check whether a given Gather event has already been exported to the device calendar.
 */
export async function isEventExportedToCalendar(
  gatherEventId: string,
): Promise<boolean> {
  const map = await loadExportedEvents();
  return gatherEventId in map;
}

/**
 * Create an event in the user's calendar from a Gather event.
 * Returns the calendar event ID if successful.
 */
export async function exportEventToCalendar(
  gatherEvent: Event,
  calendarId?: string,
  userId?: string,
): Promise<string | null> {
  try {
    const targetCalendarId = calendarId ?? (await getDefaultCalendar());
    if (!targetCalendarId) {
      console.error('No calendar available for creating events');
      return null;
    }

    const locationParts = [
      gatherEvent.location,
      gatherEvent.locationAddress,
    ].filter(Boolean);
    const eventId = await Calendar.createEventAsync(targetCalendarId, {
      title: gatherEvent.title,
      startDate: new Date(gatherEvent.startTime),
      endDate: new Date(gatherEvent.endTime),
      location: locationParts.length > 0 ? locationParts.join(', ') : undefined,
      notes: buildExportNotes(gatherEvent, userId),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -60 }],
    });

    return eventId;
  } catch (error) {
    console.error('Failed to export event to calendar:', error);
    return null;
  }
}
