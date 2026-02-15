import {
  AlertTriangle,
  Calendar,
  MoreHorizontal,
  ShieldBan,
  UserMinus,
} from "@tamagui/lucide-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Linking } from "react-native";
import {
  Circle,
  H1,
  ScrollView,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
  Sheet,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { BackHeader } from "../../components/ui/ScreenHeader";
import {
  useFriends,
  useRemoveFriend,
  useBlockFriend,
  useBusyTimes,
  useEvents,
} from "../../lib/hooks";

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showActionSheet, setShowActionSheet] = useState(false);

  const { data: friendsData, isLoading } = useFriends();

  // Calculate date range for free time query (next 7 days)
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, []);

  // Query busy times for this friend, compute 30-min free time slots client-side
  const friendUserIds = useMemo(() => (id ? [id] : []), [id]);
  const { data: freeTimeSlots } = useBusyTimes(
    friendUserIds,
    dateRange.start,
    dateRange.end,
    30,
  );
  const { data: events } = useEvents();
  const removeFriend = useRemoveFriend();
  const blockFriend = useBlockFriend();

  // Find the specific friend
  const friend = useMemo(() => {
    if (!friendsData?.friends || !id) return null;
    return friendsData.friends.find((f) => f.friendId === id) ?? null;
  }, [friendsData, id]);

  // Get this friend's free time slots (from the new API, already computed)
  const friendFreeSlots = freeTimeSlots ?? [];

  // Get shared events with this friend
  const sharedEvents = useMemo(() => {
    if (!events || !id) return [];
    return events.filter(
      (event) =>
        event.invitees.some((i) => i.userId === id) &&
        event.status !== "cancelled"
    );
  }, [events, id]);

  const handleRemoveFriend = () => {
    Alert.alert(
      "Remove Friend",
      "Are you sure you want to remove this friend? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setShowActionSheet(false); // Close sheet to show loading feedback
            try {
              await removeFriend.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error("Failed to remove friend:", err);
            }
          },
        },
      ]
    );
  };

  const handleInviteToEvent = () => {
    setShowActionSheet(false);
    router.push("/(tabs)/plan");
  };

  const handleBlockUser = () => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? They will no longer be able to see your profile or invite you to events.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setShowActionSheet(false);
            try {
              await blockFriend.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error("Failed to block user:", err);
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    setShowActionSheet(false);
    const displayName = friend?.friend.fullName ?? "this user";
    Alert.alert(
      "Report User",
      `Report ${displayName} for inappropriate behavior? This will send a report to our team for review.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            const subject = encodeURIComponent(`Report User: ${displayName}`);
            const body = encodeURIComponent(
              `I would like to report the user "${displayName}" (ID: ${id}) for the following reason:\n\n[Please describe the issue here]`
            );
            Linking.openURL(`mailto:support@gather.app?subject=${subject}&body=${body}`);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="large" color="$color" />
      </YStack>
    );
  }

  if (!friend) {
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
          Friend not found
        </Text>
        <Text color="$colorMuted" textAlign="center" marginTop="$2">
          This person may no longer be in your friends list.
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

  const displayName = friend.friend.fullName;
  const initials = friend.friend.initials;

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
            <Button
              variant="ghost"
              buttonSize="sm"
              circular
              icon={<MoreHorizontal size={20} />}
              onPress={() => setShowActionSheet(true)}
            />
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
          <Text color="$colorMuted" fontSize={13}>
            Friends since {formatDate(friend.acceptedAt ?? friend.createdAt)}
          </Text>
        </YStack>

        {/* Quick Actions */}
        <XStack gap="$2" marginBottom="$4">
          <Button
            variant="primary"
            flex={1}
            icon={<Calendar size={16} color="$primaryForeground" />}
            onPress={handleInviteToEvent}
          >
            Invite to Event
          </Button>
        </XStack>

        {/* Free Time Section */}
        <YStack marginBottom="$4">
          <Text fontWeight="500" fontSize={14} marginBottom="$3">
            Available This Week
          </Text>
          {friendFreeSlots.length === 0 ? (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2">
                  <Text color="$colorMuted" fontSize={13} textAlign="center">
                    No availability this week
                  </Text>
                </YStack>
              </Card>
            </Theme>
          ) : (
            <YStack gap="$2">
              {friendFreeSlots.slice(0, 5).map((slot, index) => (
                <Theme key={`${slot.startTime}-${index}`} name="Card">
                  <Card>
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        width={3}
                        height={36}
                        borderRadius={2}
                        backgroundColor="$success"
                      />
                      <YStack flex={1}>
                        <Text fontWeight="500" fontSize={14}>
                          Free
                        </Text>
                        <Text color="$colorMuted" fontSize={12}>
                          {formatDate(slot.startTime)} •{" "}
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          )}
        </YStack>

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
                        <Text fontSize={20}>{event.emoji ?? "📅"}</Text>
                      </Circle>
                      <YStack flex={1}>
                        <Text fontWeight="600">{event.title}</Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {formatDate(event.startTime)} at{" "}
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
              icon={
                <UserMinus size={16} color="$destructiveForeground" />
              }
              onPress={handleRemoveFriend}
              loading={removeFriend.isPending}
              loadingText="Removing..."
            >
              Remove Friend
            </Button>
            <Button
              variant="destructive"
              fullWidth
              icon={
                <ShieldBan size={16} color="$destructiveForeground" />
              }
              onPress={handleBlockUser}
              loading={blockFriend.isPending}
              loadingText="Blocking..."
            >
              Block User
            </Button>
            <Button
              variant="destructive"
              fullWidth
              icon={
                <AlertTriangle size={16} color="$destructiveForeground" />
              }
              onPress={handleReportUser}
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
