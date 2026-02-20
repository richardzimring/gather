import { useEffect, useState } from "react";
import { Alert, AppState, Linking } from "react-native";
import {
  Bell,
  Calendar,
  UserPlus,
  Users,
  AlertTriangle,
} from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { ScrollView, Text, XStack, YStack, Theme } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Card } from "../../components/ui/Card";
import { BackHeader } from "../../components/ui/ScreenHeader";
import { SkeletonBar, SkeletonCircle } from "../../components/ui/Skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  registerPushTokenAsync,
} from "../../lib/hooks";
import { haptic } from "../../lib/haptics";

interface NotificationSettingProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void | Promise<void>;
  disabled?: boolean;
}

function NotificationSetting({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
}: NotificationSettingProps) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$3"
      gap="$3"
      opacity={disabled ? 0.5 : 1}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={8}
        backgroundColor="$backgroundHover"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {icon}
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="500" marginBottom="$1">
          {label}
        </Text>
        <Text color="$colorMuted" fontSize={13}>
          {description}
        </Text>
      </YStack>
      <Toggle checked={value} onCheckedChange={onToggle} disabled={disabled} />
    </XStack>
  );
}

function NotificationSettingSkeleton() {
  return (
    <XStack alignItems="center" paddingVertical="$3" gap="$3">
      <SkeletonCircle size={36} />
      <YStack flex={1} gap="$2">
        <SkeletonBar width={140} height={14} />
        <SkeletonBar width={200} height={13} />
      </YStack>
      <SkeletonBar width={50} height={30} borderRadius={15} />
    </XStack>
  );
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();

  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePreferences } = useUpdateNotificationPreferences();

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");

  const checkPermission = () => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status as "granted" | "denied" | "undetermined");
    });
  };

  useEffect(() => {
    checkPermission();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermission();
      }
    });
    return () => subscription.remove();
  }, []);

  const handleToggle = (key: string) => async (value: boolean) => {
    if (value) {
      if (permissionStatus === "undetermined") {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          setPermissionStatus("granted");
          await registerPushTokenAsync().catch(console.error);
          haptic.selection();
          setPendingKey(key);
          updatePreferences({ [key]: true }, { onSettled: () => setPendingKey(null) });
        } else {
          setPermissionStatus("denied");
        }
        return;
      }
      if (permissionStatus === "denied") {
        Alert.alert(
          "Notifications Disabled",
          "To receive notifications, enable them for Gather in iOS Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    haptic.selection();
    setPendingKey(key);
    updatePreferences({ [key]: value }, { onSettled: () => setPendingKey(null) });
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
        {/* Header */}
        <BackHeader title="Notifications" onBack={() => router.back()} />

        {/* Denied permission banner */}
        {permissionStatus === "denied" && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <XStack gap="$3" alignItems="center">
                <YStack
                  width={36}
                  height={36}
                  borderRadius={6}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <AlertTriangle size={16} color="$warning" />
                </YStack>
                <YStack flex={1} gap="$2">
                  <Text fontSize={13} fontWeight="600">
                    Notifications are disabled
                  </Text>
                  <Text fontSize={12} color="$colorMuted">
                    Enable notifications for Gather in iOS Settings to receive
                    alerts.
                  </Text>
                  <Button
                    variant="outline"
                    buttonSize="sm"
                    onPress={() => Linking.openSettings()}
                    marginTop="$1"
                  >
                    Open Settings
                  </Button>
                </YStack>
              </XStack>
            </Card>
          </Theme>
        )}

        {/* Info Card */}
        {permissionStatus !== "denied" && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <XStack gap="$3" alignItems="center">
                <YStack
                  width={36}
                  height={36}
                  borderRadius={6}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Bell size={16} color="$colorMuted" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={13} color="$colorMuted">
                    Choose which notifications you want to receive from Gather.
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </Theme>
        )}

        {isLoading ? (
          <>
            {/* Events Skeleton */}
            <Theme name="Card">
              <Card marginBottom="$4">
                <Text
                  color="$colorMuted"
                  fontSize={12}
                  fontWeight="600"
                  marginBottom="$2"
                >
                  EVENTS
                </Text>
                <NotificationSettingSkeleton />
                <NotificationSettingSkeleton />
              </Card>
            </Theme>

            {/* Social Skeleton */}
            <Theme name="Card">
              <Card marginBottom="$4">
                <Text
                  color="$colorMuted"
                  fontSize={12}
                  fontWeight="600"
                  marginBottom="$2"
                >
                  SOCIAL
                </Text>
                <NotificationSettingSkeleton />
                <NotificationSettingSkeleton />
              </Card>
            </Theme>
          </>
        ) : (
          <>
            {/* Events */}
            <Theme name="Card">
              <Card marginBottom="$4">
                <Text
                  color="$colorMuted"
                  fontSize={12}
                  fontWeight="600"
                  marginBottom="$2"
                >
                  EVENTS
                </Text>
                <NotificationSetting
                  icon={<Calendar size={16} color="$colorMuted" />}
                  label="Event Invites"
                  description="Get notified when someone invites you to an event"
                  value={preferences?.eventInvites ?? true}
                  onToggle={handleToggle("eventInvites")}
                  disabled={pendingKey === "eventInvites"}
                />
                <NotificationSetting
                  icon={<Calendar size={16} color="$colorMuted" />}
                  label="Event Updates"
                  description="Get notified about changes to events you're attending"
                  value={preferences?.eventUpdates ?? true}
                  onToggle={handleToggle("eventUpdates")}
                  disabled={pendingKey === "eventUpdates"}
                />
              </Card>
            </Theme>

            {/* Social */}
            <Theme name="Card">
              <Card marginBottom="$4">
                <Text
                  color="$colorMuted"
                  fontSize={12}
                  fontWeight="600"
                  marginBottom="$2"
                >
                  SOCIAL
                </Text>
                <NotificationSetting
                  icon={<UserPlus size={16} color="$colorMuted" />}
                  label="Friend Requests"
                  description="Get notified when someone sends you a friend request"
                  value={preferences?.friendRequests ?? true}
                  onToggle={handleToggle("friendRequests")}
                  disabled={pendingKey === "friendRequests"}
                />
                <NotificationSetting
                  icon={<Users size={16} color="$colorMuted" />}
                  label="Group Invites"
                  description="Get notified when someone adds you to a group"
                  value={preferences?.groupInvites ?? true}
                  onToggle={handleToggle("groupInvites")}
                  disabled={pendingKey === "groupInvites"}
                />
              </Card>
            </Theme>
          </>
        )}
      </ScrollView>
    </YStack>
  );
}
