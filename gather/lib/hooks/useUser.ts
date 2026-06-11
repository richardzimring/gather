import { useMutation } from '@tanstack/react-query';

import { patchUsersMe, type UpdateUser } from '../api/client';

/**
 * Hook to update the current user's profile (e.g. phone number, timezone).
 * Callers should refresh the auth user afterwards to pick up the new values.
 */
export function useUpdateUser() {
  return useMutation({
    mutationFn: async (data: UpdateUser) => {
      const response = await patchUsersMe({ body: data });
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'Failed to update profile');
      }
      return response.data.data;
    },
  });
}
