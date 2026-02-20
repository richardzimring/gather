import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Theme,
  Circle,
  Separator,
} from "tamagui";
import { Calendar, CalendarCheck, Info, Trash2 } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { CalendarProviderIcon } from "../../components/ui/CalendarProviderIcon";
import { Card } from "../../components/ui/Card";
import { BackHeader } from "../../components/ui/ScreenHeader";
import { SkeletonBar, SkeletonCircle } from "../../components/ui/Skeleton";
import {
  useCalendarConnections,
  useDisconnectCalendar,
  useGoogleCalendars,
  useSelectGoogleCalendars,
  useOutlookCalendars,
  useSelectOutlookCalendars,
  useSyncCalendars,
} from "../../lib/hooks";
import {
  ensureCalendarPermissions,
  getDeviceCalendars,
  type DeviceCalendar,
} from "../../lib/services/calendarSync";
import { haptic } from "../../lib/haptics";

type CalendarProvider = "apple" | "google" | "outlook";

interface ProviderConfig {
  title: string;
  displayName: string;
  infoBanner: string;
  emptyMessage: string;
}

const PROVIDER_CONFIG: Record<CalendarProvider, ProviderConfig> = {
  apple: {
    title: "Apple Calendars",
    displayName: "Apple Calendar",
    infoBanner:
      "Select which Apple calendars to import. Gather will read your busy times to help find availability.",
    emptyMessage: "No calendars found on your device",
  },
  google: {
    title: "Google Calendars",
    displayName: "Google Calendar",
    infoBanner:
      "Select which Google calendars to import. Gather will read your busy times to help find availability.",
    emptyMessage: "No calendars found in your Google account",
  },
  outlook: {
    title: "Outlook Calendars",
    displayName: "Outlook Calendar",
    infoBanner:
      "Select which Outlook calendars to import. Gather will read your busy times to help find availability.",
    emptyMessage: "No calendars found in your Outlook account",
  },
};

interface NormalizedCalendar {
  id: string;
  name: string;
  color?: string;
  isPrimary?: boolean;
  source?: string;
}

function CalendarItemSkeleton() {
  return (
    <XStack alignItems="center" paddingVertical="$2" gap="$3">
      <SkeletonCircle size={12} />
      <YStack flex={1}>
        <SkeletonBar width={150} height={15} />
      </YStack>
      <SkeletonBar width={50} height={30} borderRadius={15} />
    </XStack>
  );
}

