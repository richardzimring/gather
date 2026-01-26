import { Camera } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'
import {
  Circle,
  Input,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../lib/hooks/useAuth'
import { patchUsersMe } from '../../lib/api/client'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, refreshUser } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = displayName?.[0]?.toUpperCase() ?? user?.displayName?.[0]?.toUpperCase() ?? '?'

  const hasChanges = displayName !== user?.displayName

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await patchUsersMe({
        body: {
          displayName: displayName.trim(),
        },
      })

      if (response.data?.success) {
        await refreshUser()
        router.back()
      } else {
        setError('Failed to update profile')
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      )
    } else {
      router.back()
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
        <BackHeader
          title="Edit Profile"
          onBack={handleCancel}
          rightAction={
            <Button
              variant="ghost"
              buttonSize="sm"
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Text
                color={hasChanges ? '$accent' : '$colorMuted'}
                fontWeight="600"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Button>
          }
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
                <Text fontWeight="500">Display Name</Text>
                <Input
                  placeholder="How friends will see you"
                  placeholderTextColor="$colorMuted"
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text)
                    setError(null)
                  }}
                  backgroundColor="$backgroundHover"
                  borderColor={error ? '$error' : '$borderColor'}
                  borderWidth={1}
                  borderRadius="$3"
                  paddingHorizontal="$4"
                  height={48}
                />
                {error && (
                  <Text color="$error" fontSize={13}>
                    {error}
                  </Text>
                )}
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
                  Email cannot be changed
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
