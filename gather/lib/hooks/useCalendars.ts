import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCalendars,
  getCalendarsByConnectionId,
  getCalendarsBusySlots,
  postCalendars,
  patchCalendarsByConnectionId,
  deleteCalendarsByConnectionId,
  deleteCalendarsApple,
  deleteCalendarsGoogle,
  deleteCalendarsOutlook,
  getCalendarsGoogleAuthUrl,
  getCalendarsGoogleCalendars,
  postCalendarsGoogleSelect,
  postCalendarsGoogleSync,
  getCalendarsOutlookAuthUrl,
  getCalendarsOutlookCalendars,
  postCalendarsOutlookSelect,
  postCalendarsOutlookSync,
} from '../api/client'
import { syncSelectedCalendars, resyncConnectedCalendars } from '../services/calendarSync'

// Query keys
export const calendarKeys = {
  all: ['calendars'] as const,
  connections: () => [...calendarKeys.all, 'connections'] as const,
  connection: (id: string) => [...calendarKeys.all, 'connection', id] as const,
  busySlots: (start?: string, end?: string) => [...calendarKeys.all, 'busy-slots', start, end] as const,
}

/**
 * Hook to fetch all calendar connections for the current user
 */
export function useCalendarConnections() {
  return useQuery({
    queryKey: calendarKeys.connections(),
    queryFn: async () => {
      const response = await getCalendars()
      if (!response.data?.success) {
        throw new Error('Failed to fetch calendar connections')
      }
      return response.data.data?.connections ?? []
    },
  })
}

/**
 * Hook to fetch a specific calendar connection
 */
export function useCalendarConnection(connectionId: string) {
  return useQuery({
    queryKey: calendarKeys.connection(connectionId),
    queryFn: async () => {
      const response = await getCalendarsByConnectionId({
        path: { connectionId },
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to fetch calendar connection')
      }
      return response.data.data?.connection
    },
    enabled: !!connectionId,
  })
}

/**
 * Hook to fetch busy slots from connected calendars
 */
export function useBusySlots(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: calendarKeys.busySlots(startDate, endDate),
    queryFn: async () => {
      const response = await getCalendarsBusySlots({
        query: { startDate, endDate },
      })
      if (!response.data?.success) {
        throw new Error('Failed to fetch busy slots')
      }
      return response.data.data?.busySlots ?? []
    },
  })
}

/**
 * Hook to create a calendar connection
 */
export function useCreateCalendarConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      provider: 'apple' | 'google' | 'outlook'
      externalCalendarId: string
      calendarName: string
      color?: string
      importEnabled?: boolean
      exportEnabled?: boolean
      accessToken?: string
      refreshToken?: string
      tokenExpiresAt?: string
    }) => {
      const response = await postCalendars({
        body: data,
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to create calendar connection')
      }
      return response.data.data?.connection
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.connections() })
    },
  })
}

/**
 * Hook to update a calendar connection
 */
export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      connectionId,
      data,
    }: {
      connectionId: string
      data: {
        importEnabled?: boolean
        exportEnabled?: boolean
        accessToken?: string
        refreshToken?: string
        tokenExpiresAt?: string
      }
    }) => {
      const response = await patchCalendarsByConnectionId({
        path: { connectionId },
        body: data,
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to update calendar connection')
      }
      return response.data.data?.connection
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.connections() })
      queryClient.invalidateQueries({ queryKey: calendarKeys.connection(variables.connectionId) })
    },
  })
}

/**
 * Hook to delete a calendar connection
 */
export function useDeleteCalendarConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await deleteCalendarsByConnectionId({
        path: { connectionId },
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to delete calendar connection')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.connections() })
    },
  })
}

/**
 * Hook to bulk-sync device calendars to the backend.
 * Accepts an array of device calendar IDs to sync.
 */
