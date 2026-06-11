import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  requestCalendarPermissions,
  hasCalendarPermissions,
  getCalendars,
  getAllEvents,
  exportEventToCalendar,
} from '../services/calendar';
import type { Event } from '../api/client';
import { useAuth } from './useAuth';

export const calendarKeys = {
  all: ['calendar'] as const,
  permissions: () => [...calendarKeys.all, 'permissions'] as const,
  calendars: () => [...calendarKeys.all, 'calendars'] as const,
  events: (start: string, end: string) =>
    [...calendarKeys.all, 'events', start, end] as const,
};

/**
 * Hook to manage calendar permissions.
 */
export function useCalendarPermissions() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = useCallback(async () => {
    const granted = await hasCalendarPermissions();
    setHasPermission(granted);
  }, []);

  // The async IIFE marks this as asynchronous work for the
  // set-state-in-effect rule.
  useEffect(() => {
    void (async () => {
      await checkPermissions();
    })();
  }, [checkPermissions]);

  const requestPermission = useCallback(async () => {
    setIsRequesting(true);
    try {
      const granted = await requestCalendarPermissions();
      setHasPermission(granted);
      return granted;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    checkPermissions,
  };
}

/**
 * Hook to get available calendars.
 */
export function useCalendars() {
  const { hasPermission } = useCalendarPermissions();

  return useQuery({
    queryKey: calendarKeys.calendars(),
    queryFn: getCalendars,
    enabled: hasPermission === true,
  });
}

/**
 * Hook to get calendar events within a date range.
 */
export function useCalendarEvents(startDate: Date, endDate: Date) {
  const { hasPermission } = useCalendarPermissions();

  return useQuery({
    queryKey: calendarKeys.events(
      startDate.toISOString(),
      endDate.toISOString(),
    ),
    queryFn: () => getAllEvents(startDate, endDate),
    enabled: hasPermission === true,
  });
}

/**
 * Hook to export a Gather event to the device calendar.
 */
export function useExportToCalendar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      event,
      calendarId,
    }: {
      event: Event;
      calendarId?: string;
    }) => {
      const calendarEventId = await exportEventToCalendar(
        event,
        calendarId,
        user?.userId,
      );
      if (!calendarEventId) {
        throw new Error('Failed to export event to calendar');
      }
      return calendarEventId;
    },
    onSuccess: () => {
      // Invalidate calendar events queries
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
