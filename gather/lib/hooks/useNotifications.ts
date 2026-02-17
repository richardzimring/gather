import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import type { EventSubscription } from 'expo-modules-core'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  postUsersMePushToken,
  getUsersMeNotificationPreferences,
  putUsersMeNotificationPreferences,
} from '../api/client'
import type { UpdateNotificationPreferences } from '../api/client'
import { useAuth } from './useAuth'

// ============================================
// Configure foreground notification behavior
// ============================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ============================================
// Push Token Registration
// ============================================

async function getExpoPushToken(): Promise<string | null> {
  // Only iOS is supported
  if (Platform.OS !== 'ios') return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  if (existingStatus !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  })

  return tokenData.data
}

// ============================================
// Hook: useNotifications
// ============================================

/**
 * Manages push notification registration, handling, and navigation.
 * Should be mounted once in the authenticated app layout.
 */
export function useNotifications() {
  const { isAuthenticated } = useAuth()
  const notificationResponseListener = useRef<EventSubscription | null>(null)

  // Register push token whenever user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return

    const registerToken = async () => {
      try {
        const token = await getExpoPushToken()
        if (token) {
          await postUsersMePushToken({ body: { pushToken: token } })
        }
      } catch (error) {
        console.error('Failed to register push token:', error)
      }
    }

    registerToken()
  }, [isAuthenticated])

  // Set up notification response listener (when user taps a notification)
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data

        if (!data?.type) return

        switch (data.type) {
          case 'event_invitation':
          case 'event_response':
          case 'event_updated':
          case 'event_cancelled':
          case 'counter_proposal':
            if (data.eventId) {
              router.push(`/events/${data.eventId}`)
            }
            break
          case 'friend_request':
          case 'friend_accepted':
            router.push('/(tabs)/friends')
            break
        }
      })

    return () => {
      notificationResponseListener.current?.remove()
    }
  }, [])
}

// ============================================
// Hook: useRegisterPushToken
// ============================================

/**
 * Standalone function to register push token after permission is first granted.
 * Used in onboarding flow.
 */
export async function registerPushTokenAsync(): Promise<void> {
  const token = await getExpoPushToken()
  if (token) {
    await postUsersMePushToken({ body: { pushToken: token } })
  }
}

// ============================================
// Notification Preferences Hooks
// ============================================

export const notificationPreferencesKeys = {
  all: ['notificationPreferences'] as const,
  detail: () => [...notificationPreferencesKeys.all, 'detail'] as const,
}

/**
 * Hook to fetch notification preferences.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferencesKeys.detail(),
    queryFn: async () => {
      const response = await getUsersMeNotificationPreferences()
      if (!response.data?.success) {
        throw new Error('Failed to fetch notification preferences')
      }
      return response.data.data
    },
  })
}

/**
 * Hook to update notification preferences.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: UpdateNotificationPreferences) => {
      const response = await putUsersMeNotificationPreferences({ body: updates })
      if (!response.data?.success) {
        throw new Error('Failed to update notification preferences')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(notificationPreferencesKeys.detail(), data)
    },
  })
}
