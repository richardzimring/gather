import { Calendar, Trash2, UserMinus, UserPlus } from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import {
  Circle,
  ScrollView,
  Separator,
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
import { GlassButton } from '../../components/ui/GlassFAB';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { SkeletonBar, SkeletonCircle } from '../../components/ui/Skeleton';
import {
  useGroups,
  useFriends,
  useUpdateGroup,
  useDeleteGroup,
} from '../../lib/hooks';
import type { FriendWithUser } from '../../lib/api/generated/types.gen';

type Friendship = FriendWithUser;

export default function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showAddMemberSheet, setShowAddMemberSheet] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  const { data: groups, isLoading } = useGroups();
  const { data: friendsData } = useFriends();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const friends = useMemo(() => friendsData?.friends ?? [], [friendsData]);

  // Find the specific group
  const group = useMemo(() => {
    if (!groups || !id) return null;
    return groups.find((g) => g.groupId === id) ?? null;
  }, [groups, id]);

  // Get members with friend details
  const members = useMemo(() => {
    if (!group) return [];
    return group.memberIds
      .map((memberId) => friends.find((f) => f.friendId === memberId))
      .filter((f): f is Friendship => f !== undefined);
  }, [group, friends]);

  // Get non-members (friends who can be added)
  const nonMembers = useMemo(() => {
    if (!group) return [];
    return friends.filter((f) => !group.memberIds.includes(f.friendId));
  }, [group, friends]);

  const handleDeleteGroup = () => {
    if (!id || !group) return;

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error('Failed to delete group:', err);
            }
          },
        },
      ],
    );
  };

  const handleAddMember = async (friendId: string) => {
    if (!group || !id) return;
    setPendingMemberId(friendId);
    try {
      await updateGroup.mutateAsync({
        groupId: id,
        data: {
          memberIds: [...group.memberIds, friendId],
        },
      });
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setPendingMemberId(null);
    }
  };

  const handleRemoveMember = async (friendId: string) => {
    if (!group || !id) return;
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setPendingMemberId(friendId);
            try {
              await updateGroup.mutateAsync({
                groupId: id,
                data: {
                  memberIds: group.memberIds.filter((m) => m !== friendId),
                },
              });
            } catch (err) {
              console.error('Failed to remove member:', err);
            } finally {
              setPendingMemberId(null);
            }
          },
        },
      ],
    );
  };

  const handleInviteGroupToEvent = () => {
    if (group && group.memberIds.length > 0) {
      router.push({
        pathname: '/(tabs)/plan',
        params: { selectedFriendIds: group.memberIds.join(',') },
      });
    } else {
      router.push('/(tabs)/plan');
    }
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

          {/* Group Header Skeleton */}
          <YStack alignItems="center" marginBottom="$4">
            <SkeletonCircle size={80} style={{ marginBottom: 12 }} />
            <YStack gap="$1" alignItems="center">
              <SkeletonBar width={140} height={20} />
              <SkeletonBar width={80} height={13} />
            </YStack>
          </YStack>

          {/* Quick Actions Skeleton */}
          <XStack gap="$2" marginBottom="$4">
            <SkeletonBar width={175} height={44} borderRadius={8} />
            <SkeletonBar width={175} height={44} borderRadius={8} />
          </XStack>

          {/* Members Section Skeleton */}
          <Theme name="Card">
            <Card>
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$3"
              >
                <SkeletonBar width={80} height={16} />
                <SkeletonBar width={60} height={13} />
              </XStack>

              <YStack>
                {[1, 2, 3, 4].map((i, index) => (
                  <YStack key={i}>
                    <XStack alignItems="center" gap="$3" paddingVertical="$2">
                      <SkeletonCircle size={44} />
                      <YStack flex={1}>
                        <SkeletonBar width={130} height={14} />
                      </YStack>
                      <SkeletonCircle size={32} />
                    </XStack>
                    {index < 3 && <Separator marginVertical="$1" />}
                  </YStack>
                ))}
              </YStack>
            </Card>
          </Theme>
        </ScrollView>
      </YStack>
    );
  }

  if (!group) {
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
          Group not found
        </Text>
        <Text color="$colorMuted" textAlign="center" marginTop="$2">
          This group may have been deleted.
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
          title=""
          marginBottom="$1"
          rightAction={
            <GlassButton
              icon={
                <Trash2
                  size={18}
                  color={group.isDefault ? '$colorMuted' : '$error'}
                />
              }
              onPress={handleDeleteGroup}
              size={36}
              disabled={group.isDefault}
            />
          }
        />

        {/* Group Header */}
        <YStack alignItems="center" marginBottom="$4" gap="$2">
          <Circle size={80} backgroundColor="$backgroundHover">
            <Text fontSize={36}>{group.emoji ?? '👥'}</Text>
          </Circle>
          <Text fontSize={20} fontWeight="600" textAlign="center">
            {group.name}
          </Text>
          {group.isDefault && (
            <Text color="$color" fontSize={11} marginTop="$1">
              Default Group
            </Text>
          )}
          <Text color="$colorMuted" fontSize={13}>
            {group.memberIds.length} members
          </Text>
        </YStack>

        {/* Quick Actions */}
        <XStack gap="$2" marginBottom="$4">
          <Button
            variant="primary"
            flex={1}
            icon={<Calendar size={16} color="$primaryForeground" />}
            onPress={handleInviteGroupToEvent}
          >
            Invite to Event
          </Button>
          <Button
            variant="secondary"
            flex={1}
            icon={<UserPlus size={16} />}
            onPress={() => setShowAddMemberSheet(true)}
            disabled={group.isDefault}
          >
            Add Member
          </Button>
        </XStack>

        {/* Members Section */}
        <Theme name="Card">
          <Card>
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginBottom="$3"
            >
              <Text fontWeight="600" fontSize={16}>
                Members
              </Text>
              <Text color="$colorMuted" fontSize={13}>
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </Text>
            </XStack>

            {members.length === 0 ? (
              <YStack alignItems="center" padding="$4">
                <Text color="$colorMuted" textAlign="center">
                  No members yet. Add friends to this group!
                </Text>
              </YStack>
            ) : (
              <YStack>
                {members.map((member, index) => {
                  return (
                    <YStack key={member.friendId}>
                      <XStack alignItems="center" gap="$3" paddingVertical="$2">
                        <Circle size={44} backgroundColor="$backgroundHover">
                          <Text fontWeight="500">{member.friend.initials}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="500">{member.friend.fullName}</Text>
                        </YStack>
                        <Button
                          variant="ghost"
                          buttonSize="sm"
                          circular
                          icon={
                            pendingMemberId === member.friendId ? undefined : (
                              <UserMinus size={18} color="$error" />
                            )
                          }
                          onPress={() => handleRemoveMember(member.friendId)}
                          loading={pendingMemberId === member.friendId}
                          disabled={pendingMemberId !== null || group.isDefault}
                        />
                      </XStack>
                      {index < members.length - 1 && (
                        <Separator marginVertical="$1" />
                      )}
                    </YStack>
                  );
                })}
              </YStack>
            )}
          </Card>
        </Theme>
      </ScrollView>

      {/* Add Member Sheet */}
      <Sheet
        open={showAddMemberSheet}
        onOpenChange={setShowAddMemberSheet}
        snapPoints={[60]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$4" marginTop="$4" flex={1}>
            <Text fontSize={20} fontWeight="600">
              Add Members
            </Text>

            {nonMembers.length === 0 ? (
              <YStack alignItems="center" padding="$6">
                <Text color="$colorMuted" textAlign="center">
                  All your friends are already in this group!
                </Text>
              </YStack>
            ) : (
              <ScrollView>
                <YStack gap="$2">
                  {nonMembers.map((friend) => {
                    return (
                      <XStack
                        key={friend.friendId}
                        alignItems="center"
                        gap="$3"
                        paddingVertical="$2"
                      >
                        <Circle size={44} backgroundColor="$backgroundHover">
                          <Text fontWeight="500">{friend.friend.initials}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="500">{friend.friend.fullName}</Text>
                        </YStack>
                        <Button
                          variant="primary"
                          buttonSize="sm"
                          onPress={() => handleAddMember(friend.friendId)}
                          loading={pendingMemberId === friend.friendId}
                          disabled={pendingMemberId !== null}
                        >
                          Add
                        </Button>
                      </XStack>
                    );
                  })}
                </YStack>
              </ScrollView>
            )}

            <Button
              variant="ghost"
              fullWidth
              onPress={() => setShowAddMemberSheet(false)}
            >
              Done
            </Button>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
