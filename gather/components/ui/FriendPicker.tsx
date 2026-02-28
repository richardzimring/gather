import { Check } from '@tamagui/lucide-icons';
import { ScrollView, Circle, Text, XStack, YStack, Separator } from 'tamagui';

import type { FriendWithUser, Group } from '../../lib/api/generated/types.gen';
import { haptic } from '../../lib/haptics';

// ============================================
// Types
// ============================================

export interface FriendPickerProps {
  friends: FriendWithUser[];
  groups: Group[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /**
   * Called when a group chip is tapped. Receives the full list of member IDs.
   * If not provided, FriendPicker will call `onToggle` for each member individually.
   */
  onToggleGroup?: (memberIds: string[]) => void;
  /** IDs to exclude from the list (e.g. already-invited people) */
  excludeIds?: string[];
  maxVisible?: number;
}

// ============================================
// Internal Components
// ============================================

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <YStack
      width={20}
      height={20}
      borderRadius={4}
      borderWidth={1}
      borderColor={checked ? '$primary' : '$borderColor'}
      backgroundColor={checked ? '$primary' : 'transparent'}
      alignItems="center"
      justifyContent="center"
    >
      {checked && (
        <Check size={12} color="$primaryForeground" strokeWidth={3} />
      )}
    </YStack>
  );
}

// ============================================
// FriendPicker
// ============================================

export function FriendPicker({
  friends,
  groups,
  selectedIds,
  onToggle,
  onToggleGroup,
  excludeIds = [],
  maxVisible,
}: FriendPickerProps) {
  const excludeSet = new Set(excludeIds);
  const visibleFriends = friends.filter((f) => !excludeSet.has(f.friendId));
  const displayedFriends =
    maxVisible !== undefined
      ? visibleFriends.slice(0, maxVisible)
      : visibleFriends;

  const availableGroups = groups.filter((g) => g.memberIds.length > 0);

  const handleToggleGroup = (memberIds: string[]) => {
    if (onToggleGroup) {
      onToggleGroup(memberIds);
      return;
    }
    // Default: toggle each eligible member individually
    const eligibleIds = memberIds.filter((id) => !excludeSet.has(id));
    const allSelected = eligibleIds.every((id) => selectedIds.includes(id));
    eligibleIds.forEach((id) => {
      const isSelected = selectedIds.includes(id);
      if (allSelected && isSelected) {
        onToggle(id);
      } else if (!allSelected && !isSelected) {
        onToggle(id);
      }
    });
  };

  if (visibleFriends.length === 0) {
    return (
      <Text color="$colorMuted" fontSize={14} textAlign="center" padding="$3">
        No friends to add
      </Text>
    );
  }

  return (
    <YStack>
      {/* Group quick-select chips */}
      {availableGroups.length > 0 && (
        <YStack marginBottom="$3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2">
              {availableGroups.map((group) => {
                const eligibleIds = group.memberIds.filter(
                  (id) => !excludeSet.has(id),
                );
                if (eligibleIds.length === 0) return null;
                const allSelected = eligibleIds.every((id) =>
                  selectedIds.includes(id),
                );
                return (
                  <YStack
                    key={group.groupId}
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    backgroundColor={
                      allSelected ? '$primary' : '$backgroundHover'
                    }
                    borderRadius="$2"
                    pressStyle={{ scale: 0.95, opacity: 0.8 }}
                    onPress={() => {
                      haptic.selection();
                      handleToggleGroup(group.memberIds);
                    }}
                  >
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize={14}>{group.emoji ?? '👥'}</Text>
                      <Text
                        fontSize={13}
                        fontWeight="500"
                        color={allSelected ? '$primaryForeground' : '$color'}
                      >
                        {group.name}
                      </Text>
                    </XStack>
                  </YStack>
                );
              })}
            </XStack>
          </ScrollView>
          <Separator marginTop="$3" />
        </YStack>
      )}

      {/* Friend list */}
      <YStack gap="$1">
        {displayedFriends.map((friendship, index) => (
          <YStack key={friendship.friendId}>
            <XStack
              alignItems="center"
              gap="$3"
              paddingVertical="$2"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => {
                haptic.selection();
                onToggle(friendship.friendId);
              }}
            >
              <Checkbox checked={selectedIds.includes(friendship.friendId)} />
              <Circle size={36} backgroundColor="$backgroundHover">
                <Text fontWeight="500" fontSize={14}>
                  {friendship.friend.initials}
                </Text>
              </Circle>
              <Text fontWeight="500" flex={1}>
                {friendship.friend.fullName}
              </Text>
            </XStack>
            {index < displayedFriends.length - 1 && (
              <Separator marginVertical="$1" />
            )}
          </YStack>
        ))}
      </YStack>
    </YStack>
  );
}
