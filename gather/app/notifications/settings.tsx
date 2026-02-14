import { Bell, Calendar, MessageSquare, UserPlus, Users } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { ScrollView, Text, XStack, YStack, Switch, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'

import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'

interface NotificationSettingProps {
  icon: React.ReactNode
  label: string
  description: string
  value: boolean
  onToggle: (value: boolean) => void
}

function NotificationSetting({
  icon,
  label,
  description,
  value,
  onToggle,
}: NotificationSettingProps) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$3"
      gap="$3"
    >
      <YStack
        width={36}
        height={36}
        borderRadius={8}
        backgroundColor="$backgroundHover"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {icon}
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="500" marginBottom="$1">
          {label}
        </Text>
        <Text color="$colorMuted" fontSize={13}>
          {description}
        </Text>
      </YStack>
      <Switch
        size="$3"
        checked={value}
        onCheckedChange={onToggle}
        backgroundColor={value ? '$primary' : '$backgroundHover'}
      >
        <Switch.Thumb
          animation="quick"
          backgroundColor={value ? '$primaryForeground' : '$color'}
        />
      </Switch>
    </XStack>
  )
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets()
  
  // TODO: These should be stored in user preferences on the backend
  const [eventInvites, setEventInvites] = useState(true)
  const [eventUpdates, setEventUpdates] = useState(true)
  const [friendRequests, setFriendRequests] = useState(true)
  const [groupInvites, setGroupInvites] = useState(true)
  const [messages, setMessages] = useState(true)

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
          title="Notifications"
          onBack={() => router.back()}
        />

        {/* Info Card */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack gap="$3" alignItems="center">
              <YStack
                width={36}
                height={36}
                borderRadius={6}
                backgroundColor="$backgroundHover"
                alignItems="center"
                justifyContent="center"
              >
                <Bell size={16} color="$colorMuted" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={13} color="$colorMuted">
                  Choose which notifications you want to receive from Gather.
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Theme>

        {/* Events */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={12} fontWeight="600" marginBottom="$2">
              EVENTS
            </Text>
            <NotificationSetting
              icon={<Calendar size={16} color="$colorMuted" />}
              label="Event Invites"
              description="Get notified when someone invites you to an event"
              value={eventInvites}
              onToggle={setEventInvites}
            />
            <NotificationSetting
              icon={<Calendar size={16} color="$colorMuted" />}
              label="Event Updates"
              description="Get notified about changes to events you're attending"
              value={eventUpdates}
              onToggle={setEventUpdates}
            />
          </Card>
        </Theme>

        {/* Social */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={12} fontWeight="600" marginBottom="$2">
              SOCIAL
            </Text>
            <NotificationSetting
              icon={<UserPlus size={16} color="$colorMuted" />}
              label="Friend Requests"
              description="Get notified when someone sends you a friend request"
              value={friendRequests}
              onToggle={setFriendRequests}
            />
            <NotificationSetting
              icon={<Users size={16} color="$colorMuted" />}
              label="Group Invites"
              description="Get notified when someone adds you to a group"
              value={groupInvites}
              onToggle={setGroupInvites}
            />
            <NotificationSetting
              icon={<MessageSquare size={16} color="$colorMuted" />}
              label="Messages"
              description="Get notified about new messages and comments"
              value={messages}
              onToggle={setMessages}
            />
          </Card>
        </Theme>
      </ScrollView>
    </YStack>
  )
}
