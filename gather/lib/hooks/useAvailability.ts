import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getAvailability,
  getAvailabilityFriends,
  postAvailability,
  patchAvailabilityByWindowId,
  deleteAvailabilityByWindowId,
  type CreateAvailability,
  type UpdateAvailability,
} from '../api/client'

export const availabilityKeys = {
  all: ['availability'] as const,
  list: () => [...availabilityKeys.all, 'list'] as const,
  friends: (startDate?: string, endDate?: string) =>
    [...availabilityKeys.all, 'friends', startDate, endDate] as const,
}

/**
 * Hook to fetch current user's availability windows.
 */
export function useAvailability() {
  return useQuery({
    queryKey: availabilityKeys.list(),
    queryFn: async () => {
      const response = await getAvailability()
      if (!response.data?.success) {
        throw new Error('Failed to fetch availability')
      }
      return response.data.data.windows
    },
  })
}

/**
 * Hook to fetch friends' availability windows.
 */
export function useFriendsAvailability(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: availabilityKeys.friends(startDate, endDate),
    queryFn: async () => {
      const response = await getAvailabilityFriends({
        query: { startDate, endDate },
      })
      if (!response.data?.success) {
        throw new Error('Failed to fetch friends availability')
      }
      return response.data.data.availability
    },
  })
}

/**
 * Hook to create an availability window.
 */
export function useCreateAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAvailability) => {
      const response = await postAvailability({ body: data })
      if (!response.data?.success) {
        throw new Error('Failed to create availability')
      }
      return response.data.data.window
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all })
    },
  })
}

/**
 * Hook to update an availability window.
 */
export function useUpdateAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      windowId,
      data,
    }: {
      windowId: string
      data: UpdateAvailability
    }) => {
      const response = await patchAvailabilityByWindowId({
        path: { windowId },
        body: data,
      })
      if (!response.data?.success) {
        throw new Error('Failed to update availability')
      }
      return response.data.data.window
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all })
    },
  })
}

/**
 * Hook to delete an availability window.
 */
export function useDeleteAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (windowId: string) => {
      await deleteAvailabilityByWindowId({ path: { windowId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all })
    },
  })
}
