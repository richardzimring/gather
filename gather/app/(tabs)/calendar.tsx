import { ChevronLeft, ChevronRight, Plus } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { H1, H2, Text, XStack, YStack, Theme, ScrollView, Circle } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { useEvents, useAvailability } from '../../lib/hooks'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Check if a date falls on a specific day
 */
function isOnDay(dateString: string, year: number, month: number, day: number): boolean {
  const date = new Date(dateString)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  )
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate())

  const { data: events } = useEvents()
  const { data: availability } = useAvailability()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingDays = Array.from({ length: firstDayOfMonth }, () => null)

  // Get events for the selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate || !events) return []
    return events.filter((event) =>
      isOnDay(event.startTime, year, month, selectedDate) &&
      event.status !== 'cancelled'
    )
  }, [events, selectedDate, year, month])

  // Get availability for the selected date
  const selectedAvailability = useMemo(() => {
    if (!selectedDate || !availability) return []
    return availability.filter((window) =>
      isOnDay(window.startTime, year, month, selectedDate)
    )
  }, [availability, selectedDate, year, month])

  // Get days that have events
  const daysWithEvents = useMemo(() => {
    if (!events) return new Set<number>()
    const eventDays = new Set<number>()
    events.forEach((event) => {
      if (event.status !== 'cancelled') {
        const eventDate = new Date(event.startTime)
        if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
          eventDays.add(eventDate.getDate())
        }
      }
    })
    return eventDays
  }, [events, year, month])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now.getDate())
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()

  const navigateToEvent = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const createEventOnDate = () => {
    router.push('/events/create')
  }

  return (
    <DottedGridBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <H1 fontSize={28} fontWeight="700">
            Calendar
          </H1>
          <Button
            variant="ghost"
            buttonSize="sm"
            onPress={goToToday}
          >
            Today
          </Button>
        </XStack>

        {/* Month Navigation */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <Button
            variant="ghost"
            buttonSize="sm"
            circular
            icon={<ChevronLeft size={20} />}
            onPress={goToPreviousMonth}
          />
          <Text fontSize={18} fontWeight="600">
            {MONTHS[month]} {year}
          </Text>
          <Button
            variant="ghost"
            buttonSize="sm"
            circular
            icon={<ChevronRight size={20} />}
            onPress={goToNextMonth}
          />
        </XStack>

        {/* Calendar Grid */}
        <Theme name="Card">
          <Card marginBottom="$5">
            {/* Day headers */}
            <XStack marginBottom="$2">
              {DAYS.map((day) => (
                <YStack key={day} flex={1} alignItems="center">
                  <Text color="$colorMuted" fontSize={12} fontWeight="500">
                    {day}
                  </Text>
                </YStack>
              ))}
            </XStack>

            {/* Calendar days */}
            <XStack flexWrap="wrap">
              {[...paddingDays, ...days].map((day, index) => (
                <YStack
                  key={index}
                  width="14.28%"
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  pressStyle={day ? { opacity: 0.7 } : undefined}
                  onPress={day ? () => setSelectedDate(day) : undefined}
                  onLongPress={day ? () => {
                    setSelectedDate(day)
                    createEventOnDate()
                  } : undefined}
                >
                  {day && (
                    <YStack alignItems="center">
                      <YStack
                        width={36}
                        height={36}
                        borderRadius={18}
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor={
                          selectedDate === day
                            ? '$accent'
                            : isToday(day)
                              ? '$backgroundHover'
                              : 'transparent'
                        }
                      >
                        <Text
                          color={selectedDate === day ? '$white' : '$color'}
                          fontWeight={isToday(day) || selectedDate === day ? '600' : '400'}
                        >
                          {day}
                        </Text>
                      </YStack>
                      {/* Event indicator dot */}
                      {daysWithEvents.has(day) && (
                        <Circle
                          size={6}
                          backgroundColor={selectedDate === day ? '$white' : '$accent'}
                          marginTop={2}
                        />
                      )}
                    </YStack>
                  )}
                </YStack>
              ))}
            </XStack>
          </Card>
        </Theme>

        {/* Selected Day Events */}
        <YStack>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <H2 fontSize={18} fontWeight="600">
              {selectedDate ? `${MONTHS[month]} ${selectedDate}` : 'Select a date'}
            </H2>
            {selectedDate && (
              <Button
                variant="ghost"
                buttonSize="sm"
                icon={<Plus size={18} />}
                onPress={createEventOnDate}
              >
                Add
              </Button>
            )}
          </XStack>

          {selectedDate && (selectedEvents.length === 0 && selectedAvailability.length === 0) ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" textAlign="center">
                    Nothing scheduled for this day
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$3">
              {/* Availability Windows */}
              {selectedAvailability.map((window) => (
                <Theme key={window.windowId} name="accent">
                  <Card>
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        width={4}
                        height={40}
                        borderRadius={2}
                        backgroundColor="$accent"
                      />
                      <YStack flex={1}>
                        <Text fontWeight="500" color="$accent">
                          Available
                        </Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {formatTime(window.startTime)} - {formatTime(window.endTime)}
                          {window.visibleTo.type === 'all' && ' • All friends'}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}

              {/* Events */}
              {selectedEvents.map((event) => (
                <Theme key={event.eventId} name="Card">
                  <Card pressable onPress={() => navigateToEvent(event.eventId)}>
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        width={4}
                        height={40}
                        borderRadius={2}
                        backgroundColor={
                          event.status === 'confirmed'
                            ? '$success'
                            : event.status === 'sent'
                              ? '$warning'
                              : '$colorMuted'
                        }
                      />
                      <YStack flex={1}>
                        <Text fontWeight="600">{event.title}</Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          {event.location ? ` • ${event.location}` : ''}
                        </Text>
                      </YStack>
                      <Text fontSize={24}>{event.emoji ?? '📅'}</Text>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </DottedGridBackground>
  )
}
