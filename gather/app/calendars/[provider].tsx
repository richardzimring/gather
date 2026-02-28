import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Animated } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Theme,
  Circle,
  Separator,
} from 'tamagui';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Info,
  Trash2,
} from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { CalendarProviderIcon } from '../../components/ui/CalendarProviderIcon';
import { BadgeLabel } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { SkeletonBar, SkeletonCircle } from '../../components/ui/Skeleton';
import {
  useCalendarConnections,
  useDisconnectCalendar,
  useGoogleCalendars,
  useSelectGoogleCalendars,
  useOutlookCalendars,
  useSelectOutlookCalendars,
  useSyncCalendars,
  useExportStatus,
  useEnableExport,
  useDisableExport,
  useGoogleExportAuthUrl,
  useOutlookExportAuthUrl,
  calendarConnectionKeys,
  exportKeys,
} from '../../lib/hooks';
import { useAppleExport } from '../../lib/hooks/useAppleExport';
import { OAuthRevokedError } from '../../lib/errors';
import {
  ensureCalendarPermissions,
  getDeviceCalendars,
  type DeviceCalendar,
} from '../../lib/services/calendarSync';
import { haptic } from '../../lib/haptics';
import type { CalendarExportStatus } from '../../lib/api/client';

type CalendarProvider = 'apple' | 'google' | 'outlook';

interface ProviderConfig {
  title: string;
  displayName: string;
  importBanner: string;
  exportBanner: string;
  emptyMessage: string;
}

const PROVIDER_CONFIG: Record<CalendarProvider, ProviderConfig> = {
  apple: {
    title: 'Apple Calendar',
    displayName: 'Apple Calendar',
    importBanner:
      'Select which Apple calendars to import. Gather will read busy times to determine your availability.',
    exportBanner:
      'When enabled, Gather syncs upcoming events to a new calendar on your device.',
    emptyMessage: 'No calendars found on your device',
  },
  google: {
    title: 'Google Calendar',
    displayName: 'Google Calendar',
    importBanner:
      'Select which Google calendars to import. Gather will read busy times to determine your availability.',
    exportBanner:
      'When enabled, Gather syncs upcoming events to a new calendar in your Google account.',
    emptyMessage: 'No calendars found in your Google account',
  },
  outlook: {
    title: 'Outlook',
    displayName: 'Outlook',
    importBanner:
      'Select which Outlook calendars to import. Gather will read busy times to determine your availability.',
    exportBanner:
      'When enabled, Gather syncs upcoming events to a new calendar in your Outlook account.',
    emptyMessage: 'No calendars found in your Outlook account',
  },
};

interface NormalizedCalendar {
  id: string;
  name: string;
  color?: string;
  isPrimary?: boolean;
  source?: string;
}

interface GatherCalendarRowProps {
  status: CalendarExportStatus | null;
  isLoading: boolean;
  onToggle: (enabled: boolean) => void;
  onRequestScope: () => void;
}

