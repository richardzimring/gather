import {
  Copy,
  QrCode,
  Send,
  Share2,
  UserPlus,
  Users,
} from '@tamagui/lucide-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Circle, Input, Text, Theme, XStack, YStack } from 'tamagui';
import { Spinner } from '../../components/ui/Spinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { useFriendCode, useSendFriendRequest } from '../../lib/hooks';
import { haptic } from '../../lib/haptics';
import { FRIEND_INVITE_SHARE_MESSAGE } from '../../lib/inviteMessages';

function SectionHeader({ children }: { children: string }) {
  return (
    <Text fontWeight="600" fontSize={16} marginTop="$2" marginBottom="$3">
      {children}
    </Text>
  );
}

export default function AddFriendScreen() {
  const insets = useSafeAreaInsets();
  const { data: friendCodeData, isLoading: isLoadingCode } = useFriendCode();
  const sendFriendRequest = useSendFriendRequest();

  const [friendCode, setFriendCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const myFriendCode = friendCodeData?.inviteCode ?? '';
  const myInviteLink = friendCodeData?.inviteLink ?? '';

  const handleCopyCode = async () => {
    if (!myFriendCode) return;

    await Clipboard.setStringAsync(myFriendCode);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!myInviteLink) return;
    try {
      await Share.share({
        url: myInviteLink,
        message: FRIEND_INVITE_SHARE_MESSAGE,
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const handleAddFriend = async () => {
    const cleanCode = friendCode.trim().toUpperCase();

    if (!cleanCode) {
      setError('Please enter a friend code');
      return;
    }

    if (cleanCode.length < 6) {
      setError('Friend code is too short');
      return;
    }

    setError(null);

    try {
      await sendFriendRequest.mutateAsync({ inviteCode: cleanCode });
      haptic.success();
      Alert.alert(
        'Friend Request Sent',
        'Your friend request has been sent. They will see it in their requests.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      haptic.error();
      setError(
        'Failed to send friend request. Please check the code and try again.',
      );
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        bottomOffset={16}
      >
        <BackHeader title="Add Friend" />

        <SectionHeader>Find People</SectionHeader>
        <YStack gap="$3" marginBottom="$4">
          <Theme name="Card">
            <Card
              pressable
              onPress={() => {
                haptic.light();
                router.push('/friends/discover');
              }}
            >
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  <Users size={18} color="$color" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Find Friends from Contacts
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    See who you know that&apos;s already on Gather
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </Theme>

          <Theme name="Card">
            <Card
              pressable
              onPress={() => {
                haptic.light();
                router.push('/invite-contact?type=friend');
              }}
            >
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  <Send size={18} color="$color" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Invite Someone New
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Text a friend an invite to join you on Gather
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </Theme>

          <Theme name="Card">
            <Card
              pressable
              onPress={() => {
                haptic.light();
                router.push('/friends/scan');
              }}
            >
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  <QrCode size={18} color="$color" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Scan a Friend&apos;s Code
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Point your camera at their Gather QR code
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </Theme>
        </YStack>

        <SectionHeader>Have a Code?</SectionHeader>
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  <UserPlus size={18} color="$color" />
                </Circle>
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={16}>
                    Enter Friend Code
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    Ask your friend for their friend code
                  </Text>
                </YStack>
              </XStack>

              <YStack gap="$2">
                <Input
                  placeholder="Enter code (e.g., ABC123)"
                  placeholderTextColor="$colorMuted"
                  value={friendCode}
                  onChangeText={(text) => {
                    setFriendCode(text.toUpperCase());
                    setError(null);
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
                disabled={sendFriendRequest.isPending || !friendCode.trim()}
              >
                {sendFriendRequest.isPending
                  ? 'Sending...'
                  : 'Send Friend Request'}
              </Button>
            </YStack>
          </Card>
        </Theme>

        <SectionHeader>Your Invite</SectionHeader>
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
                    <Text fontSize={20} fontWeight="600" letterSpacing={2}>
                      {myFriendCode || '------'}
                    </Text>
                  </YStack>

                  {myInviteLink ? (
                    <YStack alignItems="center" paddingVertical="$2">
                      <YStack
                        backgroundColor="$background"
                        borderWidth={1}
                        borderColor="$borderColor"
                        padding="$3"
                        borderRadius="$3"
                      >
                        <YStack
                          backgroundColor="#ffffff"
                          padding="$2"
                          borderRadius="$2"
                        >
                          <QRCode
                            value={myInviteLink}
                            size={160}
                            color="#000000"
                            backgroundColor="#ffffff"
                          />
                        </YStack>
                      </YStack>
                      <Text
                        color="$colorMuted"
                        fontSize={12}
                        marginTop="$2"
                        textAlign="center"
                      >
                        Have a friend scan this to add you
                      </Text>
                    </YStack>
                  ) : null}

                  <XStack gap="$2">
                    <Button
                      variant="outline"
                      flex={1}
                      icon={<Copy size={14} />}
                      onPress={handleCopyCode}
                      disabled={!myFriendCode}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="primary"
                      flex={1}
                      icon={<Share2 size={14} color="$primaryForeground" />}
                      onPress={handleShare}
                      disabled={!myFriendCode}
                    >
                      Share
                    </Button>
                  </XStack>
                </>
              )}
            </YStack>
          </Card>
        </Theme>

        <YStack marginTop="$4" alignItems="center">
          <Text color="$colorMuted" fontSize={12} textAlign="center">
            Friend requests must be accepted before you can see each
            other&apos;s availability and create events together.
          </Text>
        </YStack>
      </KeyboardAwareScrollView>
    </YStack>
  );
}
