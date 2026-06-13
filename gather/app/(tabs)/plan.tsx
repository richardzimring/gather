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
} from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, RefreshControl, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import {
  H1,
  Text,
  XStack,
  YStack,
  Theme,
  Separator,
  Input,
  TextArea,
  useTheme,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DayTabBar } from '../../components/ui/DayTabBar';
import { EventCard } from '../../components/ui/EventCard';
import { FriendPicker } from '../../components/ui/FriendPicker';
import { InlineCalendar, toDateKey } from '../../components/ui/InlineCalendar';
import {
  LocationSearch,
  type PlaceResult,
} from '../../components/ui/LocationSearch';
import { MapPreview } from '../../components/ui/MapPreview';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { SkeletonBar } from '../../components/ui/Skeleton';
import { Toggle } from '../../components/ui/Toggle';
import {
  TimeChipPicker,
  DURATION_OPTIONS,
  START_TIME_OPTIONS,
} from '../../components/ui/TimeChipPicker';
import { haptic } from '../../lib/haptics';
import { formatRelativeDate, formatTimeOfDay } from '../../lib/utils';
import {
  useCreateEvent,
  useFriends,
  useBusyTimes,
  useGroups,
  useRefresh,
  useScrollGradient,
} from '../../lib/hooks';
import { useGenerateEmoji } from '../../lib/hooks/useEmoji';
import { useAuth } from '../../lib/hooks/useAuth';
import type { LocationData } from '../../lib/api/generated/types.gen';
import type { CommonFreeTimeSlot } from '../../lib/utils/availability';

// ============================================
// Types
// ============================================

interface TimeSlot {
  date: Date;
  startTime: Date;
  endTime: Date;
  userIds: string[];
}

// ============================================
// Constants
// ============================================

const MAX_VISIBLE_FRIENDS = 8;

/** Ungodly hours boundary: before 8 AM or at/after 10 PM */
const UNGODLY_EARLY = 480; // 8:00 AM in minutes
const UNGODLY_LATE = 1320; // 10:00 PM in minutes

// ============================================
// Utility Functions
// ============================================

/**
 * Get the time-of-day period for grouping slots.
 */
function getTimePeriod(date: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
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
// Helpers: Convert API response to local TimeSlot format
// ============================================

/**
 * Convert the flat API response into the Map<dateKey, TimeSlot[]> structure
 * expected by the rest of the component.
 */
function groupSlotsByDay(slots: CommonFreeTimeSlot[]): Map<string, TimeSlot[]> {
  const result = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    const dateKey = slot.date;

    const existing = result.get(dateKey) ?? [];
    existing.push({
      date: new Date(
        startTime.getFullYear(),
        startTime.getMonth(),
        startTime.getDate(),
      ),
      startTime,
      endTime,
      userIds: [...slot.userIds],
    });
    result.set(dateKey, existing);
  }

  return result;
}

// ============================================
// Sub-Components
// ============================================

/** Skeleton placeholder card mimicking a time-slot row. */
function TimeSlotSkeleton() {
  return (
    <Theme name="Card">
      <Card>
        <XStack alignItems="center" justifyContent="space-between">
          <YStack flex={1} gap="$2">
            <SkeletonBar width={140} height={16} />
            <SkeletonBar width={100} height={12} />
          </YStack>
          <SkeletonBar width={16} height={16} borderRadius={8} />
        </XStack>
      </Card>
    </Theme>
  );
}

