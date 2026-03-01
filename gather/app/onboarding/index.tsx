import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import {
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Eye,
  Lock,
  MapPin,
  UserPlus,
} from '@tamagui/lucide-icons';
import {
  Circle,
  H1,
  H2,
  H3,
  Input,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { Card } from '../../components/ui/Card';
import { BlockedWindowsCard } from '../../components/ui/BlockedWindowsCard';
import { CalendarProviderCard } from '../../components/ui/CalendarProviderCard';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  useSendFriendRequest,
  useCalendarProviders,
  useBlockedWindows,
  registerPushTokenAsync,
} from '../../lib/hooks';
import { putUsersMeNotificationPreferences } from '../../lib/api/generated';
import { haptic } from '../../lib/haptics';

const TOTAL_STEPS = 6;

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
  );
}

// ============================================
// Step 0: Welcome
// ============================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const slide2Anim = useRef(new Animated.Value(32)).current;
  const slide3Anim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slide2Anim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slide3Anim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, slide2Anim, slide3Anim]);

  const firstName = user?.firstName || 'there';

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$5"
      paddingHorizontal="$6"
    >
      {/* Headline */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
        }}
      >
        <H1
          fontSize={38}
          fontWeight="700"
          textAlign="center"
          marginBottom="$3"
          lineHeight={46}
        >
          Hey, {firstName}.
        </H1>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slide2Anim }],
          }}
        >
          <Text
            color="$colorMuted"
            fontSize={17}
            textAlign="center"
            lineHeight={26}
            maxWidth={290}
          >
            Let&apos;s take a second to get you set up.
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slide3Anim }],
          width: '100%',
          paddingHorizontal: 8,
        }}
      >
        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={() => {
            haptic.light();
            onNext();
          }}
        >
          Let&apos;s go
        </Button>
      </Animated.View>
    </YStack>
  );
}

// ============================================
// Step 1: How Gather Works
// ============================================

function HowItWorksStep({ onNext }: { onNext: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
    ]).start();
  }, [fadeAnim, slideAnim]);

  const points = [
    {
      icon: <Calendar size={20} color="$primary" />,
      text: "When you connect a calendar, Gather can only see which times you're busy. Event details stay private.",
    },
    {
      icon: <Eye size={20} color="$primary" />,
      text: 'Friends can only see your availability, not your full calendar or event details.',
    },
  ];

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$6"
      paddingHorizontal="$6"
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
          width: '100%',
        }}
      >
        <XStack alignItems="center" gap="$2" marginBottom="$2">
          <Lock size={18} color="$primary" />
          <Text
            fontSize={13}
            fontWeight="600"
            color="$primary"
            letterSpacing={0.5}
          >
            PRIVACY
          </Text>
        </XStack>
        <H2 fontSize={28} fontWeight="700" textAlign="center" marginBottom="$2">
          Your data, respected.
        </H2>
        <Text
          color="$colorMuted"
          fontSize={16}
          textAlign="center"
          lineHeight={24}
          maxWidth={280}
          marginBottom="$5"
        >
          A few things worth knowing.
        </Text>

        {/* Info cards */}
        <YStack gap="$3" width="100%">
          {points.map((point, i) => (
            <Theme key={i} name="Card">
              <Card>
                <XStack alignItems="flex-start" gap="$3">
                  <Circle size={36} backgroundColor="$secondary" marginTop={1}>
                    {point.icon}
                  </Circle>
                  <Text flex={1} fontSize={15} lineHeight={22} color="$color">
                    {point.text}
                  </Text>
                </XStack>
              </Card>
            </Theme>
          ))}
        </YStack>
      </Animated.View>

      <Animated.View
        style={{ opacity: fadeAnim, width: '100%', paddingHorizontal: 8 }}
      >
        <Button
          variant="primary"
          buttonSize="lg"
          fullWidth
          onPress={() => {
            haptic.light();
            onNext();
          }}
        >
          Got it
        </Button>
      </Animated.View>
    </YStack>
  );
}

// ============================================
// Step 2: Connect Calendar
// ============================================

