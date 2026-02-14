import {
  ChevronRight,
  Users,
  CalendarDays,
  Plus,
  Check,
  Clock,
} from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl } from "react-native";
import {
  H1,
  H2,
  Text,
  XStack,
  YStack,
  Theme,
  ScrollView,
  Circle,
  Separator,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GlassButton } from "../../components/ui/GlassFAB";
import {
  useFriends,
  useFriendsFreeTime,
  useGroups,
  useRefresh,
} from "../../lib/hooks";

type DateRange = "this_week" | "next_week" | "custom";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Get start and end dates for a date range
 */
function getDateRangeFromSelection(range: DateRange): {
  start: Date;
  end: Date;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  const end = new Date(today);

  if (range === "this_week") {
    // Get to end of this week (Sunday)
    const daysUntilSunday = 7 - today.getDay();
    end.setDate(end.getDate() + daysUntilSunday);
  } else if (range === "next_week") {
    // Start from next Monday
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    start.setDate(start.getDate() + daysUntilMonday);
    end.setDate(start.getDate() + 6);
  } else {
    // Custom - default to next 14 days
    end.setDate(end.getDate() + 14);
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (compareDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }

  return `${DAYS_SHORT[date.getDay()]}, ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

/**
 * Types for free time slots
 */
interface TimeSlot {
  date: Date;
  startTime: Date;
  endTime: Date;
  friendIds: string[];
}

interface FreeTimeSlot {
  startTime: string;
  endTime: string;
}

interface FriendFreeTime {
  userId: string;
  freeSlots: FreeTimeSlot[];
}

/**
 * Find overlapping free time slots for selected friends.
 * The backend returns computed free time (24/7 minus blocked windows).
 */
function findCommonFreeTime(
  friendsFreeTime: FriendFreeTime[],
  selectedFriendIds: string[],
  dateRange: { start: Date; end: Date }
): TimeSlot[] {
  if (selectedFriendIds.length === 0) return [];

  // Filter to only selected friends
  const selectedFriendsData = friendsFreeTime.filter((f) =>
    selectedFriendIds.includes(f.userId)
  );

  if (selectedFriendsData.length === 0) return [];

  // Flatten all free time slots with their friend IDs
  interface FlatSlot {
    userId: string;
    startTime: Date;
    endTime: Date;
  }

  const allSlots: FlatSlot[] = [];
  for (const friend of selectedFriendsData) {
    for (const slot of friend.freeSlots) {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);

      // Only include slots within the date range
      if (end > dateRange.start && start < dateRange.end) {
        allSlots.push({
          userId: friend.userId,
          startTime: new Date(Math.max(start.getTime(), dateRange.start.getTime())),
          endTime: new Date(Math.min(end.getTime(), dateRange.end.getTime())),
        });
      }
    }
  }

  // Find overlapping slots across all selected friends
  const resultSlots: TimeSlot[] = [];
  const slotsByDate = new Map<string, TimeSlot[]>();

  for (const slot of allSlots) {
    const dateKey = slot.startTime.toDateString();
    const existingSlots = slotsByDate.get(dateKey) ?? [];

    // Check if this slot overlaps with existing slots
    let merged = false;
    for (const existing of existingSlots) {
      // Check for overlap
      const overlapStart = new Date(
        Math.max(slot.startTime.getTime(), existing.startTime.getTime())
      );
      const overlapEnd = new Date(
        Math.min(slot.endTime.getTime(), existing.endTime.getTime())
      );

      if (overlapStart < overlapEnd) {
        // There is an overlap - add friend to existing slot
        if (!existing.friendIds.includes(slot.userId)) {
          existing.friendIds.push(slot.userId);
        }
        // Shrink to the overlap
        existing.startTime = overlapStart;
        existing.endTime = overlapEnd;
        merged = true;
        break;
      }
    }

    if (!merged) {
      existingSlots.push({
        date: new Date(
          slot.startTime.getFullYear(),
          slot.startTime.getMonth(),
          slot.startTime.getDate()
        ),
        startTime: slot.startTime,
        endTime: slot.endTime,
        friendIds: [slot.userId],
      });
    }

    slotsByDate.set(dateKey, existingSlots);
  }

  // Flatten and sort by number of friends (descending) then by date
  slotsByDate.forEach((slots) => {
    resultSlots.push(...slots);
  });

  return resultSlots
    .filter((slot) => slot.friendIds.length > 0)
    .sort((a, b) => {
      // Sort by friend count (more friends first)
      if (b.friendIds.length !== a.friendIds.length) {
        return b.friendIds.length - a.friendIds.length;
      }
      // Then by date
      return a.startTime.getTime() - b.startTime.getTime();
    })
    .slice(0, 5); // Top 5 suggestions
}

/**
 * Checkbox component
 */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <YStack
      width={20}
      height={20}
      borderRadius={4}
      borderWidth={1}
      borderColor={checked ? "$primary" : "$borderColor"}
      backgroundColor={checked ? "$primary" : "transparent"}
      alignItems="center"
      justifyContent="center"
    >
      {checked && (
        <Check size={12} color="$primaryForeground" strokeWidth={3} />
      )}
    </YStack>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("this_week");

  const { data: friendsData } = useFriends();
  const { data: groups } = useGroups();

  // Calculate date range for free time query
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getDateRangeFromSelection(dateRange),
    [dateRange]
  );

  const freeTimeQuery = useFriendsFreeTime(
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );
  const { data: friendsFreeTime } = freeTimeQuery;
  const { isRefreshing, onRefresh } = useRefresh(freeTimeQuery);

  const friends = useMemo(
    () => friendsData?.friends ?? [],
    [friendsData?.friends]
  );
  const availableGroups = useMemo(
    () => (groups ?? []).filter((g) => g.memberIds.length > 0),
    [groups]
  );

  // Find common free time slots
  const suggestedSlots = useMemo(() => {
    if (!friendsFreeTime || selectedFriends.length === 0) return [];
    return findCommonFreeTime(friendsFreeTime, selectedFriends, {
      start: rangeStart,
      end: rangeEnd,
    });
  }, [friendsFreeTime, selectedFriends, rangeStart, rangeEnd]);

  // Get friend name map for display
  const friendNameMap = useMemo(() => {
    const map = new Map<string, string>();
    friends.forEach((f) => {
      map.set(f.friendId, f.friend.firstName ?? f.friend.fullName);
    });
    return map;
  }, [friends]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleGroup = (memberIds: string[]) => {
    const allSelected = memberIds.every((id) => selectedFriends.includes(id));

    if (allSelected) {
      setSelectedFriends((prev) =>
        prev.filter((id) => !memberIds.includes(id))
      );
    } else {
      setSelectedFriends((prev) => {
        const newSet = new Set([...prev, ...memberIds]);
        return Array.from(newSet);
      });
    }
  };

  const createEventWithSlot = (slot: TimeSlot) => {
    // Navigate to create with pre-filled data
    // For now just go to create, we can add query params later
    router.push("/events/create");
  };

  const navigateToCreate = () => {
    router.push("/events/create");
  };

  return (
    <YStack flex={1} backgroundColor="$background">
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
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$5"
        >
          <H1 fontSize={28} fontWeight="700">
            Plan
          </H1>
          <GlassButton
            icon={<Plus size={20} color="$color" />}
            onPress={navigateToCreate}
          />
        </XStack>

        {/* Date Range Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <CalendarDays size={16} color="$colorMuted" />
              <Text fontWeight="500" fontSize={14}>
                When are you thinking?
              </Text>
            </XStack>
            <XStack gap="$2">
              {(["this_week", "next_week", "custom"] as DateRange[]).map(
                (range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? "primary" : "secondary"}
                    buttonSize="sm"
                    flex={1}
                    onPress={() => setDateRange(range)}
                  >
                    {range === "this_week"
                      ? "This Week"
                      : range === "next_week"
                      ? "Next Week"
                      : "2 Weeks"}
                  </Button>
                )
              )}
            </XStack>
          </Card>
        </Theme>

        {/* Friend Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$3"
            >
              <XStack alignItems="center" gap="$2">
                <Users size={16} color="$colorMuted" />
                <Text fontWeight="500" fontSize={14}>
                  Who do you want to see?
                </Text>
              </XStack>
              {selectedFriends.length > 0 && (
                <Text color="$color" fontSize={13} fontWeight="500">
                  {selectedFriends.length} selected
                </Text>
              )}
            </XStack>

            {/* Quick group selection */}
            {availableGroups.length > 0 && (
              <YStack marginBottom="$3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap="$2">
                    {availableGroups.map((group) => {
                      const allSelected = group.memberIds.every((id) =>
                        selectedFriends.includes(id)
                      );
                      return (
                        <YStack
                          key={group.groupId}
                          paddingVertical="$2"
                          paddingHorizontal="$3"
                          backgroundColor={
                            allSelected ? "$primary" : "$backgroundHover"
                          }
                          borderRadius="$2"
                          pressStyle={{ scale: 0.98 }}
                          onPress={() => toggleGroup(group.memberIds)}
                        >
                          <XStack alignItems="center" gap="$2">
                            <Text fontSize={14}>{group.emoji ?? "👥"}</Text>
                            <Text
                              fontSize={13}
                              fontWeight="500"
                              color={
                                allSelected ? "$primaryForeground" : "$color"
                              }
                            >
                              {group.name}
                            </Text>
                          </XStack>
                        </YStack>
                      );
                    })}
                  </XStack>
                </ScrollView>
                <Separator marginTop="$3" />
              </YStack>
            )}

            {/* Friend list */}
            {friends.length === 0 ? (
              <YStack alignItems="center" padding="$4" gap="$3">
                <Text fontSize={32}>👋</Text>
                <Text color="$colorMuted" textAlign="center">
                  Add friends to start planning together
                </Text>
                <Button
                  variant="secondary"
                  buttonSize="sm"
                  onPress={() => router.push("/friends/add")}
                >
                  Add Friends
                </Button>
              </YStack>
            ) : (
              <YStack gap="$1">
                {friends.slice(0, 5).map((friendship, index) => (
                  <YStack key={friendship.friendId}>
                    <XStack
                      alignItems="center"
                      gap="$3"
                      paddingVertical="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => toggleFriend(friendship.friendId)}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friendship.friendId)}
                      />
                      <Circle size={36} backgroundColor="$backgroundHover">
                        <Text fontWeight="500" fontSize={14}>
                          {friendship.friend.initials}
                        </Text>
                      </Circle>
                      <Text fontWeight="500" flex={1}>
                        {friendship.friend.fullName}
                      </Text>
                    </XStack>
                    {index < Math.min(friends.length, 5) - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
                {friends.length > 5 && (
                  <Button
                    variant="ghost"
                    buttonSize="sm"
                    onPress={() => router.push("/(tabs)/friends")}
                  >
                    View all {friends.length} friends
                  </Button>
                )}
              </YStack>
            )}
          </Card>
        </Theme>

        {/* Suggested Times */}
        <YStack>
          <H2 fontSize={18} fontWeight="600" marginBottom="$3">
            {selectedFriends.length === 0
              ? "Select friends to find times"
              : suggestedSlots.length > 0
              ? "Suggested times"
              : "No overlapping availability found"}
          </H2>

          {selectedFriends.length > 0 && suggestedSlots.length === 0 && (
            <Theme name="Card">
              <Card>
                <YStack alignItems="center" padding="$2" gap="$2">
                  <Clock size={32} color="$colorMuted" />
                  <Text color="$colorMuted" textAlign="center">
                    No shared free time found{" "}
                    {dateRange === "this_week"
                      ? "this week"
                      : dateRange === "next_week"
                      ? "next week"
                      : "in the next 2 weeks"}
                  </Text>
                </YStack>
              </Card>
            </Theme>
          )}

          {suggestedSlots.length > 0 && (
            <YStack gap="$3">
              {suggestedSlots.map((slot, index) => {
                const friendNames = slot.friendIds
                  .map((id) => friendNameMap.get(id) ?? "Friend")
                  .join(", ");
                const isEveryoneAvailable =
                  slot.friendIds.length === selectedFriends.length;

                return (
                  <Theme key={index} name="Card">
                    <Card pressable onPress={() => createEventWithSlot(slot)}>
                      <YStack gap="$2">
                        <XStack
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Text fontWeight="600" fontSize={16}>
                            {formatDate(slot.date)}
                          </Text>
                          {isEveryoneAvailable && (
                            <XStack
                              backgroundColor="$successSubtle"
                              paddingHorizontal="$2"
                              paddingVertical="$1"
                              borderRadius="$2"
                            >
                              <Text
                                fontSize={11}
                                color="$success"
                                fontWeight="600"
                              >
                                Everyone free
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                        <Text color="$colorMuted" fontSize={14}>
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </Text>
                        <Text color="$colorMuted" fontSize={13}>
                          {isEveryoneAvailable
                            ? "All selected friends"
                            : friendNames}
                        </Text>
                        <XStack
                          alignItems="center"
                          justifyContent="flex-end"
                          marginTop="$2"
                        >
                          <Text color="$color" fontSize={13} fontWeight="500">
                            Plan for this time
                          </Text>
                          <ChevronRight size={14} color="$color" />
                        </XStack>
                      </YStack>
                    </Card>
                  </Theme>
                );
              })}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
