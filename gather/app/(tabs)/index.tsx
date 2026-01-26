import { Bell, Plus } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { ScrollView, H1, H2, Text, XStack, YStack, Circle, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { useAuth } from '../../lib/hooks/useAuth'
import { useEvents, useRespondToEvent } from '../../lib/hooks/useEvents'
import { useFriends } from '../../lib/hooks/useFriends'

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { data: events } = useEvents()
  const { data: friendsData } = useFriends()
  const respondToEvent = useRespondToEvent()

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Filter events for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todaysEvents =
    events?.filter((event) => {
      const eventDate = new Date(event.startTime)
      return eventDate >= today && eventDate < tomorrow && event.status === 'confirmed'
    }) ?? []

  // Get pending invitations (events where user hasn't responded)
  const pendingInvitations =
    events?.filter((event) => {
      const userInvitee = event.invitees.find(
        (i) => i.userId === user?.userId && i.status === 'pending'
      )
      return userInvitee && event.hostId !== user?.userId
    }) ?? []

  // Get accepted friends for "available now" section
  const acceptedFriends = friendsData?.friends ?? []

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
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <YStack>
            <Text color="$colorMuted" fontSize={14}>
              {getGreeting()}
            </Text>
            <H1 fontSize={28} fontWeight="700">
              {user?.firstName ?? 'Welcome'}
            </H1>
          </YStack>
          <Button
            variant="ghost"
            buttonSize="sm"
            circular
            icon={<Bell size={22} color="$color" />}
            onPress={() => router.push('/notifications')}
          />
        </XStack>

        {/* Today's Events Section */}
        <YStack marginBottom="$5">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <H2 fontSize={18} fontWeight="600">
              Today
            </H2>
            <Text
              color="$accent"
              fontSize={14}
              fontWeight="500"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => router.push('/(tabs)/calendar')}
            >
              See all
            </Text>
          </XStack>

          {todaysEvents.length === 0 ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" textAlign="center">
                    No events today. Your schedule is clear
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$3">
              {todaysEvents.slice(0, 3).map((event) => (
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
              {pendingInvitations.slice(0, 5).map((event) => (
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

        {/* Friends Section */}
        {acceptedFriends.length > 0 && (
          <YStack marginBottom="$5">
            <H2 fontSize={18} fontWeight="600" marginBottom="$3">
              Your Friends
            </H2>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$3">
                {acceptedFriends.slice(0, 8).map((friendship) => {
                  const displayName = friendship.customName ?? `Friend ${friendship.friendId.slice(0, 4)}`
                  const initial = displayName[0].toUpperCase()
                  return (
                    <YStack
                      key={friendship.friendId}
                      alignItems="center"
                      gap="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => router.push(`/friends/${friendship.friendId}`)}
                    >
                      <Circle size={64} backgroundColor="$accent" opacity={0.2}>
                        <Text fontSize={28}>{initial}</Text>
                      </Circle>
                      <Text fontSize={13} color="$colorMuted" numberOfLines={1}>
                        {displayName.split(' ')[0]}
                      </Text>
                    </YStack>
                  )
                })}
              </XStack>
            </ScrollView>
          </YStack>
        )}

        {/* Quick Actions */}
        <YStack gap="$3">
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            icon={<Plus size={20} color="white" />}
            onPress={() => router.push('/events/create')}
          >
            Create Event
          </Button>
          <Button
            variant="secondary"
            buttonSize="lg"
            fullWidth
            onPress={() => router.push('/availability/create')}
          >
            Set Availability
          </Button>
        </YStack>
      </ScrollView>
    </DottedGridBackground>
  )
}