function ConnectCalendarStep({ onNext }: { onNext: () => void }) {
  const { isLoading, providers, hasAnyConnection } = useCalendarProviders();

  return (
    <YStack flex={1} paddingHorizontal="$5">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <YStack alignItems="center" gap="$5">
          {/* Header */}
          <YStack alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$2">
              <CalendarDays size={18} color="$primary" />
              <Text
                fontSize={13}
                fontWeight="600"
                color="$primary"
                letterSpacing={0.5}
              >
                CALENDARS
              </Text>
            </XStack>
            <H2 fontSize={28} fontWeight="700" textAlign="center">
              Let&apos;s get connected
            </H2>
            <Text
              color="$colorMuted"
              fontSize={16}
              textAlign="center"
              lineHeight={24}
              maxWidth={280}
            >
              Connect your calendars to Gather so friends can find times that
              actually work for you.
            </Text>
          </YStack>

          <CalendarProviderCard isLoading={isLoading} providers={providers} />
        </YStack>
      </ScrollView>

      {/* Bottom action */}
      <YStack paddingVertical="$3" gap="$2" paddingHorizontal={8}>
        {hasAnyConnection && (
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            onPress={() => {
              haptic.light();
              onNext();
            }}
          >
            Continue
          </Button>
        )}
        <Button
          variant="ghost"
          buttonSize="sm"
          onPress={() => {
            haptic.light();
            onNext();
          }}
        >
          {hasAnyConnection ? 'Skip for now' : "I'll do this later"}
        </Button>
      </YStack>
    </YStack>
  );
}

// ============================================
// Step 3: Blocked Times
// ============================================

function BlockedTimesStep({ onNext }: { onNext: () => void }) {
  const { data: windows } = useBlockedWindows();

  return (
    <YStack flex={1} paddingHorizontal="$5">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <YStack alignItems="center" gap="$5">
          {/* Header */}
          <YStack alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$2">
              <Clock size={18} color="$primary" />
              <Text
                fontSize={13}
                fontWeight="600"
                color="$primary"
                letterSpacing={0.5}
              >
                AVAILABILITY
              </Text>
            </XStack>
            <H2 fontSize={28} fontWeight="700" textAlign="center">
              Protect your time
            </H2>
            <Text
              color="$colorMuted"
              fontSize={16}
              textAlign="center"
              lineHeight={24}
              maxWidth={310}
            >
              Some windows are always off-limits. Block them and Gather will
              show you as busy.
            </Text>
          </YStack>

          <BlockedWindowsCard />
        </YStack>
      </ScrollView>

      <YStack paddingVertical="$3" paddingHorizontal={8}>
        <Button
          variant="ghost"
          buttonSize="sm"
          onPress={() => {
            haptic.light();
            onNext();
          }}
        >
          {windows && windows.length > 0 ? 'Continue' : 'Skip for now'}
        </Button>
      </YStack>
    </YStack>
  );
}

// ============================================
// Step 4: Friends
// ============================================

