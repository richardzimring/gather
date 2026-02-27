import { Clock, MapPin, MessageSquare, X } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { CounterProposal } from '../../lib/api/generated/types.gen';
import { Button } from './Button';
import { Card } from './Card';

// ============================================
// Helpers
// ============================================

function formatProposalTime(
  startTime?: string,
  endTime?: string,
): string | null {
  if (!startTime) return null;
  const start = new Date(startTime);
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dayStr = `${DAYS_SHORT[start.getDay()]}, ${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endTime) return `${dayStr} · ${startTimeStr}`;
  const end = new Date(endTime);
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dayStr} · ${startTimeStr} – ${endTimeStr}`;
}

// ============================================
// Component
// ============================================

interface CounterProposalCardProps {
  counterProposal: CounterProposal;
  /** Whether the current viewer is the host (shows Apply button) */
  isHost?: boolean;
  /** Whether the Apply action is in progress */
  isApplying?: boolean;
  /** Called when the host taps "Apply" */
  onApply?: () => void;
  /** Whether the current viewer is the one who submitted this proposal (shows trash button) */
  isOwn?: boolean;
  /** Whether the retract action is in progress */
  isRetracting?: boolean;
  /** Called when the invitee taps the trash button to retract their proposal */
  onRetract?: () => void;
}

/**
 * Compact inline card showing a counter proposal's details.
 * Shown in the invitee list for any invitee who has submitted a proposal.
 * Hosts see an "Apply" button to accept the proposal.
 */
export function CounterProposalCard({
  counterProposal,
  isHost,
  isApplying,
  onApply,
  isOwn,
  isRetracting,
  onRetract,
}: CounterProposalCardProps) {
  const timeLabel = formatProposalTime(
    counterProposal.startTime,
    counterProposal.endTime,
  );

  const hasContent =
    timeLabel || counterProposal.location || counterProposal.message;

  if (!hasContent) return null;

  return (
    <Card marginTop="$2" outlined>
      {/* Header row: label + optional X dismiss button */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$2"
      >
        <Text
          fontSize={11}
          color="$colorMuted"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          Proposed Change
        </Text>

        {isOwn && onRetract && (
          <YStack
            onPress={isRetracting ? undefined : onRetract}
            padding="$1"
            borderRadius="$10"
            pressStyle={{ opacity: 0.6 }}
            opacity={isRetracting ? 0.4 : 1}
          >
            <X size={14} color="$colorMuted" />
          </YStack>
        )}
      </XStack>

      <XStack alignItems="flex-end" gap="$2">
        <YStack gap="$2" flex={1}>
          {timeLabel && (
            <XStack alignItems="center" gap="$2">
              <Clock size={13} color="$colorMuted" />
              <Text fontSize={13} color="$color" flex={1}>
                {timeLabel}
              </Text>
            </XStack>
          )}

          {counterProposal.location && (
            <XStack alignItems="center" gap="$2">
              <MapPin size={13} color="$colorMuted" />
              <Text fontSize={13} color="$color" flex={1} numberOfLines={1}>
                {counterProposal.location}
              </Text>
            </XStack>
          )}

          {counterProposal.message && (
            <XStack alignItems="flex-start" gap="$2">
              <MessageSquare size={13} color="$colorMuted" marginTop={2} />
              <Text
                fontSize={13}
                color="$colorMuted"
                flex={1}
                fontStyle="italic"
              >
                &ldquo;{counterProposal.message}&rdquo;
              </Text>
            </XStack>
          )}
        </YStack>

        {isHost && onApply && (
          <Button
            variant="outline"
            buttonSize="sm"
            onPress={onApply}
            loading={isApplying}
            disabled={isApplying}
            flexShrink={0}
          >
            Apply
          </Button>
        )}
      </XStack>
    </Card>
  );
}
