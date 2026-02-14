import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getBlocked,
  getBlockedFriendsFreeTime,
  postBlocked,
  patchBlockedByWindowId,
  deleteBlockedByWindowId,
  type CreateBlockedWindow,
  type UpdateBlockedWindow,
} from '../api/client'

export const blockedKeys = {
  all: ['blocked'] as const,
  list: () => [...blockedKeys.all, 'list'] as const,
  friendsFreeTime: (startDate: string, endDate: string) =>
    [...blockedKeys.all, 'friends-free-time', startDate, endDate] as const,
}

/**
 * Hook to fetch current user's blocked windows (times when NOT available).
 */
export function useBlockedWindows() {
  return useQuery({
    queryKey: blockedKeys.list(),
    queryFn: async () => {
      const response = await getBlocked()
      if (!response.data?.success) {
        throw new Error('Failed to fetch blocked windows')
      }
      return response.data.data.windows
    },
  })
}

/**
 * Hook to fetch friends' computed free time (24/7 minus blocked windows and calendar events).
 * Requires both startDate and endDate.
 */
export function useFriendsFreeTime(startDate: string, endDate: string) {
  return useQuery({
    queryKey: blockedKeys.friendsFreeTime(startDate, endDate),
    queryFn: async () => {
      const response = await getBlockedFriendsFreeTime({
        query: { startDate, endDate },
      })
      if (!response.data?.success) {
        throw new Error('Failed to fetch friends free time')
      }
      return response.data.data.freeTime
    },
    enabled: !!startDate && !!endDate,
  })
}

/**
 * Hook to create a blocked window (mark time as unavailable).
 */
export function useCreateBlockedWindow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateBlockedWindow) => {
      const response = await postBlocked({ body: data })
      if (!response.data?.success) {
        throw new Error('Failed to create blocked window')
      }
      return response.data.data.window
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockedKeys.all })
    },
  })
}

/**
 * Hook to update a blocked window.
 */
export function useUpdateBlockedWindow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      windowId,
      data,
    }: {
      windowId: string
      data: UpdateBlockedWindow
    }) => {
      const response = await patchBlockedByWindowId({
        path: { windowId },
        body: data,
      })
      if (!response.data?.success) {
        throw new Error('Failed to update blocked window')
      }
      return response.data.data.window
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockedKeys.all })
    },
  })
}

/**
 * Hook to delete a blocked window.
 */
export function useDeleteBlockedWindow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (windowId: string) => {
      await deleteBlockedByWindowId({ path: { windowId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockedKeys.all })
    },
  })
}
