import { useCallback, useRef } from 'react';
import {
  ScrollView as RNScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { haptic } from '../../lib/haptics';

// ============================================
// Types
// ============================================

export interface ChipOption {
  label: string;
  value: number;
}

export interface TimeChipPickerProps {
  /** Label displayed above the chip row (e.g. "Start time", "Duration") */
  label: string;
  /** The chip options to display */
  options: ChipOption[];
  /** Currently selected value, or null if none */
  selectedValue: number | null;
  /** Called when a chip is tapped */
  onSelect: (value: number) => void;
  /** Whether tapping the active chip deselects it (calls onSelect with -1) */
  allowDeselect?: boolean;
  /** If true, auto-scroll to center the selected chip on mount */
  autoScrollToSelected?: boolean;
}

// ============================================
// Constants
// ============================================

export const DURATION_OPTIONS: ChipOption[] = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: '2.5h', value: 150 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
  { label: '5h', value: 300 },
  { label: '6h', value: 360 },
  { label: '7h', value: 420 },
  { label: '8h', value: 480 },
  { label: '9h', value: 540 },
  { label: '10h', value: 600 },
  { label: '11h', value: 660 },
  { label: '12h', value: 720 },
];

/** Start time chip options (minutes since midnight, 6 AM – 11 PM, 30-min intervals) */
export const START_TIME_OPTIONS: ChipOption[] = (() => {
  const options: ChipOption[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (const min of [0, 30]) {
      if (hour === 23 && min === 30) continue; // skip 11:30 PM
      const totalMinutes = hour * 60 + min;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMin = min === 0 ? '' : ':30';
      options.push({
        label: `${displayHour}${displayMin} ${ampm}`,
        value: totalMinutes,
      });
    }
  }
  return options;
})();

// ============================================
// Component
// ============================================

/**
 * Horizontal scrollable chip picker for time-related selections.
 * Extracted from the Plan page's inline chip rows for reuse.
 */
export function TimeChipPicker({
  label,
  options,
  selectedValue,
  onSelect,
  allowDeselect = false,
  autoScrollToSelected = false,
}: TimeChipPickerProps) {
  const scrollRef = useRef<RNScrollView>(null);
  const chipLayoutsRef = useRef<Record<number, { x: number; width: number }>>(
    {},
  );
  const containerWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const hasScrolledRef = useRef(false);
  // Capture the initial selected value at mount so later selections don't re-trigger scroll
  const initialValueRef = useRef(selectedValue);

  /**
   * Attempt the one-time animated scroll once we have all three measurements:
   * container width, content width, and the target chip layout.
   */
  const tryInitialScroll = useCallback(() => {
    if (
      !autoScrollToSelected ||
      hasScrolledRef.current ||
      initialValueRef.current === null
    )
      return;

    const chip = chipLayoutsRef.current[initialValueRef.current];
    const cw = containerWidthRef.current;
    const totalW = contentWidthRef.current;
    if (!chip || cw <= 0 || totalW <= 0) return;

    hasScrolledRef.current = true;
    const chipCenter = chip.x + chip.width / 2;
    const maxScroll = Math.max(0, totalW - cw);
    const scrollX = Math.min(maxScroll, Math.max(0, chipCenter - cw / 2));

    // Small delay so the ScrollView is fully ready
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: scrollX, animated: true });
    });
  }, [autoScrollToSelected]);

  const handleChipLayout = useCallback(
    (value: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current[value] = { x, width };
      if (value === initialValueRef.current) tryInitialScroll();
    },
    [tryInitialScroll],
  );

  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      containerWidthRef.current = event.nativeEvent.layout.width;
      tryInitialScroll();
    },
    [tryInitialScroll],
  );

  const handleContentSizeChange = useCallback(
    (w: number) => {
      contentWidthRef.current = w;
      tryInitialScroll();
    },
    [tryInitialScroll],
  );

  return (
    <YStack>
      <XStack alignItems="center" gap="$2" marginBottom="$2">
        <Text fontWeight="500" fontSize={13} color="$colorMuted">
          {label}
        </Text>
      </XStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={scrollRef as any}
        onLayout={handleContainerLayout}
        onContentSizeChange={handleContentSizeChange}
      >
        <XStack gap="$1.5" paddingVertical="$1">
          {options.map((option) => {
            const isActive = selectedValue === option.value;
            return (
              <YStack
                key={option.value}
                paddingVertical={6}
                paddingHorizontal={10}
                borderRadius="$2"
                backgroundColor={isActive ? '$primary' : '$backgroundHover'}
                pressStyle={{ scale: 0.95, opacity: 0.8 }}
                onPress={() => {
                  haptic.selection();
                  if (isActive && allowDeselect) {
                    onSelect(-1);
                  } else {
                    onSelect(option.value);
                  }
                }}
                onLayout={(e: LayoutChangeEvent) =>
                  handleChipLayout(option.value, e)
                }
              >
                <Text
                  fontSize={12}
                  fontWeight={isActive ? '600' : '400'}
                  color={isActive ? '$primaryForeground' : '$color'}
                >
                  {option.label}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
