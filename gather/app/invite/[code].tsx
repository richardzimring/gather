import { CheckCircle2, UserPlus, XCircle } from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Circle, Text, Theme, YStack } from 'tamagui';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth, useSendFriendRequest } from '../../lib/hooks';
import { haptic } from '../../lib/haptics';
import { setPendingFriendInvite } from '../../lib/pendingInvite';

type Status = 'loading' | 'success' | 'error';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isLoading, isAuthenticated } = useAuth();
  const sendFriendRequest = useSendFriendRequest();

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Sending friend request...');
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (isLoading || hasProcessed.current) return;

    const cleanCode = (code ?? '').trim().toUpperCase();
    if (!cleanCode) {
      hasProcessed.current = true;
      setStatus('error');
      setMessage('This invite link looks invalid.');
      return;
    }

    if (!isAuthenticated) {
      hasProcessed.current = true;
      setPendingFriendInvite(cleanCode).finally(() => {
        router.replace('/(auth)/login');
      });
      return;
    }

    hasProcessed.current = true;
    void sendFriendRequest
      .mutateAsync({ inviteCode: cleanCode })
      .then((response) => {
        haptic.success();
        setStatus('success');
        setMessage(
          response.message ??
            'Friend request sent! They will see it in their requests.',
        );
      })
      .catch((error) => {
        haptic.error();
        setStatus('error');
        setMessage(
          error instanceof Error && error.message
            ? error.message
            : "We couldn't send this friend request. The invite may be invalid.",
        );
      });
  }, [code, isAuthenticated, isLoading, sendFriendRequest]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <BackHeader title="Add Friend" />
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$5">
        <Theme name="Card">
          <Card width="100%" maxWidth={360}>
            <YStack gap="$4" alignItems="center" paddingVertical="$4">
              {status === 'loading' ? (
                <>
                  <Circle size={64} backgroundColor="$secondary">
                    <UserPlus size={28} color="$color" />
                  </Circle>
                  <Spinner size="small" color="$color" />
                  <Text fontSize={15} color="$colorMuted" textAlign="center">
                    {message}
                  </Text>
                </>
              ) : status === 'success' ? (
                <>
                  <Circle size={64} backgroundColor="$successSubtle">
                    <CheckCircle2 size={28} color="$success" />
                  </Circle>
                  <Text fontSize={18} fontWeight="600" textAlign="center">
                    Request sent
                  </Text>
                  <Text fontSize={15} color="$colorMuted" textAlign="center">
                    {message}
                  </Text>
                  <Button
                    variant="primary"
                    fullWidth
                    onPress={() => router.replace('/(tabs)/friends')}
                  >
                    View Friends
                  </Button>
                </>
              ) : (
                <>
                  <Circle size={64} backgroundColor="$backgroundHover">
                    <XCircle size={28} color="$error" />
                  </Circle>
                  <Text fontSize={18} fontWeight="600" textAlign="center">
                    Couldn&apos;t send request
                  </Text>
                  <Text fontSize={15} color="$colorMuted" textAlign="center">
                    {message}
                  </Text>
                  <Button
                    variant="primary"
                    fullWidth
                    onPress={() => router.replace('/(tabs)')}
                  >
                    Go Home
                  </Button>
                </>
              )}
            </YStack>
          </Card>
        </Theme>
      </YStack>
    </YStack>
  );
}
