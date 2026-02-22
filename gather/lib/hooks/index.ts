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

// Utilities
export * from './useRefresh';

// Device calendar services
export {
  calendarKeys,
  useCalendarPermissions,
  useCalendars,
  useCalendarEvents,
  useExportToCalendar,
} from './useCalendar';
