import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getGroups,
  postGroups,
  patchGroupsByGroupId,
  deleteGroupsByGroupId,
  type CreateGroup,
  type UpdateGroup,
} from '../api/client'

export const groupsKeys = {
  all: ['groups'] as const,
  list: () => [...groupsKeys.all, 'list'] as const,
  detail: (id: string) => [...groupsKeys.all, 'detail', id] as const,
}

/**
 * Hook to fetch all groups.
 */
export function useGroups() {
  return useQuery({
    queryKey: groupsKeys.list(),
    queryFn: async () => {
      const response = await getGroups()
      if (!response.data?.success) {
        throw new Error('Failed to fetch groups')
      }
      return response.data.data.groups
    },
  })
}

/**
 * Hook to create a new group.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateGroup) => {
      const response = await postGroups({ body: data })
      if (!response.data?.success) {
        throw new Error('Failed to create group')
      }
      return response.data.data.group
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() })
    },
  })
}

/**
 * Hook to update a group.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: UpdateGroup }) => {
      const response = await patchGroupsByGroupId({ path: { groupId }, body: data })
      if (!response.data?.success) {
        throw new Error('Failed to update group')
      }
      return response.data.data.group
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() })
    },
  })
}

/**
 * Hook to delete a group.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      await deleteGroupsByGroupId({ path: { groupId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() })
    },
  })
}
