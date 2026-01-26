import { Plus, Trash2 } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { router } from 'expo-router'
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Circle,
  Theme,
  Input,
  Sheet,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { BackHeader } from '../../components/ui/ScreenHeader'
import { useActivities, useCreateActivity, useDeleteActivity } from '../../lib/hooks'
import { DEFAULT_ACTIVITIES } from '../../constants/activities'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets()
  const { data: activities, isLoading, error, refetch } = useActivities()
  const createActivity = useCreateActivity()
  const deleteActivity = useDeleteActivity()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('✨')

  const customActivities = activities?.filter((a) => !a.isDefault) ?? []
  const defaultActivities = activities?.filter((a) => a.isDefault) ?? []

  const handleCreate = async () => {
    if (!newName.trim()) return

    try {
      await createActivity.mutateAsync({
        name: newName.trim(),
        emoji: selectedEmoji,
      })
      setIsSheetOpen(false)
      setNewName('')
      setSelectedEmoji('✨')
    } catch (err) {
      console.error('Failed to create activity:', err)
    }
  }

  const handleDelete = async (activityId: string) => {
    try {
      await deleteActivity.mutateAsync(activityId)
    } catch (err) {
      console.error('Failed to delete activity:', err)
    }
  }

  if (isLoading) {
    return (
      <DottedGridBackground>
        <LoadingState message="Loading activities..." />
      </DottedGridBackground>
    )
  }

  if (error) {
    return (
      <DottedGridBackground>
        <ErrorState
          message="Failed to load activities"
          onRetry={() => refetch()}
        />
      </DottedGridBackground>
    )
  }

  return (
    <DottedGridBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <BackHeader
          title="Activities"
          rightAction={
            <Button
              variant="primary"
              buttonSize="sm"
              icon={<Plus size={18} color="white" />}
              onPress={() => setIsSheetOpen(true)}
            >
              Add
            </Button>
          }
        />

        {/* Custom Activities */}
        {customActivities.length > 0 && (
          <YStack marginBottom="$5">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$3">
              YOUR ACTIVITIES
            </Text>
            <YStack gap="$2">
              {customActivities.map((activity) => (
                <Theme key={activity.activityId} name="Card">
                  <Card>
                    <XStack alignItems="center" gap="$3">
                      <Circle size={44} backgroundColor="$backgroundHover">
                        <Text fontSize={20}>{activity.emoji}</Text>
                      </Circle>
                      <Text flex={1} fontWeight="500">
                        {activity.name}
                      </Text>
                      <Button
                        variant="ghost"
                        buttonSize="sm"
                        circular
                        icon={<Trash2 size={18} color="$error" />}
                        onPress={() => handleDelete(activity.activityId)}
                      />
                    </XStack>
                  </Card>
                </Theme>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Default Activities */}
        <YStack>
          <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$3">
            DEFAULT ACTIVITIES
          </Text>
          <XStack flexWrap="wrap" gap="$2">
            {(defaultActivities.length > 0 ? defaultActivities : DEFAULT_ACTIVITIES).map(
              (activity, index) => (
                <YStack
                  key={'emoji' in activity ? activity.emoji : activity.activityId}
                  width="22%"
                  alignItems="center"
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  marginBottom="$2"
                >
                  <Text fontSize={28}>{'emoji' in activity ? activity.emoji : activity.emoji}</Text>
                  <Text fontSize={11} color="$colorMuted" marginTop="$1">
                    {'name' in activity ? activity.name : activity.name}
                  </Text>
                </YStack>
              )
            )}
          </XStack>
        </YStack>
      </ScrollView>

      {/* Add Activity Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        snapPoints={[50]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />
          <YStack gap="$4" marginTop="$4">
            <Text fontSize={20} fontWeight="600">
              Create Activity
            </Text>

            {/* Emoji Picker */}
            <YStack gap="$2">
              <Text fontWeight="500">Choose an emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {['✨', '🎯', '💡', '🔥', '⭐', '💪', '🎉', '🌟', '💫', '🚀'].map(
                    (emoji) => (
                      <Circle
                        key={emoji}
                        size={48}
                        backgroundColor={
                          selectedEmoji === emoji ? '$accent' : '$backgroundHover'
                        }
                        pressStyle={{ scale: 0.95 }}
                        onPress={() => setSelectedEmoji(emoji)}
                      >
                        <Text fontSize={24}>{emoji}</Text>
                      </Circle>
                    )
                  )}
                </XStack>
              </ScrollView>
            </YStack>

            {/* Name Input */}
            <YStack gap="$2">
              <Text fontWeight="500">Activity name</Text>
              <Input
                placeholder="e.g., Rock Climbing"
                placeholderTextColor="$colorMuted"
                value={newName}
                onChangeText={setNewName}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
                borderWidth={1}
                borderRadius="$3"
                paddingHorizontal="$4"
                height={48}
              />
            </YStack>

            {/* Actions */}
            <XStack gap="$3">
              <Button
                variant="secondary"
                flex={1}
                onPress={() => setIsSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                flex={1}
                onPress={handleCreate}
                disabled={!newName.trim() || createActivity.isPending}
              >
                {createActivity.isPending ? 'Creating...' : 'Create'}
              </Button>
            </XStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </DottedGridBackground>
  )
}
