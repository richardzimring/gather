import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getGroups,
  postGroups,
  patchGroupsByGroupId,
  deleteGroupsByGroupId,
  type CreateGroup,
  type UpdateGroup,
} from '../api/client';

export const groupsKeys = {
  all: ['groups'] as const,
  list: () => [...groupsKeys.all, 'list'] as const,
  detail: (id: string) => [...groupsKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch all groups.
 */
export function useGroups() {
  return useQuery({
    queryKey: groupsKeys.list(),
    queryFn: async () => {
      const { data } = await getGroups();
      return data.data.groups;
    },
  });
}

/**
 * Hook to create a new group.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGroup) => {
      const { data: res } = await postGroups({ body: data });
      return res.data.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}

/**
 * Hook to update a group.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupId: string;
      data: UpdateGroup;
    }) => {
      const { data: res } = await patchGroupsByGroupId({
        path: { groupId },
        body: data,
      });
      return res.data.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}

/**
 * Hook to delete a group.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await deleteGroupsByGroupId({ path: { groupId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}
