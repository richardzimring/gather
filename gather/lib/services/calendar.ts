import * as Calendar from 'expo-calendar'
import { Platform } from 'react-native'

import type { Event } from '../api/client'

export interface CalendarEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  location?: string
  notes?: string
  calendarId: string
}

/**
 * Request calendar permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync()
  return status === 'granted'
}

/**
 * Check if we have calendar permissions.
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync()
  return status === 'granted'
}

/**
 * Get the default calendar for adding events.
 * On iOS, this gets the default calendar for new events.
 */
export async function getDefaultCalendar(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)

  if (Platform.OS === 'ios') {
    // Try to find the default calendar
    const defaultCalendar = calendars.find(
      (cal) => cal.allowsModifications && cal.source.type === 'local'
    )
    if (defaultCalendar) return defaultCalendar.id

    // Fall back to any modifiable calendar
    const modifiableCalendar = calendars.find((cal) => cal.allowsModifications)
    return modifiableCalendar?.id ?? null
  }

  // For other platforms
  const modifiableCalendar = calendars.find((cal) => cal.allowsModifications)
  return modifiableCalendar?.id ?? null
}

/**
 * Get all calendars available on the device.
 */
export async function getCalendars() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  return calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color,
    allowsModifications: cal.allowsModifications,
    source: cal.source.name,
  }))
}

/**
 * Get events from a specific calendar within a date range.
 */
export async function getCalendarEvents(
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const events = await Calendar.getEventsAsync(
    [calendarId],
    startDate,
    endDate
  )

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    location: event.location ?? undefined,
    notes: event.notes ?? undefined,
    calendarId,
  }))
}

/**
 * Get all events from all calendars within a date range.
 * Useful for determining "busy" times.
 */
export async function getAllEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const calendarIds = calendars.map((cal) => cal.id)

  if (calendarIds.length === 0) return []

  const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate)

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    location: event.location ?? undefined,
    notes: event.notes ?? undefined,
    calendarId: event.calendarId,
  }))
}

/**
 * Create an event in the user's calendar from a Gather event.
 * Returns the calendar event ID if successful.
 */
export async function exportEventToCalendar(
  gatherEvent: Event,
  calendarId?: string
): Promise<string | null> {
  try {
    const targetCalendarId = calendarId ?? (await getDefaultCalendar())
    if (!targetCalendarId) {
      console.error('No calendar available for creating events')
      return null
    }

    const eventId = await Calendar.createEventAsync(targetCalendarId, {
      title: gatherEvent.title,
      startDate: new Date(gatherEvent.startTime),
      endDate: new Date(gatherEvent.endTime),
      location: gatherEvent.location,
      notes: gatherEvent.notes
        ? `${gatherEvent.notes}\n\nCreated with Gather`
        : 'Created with Gather',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    return eventId
  } catch (error) {
    console.error('Failed to export event to calendar:', error)
    return null
  }
}

/**
 * Update an existing calendar event.
 */
export async function updateCalendarEvent(
  calendarEventId: string,
  gatherEvent: Event
): Promise<boolean> {
  try {
    await Calendar.updateEventAsync(calendarEventId, {
      title: gatherEvent.title,
      startDate: new Date(gatherEvent.startTime),
      endDate: new Date(gatherEvent.endTime),
      location: gatherEvent.location,
      notes: gatherEvent.notes
        ? `${gatherEvent.notes}\n\nUpdated with Gather`
        : 'Updated with Gather',
    })
    return true
  } catch (error) {
    console.error('Failed to update calendar event:', error)
    return false
  }
}

/**
 * Delete a calendar event.
 */
export async function deleteCalendarEvent(
  calendarEventId: string
): Promise<boolean> {
  try {
    await Calendar.deleteEventAsync(calendarEventId)
    return true
  } catch (error) {
    console.error('Failed to delete calendar event:', error)
    return false
  }
}

/**
 * Find busy time slots from calendar events.
 * Returns an array of { start, end } objects representing busy periods.
 */
export async function getBusySlots(
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const events = await getAllEvents(startDate, endDate)

  return events.map((event) => ({
    start: event.startDate,
    end: event.endDate,
  }))
}

/**
 * Check if a time slot conflicts with existing calendar events.
 */
export async function hasConflict(
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const events = await getAllEvents(
    new Date(startDate.getTime() - 60000), // 1 minute buffer
    new Date(endDate.getTime() + 60000)
  )

  return events.some((event) => {
    return (
      (startDate >= event.startDate && startDate < event.endDate) ||
      (endDate > event.startDate && endDate <= event.endDate) ||
      (startDate <= event.startDate && endDate >= event.endDate)
    )
  })
}