function InviteFriendsStep({ onNext }: { onNext: () => void }) {
  const sendFriendRequest = useSendFriendRequest();
  const [friendCode, setFriendCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleSendRequest = async () => {
    const cleanCode = friendCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Invalid friend code');
      return;
    }
    setError(null);
    try {
      await sendFriendRequest.mutateAsync({ inviteCode: cleanCode });
      haptic.success();
      setRequestSent(true);
      setFriendCode('');
    } catch {
      haptic.error();
      setError("Couldn't find that code. Double-check it and try again.");
    }
  };

  return (
    <YStack flex={1} paddingHorizontal="$5">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <YStack alignItems="center" gap="$5">
          {/* Header */}
          <YStack alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$2">
              <UserPlus size={18} color="$primary" />
              <Text
                fontSize={13}
                fontWeight="600"
                color="$primary"
                letterSpacing={0.5}
              >
                FRIENDS
              </Text>
            </XStack>
            <H2 fontSize={28} fontWeight="700" textAlign="center">
              Got a code?
            </H2>
            <Text
              color="$colorMuted"
              fontSize={16}
              textAlign="center"
              lineHeight={24}
              maxWidth={280}
            >
              If a friend invited you, enter their code to add them on Gather.
            </Text>
          </YStack>

          {/* Enter friend's code — primary action */}
          <Theme name="Card">
            <Card width="100%">
              <YStack gap="$3">
                <Input
                  placeholder="e.g., ABC123"
                  placeholderTextColor="$colorMuted"
                  value={friendCode}
                  onChangeText={(text) => {
                    setFriendCode(text.toUpperCase());
                    setError(null);
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
                <Button
                  variant="primary"
                  onPress={handleSendRequest}
                  loading={sendFriendRequest.isPending}
                  disabled={!friendCode.trim()}
                >
                  Add Friend
                </Button>
              </YStack>
            </Card>
          </Theme>

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

      <YStack alignItems="center">
        <Button
          variant="ghost"
          buttonSize="sm"
          onPress={() => {
            haptic.light();
            onNext();
          }}
        >
          {requestSent ? 'Continue' : 'Skip for now'}
        </Button>
      </YStack>
    </YStack>
  );
}

// ============================================
// Step 5: Notifications (Final Step)
// ============================================

function NotificationsStep({ onComplete }: { onComplete: () => void }) {
  const [permissionStatus, setPermissionStatus] = useState<
    'undetermined' | 'granted' | 'denied'
  >('undetermined');

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setPermissionStatus('granted');
      }
    });
  }, []);

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
    if (status === 'granted') {
      registerPushTokenAsync().catch(console.error);
      haptic.success();
    }
  };

  const mockPreviews = [
    {
      icon: <Calendar size={18} color="$primary" />,
      title: 'Sarah invited you to Coffee',
      subtitle: 'Tomorrow at 10:00 AM',
    },
    {
      icon: <MapPin size={18} color="$primary" />,
      title: 'Alex wants to grab dinner',
      subtitle: 'Friday at 7:30 PM',
    },
  ];

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$5"
      paddingHorizontal="$6"
    >
      {/* Header */}
      <YStack alignItems="center" gap="$3">
        <XStack alignItems="center" gap="$2">
          <Bell size={18} color="$primary" />
          <Text
            fontSize={13}
            fontWeight="600"
            color="$primary"
            letterSpacing={0.5}
          >
            NOTIFICATIONS
          </Text>
        </XStack>
        <H3 fontSize={28} fontWeight="700" textAlign="center">
          Don&apos;t miss a plan
        </H3>
        <Text
          color="$colorMuted"
          fontSize={16}
          textAlign="center"
          lineHeight={24}
          maxWidth={280}
        >
          Get a nudge when a friend wants to make plans with you.
        </Text>
      </YStack>

      {/* Mock notification previews */}
      <YStack gap="$3" width="100%">
        {mockPreviews.map((preview, i) => (
          <Theme key={i} name="Card">
            <Card cardSize="lg">
              <XStack alignItems="center" gap="$3">
                <Circle size={40} backgroundColor="$secondary">
                  {preview.icon}
                </Circle>
                <YStack flex={1} gap={2}>
                  <Text fontWeight="600" fontSize={15}>
                    {preview.title}
                  </Text>
                  <Text color="$colorMuted" fontSize={13}>
                    {preview.subtitle}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </Theme>
        ))}
      </YStack>

      {/* Action */}
      <YStack width="100%" gap="$3" paddingHorizontal={8}>
        {permissionStatus === 'granted' ? (
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            onPress={() => {
              haptic.success();
              onComplete();
            }}
          >
            Let&apos;s go
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              buttonSize="lg"
              fullWidth
              icon={<Bell size={18} color="$primaryForeground" />}
              onPress={() => {
                haptic.light();
                handleEnableNotifications();
              }}
            >
              Turn on notifications
            </Button>
            <Button
              variant="ghost"
              buttonSize="sm"
              onPress={async () => {
                haptic.light();
                await putUsersMeNotificationPreferences({
                  body: {
                    eventInvites: false,
                    eventUpdates: false,
                    friendRequests: false,
                    messages: false,
                  },
                }).catch(console.error);
                onComplete();
              }}
            >
              Maybe later
            </Button>
          </>
        )}
      </YStack>
    </YStack>
  );
}

// ============================================
// Main Onboarding Screen
// ============================================

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedStep, setDisplayedStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (nextStep: number) => {
      // Slide and fade out to the left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SCREEN_WIDTH * 0.25,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Snap to right, swap step, then slide in
        slideAnim.setValue(SCREEN_WIDTH * 0.25);
        setDisplayedStep(nextStep);
        setCurrentStep(nextStep);
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [slideAnim, opacityAnim],
  );

  const goToNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateTransition(currentStep + 1);
    }
  }, [currentStep, animateTransition]);

  const handleComplete = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const renderStep = () => {
    switch (displayedStep) {
      case 0:
        return <WelcomeStep onNext={goToNext} />;
      case 1:
        return <HowItWorksStep onNext={goToNext} />;
      case 2:
        return <ConnectCalendarStep onNext={goToNext} />;
      case 3:
        return <BlockedTimesStep onNext={goToNext} />;
      case 4:
        return <InviteFriendsStep onNext={goToNext} />;
      case 5:
        return <NotificationsStep onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Full-screen gradient — sits behind everything */}
        <GradientBackground />

        <YStack
          flex={1}
          paddingTop={insets.top + 16}
          paddingBottom={insets.bottom + 20}
        >
          <ProgressDots current={currentStep} total={TOTAL_STEPS} />

          <Animated.View
            style={{
              flex: 1,
              opacity: opacityAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {renderStep()}
          </Animated.View>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
