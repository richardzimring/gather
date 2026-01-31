import { Search, UserPlus, Users as UsersIcon } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { RefreshControl } from 'react-native'
import {
  H1,
  Input,
  ScrollView,
  Text,
  XStack,
  YStack,
  Circle,
  Theme,
  Tabs,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { EmptyState } from '../../components/common/EmptyState'
import {
  useFriends,
  useGroups,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRefresh,
} from '../../lib/hooks'
export default function FriendsScreen() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'accept' | 'decline' | null>(null)

  const friendsQuery = useFriends()
  const groupsQuery = useGroups()
  const { data: friendsData } = friendsQuery
  const { data: groups } = groupsQuery
  const acceptRequest = useAcceptFriendRequest()
  const declineRequest = useDeclineFriendRequest()
  const { isRefreshing, onRefresh } = useRefresh(friendsQuery, groupsQuery)

  const friends = useMemo(() => friendsData?.friends ?? [], [friendsData])
  const pendingReceived = friendsData?.pendingReceived ?? []

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends
    const query = searchQuery.toLowerCase()
    return friends.filter((f) => {
      const name = f.friend.fullName.toLowerCase()
      return name.includes(query)
    })
  }, [friends, searchQuery])

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!groups) return []
    if (!searchQuery.trim()) return groups
    const query = searchQuery.toLowerCase()
    return groups.filter((g) => g.name.toLowerCase().includes(query))
  }, [groups, searchQuery])

  const handleAccept = async (friendId: string) => {
    setPendingRequestId(friendId)
    setPendingAction('accept')
    try {
      await acceptRequest.mutateAsync(friendId)
    } catch (err) {
      console.error('Failed to accept request:', err)
    } finally {
      setPendingRequestId(null)
      setPendingAction(null)
    }
  }

  const handleDecline = async (friendId: string) => {
    setPendingRequestId(friendId)
    setPendingAction('decline')
    try {
      await declineRequest.mutateAsync(friendId)
    } catch (err) {
      console.error('Failed to decline request:', err)
    } finally {
      setPendingRequestId(null)
      setPendingAction(null)
    }
  }

  const navigateToFriend = (friendId: string) => {
    router.push(`/friends/${friendId}` as const)
  }

  const navigateToGroup = (groupId: string) => {
    router.push(`/groups/${groupId}` as const)
  }

  return (
    <DottedGridBackground>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <H1 fontSize={28} fontWeight="700">
            Friends
          </H1>
          <Button
            variant="ghost"
            buttonSize="sm"
            circular
            icon={<UserPlus size={22} color="$color" />}
            onPress={() => router.push('/friends/add')}
          />
        </XStack>

        {/* Search */}
        <XStack
          backgroundColor="$backgroundHover"
          borderRadius="$3"
          paddingHorizontal="$3"
          alignItems="center"
          marginBottom="$4"
        >
          <Search size={18} color="$colorMuted" />
          <Input
            flex={1}
            placeholder="Search friends..."
            placeholderTextColor="$colorMuted"
            backgroundColor="transparent"
            borderWidth={0}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </XStack>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="horizontal"
          flexDirection="column"
        >
          <Tabs.List marginBottom="$4">
            <Tabs.Tab
              value="friends"
              flex={1}
              backgroundColor={activeTab === 'friends' ? '$accent' : 'transparent'}
              borderRadius="$3"
              paddingVertical="$2"
            >
              <Text
                color={activeTab === 'friends' ? '$white' : '$colorMuted'}
                fontWeight="500"
              >
                All Friends
              </Text>
            </Tabs.Tab>
            <Tabs.Tab
              value="groups"
              flex={1}
              backgroundColor={activeTab === 'groups' ? '$accent' : 'transparent'}
              borderRadius="$3"
              paddingVertical="$2"
            >
              <Text
                color={activeTab === 'groups' ? '$white' : '$colorMuted'}
                fontWeight="500"
              >
                Groups
              </Text>
            </Tabs.Tab>
            <Tabs.Tab
              value="requests"
              flex={1}
              backgroundColor={activeTab === 'requests' ? '$accent' : 'transparent'}
              borderRadius="$3"
              paddingVertical="$2"
            >
              <XStack alignItems="center" gap="$2">
                <Text
                  color={activeTab === 'requests' ? '$white' : '$colorMuted'}
                  fontWeight="500"
                >
                  Requests
                </Text>
                {pendingReceived.length > 0 && (
                  <Circle size={18} backgroundColor="$error">
                    <Text color="$white" fontSize={11} fontWeight="600">
                      {pendingReceived.length}
                    </Text>
                  </Circle>
                )}
              </XStack>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Content value="friends">
            <YStack gap="$3">
              {filteredFriends.length === 0 ? (
                <EmptyState
                  icon={<Text fontSize={48}>👋</Text>}
                  title={searchQuery ? 'No friends found' : 'No friends yet'}
                  description={
                    searchQuery
                      ? 'Try a different search term'
                      : 'Add friends to start planning events together!'
                  }
                  action={
                    !searchQuery && (
                      <Button
                        variant="primary"
                        onPress={() => router.push('/friends/add')}
                      >
                        Add Friends
                      </Button>
                    )
                  }
                />
              ) : (
                filteredFriends.map((friendship) => (
                    <Theme key={friendship.friendId} name="Card">
                      <Card
                        pressable
                        onPress={() => navigateToFriend(friendship.friendId)}
                      >
                        <XStack alignItems="center" gap="$3">
                          <Circle size={48} backgroundColor="$backgroundHover">
                            <Text fontSize={18} fontWeight="500">
                              {friendship.friend.initials}
                            </Text>
                          </Circle>
                          <YStack flex={1}>
                            <Text fontWeight="600">{friendship.friend.fullName}</Text>
                            <Text color="$colorMuted" fontSize={13}>
                              Tap to view profile
                            </Text>
                          </YStack>
                        </XStack>
                      </Card>
                    </Theme>
                  )
                )
              )}
            </YStack>
          </Tabs.Content>

          <Tabs.Content value="groups">
            <YStack gap="$3">
              {filteredGroups.length === 0 ? (
                <EmptyState
                  icon={<Text fontSize={48}>👥</Text>}
                  title={searchQuery ? 'No groups found' : 'No groups yet'}
                  description={
                    searchQuery
                      ? 'Try a different search term'
                      : 'Create groups to easily invite multiple friends to events.'
                  }
                  action={
                    !searchQuery && (
                      <Button
                        variant="primary"
                        onPress={() => router.push('/groups/create' as const)}
                      >
                        Create Group
                      </Button>
                    )
                  }
                />
              ) : (
                <>
                  {filteredGroups.map((group) => (
                    <Theme key={group.groupId} name="Card">
                      <Card
                        pressable
                        onPress={() => navigateToGroup(group.groupId)}
                      >
                        <XStack alignItems="center" gap="$3">
                          <Circle size={48} backgroundColor="$backgroundHover">
                            <Text fontSize={22}>{group.emoji ?? '👥'}</Text>
                          </Circle>
                          <YStack flex={1}>
                            <Text fontWeight="600">{group.name}</Text>
                            <Text color="$colorMuted" fontSize={13}>
                              {group.memberIds.length} members
                            </Text>
                          </YStack>
                          <UsersIcon size={20} color="$colorMuted" />
                        </XStack>
                      </Card>
                    </Theme>
                  ))}
                  <Button
                    variant="secondary"
                    marginTop="$2"
                    onPress={() => router.push('/groups/create' as const)}
                  >
                    Create New Group
                  </Button>
                </>
              )}
            </YStack>
          </Tabs.Content>

          <Tabs.Content value="requests">
            <YStack gap="$3">
              {pendingReceived.length === 0 ? (
                <EmptyState
                  icon={<Text fontSize={48}>📬</Text>}
                  title="No pending requests"
                  description="When someone sends you a friend request, it will appear here."
                />
              ) : (
                pendingReceived.map((request) => (
                    <Theme key={request.friendId} name="Card">
                      <Card>
                        <YStack gap="$3">
                          <XStack alignItems="center" gap="$3">
                            <Circle size={48} backgroundColor="$backgroundHover">
                              <Text fontSize={18} fontWeight="500">
                                {request.friend.initials}
                              </Text>
                            </Circle>
                            <YStack flex={1}>
                              <Text fontWeight="600">{request.friend.fullName}</Text>
                              <Text color="$colorMuted" fontSize={13}>
                                Wants to be your friend
                              </Text>
                            </YStack>
                          </XStack>
                          <XStack gap="$2">
                            <Button
                              variant="primary"
                              buttonSize="sm"
                              flex={1}
                              onPress={() => handleAccept(request.friendId)}
                              loading={pendingRequestId === request.friendId && pendingAction === 'accept'}
                              disabled={pendingRequestId !== null}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              buttonSize="sm"
                              flex={1}
                              onPress={() => handleDecline(request.friendId)}
                              loading={pendingRequestId === request.friendId && pendingAction === 'decline'}
                              disabled={pendingRequestId !== null}
                            >
                              Decline
                            </Button>
                          </XStack>
                        </YStack>
                      </Card>
                    </Theme>
                  )
                )
              )}
            </YStack>
          </Tabs.Content>
        </Tabs>
      </ScrollView>
    </DottedGridBackground>
  )
}
