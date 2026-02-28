import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { type CalendarProviderItem } from '../../components/ui/CalendarProviderCard';
import {
  useCalendarConnections,
  useExportStatus,
  calendarKeys as calendarConnectionKeys,
  exportKeys,
} from './useCalendars';
import { useAppleExport } from './useAppleExport';
import {
  connectGoogleCalendar,
  GoogleAuthCancelledError,
} from '../services/googleAuth';
import {
  connectOutlookCalendar,
  OutlookAuthCancelledError,
} from '../services/outlookAuth';
import { haptic } from '../haptics';

export function useCalendarProviders() {
  const queryClient = useQueryClient();
  const { data: connections, isLoading } = useCalendarConnections();
  const { data: exportStatuses } = useExportStatus();
  const appleExport = useAppleExport();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);

  const hasAppleConnection = connections?.some((c) => c.provider === 'apple');
  const hasGoogleOAuthConnection = connections?.some(
    (c) => c.provider === 'google',
  );
  const hasGoogleConnection = connections?.some(
    (c) => c.provider === 'google' && c.importEnabled,
  );
  const hasOutlookOAuthConnection = connections?.some(
    (c) => c.provider === 'outlook',
  );
  const hasOutlookConnection = connections?.some(
    (c) => c.provider === 'outlook' && c.importEnabled,
  );

  const isAppleExportEnabled = appleExport.enabled;
  const isGoogleExportEnabled = exportStatuses?.some(
    (s) => s.provider === 'google' && s.enabled,
  );
  const isOutlookExportEnabled = exportStatuses?.some(
    (s) => s.provider === 'outlook' && s.enabled,
  );

  const handleApple = useCallback(() => {
    haptic.light();
    router.push({
      pathname: '/calendars/[provider]',
      params: { provider: 'apple' },
    });
  }, []);

  const handleGoogle = useCallback(async () => {
    if (hasGoogleOAuthConnection) {
      router.push({
        pathname: '/calendars/[provider]',
        params: { provider: 'google' },
      });
      return;
    }
    setIsConnectingGoogle(true);
    try {
      await connectGoogleCalendar({ includeExportScope: true });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarConnectionKeys.connections(),
        }),
        queryClient.invalidateQueries({
          queryKey: exportKeys.status(),
        }),
      ]);
      haptic.success();
      router.push({
        pathname: '/calendars/[provider]',
        params: { provider: 'google' },
      });
    } catch (error) {
      if (error instanceof GoogleAuthCancelledError) return;
      haptic.error();
      Alert.alert(
        'Connection Failed',
        'Failed to connect Google Calendar. Please try again.',
      );
    } finally {
      setIsConnectingGoogle(false);
    }
  }, [hasGoogleOAuthConnection, queryClient]);

  const handleOutlook = useCallback(async () => {
    if (hasOutlookOAuthConnection) {
      router.push({
        pathname: '/calendars/[provider]',
        params: { provider: 'outlook' },
      });
      return;
    }
    setIsConnectingOutlook(true);
    try {
      await connectOutlookCalendar({ includeExportScope: true });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarConnectionKeys.connections(),
        }),
        queryClient.invalidateQueries({
          queryKey: exportKeys.status(),
        }),
      ]);
      haptic.success();
      router.push({
        pathname: '/calendars/[provider]',
        params: { provider: 'outlook' },
      });
    } catch (error) {
      if (error instanceof OutlookAuthCancelledError) return;
      haptic.error();
      Alert.alert(
        'Connection Failed',
        'Failed to connect Outlook Calendar. Please try again.',
      );
    } finally {
      setIsConnectingOutlook(false);
    }
  }, [hasOutlookOAuthConnection, queryClient]);

  const providers: CalendarProviderItem[] = [
    {
      id: 'apple',
      name: 'Apple Calendar',
      isConnected: !!hasAppleConnection,
      isExportEnabled: !!isAppleExportEnabled,
      isConnecting: false,
      onPress: handleApple,
    },
    {
      id: 'google',
      name: 'Google Calendar',
      isConnected: !!hasGoogleConnection,
      isExportEnabled: !!isGoogleExportEnabled,
      isConnecting: isConnectingGoogle,
      onPress: handleGoogle,
    },
    {
      id: 'outlook',
      name: 'Outlook',
      isConnected: !!hasOutlookConnection,
      isExportEnabled: !!isOutlookExportEnabled,
      isConnecting: isConnectingOutlook,
      onPress: handleOutlook,
    },
  ];

  return {
    isLoading,
    providers,
    hasAnyConnection: !!(
      hasAppleConnection ||
      hasGoogleConnection ||
      hasOutlookConnection
    ),
  };
}
