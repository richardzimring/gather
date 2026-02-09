import { Check } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  Circle,
  Input,
  ScrollView,
  Separator,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CancelHeader } from '../../components/ui/ScreenHeader'
import { useCreateGroup, useFriends } from '../../lib/hooks'

const EMOJI_OPTIONS = ['👥', '💜', '🏠', '💼', '🎾', '🎮', '🍕', '☕', '🎬', '🎵', '🏃', '📚']

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets()
  const { data: friendsData } = useFriends()
  const createGroup = useCreateGroup()

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👥')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const friends = friendsData?.friends ?? []

  const toggleMember = (friendId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        emoji: emoji || undefined,
        memberIds: selectedMembers,
      })
      router.back()
    } catch (err) {
      console.error('Failed to create group:', err)
    }
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <CancelHeader title="Create Group" />

        {/* Group Info */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              {/* Emoji Selection */}
              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Choose an emoji</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap="$2">
                    {EMOJI_OPTIONS.map((e) => (
                      <Circle
                        key={e}
                        size={40}
                        backgroundColor={emoji === e ? '$primary' : '$backgroundHover'}
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => setEmoji(e)}
                      >
                        <Text fontSize={20}>{e}</Text>
                      </Circle>
                    ))}
                  </XStack>
                </ScrollView>
              </YStack>

              {/* Group Name */}
              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>Group Name</Text>
                <Input
                  placeholder="e.g., Tennis Club"
                  placeholderTextColor="$colorMuted"
                  value={name}
                  onChangeText={setName}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  fontSize={14}
                />
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Member Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontWeight="500" fontSize={14}>Add Members</Text>
              {selectedMembers.length > 0 && (
                <Text color="$color" fontSize={13} fontWeight="500">
                  {selectedMembers.length} selected
                </Text>
              )}
            </XStack>

            {friends.length === 0 ? (
              <YStack alignItems="center" padding="$4">
                <Text color="$colorMuted" fontSize={13} textAlign="center">
                  Add friends first to add them to groups
                </Text>
              </YStack>
            ) : (
              <YStack>
                {friends.map((friend, index) => {
                  const isSelected = selectedMembers.includes(friend.friendId)
                  return (
                    <YStack key={friend.friendId}>
                      <XStack
                        alignItems="center"
                        gap="$3"
                        paddingVertical="$2"
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => toggleMember(friend.friendId)}
                      >
                        <YStack
                          width={20}
                          height={20}
                          borderRadius={4}
                          borderWidth={1}
                          borderColor={isSelected ? '$primary' : '$borderColor'}
                          backgroundColor={isSelected ? '$primary' : 'transparent'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {isSelected && (
                            <Check size={12} color="$primaryForeground" strokeWidth={3} />
                          )}
                        </YStack>
                        <Circle size={36} backgroundColor="$backgroundHover">
                          <Text fontWeight="500" fontSize={13}>{friend.friend.initials}</Text>
                        </Circle>
                        <YStack flex={1}>
                          <Text fontWeight="500" fontSize={14}>{friend.friend.fullName}</Text>
                        </YStack>
                      </XStack>
                      {index < friends.length - 1 && (
                        <Separator marginVertical="$1" />
                      )}
                    </YStack>
                  )
                })}
              </YStack>
            )}
          </Card>
        </Theme>

        {/* Create Button */}
        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={handleCreate}
          disabled={!name.trim() || createGroup.isPending}
        >
          {createGroup.isPending ? 'Creating...' : 'Create Group'}
        </Button>
      </ScrollView>
    </YStack>
  )
}
