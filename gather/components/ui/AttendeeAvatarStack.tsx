import { Circle, Text, XStack, GetProps } from "tamagui";

import type { InviteeStatus } from "../../lib/api/generated/types.gen";

/**
 * Represents a person to display in the avatar stack
 */
export type AvatarStackPerson = {
  id: string;
  initials: string;
  status: InviteeStatus | "host";
  avatarUrl?: string;
};

/**
 * Get status indicator color
 */
function getStatusColor(status: InviteeStatus | "host"): string {
  switch (status) {
    case "accepted":
    case "host":
      return "$success";
    case "declined":
      return "$error";
    case "maybe":
      return "$warning";
    case "pending":
    default:
      return "$colorMuted";
  }
}

/**
 * Sort people by status priority (host first, then accepted, maybe, pending, declined)
 */
function sortByStatus(people: AvatarStackPerson[]): AvatarStackPerson[] {
  const priority: Record<InviteeStatus | "host", number> = {
    host: 0,
    accepted: 1,
    maybe: 2,
    pending: 3,
    declined: 4,
  };
  return [...people].sort((a, b) => priority[a.status] - priority[b.status]);
}

export type AttendeeAvatarStackProps = {
  /** Array of people to display */
  people: AvatarStackPerson[];
  /** Maximum number of avatars to show before overflow */
  maxVisible?: number;
  /** Size of each avatar circle */
  avatarSize?: number;
  /** How much avatars overlap (negative margin) */
  overlap?: number;
  /** Whether to show status indicator dots */
  showStatus?: boolean;
  /** Whether to sort by status (host/accepted first) */
  sortByStatusPriority?: boolean;
  /** Summary text to show after avatars (e.g., "3 of 5 going") */
  summaryText?: string;
};

/**
 * AttendeeAvatarStack - A row of overlapping avatar circles with status indicators.
 *
 * Common pattern used in social apps (GitHub, Slack, Figma) to show
 * a compact preview of participants with their attendance status.
 *
 * @example
 * ```tsx
 * <AttendeeAvatarStack
 *   people={[
 *     { id: "1", initials: "RZ", status: "host" },
 *     { id: "2", initials: "JD", status: "accepted" },
 *     { id: "3", initials: "SM", status: "maybe" },
 *   ]}
 *   maxVisible={4}
 *   summaryText="2 of 3 going"
 * />
 * ```
 */
export function AttendeeAvatarStack({
  people,
  maxVisible = 5,
  avatarSize = 36,
  overlap = 8,
  showStatus = true,
  sortByStatusPriority = true,
  summaryText,
}: AttendeeAvatarStackProps) {
  const sortedPeople = sortByStatusPriority ? sortByStatus(people) : people;
  const visiblePeople = sortedPeople.slice(0, maxVisible);
  const overflowCount = Math.max(0, sortedPeople.length - maxVisible);

  // Calculate status dot size relative to avatar
  const statusDotSize = Math.max(6, Math.round(avatarSize * 0.28));
  const statusBorderWidth = Math.max(1.5, Math.round(avatarSize * 0.06));
  const fontSize = Math.max(10, Math.round(avatarSize * 0.4));

  return (
    <XStack alignItems="center" gap="$3">
      {/* Avatar Stack */}
      <XStack alignItems="center">
        {visiblePeople.map((person, index) => (
          <Circle
            key={person.id}
            size={avatarSize}
            backgroundColor="$backgroundHover"
            marginLeft={index > 0 ? -overlap : 0}
            borderWidth={2}
            borderColor="$background"
            zIndex={visiblePeople.length - index}
          >
            <Text fontSize={fontSize} fontWeight="500">
              {person.initials}
            </Text>

            {/* Status indicator dot */}
            {showStatus && (
              <Circle
                size={statusDotSize}
                backgroundColor={getStatusColor(person.status)}
                position="absolute"
                bottom={-1}
                right={-1}
                borderWidth={statusBorderWidth}
                borderColor="$background"
              />
            )}
          </Circle>
        ))}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <Circle
            size={avatarSize}
            marginLeft={-overlap}
            backgroundColor="$backgroundHover"
            borderWidth={2}
            borderColor="$background"
            zIndex={0}
          >
            <Text fontSize={fontSize - 1} color="$colorMuted" fontWeight="500">
              +{overflowCount}
            </Text>
          </Circle>
        )}
      </XStack>

      {/* Summary text */}
      {summaryText && (
        <Text fontWeight="500" fontSize={14}>
          {summaryText}
        </Text>
      )}
    </XStack>
  );
}

export type { GetProps };
