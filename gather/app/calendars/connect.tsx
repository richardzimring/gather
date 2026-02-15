import { useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import {
  ScrollView,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
  Theme,
} from 'tamagui'
import { ChevronRight } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'

import { CalendarProviderIcon } from '../../components/ui/CalendarProviderIcon'
import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useCalendarConnections, calendarConnectionKeys } from '../../lib/hooks'
import {
  connectGoogleCalendar,
  GoogleAuthCancelledError,
} from '../../lib/services/googleAuth'

interface ProviderOption {
  id: 'apple' | 'google' | 'outlook'
  name: string
  available: boolean
  comingSoon?: boolean
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'apple',
    name: 'Apple Calendar',
    available: true,
  },
  {
    id: 'google',
    name: 'Google Calendar',
    available: true,
  },
  {
    id: 'outlook',
    name: 'Outlook',
    available: false,
    comingSoon: true,
  },
]

export default function CalendarConnectScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { data: connections } = useCalendarConnections()
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)

  const hasGoogleConnection = connections?.some((c) => c.provider === 'google')

  const handleProviderPress = async (provider: ProviderOption) => {
    if (!provider.available) return

    switch (provider.id) {
      case 'apple':
        router.push('/calendars/select')
        break

      case 'google':
        if (hasGoogleConnection) {
          router.push('/calendars/google-select')
        } else {
          setIsConnectingGoogle(true)
          try {
            await connectGoogleCalendar()
            // Backend already exchanged the code and stored tokens;
            // invalidate so the google-select screen fetches fresh data
            await queryClient.invalidateQueries({ queryKey: calendarConnectionKeys.connections() })
            router.push('/calendars/google-select')
          } catch (error) {
            if (error instanceof GoogleAuthCancelledError) {
              return
            }
            console.error('Google Calendar connection failed:', error)
            Alert.alert(
              'Connection Failed',
              'Failed to connect Google Calendar. Please try again.',
            )
          } finally {
            setIsConnectingGoogle(false)
          }
        }
        break
    }
  }

  const getConnectionCount = (providerId: string): number => {
    if (!connections) return 0
    return connections.filter(
      (c) => c.provider === providerId && c.importEnabled,
    ).length
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
        <BackHeader title="Connect a Calendar" />

        <Text color="$colorMuted" fontSize={14} marginBottom="$4">
          Choose a calendar provider to import your availability.
        </Text>

        <Theme name="Card">
          <Card>
            {PROVIDERS.map((provider, index) => {
              const count = getConnectionCount(provider.id)
              const isLoading =
                provider.id === 'google' && isConnectingGoogle

              return (
                <YStack key={provider.id}>
                  {index > 0 && <Separator />}
                  <XStack
                    alignItems="center"
                    paddingVertical="$3"
                    opacity={!provider.available || isLoading ? 0.5 : 1}
                    pressStyle={
                      provider.available && !isLoading
                        ? { opacity: 0.7 }
                        : undefined
                    }
                    onPress={() => handleProviderPress(provider)}
                    disabled={!provider.available || isLoading}
                  >
                    <YStack
                      width={36}
                      height={36}
                      borderRadius={8}
                      backgroundColor="$backgroundHover"
                      alignItems="center"
                      justifyContent="center"
                      marginRight="$3"
                    >
                      {isLoading ? (
                        <Spinner size="small" color="$color" />
                      ) : (
                        <CalendarProviderIcon
                          provider={provider.id}
                          size={20}
                        />
                      )}
                    </YStack>
                    <Text flex={1} fontWeight="500" color="$color">
                      {isLoading ? 'Connecting...' : provider.name}
                    </Text>
                    {count > 0 && (
                      <Text
                        fontSize={12}
                        color="$colorMuted"
                        fontWeight="500"
                        marginRight="$2"
                      >
                        {count} connected
                      </Text>
                    )}
                    {provider.comingSoon && (
                      <Text
                        fontSize={12}
                        color="$colorMuted"
                        fontWeight="500"
                        marginRight="$2"
                      >
                        Coming soon
                      </Text>
                    )}
                    {provider.available && !isLoading && (
                      <ChevronRight size={20} color="$colorMuted" />
                    )}
                  </XStack>
                </YStack>
              )
            })}
          </Card>
        </Theme>
      </ScrollView>
    </YStack>
  )
}
