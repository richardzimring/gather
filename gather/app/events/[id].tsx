import {
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from '@tamagui/lucide-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import {
  Circle,
  H1,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
  Spinner,
  Separator,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../lib/hooks/useAuth'
import { useEvent, useRespondToEvent, useCancelEvent } from '../../lib/hooks'
import type { EventInvitee, InviteeStatus } from '../../lib/api/generated/types.gen'

/**
 * Format date for display
 */
function formatEventDate(startTime: string, endTime: string): {
  date: string
  time: string
} {
  const start = new Date(startTime)
  const end = new Date(endTime)

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }

  const date = start.toLocaleDateString('en-US', dateOptions)
  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions)
  const endTimeStr = end.toLocaleTimeString('en-US', timeOptions)

  return {
    date,
    time: `${startTimeStr} - ${endTimeStr}`,
  }
}

/**
 * Get status badge color
 */
function getStatusColor(status: InviteeStatus) {
  switch (status) {
    case 'accepted':
      return '$success'
    case 'declined':
      return '$error'
    case 'maybe':
      return '$warning'
    default:
      return '$colorMuted'
  }
}

/**
 * Invitee item component
 */
function InviteeItem({ invitee }: { invitee: EventInvitee }) {
  return (
    <XStack alignItems="center" gap="$3" paddingVertical="$2">
      <Circle size={40} backgroundColor="$backgroundHover">
        <Text fontSize={16}>{invitee.initials}</Text>
      </Circle>
      <YStack flex={1}>
        <Text fontWeight="500">{invitee.fullName}</Text>
        <XStack alignItems="center" gap="$2">
          <Circle size={8} backgroundColor={getStatusColor(invitee.status)} />
          <Text fontSize={13} color="$colorMuted" textTransform="capitalize">
            {invitee.status}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  )
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { data: event, isLoading, error } = useEvent(id ?? '')
  const respondToEvent = useRespondToEvent()
  const cancelEvent = useCancelEvent()
  const [pendingResponse, setPendingResponse] = useState<InviteeStatus | null>(null)

  const isHost = event?.hostId === user?.userId
  const userInvitee = event?.invitees.find((i) => i.userId === user?.userId)
  const canRespond = !isHost && userInvitee

  const handleResponse = async (status: InviteeStatus) => {
    if (!id) return
    setPendingResponse(status)
    try {
      await respondToEvent.mutateAsync({
        eventId: id,
        response: { status },
      })
    } catch (err) {
      console.error('Failed to respond to event:', err)
    } finally {
      setPendingResponse(null)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This action cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            if (!id) return
            try {
              await cancelEvent.mutateAsync(id)
              router.back()
            } catch (err) {
              console.error('Failed to cancel event:', err)
            }
          },
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <DottedGridBackground>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$accent" />
        </YStack>
      </DottedGridBackground>
    )
  }

  if (error || !event) {
    return (
      <DottedGridBackground>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="$4"
        >
          <Text fontSize={48} marginBottom="$4">
            😕
          </Text>
          <Text fontSize={18} fontWeight="600" textAlign="center">
            Event not found
          </Text>
          <Text color="$colorMuted" textAlign="center" marginTop="$2">
            This event may have been cancelled or you do not have access.
          </Text>
          <Button variant="secondary" marginTop="$4" onPress={() => router.back()}>
            Go Back
          </Button>
        </YStack>
      </DottedGridBackground>
    )
  }

  const { date, time } = formatEventDate(event.startTime, event.endTime)
  const acceptedCount = event.invitees.filter((i) => i.status === 'accepted').length
  const totalInvitees = event.invitees.length

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
        <BackHeader
          title=""
          marginBottom="$0"
          rightAction={
            isHost ? (
              <XStack gap="$2">
                <Button
                  variant="ghost"
                  buttonSize="sm"
                  circular
                  icon={<Pencil size={20} color="$color" />}
                  onPress={() => router.push(`/events/create?edit=${id}`)}
                />
                <Button
                  variant="ghost"
                  buttonSize="sm"
                  circular
                  icon={cancelEvent.isPending ? undefined : <Trash2 size={20} color="$error" />}
                  onPress={handleCancel}
                  loading={cancelEvent.isPending}
                  disabled={cancelEvent.isPending}
                />
              </XStack>
            ) : undefined
          }
        />

        {/* Event Header */}
        <YStack alignItems="center" marginBottom="$5">
          <Circle
            size={80}
            backgroundColor="$accent"
            opacity={0.15}
            marginBottom="$3"
          >
            <Text fontSize={40}>{event.emoji ?? '📅'}</Text>
          </Circle>
          <H1 fontSize={24} fontWeight="700" textAlign="center">
            {event.title}
          </H1>
          <Text color="$colorMuted" fontSize={14} marginTop="$1">
            Hosted by {event.hostName}
          </Text>
          <XStack
            alignItems="center"
            gap="$2"
            marginTop="$2"
            backgroundColor={
              event.status === 'confirmed'
                ? '$success'
                : event.status === 'cancelled'
                  ? '$error'
                  : '$warning'
            }
            opacity={0.9}
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$4"
          >
            <Text
              color="$white"
              fontSize={12}
              fontWeight="600"
              textTransform="uppercase"
            >
              {event.status}
            </Text>
          </XStack>
        </YStack>

        {/* Event Details */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$4">
              {/* Date & Time */}
              <XStack alignItems="flex-start" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  borderRadius={10}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Calendar size={20} color="$accent" />
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="600">{date}</Text>
                  <Text color="$colorMuted" fontSize={14}>
                    {time}
                  </Text>
                </YStack>
              </XStack>

              {/* Location */}
              {event.location && (
                <XStack alignItems="flex-start" gap="$3">
                  <YStack
                    width={40}
                    height={40}
                    borderRadius={10}
                    backgroundColor="$backgroundHover"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MapPin size={20} color="$accent" />
                  </YStack>
                  <YStack flex={1} justifyContent="center" minHeight={40}>
                    <Text fontWeight="500">{event.location}</Text>
                  </YStack>
                </XStack>
              )}

              {/* Attendees */}
              <XStack alignItems="flex-start" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  borderRadius={10}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Users size={20} color="$accent" />
                </YStack>
                <YStack flex={1} justifyContent="center" minHeight={40}>
                  <Text fontWeight="500">
                    {acceptedCount + 1} of {totalInvitees + 1} going
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>
        </Theme>

        {/* Notes */}
        {event.notes && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <Text fontWeight="600" marginBottom="$2">
                Notes
              </Text>
              <Text color="$colorMuted">{event.notes}</Text>
            </Card>
          </Theme>
        )}

        {/* Invitees List */}
        {event.showInviteList && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <Text fontWeight="600" marginBottom="$3">
                Who is Coming
              </Text>
              <YStack>
                {/* Host */}
                <YStack>
                  <XStack alignItems="center" gap="$3" paddingVertical="$2">
                    <Circle size={40} backgroundColor="$backgroundHover">
                      <Text fontSize={16}>{event.hostInitials}</Text>
                    </Circle>
                    <YStack flex={1}>
                      <XStack alignItems="center" gap="$2">
                        <Text fontWeight="500">{event.hostName}</Text>
                        <Text fontSize={12} color="$accent" fontWeight="600">
                          Host
                        </Text>
                      </XStack>
                      <Text fontSize={13} color="$colorMuted">Organizer</Text>
                    </YStack>
                  </XStack>
                  {event.invitees.length > 0 && <Separator marginVertical="$2" />}
                </YStack>
                {/* Invitees */}
                {event.invitees.map((invitee, index) => (
                  <YStack key={invitee.userId}>
                    <InviteeItem invitee={invitee} />
                    {index < event.invitees.length - 1 && (
                      <Separator marginVertical="$2" />
                    )}
                  </YStack>
                ))}
              </YStack>
            </Card>
          </Theme>
        )}

        {/* Response Buttons (for invitees) */}
        {canRespond && event.status !== 'cancelled' && (
          <YStack gap="$3">
            <Text fontWeight="600" textAlign="center">
              Are you going
            </Text>
            <XStack gap="$3">
              <Button
                variant={userInvitee.status === 'accepted' ? 'primary' : 'secondary'}
                flex={1}
                onPress={() => handleResponse('accepted')}
                loading={pendingResponse === 'accepted'}
                disabled={pendingResponse !== null}
              >
                Going
              </Button>
              <Button
                variant={userInvitee.status === 'maybe' ? 'primary' : 'secondary'}
                flex={1}
                onPress={() => handleResponse('maybe')}
                loading={pendingResponse === 'maybe'}
                disabled={pendingResponse !== null}
              >
                Maybe
              </Button>
              <Button
                variant={userInvitee.status === 'declined' ? 'danger' : 'secondary'}
                flex={1}
                onPress={() => handleResponse('declined')}
                loading={pendingResponse === 'declined'}
                disabled={pendingResponse !== null}
              >
                Cannot Go
              </Button>
            </XStack>
          </YStack>
        )}
      </ScrollView>
    </DottedGridBackground>
  )
}