export default function CalendarSelectScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ provider: CalendarProvider }>();
  const provider = params.provider as CalendarProvider;
  const config = PROVIDER_CONFIG[provider];

  const { data: connections } = useCalendarConnections();

  // Apple-specific state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deviceCalendars, setDeviceCalendars] = useState<DeviceCalendar[]>([]);

  // API-based calendars (Google/Outlook)
  const {
    data: googleCalendars,
    isLoading: isLoadingGoogle,
    error: googleError,
  } = useGoogleCalendars(provider === "google");
  const {
    data: outlookCalendars,
    isLoading: isLoadingOutlook,
    error: outlookError,
  } = useOutlookCalendars(provider === "outlook");

  // Mutations
  const syncCalendars = useSyncCalendars();
  const selectGoogleCalendars = useSelectGoogleCalendars();
  const selectOutlookCalendars = useSelectOutlookCalendars();
  const disconnectCalendar = useDisconnectCalendar();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(provider === "apple");
  const [initialized, setInitialized] = useState(false);

  // Build a set of already-connected calendar IDs
  const connectedIds = useMemo(() => {
    if (!connections) return new Set<string>();
    return new Set(
      connections
        .filter((c) => {
          if (provider === "apple") return c.provider === "apple";
          if (provider === "google")
            return c.provider === "google" && c.importEnabled;
          if (provider === "outlook")
            return c.provider === "outlook" && c.importEnabled;
          return false;
        })
        .map((c) => c.externalCalendarId),
    );
  }, [connections, provider]);

  // Apple: Load device calendars
  const loadCalendars = useCallback(async () => {
    if (provider !== "apple") return;

    setIsLoading(true);
    try {
      const granted = await ensureCalendarPermissions();
      setHasPermission(granted);

      if (granted) {
        const calendars = await getDeviceCalendars();
        setDeviceCalendars(calendars);

        // Pre-select connected calendars
        if (connectedIds.size > 0) {
          setSelectedIds(new Set(connectedIds));
        }
      }
    } catch (error) {
      console.error("Failed to load calendars:", error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [connectedIds, provider]);

  // Load device calendars on mount (Apple only)
  useEffect(() => {
    if (provider === "apple") {
      loadCalendars();
    }
  }, [loadCalendars, provider]);

  // Apple: Pre-select already-connected calendars once we have both data sources
  useEffect(() => {
    if (
      provider === "apple" &&
      deviceCalendars.length > 0 &&
      connectedIds.size > 0
    ) {
      setSelectedIds((prev) => {
        // Only set if we haven't already touched selection
        if (prev.size === 0) {
          return new Set(connectedIds);
        }
        return prev;
      });
    }
  }, [deviceCalendars, connectedIds, provider]);

  // Google/Outlook: Pre-select currently connected calendars once data is loaded
  useEffect(() => {
    if (provider === "apple") return;

    const calendars =
      provider === "google" ? googleCalendars : outlookCalendars;

    if (calendars && !initialized) {
      if (connectedIds.size > 0) {
        // Re-visiting: pre-select already connected calendars
        setSelectedIds(new Set(connectedIds));
      } else {
        // First time: pre-select only the primary calendar
        const primaryCalendar = calendars.find((c) => c.isPrimary);
        if (primaryCalendar) {
          setSelectedIds(new Set([primaryCalendar.externalCalendarId]));
        }
      }
      setInitialized(true);
    }
  }, [googleCalendars, outlookCalendars, connectedIds, initialized, provider]);

  // Normalize calendars from different sources
  const normalizedCalendars = useMemo((): NormalizedCalendar[] => {
    if (provider === "apple") {
      return deviceCalendars.map((cal) => ({
        id: cal.id,
        name: cal.title,
        color: cal.color,
        source: cal.source,
      }));
    }
    if (provider === "google" && googleCalendars) {
      return googleCalendars.map((cal) => ({
        id: cal.externalCalendarId,
        name: cal.calendarName,
        color: cal.color,
        isPrimary: cal.isPrimary,
      }));
    }
    if (provider === "outlook" && outlookCalendars) {
      return outlookCalendars.map((cal) => ({
        id: cal.externalCalendarId,
        name: cal.calendarName,
        color: cal.color,
        isPrimary: cal.isPrimary,
      }));
    }
    return [];
  }, [provider, deviceCalendars, googleCalendars, outlookCalendars]);

  const toggleCalendar = useCallback((calendarId: string) => {
    haptic.selection();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  }, []);

  const hasChanges = useMemo(() => {
    // Check if selection differs from currently connected
    if (selectedIds.size !== connectedIds.size) return true;
    for (const id of selectedIds) {
      if (!connectedIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, connectedIds]);

  const handleDisconnect = () => {
    haptic.warning();
    Alert.alert(
      `Disconnect ${config.displayName}`,
      `Are you sure you want to disconnect ${config.displayName}? All calendar connections for this provider will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectCalendar.mutateAsync(provider);
              router.back();
            } catch {
              haptic.error();
              Alert.alert(
                "Error",
                `Failed to disconnect ${config.displayName}. Please try again.`,
              );
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    try {
      const calendarIds = Array.from(selectedIds);

      if (provider === "apple") {
        await syncCalendars.mutateAsync(calendarIds);
      } else if (provider === "google") {
        await selectGoogleCalendars.mutateAsync(calendarIds);
      } else if (provider === "outlook") {
        await selectOutlookCalendars.mutateAsync(calendarIds);
      }

      router.back();
    } catch (error) {
      console.error(`Failed to save ${provider} calendar selection:`, error);
      Alert.alert(
        "Save Failed",
        "Failed to save your calendar selection. Please try again.",
      );
    }
  };

  // Get loading and error states
  const isDataLoading =
    (provider === "apple" && isLoading) ||
    (provider === "google" && (isLoadingGoogle || !googleCalendars)) ||
    (provider === "outlook" && (isLoadingOutlook || !outlookCalendars));

  const hasError =
    (provider === "google" && googleError) ||
    (provider === "outlook" && outlookError);

  const isSaving =
    (provider === "apple" && syncCalendars.isPending) ||
    (provider === "google" && selectGoogleCalendars.isPending) ||
    (provider === "outlook" && selectOutlookCalendars.isPending);

  // Apple: Permission not granted state
  if (provider === "apple" && hasPermission === false) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
          }}
        >
          <BackHeader title={config.title} />

          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical="$6"
            gap="$4"
          >
            <Calendar size={48} color="$colorMuted" />
            <Text fontSize={18} fontWeight="600" textAlign="center">
              Calendar Access Required
            </Text>
            <Text color="$colorMuted" textAlign="center" paddingHorizontal="$4">
              Gather needs access to your calendars to check your availability
              and help find times when you and your friends are free.
            </Text>
            <Button variant="primary" onPress={loadCalendars} marginTop="$2">
              Grant Calendar Access
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // Error state (Google/Outlook)
  if (hasError) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
          }}
        >
          <BackHeader title={config.title} />
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical="$6"
            gap="$4"
          >
            <CalendarProviderIcon provider={provider} size={48} />
            <Text fontSize={18} fontWeight="600" textAlign="center">
              Unable to Load Calendars
            </Text>
            <Text color="$colorMuted" textAlign="center" paddingHorizontal="$4">
              Please check your {config.displayName} connection and try again.
            </Text>
            <Button variant="primary" onPress={() => router.back()}>
              Go Back
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // Loading state
  if (isDataLoading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
          }}
        >
          <BackHeader title={config.title} />

          {/* Info banner */}
          <XStack
            backgroundColor="$backgroundHover"
            borderRadius="$2"
            padding="$3"
            gap="$2"
            alignItems="flex-start"
            marginBottom="$4"
          >
            <Info size={16} color="$colorMuted" marginTop={2} />
            <Text color="$colorMuted" fontSize={13} flex={1}>
              {config.infoBanner}
            </Text>
          </XStack>

          {/* Calendar list skeleton */}
          <Theme name="Card">
            <Card marginBottom="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <CalendarProviderIcon provider={provider} size={14} />
                <SkeletonBar width={100} height={13} />
              </XStack>
              <YStack gap="$1">
                <CalendarItemSkeleton />
                <Separator marginVertical="$2" />
                <CalendarItemSkeleton />
                <Separator marginVertical="$2" />
                <CalendarItemSkeleton />
              </YStack>
            </Card>
          </Theme>

          {provider === "apple" && (
            <Theme name="Card">
              <Card>
                <XStack alignItems="center" gap="$2" marginBottom="$3">
                  <CalendarProviderIcon provider={provider} size={14} />
                  <SkeletonBar width={80} height={13} />
                </XStack>
                <YStack gap="$1">
                  <CalendarItemSkeleton />
                  <Separator marginVertical="$2" />
                  <CalendarItemSkeleton />
                </YStack>
              </Card>
            </Theme>
          )}
        </ScrollView>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader
          title={config.title}
          rightAction={
            <Button
              variant="primary"
              buttonSize="sm"
              onPress={handleSave}
              disabled={!hasChanges}
              loading={isSaving}
              loadingText="Saving..."
            >
              Save
            </Button>
          }
        />

        {/* Info banner */}
        <XStack
          backgroundColor="$backgroundHover"
          borderRadius="$2"
          padding="$3"
          gap="$2"
          alignItems="flex-start"
          marginBottom="$4"
        >
          <Info size={16} color="$colorMuted" marginTop={2} />
          <Text color="$colorMuted" fontSize={13} flex={1}>
            {config.infoBanner}
          </Text>
        </XStack>

        {/* Calendar list */}
        {normalizedCalendars.length === 0 ? (
          <YStack alignItems="center" padding="$6" gap="$2">
            <CalendarProviderIcon provider={provider} size={32} />
            <Text color="$colorMuted" textAlign="center">
              {config.emptyMessage}
            </Text>
          </YStack>
        ) : provider === "apple" ? (
          // Apple
          <Theme name="Card">
            <Card>
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <CalendarProviderIcon provider="apple" size={16} />
                <Text color="$colorMuted" fontSize={13} fontWeight="600">
                  APPLE CALENDAR
                </Text>
              </XStack>
              <YStack gap="$1">
                {normalizedCalendars.map((cal, index) => (
                  <YStack key={cal.id}>
                    {index > 0 && <Separator marginVertical="$2" />}
                    <XStack alignItems="center" paddingVertical="$2" gap="$3">
                      <Circle
                        size={12}
                        backgroundColor={cal.color ?? "$colorMuted"}
                      />
                      <YStack flex={1}>
                        <Text fontWeight="500" fontSize={15}>
                          {cal.name}
                        </Text>
                      </YStack>
                      <Toggle
                        checked={selectedIds.has(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                      />
                    </XStack>
                  </YStack>
                ))}
              </YStack>
            </Card>
          </Theme>
        ) : (
          // Google/Outlook
          <Theme name="Card">
            <Card>
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <CalendarProviderIcon provider={provider} size={16} />
                <Text color="$colorMuted" fontSize={13} fontWeight="600">
                  {provider === "google"
                    ? "GOOGLE CALENDAR"
                    : "OUTLOOK CALENDAR"}
                </Text>
              </XStack>
              <YStack gap="$1">
                {normalizedCalendars.map((cal, index) => (
                  <YStack key={cal.id}>
                    {index > 0 && <Separator marginVertical="$2" />}
                    <XStack alignItems="center" paddingVertical="$2" gap="$3">
                      <Circle
                        size={12}
                        backgroundColor={cal.color ?? "$colorMuted"}
                      />
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$1.5">
                          <Text fontWeight="500" fontSize={15}>
                            {cal.name}
                          </Text>
                          {cal.isPrimary && (
                            <Text fontSize={11} color="$colorMuted">
                              Primary
                            </Text>
                          )}
                        </XStack>
                      </YStack>
                      <Toggle
                        checked={selectedIds.has(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                      />
                    </XStack>
                  </YStack>
                ))}
              </YStack>
            </Card>
          </Theme>
        )}

        {/* Selection summary */}
        {selectedIds.size > 0 && (
          <XStack
            alignItems="center"
            justifyContent="center"
            gap="$2"
            marginTop="$4"
          >
            <CalendarCheck size={16} color="$colorMuted" />
            <Text color="$colorMuted" fontSize={13}>
              {selectedIds.size} calendar{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </Text>
          </XStack>
        )}

        {/* Disconnect provider */}
        <Button
          variant="ghost"
          fullWidth
          marginTop="$8"
          icon={<Trash2 size={16} color="$error" />}
          onPress={handleDisconnect}
          loading={disconnectCalendar.isPending}
          loadingText="Disconnecting..."
        >
          <Text color="$error" fontSize={14} fontWeight="500">
            Disconnect {config.displayName}
          </Text>
        </Button>
      </ScrollView>
    </YStack>
  );
}
