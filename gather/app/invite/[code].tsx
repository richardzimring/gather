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

  // Set only from the request's async callbacks; the empty-code error and the
  // initial loading state are derived below.
  const [result, setResult] = useState<{
    status: Status;
    message: string;
  } | null>(null);
  const hasProcessed = useRef(false);

  const cleanCode = (code ?? '').trim().toUpperCase();
  const status: Status = !cleanCode ? 'error' : (result?.status ?? 'loading');
  const message = !cleanCode
    ? 'This invite link looks invalid.'
    : (result?.message ?? 'Sending friend request...');

  useEffect(() => {
    if (isLoading || hasProcessed.current || !cleanCode) return;

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
        setResult({
          status: 'success',
          message:
            response.message ??
            'Friend request sent! They will see it in their requests.',
        });
      })
      .catch((error) => {
        haptic.error();
        setResult({
          status: 'error',
          message:
            error instanceof Error && error.message
              ? error.message
              : "We couldn't send this friend request. The invite may be invalid.",
        });
      });
  }, [cleanCode, isAuthenticated, isLoading, sendFriendRequest]);

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
