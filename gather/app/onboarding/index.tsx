import { useState, useRef } from 'react'
import { router } from 'expo-router'
import { Dimensions, FlatList, ViewToken } from 'react-native'
import * as Notifications from 'expo-notifications'
import { Bell } from '@tamagui/lucide-icons'
import { Circle, H1, Text, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { registerPushTokenAsync } from '../../lib/hooks/useNotifications'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface OnboardingSlide {
  id: string
  emoji: string
  title: string
  description: string
  icon?: React.ReactNode
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    emoji: '👋',
    title: 'Welcome to Gather',
    description:
      'The easiest way to coordinate plans with friends. No more endless group texts.',
  },
  {
    id: '2',
    emoji: '📅',
    title: 'Share Your Availability',
    description:
      'Let friends know when you are free. Set recurring availability windows so planning is effortless.',
  },
  {
    id: '3',
    emoji: '🎉',
    title: 'Create Events Easily',
    description:
      'Invite friends to events with a few taps. See who is free and make plans happen.',
  },
  {
    id: '4',
    emoji: '🔔',
    title: 'Stay in the Loop',
    description:
      'Get notified when friends invite you to events or when plans change. Never miss out.',
  },
]

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const isLastSlide = currentIndex === slides.length - 1

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index)
      }
    }
  ).current

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    }
  }

  const handleSkip = () => {
    router.replace('/(tabs)')
  }

  const handleComplete = async () => {
    // Request notifications permission
    if (!notificationsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status === 'granted') {
        setNotificationsEnabled(true)
        // Register push token immediately after permission is granted
        registerPushTokenAsync().catch(console.error)
      }
    }
    router.replace('/(tabs)')
  }

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync()
    setNotificationsEnabled(status === 'granted')
    if (status === 'granted') {
      // Register push token immediately after permission is granted
      registerPushTokenAsync().catch(console.error)
    }
  }

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <YStack
      width={SCREEN_WIDTH}
      flex={1}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$6"
    >
      <Circle size={100} backgroundColor="$secondary" marginBottom="$5">
        <Text fontSize={48}>{item.emoji}</Text>
      </Circle>
      <H1 fontSize={24} fontWeight="600" textAlign="center" marginBottom="$3">
        {item.title}
      </H1>
      <Text
        color="$colorMuted"
        fontSize={14}
        textAlign="center"
        lineHeight={22}
        maxWidth={300}
      >
        {item.description}
      </Text>
    </YStack>
  )

  const renderDots = () => (
    <XStack gap="$2" justifyContent="center" marginBottom="$5">
      {slides.map((_, index) => (
        <Circle
          key={index}
          size={6}
          backgroundColor={index === currentIndex ? '$color' : '$colorMuted'}
          opacity={index === currentIndex ? 1 : 0.3}
        />
      ))}
    </XStack>
  )

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top + 20}
      paddingBottom={insets.bottom + 20}
    >
        {/* Skip button */}
        {!isLastSlide && (
          <XStack justifyContent="flex-end" paddingHorizontal="$4">
            <Button variant="ghost" buttonSize="sm" onPress={handleSkip}>
              Skip
            </Button>
          </XStack>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          style={{ flex: 1 }}
        />

        {/* Bottom section */}
        <YStack paddingHorizontal="$4">
          {renderDots()}

          {isLastSlide ? (
            <YStack gap="$3">
              {/* Enable notifications button */}
              {!notificationsEnabled && (
                <Button
                  variant="secondary"
                  fullWidth
                  icon={<Bell size={20} />}
                  onPress={handleEnableNotifications}
                >
                  Enable Notifications
                </Button>
              )}
              
              {/* Get started button */}
              <Button variant="primary" buttonSize="lg" fullWidth onPress={handleComplete}>
                Get Started
              </Button>
            </YStack>
          ) : (
            <Button variant="primary" buttonSize="lg" fullWidth onPress={handleNext}>
              Continue
            </Button>
          )}
        </YStack>
    </YStack>
  )
}
