import { CalendarPlus, Plus } from '@tamagui/lucide-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl } from 'react-native';
import {
  ScrollView,
  H1,
  H2,
  Text,
  XStack,
  YStack,
  Circle,
  Theme,
  useTheme,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AvatarStackPerson } from '../../components/ui/AttendeeAvatarStack';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EventCard, EventCardSkeleton } from '../../components/ui/EventCard';
import { GlassButton } from '../../components/ui/GlassFAB';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { useAuth } from '../../lib/hooks/useAuth';
import { useEvents, useRefresh, useScrollGradient } from '../../lib/hooks';

/**
 * Get time-based greeting with day awareness
 */
function getGreeting(): string {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Friday evening/night - celebrate the weekend
  if (day === 5 && hour >= 17) return 'Happy Friday';

  // Weekday time-based greetings
  if (hour < 5) return "You're up late";
  if (hour < 8) return 'Rise and shine';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Format event time for display
 */
function formatEventTime(startTime: string): string {
  const date = new Date(startTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format relative date for display
 */
function formatRelativeDate(startTime: string): string {
  const date = new Date(startTime);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);

  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return `Today, ${formatEventTime(startTime)}`;
  }
  if (eventDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${formatEventTime(startTime)}`;
  }
  return `${date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}, ${formatEventTime(startTime)}`;
}

/**
 * Get section title for date grouping
 */
function getSectionTitle(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  thisWeekEnd.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (compareDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  if (compareDate < thisWeekEnd) {
    return 'This Week';
  }
  return 'Later';
}

/**
 * Group events by section (Today, Tomorrow, This Week, Later)
 */
function groupEventsBySection(events: EventData[]) {
  const sections: Record<string, EventData[]> = {
    Today: [],
    Tomorrow: [],
    'This Week': [],
    Later: [],
  };

  events.forEach((event) => {
    const date = new Date(event.startTime);
    const section = getSectionTitle(date);
    sections[section].push(event);
  });

  // Sort events within each section by start time
  Object.keys(sections).forEach((key) => {
    sections[key].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  });

  return sections;
}

/**
 * Get attendee summary text
 * Counts host (always going) + accepted invitees
 */
function getAttendeeSummary(event: EventData): string {
  const acceptedInvitees = event.invitees.filter(
    (i) => i.status === 'accepted',
  ).length;
  const maybeInvitees = event.invitees.filter(
    (i) => i.status === 'maybe',
  ).length;

  // Host is always counted as going
  const totalGoing = 1 + acceptedInvitees;
  const totalInvited = event.invitees.length;

  // If there are invitees, show "X of Y going" format
  if (totalInvited > 0) {
    const parts: string[] = [];
    parts.push(`${totalGoing} of ${totalInvited + 1} going`);
    if (maybeInvitees > 0) parts.push(`${maybeInvitees} maybe`);
    return parts.join(', ');
  }

  // No invitees - just the host
  return 'Just you';
}

/**
 * Build people array for AttendeeAvatarStack
 * Includes host first, then invitees sorted by status
 */
function buildAvatarStackPeople(event: EventData): AvatarStackPerson[] {
  const people: AvatarStackPerson[] = [];

  // Add host first (always "host" status)
  people.push({
    id: event.hostId,
    initials: event.hostInitials,
    status: 'host',
    avatarUrl: event.hostAvatarUrl,
  });

  // Add invitees
  event.invitees.forEach((invitee) => {
    people.push({
      id: invitee.userId,
      initials: invitee.initials,
      status: invitee.status as AvatarStackPerson['status'],
      avatarUrl: invitee.avatarUrl,
    });
  });

  return people;
}

// Type for event data (matches API Event type)
interface EventData {
  eventId: string;
  hostId: string;
  hostName: string;
  hostInitials: string;
  hostAvatarUrl?: string;
  title: string;
  emoji?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  status: string;
  invitees: {
    userId: string;
    fullName: string;
    initials: string;
    avatarUrl?: string;
    status: string;
  }[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();
  const eventsQuery = useEvents();
  const { data: events, isLoading } = eventsQuery;
  const { isRefreshing, onRefresh } = useRefresh(eventsQuery);

  // Get today's date at midnight (memoized to prevent re-renders)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Get upcoming events (today and future, not cancelled)
  const upcomingEvents = useMemo(() => {
    return (
      events
        ?.filter((event) => {
          const eventDate = new Date(event.startTime);
          return eventDate >= today && event.status !== 'cancelled';
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ) ?? []
    );
  }, [events, today]);

  // Group events by section
  const eventsBySection = useMemo(
    () => groupEventsBySection(upcomingEvents),
    [upcomingEvents],
  );

  // Get pending invitation counts per section
  const pendingCountBySection = useMemo(() => {
    const counts: Record<string, number> = {
      Today: 0,
      Tomorrow: 0,
      'This Week': 0,
      Later: 0,
    };

    upcomingEvents.forEach((event) => {
      const userInvitee = event.invitees.find(
        (i) => i.userId === user?.userId && i.status === 'pending',
      );
      if (userInvitee && event.hostId !== user?.userId) {
        const date = new Date(event.startTime);
        const section = getSectionTitle(date);
        counts[section]++;
      }
    });

    return counts;
  }, [upcomingEvents, user?.userId]);

  const navigateToEvent = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const navigateToPlan = () => {
    router.push('/(tabs)/plan');
  };

  const navigateToCreate = () => {
    router.push('/(tabs)/plan');
  };

  // Check if user has pending invitation for this event
  const isPendingForUser = (event: EventData) => {
    const userInvitee = event.invitees.find((i) => i.userId === user?.userId);
    return userInvitee?.status === 'pending' && event.hostId !== user?.userId;
  };

  // Ordered sections to display
  const sectionOrder = ['Today', 'Tomorrow', 'This Week', 'Later'];
  const greetingPadding = 8;
  const { gradientOpacity, scrollProps } = useScrollGradient();

  return (
    <YStack flex={1} backgroundColor="$background">
      <GradientBackground style={{ opacity: gradientOpacity }} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.val}
            colors={[theme.color.val]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + greetingPadding,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        {...scrollProps}
      >
        {/* Header */}
        <YStack paddingBottom="$3">
          {/* Greeting */}
          <Text
            fontSize={14}
            color="$colorMuted"
            marginBottom={-greetingPadding}
          >
            {getGreeting()}, {user?.firstName ?? 'there'}
          </Text>

          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <H1 fontSize={32} fontWeight="700">
              Events
            </H1>
            <GlassButton
              icon={<Plus size={20} color="$color" />}
              onPress={navigateToCreate}
            />
          </XStack>
        </YStack>
        {/* Events Timeline */}
        <YStack gap="$5">
          {/* Show skeleton loading for first load */}
          {isLoading ? (
            <YStack gap="$3">
              <H2 fontSize={18} fontWeight="600">
                Today
              </H2>
              <YStack gap="$3">
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </YStack>
            </YStack>
          ) : (
            sectionOrder.map((section) => {
              const sectionEvents = eventsBySection[section];

              // Skip empty sections except Today
              if (sectionEvents.length === 0 && section !== 'Today') {
                return null;
              }

              return (
                <YStack key={section} gap="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H2 fontSize={18} fontWeight="600">
                      {section}
                    </H2>
                    {pendingCountBySection[section] > 0 && (
                      <Circle size={22} backgroundColor="$primary">
                        <Text
                          color="$primaryForeground"
                          fontSize={11}
                          fontWeight="600"
                        >
                          {pendingCountBySection[section]}
                        </Text>
                      </Circle>
                    )}
                  </XStack>

                  {sectionEvents.length === 0 ? (
                    <YStack gap="$3">
                      <Theme name="Card">
                        <Card>
                          <YStack alignItems="center" padding="$2">
                            <Text color="$colorMuted" textAlign="center">
                              Nothing planned
                            </Text>
                          </YStack>
                        </Card>
                      </Theme>
                      {section === 'Today' && (
                        <Button
                          variant="primary"
                          buttonSize="lg"
                          fullWidth
                          onPress={navigateToPlan}
                          icon={<CalendarPlus size={18} />}
                        >
                          Plan something
                        </Button>
                      )}
                    </YStack>
                  ) : (
                    <YStack gap="$3">
                      {sectionEvents.map((event) => {
                        const isPending = isPendingForUser(event);
                        const isHost = event.hostId === user?.userId;
                        const avatarPeople = buildAvatarStackPeople(event);

                        return (
                          <EventCard
                            key={event.eventId}
                            title={event.title}
                            emoji={event.emoji}
                            timeLabel={formatRelativeDate(event.startTime)}
                            location={event.location}
                            isHost={isHost}
                            isPending={isPending}
                            people={avatarPeople}
                            attendeeSummary={getAttendeeSummary(event)}
                            showAvatarStatus={true}
                            onPress={() => navigateToEvent(event.eventId)}
                            showRespondButton={isPending}
                            onRespondPress={() =>
                              navigateToEvent(event.eventId)
                            }
                          />
                        );
                      })}
                    </YStack>
                  )}
                </YStack>
              );
            })
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
