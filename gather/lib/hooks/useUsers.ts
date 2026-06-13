import { useQuery } from '@tanstack/react-query';

import { getUsersByUserIdProfile } from '../api/client';

export const usersKeys = {
  all: ['users'] as const,
  profile: (id: string) => [...usersKeys.all, 'profile', id] as const,
};

/**
 * Hook to fetch another user's public profile (name, avatar, and the viewer's
 * relationship to them). Used e.g. when tapping an attendee in a shared event.
 */
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: usersKeys.profile(userId),
    queryFn: async () => {
      const { data } = await getUsersByUserIdProfile({ path: { userId } });
      return data.data;
    },
    enabled: userId.length > 0,
  });
}
