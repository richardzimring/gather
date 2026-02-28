import { Text, XStack, YStack, Circle, Theme } from 'tamagui';

import {
  AttendeeAvatarStack,
  type AvatarStackPerson,
} from './AttendeeAvatarStack';
import { BadgeLabel } from './Badge';
import { Card } from './Card';
import { SkeletonBar, SkeletonCircle } from './Skeleton';
import { haptic } from '../../lib/haptics';

// ============================================
// Types
// ============================================

export interface EventCardProps {
  /** Event title */
  title: string;
  /** Emoji for the event (shows placeholder if not provided) */
  emoji?: string | null;
  /** Whether the emoji is currently being generated (shows skeleton while loading) */
  isEmojiLoading?: boolean;
  /** Formatted time string (e.g. "Today, 3:00 PM") */
  timeLabel: string;
  /** Location name */
  location?: string | null;
  /** Whether the current user is the host */
  isHost?: boolean;
  /** Whether this is a pending invitation (dashed border style) */
  isPending?: boolean;
  /** People to show in the avatar stack */
  people?: AvatarStackPerson[];
  /** Summary text for the avatar stack (e.g. "3 of 5 going") */
  attendeeSummary?: string;
  /** Whether to show status indicators on avatars */
  showAvatarStatus?: boolean;
  /** Called when card is pressed (makes it pressable) */
  onPress?: () => void;
  /** Show a "Respond" button */
  showRespondButton?: boolean;
  /** Called when Respond button is pressed */
  onRespondPress?: () => void;
  /** Whether this is a preview card (e.g. during event creation) - uses placeholder styling */
  isPreview?: boolean;
}

/**
 * EventCard — Reusable event card that matches the home page event card style.
 *
 * Used on the home page for real events and on the plan page as a live preview
 * while filling in event details.
 */
export function EventCard({
  title,
  emoji,
  isEmojiLoading = false,
  timeLabel,
  location,
  isHost = false,
  isPending = false,
  people = [],
  attendeeSummary,
  showAvatarStatus = true,
  onPress,
  showRespondButton = false,
  onRespondPress,
  isPreview = false,
}: EventCardProps) {
  const displayTitle = title || (isPreview ? 'Your event' : 'Untitled');
  const displayEmoji = emoji ?? (isPreview ? '✨' : '📅');
  const titleIsPlaceholder = !title && isPreview;

  return (
    <Theme name="Card">
      <Card
        pressable={!!onPress}
        onPress={() => {
          if (onPress) {
            haptic.light();
            onPress();
          }
        }}
        outlined={isPending}
      >
        <YStack gap="$3">
          {/* Event header row */}
          <XStack alignItems="center" gap="$3">
            {isEmojiLoading ? (
              <SkeletonCircle size={44} />
            ) : (
              <Circle size={44} backgroundColor="$backgroundHover">
                <Text fontSize={24}>{displayEmoji}</Text>
              </Circle>
            )}
            <YStack flex={1} gap="$1">
              <XStack alignItems="center" gap="$2">
                <Text
                  fontWeight="600"
                  fontSize={16}
                  color={titleIsPlaceholder ? '$colorMuted' : undefined}
                >
                  {displayTitle}
                </Text>
                {isHost && <BadgeLabel variant="host">Host</BadgeLabel>}
              </XStack>
              {!!timeLabel && (
                <Text color="$colorMuted" fontSize={14}>
                  {timeLabel}
                </Text>
              )}
              {!!location && (
                <Text color="$colorMuted" fontSize={13} numberOfLines={1}>
                  {location}
                </Text>
              )}
            </YStack>
          </XStack>

          {/* Attendees row */}
          {(people.length > 0 || attendeeSummary) && (
            <XStack alignItems="center" justifyContent="space-between">
              <AttendeeAvatarStack
                people={people}
                maxVisible={4}
                avatarSize={35}
                overlap={6}
                summaryText={attendeeSummary}
                showStatus={showAvatarStatus}
              />
              {showRespondButton && onRespondPress && (
                <XStack
                  backgroundColor="$primary"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius="$2"
                  pressStyle={{ scale: 0.95, opacity: 0.8 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    haptic.medium();
                    onRespondPress();
                  }}
                >
                  <Text
                    color="$primaryForeground"
                    fontSize={13}
                    fontWeight="600"
                  >
                    Respond
                  </Text>
                </XStack>
              )}
            </XStack>
          )}
        </YStack>
      </Card>
    </Theme>
  );
}

/**
 * EventCardSkeleton — Loading placeholder that mimics EventCard structure.
 */
export function EventCardSkeleton() {
  return (
    <Theme name="Card">
      <Card>
        <YStack gap="$3">
          {/* Event header row skeleton */}
          <XStack alignItems="center" gap="$3">
            <SkeletonCircle size={44} />
            <YStack flex={1} gap="$2">
              <SkeletonBar width={160} height={16} />
              <SkeletonBar width={120} height={14} />
            </YStack>
          </XStack>

          {/* Attendees row skeleton */}
          <XStack alignItems="center">
            <SkeletonCircle size={25} />
            <SkeletonCircle size={25} />
            <SkeletonCircle size={25} />
            <SkeletonBar width={80} height={12} style={{ marginLeft: 8 }} />
          </XStack>
        </YStack>
      </Card>
    </Theme>
  );
}
