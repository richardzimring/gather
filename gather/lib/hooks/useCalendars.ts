import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OAuthRevokedError } from '../errors';
import {
  ApiError,
  getCalendars,
  deleteCalendarsApple,
  deleteCalendarsGoogle,
  deleteCalendarsOutlook,
  getCalendarsGoogleCalendars,
  postCalendarsGoogleSelect,
  getCalendarsGoogleExportAuthUrl,
  getCalendarsOutlookCalendars,
  postCalendarsOutlookSelect,
  getCalendarsOutlookExportAuthUrl,
  getCalendarsExportStatus,
  postCalendarsExportEnable,
  postCalendarsExportDisable,
} from '../api/client';
import {
  syncSelectedCalendars,
  syncAllConnectedCalendars,
} from '../services/calendarSync';

// Query keys
export const calendarKeys = {
  all: ['calendars'] as const,
  connections: () => [...calendarKeys.all, 'connections'] as const,
};

/** Calendar providers connected via server-side OAuth. */
export type OAuthCalendarProvider = 'google' | 'outlook';

// Google and Outlook expose identical flows through provider-specific
// endpoints; this table lets one hook serve both.
const providerApi = {
  google: {
    fetchCalendars: getCalendarsGoogleCalendars,
    selectCalendars: postCalendarsGoogleSelect,
    exportAuthUrl: getCalendarsGoogleExportAuthUrl,
  },
  outlook: {
    fetchCalendars: getCalendarsOutlookCalendars,
    selectCalendars: postCalendarsOutlookSelect,
    exportAuthUrl: getCalendarsOutlookExportAuthUrl,
  },
} as const;

/**
 * Hook to fetch all calendar connections for the current user
 */
export function useCalendarConnections() {
  return useQuery({
    queryKey: calendarKeys.connections(),
    queryFn: async () => {
      const { data } = await getCalendars();
      return data.data?.connections ?? [];
    },
  });
}

/**
 * Hook to bulk-sync device calendars to the backend.
 * Accepts an array of device calendar IDs to sync.
 */
export function useSyncCalendars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSelectedCalendars,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/**
 * Hook to manually trigger a re-sync of already-connected calendars.
 * Re-reads events from the device for connected Apple calendars and triggers
 * a server-side sync for Google/Outlook.
 */
export function useTriggerCalendarSync() {
  const queryClient = useQueryClient();
  const { data: connections } = useCalendarConnections();

  return useMutation({
    mutationFn: () => syncAllConnectedCalendars(connections ?? []),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/**
 * Hook to disconnect all calendar connections for a given provider.
 */
export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: 'apple' | 'google' | 'outlook') => {
      const deleteFn =
        provider === 'apple'
          ? deleteCalendarsApple
          : provider === 'google'
            ? deleteCalendarsGoogle
            : deleteCalendarsOutlook;
      await deleteFn();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

// ============================================
// Provider (Google/Outlook) Calendar Hooks
// ============================================

/**
 * Hook to fetch the user's calendars for an OAuth provider (live from the
 * provider's API). Only enabled after the user has connected the provider.
 * Throws OAuthRevokedError when access has been revoked upstream.
 */
export function useProviderCalendars(
  provider: OAuthCalendarProvider,
  enabled = true,
) {
  return useQuery({
    queryKey: [...calendarKeys.all, provider, 'calendars'] as const,
    queryFn: async () => {
      try {
        const { data } = await providerApi[provider].fetchCalendars();
        return data.data?.calendars ?? [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          throw new OAuthRevokedError();
        }
        throw error;
      }
    },
    enabled,
  });
}

/**
 * Hook to select which of an OAuth provider's calendars to import.
 */
export function useSelectProviderCalendars(provider: OAuthCalendarProvider) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarIds: string[]) => {
      const { data } = await providerApi[provider].selectCalendars({
        body: { calendarIds },
      });
      return data.data?.connections ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/**
 * Hook to get an OAuth provider's consent URL with export (write) scope.
 * Use when the user wants to enable calendar export. Fetched on demand only.
 */
export function useProviderExportAuthUrl(provider: OAuthCalendarProvider) {
  return useQuery({
    queryKey: [...calendarKeys.all, provider, 'export-auth-url'] as const,
    queryFn: async () => {
      const { data } = await providerApi[provider].exportAuthUrl();
      return data.data?.authUrl ?? '';
    },
    enabled: false,
  });
}

// ============================================
// Calendar Export Hooks
// ============================================

export const exportKeys = {
  all: [...calendarKeys.all, 'export'] as const,
  status: () => [...exportKeys.all, 'status'] as const,
};

/**
 * Hook to fetch export sync status per provider.
 */
export function useExportStatus() {
  return useQuery({
    queryKey: exportKeys.status(),
    queryFn: async () => {
      const { data } = await getCalendarsExportStatus();
      return data.data?.statuses ?? [];
    },
  });
}

/**
 * Hook to enable calendar export for a provider.
 * Creates the "Gather" secondary calendar and performs an initial sync.
 * The provider's tokens must already include write scope.
 */
export function useEnableExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: 'google' | 'outlook' | 'apple') => {
      const { data } = await postCalendarsExportEnable({ body: { provider } });
      return data.data?.status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportKeys.all });
    },
  });
}

/**
 * Hook to disable calendar export for a provider.
 */
export function useDisableExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      deleteCalendar = false,
    }: {
      provider: 'google' | 'outlook' | 'apple';
      deleteCalendar?: boolean;
    }) => {
      await postCalendarsExportDisable({ body: { provider, deleteCalendar } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportKeys.all });
    },
  });
}
