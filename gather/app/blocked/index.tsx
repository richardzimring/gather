import { ScrollView, Text, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackHeader } from "../../components/ui/ScreenHeader";
import { BlockedWindowsCard } from "../../components/ui/BlockedWindowsCard";

export default function BlockedWindowsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader title="Blocked Windows" />

        <Text
          color="$colorMuted"
          fontSize={14}
          lineHeight={21}
          marginBottom="$4"
        >
          Times you&apos;ve marked as unavailable. Gather will show you as busy
          during these windows.
        </Text>

        <BlockedWindowsCard />
      </ScrollView>
    </YStack>
  );
}
