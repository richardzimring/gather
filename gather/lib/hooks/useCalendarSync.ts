import { useEffect, useRef, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { useCalendarConnections, calendarKeys } from './useCalendars'
import { resyncConnectedCalendars } from '../services/calendarSync'
import { postCalendarsGoogleSync, postCalendarsOutlookSync } from '../api/client'

/** Minimum interval between automatic re-syncs (15 minutes) */
const RESYNC_INTERVAL_MS = 15 * 60 * 1000

/**
 * Hook that automatically re-syncs connected calendars when the app
 * comes to the foreground. Debounced to at most once per 15 minutes.
 *
 * - Apple calendars: re-reads events from the device and syncs to backend
 * - Google calendars: triggers a server-side re-sync
 *
 * Place this hook in the tab layout so it runs while the user is authenticated.
 * For manual sync, use `useTriggerCalendarSync` from `useCalendars.ts`.
 */
export function useCalendarAutoSync() {
  const { data: connections } = useCalendarConnections()
  const queryClient = useQueryClient()
  const lastSyncRef = useRef<number>(0)
  const isSyncingRef = useRef(false)

  const performSync = useCallback(async () => {
    if (!connections || connections.length === 0) return
    if (isSyncingRef.current) return

    const now = Date.now()
    if (now - lastSyncRef.current < RESYNC_INTERVAL_MS) return

    isSyncingRef.current = true
    try {
      // Sync Apple calendars from device
      const appleCalendarIds = connections
        .filter((c) => c.provider === 'apple' && c.importEnabled)
        .map((c) => c.externalCalendarId)

      if (appleCalendarIds.length > 0) {
        await resyncConnectedCalendars(appleCalendarIds)
      }

      // Sync Google calendars server-side
      const hasGoogleConnections = connections.some(
        (c) => c.provider === 'google' && c.importEnabled,
      )

      if (hasGoogleConnections) {
        await postCalendarsGoogleSync()
      }

      // Sync Outlook calendars server-side
      const hasOutlookConnections = connections.some(
        (c) => c.provider === 'outlook' && c.importEnabled,
      )

      if (hasOutlookConnections) {
        await postCalendarsOutlookSync()
      }

      lastSyncRef.current = Date.now()
      // Invalidate calendar queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    } catch (error) {
      console.error('Calendar auto-sync failed:', error)
    } finally {
      isSyncingRef.current = false
    }
  }, [connections, queryClient])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        performSync()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    // Also sync on mount (first time the tabs load)
    performSync()

    return () => {
      subscription.remove()
    }
  }, [performSync])
}
