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
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../lib/hooks/useAuth'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const initial = user?.firstName?.[0]?.toUpperCase() ?? '?'

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
          title="Edit Profile"
          onBack={() => router.back()}
        />

        {/* Avatar */}
        <YStack alignItems="center" marginBottom="$5">
          <YStack position="relative">
            <Circle size={100} backgroundColor="$accent">
              <Text fontSize={40} color="$white" fontWeight="600">
                {initial}
              </Text>
            </Circle>
            <Circle
              size={36}
              backgroundColor="$backgroundHover"
              borderWidth={3}
              borderColor="$background"
              position="absolute"
              bottom={0}
              right={0}
            >
              <Camera size={18} color="$color" />
            </Circle>
          </YStack>
          <Text color="$colorMuted" fontSize={13} marginTop="$2">
            Tap to change photo
          </Text>
        </YStack>

        {/* Form */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$4">
              <YStack gap="$2">
                <Text fontWeight="500">Name</Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$3"
                  paddingHorizontal="$4"
                  height={48}
                  justifyContent="center"
                >
                  <Text color="$colorMuted">{user?.fullName ?? 'Unknown'}</Text>
                </YStack>
                <Text color="$colorMuted" fontSize={12}>
                  Name is provided by Apple and cannot be changed
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500">Email</Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$3"
                  paddingHorizontal="$4"
                  height={48}
                  justifyContent="center"
                >
                  <Text color="$colorMuted">{user?.email ?? 'No email'}</Text>
                </YStack>
                <Text color="$colorMuted" fontSize={12}>
                  Email is provided by Apple and cannot be changed
                </Text>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Account Info */}
        <Theme name="Card">
          <Card>
            <Text fontWeight="600" marginBottom="$3">
              Account Information
            </Text>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$colorMuted">User ID</Text>
                <Text numberOfLines={1} maxWidth={150}>
                  {user?.userId?.slice(0, 8)}...
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted">Timezone</Text>
                <Text>{user?.timezone ?? 'Not set'}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted">Invite Code</Text>
                <Text color="$accent" fontWeight="600">
                  {user?.inviteCode ?? 'N/A'}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </Theme>
      </ScrollView>
    </DottedGridBackground>
  )
}
