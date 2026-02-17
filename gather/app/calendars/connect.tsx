import { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import {
  ScrollView,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
  Theme,
} from "tamagui";
import { ChevronRight } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { CalendarProviderIcon } from "../../components/ui/CalendarProviderIcon";
import { Card } from "../../components/ui/Card";
import { BackHeader } from "../../components/ui/ScreenHeader";
import { SkeletonBar, SkeletonCircle } from "../../components/ui/Skeleton";
import {
  useCalendarConnections,
  calendarConnectionKeys,
} from "../../lib/hooks";
import {
  connectGoogleCalendar,
  GoogleAuthCancelledError,
} from "../../lib/services/googleAuth";
import {
  connectOutlookCalendar,
  OutlookAuthCancelledError,
} from "../../lib/services/outlookAuth";

interface ProviderOption {
  id: "apple" | "google" | "outlook";
  name: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "apple",
    name: "Apple Calendar",
  },
  {
    id: "google",
    name: "Google Calendar",
  },
  {
    id: "outlook",
    name: "Outlook",
  },
];

export default function CalendarConnectScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: connections, isLoading: isLoadingConnections } =
    useCalendarConnections();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);

  const hasGoogleConnection = connections?.some((c) => c.provider === "google");
  const hasOutlookConnection = connections?.some(
    (c) => c.provider === "outlook",
  );

  const handleProviderPress = async (provider: ProviderOption) => {
    switch (provider.id) {
      case "apple":
        router.push({
          pathname: "/calendars/[provider]",
          params: { provider: "apple" },
        });
        break;

      case "google":
        if (hasGoogleConnection) {
          router.push({
            pathname: "/calendars/[provider]",
            params: { provider: "google" },
          });
        } else {
          setIsConnectingGoogle(true);
          try {
            await connectGoogleCalendar();
            // Backend already exchanged the code and stored tokens;
            // invalidate so the google-select screen fetches fresh data
            await queryClient.invalidateQueries({
              queryKey: calendarConnectionKeys.connections(),
            });
            router.push({
              pathname: "/calendars/[provider]",
              params: { provider: "google" },
            });
          } catch (error) {
            if (error instanceof GoogleAuthCancelledError) {
              return;
            }
            console.error("Google Calendar connection failed:", error);
            Alert.alert(
              "Connection Failed",
              "Failed to connect Google Calendar. Please try again.",
            );
          } finally {
            setIsConnectingGoogle(false);
          }
        }
        break;

      case "outlook":
        if (hasOutlookConnection) {
          router.push({
            pathname: "/calendars/[provider]",
            params: { provider: "outlook" },
          });
        } else {
          setIsConnectingOutlook(true);
          try {
            await connectOutlookCalendar();
            // Backend already exchanged the code and stored tokens;
            // invalidate so the outlook-select screen fetches fresh data
            await queryClient.invalidateQueries({
              queryKey: calendarConnectionKeys.connections(),
            });
            router.push({
              pathname: "/calendars/[provider]",
              params: { provider: "outlook" },
            });
          } catch (error) {
            if (error instanceof OutlookAuthCancelledError) {
              return;
            }
            console.error("Outlook Calendar connection failed:", error);
            Alert.alert(
              "Connection Failed",
              "Failed to connect Outlook Calendar. Please try again.",
            );
          } finally {
            setIsConnectingOutlook(false);
          }
        }
        break;
    }
  };

  const getConnectionCount = (providerId: string): number => {
    if (!connections) return 0;
    return connections.filter(
      (c) => c.provider === providerId && c.importEnabled,
    ).length;
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader title="Connect a Calendar" />

        <Text color="$colorMuted" fontSize={14} marginBottom="$4">
          Choose a calendar provider to import your availability.
        </Text>

        <Theme name="Card">
          <Card>
            {isLoadingConnections ? (
              // Skeleton loading
              <>
                {[1, 2, 3].map((i, index) => (
                  <YStack key={i}>
                    {index > 0 && <Separator />}
                    <XStack alignItems="center" paddingVertical="$3">
                      <YStack
                        width={36}
                        height={36}
                        borderRadius={8}
                        backgroundColor="$backgroundHover"
                        alignItems="center"
                        justifyContent="center"
                        marginRight="$3"
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
              PROVIDERS.map((provider, index) => {
                const count = getConnectionCount(provider.id);
                const isLoading =
                  (provider.id === "google" && isConnectingGoogle) ||
                  (provider.id === "outlook" && isConnectingOutlook);

                return (
                  <YStack key={provider.id}>
                    {index > 0 && <Separator />}
                    <XStack
                      alignItems="center"
                      paddingVertical="$3"
                      opacity={isLoading ? 0.5 : 1}
                      pressStyle={!isLoading ? { opacity: 0.7 } : undefined}
                      onPress={() => handleProviderPress(provider)}
                      disabled={isLoading}
                    >
                      <YStack
                        width={36}
                        height={36}
                        borderRadius={8}
                        backgroundColor="$backgroundHover"
                        alignItems="center"
                        justifyContent="center"
                        marginRight="$3"
                      >
                        {isLoading ? (
                          <Spinner size="small" color="$color" />
                        ) : (
                          <CalendarProviderIcon
                            provider={provider.id}
                            size={20}
                          />
                        )}
                      </YStack>
                      <Text flex={1} fontWeight="500" color="$color">
                        {isLoading ? "Connecting..." : provider.name}
                      </Text>
                      {count > 0 && (
                        <Text
                          fontSize={12}
                          color="$colorMuted"
                          fontWeight="500"
                          marginRight="$2"
                        >
                          {count} connected
                        </Text>
                      )}
                      {!isLoading && (
                        <ChevronRight size={20} color="$colorMuted" />
                      )}
                    </XStack>
                  </YStack>
                );
              })
            )}
          </Card>
        </Theme>
      </ScrollView>
    </YStack>
  );
}
