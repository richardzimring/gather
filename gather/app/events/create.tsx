import { useState, useMemo } from "react";
import { router } from "expo-router";
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Theme,
  Input,
  Circle,
  TextArea,
  Separator,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Check, Users, Sparkles, CalendarPlus } from "@tamagui/lucide-icons";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GlassBottomBar } from "../../components/ui/GlassBottomBar";
import { CancelHeader } from "../../components/ui/ScreenHeader";
import {
  useCreateEvent,
  useFriends,
  useActivities,
  useGroups,
} from "../../lib/hooks";
import type { Group, CommitmentType } from "../../lib/api/generated/types.gen";

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
      {checked && <Check size={12} color="$primaryForeground" strokeWidth={3} />}
    </YStack>
  );
}

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeVariant = colorScheme === 'light' ? 'light' as const : 'dark' as const;
  const createEvent = useCreateEvent();
  const { data: friendsData } = useFriends();
  const { data: activities } = useActivities();
  const { data: groups } = useGroups();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // +1 hour
  const [selectedEmoji, setSelectedEmoji] = useState("🎉");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [commitmentType, setCommitmentType] = useState<CommitmentType>("going");

  const friends = friendsData?.friends ?? [];
  const activityList = activities ?? [];

  // Filter groups that have members
  const availableGroups = useMemo(() => {
    return (groups ?? []).filter((g) => g.memberIds.length > 0);
  }, [groups]);

  const handleCreate = async () => {
    if (!title.trim() || selectedFriends.length === 0) return;

    try {
      await createEvent.mutateAsync({
        title: title.trim(),
        emoji: selectedEmoji,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        inviteeIds: selectedFriends,
        commitmentType,
      });
      router.back();
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleGroup = (group: Group) => {
    // Check if all members are currently selected
    const allSelected = group.memberIds.every((id) =>
      selectedFriends.includes(id)
    );

    if (allSelected) {
      // Deselect all group members
      setSelectedFriends((prev) =>
        prev.filter((id) => !group.memberIds.includes(id))
      );
    } else {
      // Select all group members (avoiding duplicates)
      setSelectedFriends((prev) => {
        const newSet = new Set([...prev, ...group.memberIds]);
        return Array.from(newSet);
      });
    }
  };

  const isGroupFullySelected = (group: Group) => {
    return group.memberIds.every((id) => selectedFriends.includes(id));
  };

  const isGroupPartiallySelected = (group: Group) => {
    const selectedCount = group.memberIds.filter((id) =>
      selectedFriends.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < group.memberIds.length;
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <CancelHeader title="Create Event" />

        {/* Commitment Type Toggle */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text fontWeight="500" fontSize={14} marginBottom="$3">
              What kind of event is this?
            </Text>
            <XStack gap="$2">
              <YStack
                flex={1}
                padding="$3"
                borderRadius="$2"
                borderWidth={1}
                borderColor={
                  commitmentType === "going" ? "$primary" : "$borderColor"
                }
                backgroundColor={
                  commitmentType === "going" ? "$secondary" : "transparent"
                }
                alignItems="center"
                gap="$2"
                pressStyle={{ scale: 0.99 }}
                onPress={() => setCommitmentType("going")}
              >
                <Sparkles
                  size={20}
                  color={commitmentType === "going" ? "$color" : "$colorMuted"}
                />
                <Text
                  fontWeight="500"
                  fontSize={13}
                  color={commitmentType === "going" ? "$color" : "$colorMuted"}
                >
                  I am going
                </Text>
                <Text fontSize={11} color="$colorMuted" textAlign="center">
                  I will be there, join me!
                </Text>
              </YStack>
              <YStack
                flex={1}
                padding="$3"
                borderRadius="$2"
                borderWidth={1}
                borderColor={
                  commitmentType === "planning" ? "$primary" : "$borderColor"
                }
                backgroundColor={
                  commitmentType === "planning"
                    ? "$secondary"
                    : "transparent"
                }
                alignItems="center"
                gap="$2"
                pressStyle={{ scale: 0.99 }}
                onPress={() => setCommitmentType("planning")}
              >
                <CalendarPlus
                  size={20}
                  color={
                    commitmentType === "planning" ? "$color" : "$colorMuted"
                  }
                />
                <Text
                  fontWeight="500"
                  fontSize={13}
                  color={commitmentType === "planning" ? "$color" : "$colorMuted"}
                >
                  Propose
                </Text>
                <Text fontSize={11} color="$colorMuted" textAlign="center">
                  Propose an idea
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Theme>

        {/* Activity/Emoji Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text fontWeight="500" fontSize={14} marginBottom="$3">
              What are you doing?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$2">
                {activityList.map((activity, index) => (
                  <YStack
                    key={activity.emoji + index}
                    alignItems="center"
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    backgroundColor={
                      selectedEmoji === activity.emoji
                        ? "$primary"
                        : "$backgroundHover"
                    }
                    borderRadius="$2"
                    pressStyle={{ scale: 0.98 }}
                    onPress={() => setSelectedEmoji(activity.emoji)}
                  >
                    <Text fontSize={20}>{activity.emoji}</Text>
                    <Text
                      fontSize={10}
                      color={
                        selectedEmoji === activity.emoji
                          ? "$primaryForeground"
                          : "$colorMuted"
                      }
                      marginTop="$1"
                    >
                      {activity.name}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </ScrollView>
          </Card>
        </Theme>

        {/* Event Details */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Title</Text>
                <Input
                  placeholder="What's the plan?"
                  placeholderTextColor="$colorMuted"
                  value={title}
                  onChangeText={setTitle}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  fontSize={14}
                />
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Location (optional)</Text>
                <Input
                  placeholder="Where?"
                  placeholderTextColor="$colorMuted"
                  value={location}
                  onChangeText={setLocation}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  fontSize={14}
                />
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Notes (optional)</Text>
                <TextArea
                  placeholder="Any details..."
                  placeholderTextColor="$colorMuted"
                  value={notes}
                  onChangeText={setNotes}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  padding="$3"
                  height={72}
                  fontSize={14}
                />
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Time Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text fontWeight="600" marginBottom="$3">
              When?
            </Text>
            <YStack gap="$3">
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted">Start</Text>
                <DateTimePicker
                  value={startTime}
                  mode="datetime"
                  onChange={(_, date) => date && setStartTime(date)}
                  themeVariant={themeVariant}
                />
              </XStack>
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted">End</Text>
                <DateTimePicker
                  value={endTime}
                  mode="datetime"
                  onChange={(_, date) => date && setEndTime(date)}
                  themeVariant={themeVariant}
                />
              </XStack>
            </YStack>
          </Card>
        </Theme>

        {/* Group Selection */}
        {availableGroups.length > 0 && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <Users size={16} color="$colorMuted" />
                <Text fontWeight="500" fontSize={14}>Invite a Group</Text>
              </XStack>
              <YStack gap="$2">
                {availableGroups.map((group) => (
                  <XStack
                    key={group.groupId}
                    alignItems="center"
                    gap="$3"
                    paddingVertical="$2"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => toggleGroup(group)}
                  >
                    <YStack
                      width={20}
                      height={20}
                      borderRadius={4}
                      borderWidth={1}
                      borderColor={
                        isGroupFullySelected(group)
                          ? "$primary"
                          : isGroupPartiallySelected(group)
                          ? "$primary"
                          : "$borderColor"
                      }
                      backgroundColor={
                        isGroupFullySelected(group) ? "$primary" : "transparent"
                      }
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isGroupFullySelected(group) && (
                        <Check size={12} color="$primaryForeground" strokeWidth={3} />
                      )}
                      {isGroupPartiallySelected(group) && (
                        <YStack
                          width={6}
                          height={6}
                          borderRadius={2}
                          backgroundColor="$primary"
                        />
                      )}
                    </YStack>
                    <Circle size={32} backgroundColor="$backgroundHover">
                      <Text fontSize={14}>{group.emoji ?? "👥"}</Text>
                    </Circle>
                    <YStack flex={1}>
                      <Text fontWeight="500" fontSize={14}>{group.name}</Text>
                      <Text color="$colorMuted" fontSize={12}>
                        {group.memberIds.length} members
                      </Text>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </Card>
          </Theme>
        )}

        {/* Friend Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginBottom="$3"
            >
              <Text fontWeight="500" fontSize={14}>Who is invited?</Text>
              {selectedFriends.length > 0 && (
                <Text color="$color" fontSize={13} fontWeight="500">
                  {selectedFriends.length} selected
                </Text>
              )}
            </XStack>
            {friends.length === 0 ? (
              <YStack alignItems="center" padding="$4" gap="$3">
                <Text fontSize={32}>👋</Text>
                <Text color="$colorMuted" textAlign="center">
                  Add some friends first to invite them to events
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
                {friends.map((friendship, index) => (
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
                      <Circle size={40} backgroundColor="$backgroundHover">
                        <Text fontWeight="500">
                          {friendship.friend.initials}
                        </Text>
                      </Circle>
                      <YStack flex={1}>
                        <Text fontWeight="500">
                          {friendship.friend.fullName}
                        </Text>
                      </YStack>
                    </XStack>
                    {index < friends.length - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
              </YStack>
            )}
          </Card>
        </Theme>

      </ScrollView>

      {/* Glass bottom bar for create action */}
      <GlassBottomBar>
        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={handleCreate}
          disabled={
            !title.trim() ||
            selectedFriends.length === 0 ||
            createEvent.isPending
          }
        >
          {createEvent.isPending
            ? "Creating..."
            : commitmentType === "going"
            ? "Send Invitation"
            : "Propose Event"}
        </Button>
      </GlassBottomBar>
    </YStack>
  );
}
