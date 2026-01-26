import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  requestCalendarPermissions,
  hasCalendarPermissions,
  getCalendars,
  getAllEvents,
  getBusySlots,
  exportEventToCalendar,
  type CalendarEvent,
} from '../services/calendar'
import type { Event } from '../api/client'

export const calendarKeys = {
  all: ['calendar'] as const,
  permissions: () => [...calendarKeys.all, 'permissions'] as const,
  calendars: () => [...calendarKeys.all, 'calendars'] as const,
  events: (start: string, end: string) =>
    [...calendarKeys.all, 'events', start, end] as const,
  busySlots: (start: string, end: string) =>
    [...calendarKeys.all, 'busy', start, end] as const,
}

/**
 * Hook to manage calendar permissions.
 */
export function useCalendarPermissions() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    const granted = await hasCalendarPermissions()
    setHasPermission(granted)
  }

  const requestPermission = useCallback(async () => {
    setIsRequesting(true)
    try {
      const granted = await requestCalendarPermissions()
      setHasPermission(granted)
      return granted
    } finally {
      setIsRequesting(false)
    }
  }, [])

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    checkPermissions,
  }
}

/**
 * Hook to get available calendars.
 */
export function useCalendars() {
  const { hasPermission } = useCalendarPermissions()

  return useQuery({
    queryKey: calendarKeys.calendars(),
    queryFn: getCalendars,
    enabled: hasPermission === true,
  })
}

/**
 * Hook to get calendar events within a date range.
 */
export function useCalendarEvents(startDate: Date, endDate: Date) {
  const { hasPermission } = useCalendarPermissions()

  return useQuery({
    queryKey: calendarKeys.events(startDate.toISOString(), endDate.toISOString()),
    queryFn: () => getAllEvents(startDate, endDate),
    enabled: hasPermission === true,
  })
}

/**
 * Hook to get busy time slots within a date range.
 */
export function useBusySlots(startDate: Date, endDate: Date) {
  const { hasPermission } = useCalendarPermissions()

  return useQuery({
    queryKey: calendarKeys.busySlots(startDate.toISOString(), endDate.toISOString()),
    queryFn: () => getBusySlots(startDate, endDate),
    enabled: hasPermission === true,
  })
}

/**
 * Hook to export a Gather event to the device calendar.
 */
export function useExportToCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      event,
      calendarId,
    }: {
      event: Event
      calendarId?: string
    }) => {
      const calendarEventId = await exportEventToCalendar(event, calendarId)
      if (!calendarEventId) {
        throw new Error('Failed to export event to calendar')
      }
      return calendarEventId
    },
    onSuccess: () => {
      // Invalidate calendar events queries
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}
