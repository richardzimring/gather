import {
  Calendar,
  MoreHorizontal,
  UserMinus,
} from '@tamagui/lucide-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import {
  Circle,
  H1,
  ScrollView,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
  Sheet,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useFriends, useRemoveFriend, useFriendsAvailability, useEvents } from '../../lib/hooks'

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [showActionSheet, setShowActionSheet] = useState(false)

  const { data: friendsData, isLoading } = useFriends()
  const { data: availability } = useFriendsAvailability()
  const { data: events } = useEvents()
  const removeFriend = useRemoveFriend()

  // Find the specific friend
  const friend = useMemo(() => {
    if (!friendsData?.friends || !id) return null
    return friendsData.friends.find((f) => f.friendId === id) ?? null
  }, [friendsData, id])

  // Get this friend's availability
  const friendAvailability = useMemo(() => {
    if (!availability || !id) return []
    const friendData = availability.find((a) => a.userId === id)
    return friendData?.windows ?? []
  }, [availability, id])

  // Get shared events with this friend
  const sharedEvents = useMemo(() => {
    if (!events || !id) return []
    return events.filter(
      (event) =>
        event.invitees.some((i) => i.userId === id) &&
        event.status !== 'cancelled'
    )
  }, [events, id])

  const handleRemoveFriend = () => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!id) return
            setShowActionSheet(false) // Close sheet to show loading feedback
            try {
              await removeFriend.mutateAsync(id)
              router.back()
            } catch (err) {
              console.error('Failed to remove friend:', err)
            }
          },
        },
      ]
    )
  }

  const handleInviteToEvent = () => {
    setShowActionSheet(false)
    router.push('/events/create')
  }

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$color" />
      </YStack>
    )
  }

  if (!friend) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$4"
      >
        <Text fontSize={48} marginBottom="$4">
          😕
        </Text>
        <Text fontSize={18} fontWeight="600" textAlign="center">
          Friend not found
        </Text>
        <Text color="$colorMuted" textAlign="center" marginTop="$2">
          This person may no longer be in your friends list.
        </Text>
        <Button variant="secondary" marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    )
  }

  const displayName = friend.friend.fullName
  const initials = friend.friend.initials

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <BackHeader
          title=""
          marginBottom="$1"
          rightAction={
            <Button
              variant="ghost"
              buttonSize="sm"
              circular
              icon={<MoreHorizontal size={20} />}
              onPress={() => setShowActionSheet(true)}
            />
          }
        />

        {/* Profile Header */}
        <YStack alignItems="center" marginBottom="$4">
          <Circle size={80} backgroundColor="$primary" marginBottom="$3">
            <Text fontSize={32} color="$primaryForeground" fontWeight="600">
              {initials}
            </Text>
          </Circle>
          <H1 fontSize={20} fontWeight="600" textAlign="center">
            {displayName}
          </H1>
          <Text color="$colorMuted" fontSize={13}>
            Friends since {formatDate(friend.acceptedAt ?? friend.createdAt)}
          </Text>
        </YStack>

        {/* Quick Actions */}
        <XStack gap="$2" marginBottom="$4">
          <Button
            variant="primary"
            flex={1}
            icon={<Calendar size={16} color="$primaryForeground" />}
            onPress={handleInviteToEvent}
          >
            Invite to Event
          </Button>
        </XStack>

        {/* Availability Section */}
        <YStack marginBottom="$4">
          <Text fontWeight="500" fontSize={14} marginBottom="$3">
            Upcoming Availability
          </Text>
          {friendAvailability.length === 0 ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" fontSize={13} textAlign="center">
                    No availability shared with you
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$2">
              {friendAvailability.slice(0, 5).map((window) => (
                <Theme key={window.windowId} name="Card">
                  <Card>
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        width={3}
                        height={36}
                        borderRadius={2}
                        backgroundColor="$success"
                      />
                      <YStack flex={1}>
                        <Text fontWeight="500" fontSize={14}>
                          Available
                        </Text>
                        <Text color="$colorMuted" fontSize={12}>
                          {formatDate(window.startTime)} • {formatTime(window.startTime)} - {formatTime(window.endTime)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          )}
        </YStack>

        {/* Shared Events Section */}
        <YStack>
          <Text fontWeight="600" fontSize={16} marginBottom="$3">
            Shared Events
          </Text>
          {sharedEvents.length === 0 ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" textAlign="center">
                    No events together yet
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$3">
              {sharedEvents.slice(0, 5).map((event) => (
                <Theme key={event.eventId} name="Card">
                  <Card
                    pressable
                    onPress={() => router.push(`/events/${event.eventId}`)}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Circle size={44} backgroundColor="$backgroundHover">
                        <Text fontSize={20}>{event.emoji ?? '📅'}</Text>
                      </Circle>
                      <YStack flex={1}>
                        <Text fontWeight="600">{event.title}</Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {formatDate(event.startTime)} at {formatTime(event.startTime)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Action Sheet */}
      <Sheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        snapPoints={[35]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$3" marginTop="$4">
            <Button
              variant="secondary"
              fullWidth
              icon={<Calendar size={18} />}
              onPress={handleInviteToEvent}
            >
              Invite to Event
            </Button>
            <Button
              variant="destructive"
              fullWidth
              icon={removeFriend.isPending ? undefined : <UserMinus size={16} color="$destructiveForeground" />}
              onPress={handleRemoveFriend}
              loading={removeFriend.isPending}
              loadingText="Removing..."
            >
              Remove Friend
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onPress={() => setShowActionSheet(false)}
            >
              Cancel
            </Button>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  )
}
