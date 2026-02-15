import { useState, useEffect, useRef, useCallback } from 'react'
import { router } from 'expo-router'
import {
  Animated,
  LayoutAnimation,
  Platform,
  Share,
  UIManager,
  KeyboardAvoidingView,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import {
  Bell,
  Calendar,
  Copy,
  Share2,
  Sparkles,
  UserPlus,
  Check,
  MapPin,
} from '@tamagui/lucide-icons'
import {
  Circle,
  H1,
  Input,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../lib/hooks/useAuth'
import { useInviteCode, useSendFriendRequest } from '../../lib/hooks'
import { registerPushTokenAsync } from '../../lib/hooks/useNotifications'
import { patchUsersMe } from '../../lib/api/client'

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const TOTAL_STEPS = 5

// ============================================
// Progress Indicator
// ============================================

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <XStack gap="$2" justifyContent="center" paddingVertical="$3">
      {Array.from({ length: total }).map((_, i) => (
        <Circle
          key={i}
          size={i === current ? 8 : 6}
          backgroundColor={i === current ? '$primary' : '$colorMuted'}
          opacity={i === current ? 1 : i < current ? 0.5 : 0.2}
          animation="quick"
        />
      ))}
    </XStack>
  )
}

// ============================================
// Step 1: Welcome
// ============================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const firstName = user?.firstName || 'there'

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" paddingHorizontal="$6">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <Text fontSize={72} marginBottom="$3">
          🎉
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
        }}
      >
        <H1 fontSize={32} fontWeight="700" textAlign="center" marginBottom="$2">
          Welcome, {firstName}!
        </H1>
        <Text
          color="$colorMuted"
          fontSize={17}
          textAlign="center"
          lineHeight={26}
          maxWidth={300}
        >
          Let's get you set up in under a minute.
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, width: '100%', paddingHorizontal: 8 }}>
        <Button variant="primary" buttonSize="lg" fullWidth onPress={onNext}>
          Let's go
        </Button>
      </Animated.View>
    </YStack>
  )
}

// ============================================
// Step 2: Profile Setup
// ============================================

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth()
  const [detectedTimezone, setDetectedTimezone] = useState('')
  const [timezoneUpdated, setTimezoneUpdated] = useState(false)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(tz)

    // If the user's timezone differs from the detected one, update it
    if (tz && user?.timezone !== tz) {
      patchUsersMe({ body: { timezone: tz } })
        .then(() => setTimezoneUpdated(true))
        .catch(console.error)
    }
  }, [user?.timezone])

  const initials = user?.initials || '?'
  const fullName = user?.fullName || 'New User'

  // Format timezone for display (e.g. "America/New_York" -> "New York")
  const displayTimezone = detectedTimezone
    .split('/')
    .pop()
    ?.replace(/_/g, ' ') || detectedTimezone

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" paddingHorizontal="$6">
      {/* Avatar */}
      <Circle size={100} backgroundColor="$primary">
        <Text fontSize={36} fontWeight="600" color="$primaryForeground">
          {initials}
        </Text>
      </Circle>

      {/* Name */}
      <YStack alignItems="center" gap="$2">
        <H1 fontSize={28} fontWeight="700" textAlign="center">
          {fullName}
        </H1>
        <XStack alignItems="center" gap="$2">
          <MapPin size={14} color="$colorMuted" />
          <Text color="$colorMuted" fontSize={15}>
            {displayTimezone}
            {timezoneUpdated && ' (updated)'}
          </Text>
        </XStack>
      </YStack>

      {/* Info text */}
      <Text
        color="$colorMuted"
        fontSize={15}
        textAlign="center"
        lineHeight={24}
        maxWidth={280}
      >
        This is how your friends will see you in Gather. You can update your profile anytime.
      </Text>

      <YStack width="100%" paddingHorizontal={8}>
        <Button variant="primary" buttonSize="lg" fullWidth onPress={onNext}>
          Looks good
        </Button>
      </YStack>
    </YStack>
  )
}

// ============================================
// Step 3: Invite Friends
// ============================================

