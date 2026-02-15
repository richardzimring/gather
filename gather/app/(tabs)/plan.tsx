import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  CalendarDays,
  Check,
  Clock,
  MoonStar,
  MapPin,
  FileText,
} from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  RefreshControl,
  UIManager,
  Platform,
} from "react-native";
import {
  H1,
  Text,
  XStack,
  YStack,
  Theme,
  ScrollView,
  Circle,
  Separator,
  Switch,
  Input,
  TextArea,
  useTheme,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DayTabBar } from "../../components/ui/DayTabBar";
import { EventCard } from "../../components/ui/EventCard";
import { InlineCalendar, toDateKey } from "../../components/ui/InlineCalendar";
import {
  LocationSearch,
  type PlaceResult,
} from "../../components/ui/LocationSearch";
import { MapPreview } from "../../components/ui/MapPreview";
import {
  TimeChipPicker,
  DURATION_OPTIONS,
  START_TIME_OPTIONS,
} from "../../components/ui/TimeChipPicker";
import {
  useCreateEvent,
  useFriends,
  useFriendsFreeTime,
  useGroups,
  useRefresh,
} from "../../lib/hooks";
import { useAuth } from "../../lib/hooks/useAuth";
import type { LocationData } from "../../lib/api/generated/types.gen";

// Enable LayoutAnimation on Android (no-op on iOS, but safe to call)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================
// Types
// ============================================

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

// ============================================
// Constants
// ============================================

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// DURATION_OPTIONS imported from TimeChipPicker

const MAX_VISIBLE_FRIENDS = 8;

// START_TIME_OPTIONS imported from TimeChipPicker

/** Ungodly hours boundary: before 8 AM or at/after 10 PM */
const UNGODLY_EARLY = 480; // 8:00 AM in minutes
const UNGODLY_LATE = 1320; // 10:00 PM in minutes

