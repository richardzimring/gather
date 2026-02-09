import { useState } from 'react'
import { router } from 'expo-router'
import {
  ScrollView,
  Text,
  XStack,
  YStack,
  Theme,
  Switch,
  RadioGroup,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CancelHeader } from '../../components/ui/ScreenHeader'
import { useCreateAvailability } from '../../lib/hooks'
import type { RecurringPattern } from '../../lib/api/client'

export default function CreateAvailabilityScreen() {
  const insets = useSafeAreaInsets()
  const createAvailability = useCreateAvailability()

  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)) // +2 hours
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>('weekly')

  const handleCreate = async () => {
    try {
      await createAvailability.mutateAsync({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        ...(isRecurring && {
          recurring: {
            pattern: recurringPattern,
          },
        }),
      })
      router.back()
    } catch (err) {
      console.error('Failed to create availability:', err)
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
        <CancelHeader title="Set Availability" />

        {/* Time Selection */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text fontWeight="500" fontSize={14} marginBottom="$3">
              Time
            </Text>
            <YStack gap="$3">
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted">Start</Text>
                <DateTimePicker
                  value={startTime}
                  mode="datetime"
                  onChange={(_, date) => date && setStartTime(date)}
                  themeVariant="dark"
                />
              </XStack>
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$colorMuted">End</Text>
                <DateTimePicker
                  value={endTime}
                  mode="datetime"
                  onChange={(_, date) => date && setEndTime(date)}
                  themeVariant="dark"
                />
              </XStack>
            </YStack>
          </Card>
        </Theme>

        {/* Recurring */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack alignItems="center" justifyContent="space-between">
              <YStack>
                <Text fontWeight="600">Repeat</Text>
                <Text color="$colorMuted" fontSize={13}>
                  Make this a recurring time slot
                </Text>
              </YStack>
              <Switch
                size="$3"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </XStack>

            {isRecurring && (
              <RadioGroup
                value={recurringPattern}
                onValueChange={(val) => setRecurringPattern(val as RecurringPattern)}
                marginTop="$4"
              >
                <XStack gap="$3" flexWrap="wrap">
                  {(['daily', 'weekly', 'biweekly', 'monthly'] as const).map(
                    (pattern) => (
                      <XStack key={pattern} alignItems="center" gap="$2">
                        <RadioGroup.Item value={pattern} size="$3">
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>
                        <Text textTransform="capitalize">{pattern}</Text>
                      </XStack>
                    )
                  )}
                </XStack>
              </RadioGroup>
            )}
          </Card>
        </Theme>

        {/* Create Button */}
        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={handleCreate}
          disabled={createAvailability.isPending}
        >
          {createAvailability.isPending ? 'Creating...' : 'Set Availability'}
        </Button>
      </ScrollView>
    </YStack>
  )
}
