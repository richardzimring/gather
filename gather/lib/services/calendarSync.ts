import * as Calendar from 'expo-calendar'

import { requestCalendarPermissions, hasCalendarPermissions } from './calendar'
import { postCalendarsSync } from '../api/client'
import type { SyncCalendarEntry } from '../api/client'

/** How far into the future to sync calendar events (3 months) */
const SYNC_RANGE_MS = 3 * 30 * 24 * 60 * 60 * 1000

export interface DeviceCalendar {
  id: string
  title: string
  color: string | undefined
  source: string
  allowsModifications: boolean
}

/**
 * Get all device calendars (requires permission).
 * Returns a simplified list of calendars grouped by source.
 */
export async function getDeviceCalendars(): Promise<DeviceCalendar[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  return calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color ?? undefined,
    source: cal.source.name,
    allowsModifications: cal.allowsModifications,
  }))
}

/**
 * Ensure we have calendar permissions, requesting if needed.
 * Returns true if granted, false otherwise.
 */
export async function ensureCalendarPermissions(): Promise<boolean> {
  const has = await hasCalendarPermissions()
  if (has) return true
  return requestCalendarPermissions()
}

/**
 * Read events from selected device calendars and sync them to the backend.
 * This is the main orchestration function for the calendar sync flow.
 *
 * @param selectedCalendarIds - Device calendar IDs the user has selected
 * @returns The updated list of calendar connections from the backend
 */
export async function syncSelectedCalendars(
  selectedCalendarIds: string[]
): Promise<void> {
  if (selectedCalendarIds.length === 0) {
    // User deselected all calendars - sync with empty array to remove all
    await postCalendarsSync({
      body: { calendars: [] },
    })
    return
  }

  // Get calendar metadata for selected calendars
  const allCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const selectedCalendars = allCalendars.filter((cal) =>
    selectedCalendarIds.includes(cal.id)
  )

  // Define sync time range: now to +3 months
  const startDate = new Date()
  const endDate = new Date(Date.now() + SYNC_RANGE_MS)

  // Read events from all selected calendars
  const events = await Calendar.getEventsAsync(
    selectedCalendarIds,
    startDate,
    endDate
  )

  // Group events by calendar ID
  const eventsByCalendar = new Map<string, Calendar.Event[]>()
  for (const event of events) {
    const calId = event.calendarId
    if (!eventsByCalendar.has(calId)) {
      eventsByCalendar.set(calId, [])
    }
    eventsByCalendar.get(calId)!.push(event)
  }

  // Build the sync payload
  const calendars: SyncCalendarEntry[] = selectedCalendars.map((cal) => {
    const calEvents = eventsByCalendar.get(cal.id) ?? []

    return {
      externalCalendarId: cal.id,
      calendarName: cal.title,
      color: cal.color ?? undefined,
      events: calEvents
        .filter((event) => {
          // Skip all-day events that are marked as free
          if (event.allDay && event.availability === 'free') return false
          // Skip events explicitly marked as free/tentative
          if (event.availability === 'free') return false
          return true
        })
        .map((event) => ({
          externalEventId: event.id,
          startTime: new Date(event.startDate).toISOString(),
          endTime: new Date(event.endDate).toISOString(),
          isBusy: event.availability !== 'free',
        })),
    }
  })

  // Send to backend
  const response = await postCalendarsSync({
    body: { calendars },
  })

  if (!response.data?.success) {
    throw new Error('Failed to sync calendars')
  }
}

/**
 * Perform a background re-sync of already-connected calendars.
 * Reads current connections from the backend, then re-reads events from those
 * device calendars and syncs them.
 *
 * @param connectedCalendarIds - The external calendar IDs that are already connected
 */
export async function resyncConnectedCalendars(
  connectedCalendarIds: string[]
): Promise<void> {
  if (connectedCalendarIds.length === 0) return

  const hasPermission = await hasCalendarPermissions()
  if (!hasPermission) return

  await syncSelectedCalendars(connectedCalendarIds)
}
