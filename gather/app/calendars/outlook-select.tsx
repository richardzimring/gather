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
import { CalendarCheck, Info } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { CalendarProviderIcon } from '../../components/ui/CalendarProviderIcon'
import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import {
  useCalendarConnections,
  useOutlookCalendars,
  useSelectOutlookCalendars,
} from '../../lib/hooks'
import { haptic } from '../../lib/haptics'

export default function OutlookCalendarSelectScreen() {
  const insets = useSafeAreaInsets()
  const { data: connections } = useCalendarConnections()
  const { data: outlookCalendars, isLoading, error } = useOutlookCalendars()
  const selectCalendars = useSelectOutlookCalendars()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  // Build a set of currently import-enabled Outlook calendar IDs
  const connectedIds = useMemo(() => {
    if (!connections) return new Set<string>()
    return new Set(
      connections
        .filter((c) => c.provider === 'outlook' && c.importEnabled)
        .map((c) => c.externalCalendarId),
    )
  }, [connections])

  // Pre-select currently connected calendars once data is loaded
  useEffect(() => {
    if (outlookCalendars && !initialized) {
      if (connectedIds.size > 0) {
        // Re-visiting: pre-select already connected calendars
        setSelectedIds(new Set(connectedIds))
      } else {
        // First time: pre-select only the primary calendar
        const primaryCalendar = outlookCalendars.find((c) => c.isPrimary)
        if (primaryCalendar) {
          setSelectedIds(new Set([primaryCalendar.externalCalendarId]))
        }
      }
      setInitialized(true)
    }
  }, [outlookCalendars, connectedIds, initialized])

  const toggleCalendar = useCallback((calendarId: string) => {
    haptic.selection();
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
    if (selectedIds.size !== connectedIds.size) return true
    for (const id of selectedIds) {
      if (!connectedIds.has(id)) return true
    }
    return false
  }, [selectedIds, connectedIds])

  const handleSave = async () => {
    try {
      await selectCalendars.mutateAsync(Array.from(selectedIds))
      router.back()
    } catch (err) {
      console.error('Failed to save Outlook calendar selection:', err)
      Alert.alert(
        'Save Failed',
        'Failed to save your calendar selection. Please try again.',
      )
    }
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
          }}
        >
          <BackHeader title="Outlook Calendars" />
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical="$6"
            gap="$4"
          >
            <CalendarProviderIcon provider="outlook" size={48} />
            <Text fontSize={18} fontWeight="600" textAlign="center">
              Unable to Load Calendars
            </Text>
            <Text
              color="$colorMuted"
              textAlign="center"
              paddingHorizontal="$4"
            >
              Please check your Outlook Calendar connection and try again.
            </Text>
            <Button variant="primary" onPress={() => router.back()}>
              Go Back
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    )
  }

  // Loading state
  if (isLoading || !outlookCalendars) {
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
            Loading Outlook calendars...
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
          title="Outlook Calendars"
          rightAction={
            <Button
              variant="primary"
              buttonSize="sm"
              onPress={handleSave}
              disabled={!hasChanges}
              loading={selectCalendars.isPending}
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
            Select which Outlook calendars to import. Gather will read your busy
            times to help find availability.
          </Text>
        </XStack>

        {/* Calendar list */}
        {outlookCalendars.length === 0 ? (
          <YStack alignItems="center" padding="$6" gap="$2">
            <CalendarProviderIcon provider="outlook" size={32} />
            <Text color="$colorMuted" textAlign="center">
              No calendars found in your Outlook account
            </Text>
          </YStack>
        ) : (
          <Theme name="Card">
            <Card>
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <CalendarProviderIcon provider="outlook" size={14} />
                <Text
                  color="$colorMuted"
                  fontSize={13}
                  fontWeight="600"
                >
                  OUTLOOK CALENDAR
                </Text>
              </XStack>
              <YStack gap="$1">
                {outlookCalendars.map((cal, index) => (
                  <YStack key={cal.externalCalendarId}>
                    {index > 0 && <Separator marginVertical="$2" />}
                    <XStack
                      alignItems="center"
                      paddingVertical="$2"
                      gap="$3"
                    >
                      {/* Color swatch */}
                      <Circle
                        size={12}
                        backgroundColor={
                          cal.color ?? '$colorMuted'
                        }
                      />

                      {/* Calendar name */}
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$1.5">
                          <Text fontWeight="500" fontSize={15}>
                            {cal.calendarName}
                          </Text>
                          {cal.isPrimary && (
                            <Text
                              fontSize={11}
                              color="$colorMuted"
                            >
                              Primary
                            </Text>
                          )}
                        </XStack>
                      </YStack>

                      {/* Toggle */}
                      <Switch
                        size="$3"
                        checked={selectedIds.has(
                          cal.externalCalendarId,
                        )}
                        onCheckedChange={() =>
                          toggleCalendar(cal.externalCalendarId)
                        }
                        backgroundColor={
                          selectedIds.has(cal.externalCalendarId)
                            ? '$primary'
                            : '$backgroundHover'
                        }
                      >
                        <Switch.Thumb
                          animation="quick"
                          backgroundColor={
                            selectedIds.has(
                              cal.externalCalendarId,
                            )
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
              {selectedIds.size} calendar
              {selectedIds.size !== 1 ? 's' : ''} selected
            </Text>
          </XStack>
        )}
      </ScrollView>
    </YStack>
  )
}
