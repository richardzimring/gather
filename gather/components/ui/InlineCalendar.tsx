import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { useMemo, useState } from "react";
import { Text, XStack, YStack } from "tamagui";
import { haptic } from "../../lib/haptics";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Get a date string key (YYYY-MM-DD) for comparison purposes.
 */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Get all calendar days for a given month, including leading/trailing days
 * from adjacent months to fill the 7-column grid.
 */
function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Leading days from previous month
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Trailing days to fill last row
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

export interface InlineCalendarProps {
  /** Currently selected date (single-date mode) */
  selectedDate?: Date | null;
  /** Callback when a date is tapped (single-date mode) */
  onSelectDate?: (date: Date) => void;
  /** Range start date (range mode) */
  rangeStart?: Date | null;
  /** Range end date (range mode) */
  rangeEnd?: Date | null;
  /** Callback when range changes (range mode) */
  onSelectRange?: (start: Date, end: Date | null) => void;
  /** Minimum selectable date (dates before this are disabled) */
  minDate?: Date;
  /** Maximum selectable date (dates after this are disabled) */
  maxDate?: Date;
  /** Callback when the displayed month changes */
  onMonthChange?: (year: number, month: number) => void;
}

/**
 * Compact inline calendar month grid built with Tamagui primitives.
 * Supports single-date selection, range selection, availability dot indicators,
 * and month navigation.
 *
 * Range mode is activated when `onSelectRange` is provided.
 * - First tap: sets the start date
 * - Second tap: sets the end date (range fills between them)
 * - Tapping an endpoint when a range exists: resets to single selection
 */
