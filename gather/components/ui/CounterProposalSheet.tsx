import { Calendar, FileText, MapPin, X } from '@tamagui/lucide-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Separator, Text, TextArea, Theme, XStack, YStack } from 'tamagui';

import { Card } from './Card';

import type { CounterProposal } from '../../lib/api/generated/types.gen';
import { haptic } from '../../lib/haptics';
import { Button } from './Button';
import { InlineCalendar } from './InlineCalendar';
import { LocationSearch, type PlaceResult } from './LocationSearch';
import { START_TIME_OPTIONS, TimeChipPicker } from './TimeChipPicker';

// ============================================
// Helpers
// ============================================

function snapToHalfHour(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

function minutesToIso(date: Date, minutes: number): string {
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return snapToHalfHour(d.getHours() * 60 + d.getMinutes());
}

// ============================================
// Types
// ============================================

interface CounterProposalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (counterProposal: CounterProposal) => Promise<void>;
  /** The event's current start time (ISO string) used to pre-populate */
  eventStartTime: string;
  /** The event's current end time (ISO string) used to pre-populate */
  eventEndTime: string;
  /** The event's current location name (if any) used to pre-populate */
  eventLocation?: string;
  /** An existing counter proposal to pre-fill when editing */
  existingProposal?: CounterProposal;
}

// ============================================
// Component
// ============================================

/**
 * Bottom sheet for submitting a counter proposal to an event.
 * Invitees use this to suggest an alternative time, location, or leave a message.
 * All fields are optional but at least one must differ from the original to submit.
 */
export function CounterProposalSheet({
  isOpen,
  onClose,
  onSubmit,
  eventStartTime,
  eventEndTime,
  eventLocation,
  existingProposal,
}: CounterProposalSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- Initialize state from existing proposal or event defaults ---
  const initialDate = useMemo(() => {
    const base = existingProposal?.startTime ?? eventStartTime;
    const d = new Date(base);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [existingProposal, eventStartTime]);

  const initialStartMinutes = useMemo(() => {
    const base = existingProposal?.startTime ?? eventStartTime;
    return isoToMinutes(base);
  }, [existingProposal, eventStartTime]);

  const initialEndMinutes = useMemo(() => {
    const base = existingProposal?.endTime ?? eventEndTime;
    return isoToMinutes(base);
  }, [existingProposal, eventEndTime]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [startMinutes, setStartMinutes] = useState<number>(initialStartMinutes);
  const [endMinutes, setEndMinutes] = useState<number>(initialEndMinutes);
  const [locationName, setLocationName] = useState<string | undefined>(
    existingProposal?.location ?? eventLocation,
  );
  const [message, setMessage] = useState(existingProposal?.message ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect changes vs. the original event
  const eventDate = useMemo(() => {
    const d = new Date(eventStartTime);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [eventStartTime]);
  const eventStartMinutes = useMemo(
    () => isoToMinutes(eventStartTime),
    [eventStartTime],
  );
  const eventEndMinutes = useMemo(
    () => isoToMinutes(eventEndTime),
    [eventEndTime],
  );

  const isTimeChanged =
    selectedDate.getTime() !== eventDate.getTime() ||
    startMinutes !== eventStartMinutes ||
    endMinutes !== eventEndMinutes;
  const isLocationChanged = locationName !== eventLocation;
  const hasMessage = message.trim().length > 0;
  const canSubmit = isTimeChanged || isLocationChanged || hasMessage;

  const endTimeOptions = useMemo(
    () => START_TIME_OPTIONS.filter((o) => o.value > startMinutes),
    [startMinutes],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  }, []);

  const handleStartTimeSelect = (value: number) => {
    setStartMinutes(value);
    if (endMinutes <= value) {
      const nextOption = START_TIME_OPTIONS.find((o) => o.value > value);
      if (nextOption) setEndMinutes(nextOption.value);
    }
  };

  const handleLocationSelect = (place: PlaceResult | null) => {
    setLocationName(place?.name ?? undefined);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    haptic.medium();
    setIsSubmitting(true);
    try {
      const counterProposal: CounterProposal = {};
      if (isTimeChanged) {
        counterProposal.startTime = minutesToIso(selectedDate, startMinutes);
        counterProposal.endTime = minutesToIso(selectedDate, endMinutes);
      }
      if (isLocationChanged && locationName) {
        counterProposal.location = locationName;
      }
      if (hasMessage) {
        counterProposal.message = message.trim();
      }
      await onSubmit(counterProposal);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const overlayBg = 'rgba(0, 0, 0, 0.5)';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Overlay — tap to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.overlay, { backgroundColor: overlayBg }]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? '#48484A' : '#C7C7CC' },
              ]}
            />
          </View>

          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bottomOffset={16}
          >
            <YStack gap="$4">
              {/* Header */}
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={18} fontWeight="600">
                  Suggest a Change
                </Text>
                <YStack
                  onPress={onClose}
                  padding="$2"
                  borderRadius="$10"
                  pressStyle={{ opacity: 0.6 }}
                >
                  <X size={20} color="$colorMuted" />
                </YStack>
              </XStack>

              {/* Date + Start time + End time */}
              <Theme name="Card">
                <Card>
                  <YStack gap="$4">
                    <YStack>
                      <XStack alignItems="center" gap="$2" marginBottom="$3">
                        <Calendar size={14} color="$colorMuted" />
                        <Text fontWeight="500" fontSize={14}>
                          When?
                        </Text>
                      </XStack>
                      <InlineCalendar
                        selectedDate={selectedDate}
                        onSelectDate={(d) => {
                          haptic.selection();
                          setSelectedDate(d);
                        }}
                        minDate={today}
                        maxDate={maxDate}
                      />
                    </YStack>

                    <Separator />

                    <TimeChipPicker
                      label="Start time"
                      options={START_TIME_OPTIONS}
                      selectedValue={startMinutes}
                      onSelect={handleStartTimeSelect}
                      autoScrollToSelected
                    />

                    <Separator />

                    <TimeChipPicker
                      label="End time"
                      options={endTimeOptions}
                      selectedValue={endMinutes}
                      onSelect={(v) => {
                        haptic.selection();
                        setEndMinutes(v);
                      }}
                      autoScrollToSelected
                    />
                  </YStack>
                </Card>
              </Theme>

              {/* Location */}
              <Theme name="Card">
                <Card>
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <MapPin size={14} color="$colorMuted" />
                      <Text fontWeight="500" fontSize={14}>
                        Where?{' '}
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
                      value={locationName}
                      onSelect={handleLocationSelect}
                      placeholder="Search for a place..."
                    />
                  </YStack>
                </Card>
              </Theme>

              {/* Message */}
              <Theme name="Card">
                <Card>
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <FileText size={14} color="$colorMuted" />
                      <Text fontWeight="500" fontSize={14}>
                        Message{' '}
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
                      placeholder="Anything you want the host to know..."
                      placeholderTextColor="$colorMuted"
                      value={message}
                      onChangeText={setMessage}
                      backgroundColor="$backgroundHover"
                      borderColor="$borderColor"
                      borderWidth={1}
                      borderRadius="$2"
                      padding="$3"
                      height={80}
                      fontSize={14}
                      maxLength={500}
                    />
                    {message.length > 400 && (
                      <Text fontSize={12} color="$colorMuted" textAlign="right">
                        {message.length}/500
                      </Text>
                    )}
                  </YStack>
                </Card>
              </Theme>

              {/* Submit */}
              <Button
                variant="primary"
                buttonSize="lg"
                fullWidth
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                loading={isSubmitting}
                loadingText="Sending..."
              >
                Send Suggestion
              </Button>
            </YStack>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
