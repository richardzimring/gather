import { Check, Users } from '@tamagui/lucide-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { ScrollView, Circle, Text, Theme, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import type { UserSearchResult } from '../../lib/api/client';
import { useMatchContacts, useSendFriendRequest } from '../../lib/hooks';
import { ContactsPermissionError, getContactPhones } from '../../lib/contacts';
import { haptic } from '../../lib/haptics';

type Step = 'intro' | 'loading' | 'results' | 'denied';

export default function DiscoverFriendsScreen() {
  const insets = useSafeAreaInsets();
  const matchContacts = useMatchContacts();
  const sendFriendRequest = useSendFriendRequest();

  const [step, setStep] = useState<Step>('intro');
  const [matches, setMatches] = useState<UserSearchResult[]>([]);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const handleFindFriends = async () => {
    setStep('loading');
    setAddError(null);
    try {
      const phones = await getContactPhones();
      const users = await matchContacts.mutateAsync(phones);
      haptic.success();
      setMatches(users);
      setStep('results');
    } catch (error) {
      if (error instanceof ContactsPermissionError) {
        setStep('denied');
      } else {
        console.error('Failed to find friends from contacts:', error);
        setStep('results');
        setMatches([]);
      }
    }
  };

  const handleAdd = async (userId: string) => {
    setPendingUserId(userId);
    setAddError(null);
    try {
      await sendFriendRequest.mutateAsync({ friendUserId: userId });
      haptic.success();
      setRequested((prev) => new Set(prev).add(userId));
    } catch {
      haptic.error();
      setAddError('Could not send friend request. Please try again.');
    } finally {
      setPendingUserId(null);
    }
  };

  const isResults = step === 'results';

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader title="Find Friends" />

        <Theme name="Card">
          <Card>
            <YStack gap="$3" alignItems="center" paddingVertical="$2">
              <Circle size={48} backgroundColor="$secondary">
                <Users size={22} color="$color" />
              </Circle>

              {isResults ? (
                <>
                  <Text fontSize={16} fontWeight="600" textAlign="center">
                    Checked your contacts
                  </Text>
                  <Text color="$colorMuted" fontSize={13} textAlign="center">
                    {matches.length === 0
                      ? 'No one from your contacts is on Gather yet.'
                      : `Found ${matches.length} ${matches.length === 1 ? 'person' : 'people'} on Gather.`}
                  </Text>
                </>
              ) : (
                <>
                  <Text fontSize={16} fontWeight="600" textAlign="center">
                    See who&apos;s already on Gather
                  </Text>
                  <Text color="$colorMuted" fontSize={13} textAlign="center">
                    We&apos;ll check your contacts against Gather. Your contacts
                    are only used to find matches and are never stored or
                    shared.
                  </Text>
                </>
              )}

              {step === 'intro' && (
                <Button variant="primary" fullWidth onPress={handleFindFriends}>
                  Find Friends from Contacts
                </Button>
              )}

              {step === 'loading' && (
                <YStack alignItems="center" padding="$3" gap="$2">
                  <Spinner size="small" color="$color" />
                  <Text color="$colorMuted" fontSize={13}>
                    Checking your contacts...
                  </Text>
                </YStack>
              )}

              {step === 'denied' && (
                <YStack gap="$2" alignItems="center">
                  <Text color="$colorMuted" fontSize={13} textAlign="center">
                    Contacts access is off. Turn it on in Settings to find
                    friends.
                  </Text>
                  <Button
                    variant="outline"
                    fullWidth
                    onPress={() => Linking.openSettings()}
                  >
                    Open Settings
                  </Button>
                </YStack>
              )}
            </YStack>
          </Card>
        </Theme>

        {isResults && (
          <YStack marginTop="$4" gap="$2">
            {addError && (
              <Text color="$destructive" fontSize={13} textAlign="center">
                {addError}
              </Text>
            )}

            {matches.length === 0 ? (
              <YStack alignItems="center" padding="$5" gap="$3">
                <Text color="$colorMuted" fontSize={14} textAlign="center">
                  Invite friends to join you on Gather so you can plan together.
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={() => router.push('/invite-contact?type=friend')}
                >
                  Invite by Text
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  // This screen is only reachable from /friends/add, which has
                  // the code/QR — go back instead of stacking another copy.
                  onPress={() => router.back()}
                >
                  Share Your Code
                </Button>
              </YStack>
            ) : (
              <Theme name="Card">
                <Card>
                  <YStack gap="$1">
                    {matches.map((u) => {
                      const added = requested.has(u.userId);
                      return (
                        <XStack
                          key={u.userId}
                          alignItems="center"
                          gap="$3"
                          paddingVertical="$2"
                        >
                          <Circle size={40} backgroundColor="$backgroundHover">
                            <Text fontSize={14} fontWeight="600">
                              {u.initials}
                            </Text>
                          </Circle>
                          <Text flex={1} fontWeight="500">
                            {u.fullName}
                          </Text>
                          {added ? (
                            <XStack alignItems="center" gap="$1">
                              <Check size={16} color="$success" />
                              <Text color="$success" fontSize={13}>
                                Sent
                              </Text>
                            </XStack>
                          ) : (
                            <Button
                              variant="outline"
                              buttonSize="sm"
                              onPress={() => handleAdd(u.userId)}
                              loading={pendingUserId === u.userId}
                              disabled={pendingUserId !== null}
                            >
                              Add
                            </Button>
                          )}
                        </XStack>
                      );
                    })}
                  </YStack>
                </Card>
              </Theme>
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
