// Auth
export { useAuth, useAuthReady, AuthProvider } from './useAuth';

// Data hooks
export * from './useFriends';
export * from './useGroups';
export * from './useBlocked';
export * from './useBusyTimes';
export * from './useEvents';

// Calendar connections (server-side)
export {
  calendarKeys as calendarConnectionKeys,
  useCalendarConnections,
  useCalendarConnection,
  useCreateCalendarConnection,
  useUpdateCalendarConnection,
  useDeleteCalendarConnection,
  useSyncCalendars,
  useTriggerCalendarSync,
  // Provider Calendar hooks
  useDisconnectCalendar,
  // Google Calendar hooks
  useGoogleAuthUrl,
  useGoogleCalendars,
  useSelectGoogleCalendars,
  useTriggerGoogleSync,
  // Outlook Calendar hooks
  useOutlookAuthUrl,
  useOutlookCalendars,
  useSelectOutlookCalendars,
  useTriggerOutlookSync,
  // Calendar Export hooks
  exportKeys,
  useExportStatus,
  useEnableExport,
  useDisableExport,
  useTriggerExportSync,
  useGoogleExportAuthUrl,
  useOutlookExportAuthUrl,
} from './useCalendars';

// Notifications
export {
  useNotifications,
  registerPushTokenAsync,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  notificationPreferencesKeys,
} from './useNotifications';

// Calendar auto-sync
export { useCalendarAutoSync } from './useCalendarSync';
export { useAppleExportSync } from './useAppleExportSync';

// Calendar provider connection flows
export { useCalendarProviders } from './useCalendarProviders';

// Invites (invite people not yet on Gather)
export { useCreateInvite, useRedeemInvite } from './useInvites';

// User profile updates and public profiles
export { useUpdateUser } from './useUser';
export { usersKeys, useUserProfile } from './useUsers';

// Pending invites (deep links opened while signed out)
export { usePendingInvite } from './usePendingInvite';

// Utilities
export * from './useRefresh';
export { useScrollGradient } from './useScrollGradient';

// Device calendar services
export {
  calendarKeys,
  useCalendarPermissions,
  useCalendars,
  useCalendarEvents,
  useExportToCalendar,
} from './useCalendar';
