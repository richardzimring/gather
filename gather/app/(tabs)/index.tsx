import { Plus } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { ScrollView, H2, Text, XStack, YStack, Circle, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { SimpleHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../lib/hooks/useAuth'
import { useEvents, useRespondToEvent } from '../../lib/hooks/useEvents'

/**
 * Format event time for display
 */
function formatEventTime(startTime: string): string {
  const date = new Date(startTime)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format relative date for invitations
 */
function formatRelativeDate(startTime: string): string {
  const date = new Date(startTime)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  today.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)

  const eventDate = new Date(date)
  eventDate.setHours(0, 0, 0, 0)

  if (eventDate.getTime() === today.getTime()) {
    return `Today, ${formatEventTime(startTime)}`
  }
  if (eventDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${formatEventTime(startTime)}`
  }
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatEventTime(startTime)}`
}

/**
 * Get day section title
 */
function getDayTitle(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  today.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  if (date.getTime() === today.getTime()) {
    return 'Today'
  }
  if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Group events by day
 */
function groupEventsByDay(events: any[]) {
  const groups: Record<string, any[]> = {}
  
  events.forEach((event) => {
    const date = new Date(event.startTime)
    const dateKey = date.toDateString()
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
  })

  // Sort events within each day by start time
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  })

  return groups
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { data: events } = useEvents()
  const respondToEvent = useRespondToEvent()

  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get upcoming events (today and future, confirmed status)
  const upcomingEvents =
    events?.filter((event) => {
      const eventDate = new Date(event.startTime)
      return eventDate >= today && event.status === 'confirmed'
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) ?? []

  // Group upcoming events by day
  const eventsByDay = groupEventsByDay(upcomingEvents)
  
  // Get sorted day keys, always including today
  const sortedDays = Object.keys(eventsByDay)
    .map((key) => new Date(key))
    .sort((a, b) => a.getTime() - b.getTime())
  
  // Ensure today is included even if empty
  const todayKey = today.toDateString()
  const hasEventsToday = eventsByDay[todayKey]?.length > 0
  if (!hasEventsToday && !sortedDays.some(d => d.toDateString() === todayKey)) {
    sortedDays.unshift(today)
  }

  // Get pending invitations (events where user hasn't responded)
  const pendingInvitations =
    events?.filter((event) => {
      const userInvitee = event.invitees.find(
        (i) => i.userId === user?.userId && i.status === 'pending'
      )
      return userInvitee && event.hostId !== user?.userId
    }) ?? []

  const handleAccept = async (eventId: string, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation()
    await respondToEvent.mutateAsync({ eventId, response: { status: 'accepted' } })
  }

  const handleDecline = async (eventId: string, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation()
    await respondToEvent.mutateAsync({ eventId, response: { status: 'declined' } })
  }

  const navigateToEvent = (eventId: string) => {
    router.push(`/events/${eventId}`)
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
        <SimpleHeader
          title="Events"
          rightAction={
            <Button
              variant="ghost"
              buttonSize="sm"
              circular
              icon={<Plus size={22} color="$color" />}
              onPress={() => router.push('/events/create')}
            />
          }
        />

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <YStack marginBottom="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <H2 fontSize={18} fontWeight="600">
                Pending Invitations
              </H2>
              <Circle size={24} backgroundColor="$accent">
                <Text color="$white" fontSize={12} fontWeight="600">
                  {pendingInvitations.length}
                </Text>
              </Circle>
            </XStack>

            <YStack gap="$3">
              {pendingInvitations.map((event) => (
                <Theme key={event.eventId} name="Card">
                  <Card pressable onPress={() => navigateToEvent(event.eventId)}>
                    <YStack gap="$2">
                      <XStack alignItems="center" gap="$3">
                        <Circle size={40} backgroundColor="$backgroundHover">
                          <Text fontSize={18}>{event.emoji ?? '📅'}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="600">{event.title}</Text>
                          <Text color="$colorMuted" fontSize={13}>
                            {formatRelativeDate(event.startTime)}
                          </Text>
                        </YStack>
                      </XStack>
                      <XStack gap="$2" marginTop="$2">
                        <Button
                          variant="primary"
                          buttonSize="sm"
                          flex={1}
                          onPress={(e) => handleAccept(event.eventId, e)}
                          disabled={respondToEvent.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          buttonSize="sm"
                          flex={1}
                          onPress={(e) => handleDecline(event.eventId, e)}
                          disabled={respondToEvent.isPending}
                        >
                          Decline
                        </Button>
                      </XStack>
                    </YStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Upcoming Events by Day */}
        <YStack gap="$5">
          {sortedDays.map((dayDate) => {
            const dayKey = dayDate.toDateString()
            const dayEvents = eventsByDay[dayKey] || []
            const isToday = dayKey === today.toDateString()

            // Skip empty days unless it's today
            if (dayEvents.length === 0 && !isToday) {
              return null
            }

            return (
              <YStack key={dayKey} gap="$3">
                <H2 fontSize={18} fontWeight="600">
                  {getDayTitle(dayDate)}
                </H2>

                {dayEvents.length === 0 ? (
                  <Theme name="Card">
                    <Card>
                      <YStack alignItems="center" padding="$2">
                        <Text color="$colorMuted" textAlign="center">
                          No events scheduled
                        </Text>
                      </YStack>
                    </Card>
                  </Theme>
                ) : (
                  <YStack gap="$3">
                    {dayEvents.map((event) => (
                      <Theme key={event.eventId} name="Card">
                        <Card pressable onPress={() => navigateToEvent(event.eventId)}>
                          <XStack alignItems="center" gap="$3">
                            <Circle size={48} backgroundColor="$accent" opacity={0.15}>
                              <Text fontSize={24}>{event.emoji ?? '📅'}</Text>
                            </Circle>
                            <YStack flex={1}>
                              <Text fontWeight="600" fontSize={16}>
                                {event.title}
                              </Text>
                              <Text color="$colorMuted" fontSize={14}>
                                {formatEventTime(event.startTime)}
                                {event.location ? ` - ${event.location}` : ''}
                              </Text>
                            </YStack>
                          </XStack>
                        </Card>
                      </Theme>
                    ))}
                  </YStack>
                )}
              </YStack>
            )
          })}
        </YStack>
      </ScrollView>
    </DottedGridBackground>
  )
}