function InviteFriendsStep({ onNext }: { onNext: () => void }) {
  const { data: inviteCodeData, isLoading: isLoadingCode } = useInviteCode()
  const sendFriendRequest = useSendFriendRequest()
  const [friendCode, setFriendCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)

  const myInviteCode = inviteCodeData?.inviteCode ?? ''

  const handleCopyCode = async () => {
    if (!myInviteCode) return
    await Clipboard.setStringAsync(myInviteCode)
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hey, add me on Gather! My invite code is: ${myInviteCode}`,
      })
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  const handleSendRequest = async () => {
    const cleanCode = friendCode.trim().toUpperCase()
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter a valid invite code')
      return
    }
    setError(null)
    try {
      await sendFriendRequest.mutateAsync({ inviteCode: cleanCode })
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      setRequestSent(true)
      setFriendCode('')
      setShowCodeInput(false)
    } catch {
      setError('Could not find that code. Check it and try again.')
    }
  }

  const toggleCodeInput = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowCodeInput(!showCodeInput)
    setError(null)
  }

  return (
    <YStack flex={1} paddingHorizontal="$5">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <YStack alignItems="center" gap="$5">
          {/* Header */}
          <YStack alignItems="center" gap="$2">
            <Text fontSize={48}>👋</Text>
            <H1 fontSize={28} fontWeight="700" textAlign="center">
              Better with friends
            </H1>
            <Text
              color="$colorMuted"
              fontSize={16}
              textAlign="center"
              lineHeight={24}
              maxWidth={280}
            >
              Gather works best when your friends are here too.
            </Text>
          </YStack>

          {/* Invite Code Card */}
          <Theme name="Card">
            <Card cardSize="lg" width="100%">
              <YStack gap="$3" alignItems="center">
                <Text color="$colorMuted" fontSize={13} fontWeight="500">
                  YOUR INVITE CODE
                </Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderRadius="$2"
                  paddingVertical="$3"
                  paddingHorizontal="$5"
                  width="100%"
                  alignItems="center"
                >
                  {isLoadingCode ? (
                    <Text color="$colorMuted" fontSize={15}>Loading...</Text>
                  ) : (
                    <Text fontSize={28} fontWeight="700" letterSpacing={4}>
                      {myInviteCode || '------'}
                    </Text>
                  )}
                </YStack>

                <XStack gap="$2" width="100%">
                  <Button
                    variant="outline"
                    flex={1}
                    icon={copied ? <Check size={14} /> : <Copy size={14} />}
                    onPress={handleCopyCode}
                    disabled={!myInviteCode}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="primary"
                    flex={1}
                    icon={<Share2 size={14} color="$primaryForeground" />}
                    onPress={handleShare}
                    disabled={!myInviteCode}
                  >
                    Share
                  </Button>
                </XStack>
              </YStack>
            </Card>
          </Theme>

          {/* Enter friend's code */}
          {!showCodeInput ? (
            <Button
              variant="ghost"
              icon={<UserPlus size={16} />}
              onPress={toggleCodeInput}
            >
              I have a friend's code
            </Button>
          ) : (
            <Theme name="Card">
              <Card width="100%">
                <YStack gap="$3">
                  <Text fontWeight="600" fontSize={15}>
                    Enter your friend's code
                  </Text>
                  <Input
                    placeholder="e.g., ABC123"
                    placeholderTextColor="$colorMuted"
                    value={friendCode}
                    onChangeText={(text) => {
                      setFriendCode(text.toUpperCase())
                      setError(null)
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    backgroundColor="$backgroundHover"
                    borderColor={error ? '$destructive' : '$borderColor'}
                    borderWidth={1}
                    borderRadius="$2"
                    paddingHorizontal="$3"
                    height={44}
                    fontSize={16}
                    fontWeight="600"
                    letterSpacing={2}
                    textAlign="center"
                  />
                  {error && (
                    <Text color="$destructive" fontSize={13}>
                      {error}
                    </Text>
                  )}
                  <XStack gap="$2">
                    <Button
                      variant="ghost"
                      buttonSize="sm"
                      flex={1}
                      onPress={toggleCodeInput}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      flex={1}
                      onPress={handleSendRequest}
                      loading={sendFriendRequest.isPending}
                      disabled={!friendCode.trim()}
                    >
                      Send Request
                    </Button>
                  </XStack>
                </YStack>
              </Card>
            </Theme>
          )}

          {/* Success message */}
          {requestSent && (
            <XStack
              alignItems="center"
              gap="$2"
              backgroundColor="$successSubtle"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$2"
            >
              <Check size={14} color="$success" />
              <Text color="$success" fontSize={13} fontWeight="500">
                Friend request sent!
              </Text>
            </XStack>
          )}
        </YStack>
      </ScrollView>

      {/* Bottom action */}
      <YStack paddingVertical="$3" alignItems="center">
        <Button variant="ghost" buttonSize="sm" onPress={onNext}>
          {requestSent ? 'Continue' : 'Skip for now'}
        </Button>
      </YStack>
    </YStack>
  )
}

// ============================================
// Step 4: Notifications
// ============================================

function NotificationsStep({ onNext }: { onNext: () => void }) {
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>(
    'undetermined'
  )

  useEffect(() => {
    // Check current permission status — if already granted, auto-advance
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setPermissionStatus('granted')
        // Already enabled from a previous install, skip ahead after a brief moment
        setTimeout(onNext, 800)
      }
    })
  }, [onNext])

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync()
    setPermissionStatus(status === 'granted' ? 'granted' : 'denied')
    if (status === 'granted') {
      registerPushTokenAsync().catch(console.error)
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      // Auto-advance after a brief moment
      setTimeout(onNext, 600)
    }
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" paddingHorizontal="$6">
      {/* Header */}
      <YStack alignItems="center" gap="$2">
        <Text fontSize={48}>🔔</Text>
        <H1 fontSize={28} fontWeight="700" textAlign="center">
          Stay in the loop
        </H1>
        <Text
          color="$colorMuted"
          fontSize={16}
          textAlign="center"
          lineHeight={24}
          maxWidth={280}
        >
          Know when friends invite you to hang out.
        </Text>
      </YStack>

      {/* Mock notification preview */}
      <Theme name="Card">
        <Card cardSize="lg" width="100%">
          <XStack alignItems="center" gap="$3">
            <Circle size={40} backgroundColor="$primary">
              <Text fontSize={18}>☕</Text>
            </Circle>
            <YStack flex={1} gap={2}>
              <Text fontWeight="600" fontSize={15}>
                Sarah invited you to Coffee
              </Text>
              <Text color="$colorMuted" fontSize={13}>
                Tomorrow at 10:00 AM
              </Text>
            </YStack>
          </XStack>
        </Card>
      </Theme>

      <Theme name="Card">
        <Card cardSize="lg" width="100%">
          <XStack alignItems="center" gap="$3">
            <Circle size={40} backgroundColor="$primary">
              <Text fontSize={18}>🍽️</Text>
            </Circle>
            <YStack flex={1} gap={2}>
              <Text fontWeight="600" fontSize={15}>
                Alex wants to grab Dinner
              </Text>
              <Text color="$colorMuted" fontSize={13}>
                Friday at 7:30 PM
              </Text>
            </YStack>
          </XStack>
        </Card>
      </Theme>

      {/* Action */}
      <YStack width="100%" gap="$3" paddingHorizontal={8}>
        {permissionStatus === 'granted' ? (
          <XStack alignItems="center" justifyContent="center" gap="$2" paddingVertical="$3">
            <Circle size={24} backgroundColor="$success">
              <Check size={14} color="white" />
            </Circle>
            <Text fontWeight="600" fontSize={15} color="$success">
              Notifications enabled
            </Text>
          </XStack>
        ) : (
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            icon={<Bell size={18} color="$primaryForeground" />}
            onPress={handleEnableNotifications}
          >
            Enable Notifications
          </Button>
        )}
      </YStack>

      <Button variant="ghost" buttonSize="sm" onPress={onNext}>
        {permissionStatus === 'granted' ? 'Continue' : 'Maybe later'}
      </Button>
    </YStack>
  )
}

// ============================================
// Step 5: Ready
// ============================================

function ReadyStep({ onComplete }: { onComplete: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const features = [
    { icon: <Calendar size={20} color="$primary" />, label: 'See when friends are free' },
    { icon: <Sparkles size={20} color="$primary" />, label: 'Plan events in seconds' },
    { icon: <Bell size={20} color="$primary" />, label: 'Never miss an invite' },
  ]

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$6" paddingHorizontal="$6">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
        }}
      >
        <Text fontSize={64} marginBottom="$3">
          ✨
        </Text>
        <H1 fontSize={32} fontWeight="700" textAlign="center" marginBottom="$2">
          You're all set!
        </H1>
        <Text
          color="$colorMuted"
          fontSize={16}
          textAlign="center"
          lineHeight={24}
          maxWidth={280}
        >
          Here's what you can do with Gather.
        </Text>
      </Animated.View>

      {/* Feature pills */}
      <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
        <YStack gap="$3" width="100%">
          {features.map((feature, i) => (
            <Theme key={i} name="Card">
              <Card>
                <XStack alignItems="center" gap="$3" paddingVertical="$1">
                  <Circle size={40} backgroundColor="$secondary">
                    {feature.icon}
                  </Circle>
                  <Text fontWeight="500" fontSize={15} flex={1}>
                    {feature.label}
                  </Text>
                </XStack>
              </Card>
            </Theme>
          ))}
        </YStack>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, width: '100%', paddingHorizontal: 8 }}>
        <Button variant="primary" buttonSize="lg" fullWidth onPress={onComplete}>
          Start Exploring
        </Button>
      </Animated.View>
    </YStack>
  )
}

// ============================================
// Main Onboarding Screen
// ============================================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const [currentStep, setCurrentStep] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const animateTransition = useCallback(
    (nextStep: number) => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(nextStep)
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start()
      })
    },
    [fadeAnim]
  )

  const goToNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateTransition(currentStep + 1)
    }
  }, [currentStep, animateTransition])

  const handleComplete = useCallback(() => {
    router.replace('/(tabs)')
  }, [])

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={goToNext} />
      case 1:
        return <ProfileStep onNext={goToNext} />
      case 2:
        return <InviteFriendsStep onNext={goToNext} />
      case 3:
        return <NotificationsStep onNext={goToNext} />
      case 4:
        return <ReadyStep onComplete={handleComplete} />
      default:
        return null
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={insets.top + 16}
        paddingBottom={insets.bottom + 20}
      >
        {/* Progress dots */}
        <ProgressDots current={currentStep} total={TOTAL_STEPS} />

        {/* Step content with fade animation */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {renderStep()}
        </Animated.View>
      </YStack>
    </KeyboardAvoidingView>
  )
}
