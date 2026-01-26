import { router } from 'expo-router'
import { Circle, ScrollView, Text, Theme, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { useEvents, useFriends, useRespondToEvent, useAcceptFriendRequest, useDeclineFriendRequest } from '../../lib/hooks'
import { useAuth } from '../../lib/hooks/useAuth'

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { data: events } = useEvents()
  const { data: friendsData } = useFriends()
  const respondToEvent = useRespondToEvent()
  const acceptRequest = useAcceptFriendRequest()
  const declineRequest = useDeclineFriendRequest()

  // Get pending event invitations
  const pendingInvitations =
    events?.filter((event) => {
      const userInvitee = event.invitees.find(
        (i) => i.userId === user?.userId && i.status === 'pending'
      )
      return userInvitee && event.hostId !== user?.userId && event.status !== 'cancelled'
    }) ?? []

  // Get pending friend requests
  const pendingFriendRequests = friendsData?.pendingReceived ?? []

  const hasNotifications = pendingInvitations.length > 0 || pendingFriendRequests.length > 0

  const handleAcceptEvent = async (eventId: string) => {
    try {
      await respondToEvent.mutateAsync({ eventId, response: { status: 'accepted' } })
    } catch (err) {
      console.error('Failed to accept event:', err)
    }
  }

  const handleDeclineEvent = async (eventId: string) => {
    try {
      await respondToEvent.mutateAsync({ eventId, response: { status: 'declined' } })
    } catch (err) {
      console.error('Failed to decline event:', err)
    }
  }

  const handleAcceptFriend = async (friendId: string) => {
    try {
      await acceptRequest.mutateAsync(friendId)
    } catch (err) {
      console.error('Failed to accept friend:', err)
    }
  }

  const handleDeclineFriend = async (friendId: string) => {
    try {
      await declineRequest.mutateAsync(friendId)
    } catch (err) {
      console.error('Failed to decline friend:', err)
    }
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
        <BackHeader title="Notifications" />

        {!hasNotifications ? (
          <EmptyState
            icon={<Text fontSize={64}>🔔</Text>}
            title="All caught up!"
            description="You do not have any notifications right now. We will let you know when something happens"
          />
        ) : (
          <YStack gap="$4">
            {/* Friend Requests */}
            {pendingFriendRequests.length > 0 && (
              <YStack gap="$3">
                <Text fontWeight="600" color="$colorMuted" fontSize={13}>
                  FRIEND REQUESTS
                </Text>
                {pendingFriendRequests.map((request) => {
                  const displayName = request.customName ?? `User ${request.friendId.slice(0, 6).toUpperCase()}`
                  const initial = displayName[0].toUpperCase()
                  return (
                    <Theme key={request.friendId} name="Card">
                      <Card>
                        <YStack gap="$3">
                          <XStack alignItems="center" gap="$3">
                            <Circle size={48} backgroundColor="$accent" opacity={0.15}>
                              <Text fontSize={18} fontWeight="600">
                                {initial}
                              </Text>
                            </Circle>
                            <YStack flex={1}>
                              <Text fontWeight="600">{displayName}</Text>
                              <Text color="$colorMuted" fontSize={13}>
                                Wants to be your friend
                              </Text>
                            </YStack>
                            <Text color="$colorMuted" fontSize={12}>
                              {formatRelativeTime(request.createdAt)}
                            </Text>
                          </XStack>
                          <XStack gap="$2">
                            <Button
                              variant="primary"
                              buttonSize="sm"
                              flex={1}
                              onPress={() => handleAcceptFriend(request.friendId)}
                              disabled={acceptRequest.isPending || declineRequest.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              buttonSize="sm"
                              flex={1}
                              onPress={() => handleDeclineFriend(request.friendId)}
                              disabled={acceptRequest.isPending || declineRequest.isPending}
                            >
                              Decline
                            </Button>
                          </XStack>
                        </YStack>
                      </Card>
                    </Theme>
                  )
                })}
              </YStack>
            )}

            {/* Event Invitations */}
            {pendingInvitations.length > 0 && (
              <YStack gap="$3">
                <Text fontWeight="600" color="$colorMuted" fontSize={13}>
                  EVENT INVITATIONS
                </Text>
                {pendingInvitations.map((event) => (
                  <Theme key={event.eventId} name="Card">
                    <Card
                      pressable
                      onPress={() => router.push(`/events/${event.eventId}`)}
                    >
                      <YStack gap="$3">
                        <XStack alignItems="center" gap="$3">
                          <Circle size={48} backgroundColor="$backgroundHover">
                            <Text fontSize={22}>{event.emoji ?? '📅'}</Text>
                          </Circle>
                          <YStack flex={1}>
                            <Text fontWeight="600">{event.title}</Text>
                            <Text color="$colorMuted" fontSize={13}>
                              {new Date(event.startTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {' at '}
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </Text>
                          </YStack>
                          <Text color="$colorMuted" fontSize={12}>
                            {formatRelativeTime(event.createdAt)}
                          </Text>
                        </XStack>
                        <XStack gap="$2">
                          <Button
                            variant="primary"
                            buttonSize="sm"
                            flex={1}
                            onPress={(e) => {
                              e.stopPropagation()
                              handleAcceptEvent(event.eventId)
                            }}
                            disabled={respondToEvent.isPending}
                          >
                            Going
                          </Button>
                          <Button
                            variant="secondary"
                            buttonSize="sm"
                            flex={1}
                            onPress={(e) => {
                              e.stopPropagation()
                              handleDeclineEvent(event.eventId)
                            }}
                            disabled={respondToEvent.isPending}
                          >
                            Cannot Go
                          </Button>
                        </XStack>
                      </YStack>
                    </Card>
                  </Theme>
                ))}
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </DottedGridBackground>
  )
}
