import { CalendarDays, XCircle } from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Circle, Text, Theme, YStack } from 'tamagui';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth, useRedeemInvite } from '../../lib/hooks';
import { haptic } from '../../lib/haptics';
import { setPendingEventInvite } from '../../lib/pendingInvite';

export default function EventInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isLoading, isAuthenticated } = useAuth();
  const redeemInvite = useRedeemInvite();

  const [redeemError, setRedeemError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  // An empty token is derivable directly from the route param — no state needed
  const cleanToken = (token ?? '').trim();
  const error = cleanToken ? redeemError : 'This invite link looks invalid.';

  useEffect(() => {
    if (isLoading || hasProcessed.current || !cleanToken) return;

    if (!isAuthenticated) {
      hasProcessed.current = true;
      setPendingEventInvite(cleanToken).finally(() => {
        router.replace('/(auth)/login');
      });
      return;
    }

    hasProcessed.current = true;
    void redeemInvite
      .mutateAsync(cleanToken)
      .then((result) => {
        haptic.success();
        if (result.type === 'event' && result.eventId) {
          router.replace({
            pathname: '/events/[id]',
            params: { id: result.eventId },
          });
        } else {
          router.replace('/(tabs)/friends');
        }
      })
      .catch((err) => {
        setRedeemError(
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong opening this invite.',
        );
      });
  }, [cleanToken, isAuthenticated, isLoading, redeemInvite]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <BackHeader title="Invite" />
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$5">
        <Theme name="Card">
          <Card width="100%" maxWidth={360}>
            <YStack gap="$4" alignItems="center" paddingVertical="$4">
              {error ? (
                <>
                  <Circle size={64} backgroundColor="$backgroundHover">
                    <XCircle size={28} color="$error" />
                  </Circle>
                  <Text fontSize={18} fontWeight="600" textAlign="center">
                    Couldn&apos;t open invite
                  </Text>
                  <Text fontSize={15} color="$colorMuted" textAlign="center">
                    {error}
                  </Text>
                  <Button
                    variant="primary"
                    fullWidth
                    onPress={() => router.replace('/(tabs)')}
                  >
                    Go Home
                  </Button>
                </>
              ) : (
                <>
                  <Circle size={64} backgroundColor="$secondary">
                    <CalendarDays size={28} color="$color" />
                  </Circle>
                  <Spinner size="small" color="$color" />
                  <Text fontSize={15} color="$colorMuted" textAlign="center">
                    Opening your invite...
                  </Text>
                </>
              )}
            </YStack>
          </Card>
        </Theme>
      </YStack>
    </YStack>
  );
}
