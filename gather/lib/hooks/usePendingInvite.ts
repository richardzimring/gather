import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { haptic } from '../haptics';
import {
  clearPendingEventInvite,
  clearPendingFriendInvite,
  getPendingEventInvite,
  getPendingFriendInvite,
} from '../pendingInvite';
import { useAuth } from './useAuth';
import { useSendFriendRequest } from './useFriends';
import { useRedeemInvite } from './useInvites';

/**
 * Processes an invite that was tapped while signed out. Once the user is
 * authenticated, any stored friend invite code is redeemed automatically.
 *
 * Mounted once in the authenticated tab layout.
 */
export function usePendingInvite() {
  const { isAuthenticated } = useAuth();
  const { mutateAsync: sendFriendRequest } = useSendFriendRequest();
  const { mutateAsync: redeemInvite } = useRedeemInvite();
  const running = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || running.current) return;
    running.current = true;

    void (async () => {
      const code = await getPendingFriendInvite();
      if (code) {
        try {
          const response = await sendFriendRequest({
            inviteCode: code,
          });
          await clearPendingFriendInvite();
          haptic.success();
          Alert.alert(
            'Friend Request Sent',
            response.message ??
              'Your friend request has been sent from the invite you opened.',
          );
        } catch (error) {
          console.error('Failed to redeem pending friend invite:', error);
        }
      }

      const token = await getPendingEventInvite();
      if (token) {
        try {
          const result = await redeemInvite(token);
          await clearPendingEventInvite();
          haptic.success();
          if (result.type === 'event' && result.eventId) {
            router.push({
              pathname: '/events/[id]',
              params: { id: result.eventId },
            });
          }
        } catch (error) {
          console.error('Failed to redeem pending event invite:', error);
        }
      }
    })().finally(() => {
      running.current = false;
    });
  }, [isAuthenticated, redeemInvite, sendFriendRequest]);
}
