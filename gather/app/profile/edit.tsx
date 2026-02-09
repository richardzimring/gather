import { Camera } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import {
  Circle,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../lib/hooks/useAuth'
import { getDeviceTimezone } from '../../lib/utils'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const initials = `${user?.firstName?.[0]?.toUpperCase() ?? '?'}${user?.lastName?.[0]?.toUpperCase() ?? ''}`

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
          title="Edit Profile"
          onBack={() => router.back()}
        />

        {/* Avatar */}
        <YStack alignItems="center" marginBottom="$4">
          <YStack position="relative">
            <Circle size={80} backgroundColor="$primary">
              <Text fontSize={32} color="$primaryForeground" fontWeight="600">
                {initials}
              </Text>
            </Circle>
            <Circle
              size={28}
              backgroundColor="$backgroundHover"
              borderWidth={2}
              borderColor="$background"
              position="absolute"
              bottom={0}
              right={0}
            >
              <Camera size={14} color="$color" />
            </Circle>
          </YStack>
          <Text color="$colorMuted" fontSize={12} marginTop="$2">
            Tap to change photo
          </Text>
        </YStack>

        {/* Form */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Name</Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  justifyContent="center"
                >
                  <Text color="$colorMuted" fontSize={14}>{user?.fullName ?? 'Unknown'}</Text>
                </YStack>
                <Text color="$colorMuted" fontSize={11}>
                  Name is provided by Apple and cannot be changed
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Email</Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  justifyContent="center"
                >
                  <Text color="$colorMuted" fontSize={14}>{user?.email ?? 'No email'}</Text>
                </YStack>
                <Text color="$colorMuted" fontSize={11}>
                  Email is provided by Apple and cannot be changed
                </Text>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Account Info */}
        <Theme name="Card">
          <Card>
            <Text fontWeight="500" fontSize={14} marginBottom="$3">
              Account Information
            </Text>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>User ID</Text>
                <Text numberOfLines={1} maxWidth={150} fontSize={13}>
                  {user?.userId?.slice(0, 8)}...
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>Timezone</Text>
                <Text fontSize={13}>{getDeviceTimezone()}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>Invite Code</Text>
                <Text fontWeight="600" fontSize={13}>
                  {user?.inviteCode ?? 'N/A'}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </Theme>
      </ScrollView>
    </YStack>
  )
}