function GatherCalendarRow({
  status,
  isLoading,
  onToggle,
  onRequestScope,
}: GatherCalendarRowProps) {
  const calendarName = status?.calendarName ?? 'Gather';
  const needsScope = status?.enabled && !status.hasExportScope;

  let subtitle: string | null = null;
  if (status?.enabled) {
    if (needsScope) {
      subtitle = 'Tap to grant permission';
    }
  }

  return (
    <XStack alignItems="center" paddingVertical="$2" gap="$3">
      <Circle size={12} backgroundColor="$purple" />
      <YStack
        flex={1}
        pressStyle={needsScope ? { opacity: 0.7 } : undefined}
        onPress={needsScope ? onRequestScope : undefined}
      >
        <XStack alignItems="center" gap="$2">
          <Text fontWeight="500" fontSize={15}>
            {calendarName}
          </Text>
          <BadgeLabel variant={status?.enabled ? 'success' : 'muted'}>
            MANAGED
          </BadgeLabel>
        </XStack>
        {subtitle && (
          <Text
            fontSize={12}
            color={needsScope ? '$error' : '$colorMuted'}
            marginTop={1}
          >
            {subtitle}
          </Text>
        )}
      </YStack>
      <Toggle
        checked={status?.enabled ?? false}
        onCheckedChange={onToggle}
        disabled={isLoading}
      />
    </XStack>
  );
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
  const queryClient = useQueryClient();
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
  } = useGoogleCalendars(provider === 'google');
  const {
    data: outlookCalendars,
    isLoading: isLoadingOutlook,
    error: outlookError,
  } = useOutlookCalendars(provider === 'outlook');

  // Import mutations
  const syncCalendars = useSyncCalendars();
  const selectGoogleCalendars = useSelectGoogleCalendars();
  const selectOutlookCalendars = useSelectOutlookCalendars();
  const disconnectCalendar = useDisconnectCalendar();

  // Export hooks
  const { data: exportStatuses } = useExportStatus();
  const enableExport = useEnableExport();
  const disableExport = useDisableExport();
  const googleExportAuthUrl = useGoogleExportAuthUrl();
  const outlookExportAuthUrl = useOutlookExportAuthUrl();
  const appleExport = useAppleExport();
  // null = no pending change; true/false = user has toggled but not yet saved
  const [pendingExportEnabled, setPendingExportEnabled] = useState<
    boolean | null
  >(null);

  const saveShakeAnim = useRef(new Animated.Value(0)).current;
  const triggerSaveShake = useCallback(() => {
    saveShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(saveShakeAnim, {
        toValue: 6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(saveShakeAnim, {
        toValue: -6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(saveShakeAnim, {
        toValue: 5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(saveShakeAnim, {
        toValue: -5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(saveShakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [saveShakeAnim]);

  // Resolve export status for this provider, overlaying any pending toggle change
  const exportStatus = useMemo((): CalendarExportStatus | null => {
    if (provider === 'apple') {
      const hasAppleConnection = (connections ?? []).some(
        (c) => c.provider === 'apple',
      );
      return {
        provider: 'apple',
        enabled: pendingExportEnabled ?? appleExport.enabled,
        hasExportScope: true,
        isConnected: hasAppleConnection,
      };
    }
    const serverStatus =
      (exportStatuses ?? []).find((s) => s.provider === provider) ?? null;
    if (serverStatus && pendingExportEnabled !== null) {
      // Only clear eventCount when the pending state differs from the server — if the
      // user toggled back to match the server state, restore the real count
      const enabledChanged = pendingExportEnabled !== serverStatus.enabled;
      return {
        ...serverStatus,
        enabled: pendingExportEnabled,
        eventCount: enabledChanged ? undefined : serverStatus.eventCount,
      };
    }
    return serverStatus;
  }, [
    provider,
    exportStatuses,
    appleExport.enabled,
    pendingExportEnabled,
    connections,
  ]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(provider === 'apple');
  const [initialized, setInitialized] = useState(false);

  // Build a set of already-connected calendar IDs
  const connectedIds = useMemo(() => {
    if (!connections) return new Set<string>();
    return new Set(
      connections
        .filter((c) => {
          if (provider === 'apple') return c.provider === 'apple';
          if (provider === 'google')
            return c.provider === 'google' && c.importEnabled;
          if (provider === 'outlook')
            return c.provider === 'outlook' && c.importEnabled;
          return false;
        })
        .map((c) => c.externalCalendarId),
    );
  }, [connections, provider]);

  // Apple: Load device calendars
  const loadCalendars = useCallback(async () => {
    if (provider !== 'apple') return;

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
      console.error('Failed to load calendars:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [connectedIds, provider]);

  // Load device calendars on mount (Apple only)
  useEffect(() => {
    if (provider === 'apple') {
      loadCalendars();
    }
  }, [loadCalendars, provider]);

  // Apple: Pre-select already-connected calendars once we have both data sources
  useEffect(() => {
    if (
      provider === 'apple' &&
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
    if (provider === 'apple') return;

    const calendars =
      provider === 'google' ? googleCalendars : outlookCalendars;

    if (calendars && !initialized) {
      if (connectedIds.size > 0) {
        // Re-visiting: pre-select already connected calendars
        setSelectedIds(new Set(connectedIds));
      }
      setInitialized(true);
    }
  }, [googleCalendars, outlookCalendars, connectedIds, initialized, provider]);

  // Normalize calendars from different sources
  const normalizedCalendars = useMemo((): NormalizedCalendar[] => {
    if (provider === 'apple') {
      return deviceCalendars.map((cal) => ({
        id: cal.id,
        name: cal.title,
        color: cal.color,
        source: cal.source,
      }));
    }
    if (provider === 'google' && googleCalendars) {
      return googleCalendars.map((cal) => ({
        id: cal.externalCalendarId,
        name: cal.calendarName,
        color: cal.color,
        isPrimary: cal.isPrimary,
      }));
    }
    if (provider === 'outlook' && outlookCalendars) {
      return outlookCalendars.map((cal) => ({
        id: cal.externalCalendarId,
        name: cal.calendarName,
        color: cal.color,
        isPrimary: cal.isPrimary,
      }));
    }
    return [];
  }, [provider, deviceCalendars, googleCalendars, outlookCalendars]);

  // Filter out the Gather export calendar so it doesn't appear as an import option
  const filteredCalendars = useMemo((): NormalizedCalendar[] => {
    if (provider === 'apple') {
      return normalizedCalendars.filter((cal) => cal.name !== 'Gather');
    }
    const exportCalendarId = exportStatus?.externalCalendarId;
    if (!exportCalendarId) return normalizedCalendars;
    return normalizedCalendars.filter((cal) => cal.id !== exportCalendarId);
  }, [normalizedCalendars, exportStatus, provider]);

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
    const serverExportEnabled =
      provider === 'apple'
        ? appleExport.enabled
        : ((exportStatuses ?? []).find((s) => s.provider === provider)
            ?.enabled ?? false);
    if (
      pendingExportEnabled !== null &&
      pendingExportEnabled !== serverExportEnabled
    ) {
      return true;
    }
    if (selectedIds.size !== connectedIds.size) return true;
    for (const id of selectedIds) {
      if (!connectedIds.has(id)) return true;
    }
    return false;
  }, [
    selectedIds,
    connectedIds,
    provider,
    pendingExportEnabled,
    appleExport.enabled,
    exportStatuses,
  ]);

  const handleDisconnect = () => {
    haptic.warning();
    Alert.alert(
      `Disconnect ${config.displayName}`,
      `Are you sure you want to disconnect ${config.displayName}? All calendar connections for this provider will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectCalendar.mutateAsync(provider);
              router.back();
            } catch {
              haptic.error();
              Alert.alert(
                'Error',
                `Failed to disconnect ${config.displayName}. Please try again.`,
              );
            }
          },
        },
      ],
    );
  };

  const applyPendingExport = async () => {
    if (pendingExportEnabled === null) return;
    const serverExportEnabled =
      (exportStatuses ?? []).find((s) => s.provider === provider)?.enabled ??
      false;
    if (pendingExportEnabled === serverExportEnabled) return;

    if (pendingExportEnabled) {
      if (!exportStatus?.hasExportScope) {
        const urlQuery =
          provider === 'google' ? googleExportAuthUrl : outlookExportAuthUrl;
        const { data: authUrl } = await urlQuery.refetch();
        if (!authUrl) throw new Error('No auth URL returned');
        const callbackUrl = Linking.createURL(
          provider === 'google'
            ? 'calendars/google/callback'
            : 'calendars/outlook/callback',
        );
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          callbackUrl,
        );
        if (result.type !== 'success') {
          setPendingExportEnabled(null);
          return;
        }
      }
      await enableExport.mutateAsync(provider);
    } else {
      await disableExport.mutateAsync({ provider, deleteCalendar: false });
    }
    haptic.success();
  };

  const handleSave = async () => {
    // Block save if the user has enabled export but hasn't granted permission yet
    if (
      provider !== 'apple' &&
      pendingExportEnabled === true &&
      !exportStatus?.hasExportScope
    ) {
      haptic.error();
      triggerSaveShake();
      return;
    }

    haptic.medium();
    try {
      const calendarIds = Array.from(selectedIds);

      if (provider === 'apple') {
        await syncCalendars.mutateAsync(calendarIds);
        if (
          pendingExportEnabled !== null &&
          pendingExportEnabled !== appleExport.enabled
        ) {
          if (pendingExportEnabled) {
            await appleExport.enable();
          } else {
            await appleExport.disable();
          }
        }
      } else if (provider === 'google') {
        await selectGoogleCalendars.mutateAsync(calendarIds);
        await applyPendingExport();
      } else if (provider === 'outlook') {
        await selectOutlookCalendars.mutateAsync(calendarIds);
        await applyPendingExport();
      }

      router.back();
    } catch (error) {
      console.error(`Failed to save ${provider} calendar selection:`, error);
      Alert.alert(
        'Save Failed',
        'Failed to save your calendar selection. Please try again.',
      );
    }
  };

  const handleExportToggle = (enabled: boolean) => {
    haptic.selection();
    setPendingExportEnabled(enabled);
  };

  const handleRequestExportScope = async () => {
    if (provider !== 'google' && provider !== 'outlook') return;
    try {
      const urlQuery =
        provider === 'google' ? googleExportAuthUrl : outlookExportAuthUrl;
      const { data: authUrl } = await urlQuery.refetch();
      if (!authUrl) throw new Error('No URL returned');

      const callbackUrl = Linking.createURL(
        provider === 'google'
          ? 'calendars/google/callback'
          : 'calendars/outlook/callback',
      );
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        callbackUrl,
      );
      if (result.type !== 'success') return;
      // Invalidate so the UI reflects the hasExportScope the backend set
      // during the OAuth token exchange
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarConnectionKeys.connections(),
        }),
        queryClient.invalidateQueries({ queryKey: exportKeys.status() }),
      ]);
    } catch (err) {
      console.error('Failed to get export auth URL:', err);
      Alert.alert(
        'Error',
        'Failed to get authorization URL. Please try again.',
      );
    }
  };

  // Get loading and error states
  const isDataLoading =
    (provider === 'apple' && isLoading) ||
    (provider === 'google' && (isLoadingGoogle || !googleCalendars)) ||
    (provider === 'outlook' && (isLoadingOutlook || !outlookCalendars));

  const hasError =
    (provider === 'google' && googleError) ||
    (provider === 'outlook' && outlookError);

  const isRevoked =
    (provider === 'google' && googleError instanceof OAuthRevokedError) ||
    (provider === 'outlook' && outlookError instanceof OAuthRevokedError);

  const isSaving =
    (provider === 'apple' &&
      (syncCalendars.isPending || appleExport.isLoading)) ||
    (provider === 'google' &&
      (selectGoogleCalendars.isPending ||
        enableExport.isPending ||
        disableExport.isPending)) ||
    (provider === 'outlook' &&
      (selectOutlookCalendars.isPending ||
        enableExport.isPending ||
        disableExport.isPending));

  // Apple: Permission not granted state
  if (provider === 'apple' && hasPermission === false) {
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
              {isRevoked ? 'Access Revoked' : 'Unable to Load Calendars'}
            </Text>
            <Text color="$colorMuted" textAlign="center" paddingHorizontal="$4">
              {isRevoked
                ? `Your ${config.displayName} access was revoked. Please reconnect to continue syncing your calendar.`
                : `Please check your ${config.displayName} connection and try again.`}
            </Text>
            <Button
              variant="primary"
              onPress={() =>
                isRevoked ? router.replace('/calendars/add') : router.back()
              }
            >
              {isRevoked ? `Reconnect ${config.displayName}` : 'Go Back'}
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

          {/* Import section skeleton */}
          <XStack
            backgroundColor="$backgroundHover"
            borderRadius="$2"
            padding="$3"
            gap="$2"
            alignItems="flex-start"
            marginBottom="$2"
          >
            <Info size={16} color="$colorMuted" marginTop={2} />
            <Text color="$colorMuted" fontSize={13} flex={1}>
              {config.importBanner}
            </Text>
          </XStack>
          <Theme name="Card">
            <Card marginBottom="$4">
              <Text
                color="$colorMuted"
                fontSize={13}
                fontWeight="600"
                marginBottom="$3"
              >
                IMPORT
              </Text>
              <YStack gap="$1">
                <CalendarItemSkeleton />
                <Separator marginVertical="$2" />
                <CalendarItemSkeleton />
                <Separator marginVertical="$2" />
                <CalendarItemSkeleton />
              </YStack>
            </Card>
          </Theme>

          {/* Export section skeleton */}
          <XStack
            backgroundColor="$backgroundHover"
            borderRadius="$2"
            padding="$3"
            gap="$2"
            alignItems="flex-start"
            marginBottom="$2"
          >
            <Info size={16} color="$colorMuted" marginTop={2} />
            <Text color="$colorMuted" fontSize={13} flex={1}>
              {config.exportBanner}
            </Text>
          </XStack>
          <Theme name="Card">
            <Card>
              <Text
                color="$colorMuted"
                fontSize={13}
                fontWeight="600"
                marginBottom="$3"
              >
                EXPORT
              </Text>
              <CalendarItemSkeleton />
            </Card>
          </Theme>
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
            <Animated.View
              style={{ transform: [{ translateX: saveShakeAnim }] }}
            >
              <Button
                variant="primary"
                buttonSize="sm"
                haptic={false}
                onPress={handleSave}
                disabled={!hasChanges}
                loading={isSaving}
                loadingText="Saving..."
              >
                Save
              </Button>
            </Animated.View>
          }
        />

        {/* Import section */}
        <XStack
          backgroundColor="$backgroundHover"
          borderRadius="$2"
          padding="$3"
          gap="$2"
          alignItems="flex-start"
          marginBottom="$2"
        >
          <Info size={16} color="$colorMuted" marginTop={2} />
          <Text color="$colorMuted" fontSize={13} flex={1}>
            {config.importBanner}
          </Text>
        </XStack>
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text
              color="$colorMuted"
              fontSize={13}
              fontWeight="600"
              marginBottom="$3"
            >
              IMPORT
            </Text>

            {filteredCalendars.length === 0 ? (
              <YStack alignItems="center" paddingVertical="$4" gap="$2">
                <CalendarProviderIcon provider={provider} size={28} />
                <Text color="$colorMuted" textAlign="center" fontSize={13}>
                  {config.emptyMessage}
                </Text>
              </YStack>
            ) : provider === 'apple' ? (
              <YStack gap="$1">
                {filteredCalendars.map((cal, index) => (
                  <YStack key={cal.id}>
                    {index > 0 && <Separator marginVertical="$2" />}
                    <XStack alignItems="center" paddingVertical="$2" gap="$3">
                      <Circle
                        size={12}
                        backgroundColor={cal.color ?? '$colorMuted'}
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
            ) : (
              <YStack gap="$1">
                {filteredCalendars.map((cal, index) => (
                  <YStack key={cal.id}>
                    {index > 0 && <Separator marginVertical="$2" />}
                    <XStack alignItems="center" paddingVertical="$2" gap="$3">
                      <Circle
                        size={12}
                        backgroundColor={cal.color ?? '$colorMuted'}
                      />
                      <XStack flex={1} alignItems="center" gap="$2">
                        <Text
                          fontWeight="500"
                          fontSize={15}
                          flexShrink={1}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {cal.name}
                        </Text>
                        {cal.isPrimary && (
                          <BadgeLabel variant="host">PRIMARY</BadgeLabel>
                        )}
                      </XStack>
                      <Toggle
                        checked={selectedIds.has(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                      />
                    </XStack>
                  </YStack>
                ))}
              </YStack>
            )}
          </Card>
        </Theme>

        {/* Import summary */}
        {selectedIds.size > 0 && (
          <XStack
            alignItems="center"
            justifyContent="center"
            gap="$2"
            marginBottom="$4"
          >
            <CalendarCheck size={16} color="$colorMuted" />
            <Text color="$colorMuted" fontSize={13}>
              {selectedIds.size} calendar{selectedIds.size !== 1 ? 's' : ''}{' '}
              imported
            </Text>
          </XStack>
        )}

        {/* Export section */}
        <XStack
          backgroundColor="$backgroundHover"
          borderRadius="$2"
          padding="$3"
          gap="$2"
          alignItems="flex-start"
          marginBottom="$2"
        >
          <Info size={16} color="$colorMuted" marginTop={2} />
          <Text color="$colorMuted" fontSize={13} flex={1}>
            {config.exportBanner}
          </Text>
        </XStack>
        <Theme name="Card">
          <Card marginBottom="$2">
            <Text
              color="$colorMuted"
              fontSize={13}
              fontWeight="600"
              marginBottom="$3"
            >
              EXPORT
            </Text>
            <GatherCalendarRow
              status={exportStatus}
              isLoading={provider === 'apple' ? appleExport.isLoading : false}
              onToggle={handleExportToggle}
              onRequestScope={handleRequestExportScope}
            />
          </Card>
        </Theme>

        {/* Export summary */}
        {exportStatus?.enabled && (
          <XStack
            alignItems="center"
            justifyContent="center"
            gap="$2"
            marginTop="$2"
            marginBottom="$4"
          >
            <CheckCircle2 size={16} color="$colorMuted" />
            <Text color="$colorMuted" fontSize={13}>
              Export enabled
            </Text>
          </XStack>
        )}

        {/* Disconnect provider */}
        <Button
          variant="ghost"
          fullWidth
          marginTop={'$5'}
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
