import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, XStack, YStack, Theme } from "tamagui";
import { Trash2 } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Card } from "../../components/ui/Card";
import { CancelHeader } from "../../components/ui/ScreenHeader";
import { GlassButton } from "../../components/ui/GlassFAB";
import {
  useBlockedWindows,
  useCreateBlockedWindow,
  useUpdateBlockedWindow,
  useDeleteBlockedWindow,
} from "../../lib/hooks";
import type { RecurringPattern } from "../../lib/api/client";
import { haptic } from "../../lib/haptics";

type PatternOption = RecurringPattern | "weekdays" | "weekends";

const PATTERNS: { value: PatternOption; label: string; description: string }[] =
  [
    { value: "daily", label: "Every day", description: "Repeats daily" },
    { value: "weekdays", label: "Weekdays", description: "Mon – Fri" },
    { value: "weekends", label: "Weekends", description: "Sat & Sun" },
    {
      value: "weekly",
      label: "Every week",
      description: "Same time each week",
    },
    {
      value: "biweekly",
      label: "Every two weeks",
      description: "Alternate weeks",
    },
    {
      value: "monthly",
      label: "Every month",
      description: "Same date monthly",
    },
  ];

function buildRecurring(pattern: PatternOption) {
  if (pattern === "weekdays") {
    return {
      pattern: "weekly" as RecurringPattern,
      daysOfWeek: [1, 2, 3, 4, 5],
    };
  }
  if (pattern === "weekends") {
    return { pattern: "weekly" as RecurringPattern, daysOfWeek: [0, 6] };
  }
  return { pattern: pattern as RecurringPattern };
}

function inferPatternOption(
  pattern: RecurringPattern,
  daysOfWeek?: number[],
): PatternOption {
  if (pattern === "weekly" && daysOfWeek) {
    const sorted = [...daysOfWeek].sort((a, b) => a - b).join(",");
    if (sorted === "1,2,3,4,5") return "weekdays";
    if (sorted === "0,6") return "weekends";
  }
  return pattern;
}

function defaultStartTime() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

