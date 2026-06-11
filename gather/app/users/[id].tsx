import {
  AlertTriangle,
  Calendar,
  Check,
  MoreHorizontal,
  ShieldBan,
  UserMinus,
  UserPlus,
} from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import {
  Circle,
  H1,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
  Sheet,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BadgeLabel } from '../../components/ui/Badge';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { SkeletonBar, SkeletonCircle } from '../../components/ui/Skeleton';
import {
  useFriends,
  useRemoveFriend,
  useBlockFriend,
  useReportUser,
  useEvents,
  useUserProfile,
  useSendFriendRequest,
  useAcceptFriendRequest,
} from '../../lib/hooks';
import { haptic } from '../../lib/haptics';
import { formatDate, formatTime } from '../../lib/utils';

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ?? '';
  const [showActionSheet, setShowActionSheet] = useState(false);

  const { data: friendsData } = useFriends();
  const { data: events } = useEvents();
  const { data: profile, isLoading, isError, refetch } = useUserProfile(userId);
  const removeFriend = useRemoveFriend();
  const blockFriend = useBlockFriend();
  const reportUser = useReportUser();
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();

  const relationship = profile?.relationship ?? 'none';
  const isFriend = relationship === 'friends';

  // Friend record (only present when already friends) — used for the
  // "Friends since" date and the friend-management actions.
  const friend = useMemo(() => {
    if (!friendsData?.friends || !userId) return null;
    return friendsData.friends.find((f) => f.friendId === userId) ?? null;
  }, [friendsData, userId]);

  // Shared events (as host or invitee), excluding cancelled.
  const sharedEvents = useMemo(() => {
    if (!events || !userId) return [];
    return events.filter(
      (event) =>
        (event.hostId === userId ||
          event.invitees.some((i) => i.userId === userId)) &&
        event.status !== 'cancelled',
    );
  }, [events, userId]);

  const handleAddFriend = async () => {
    haptic.medium();
    try {
      await sendFriendRequest.mutateAsync({ friendUserId: userId });
      haptic.success();
      await refetch();
    } catch (err) {
      haptic.error();
      Alert.alert(
        'Could Not Send Request',
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const handleAcceptRequest = async () => {
    haptic.medium();
    try {
      await acceptFriendRequest.mutateAsync(userId);
      haptic.success();
      await refetch();
    } catch (err) {
      haptic.error();
      Alert.alert(
        'Could Not Accept Request',
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const handleRemoveFriend = () => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setShowActionSheet(false); // Close sheet to show loading feedback
            try {
              await removeFriend.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error('Failed to remove friend:', err);
            }
          },
        },
      ],
    );
  };

  const handleInviteToEvent = () => {
    setShowActionSheet(false);
    router.push({
      pathname: '/(tabs)/plan',
      params: { selectedFriendIds: id },
    });
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will no longer be able to see your profile or invite you to events.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setShowActionSheet(false);
            try {
              await blockFriend.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error('Failed to block user:', err);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleReportUser = () => {
    setShowActionSheet(false);
    const displayName = profile?.fullName ?? 'this user';
    Alert.alert(
      'Report User',
      `Report ${displayName} for inappropriate behavior? This will send a report to our team for review.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await reportUser.mutateAsync(id);
              Alert.alert(
                'Report Submitted',
                'Thank you. Your report has been sent to our team for review.',
              );
            } catch (err) {
              console.error('Failed to report user:', err);
              Alert.alert(
                'Error',
                'Failed to submit report. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
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
          <BackHeader title="" marginBottom="$1" />

          {/* Profile Header Skeleton */}
          <YStack alignItems="center" marginBottom="$4">
            <SkeletonCircle size={80} style={{ marginBottom: 12 }} />
            <YStack gap="$1" alignItems="center">
              <SkeletonBar width={150} height={20} />
              <SkeletonBar width={120} height={13} />
            </YStack>
          </YStack>

          {/* Quick Actions Skeleton */}
          <XStack gap="$2" marginBottom="$4">
            <SkeletonBar width={180} height={44} borderRadius={8} />
          </XStack>

          {/* Shared Events Section Skeleton */}
          <YStack>
            <SkeletonBar width={120} height={16} style={{ marginBottom: 12 }} />
            <YStack gap="$3">
              {[1, 2].map((i) => (
                <Theme key={i} name="Card">
                  <Card>
                    <XStack alignItems="center" gap="$3">
                      <SkeletonCircle size={44} />
                      <YStack flex={1} gap="$1">
                        <SkeletonBar width={140} height={14} />
                        <SkeletonBar width={120} height={13} />
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  if (isError || !profile) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$4"
      >
        <Text fontSize={48} marginBottom="$4">
          😕
        </Text>
        <Text fontSize={18} fontWeight="600" textAlign="center">
          {isError ? 'Could not load profile' : 'User not found'}
        </Text>
        <Button
          variant="secondary"
          marginTop="$4"
          onPress={() => router.back()}
        >
          Go Back
        </Button>
      </YStack>
    );
  }

  const displayName = profile.fullName;
  const initials = profile.initials;

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header — overflow menu for anyone except yourself */}
        <BackHeader
          title=""
          marginBottom="$1"
          rightAction={
            relationship !== 'self' ? (
              <Button
                variant="ghost"
                buttonSize="sm"
                circular
                icon={<MoreHorizontal size={20} />}
                onPress={() => setShowActionSheet(true)}
              />
            ) : undefined
          }
        />

        {/* Profile Header */}
        <YStack alignItems="center" marginBottom="$4">
          <Circle size={80} backgroundColor="$primary" marginBottom="$3">
            <Text fontSize={32} color="$primaryForeground" fontWeight="600">
              {initials}
            </Text>
          </Circle>
          <H1 fontSize={20} fontWeight="600" textAlign="center">
            {displayName}
          </H1>
          {isFriend && friend && (
            <Text color="$colorMuted" fontSize={13}>
              Friends since {formatDate(friend.acceptedAt ?? friend.createdAt)}
            </Text>
          )}
        </YStack>

        {/* Quick Actions — depend on relationship to this user */}
        <XStack gap="$2" marginBottom="$4">
          {relationship === 'self' ? null : isFriend ? (
            <Button
              variant="primary"
              flex={1}
              icon={<Calendar size={16} color="$primaryForeground" />}
              onPress={handleInviteToEvent}
            >
              Invite to Event
            </Button>
          ) : relationship === 'request_sent' ? (
            <Button variant="secondary" flex={1} disabled>
              Friend Request Sent
            </Button>
          ) : relationship === 'request_received' ? (
            <Button
              variant="primary"
              flex={1}
              icon={<Check size={16} color="$primaryForeground" />}
              onPress={handleAcceptRequest}
              loading={acceptFriendRequest.isPending}
              loadingText="Accepting..."
            >
              Accept Friend Request
            </Button>
          ) : relationship === 'blocked' ? (
            <BadgeLabel variant="error">Blocked</BadgeLabel>
          ) : (
            <Button
              variant="primary"
              flex={1}
              icon={<UserPlus size={16} color="$primaryForeground" />}
              onPress={handleAddFriend}
              loading={sendFriendRequest.isPending}
              loadingText="Sending..."
            >
              Add Friend
            </Button>
          )}
        </XStack>

        {/* Shared Events Section */}
        <YStack>
          <Text fontWeight="600" fontSize={16} marginBottom="$3">
            Shared Events
          </Text>
          {sharedEvents.length === 0 ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" textAlign="center">
                    No events together yet
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$3">
              {sharedEvents.slice(0, 5).map((event) => (
                <Theme key={event.eventId} name="Card">
                  <Card
                    pressable
                    onPress={() => router.push(`/events/${event.eventId}`)}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Circle size={44} backgroundColor="$backgroundHover">
                        <Text fontSize={20}>{event.emoji ?? '📅'}</Text>
                      </Circle>
                      <YStack flex={1}>
                        <Text fontWeight="600">{event.title}</Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {formatDate(event.startTime)} at{' '}
                          {formatTime(event.startTime)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Action Sheet */}
      <Sheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        snapPoints={[50]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$3" marginTop="$4">
            {isFriend && (
              <>
                <Button
                  variant="secondary"
                  fullWidth
                  icon={<Calendar size={18} />}
                  onPress={handleInviteToEvent}
                >
                  Invite to Event
                </Button>
                <Button
                  variant="destructive"
                  fullWidth
                  icon={<UserMinus size={16} color="$destructiveForeground" />}
                  onPress={handleRemoveFriend}
                  loading={removeFriend.isPending}
                  loadingText="Removing..."
                >
                  Remove Friend
                </Button>
              </>
            )}
            {relationship !== 'blocked' && (
              <Button
                variant="destructive"
                fullWidth
                icon={<ShieldBan size={16} color="$destructiveForeground" />}
                onPress={handleBlockUser}
                loading={blockFriend.isPending}
                loadingText="Blocking..."
              >
                Block User
              </Button>
            )}
            <Button
              variant="destructive"
              fullWidth
              icon={<AlertTriangle size={16} color="$destructiveForeground" />}
              onPress={handleReportUser}
              loading={reportUser.isPending}
              loadingText="Reporting..."
            >
              Report User
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onPress={() => setShowActionSheet(false)}
            >
              Cancel
            </Button>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
