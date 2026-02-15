import { Bell, Calendar, UserPlus, Users } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { ScrollView, Text, XStack, YStack, Switch, Theme, Spinner } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../lib/hooks'

interface NotificationSettingProps {
  icon: React.ReactNode
  label: string
  description: string
  value: boolean
  onToggle: (value: boolean) => void
  disabled?: boolean
}

function NotificationSetting({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
}: NotificationSettingProps) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$3"
      gap="$3"
      opacity={disabled ? 0.5 : 1}
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
        disabled={disabled}
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

  const { data: preferences, isLoading } = useNotificationPreferences()
  const { mutate: updatePreferences, isPending } = useUpdateNotificationPreferences()

  const handleToggle = (key: string) => (value: boolean) => {
    updatePreferences({ [key]: value })
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

        {isLoading ? (
          <YStack alignItems="center" paddingVertical="$6">
            <Spinner size="large" />
          </YStack>
        ) : (
          <>
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
                  value={preferences?.eventInvites ?? true}
                  onToggle={handleToggle('eventInvites')}
                  disabled={isPending}
                />
                <NotificationSetting
                  icon={<Calendar size={16} color="$colorMuted" />}
                  label="Event Updates"
                  description="Get notified about changes to events you're attending"
                  value={preferences?.eventUpdates ?? true}
                  onToggle={handleToggle('eventUpdates')}
                  disabled={isPending}
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
                  value={preferences?.friendRequests ?? true}
                  onToggle={handleToggle('friendRequests')}
                  disabled={isPending}
                />
                <NotificationSetting
                  icon={<Users size={16} color="$colorMuted" />}
                  label="Group Invites"
                  description="Get notified when someone adds you to a group"
                  value={preferences?.groupInvites ?? true}
                  onToggle={handleToggle('groupInvites')}
                  disabled={isPending}
                />
              </Card>
            </Theme>
          </>
        )}
      </ScrollView>
    </YStack>
  )
}
