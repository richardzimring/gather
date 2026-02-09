import { Copy, Share2, UserPlus } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Share, Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import {
  Circle,
  Input,
  ScrollView,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useInviteCode, useSendFriendRequest } from '../../lib/hooks'

export default function AddFriendScreen() {
  const insets = useSafeAreaInsets()
  const { data: inviteCodeData, isLoading: isLoadingCode } = useInviteCode()
  const sendFriendRequest = useSendFriendRequest()

  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const myInviteCode = inviteCodeData?.inviteCode ?? ''

  const handleCopyCode = async () => {
    if (!myInviteCode) return
    
    await Clipboard.setStringAsync(myInviteCode)
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hey, add me on Gather! My invite code is: ${myInviteCode}`,
      })
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  const handleAddFriend = async () => {
    const cleanCode = inviteCode.trim().toUpperCase()
    
    if (!cleanCode) {
      setError('Please enter an invite code')
      return
    }

    if (cleanCode.length < 6) {
      setError('Invite code is too short')
      return
    }

    setError(null)

    try {
      await sendFriendRequest.mutateAsync({ inviteCode: cleanCode })
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      Alert.alert(
        'Friend Request Sent',
        'Your friend request has been sent. They will see it in their requests.',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch {
      setError('Failed to send friend request. Please check the code and try again.')
    }
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
        <BackHeader title="Add Friend" />

        {/* Enter Invite Code Section */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  <UserPlus size={18} color="$color" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Enter Invite Code
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Ask your friend for their invite code
                  </Text>
                </YStack>
              </XStack>

              <YStack gap="$2">
                <Input
                  placeholder="Enter code (e.g., ABC123)"
                  placeholderTextColor="$colorMuted"
                  value={inviteCode}
                  onChangeText={(text) => {
                    setInviteCode(text.toUpperCase())
                    setError(null)
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  backgroundColor="$backgroundHover"
                  borderColor={error ? '$destructive' : '$borderColor'}
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={44}
                  fontSize={16}
                  fontWeight="600"
                  letterSpacing={2}
                  textAlign="center"
                />
                {error && (
                  <Text color="$error" fontSize={13}>
                    {error}
                  </Text>
                )}
              </YStack>

              <Button
                variant="primary"
                fullWidth
                onPress={handleAddFriend}
                disabled={sendFriendRequest.isPending || !inviteCode.trim()}
              >
                {sendFriendRequest.isPending ? 'Sending...' : 'Send Friend Request'}
              </Button>
            </YStack>
          </Card>
        </Theme>

        {/* Your Invite Code Section */}
        <Theme name="Card">
          <Card>
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$successSubtle">
                  <Share2 size={18} color="$success" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="500" fontSize={14}>
                    Share Your Code
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Let others add you as a friend
                  </Text>
                </YStack>
              </XStack>

              {isLoadingCode ? (
                <YStack alignItems="center" padding="$4">
                  <Spinner size="small" color="$color" />
                </YStack>
              ) : (
                <>
                  <YStack
                    backgroundColor="$backgroundHover"
                    borderRadius="$2"
                    padding="$3"
                    alignItems="center"
                  >
                    <Text
                      fontSize={20}
                      fontWeight="600"
                      letterSpacing={2}
                    >
                      {myInviteCode || '------'}
                    </Text>
                  </YStack>

                  <XStack gap="$2">
                    <Button
                      variant="outline"
                      flex={1}
                      icon={<Copy size={14} />}
                      onPress={handleCopyCode}
                      disabled={!myInviteCode}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="primary"
                      flex={1}
                      icon={<Share2 size={14} color="$primaryForeground" />}
                      onPress={handleShare}
                      disabled={!myInviteCode}
                    >
                      Share
                    </Button>
                  </XStack>
                </>
              )}
            </YStack>
          </Card>
        </Theme>

        {/* Help Text */}
        <YStack marginTop="$4" alignItems="center">
          <Text color="$colorMuted" fontSize={12} textAlign="center">
            Friend requests must be accepted before you can see each other&apos;s availability and create events together.
          </Text>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
