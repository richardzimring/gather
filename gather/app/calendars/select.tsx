import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Theme,
  Switch,
  Circle,
  Separator,
} from 'tamagui'
import { Calendar, CalendarCheck, Info } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { CalendarProviderIcon } from '../../components/ui/CalendarProviderIcon'
import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useCalendarConnections, useSyncCalendars } from '../../lib/hooks'
import {
  ensureCalendarPermissions,
  getDeviceCalendars,
  type DeviceCalendar,
} from '../../lib/services/calendarSync'

interface CalendarsBySource {
  source: string
  calendars: DeviceCalendar[]
}

export default function CalendarSelectScreen() {
  const insets = useSafeAreaInsets()
  const { data: connections } = useCalendarConnections()
  const syncCalendars = useSyncCalendars()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [deviceCalendars, setDeviceCalendars] = useState<DeviceCalendar[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // Build a set of already-connected external calendar IDs
  const connectedIds = useMemo(() => {
    if (!connections) return new Set<string>()
    return new Set(
      connections
        .filter((c) => c.provider === 'apple')
        .map((c) => c.externalCalendarId)
    )
  }, [connections])

  const loadCalendars = useCallback(async () => {
    setIsLoading(true)
    try {
      const granted = await ensureCalendarPermissions()
      setHasPermission(granted)

      if (granted) {
        const calendars = await getDeviceCalendars()
        setDeviceCalendars(calendars)

        // Pre-select connected calendars
        if (connectedIds.size > 0) {
          setSelectedIds(new Set(connectedIds))
        }
      }
    } catch (error) {
      console.error('Failed to load calendars:', error)
      setHasPermission(false)
    } finally {
      setIsLoading(false)
    }
  }, [connectedIds])

  // Load device calendars on mount
  useEffect(() => {
    loadCalendars()
  }, [loadCalendars])

  // Pre-select already-connected calendars once we have both data sources
  useEffect(() => {
    if (deviceCalendars.length > 0 && connectedIds.size > 0) {
      setSelectedIds((prev) => {
        // Only set if we haven't already touched selection
        if (prev.size === 0) {
          return new Set(connectedIds)
        }
        return prev
      })
    }
  }, [deviceCalendars, connectedIds])

  // Group calendars by source
  const calendarsBySource = useMemo((): CalendarsBySource[] => {
    const groups = new Map<string, DeviceCalendar[]>()
    for (const cal of deviceCalendars) {
      const source = cal.source || 'Other'
      if (!groups.has(source)) {
        groups.set(source, [])
      }
      groups.get(source)!.push(cal)
    }
    return Array.from(groups.entries()).map(([source, calendars]) => ({
      source,
      calendars,
    }))
  }, [deviceCalendars])

  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(calendarId)) {
        next.delete(calendarId)
      } else {
        next.add(calendarId)
      }
      return next
    })
  }, [])

  const hasChanges = useMemo(() => {
    // Check if selection differs from currently connected
    if (selectedIds.size !== connectedIds.size) return true
    for (const id of selectedIds) {
      if (!connectedIds.has(id)) return true
    }
    return false
  }, [selectedIds, connectedIds])

  const handleSave = async () => {
    try {
      await syncCalendars.mutateAsync(Array.from(selectedIds))
      router.back()
    } catch (error) {
      console.error('Failed to sync calendars:', error)
      Alert.alert(
        'Sync Failed',
        'Failed to sync your calendars. Please try again.'
      )
    }
  }

  // Permission not granted state
  if (hasPermission === false) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
          }}
        >
          <BackHeader title="Calendars" />

          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical="$6"
            gap="$4"
          >
            <Calendar size={48} color="$colorMuted" />
            <Text
              fontSize={18}
              fontWeight="600"
              textAlign="center"
            >
              Calendar Access Required
            </Text>
            <Text
              color="$colorMuted"
              textAlign="center"
              paddingHorizontal="$4"
            >
              Gather needs access to your calendars to check your availability
              and help find times when you and your friends are free.
            </Text>
            <Button
              variant="primary"
              onPress={loadCalendars}
              marginTop="$2"
            >
              Grant Calendar Access
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingTop={insets.top + 16}
        >
          <ActivityIndicator size="large" />
          <Text color="$colorMuted" marginTop="$3">
            Loading calendars...
          </Text>
        </YStack>
      </YStack>
    )
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
          title="Calendars"
          rightAction={
            <Button
              variant="primary"
              buttonSize="sm"
              onPress={handleSave}
              disabled={!hasChanges}
              loading={syncCalendars.isPending}
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
            Select which calendars to import. Gather will read your busy times
            to help find availability — event details stay on your device.
          </Text>
        </XStack>

        {/* Calendar list grouped by source */}
        {deviceCalendars.length === 0 ? (
          <YStack alignItems="center" padding="$6" gap="$2">
            <Calendar size={32} color="$colorMuted" />
            <Text color="$colorMuted" textAlign="center">
              No calendars found on your device
            </Text>
          </YStack>
        ) : (
          <YStack gap="$4">
            {calendarsBySource.map((group) => (
              <Theme name="Card" key={group.source}>
                <Card>
                  <XStack alignItems="center" gap="$2" marginBottom="$3">
                    <CalendarProviderIcon
                      provider="apple"
                      size={14}
                    />
                    <Text
                      color="$colorMuted"
                      fontSize={13}
                      fontWeight="600"
                    >
                      {group.source.toUpperCase()}
                    </Text>
                  </XStack>
                  <YStack gap="$1">
                    {group.calendars.map((cal, index) => (
                      <YStack key={cal.id}>
                        {index > 0 && <Separator marginVertical="$2" />}
                        <XStack
                          alignItems="center"
                          paddingVertical="$2"
                          gap="$3"
                        >
                          {/* Color swatch */}
                          <Circle
                            size={12}
                            backgroundColor={cal.color ?? '$colorMuted'}
                          />

                          {/* Calendar name */}
                          <YStack flex={1}>
                            <Text fontWeight="500" fontSize={15}>
                              {cal.title}
                            </Text>
                          </YStack>

                          {/* Toggle */}
                          <Switch
                            size="$3"
                            checked={selectedIds.has(cal.id)}
                            onCheckedChange={() => toggleCalendar(cal.id)}
                            backgroundColor={
                              selectedIds.has(cal.id)
                                ? '$primary'
                                : '$backgroundHover'
                            }
                          >
                            <Switch.Thumb
                              animation="quick"
                              backgroundColor={
                                selectedIds.has(cal.id)
                                  ? '$primaryForeground'
                                  : '$color'
                              }
                            />
                          </Switch>
                        </XStack>
                      </YStack>
                    ))}
                  </YStack>
                </Card>
              </Theme>
            ))}
          </YStack>
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
              {selectedIds.size} calendar{selectedIds.size !== 1 ? 's' : ''}{' '}
              selected
            </Text>
          </XStack>
        )}
      </ScrollView>
    </YStack>
  )
}