export default function BlockedWindowScreen() {
  const insets = useSafeAreaInsets();
  const { windowId } = useLocalSearchParams<{ windowId: string }>();
  const isNew = windowId === "new";

  const { data: windows, isLoading } = useBlockedWindows();
  const createBlockedWindow = useCreateBlockedWindow();
  const updateBlockedWindow = useUpdateBlockedWindow();
  const deleteBlockedWindow = useDeleteBlockedWindow();

  const win = isNew ? undefined : windows?.find((w) => w.windowId === windowId);

  const [startTime, setStartTime] = useState<Date>(() => defaultStartTime());
  const [endTime, setEndTime] = useState<Date>(
    () => new Date(defaultStartTime().getTime() + 2 * 60 * 60 * 1000),
  );
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurringPattern, setRecurringPattern] =
    useState<PatternOption>("weekly");
  const [initialized, setInitialized] = useState(isNew);

  useEffect(() => {
    if (win && !initialized) {
      setStartTime(new Date(win.startTime));
      setEndTime(new Date(win.endTime));
      if (win.recurring) {
        setIsRecurring(true);
        setRecurringPattern(
          inferPatternOption(win.recurring.pattern, win.recurring.daysOfWeek),
        );
      } else {
        setIsRecurring(false);
      }
      setInitialized(true);
    }
  }, [win, initialized]);

  const isValidRange = endTime > startTime;

  const handleSave = async () => {
    if (!isValidRange) {
      Alert.alert("Invalid time range", "End time must be after start time.");
      return;
    }

    try {
      if (isNew) {
        await createBlockedWindow.mutateAsync({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...(isRecurring && { recurring: buildRecurring(recurringPattern) }),
        });
      } else {
        await updateBlockedWindow.mutateAsync({
          windowId: windowId!,
          data: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            recurring: isRecurring
              ? buildRecurring(recurringPattern)
              : undefined,
          },
        });
      }
      haptic.success();
      router.back();
    } catch {
      haptic.error();
      Alert.alert(
        "Something went wrong",
        isNew
          ? "Couldn't save this blocked window. Please try again."
          : "Couldn't update this blocked window. Please try again.",
      );
    }
  };

  const handleDelete = () => {
    if (!windowId) return;
    haptic.warning();
    Alert.alert(
      "Remove blocked window?",
      "Gather will be able to show you as available during this window again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBlockedWindow.mutateAsync(windowId);
              router.back();
            } catch {
              haptic.error();
              Alert.alert(
                "Something went wrong",
                "Couldn't remove this blocked window. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  if (!isNew && (isLoading || !initialized)) {
    return <YStack flex={1} backgroundColor="$background" />;
  }

  if (!isNew && !win) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$4"
      >
        <Text fontSize={18} fontWeight="600" textAlign="center">
          Window not found
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

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
        }}
      >
        <CancelHeader
          title={isNew ? "Block a Time" : "Edit Blocked Window"}
          rightAction={
            !isNew ? (
              <GlassButton
                icon={<Trash2 size={18} color="$error" />}
                onPress={handleDelete}
                size={36}
              />
            ) : undefined
          }
        />

        <Text
          color="$colorMuted"
          fontSize={14}
          lineHeight={21}
          marginBottom="$4"
        >
          Gather will show you as busy during this window.
        </Text>

        {/* Time Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text fontWeight="600" fontSize={14} marginBottom="$3">
              Time window
            </Text>
            <YStack gap="$4">
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted" fontSize={14}>
                  Starts
                </Text>
                <DateTimePicker
                  value={startTime}
                  mode="datetime"
                  onChange={(_, date) => {
                    if (!date) return;
                    setStartTime(date);
                    if (date >= endTime) {
                      setEndTime(new Date(date.getTime() + 60 * 60 * 1000));
                    }
                  }}
                />
              </XStack>
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted" fontSize={14}>
                  Ends
                </Text>
                <DateTimePicker
                  value={endTime}
                  mode="datetime"
                  onChange={(_, date) => date && setEndTime(date)}
                />
              </XStack>
              {!isValidRange && (
                <Text color="$destructive" fontSize={13}>
                  End time must be after start time.
                </Text>
              )}
            </YStack>
          </Card>
        </Theme>

        {/* Recurring */}
        <Theme name="Card">
          <Card marginBottom="$5">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom={isRecurring ? "$4" : 0}
            >
              <YStack flex={1} marginRight="$4">
                <Text fontWeight="600" fontSize={14}>
                  Repeat
                </Text>
                <Text color="$colorMuted" fontSize={13} marginTop={2}>
                  Block this same window regularly
                </Text>
              </YStack>
              <Toggle
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  haptic.selection();
                  setIsRecurring(checked);
                }}
              />
            </XStack>

            {isRecurring && (
              <YStack gap="$2">
                {PATTERNS.map((pattern) => {
                  const isSelected = recurringPattern === pattern.value;
                  return (
                    <XStack
                      key={pattern.value}
                      alignItems="center"
                      paddingVertical="$2"
                      paddingHorizontal="$3"
                      borderRadius="$2"
                      backgroundColor={
                        isSelected ? "$secondary" : "transparent"
                      }
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => {
                        haptic.selection();
                        setRecurringPattern(pattern.value);
                      }}
                      gap="$3"
                    >
                      <YStack
                        width={18}
                        height={18}
                        borderRadius={9}
                        borderWidth={2}
                        borderColor={isSelected ? "$primary" : "$borderColor"}
                        backgroundColor={
                          isSelected ? "$primary" : "transparent"
                        }
                        alignItems="center"
                        justifyContent="center"
                      />
                      <YStack flex={1}>
                        <Text fontWeight="500" fontSize={14}>
                          {pattern.label}
                        </Text>
                        <Text color="$colorMuted" fontSize={12}>
                          {pattern.description}
                        </Text>
                      </YStack>
                    </XStack>
                  );
                })}
              </YStack>
            )}
          </Card>
        </Theme>

        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={handleSave}
          loading={
            isNew
              ? createBlockedWindow.isPending
              : updateBlockedWindow.isPending
          }
          loadingText="Saving..."
          disabled={!isValidRange}
        >
          {isNew ? "Save blocked time" : "Save changes"}
        </Button>
      </ScrollView>
    </YStack>
  );
}
