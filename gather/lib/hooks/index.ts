// Auth
export { useAuth, useAuthReady, AuthProvider } from './useAuth'

// Data hooks
export * from './useFriends'
export * from './useGroups'
export * from './useActivities'
export * from './useBlocked'
export * from './useBusyTimes'
export * from './useEvents'

// Calendar connections (server-side)
export {
  calendarKeys as calendarConnectionKeys,
  useCalendarConnections,
  useCalendarConnection,
  useBusySlots as useServerBusySlots,
  useCreateCalendarConnection,
  useUpdateCalendarConnection,
  useDeleteCalendarConnection,
  useSyncCalendars,
  useTriggerCalendarSync,
  // Google Calendar hooks
  useGoogleAuthUrl,
  useGoogleCalendars,
  useSelectGoogleCalendars,
  useTriggerGoogleSync,
} from './useCalendars'

// Notifications
export {
  useNotifications,
  registerPushTokenAsync,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  notificationPreferencesKeys,
} from './useNotifications'

// Calendar auto-sync
export { useCalendarAutoSync } from './useCalendarSync'

// Utilities
export * from './useRefresh'

// Device calendar services
export {
  calendarKeys,
  useCalendarPermissions,
  useCalendars,
  useCalendarEvents,
  useBusySlots,
  useExportToCalendar,
} from './useCalendar'