export function InlineCalendar({
  selectedDate,
  onSelectDate,
  rangeStart,
  rangeEnd,
  onSelectRange,
  minDate,
  maxDate,
  onMonthChange,
}: InlineCalendarProps) {
  const isRangeMode = !!onSelectRange;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [displayMonth, setDisplayMonth] = useState(() => {
    const base = rangeStart ?? selectedDate ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const calendarDays = useMemo(
    () => getCalendarDays(displayMonth.year, displayMonth.month),
    [displayMonth.year, displayMonth.month]
  );

  // Single-date mode key
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const todayKey = toDateKey(today);

  // Range mode keys
  const rangeStartKey = rangeStart ? toDateKey(rangeStart) : null;
  const rangeEndKey = rangeEnd ? toDateKey(rangeEnd) : null;

  // Normalized range start/end timestamps for in-range comparison
  const rangeStartTime = useMemo(() => {
    if (!rangeStart) return null;
    const d = new Date(rangeStart);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [rangeStart]);

  const rangeEndTime = useMemo(() => {
    if (!rangeEnd) return null;
    const d = new Date(rangeEnd);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [rangeEnd]);

  const minDateNorm = useMemo(() => {
    if (!minDate) return null;
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate]);

  const maxDateNorm = useMemo(() => {
    if (!maxDate) return null;
    const d = new Date(maxDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [maxDate]);

  const monthLabel = new Date(
    displayMonth.year,
    displayMonth.month,
    1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const canGoPrev = useMemo(() => {
    if (!minDateNorm) return true;
    const prevMonth = displayMonth.month === 0 ? 11 : displayMonth.month - 1;
    const prevYear =
      displayMonth.month === 0 ? displayMonth.year - 1 : displayMonth.year;
    const lastDayOfPrev = new Date(prevYear, prevMonth + 1, 0);
    return lastDayOfPrev >= minDateNorm;
  }, [minDateNorm, displayMonth]);

  const navigateMonth = (delta: number) => {
    setDisplayMonth((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      onMonthChange?.(newYear, newMonth);
      return { year: newYear, month: newMonth };
    });
  };

  const handleDayPress = (day: Date) => {
    haptic.selection();
    
    const selected = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate()
    );

    if (isRangeMode) {
      const selectedTime = selected.getTime();

      if (!rangeStart) {
        // No start yet — set it
        onSelectRange!(selected, null);
      } else if (rangeEnd) {
        // Already have a full range — tapping resets to single date
        onSelectRange!(selected, null);
      } else {
        // Have start but no end
        const startTime = new Date(rangeStart!);
        startTime.setHours(0, 0, 0, 0);

        if (selectedTime === startTime.getTime()) {
          // Tapped same date — keep as single date (no-op)
          return;
        } else if (selectedTime > startTime.getTime()) {
          // Tapped after start — set end
          onSelectRange!(rangeStart!, selected);
        } else {
          // Tapped before start — swap: tapped becomes start, old start becomes end
          onSelectRange!(selected, rangeStart!);
        }
      }
    } else {
      onSelectDate?.(selected);
    }
  };

  // Split days into rows of 7
  const rows: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    rows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <YStack gap="$2">
      {/* Month navigation header */}
      <XStack alignItems="center" justifyContent="space-between">
        <YStack
          width={32}
          height={32}
          borderRadius="$2"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ scale: 0.9, opacity: 0.7 }}
          opacity={canGoPrev ? 1 : 0.3}
          onPress={canGoPrev ? () => {
            haptic.light();
            navigateMonth(-1);
          } : undefined}
        >
          <ChevronLeft size={18} color="$color" />
        </YStack>

        <Text fontWeight="600" fontSize={15}>
          {monthLabel}
        </Text>

        <YStack
          width={32}
          height={32}
          borderRadius="$2"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ scale: 0.9, opacity: 0.7 }}
          onPress={() => {
            haptic.light();
            navigateMonth(1);
          }}
        >
          <ChevronRight size={18} color="$color" />
        </YStack>
      </XStack>

      {/* Day-of-week headers */}
      <XStack>
        {DAYS_OF_WEEK.map((day) => (
          <YStack key={day} flex={1} alignItems="center" paddingVertical="$1">
            <Text fontSize={12} color="$colorMuted" fontWeight="500">
              {day}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Calendar grid */}
      {rows.map((row, rowIndex) => (
        <XStack key={rowIndex}>
          {row.map((day, colIndex) => {
            const dateKey = toDateKey(day);
            const isToday = dateKey === todayKey;
            const isPast = minDateNorm ? day < minDateNorm : false;
            const isBeyondMax = maxDateNorm ? day > maxDateNorm : false;
            // Truly disabled = out of the selectable date range
            const isDisabled = isPast || isBeyondMax;

            // Range mode: determine if this day is start, end, or in-range
            const isRangeStart = isRangeMode && dateKey === rangeStartKey;
            const isRangeEnd = isRangeMode && dateKey === rangeEndKey;
            const isEndpoint = isRangeStart || isRangeEnd;

            // In-range: between start and end (exclusive of endpoints)
            const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
            const isInRange =
              isRangeMode &&
              rangeStartTime !== null &&
              rangeEndTime !== null &&
              dayTime > rangeStartTime &&
              dayTime < rangeEndTime &&
              !isDisabled;

            // For the range highlight band, we need to know position in the row
            const isFirstInRow = colIndex === 0;
            const isLastInRow = colIndex === 6;

            // Should this cell show the range band background?
            const showRangeBand = isInRange || (isEndpoint && rangeEndTime !== null);

            // Single-date mode selected
            const isSelected = !isRangeMode && dateKey === selectedKey;

            // Determine circle background color
            const circleBackground = isEndpoint
              ? "$primary"
              : isSelected
                ? "$primary"
                : isToday
                  ? "$backgroundHover"
                  : "transparent";

            // Determine text styling — disabled days are very obviously faded
            const textColor = isEndpoint || isSelected
              ? "$primaryForeground"
              : isDisabled
                ? "$colorSubtle"
                : "$color";
            const textWeight = isEndpoint || isSelected || isToday ? "600" : "400";
            const textOpacity = isDisabled ? 0.3 : 1;

            // Range band styling: extend behind the circle for in-range days
            // For start endpoint: band extends to the right
            // For end endpoint: band extends to the left
            // For in-range days: band extends full width
            let bandLeft = false;
            let bandRight = false;
            if (showRangeBand && !isDisabled) {
              if (isRangeStart && !isRangeEnd) {
                bandRight = true;
              } else if (isRangeEnd && !isRangeStart) {
                bandLeft = true;
              } else if (isInRange) {
                bandLeft = true;
                bandRight = true;
              }
              // If start === end (same day), no band
            }

            return (
              <YStack
                key={dateKey}
                flex={1}
                alignItems="center"
                paddingVertical={2}
              >
                {/* Container for the band + circle overlay */}
                <YStack
                  width="100%"
                  height={36}
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                >
                  {/* Range band background */}
                  {(bandLeft || bandRight) && (
                    <YStack
                      position="absolute"
                      top={0}
                      bottom={0}
                      left={bandLeft ? (isFirstInRow ? 18 : 0) : "50%"}
                      right={bandRight ? (isLastInRow ? 18 : 0) : "50%"}
                      backgroundColor="$backgroundHover"
                    />
                  )}

                  {/* Date circle */}
                  <YStack
                    width={36}
                    height={36}
                    borderRadius={18}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={circleBackground}
                    zIndex={1}
                    pressStyle={
                      isDisabled
                        ? undefined
                        : { scale: 0.92, opacity: 0.7 }
                    }
                    onPress={
                      isDisabled ? undefined : () => handleDayPress(day)
                    }
                  >
                    <Text
                      fontSize={14}
                      fontWeight={textWeight as any}
                      color={textColor}
                      opacity={textOpacity}
                    >
                      {day.getDate()}
                    </Text>
                  </YStack>
                </YStack>
              </YStack>
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
}

export { toDateKey };
