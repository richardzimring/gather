import { CalendarPlus, Sparkles } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { RefreshControl } from 'react-native'
import { ScrollView, H2, Text, XStack, YStack, Circle, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { useAuth } from '../../lib/hooks/useAuth'
import { useEvents, useRespondToEvent, useRefresh } from '../../lib/hooks'

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

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
 * Format relative date for display
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
 * Get section title for date grouping
 */
function getSectionTitle(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const thisWeekEnd = new Date(today)
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)

  today.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)
  thisWeekEnd.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)

  if (compareDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (compareDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  }
  if (compareDate < thisWeekEnd) {
    return 'This Week'
  }
  return 'Later'
}

/**
 * Group events by section (Today, Tomorrow, This Week, Later)
 */
function groupEventsBySection(events: EventData[]) {
  const sections: Record<string, EventData[]> = {
    'Today': [],
    'Tomorrow': [],
    'This Week': [],
    'Later': [],
  }

  events.forEach((event) => {
    const date = new Date(event.startTime)
    const section = getSectionTitle(date)
    sections[section].push(event)
  })

  // Sort events within each section by start time
  Object.keys(sections).forEach((key) => {
    sections[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  })

  return sections
}

/**
 * Get attendee summary text
 */
function getAttendeeSummary(event: EventData): string {
  const going = event.invitees.filter((i) => i.status === 'accepted').length
  const maybe = event.invitees.filter((i) => i.status === 'maybe').length
  
  const parts: string[] = []
  if (going > 0) parts.push(`${going} going`)
  if (maybe > 0) parts.push(`${maybe} maybe`)
  
  return parts.length > 0 ? parts.join(', ') : 'No responses yet'
}

/**
 * Get humanized host text
 */
function getHostText(event: EventData, currentUserId: string | undefined): string {
  const isHost = event.hostId === currentUserId
  const hostName = event.host?.firstName ?? 'Someone'
  
  // Use commitment type to differentiate
  const isCommitted = event.commitmentType === 'going'
  
  if (isHost) {
    return isCommitted ? 'You are going to' : 'You want to plan'
  }
  
  return isCommitted ? `${hostName} is going to` : `${hostName} wants to`
}

// Type for event data
interface EventData {
  eventId: string
  hostId: string
  title: string
  emoji?: string | null
  startTime: string
  endTime: string
  location?: string | null
  status: string
  commitmentType?: 'going' | 'planning'
  host?: {
    firstName?: string
    lastName?: string
  }
  invitees: {
    userId: string
    status: string
  }[]
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const eventsQuery = useEvents()
  const { data: events } = eventsQuery
  const respondToEvent = useRespondToEvent()
  const { isRefreshing, onRefresh } = useRefresh(eventsQuery)

  // Get today's date at midnight (memoized to prevent re-renders)
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  // Get upcoming events (today and future, not cancelled)
  const upcomingEvents = useMemo(() => {
    return events?.filter((event) => {
      const eventDate = new Date(event.startTime)
      return eventDate >= today && event.status !== 'cancelled'
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) ?? []
  }, [events, today])

  // Group events by section
  const eventsBySection = useMemo(() => groupEventsBySection(upcomingEvents), [upcomingEvents])

  // Get pending invitation count for badge
  const pendingCount = useMemo(() => {
    return events?.filter((event) => {
      const userInvitee = event.invitees.find(
        (i) => i.userId === user?.userId && i.status === 'pending'
      )
      return userInvitee && event.hostId !== user?.userId
    }).length ?? 0
  }, [events, user?.userId])

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

  const navigateToPlan = () => {
    router.push('/(tabs)/plan')
  }

  const navigateToCreate = () => {
    router.push('/events/create')
  }

  // Check if user has pending invitation for this event
  const isPendingForUser = (event: EventData) => {
    const userInvitee = event.invitees.find((i) => i.userId === user?.userId)
    return userInvitee?.status === 'pending' && event.hostId !== user?.userId
  }

  // Ordered sections to display
  const sectionOrder = ['Today', 'Tomorrow', 'This Week', 'Later']

  return (
    <DottedGridBackground>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Greeting Header */}
        <YStack marginBottom="$6">
          <Text
            fontSize={32}
            fontWeight="700"
            letterSpacing={-0.5}
            fontFamily="$heading"
          >
            {getGreeting()},
          </Text>
          <Text
            fontSize={32}
            fontWeight="700"
            letterSpacing={-0.5}
            color="$accent"
            fontFamily="$heading"
          >
            {user?.firstName ?? 'there'}
          </Text>
        </YStack>

        {/* Quick Actions */}
        <YStack gap="$3" marginBottom="$6">
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            onPress={navigateToCreate}
            icon={<Sparkles size={20} color="white" />}
          >
            Share what you are doing
          </Button>
          <Button
            variant="secondary"
            buttonSize="lg"
            fullWidth
            onPress={navigateToPlan}
            icon={<CalendarPlus size={20} />}
          >
            Start planning something
          </Button>
        </YStack>

        {/* Events Timeline */}
        <YStack gap="$5">
          {sectionOrder.map((section) => {
            const sectionEvents = eventsBySection[section]
            
            // Skip empty sections except Today
            if (sectionEvents.length === 0 && section !== 'Today') {
              return null
            }

            return (
              <YStack key={section} gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <H2 fontSize={18} fontWeight="600">
                    {section}
                  </H2>
                  {section === 'Today' && pendingCount > 0 && (
                    <Circle size={24} backgroundColor="$accent">
                      <Text color="$white" fontSize={12} fontWeight="600">
                        {pendingCount}
                      </Text>
                    </Circle>
                  )}
                </XStack>

                {sectionEvents.length === 0 ? (
                  <Theme name="Card">
                    <Card>
                      <YStack alignItems="center" padding="$2">
                        <Text color="$colorMuted" textAlign="center">
                          Nothing planned
                        </Text>
                      </YStack>
                    </Card>
                  </Theme>
                ) : (
                  <YStack gap="$3">
                    {sectionEvents.map((event) => {
                      const isPending = isPendingForUser(event)
                      const isPlanning = event.commitmentType === 'planning'
                      // Use outlined style for pending invitations OR planning events
                      const useOutlinedStyle = isPending || isPlanning
                      
                      return (
                        <Theme key={event.eventId} name="Card">
                          <Card 
                            pressable 
                            onPress={() => navigateToEvent(event.eventId)}
                            outlined={useOutlinedStyle}
                          >
                            <YStack gap="$3">
                              {/* Host text */}
                              <Text 
                                fontSize={13} 
                                color={isPending ? '$accent' : '$colorMuted'}
                                fontWeight={isPending ? '600' : '400'}
                              >
                                {getHostText(event, user?.userId)}
                              </Text>
                              
                              {/* Event info row */}
                              <XStack alignItems="center" gap="$3">
                                <Circle 
                                  size={48} 
                                  backgroundColor={isPending ? '$accentSubtle' : '$backgroundHover'}
                                >
                                  <Text fontSize={24}>{event.emoji ?? '📅'}</Text>
                                </Circle>
                                <YStack flex={1}>
                                  <Text fontWeight="600" fontSize={16}>
                                    {event.title}
                                  </Text>
                                  <Text color="$colorMuted" fontSize={14}>
                                    {formatRelativeDate(event.startTime)}
                                    {event.location ? ` · ${event.location}` : ''}
                                  </Text>
                                  <Text color="$colorMuted" fontSize={13} marginTop="$1">
                                    {getAttendeeSummary(event)}
                                  </Text>
                                </YStack>
                              </XStack>

                              {/* Quick actions for pending invitations */}
                              {isPending && (
                                <XStack gap="$2" marginTop="$1">
                                  <Button
                                    variant="primary"
                                    buttonSize="sm"
                                    flex={1}
                                    onPress={(e) => handleAccept(event.eventId, e)}
                                    disabled={respondToEvent.isPending}
                                  >
                                    Going
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
                              )}
                            </YStack>
                          </Card>
                        </Theme>
                      )
                    })}
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
