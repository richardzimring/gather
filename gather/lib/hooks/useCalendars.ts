import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '../api/client'

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
      const response = await client.GET('/calendars')
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to fetch calendar connections')
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
      const response = await client.GET('/calendars/{connectionId}', {
        params: { path: { connectionId } },
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
      const response = await client.GET('/calendars/busy-slots', {
        params: { query: { startDate, endDate } },
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to fetch busy slots')
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
      const response = await client.POST('/calendars', {
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
      const response = await client.PATCH('/calendars/{connectionId}', {
        params: { path: { connectionId } },
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
      const response = await client.DELETE('/calendars/{connectionId}', {
        params: { path: { connectionId } },
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
