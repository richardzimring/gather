import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  postInvites,
  postInvitesByTokenRedeem,
  type CreateInvite,
} from '../api/client';
import { eventsKeys } from './useEvents';
import { friendsKeys } from './useFriends';

/**
 * Hook to create a pending invite for someone not yet on Gather. Returns invite link.
 */
export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateInvite) => {
      const { data } = await postInvites({ body });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      if (variables.type === 'event' && variables.eventId) {
        queryClient.invalidateQueries({
          queryKey: eventsKeys.detail(variables.eventId),
        });
      }
      queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
    },
  });
}

/**
 * Hook to redeem a pending invite by its token (recipient tapped the link).
 */
export function useRedeemInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await postInvitesByTokenRedeem({ path: { token } });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}