// ============================================
// Utility Functions
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "Today";
  if (compareDate.getTime() === tomorrow.getTime()) return "Tomorrow";

  return `${DAYS_SHORT[date.getDay()]}, ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

/**
 * Get the time-of-day period for grouping slots.
 */
function getTimePeriod(date: Date): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Generate all dates in a range (inclusive).
 */
function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (current <= endNorm) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ============================================
// Slot Algorithm: Snapped Suggestions
// ============================================

/**
 * Snap a time up to the next :00 or :30 boundary.
 */
function snapToHalfHour(date: Date): Date {
  const snapped = new Date(date);
  const minutes = snapped.getMinutes();
  if (minutes === 0 || minutes === 30) return snapped;
  if (minutes < 30) {
    snapped.setMinutes(30, 0, 0);
  } else {
    snapped.setHours(snapped.getHours() + 1, 0, 0, 0);
  }
  return snapped;
}

/**
 * Find overlapping free time across selected friends, then generate
 * multiple half-hour-snapped suggestions within each long block.
 *
 * Returns all results grouped by date key.
 */
function findCommonFreeTime(
  friendsFreeTime: FriendFreeTime[],
  selectedFriendIds: string[],
  dateRange: { start: Date; end: Date },
  durationMinutes: number,
): Map<string, TimeSlot[]> {
  const result = new Map<string, TimeSlot[]>();
  if (selectedFriendIds.length === 0) return result;

  const selectedFriendsData = friendsFreeTime.filter((f) =>
    selectedFriendIds.includes(f.userId),
  );
  if (selectedFriendsData.length === 0) return result;

  const durationMs = durationMinutes * 60 * 1000;

  // --- Step 1: Flatten all free slots, clipped to date range ---
  interface FlatSlot {
    userId: string;
    startTime: number; // epoch ms
    endTime: number;
  }

  const allSlots: FlatSlot[] = [];
  for (const friend of selectedFriendsData) {
    for (const slot of friend.freeSlots) {
      const s = new Date(slot.startTime).getTime();
      const e = new Date(slot.endTime).getTime();
      const rangeS = dateRange.start.getTime();
      const rangeE = dateRange.end.getTime();

      if (e > rangeS && s < rangeE) {
        allSlots.push({
          userId: friend.userId,
          startTime: Math.max(s, rangeS),
          endTime: Math.min(e, rangeE),
        });
      }
    }
  }

  // --- Step 2: Build an interval overlap to find common free blocks ---
  const friendIntervals = new Map<string, { start: number; end: number }[]>();
  for (const slot of allSlots) {
    const intervals = friendIntervals.get(slot.userId) ?? [];
    intervals.push({ start: slot.startTime, end: slot.endTime });
    friendIntervals.set(slot.userId, intervals);
  }

  // Sort each friend's intervals
  friendIntervals.forEach((intervals) => {
    intervals.sort((a, b) => a.start - b.start);
  });

  // Find intersection of all friends' intervals
  const friendIdList = Array.from(friendIntervals.keys());
  if (friendIdList.length === 0) return result;

  let commonIntervals = friendIntervals.get(friendIdList[0])!.map((iv) => ({
    start: iv.start,
    end: iv.end,
    friendIds: [friendIdList[0]],
  }));

  for (let i = 1; i < friendIdList.length; i++) {
    const friendId = friendIdList[i];
    const theirIntervals = friendIntervals.get(friendId) ?? [];
    const newCommon: { start: number; end: number; friendIds: string[] }[] = [];

    let a = 0;
    let b = 0;

    while (a < commonIntervals.length && b < theirIntervals.length) {
      const overlapStart = Math.max(
        commonIntervals[a].start,
        theirIntervals[b].start,
      );
      const overlapEnd = Math.min(
        commonIntervals[a].end,
        theirIntervals[b].end,
      );

      if (overlapStart < overlapEnd) {
        newCommon.push({
          start: overlapStart,
          end: overlapEnd,
          friendIds: [...commonIntervals[a].friendIds, friendId],
        });
      }

      // Advance the pointer for whichever interval ends first
      if (commonIntervals[a].end < theirIntervals[b].end) {
        a++;
      } else {
        b++;
      }
    }

    commonIntervals = newCommon;
  }

  // Use an event-based sweep to find all maximal overlap regions.
  type Event = { time: number; type: "start" | "end"; userId: string };
  const events: Event[] = [];
  for (const slot of allSlots) {
    events.push({ time: slot.startTime, type: "start", userId: slot.userId });
    events.push({ time: slot.endTime, type: "end", userId: slot.userId });
  }
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    // Process ends before starts at same time
    return a.type === "end" ? -1 : 1;
  });

  // Sweep to find all overlap regions with their friend sets
  const activeUsers = new Set<string>();
  const overlapBlocks: { start: number; end: number; friendIds: string[] }[] =
    [];
  let blockStart = 0;

  for (const event of events) {
    if (activeUsers.size > 0 && event.time > blockStart) {
      overlapBlocks.push({
        start: blockStart,
        end: event.time,
        friendIds: Array.from(activeUsers),
      });
    }

    if (event.type === "start") {
      activeUsers.add(event.userId);
    } else {
      activeUsers.delete(event.userId);
    }

    blockStart = event.time;
  }

  // --- Step 3: Generate snapped time slots from overlap blocks ---
  for (const block of overlapBlocks) {
    if (block.friendIds.length === 0) continue;

    const blockDuration = block.end - block.start;
    if (blockDuration < durationMs) continue;

    // Snap the start time to the next :00 or :30
    const blockStartDate = new Date(block.start);
    let cursor = snapToHalfHour(blockStartDate);

    // If snapping pushed us past where a full slot would fit, try the raw start
    if (cursor.getTime() + durationMs > block.end) {
      cursor = blockStartDate;
    }

    while (cursor.getTime() + durationMs <= block.end) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMs);
      const dateKey = toDateKey(slotStart);

      const existing = result.get(dateKey) ?? [];
      existing.push({
        date: new Date(
          slotStart.getFullYear(),
          slotStart.getMonth(),
          slotStart.getDate(),
        ),
        startTime: slotStart,
        endTime: slotEnd,
        friendIds: [...block.friendIds],
      });
      result.set(dateKey, existing);

      // Advance by 30 minutes
      cursor = new Date(cursor.getTime() + 30 * 60 * 1000);

      // Re-snap if we drifted (shouldn't happen, but be safe)
      cursor = snapToHalfHour(cursor);
    }
  }

  // Sort slots within each day: everyone-free first, then by time
  const totalSelected = selectedFriendIds.length;
  result.forEach((slots, key) => {
    slots.sort((a, b) => {
      const aAll = a.friendIds.length === totalSelected ? 0 : 1;
      const bAll = b.friendIds.length === totalSelected ? 0 : 1;
      if (aAll !== bAll) return aAll - bAll;
      return a.startTime.getTime() - b.startTime.getTime();
    });
    result.set(key, slots);
  });

  return result;
}

// ============================================
// Sub-Components
// ============================================

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

// ============================================
// Main Screen
// ============================================

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();

  // --- State ---
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [duration, setDuration] = useState(60);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [preferredStartTime, setPreferredStartTime] = useState<number | null>(
    null,
  );
  const [filterUngodlyHours, setFilterUngodlyHours] = useState(true);

  // --- Inline event creation state ---
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timeSlotsExpanded, setTimeSlotsExpanded] = useState(true);
  const [title, setTitle] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [notes, setNotes] = useState("");

  const scrollViewRef = useRef<any>(null);

  const detailsRef = useRef<any>(null);
  const timeSlotsRef = useRef<any>(null);

  const createEvent = useCreateEvent();

  // --- Data ---
  const { data: friendsData } = useFriends();
  const { data: groups } = useGroups();

  const friends = useMemo(
    () => friendsData?.friends ?? [],
    [friendsData?.friends],
  );
  const availableGroups = useMemo(
    () => (groups ?? []).filter((g) => g.memberIds.length > 0),
    [groups],
  );

  // --- Computed date range for slot queries ---
  const isSingleDate = rangeStart !== null && rangeEnd === null;
  const isDateRange = rangeStart !== null && rangeEnd !== null;

  const { start: computedRangeStart, end: computedRangeEnd } = useMemo(() => {
    if (!rangeStart) {
      // Fallback — shouldn't show results anyway when no date is selected
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start: today, end };
    }
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);

    if (rangeEnd) {
      const end = new Date(rangeEnd);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    // Single date
    const end = new Date(rangeStart);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [rangeStart, rangeEnd]);

  // For the free time query, use a wider range so the
  // calendar can show availability dots for 2 months
  const { start: queryStart, end: queryEnd } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEnd = new Date(today);
    futureEnd.setMonth(futureEnd.getMonth() + 2);
    futureEnd.setHours(23, 59, 59, 999);
    return { start: today, end: futureEnd };
  }, []);

  const freeTimeQuery = useFriendsFreeTime(
    queryStart.toISOString(),
    queryEnd.toISOString(),
  );
  const { data: friendsFreeTime } = freeTimeQuery;
  const { isRefreshing, onRefresh } = useRefresh(freeTimeQuery);

  // --- Computed slots ---
  const slotsByDay = useMemo(() => {
    if (!friendsFreeTime || selectedFriends.length === 0 || !rangeStart)
      return new Map<string, TimeSlot[]>();
    return findCommonFreeTime(
      friendsFreeTime,
      selectedFriends,
      { start: computedRangeStart, end: computedRangeEnd },
      duration,
    );
  }, [
    friendsFreeTime,
    selectedFriends,
    computedRangeStart,
    computedRangeEnd,
    duration,
    rangeStart,
  ]);

  // Days in the range for the day tab bar
  const daysInRange = useMemo(
    () =>
      rangeStart ? getDaysInRange(computedRangeStart, computedRangeEnd) : [],
    [rangeStart, computedRangeStart, computedRangeEnd],
  );

  // Set to track which days have no availability (for dimming in DayTabBar)
  const disabledDays = useMemo(() => {
    const disabled = new Set<string>();
    for (const day of daysInRange) {
      const key = toDateKey(day);
      if (!slotsByDay.has(key) || slotsByDay.get(key)!.length === 0) {
        disabled.add(key);
      }
    }
    return disabled;
  }, [daysInRange, slotsByDay]);

  // Availability dots for the calendar (dates that have any overlapping free time)
  const availabilityDots = useMemo(() => {
    if (!friendsFreeTime || selectedFriends.length === 0)
      return new Set<string>();
    const allSlots = findCommonFreeTime(
      friendsFreeTime,
      selectedFriends,
      { start: queryStart, end: queryEnd },
      duration,
    );
    return new Set(allSlots.keys());
  }, [friendsFreeTime, selectedFriends, queryStart, queryEnd, duration]);

  // Active day for viewing slots (auto-select first day with availability)
  const activeDay = useMemo(() => {
    if (isSingleDate && rangeStart) return rangeStart;
    if (selectedDay) {
      // Verify selected day is still in range
      const key = toDateKey(selectedDay);
      if (daysInRange.some((d) => toDateKey(d) === key)) return selectedDay;
    }
    // Auto-select first day with availability
    for (const day of daysInRange) {
      if (!disabledDays.has(toDateKey(day))) return day;
    }
    return daysInRange[0] ?? null;
  }, [isSingleDate, rangeStart, selectedDay, daysInRange, disabledDays]);

  const activeDaySlots = useMemo(() => {
    if (!activeDay) return [];
    return slotsByDay.get(toDateKey(activeDay)) ?? [];
  }, [activeDay, slotsByDay]);

  // --- Apply start time and ungodly hours filters ---
  const filteredSlots = useMemo(() => {
    return activeDaySlots.filter((slot) => {
      const startHour = slot.startTime.getHours();
      const startMin = slot.startTime.getMinutes();
      const startTotalMinutes = startHour * 60 + startMin;

      const endHour = slot.endTime.getHours();
      const endMin = slot.endTime.getMinutes();
      const endTotalMinutes = endHour * 60 + endMin;

      if (filterUngodlyHours) {
        // Filter out slots whose start time is in ungodly hours
        if (
          startTotalMinutes < UNGODLY_EARLY ||
          startTotalMinutes >= UNGODLY_LATE
        ) {
          return false;
        }
        // Filter out slots whose end time bleeds into ungodly hours.
        // If end time-of-day is <= start time-of-day, the slot wraps past
        // midnight (e.g. 9 PM → 8 AM) — always ungodly.
        const wrapsMidnight = endTotalMinutes <= startTotalMinutes;
        if (wrapsMidnight || endTotalMinutes > UNGODLY_LATE) {
          return false;
        }
      }
      if (
        preferredStartTime !== null &&
        startTotalMinutes < preferredStartTime
      ) {
        return false;
      }
      return true;
    });
  }, [activeDaySlots, filterUngodlyHours, preferredStartTime]);

  // Visible start time chips (filter based on ungodly toggle)
  const visibleStartTimeOptions = useMemo(() => {
    if (filterUngodlyHours) {
      return START_TIME_OPTIONS.filter(
        (opt) => opt.value >= UNGODLY_EARLY && opt.value < UNGODLY_LATE,
      );
    }
    return START_TIME_OPTIONS;
  }, [filterUngodlyHours]);

  // Friend name map
  const friendNameMap = useMemo(() => {
    const map = new Map<string, string>();
    friends.forEach((f) => {
      map.set(f.friendId, f.friend.firstName ?? f.friend.fullName);
    });
    return map;
  }, [friends]);

  // Friend initials map (for avatar stack)
  const friendInitialsMap = useMemo(() => {
    const map = new Map<string, string>();
    friends.forEach((f) => {
      map.set(f.friendId, f.friend.initials);
    });
    return map;
  }, [friends]);

  // People for the avatar stack in the event details summary
  // Includes the current user as "host" first, then invited friends
  const selectedSlotPeople = useMemo(() => {
    if (!selectedSlot) return [];
    const people: {
      id: string;
      initials: string;
      status: "host" | "pending";
      avatarUrl?: string;
    }[] = [];

    // Add current user as host first
    if (user) {
      people.push({
        id: user.userId,
        initials: user.initials,
        status: "host" as const,
        avatarUrl: user.avatarUrl,
      });
    }

    // Add invited friends
    for (const id of selectedSlot.friendIds) {
      people.push({
        id,
        initials: friendInitialsMap.get(id) ?? "??",
        status: "pending" as const,
      });
    }

    return people;
  }, [selectedSlot, friendInitialsMap, user]);

  // --- Steps visibility ---
  const hasFriendsSelected = selectedFriends.length > 0;
  const hasDateSelected = rangeStart !== null;
  const showDateStep = hasFriendsSelected;
  const showResults = hasFriendsSelected && hasDateSelected;

  // --- Handlers ---
  const resetDownstreamState = useCallback(() => {
    setSelectedSlot(null);
    setTimeSlotsExpanded(true);
    setTitle("");
    setLocationData(null);
    setNotes("");
  }, []);

  const toggleFriend = (friendId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
    setSelectedDay(null);
    resetDownstreamState();
  };

  const toggleGroup = (memberIds: string[]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const allSelected = memberIds.every((id) => selectedFriends.includes(id));
    if (allSelected) {
      setSelectedFriends((prev) =>
        prev.filter((id) => !memberIds.includes(id)),
      );
    } else {
      setSelectedFriends((prev) => {
        const newSet = new Set([...prev, ...memberIds]);
        return Array.from(newSet);
      });
    }
    setSelectedDay(null);
    resetDownstreamState();
  };

  const handleDurationChange = useCallback(
    (newDuration: number) => {
      setDuration(newDuration);
      resetDownstreamState();
    },
    [resetDownstreamState],
  );

  const handleRangeSelect = useCallback(
    (start: Date, end: Date | null) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setRangeStart(start);
      setRangeEnd(end);
      setSelectedDay(null);
      resetDownstreamState();
    },
    [resetDownstreamState],
  );

  const handleDayTabSelect = useCallback((day: Date) => {
    setSelectedDay(day);
  }, []);

  const handleStartTimeToggle = useCallback((value: number) => {
    setPreferredStartTime((prev) => (prev === value ? null : value));
  }, []);

  const selectSlot = (slot: TimeSlot) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSlot(slot);
    setTimeSlotsExpanded(false);
    // Auto-scroll to show the details form after a brief delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleLocationSelect = (place: PlaceResult | null) => {
    if (place) {
      setLocationData({
        name: place.name,
        address: place.address,
        placeId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    } else {
      setLocationData(null);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedSlot || !title.trim() || selectedFriends.length === 0) return;

    try {
      await createEvent.mutateAsync({
        title: title.trim(),
        startTime: selectedSlot.startTime.toISOString(),
        endTime: selectedSlot.endTime.toISOString(),
        locationData: locationData ?? undefined,
        notes: notes.trim() || undefined,
        inviteeIds: selectedFriends,
      });
      // Navigate to home screen first, then reset all plan state
      // after a brief delay so the LayoutAnimation from state resets
      // doesn't interfere with navigation
      router.replace("/(tabs)");
      setTimeout(() => {
        setSelectedFriends([]);
        setRangeStart(null);
        setRangeEnd(null);
        setDuration(60);
        setSelectedDay(null);
        setPreferredStartTime(null);
        setFilterUngodlyHours(true);
        setSelectedSlot(null);
        setTimeSlotsExpanded(true);
        setTitle("");
        setLocationData(null);
        setNotes("");
      }, 300);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  // --- Render ---
  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Fixed header area */}
      <YStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom="$3"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <H1 fontSize={28} fontWeight="700">
            Plan
          </H1>
        </XStack>
      </YStack>

      <ScrollView
        ref={scrollViewRef}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.val}
            colors={[theme.color.val]}
          />
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* ==================== Step 1: Friend Selection ==================== */}
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
                        selectedFriends.includes(id),
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
                {friends
                  .slice(0, MAX_VISIBLE_FRIENDS)
                  .map((friendship, index) => (
                    <YStack key={friendship.friendId}>
                      <XStack
                        alignItems="center"
                        gap="$3"
                        paddingVertical="$2"
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => toggleFriend(friendship.friendId)}
                      >
                        <Checkbox
                          checked={selectedFriends.includes(
                            friendship.friendId,
                          )}
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
                      {index <
                        Math.min(friends.length, MAX_VISIBLE_FRIENDS) - 1 && (
                        <Separator marginVertical="$1" />
                      )}
                    </YStack>
                  ))}
                {friends.length > MAX_VISIBLE_FRIENDS && (
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

        {/* ==================== Step 2: Date Selection ==================== */}
        {showDateStep && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <CalendarDays size={16} color="$colorMuted" />
                <Text fontWeight="500" fontSize={14}>
                  When works?
                </Text>
              </XStack>

              {/* Calendar with range selection */}
              <YStack marginBottom="$5">
                <InlineCalendar
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onSelectRange={handleRangeSelect}
                  minDate={new Date()}
                  availabilityDots={availabilityDots}
                />
              </YStack>
            </Card>
          </Theme>
        )}

        {/* ==================== Step 3: Time Filters & Suggested Times ==================== */}
        {showResults && (
          <YStack ref={timeSlotsRef}>
            {/* Time filter card */}
            <Theme name="Card">
              <Card marginBottom="$4">
                <XStack alignItems="center" gap="$2" marginBottom="$3">
                  <Clock size={16} color="$colorMuted" />
                  <Text fontWeight="500" fontSize={14}>
                    Time
                  </Text>
                </XStack>

                {/* Start around */}
                <TimeChipPicker
                  label="Start around"
                  options={visibleStartTimeOptions}
                  selectedValue={preferredStartTime}
                  onSelect={handleStartTimeToggle}
                  allowDeselect
                />

                {/* Duration selection */}
                <Separator marginVertical="$3" />

                <TimeChipPicker
                  label="How long"
                  options={DURATION_OPTIONS}
                  selectedValue={duration}
                  onSelect={handleDurationChange}
                />

                {/* Ungodly hours toggle */}
                <Separator marginVertical="$3" />

                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap="$2" flex={1}>
                    <MoonStar size={14} color="$colorMuted" />
                    <Text fontSize={13} color="$colorMuted">
                      Hide late nights & early mornings
                    </Text>
                  </XStack>
                  <Switch
                    size="$2"
                    checked={filterUngodlyHours}
                    onCheckedChange={(checked) => {
                      setFilterUngodlyHours(checked);
                      // If turning on and preferred time is in ungodly range, clear it
                      if (
                        checked &&
                        preferredStartTime !== null &&
                        (preferredStartTime < UNGODLY_EARLY ||
                          preferredStartTime >= UNGODLY_LATE)
                      ) {
                        setPreferredStartTime(null);
                      }
                    }}
                    backgroundColor={
                      filterUngodlyHours ? "$primary" : "$backgroundHover"
                    }
                  >
                    <Switch.Thumb
                      animation="quick"
                      backgroundColor={
                        filterUngodlyHours ? "$primaryForeground" : "$color"
                      }
                    />
                  </Switch>
                </XStack>
              </Card>
            </Theme>

            {/* Available times header — pressable to expand/collapse when a slot is selected */}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom={timeSlotsExpanded ? "$3" : "$0"}
              {...(selectedSlot
                ? {
                    pressStyle: { opacity: 0.7 },
                    onPress: () => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      const willExpand = !timeSlotsExpanded;
                      setTimeSlotsExpanded(willExpand);
                      if (willExpand) {
                        // Scroll back to show the time slots
                        setTimeout(() => {
                          timeSlotsRef.current?.measureLayout(
                            scrollViewRef.current?.getInnerViewNode?.() ??
                              scrollViewRef.current,
                            (_x: number, y: number) => {
                              scrollViewRef.current?.scrollTo({
                                y: y - 16,
                                animated: true,
                              });
                            },
                            () => {},
                          );
                        }, 300);
                      }
                    },
                  }
                : {})}
            >
              <YStack>
                <Text fontSize={18} fontWeight="600">
                  {selectedFriends.length === 0
                    ? "Select friends to find times"
                    : "Available times"}
                </Text>
                {activeDay && (
                  <Text
                    color="$colorMuted"
                    fontSize={13}
                    fontWeight="500"
                    marginTop={2}
                  >
                    {formatDate(activeDay)}
                    {filteredSlots.length > 0 &&
                      ` \u00B7 ${filteredSlots.length} time${filteredSlots.length === 1 ? "" : "s"}`}
                  </Text>
                )}
              </YStack>
              {selectedSlot && (
                <XStack alignItems="center" gap="$1">
                  <Text fontSize={13} color="$colorMuted">
                    {timeSlotsExpanded ? "Collapse" : "Change"}
                  </Text>
                  {timeSlotsExpanded ? (
                    <ChevronUp size={16} color="$colorMuted" />
                  ) : (
                    <ChevronDown size={16} color="$colorMuted" />
                  )}
                </XStack>
              )}
            </XStack>

            {/* Collapsible time slots content */}
            {timeSlotsExpanded && (
              <YStack>
                {/* Day tab bar (when a range is selected with multiple days) */}
                {isDateRange && daysInRange.length > 1 && (
                  <YStack marginBottom="$3">
                    <DayTabBar
                      days={daysInRange}
                      selectedDay={activeDay!}
                      onSelectDay={handleDayTabSelect}
                      disabledDays={disabledDays}
                    />
                  </YStack>
                )}

                {/* Empty state for active day */}
                {filteredSlots.length === 0 && (
                  <Theme name="Card">
                    <Card>
                      <YStack alignItems="center" padding="$2" gap="$2">
                        <Clock size={32} color="$colorMuted" />
                        <Text color="$colorMuted" textAlign="center">
                          {activeDaySlots.length > 0
                            ? "No times match your filters"
                            : `No shared free time${activeDay ? ` on ${formatDate(activeDay)}` : ""}`}
                        </Text>
                        {activeDaySlots.length > 0 && (
                          <Text
                            color="$colorSubtle"
                            textAlign="center"
                            fontSize={13}
                          >
                            Try adjusting the start time or toggling the filter
                          </Text>
                        )}
                        {isDateRange && activeDaySlots.length === 0 && (
                          <Text
                            color="$colorSubtle"
                            textAlign="center"
                            fontSize={13}
                          >
                            Try selecting different options above
                          </Text>
                        )}
                      </YStack>
                    </Card>
                  </Theme>
                )}

                {/* Time slot list */}
                {filteredSlots.length > 0 && (
                  <YStack gap="$2">
                    {filteredSlots.map((slot, index) => {
                      const friendNames = slot.friendIds
                        .map((id) => friendNameMap.get(id) ?? "Friend")
                        .join(", ");
                      const isEveryoneAvailable =
                        slot.friendIds.length === selectedFriends.length;

                      // Show period headers (Morning/Afternoon/Evening)
                      const period = getTimePeriod(slot.startTime);
                      const prevPeriod =
                        index > 0
                          ? getTimePeriod(filteredSlots[index - 1].startTime)
                          : null;
                      const showPeriodHeader = period !== prevPeriod;

                      return (
                        <YStack
                          key={`${toDateKey(slot.date)}-${slot.startTime.getTime()}`}
                        >
                          {showPeriodHeader && (
                            <Text
                              fontSize={12}
                              fontWeight="600"
                              color="$colorMuted"
                              textTransform="uppercase"
                              letterSpacing={0.5}
                              marginTop={index > 0 ? "$2" : 0}
                              marginBottom="$1"
                            >
                              {period === "morning"
                                ? "Morning"
                                : period === "afternoon"
                                  ? "Afternoon"
                                  : "Evening"}
                            </Text>
                          )}
                          <Theme name="Card">
                            <Card
                              pressable
                              onPress={() => selectSlot(slot)}
                              borderWidth={
                                selectedSlot?.startTime.getTime() ===
                                  slot.startTime.getTime() &&
                                selectedSlot?.endTime.getTime() ===
                                  slot.endTime.getTime()
                                  ? 2
                                  : undefined
                              }
                              borderColor={
                                selectedSlot?.startTime.getTime() ===
                                  slot.startTime.getTime() &&
                                selectedSlot?.endTime.getTime() ===
                                  slot.endTime.getTime()
                                  ? "$primary"
                                  : undefined
                              }
                            >
                              <XStack
                                alignItems="center"
                                justifyContent="space-between"
                              >
                                <YStack flex={1} gap="$1">
                                  <XStack
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <Text fontWeight="600" fontSize={15}>
                                      {formatTime(slot.startTime)} –{" "}
                                      {formatTime(slot.endTime)}
                                    </Text>
                                    {isEveryoneAvailable && (
                                      <XStack
                                        backgroundColor="$successSubtle"
                                        paddingHorizontal="$2"
                                        paddingVertical={2}
                                        borderRadius="$2"
                                      >
                                        <Text
                                          fontSize={11}
                                          color="$success"
                                          fontWeight="600"
                                        >
                                          All free
                                        </Text>
                                      </XStack>
                                    )}
                                  </XStack>
                                  <Text color="$colorMuted" fontSize={13}>
                                    {isEveryoneAvailable
                                      ? "All selected friends"
                                      : friendNames}
                                  </Text>
                                </YStack>
                                {selectedSlot?.startTime.getTime() ===
                                  slot.startTime.getTime() &&
                                selectedSlot?.endTime.getTime() ===
                                  slot.endTime.getTime() ? (
                                  <Check
                                    size={16}
                                    color="$primary"
                                    marginLeft="$2"
                                  />
                                ) : (
                                  <ChevronRight
                                    size={16}
                                    color="$colorMuted"
                                    marginLeft="$2"
                                  />
                                )}
                              </XStack>
                            </Card>
                          </Theme>
                        </YStack>
                      );
                    })}
                  </YStack>
                )}
              </YStack>
            )}
          </YStack>
        )}

        {/* ==================== Step 4: Event Details (inline) ==================== */}
        {selectedSlot && (
          <YStack marginTop="$4" ref={detailsRef}>
            <Text fontSize={18} fontWeight="600" marginBottom="$3">
              Event details
            </Text>

            {/* Live preview card — mirrors the home page event card */}
            <YStack marginBottom="$4">
              <EventCard
                title={title}
                emoji={null}
                timeLabel={`${formatDate(selectedSlot.date)}, ${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}`}
                location={locationData?.name}
                isHost={true}
                people={selectedSlotPeople}
                attendeeSummary={
                  selectedSlotPeople.length > 1
                    ? `${selectedSlotPeople.length} people`
                    : "Just you"
                }
                showAvatarStatus={false}
                isPreview={true}
              />
            </YStack>

            <Theme name="Card">
              <Card>
                <YStack gap="$3">
                  {/* Title */}
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$1">
                      <Text fontWeight="500" fontSize={14}>
                        Title
                      </Text>
                      <Text fontSize={12} color="$error">
                        *
                      </Text>
                    </XStack>
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
                      height={44}
                      fontSize={14}
                      paddingVertical={0}
                    />
                  </YStack>

                  {/* Location */}
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <MapPin size={14} color="$colorMuted" />
                      <Text fontWeight="500" fontSize={14}>
                        Location{" "}
                        <Text
                          fontSize={14}
                          color="$colorMuted"
                          fontWeight="400"
                        >
                          (optional)
                        </Text>
                      </Text>
                    </XStack>
                    <LocationSearch
                      value={locationData?.name}
                      onSelect={handleLocationSelect}
                      placeholder="Search for a place..."
                    />
                    {locationData?.latitude && locationData?.longitude && (
                      <MapPreview
                        latitude={parseFloat(locationData.latitude)}
                        longitude={parseFloat(locationData.longitude)}
                        name={locationData.name}
                        address={locationData.address}
                        height={120}
                      />
                    )}
                  </YStack>

                  {/* Notes */}
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <FileText size={14} color="$colorMuted" />
                      <Text fontWeight="500" fontSize={14}>
                        Notes{" "}
                        <Text
                          fontSize={14}
                          color="$colorMuted"
                          fontWeight="400"
                        >
                          (optional)
                        </Text>
                      </Text>
                    </XStack>
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

            {/* Inline create button - only visible when form is complete */}
            {title.trim() && selectedFriends.length > 0 && (
              <YStack marginTop="$4" marginBottom="$2">
                <Button
                  variant="primary"
                  buttonSize="lg"
                  fullWidth
                  onPress={handleCreateEvent}
                  disabled={createEvent.isPending}
                >
                  {createEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
