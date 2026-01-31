import { Bell, Calendar, MessageSquare, UserPlus, Users } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { ScrollView, Text, XStack, YStack, Switch, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'

import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
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
      >
        <Switch.Thumb animation="quick" />
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
          title="Notifications"
          onBack={() => router.back()}
        />

        {/* Info Card */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack gap="$3" alignItems="center">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$accentBackground"
                alignItems="center"
                justifyContent="center"
              >
                <Bell size={20} color="$accent" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={15} color="$colorMuted">
                  Choose which notifications you want to receive from Gather.
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Theme>

        {/* Events */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              EVENTS
            </Text>
            <NotificationSetting
              icon={<Calendar size={18} color="$accent" />}
              label="Event Invites"
              description="Get notified when someone invites you to an event"
              value={eventInvites}
              onToggle={setEventInvites}
            />
            <NotificationSetting
              icon={<Calendar size={18} color="$accent" />}
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
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              SOCIAL
            </Text>
            <NotificationSetting
              icon={<UserPlus size={18} color="$accent" />}
              label="Friend Requests"
              description="Get notified when someone sends you a friend request"
              value={friendRequests}
              onToggle={setFriendRequests}
            />
            <NotificationSetting
              icon={<Users size={18} color="$accent" />}
              label="Group Invites"
              description="Get notified when someone adds you to a group"
              value={groupInvites}
              onToggle={setGroupInvites}
            />
            <NotificationSetting
              icon={<MessageSquare size={18} color="$accent" />}
              label="Messages"
              description="Get notified about new messages and comments"
              value={messages}
              onToggle={setMessages}
            />
          </Card>
        </Theme>
      </ScrollView>
    </DottedGridBackground>
  )
}