export function useSyncCalendars() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (selectedCalendarIds: string[]) => {
      await syncSelectedCalendars(selectedCalendarIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

/**
 * Hook to manually trigger a re-sync of already-connected calendars.
 * Re-reads events from the device for all connected Apple calendars
 * and pushes updated busy slots to the backend.
 */
export function useTriggerCalendarSync() {
  const queryClient = useQueryClient()
  const { data: connections } = useCalendarConnections()

  return useMutation({
    mutationFn: async () => {
      // Sync Apple calendars from device
      const appleCalendarIds = (connections ?? [])
        .filter((c) => c.provider === 'apple' && c.importEnabled)
        .map((c) => c.externalCalendarId)

      if (appleCalendarIds.length > 0) {
        await resyncConnectedCalendars(appleCalendarIds)
      }

      // Sync Google calendars server-side
      const hasGoogleConnections = (connections ?? []).some(
        (c) => c.provider === 'google' && c.importEnabled
      )

      if (hasGoogleConnections) {
        await postCalendarsGoogleSync()
      }

      // Sync Outlook calendars server-side
      const hasOutlookConnections = (connections ?? []).some(
        (c) => c.provider === 'outlook' && c.importEnabled
      )

      if (hasOutlookConnections) {
        await postCalendarsOutlookSync()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

// ============================================
// Google Calendar Hooks
// ============================================

/**
 * Hook to fetch the Google OAuth URL.
 * Returns the URL that should be opened in a browser for the user to authorize.
 */
export function useGoogleAuthUrl() {
  return useQuery({
    queryKey: [...calendarKeys.all, 'google', 'auth-url'] as const,
    queryFn: async () => {
      const response = await getCalendarsGoogleAuthUrl()
      if (!response.data?.success) {
        throw new Error('Failed to get Google auth URL')
      }
      return response.data.data?.authUrl ?? ''
    },
    enabled: false, // Only fetch on demand
  })
}

/**
 * Hook to fetch the user's Google calendars (live from Google API).
 * Only enabled after the user has connected their Google account.
 */
export function useGoogleCalendars(enabled = true) {
  return useQuery({
    queryKey: [...calendarKeys.all, 'google', 'calendars'] as const,
    queryFn: async () => {
      const response = await getCalendarsGoogleCalendars()
      if (!response.data?.success) {
        throw new Error('Failed to fetch Google calendars')
      }
      return response.data.data?.calendars ?? []
    },
    enabled,
  })
}

/**
 * Hook to select which Google calendars to import.
 */
export function useSelectGoogleCalendars() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (calendarIds: string[]) => {
      const response = await postCalendarsGoogleSelect({
        body: { calendarIds },
      })
      if (!response.data?.success) {
        throw new Error('Failed to update Google calendar selection')
      }
      return response.data.data?.connections ?? []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

/**
 * Hook to trigger a server-side sync of Google calendars.
 */
export function useTriggerGoogleSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await postCalendarsGoogleSync()
      if (!response.data?.success) {
        throw new Error('Failed to sync Google calendars')
      }
      return response.data.data?.connections ?? []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

/**
 * Hook to disconnect all calendar connections for a given provider.
 */
export function useDisconnectCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (provider: 'apple' | 'google' | 'outlook') => {
      const deleteFn =
        provider === 'apple'
          ? deleteCalendarsApple
          : provider === 'google'
            ? deleteCalendarsGoogle
            : deleteCalendarsOutlook
      const response = await deleteFn()
      if (!response.data?.success) {
        throw new Error(`Failed to disconnect ${provider} Calendar`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

// ============================================
// Outlook Calendar Hooks
// ============================================

/**
 * Hook to fetch the Outlook OAuth URL.
 * Returns the URL that should be opened in a browser for the user to authorize.
 */
export function useOutlookAuthUrl() {
  return useQuery({
    queryKey: [...calendarKeys.all, 'outlook', 'auth-url'] as const,
    queryFn: async () => {
      const response = await getCalendarsOutlookAuthUrl()
      if (!response.data?.success) {
        throw new Error('Failed to get Outlook auth URL')
      }
      return response.data.data?.authUrl ?? ''
    },
    enabled: false, // Only fetch on demand
  })
}

/**
 * Hook to fetch the user's Outlook calendars (live from Microsoft Graph API).
 * Only enabled after the user has connected their Outlook account.
 */
export function useOutlookCalendars(enabled = true) {
  return useQuery({
    queryKey: [...calendarKeys.all, 'outlook', 'calendars'] as const,
    queryFn: async () => {
      const response = await getCalendarsOutlookCalendars()
      if (!response.data?.success) {
        throw new Error('Failed to fetch Outlook calendars')
      }
      return response.data.data?.calendars ?? []
    },
    enabled,
  })
}

/**
 * Hook to select which Outlook calendars to import.
 */
export function useSelectOutlookCalendars() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (calendarIds: string[]) => {
      const response = await postCalendarsOutlookSelect({
        body: { calendarIds },
      })
      if (!response.data?.success) {
        throw new Error('Failed to update Outlook calendar selection')
      }
      return response.data.data?.connections ?? []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

/**
 * Hook to trigger a server-side sync of Outlook calendars.
 */
export function useTriggerOutlookSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await postCalendarsOutlookSync()
      if (!response.data?.success) {
        throw new Error('Failed to sync Outlook calendars')
      }
      return response.data.data?.connections ?? []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

