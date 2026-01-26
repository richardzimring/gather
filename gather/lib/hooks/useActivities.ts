import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getActivities,
  postActivities,
  patchActivitiesByActivityId,
  deleteActivitiesByActivityId,
  type CreateActivity,
  type UpdateActivity,
} from '../api/client'

export const activitiesKeys = {
  all: ['activities'] as const,
  list: () => [...activitiesKeys.all, 'list'] as const,
}

/**
 * Hook to fetch all activities (default + user-created).
 */
export function useActivities() {
  return useQuery({
    queryKey: activitiesKeys.list(),
    queryFn: async () => {
      const response = await getActivities()
      if (!response.data?.success) {
        throw new Error('Failed to fetch activities')
      }
      return response.data.data.activities
    },
  })
}

/**
 * Hook to create a new activity.
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateActivity) => {
      const response = await postActivities({ body: data })
      if (!response.data?.success) {
        throw new Error('Failed to create activity')
      }
      return response.data.data.activity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.list() })
    },
  })
}

/**
 * Hook to update an activity.
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: string
      data: UpdateActivity
    }) => {
      const response = await patchActivitiesByActivityId({
        path: { activityId },
        body: data,
      })
      if (!response.data?.success) {
        throw new Error('Failed to update activity')
      }
      return response.data.data.activity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.list() })
    },
  })
}

/**
 * Hook to delete an activity.
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (activityId: string) => {
      await deleteActivitiesByActivityId({ path: { activityId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.list() })
    },
  })
}