// ============================================
// Main Screen
// ============================================

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();
  const { selectedFriendIds } = useLocalSearchParams<{
    selectedFriendIds?: string;
  }>();

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

  const [showAllFriends, setShowAllFriends] = useState(false);

  // --- Inline event creation state ---
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timeSlotsExpanded, setTimeSlotsExpanded] = useState(true);
  const [title, setTitle] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [notes, setNotes] = useState('');

  // Generate emoji for the title with debouncing
  const { emoji: previewEmoji, isLoading: isEmojiLoading } =
    useGenerateEmoji(title);

  const scrollViewRef = useRef<any>(null);

  const detailsRef = useRef<any>(null);
  const timeSlotsRef = useRef<View>(null);
  const timeSlotsScrollY = useRef<number>(0);
  const selectedSlotScrollY = useRef<number>(0);

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

  // --- Pre-select friends if passed via navigation params ---
  // Applied during render (React's "adjusting state when a prop changes"
  // pattern) once the friends list has loaded.
  const [appliedFriendIdsParam, setAppliedFriendIdsParam] = useState<
    string | undefined
  >(undefined);
  if (selectedFriendIds !== appliedFriendIdsParam && friends.length > 0) {
    setAppliedFriendIdsParam(selectedFriendIds);
    const validFriendIds = (selectedFriendIds ?? '')
      .split(',')
      .filter(Boolean)
      .filter((id) => friends.some((f) => f.friendId === id));
    if (validFriendIds.length > 0) {
      setSelectedFriends(validFriendIds);
    }
  }

  // --- Computed date range for slot queries ---
  const isSingleDate = rangeStart !== null && rangeEnd === null;
  const isDateRange = rangeStart !== null && rangeEnd !== null;

  const { start: computedRangeStart, end: computedRangeEnd } = useMemo(() => {
    if (!rangeStart) {
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

  // Max selectable date on the calendar (2 months from today)
  const maxCalendarDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // User IDs to query: current user + selected friends
  const queryUserIds = useMemo(() => {
    if (selectedFriends.length === 0) return [];
    return user ? [user.userId, ...selectedFriends] : [...selectedFriends];
  }, [selectedFriends, user]);

  // Main busy times query for the selected date range
  // Only fires when user has actually selected a date/range AND friends
  const { query: busyTimesQuery, data: computedSlots } = useBusyTimes(
    queryUserIds,
    computedRangeStart.toISOString(),
    computedRangeEnd.toISOString(),
    duration,
    rangeStart !== null, // only enable when user has selected a date
  );
  const isBusyTimesLoading =
    busyTimesQuery.isLoading || busyTimesQuery.isFetching;
  const { isRefreshing, onRefresh } = useRefresh(busyTimesQuery);

  // --- Computed slots ---
  const slotsByDay = useMemo(() => {
    if (!computedSlots || selectedFriends.length === 0 || !rangeStart)
      return new Map<string, TimeSlot[]>();
    return groupSlotsByDay(computedSlots);
  }, [computedSlots, selectedFriends, rangeStart]);

  // Days in the range for the day tab bar
  const daysInRange = useMemo(
    () =>
      rangeStart ? getDaysInRange(computedRangeStart, computedRangeEnd) : [],
    [rangeStart, computedRangeStart, computedRangeEnd],
  );

  // Set to track which days have no availability (for dimming in DayTabBar)
  // A day is "disabled" if none of its slots have anyone free
  const disabledDays = useMemo(() => {
    const disabled = new Set<string>();
    for (const day of daysInRange) {
      const key = toDateKey(day);
      const daySlots = slotsByDay.get(key) ?? [];
      const hasAnyFree = daySlots.some((slot) => slot.userIds.length > 0);
      if (!hasAnyFree) {
        disabled.add(key);
      }
    }
    return disabled;
  }, [daysInRange, slotsByDay]);

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

  // --- Apply start time and ungodly hours filters, then sort by time ---
  const filteredSlots = useMemo(() => {
    const now = new Date();
    const isToday =
      activeDay &&
      activeDay.getFullYear() === now.getFullYear() &&
      activeDay.getMonth() === now.getMonth() &&
      activeDay.getDate() === now.getDate();

    const filtered = activeDaySlots.filter((slot) => {
      const startHour = slot.startTime.getHours();
      const startMin = slot.startTime.getMinutes();
      const startTotalMinutes = startHour * 60 + startMin;

      const endHour = slot.endTime.getHours();
      const endMin = slot.endTime.getMinutes();
      const endTotalMinutes = endHour * 60 + endMin;

      // Filter out slots that have already started or passed (for today only)
      if (isToday && slot.startTime <= now) {
        return false;
      }

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

    // Ensure strict chronological order so period headers never repeat
    filtered.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return filtered;
  }, [activeDaySlots, filterUngodlyHours, preferredStartTime, activeDay]);

  // Visible start time chips (filter based on ungodly toggle and past times for today)
  const visibleStartTimeOptions = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if only the current date is selected
    const isOnlyToday =
      rangeStart !== null &&
      rangeEnd === null &&
      rangeStart.getFullYear() === now.getFullYear() &&
      rangeStart.getMonth() === now.getMonth() &&
      rangeStart.getDate() === now.getDate();

    let options = START_TIME_OPTIONS;

    // Filter out ungodly hours if enabled
    if (filterUngodlyHours) {
      options = options.filter(
        (opt) => opt.value >= UNGODLY_EARLY && opt.value < UNGODLY_LATE,
      );
    }

    // Filter out past times if only today is selected
    if (isOnlyToday) {
      options = options.filter((opt) => opt.value > currentMinutes);
    }

    return options;
  }, [filterUngodlyHours, rangeStart, rangeEnd]);

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
      status: 'host' | 'pending';
      avatarUrl?: string;
    }[] = [];

    // Add current user as host first
    if (user) {
      people.push({
        id: user.userId,
        initials: user.initials,
        status: 'host' as const,
        avatarUrl: user.avatarUrl,
      });
    }

    // Add invited friends (filter out current user — they're already added as host)
    const invitedFriendIds = user
      ? selectedSlot.userIds.filter((id) => id !== user.userId)
      : selectedSlot.userIds;
    for (const id of invitedFriendIds) {
      people.push({
        id,
        initials: friendInitialsMap.get(id) ?? '??',
        status: 'pending' as const,
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
    setTitle('');
    setLocationData(null);
    setNotes('');
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
    haptic.selection();
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
        emoji: previewEmoji ?? undefined,
        startTime: selectedSlot.startTime.toISOString(),
        endTime: selectedSlot.endTime.toISOString(),
        locationData: locationData ?? undefined,
        notes: notes.trim() || undefined,
        inviteeIds: selectedFriends,
      });

      haptic.success();

      // Navigate to home screen first, then reset all plan state
      // after a brief delay so the LayoutAnimation from state resets
      // doesn't interfere with navigation
      router.replace('/(tabs)');
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
        setTitle('');
        setLocationData(null);
        setNotes('');
      }, 300);
    } catch (err) {
      haptic.error();
      console.error('Failed to create event:', err);
    }
  };

  // --- Render ---
  const { gradientOpacity, scrollProps } = useScrollGradient();

  return (
    <YStack flex={1} backgroundColor="$background">
      <GradientBackground style={{ opacity: gradientOpacity }} />
      <KeyboardAwareScrollView
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
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        bottomOffset={16}
        {...scrollProps}
      >
        {/* Header */}
        <YStack paddingBottom="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H1 fontSize={32} fontWeight="700">
              Plan
            </H1>
          </XStack>
        </YStack>
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

            {friends.length === 0 ? (
              <YStack alignItems="center" padding="$4" gap="$3">
                <Text color="$colorMuted" textAlign="center">
                  Add friends to start planning together
                </Text>
                <Button
                  variant="secondary"
                  buttonSize="sm"
                  onPress={() => {
                    haptic.light();
                    router.push('/friends/add');
                  }}
                >
                  Add Friends
                </Button>
              </YStack>
            ) : (
              <YStack gap="$1">
                <FriendPicker
                  friends={friends}
                  groups={availableGroups}
                  selectedIds={selectedFriends}
                  onToggle={toggleFriend}
                  onToggleGroup={toggleGroup}
                  maxVisible={showAllFriends ? undefined : MAX_VISIBLE_FRIENDS}
                />
                {friends.length > MAX_VISIBLE_FRIENDS && (
                  <Button
                    variant="ghost"
                    buttonSize="sm"
                    onPress={() => {
                      haptic.light();
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      setShowAllFriends((prev) => !prev);
                    }}
                  >
                    {showAllFriends
                      ? 'Show less'
                      : `Show all ${friends.length} friends`}
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
              <YStack marginBottom="$3">
                <InlineCalendar
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onSelectRange={handleRangeSelect}
                  minDate={new Date()}
                  maxDate={maxCalendarDate}
                />
              </YStack>
            </Card>
          </Theme>
        )}

        {/* ==================== Step 3: Time Filters ==================== */}
        {showResults && (
          <View
            ref={timeSlotsRef}
            onLayout={(e) => {
              timeSlotsScrollY.current = e.nativeEvent.layout.y;
            }}
          >
            <YStack>
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
                  {visibleStartTimeOptions.length > 0 ? (
                    <TimeChipPicker
                      label="Start around"
                      options={visibleStartTimeOptions}
                      selectedValue={preferredStartTime}
                      onSelect={handleStartTimeToggle}
                      allowDeselect
                    />
                  ) : (
                    <YStack gap="$2">
                      <Text fontSize={13} color="$colorMuted" fontWeight="500">
                        Start around
                      </Text>
                      <YStack
                        backgroundColor="$backgroundHover"
                        padding="$3"
                        borderRadius="$2"
                      >
                        <Text
                          fontSize={13}
                          color="$colorMuted"
                          textAlign="center"
                        >
                          No times remaining for today.{' '}
                          {filterUngodlyHours
                            ? 'Try selecting a different day or turning off the late nights filter.'
                            : 'Try selecting a different day.'}
                        </Text>
                      </YStack>
                    </YStack>
                  )}

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
                    <Toggle
                      size="$2"
                      checked={filterUngodlyHours}
                      onCheckedChange={(checked) => {
                        haptic.selection();
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
                    />
                  </XStack>
                </Card>
              </Theme>

              {/* ==================== Step 4: Time Slots ==================== */}
              <XStack
                alignItems="center"
                justifyContent="space-between"
                marginBottom={timeSlotsExpanded ? '$3' : '$0'}
                {...(selectedSlot
                  ? {
                      pressStyle: { opacity: 0.7 },
                      onPress: () => {
                        haptic.selection();
                        LayoutAnimation.configureNext(
                          LayoutAnimation.Presets.easeInEaseOut,
                        );
                        const willExpand = !timeSlotsExpanded;
                        setTimeSlotsExpanded(willExpand);
                        if (willExpand) {
                          // Scroll to the selected slot using Y positions
                          // captured via onLayout (avoids measureLayout which
                          // requires a native component ancestor ref)
                          setTimeout(() => {
                            const y =
                              selectedSlotScrollY.current > 0
                                ? selectedSlotScrollY.current - 16
                                : timeSlotsScrollY.current - 16;
                            scrollViewRef.current?.scrollTo({
                              y,
                              animated: true,
                            });
                          }, 300);
                        }
                      },
                    }
                  : {})}
              >
                <YStack>
                  <Text fontSize={18} fontWeight="600">
                    {selectedFriends.length === 0
                      ? 'Select friends to find times'
                      : 'Times'}
                  </Text>
                  {activeDay && (
                    <Text
                      color="$colorMuted"
                      fontSize={13}
                      fontWeight="500"
                      marginTop={2}
                    >
                      {formatRelativeDate(activeDay)}
                      {isBusyTimesLoading
                        ? ' \u00B7 Loading\u2026'
                        : filteredSlots.length > 0
                          ? (() => {
                              const freeCount = filteredSlots.filter(
                                (s) =>
                                  s.userIds.length ===
                                  selectedFriends.length + 1,
                              ).length;
                              return freeCount > 0
                                ? ` \u00B7 ${freeCount} available`
                                : ` \u00B7 No times available`;
                            })()
                          : ''}
                    </Text>
                  )}
                </YStack>
                {selectedSlot && (
                  <XStack alignItems="center" gap="$1">
                    <Text fontSize={13} color="$colorMuted">
                      {timeSlotsExpanded ? 'Collapse' : 'Change'}
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

                  {/* Loading skeleton */}
                  {isBusyTimesLoading && filteredSlots.length === 0 && (
                    <YStack gap="$2">
                      <SkeletonBar width={60} height={12} />
                      <TimeSlotSkeleton />
                      <TimeSlotSkeleton />
                      <TimeSlotSkeleton />
                    </YStack>
                  )}

                  {/* Empty state — only when filters exclude all slots and not loading */}
                  {!isBusyTimesLoading && filteredSlots.length === 0 && (
                    <Theme name="Card">
                      <Card>
                        <YStack alignItems="center" padding="$2" gap="$2">
                          <Clock size={32} color="$colorMuted" />
                          <Text color="$colorMuted" textAlign="center">
                            No times match your filters
                          </Text>
                          <Text
                            color="$colorSubtle"
                            textAlign="center"
                            fontSize={13}
                          >
                            Try adjusting the start time or toggling the filter
                          </Text>
                        </YStack>
                      </Card>
                    </Theme>
                  )}

                  {/* Time slot list */}
                  {filteredSlots.length > 0 && (
                    <YStack gap="$2">
                      {filteredSlots.map((slot, index) => {
                        // Separate the current user from friends in this slot's availability
                        const isCurrentUserFree = user
                          ? slot.userIds.includes(user.userId)
                          : true;
                        const freeFriendIds = user
                          ? slot.userIds.filter((id) => id !== user.userId)
                          : slot.userIds;
                        const freeFriendsSubtitle = (() => {
                          const names = freeFriendIds.map(
                            (id) => friendNameMap.get(id) ?? 'Friend',
                          );
                          if (names.length === 1) return `${names[0]} is free`;
                          if (names.length <= 2)
                            return `${names.join(' and ')} are free`;
                          return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]} are free`;
                        })();
                        const allFriendsFree =
                          freeFriendIds.length === selectedFriends.length;
                        const allFriendsBusy = freeFriendIds.length === 0;
                        const isEveryoneAvailable =
                          allFriendsFree && isCurrentUserFree;
                        const isEveryoneBusy = slot.userIds.length === 0;

                        const isSelected =
                          selectedSlot?.startTime.getTime() ===
                            slot.startTime.getTime() &&
                          selectedSlot?.endTime.getTime() ===
                            slot.endTime.getTime();

                        // Show period headers (Morning/Afternoon/Evening)
                        const period = getTimePeriod(slot.startTime);
                        const prevPeriod =
                          index > 0
                            ? getTimePeriod(filteredSlots[index - 1].startTime)
                            : null;
                        const showPeriodHeader = period !== prevPeriod;

                        // Status badge
                        let badgeBg = '';
                        let badgeColor = '';
                        let badgeLabel = '';
                        if (isEveryoneAvailable) {
                          badgeBg = '$successSubtle';
                          badgeColor = '$success';
                          badgeLabel = 'All free';
                        } else if (allFriendsBusy) {
                          badgeBg = '$backgroundHover';
                          badgeColor = '$colorMuted';
                          badgeLabel = 'All busy';
                        } else if (!isCurrentUserFree) {
                          badgeBg = '$backgroundHover';
                          badgeColor = '$colorMuted';
                          badgeLabel = 'You\u2019re busy';
                        } else {
                          badgeBg = '$backgroundHover';
                          badgeColor = '$colorMuted';
                          badgeLabel = `${freeFriendIds.length} busy`;
                        }

                        // Subtitle text
                        let subtitle = '';
                        if (isEveryoneBusy) {
                          subtitle = 'No one is available';
                        } else if (isEveryoneAvailable) {
                          subtitle = 'Everyone is available';
                        } else if (isCurrentUserFree && allFriendsBusy) {
                          subtitle =
                            'You\u2019re free, but all friends are busy';
                        } else if (!isCurrentUserFree && allFriendsFree) {
                          subtitle =
                            'All friends are free, but you have a conflict';
                        } else if (!isCurrentUserFree) {
                          subtitle = `${freeFriendsSubtitle}, but you have a conflict`;
                        } else {
                          subtitle = freeFriendsSubtitle;
                        }

                        return (
                          <YStack
                            key={`${toDateKey(slot.date)}-${slot.startTime.getTime()}`}
                            onLayout={
                              isSelected
                                ? (e) => {
                                    selectedSlotScrollY.current =
                                      timeSlotsScrollY.current +
                                      e.nativeEvent.layout.y;
                                  }
                                : undefined
                            }
                          >
                            {showPeriodHeader && (
                              <Text
                                fontSize={12}
                                fontWeight="600"
                                color="$colorMuted"
                                textTransform="uppercase"
                                letterSpacing={0.5}
                                marginTop={index > 0 ? '$2' : 0}
                                marginBottom="$1"
                              >
                                {period === 'morning'
                                  ? 'Morning'
                                  : period === 'afternoon'
                                    ? 'Afternoon'
                                    : 'Evening'}
                              </Text>
                            )}
                            <Theme name="Card">
                              <Card
                                pressable
                                onPress={() => selectSlot(slot)}
                                borderWidth={isSelected ? 2 : undefined}
                                borderColor={
                                  isSelected ? '$primary' : undefined
                                }
                                opacity={
                                  allFriendsBusy || !isCurrentUserFree ? 0.5 : 1
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
                                        {formatTimeOfDay(slot.startTime)} –{' '}
                                        {formatTimeOfDay(slot.endTime)}
                                      </Text>
                                      {badgeLabel !== '' && (
                                        <XStack
                                          backgroundColor={badgeBg}
                                          paddingHorizontal="$2"
                                          paddingVertical={2}
                                          borderRadius="$2"
                                        >
                                          <Text
                                            fontSize={11}
                                            color={badgeColor}
                                            fontWeight="600"
                                          >
                                            {badgeLabel}
                                          </Text>
                                        </XStack>
                                      )}
                                    </XStack>
                                    <Text color="$colorMuted" fontSize={13}>
                                      {subtitle}
                                    </Text>
                                  </YStack>
                                  {isSelected ? (
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
          </View>
        )}

        {/* ==================== Step 5: Event Details ==================== */}
        {selectedSlot && (
          <YStack marginTop="$4" ref={detailsRef}>
            <Text fontSize={18} fontWeight="600" marginBottom="$3">
              Event details
            </Text>

            {/* Live preview card — mirrors the home page event card */}
            <YStack marginBottom="$4">
              <EventCard
                title={title}
                emoji={previewEmoji}
                isEmojiLoading={isEmojiLoading}
                timeLabel={`${formatRelativeDate(selectedSlot.date)}, ${formatTimeOfDay(selectedSlot.startTime)} – ${formatTimeOfDay(selectedSlot.endTime)}`}
                location={locationData?.name}
                isHost={true}
                people={selectedSlotPeople}
                attendeeSummary={
                  selectedSlotPeople.length > 1
                    ? `${selectedSlotPeople.length} people`
                    : 'Just you'
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
                        Location{' '}
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
                        Notes{' '}
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
                  disabled={createEvent.isPending || isEmojiLoading}
                  loading={createEvent.isPending || isEmojiLoading}
                >
                  {createEvent.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </YStack>
            )}
          </YStack>
        )}
      </KeyboardAwareScrollView>
    </YStack>
  );
}
