import { router } from "expo-router";
import { Text, XStack, YStack, Theme, Separator } from "tamagui";
import { Clock, Pencil, Plus } from "@tamagui/lucide-icons";

import { Button } from "./Button";
import { Card } from "./Card";
import { SkeletonBar } from "./Skeleton";
import { useBlockedWindows } from "../../lib/hooks";
import type { BlockedWindow } from "../../lib/api/client";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function recurringLabel(pattern: string, daysOfWeek?: number[]): string {
  if (pattern === "weekly" && daysOfWeek) {
    const sorted = [...daysOfWeek].sort((a, b) => a - b).join(",");
    if (sorted === "1,2,3,4,5") return "Weekdays";
    if (sorted === "0,6") return "Weekends";
  }
  switch (pattern) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "biweekly":
      return "Every two weeks";
    case "monthly":
      return "Every month";
    default:
      return pattern;
  }
}

function BlockedWindowRow({
  window: win,
  onEdit,
}: {
  window: BlockedWindow;
  onEdit: () => void;
}) {
  const startDate = new Date(win.startTime);
  const endDate = new Date(win.endTime);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <XStack alignItems="center" paddingVertical="$3" gap="$3">
      <YStack
        width={36}
        height={36}
        borderRadius={8}
        backgroundColor="$backgroundHover"
        alignItems="center"
        justifyContent="center"
      >
        <Clock size={16} color="$colorMuted" />
      </YStack>

      <YStack flex={1} gap={2}>
        <Text fontWeight="600" fontSize={15}>
          {formatTime(win.startTime)} – {formatTime(win.endTime)}
        </Text>
        <Text color="$colorMuted" fontSize={13}>
          {win.recurring
            ? recurringLabel(win.recurring.pattern, win.recurring.daysOfWeek)
            : sameDay
              ? formatDate(win.startTime)
              : `${formatDate(win.startTime)} – ${formatDate(win.endTime)}`}
        </Text>
      </YStack>

      <Button
        variant="ghost"
        buttonSize="sm"
        icon={<Pencil size={15} color="$colorMuted" />}
        onPress={onEdit}
        hapticStyle="light"
      />
    </XStack>
  );
}

export function BlockedWindowsCard() {
  const { data: windows, isLoading } = useBlockedWindows();

  return (
    <YStack gap="$4" width="100%">
      <Theme name="Card">
        <Card>
          {isLoading ? (
            <YStack gap="$3" paddingVertical="$2">
              {[1, 2, 3].map((i) => (
                <XStack key={i} alignItems="center" gap="$3">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius={8}
                    backgroundColor="$backgroundHover"
                  />
                  <YStack flex={1} gap="$1">
                    <SkeletonBar width={120} height={14} />
                    <SkeletonBar width={80} height={12} />
                  </YStack>
                </XStack>
              ))}
            </YStack>
          ) : !windows || windows.length === 0 ? (
            <YStack alignItems="center" paddingVertical="$6" gap="$2">
              <Clock size={28} color="$colorMuted" />
              <Text color="$colorMuted" textAlign="center" fontSize={14}>
                No blocked windows yet
              </Text>
              <Text
                color="$colorMuted"
                textAlign="center"
                fontSize={13}
                maxWidth={240}
              >
                Add windows when you&apos;re not available — like work hours or
                Sunday mornings.
              </Text>
            </YStack>
          ) : (
            windows.map((win, index) => (
              <YStack key={win.windowId}>
                {index > 0 && <Separator />}
                <BlockedWindowRow
                  window={win}
                  onEdit={() => router.push(`/blocked/${win.windowId}`)}
                />
              </YStack>
            ))
          )}
        </Card>
      </Theme>

      <Button
        variant="outline"
        buttonSize="lg"
        fullWidth
        icon={<Plus size={18} />}
        onPress={() => router.push("/blocked/new")}
      >
        Add blocked time
      </Button>
    </YStack>
  );
}
