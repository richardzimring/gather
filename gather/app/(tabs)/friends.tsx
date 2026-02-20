import { Search, UserPlus, Users as UsersIcon } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import {
  H1,
  Input,
  ScrollView,
  Text,
  XStack,
  YStack,
  Circle,
  Theme,
  useTheme,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GradientBackground } from "../../components/ui/GradientBackground";
import { GlassButton } from "../../components/ui/GlassFAB";
import { SkeletonBar, SkeletonCircle } from "../../components/ui/Skeleton";
import {
  useFriends,
  useGroups,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRefresh,
} from "../../lib/hooks";
import { haptic } from "../../lib/haptics";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "decline" | null
  >(null);

  const useGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  const friendsQuery = useFriends();
  const groupsQuery = useGroups();
  const { data: friendsData, isLoading: isFriendsLoading } = friendsQuery;
  const { data: groups, isLoading: isGroupsLoading } = groupsQuery;
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const { isRefreshing, onRefresh } = useRefresh(friendsQuery, groupsQuery);

  const friends = useMemo(() => friendsData?.friends ?? [], [friendsData]);
  const pendingReceived = friendsData?.pendingReceived ?? [];

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter((f) => {
      const name = f.friend.fullName.toLowerCase();
      return name.includes(query);
    });
  }, [friends, searchQuery]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(query));
  }, [groups, searchQuery]);

  const handleAccept = async (friendId: string) => {
    setPendingRequestId(friendId);
    setPendingAction("accept");
    try {
      await acceptRequest.mutateAsync(friendId);
      haptic.success();
    } catch (err) {
      haptic.error();
      console.error("Failed to accept request:", err);
    } finally {
      setPendingRequestId(null);
      setPendingAction(null);
    }
  };

  const handleDecline = async (friendId: string) => {
    setPendingRequestId(friendId);
    setPendingAction("decline");
    try {
      await declineRequest.mutateAsync(friendId);
    } catch (err) {
      haptic.error();
      console.error("Failed to decline request:", err);
    } finally {
      setPendingRequestId(null);
      setPendingAction(null);
    }
  };

  const navigateToFriend = (friendId: string) => {
    router.push(`/friends/${friendId}` as const);
  };

  const navigateToGroup = (groupId: string) => {
    router.push(`/groups/${groupId}` as const);
  };

  const searchBar = (
    <XStack alignItems="center" paddingHorizontal="$3" height={36}>
      <Search size={16} color="$colorMuted" />
      <Input
        flex={1}
        placeholder={`Search ${activeTab}...`}
        placeholderTextColor="$colorMuted"
        backgroundColor="transparent"
        borderWidth={0}
        fontSize={14}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </XStack>
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      <GradientBackground />
      {/* Scrollable content with header */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.val}
            colors={[theme.color.val]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <YStack gap="$3" paddingBottom="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H1 fontSize={28} fontWeight="700">
              Friends
            </H1>
            <GlassButton
              icon={<UserPlus size={20} color="$color" />}
              onPress={() => router.push("/friends/add")}
            />
          </XStack>

          {/* Glass search bar */}
          {useGlass ? (
            <GlassView style={glassStyles.searchBar}>{searchBar}</GlassView>
          ) : (
            <XStack
              backgroundColor="$backgroundHover"
              borderRadius="$2"
              overflow="hidden"
            >
              {searchBar}
            </XStack>
          )}

          {/* Tab Bar */}
          <XStack gap="$1">
            <XStack
              flex={1}
              backgroundColor={
                activeTab === "friends" ? "$primary" : "transparent"
              }
              borderRadius="$2"
              paddingVertical="$2"
              justifyContent="center"
              alignItems="center"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => {
                haptic.selection();
                setActiveTab("friends");
              }}
            >
              <Text
                color={
                  activeTab === "friends" ? "$primaryForeground" : "$colorMuted"
                }
                fontWeight="500"
                fontSize={14}
              >
                All Friends
              </Text>
            </XStack>
            <XStack
              flex={1}
              backgroundColor={
                activeTab === "groups" ? "$primary" : "transparent"
              }
              borderRadius="$2"
              paddingVertical="$2"
              justifyContent="center"
              alignItems="center"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => {
                haptic.selection();
                setActiveTab("groups");
              }}
            >
              <Text
                color={
                  activeTab === "groups" ? "$primaryForeground" : "$colorMuted"
                }
                fontWeight="500"
                fontSize={14}
              >
                Groups
              </Text>
            </XStack>
            <XStack
              flex={1}
              backgroundColor={
                activeTab === "requests" ? "$primary" : "transparent"
              }
              borderRadius="$2"
              paddingVertical="$2"
              justifyContent="center"
              alignItems="center"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => {
                haptic.selection();
                setActiveTab("requests");
              }}
              gap="$2"
            >
              <Text
                color={
                  activeTab === "requests"
                    ? "$primaryForeground"
                    : "$colorMuted"
                }
                fontWeight="500"
                fontSize={14}
              >
                Requests
              </Text>
              {pendingReceived.length > 0 && (
                <Circle size={16} backgroundColor="$destructive">
                  <Text
                    color="$destructiveForeground"
                    fontSize={10}
                    fontWeight="600"
                  >
                    {pendingReceived.length}
                  </Text>
                </Circle>
              )}
            </XStack>
          </XStack>
        </YStack>
        {/* Tab Content */}
        {activeTab === "friends" && (
          <YStack gap="$3">
            {isFriendsLoading ? (
              // Skeleton loading
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Theme key={i} name="Card">
                    <Card>
                      <XStack alignItems="center" gap="$3">
                        <SkeletonCircle size={48} />
                        <YStack flex={1} gap="$2">
                          <SkeletonBar width={120} height={14} />
                          <SkeletonBar width={80} height={13} />
                        </YStack>
                      </XStack>
                    </Card>
                  </Theme>
                ))}
              </>
            ) : filteredFriends.length === 0 ? (
              <Theme name="Card">
                <Card>
                  <YStack alignItems="center" padding="$4" gap="$3">
                    <Text color="$colorMuted" textAlign="center">
                      {searchQuery ? "No friends found" : "No friends yet"}
                    </Text>
                  </YStack>
                </Card>
              </Theme>
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
                        <Text fontWeight="600">
                          {friendship.friend.fullName}
                        </Text>
                        <Text color="$colorMuted" fontSize={13}>
                          Tap to view profile
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))
            )}
          </YStack>
        )}

        {activeTab === "groups" && (
          <YStack gap="$3">
            {isGroupsLoading ? (
              // Skeleton loading
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Theme key={i} name="Card">
                    <Card>
                      <XStack alignItems="center" gap="$3">
                        <SkeletonCircle size={48} />
                        <YStack flex={1} gap="$2">
                          <SkeletonBar width={140} height={14} />
                          <SkeletonBar width={70} height={13} />
                        </YStack>
                        <SkeletonBar width={20} height={20} borderRadius={4} />
                      </XStack>
                    </Card>
                  </Theme>
                ))}
              </>
            ) : filteredGroups.length === 0 ? (
              <Theme name="Card">
                <Card>
                  <YStack alignItems="center" padding="$4" gap="$3">
                    <Text color="$colorMuted" textAlign="center">
                      {searchQuery ? "No groups found" : "No groups yet"}
                    </Text>
                    {!searchQuery && (
                      <Button
                        variant="primary"
                        onPress={() => router.push("/groups/create" as const)}
                      >
                        Create Group
                      </Button>
                    )}
                  </YStack>
                </Card>
              </Theme>
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
                          <Text fontSize={22}>{group.emoji ?? "👥"}</Text>
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
                  onPress={() => router.push("/groups/create" as const)}
                >
                  Create New Group
                </Button>
              </>
            )}
          </YStack>
        )}

        {activeTab === "requests" && (
          <YStack gap="$3">
            {isFriendsLoading ? (
              // Skeleton loading
              <>
                {[1, 2, 3].map((i) => (
                  <Theme key={i} name="Card">
                    <Card>
                      <YStack gap="$3">
                        <XStack alignItems="center" gap="$3">
                          <SkeletonCircle size={48} />
                          <YStack flex={1} gap="$2">
                            <SkeletonBar width={130} height={14} />
                            <SkeletonBar width={110} height={13} />
                          </YStack>
                        </XStack>
                        <XStack gap="$2">
                          <SkeletonBar
                            width={150}
                            height={36}
                            borderRadius={8}
                          />
                          <SkeletonBar
                            width={150}
                            height={36}
                            borderRadius={8}
                          />
                        </XStack>
                      </YStack>
                    </Card>
                  </Theme>
                ))}
              </>
            ) : pendingReceived.length === 0 ? (
              <Theme name="Card">
                <Card>
                  <YStack alignItems="center" padding="$4" gap="$2">
                    <Text color="$colorMuted" textAlign="center">
                      No pending requests
                    </Text>
                  </YStack>
                </Card>
              </Theme>
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
                          <Text fontWeight="600">
                            {request.friend.fullName}
                          </Text>
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
                          loading={
                            pendingRequestId === request.friendId &&
                            pendingAction === "accept"
                          }
                          disabled={pendingRequestId !== null}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          buttonSize="sm"
                          flex={1}
                          onPress={() => handleDecline(request.friendId)}
                          loading={
                            pendingRequestId === request.friendId &&
                            pendingAction === "decline"
                          }
                          disabled={pendingRequestId !== null}
                        >
                          Decline
                        </Button>
                      </XStack>
                    </YStack>
                  </Card>
                </Theme>
              ))
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

const glassStyles = StyleSheet.create({
  searchBar: {
    borderRadius: 12,
    overflow: "hidden",
  },
});
