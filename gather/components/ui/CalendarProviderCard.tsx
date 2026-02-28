import { Separator, Theme, XStack, YStack, Text } from 'tamagui';
import { CheckCircle2, ChevronRight } from '@tamagui/lucide-icons';

import { CalendarProviderIcon } from './CalendarProviderIcon';
import { Card } from './Card';
import { Spinner } from './Spinner';
import { SkeletonBar, SkeletonCircle } from './Skeleton';

export type CalendarProviderId = 'apple' | 'google' | 'outlook';

export interface CalendarProviderItem {
  id: CalendarProviderId;
  name: string;
  isConnected: boolean;
  isExportEnabled: boolean;
  isConnecting: boolean;
  onPress: () => void;
}

interface CalendarProviderCardProps {
  isLoading: boolean;
  providers: CalendarProviderItem[];
}

export function CalendarProviderCard({
  isLoading,
  providers,
}: CalendarProviderCardProps) {
  return (
    <Theme name="Card">
      <Card width="100%">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i, index) => (
              <YStack key={i}>
                {index > 0 && <Separator />}
                <XStack alignItems="center" paddingVertical="$3" gap="$3">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius={8}
                    backgroundColor="$backgroundHover"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <SkeletonCircle size={20} />
                  </YStack>
                  <YStack flex={1}>
                    <SkeletonBar width={130} height={14} />
                  </YStack>
                  <SkeletonBar width={20} height={20} borderRadius={4} />
                </XStack>
              </YStack>
            ))}
          </>
        ) : (
          providers.map((provider, index) => (
            <YStack key={provider.id}>
              {index > 0 && <Separator />}
              <XStack
                alignItems="center"
                paddingVertical="$3"
                gap="$3"
                opacity={provider.isConnecting ? 0.5 : 1}
                pressStyle={
                  !provider.isConnecting ? { opacity: 0.7 } : undefined
                }
                onPress={!provider.isConnecting ? provider.onPress : undefined}
                disabled={provider.isConnecting}
              >
                <YStack
                  width={36}
                  height={36}
                  borderRadius={8}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  {provider.isConnecting ? (
                    <Spinner size="small" color="$color" />
                  ) : (
                    <CalendarProviderIcon provider={provider.id} size={20} />
                  )}
                </YStack>

                <Text flex={1} fontWeight="500" fontSize={15} color="$color">
                  {provider.isConnecting ? 'Connecting...' : provider.name}
                </Text>

                {!provider.isConnecting && (
                  <XStack alignItems="center" marginRight="$2">
                    {(provider.isConnected || provider.isExportEnabled) && (
                      <CheckCircle2 size={20} color="$success" />
                    )}
                  </XStack>
                )}

                {!provider.isConnecting && (
                  <ChevronRight size={20} color="$colorMuted" />
                )}
              </XStack>
            </YStack>
          ))
        )}
      </Card>
    </Theme>
  );
}
