import { ScrollView, Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '../../components/ui/ScreenHeader';
import { CalendarProviderCard } from '../../components/ui/CalendarProviderCard';
import { useCalendarProviders } from '../../lib/hooks';

export default function CalendarAddScreen() {
  const insets = useSafeAreaInsets();
  const { isLoading, providers } = useCalendarProviders();

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader title="Add a Calendar" />

        <Text color="$colorMuted" fontSize={14} marginBottom="$4">
          Manage your calendars or connect a new provider.
        </Text>

        <CalendarProviderCard isLoading={isLoading} providers={providers} />
      </ScrollView>
    </YStack>
  );
}
