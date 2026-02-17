import { useEffect, useRef } from "react";
import { ScrollView as RNScrollView } from "react-native";
import { ScrollView, Text, YStack } from "tamagui";
import { haptic } from "../../lib/haptics";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Get a date string key (YYYY-MM-DD) for comparison purposes.
 */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface DayTabBarProps {
  /** Array of dates to show as tabs */
  days: Date[];
  /** Currently selected day */
  selectedDay: Date;
  /** Callback when a day tab is tapped */
  onSelectDay: (date: Date) => void;
  /** Set of date keys (YYYY-MM-DD) that should appear disabled (no availability) */
  disabledDays?: Set<string>;
}

/**
 * Horizontal scrollable day chip bar for navigating between days.
 * Each chip shows the day abbreviation and date number.
 */
export function DayTabBar({
  days,
  selectedDay,
  onSelectDay,
  disabledDays,
}: DayTabBarProps) {
  const scrollRef = useRef<RNScrollView>(null);
  const selectedKey = toDateKey(selectedDay);

  // Auto-scroll to selected day chip on mount and when selection changes
  useEffect(() => {
    const index = days.findIndex((d) => toDateKey(d) === selectedKey);
    if (index >= 0 && scrollRef.current) {
      // Approximate chip width + gap: ~62px per chip
      const chipWidth = 62;
      const scrollTo = Math.max(0, index * chipWidth - 60);
      scrollRef.current.scrollTo({ x: scrollTo, animated: true });
    }
  }, [selectedKey, days]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      ref={scrollRef}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
    >
      {days.map((day) => {
        const dateKey = toDateKey(day);
        const isSelected = dateKey === selectedKey;
        const isDisabled = disabledDays?.has(dateKey) ?? false;

        // Show "Today" or "Tmrw" for special days
        let label = DAYS_SHORT[day.getDay()];
        if (dateKey === todayKey) label = "Today";
        else if (dateKey === tomorrowKey) label = "Tmrw";

        return (
          <YStack
            key={dateKey}
            width={54}
            paddingVertical="$2"
            borderRadius="$2"
            alignItems="center"
            justifyContent="center"
            backgroundColor={isSelected ? "$primary" : "$backgroundHover"}
            opacity={isDisabled && !isSelected ? 0.4 : 1}
            pressStyle={{ scale: 0.95, opacity: 0.8 }}
            onPress={() => {
              haptic.selection();
              onSelectDay(day);
            }}
            gap={2}
          >
            <Text
              fontSize={11}
              fontWeight="500"
              color={isSelected ? "$primaryForeground" : "$colorMuted"}
            >
              {label}
            </Text>
            <Text
              fontSize={16}
              fontWeight={isSelected ? "700" : "600"}
              color={isSelected ? "$primaryForeground" : "$color"}
            >
              {day.getDate()}
            </Text>
          </YStack>
        );
      })}
    </ScrollView>
  );
}
