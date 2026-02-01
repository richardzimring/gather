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
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
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
    <DottedGridBackground>
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
          <Card marginBottom="$5">
            <YStack gap="$4">
              <XStack alignItems="center" gap="$3">
                <Circle size={44} backgroundColor="$accentSubtle">
                  <UserPlus size={22} color="$accent" />
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
                  borderColor={error ? '$error' : '$borderColor'}
                  borderWidth={1}
                  borderRadius="$3"
                  paddingHorizontal="$4"
                  height={52}
                  fontSize={18}
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
            <YStack gap="$4">
              <XStack alignItems="center" gap="$3">
                <Circle size={44} backgroundColor="$successSubtle">
                  <Share2 size={22} color="$success" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Share Your Code
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Let others add you as a friend
                  </Text>
                </YStack>
              </XStack>

              {isLoadingCode ? (
                <YStack alignItems="center" padding="$4">
                  <Spinner size="small" color="$accent" />
                </YStack>
              ) : (
                <>
                  <YStack
                    backgroundColor="$backgroundHover"
                    borderRadius="$3"
                    padding="$4"
                    alignItems="center"
                  >
                    <Text
                      fontSize={28}
                      fontWeight="700"
                      letterSpacing={4}
                      color="$accent"
                    >
                      {myInviteCode || '------'}
                    </Text>
                  </YStack>

                  <XStack gap="$3">
                    <Button
                      variant="secondary"
                      flex={1}
                      icon={<Copy size={18} />}
                      onPress={handleCopyCode}
                      disabled={!myInviteCode}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="primary"
                      flex={1}
                      icon={<Share2 size={18} color="white" />}
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
        <YStack marginTop="$5" alignItems="center">
          <Text color="$colorMuted" fontSize={13} textAlign="center">
            Friend requests must be accepted before you can see each other&apos;s availability and create events together.
          </Text>
        </YStack>
      </ScrollView>
    </DottedGridBackground>
  )
}
