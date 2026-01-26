import {
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
} from '@tamagui/lucide-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import {
  Circle,
  H1,
  ScrollView,
  Separator,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
  Sheet,
  Input,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import {
  useGroups,
  useFriends,
  useUpdateGroup,
  useDeleteGroup,
} from '../../lib/hooks'
import type { Friendship } from '../../lib/api/generated/types.gen'

/**
 * Get display name for a friend
 */
function getFriendDisplayName(friendship: Friendship): string {
  if (friendship.customName) {
    return friendship.customName
  }
  return `Friend ${friendship.friendId.slice(0, 6).toUpperCase()}`
}

/**
 * Get initials for avatar
 */
function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name[0].toUpperCase()
}

export default function GroupDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showAddMemberSheet, setShowAddMemberSheet] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')

  const { data: groups, isLoading } = useGroups()
  const { data: friendsData } = useFriends()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()

  const friends = useMemo(() => friendsData?.friends ?? [], [friendsData])

  // Find the specific group
  const group = useMemo(() => {
    if (!groups || !id) return null
    return groups.find((g) => g.groupId === id) ?? null
  }, [groups, id])

  // Get members with friend details
  const members = useMemo(() => {
    if (!group) return []
    return group.memberIds
      .map((memberId) => friends.find((f) => f.friendId === memberId))
      .filter((f): f is Friendship => f !== undefined)
  }, [group, friends])

  // Get non-members (friends who can be added)
  const nonMembers = useMemo(() => {
    if (!group) return []
    return friends.filter((f) => !group.memberIds.includes(f.friendId))
  }, [group, friends])

  const handleEditGroup = () => {
    if (!group) return
    setEditName(group.name)
    setEditEmoji(group.emoji ?? '')
    setShowActionSheet(false)
    setShowEditSheet(true)
  }

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return
    try {
      await updateGroup.mutateAsync({
        groupId: id,
        data: {
          name: editName.trim(),
          emoji: editEmoji || undefined,
        },
      })
      setShowEditSheet(false)
    } catch (err) {
      console.error('Failed to update group:', err)
    }
  }

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return
            try {
              await deleteGroup.mutateAsync(id)
              router.back()
            } catch (err) {
              console.error('Failed to delete group:', err)
            }
          },
        },
      ]
    )
  }

  const handleAddMember = async (friendId: string) => {
    if (!group || !id) return
    try {
      await updateGroup.mutateAsync({
        groupId: id,
        data: {
          memberIds: [...group.memberIds, friendId],
        },
      })
    } catch (err) {
      console.error('Failed to add member:', err)
    }
  }

  const handleRemoveMember = async (friendId: string) => {
    if (!group || !id) return
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateGroup.mutateAsync({
                groupId: id,
                data: {
                  memberIds: group.memberIds.filter((m) => m !== friendId),
                },
              })
            } catch (err) {
              console.error('Failed to remove member:', err)
            }
          },
        },
      ]
    )
  }

  const handleInviteGroupToEvent = () => {
    setShowActionSheet(false)
    router.push('/events/create')
  }

  if (isLoading) {
    return (
      <DottedGridBackground>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$accent" />
        </YStack>
      </DottedGridBackground>
    )
  }

  if (!group) {
    return (
      <DottedGridBackground>
        <YStack
          flex={1}
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
          <Button variant="secondary" marginTop="$4" onPress={() => router.back()}>
            Go Back
          </Button>
        </YStack>
      </DottedGridBackground>
    )
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
          title=""
          marginBottom="$1"
          rightAction={
            <Button
              variant="ghost"
              buttonSize="sm"
              circular
              icon={<MoreHorizontal size={22} />}
              onPress={() => setShowActionSheet(true)}
            />
          }
        />

        {/* Group Header */}
        <YStack alignItems="center" marginBottom="$5">
          <Circle size={100} backgroundColor="$accent" opacity={0.15} marginBottom="$3">
            <Text fontSize={48}>{group.emoji ?? '👥'}</Text>
          </Circle>
          <H1 fontSize={24} fontWeight="700" textAlign="center">
            {group.name}
          </H1>
          <Text color="$colorMuted" fontSize={14}>
            {group.memberIds.length} members
          </Text>
          {group.isDefault && (
            <Text color="$accent" fontSize={12} marginTop="$1">
              Default Group
            </Text>
          )}
        </YStack>

        {/* Quick Actions */}
        <XStack gap="$3" marginBottom="$5">
          <Button
            variant="primary"
            flex={1}
            icon={<Calendar size={18} color="white" />}
            onPress={handleInviteGroupToEvent}
          >
            Invite to Event
          </Button>
          <Button
            variant="secondary"
            flex={1}
            icon={<UserPlus size={18} />}
            onPress={() => setShowAddMemberSheet(true)}
          >
            Add Member
          </Button>
        </XStack>

        {/* Members Section */}
        <Theme name="Card">
          <Card>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontWeight="600" fontSize={16}>
                Members
              </Text>
              <Text color="$colorMuted" fontSize={13}>
                {members.length} people
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
                  const displayName = getFriendDisplayName(member)
                  return (
                    <YStack key={member.friendId}>
                      <XStack alignItems="center" gap="$3" paddingVertical="$2">
                        <Circle size={44} backgroundColor="$backgroundHover">
                          <Text fontWeight="500">{getInitials(displayName)}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="500">{displayName}</Text>
                        </YStack>
                        <Button
                          variant="ghost"
                          buttonSize="sm"
                          circular
                          icon={<UserMinus size={18} color="$error" />}
                          onPress={() => handleRemoveMember(member.friendId)}
                        />
                      </XStack>
                      {index < members.length - 1 && (
                        <Separator marginVertical="$1" />
                      )}
                    </YStack>
                  )
                })}
              </YStack>
            )}
          </Card>
        </Theme>
      </ScrollView>

      {/* Action Sheet */}
      <Sheet
        open={showActionSheet}
        onOpenChange={setShowActionSheet}
        snapPoints={[45]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$3" marginTop="$4">
            <Button
              variant="secondary"
              fullWidth
              icon={<Calendar size={18} />}
              onPress={handleInviteGroupToEvent}
            >
              Invite Group to Event
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={<UserPlus size={18} />}
              onPress={() => {
                setShowActionSheet(false)
                setShowAddMemberSheet(true)
              }}
            >
              Add Members
            </Button>
            {!group.isDefault && (
              <>
                <Button
                  variant="secondary"
                  fullWidth
                  icon={<Pencil size={18} />}
                  onPress={handleEditGroup}
                >
                  Edit Group
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  icon={<Trash2 size={18} color="white" />}
                  onPress={() => {
                    setShowActionSheet(false)
                    handleDeleteGroup()
                  }}
                >
                  Delete Group
                </Button>
              </>
            )}
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

      {/* Edit Sheet */}
      <Sheet
        open={showEditSheet}
        onOpenChange={setShowEditSheet}
        snapPoints={[50]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$4" marginTop="$4">
            <Text fontSize={20} fontWeight="600">
              Edit Group
            </Text>

            <YStack gap="$2">
              <Text fontWeight="500">Emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {['👥', '💜', '🏠', '💼', '🎾', '🎮', '🍕', '☕', '🎬', '🎵'].map(
                    (emoji) => (
                      <Circle
                        key={emoji}
                        size={48}
                        backgroundColor={
                          editEmoji === emoji ? '$accent' : '$backgroundHover'
                        }
                        pressStyle={{ scale: 0.95 }}
                        onPress={() => setEditEmoji(emoji)}
                      >
                        <Text fontSize={24}>{emoji}</Text>
                      </Circle>
                    )
                  )}
                </XStack>
              </ScrollView>
            </YStack>

            <YStack gap="$2">
              <Text fontWeight="500">Group Name</Text>
              <Input
                placeholder="Group name"
                placeholderTextColor="$colorMuted"
                value={editName}
                onChangeText={setEditName}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
                borderWidth={1}
                borderRadius="$3"
                paddingHorizontal="$4"
                height={48}
              />
            </YStack>

            <XStack gap="$3">
              <Button
                variant="secondary"
                flex={1}
                onPress={() => setShowEditSheet(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                flex={1}
                onPress={handleSaveEdit}
                disabled={!editName.trim() || updateGroup.isPending}
              >
                {updateGroup.isPending ? 'Saving...' : 'Save'}
              </Button>
            </XStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>

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
                    const displayName = getFriendDisplayName(friend)
                    return (
                      <XStack
                        key={friend.friendId}
                        alignItems="center"
                        gap="$3"
                        paddingVertical="$2"
                      >
                        <Circle size={44} backgroundColor="$backgroundHover">
                          <Text fontWeight="500">{getInitials(displayName)}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="500">{displayName}</Text>
                        </YStack>
                        <Button
                          variant="primary"
                          buttonSize="sm"
                          onPress={() => handleAddMember(friend.friendId)}
                          disabled={updateGroup.isPending}
                        >
                          Add
                        </Button>
                      </XStack>
                    )
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
    </DottedGridBackground>
  )
}
