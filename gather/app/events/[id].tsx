import {
  Calendar,
  MapPin,
  Pencil,
  FileText,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from '@tamagui/lucide-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, LayoutAnimation } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import {
  Circle,
  Text,
  Theme,
  XStack,
  YStack,
  Separator,
  Input,
  TextArea,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { CounterProposalCard } from '../../components/ui/CounterProposalCard';
import { CounterProposalSheet } from '../../components/ui/CounterProposalSheet';

import { BadgeLabel } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EventCard } from '../../components/ui/EventCard';
import { FriendPicker } from '../../components/ui/FriendPicker';
import { GlassBottomBar } from '../../components/ui/GlassBottomBar';
import { GlassButton } from '../../components/ui/GlassFAB';
import { InlineCalendar } from '../../components/ui/InlineCalendar';
import { LocationSearch } from '../../components/ui/LocationSearch';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { MapPreview } from '../../components/ui/MapPreview';
import { SkeletonBar, SkeletonCircle } from '../../components/ui/Skeleton';
import {
  TimeChipPicker,
  START_TIME_OPTIONS,
} from '../../components/ui/TimeChipPicker';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  useEvent,
  useRespondToEvent,
  useCancelEvent,
  useUpdateEvent,
  useFriends,
  useGroups,
} from '../../lib/hooks';
import { useGenerateEmoji } from '../../lib/hooks/useEmoji';
import type {
  CounterProposal,
  EventInvitee,
  InviteeStatus,
  LocationData,
} from '../../lib/api/generated/types.gen';
import type { AvatarStackPerson } from '../../components/ui/AttendeeAvatarStack';
import { haptic } from '../../lib/haptics';

// ============================================
// Helpers
// ============================================

/**
 * Format date for display
 */
function formatEventDate(
  startTime: string,
  endTime: string,
): {
  date: string;
  time: string;
} {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  const date = start.toLocaleDateString('en-US', dateOptions);
  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);

  return {
    date,
    time: `${startTimeStr} - ${endTimeStr}`,
  };
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date for event card display
 */
function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return 'Today';
  if (compareDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${DAYS_SHORT[date.getDay()]}, ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

/**
 * Get status badge color
 */
function getStatusColor(status: InviteeStatus) {
  switch (status) {
    case 'accepted':
      return '$success';
    case 'declined':
      return '$error';
    case 'maybe':
      return '$warning';
    default:
      return '$colorMuted';
  }
}

/**
 * Snap minutes to the nearest 30-minute interval.
 */
function snapToHalfHour(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

// ============================================
// Sub-components
// ============================================

/**
 * EventDetailSkeleton — Loading placeholder for event detail page.
 */
function EventDetailSkeleton() {
  return (
    <YStack gap="$4">
      {/* Title, Emoji, Subtitle skeleton */}
      <YStack gap="$2" alignItems="center">
        <SkeletonCircle size={52} />
        <YStack gap="$1" alignItems="center">
          <SkeletonBar width={200} height={24} />
          <SkeletonBar width={150} height={14} />
        </YStack>
      </YStack>

      {/* Date & Time card skeleton */}
      <Theme name="Card">
        <Card>
          <YStack gap="$4">
            <XStack alignItems="flex-start" gap="$3">
              <SkeletonCircle size={36} />
              <YStack flex={1} gap="$2">
                <SkeletonBar width={180} height={14} />
                <SkeletonBar width={140} height={13} />
              </YStack>
            </XStack>
          </YStack>
        </Card>
      </Theme>

      {/* Invitees card skeleton */}
      <Theme name="Card">
        <Card>
          <YStack gap="$3">
            <SkeletonBar width={100} height={16} />
            <YStack gap="$2">
              <XStack alignItems="center" gap="$3">
                <SkeletonCircle size={40} />
                <YStack flex={1} gap="$2">
                  <SkeletonBar width={120} height={14} />
                  <SkeletonBar width={80} height={13} />
                </YStack>
              </XStack>
              <XStack alignItems="center" gap="$3">
                <SkeletonCircle size={40} />
                <YStack flex={1} gap="$2">
                  <SkeletonBar width={140} height={14} />
                  <SkeletonBar width={70} height={13} />
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </Card>
      </Theme>
    </YStack>
  );
}

/**
 * Invitee item component
 */
function InviteeItem({
  invitee,
  isCurrentUser,
  canChange,
  isEditing,
  isHost,
  isApplyingProposal,
  isRetractingProposal,
  onChangePress,
  onCancelPress,
  onRetractProposal,
  onApplyProposal,
}: {
  invitee: EventInvitee;
  isCurrentUser?: boolean;
  canChange?: boolean;
  isEditing?: boolean;
  isHost?: boolean;
  isApplyingProposal?: boolean;
  isRetractingProposal?: boolean;
  onChangePress?: () => void;
  onCancelPress?: () => void;
  onApplyProposal?: (proposal: CounterProposal) => void;
  onRetractProposal?: () => void;
}) {
  return (
    <YStack paddingVertical="$2" gap="$2">
      <XStack alignItems="center" gap="$3">
        <Circle size={40} backgroundColor="$backgroundHover">
          <Text fontSize={16}>{invitee.initials}</Text>
        </Circle>
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text fontWeight="500">{invitee.fullName}</Text>
            {isCurrentUser && (
              <Text fontSize={11} color="$colorMuted">
                (You)
              </Text>
            )}
          </XStack>
          <XStack alignItems="center" gap="$2">
            <Circle size={8} backgroundColor={getStatusColor(invitee.status)} />
            <Text fontSize={13} color="$colorMuted" textTransform="capitalize">
              {invitee.status}
            </Text>
          </XStack>
        </YStack>
        {isCurrentUser &&
          canChange &&
          (isEditing ? (
            <Button variant="outline" buttonSize="sm" onPress={onCancelPress}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" buttonSize="sm" onPress={onChangePress}>
              Change
            </Button>
          ))}
      </XStack>

      {invitee.counterProposal && (
        <CounterProposalCard
          counterProposal={invitee.counterProposal}
          isHost={isHost && !isCurrentUser}
          isApplying={isApplyingProposal}
          onApply={
            isHost && !isCurrentUser && onApplyProposal
              ? () => onApplyProposal(invitee.counterProposal!)
              : undefined
          }
          isOwn={isCurrentUser}
          isRetracting={isRetractingProposal}
          onRetract={isCurrentUser ? onRetractProposal : undefined}
        />
      )}
    </YStack>
  );
}

// ============================================
// Main Screen
// ============================================

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: event, isLoading, error } = useEvent(id ?? '');
  const respondToEvent = useRespondToEvent();
  const cancelEvent = useCancelEvent();
  const updateEvent = useUpdateEvent();
  const [pendingResponse, setPendingResponse] = useState<InviteeStatus | null>(
    null,
  );
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [isCounterProposalOpen, setIsCounterProposalOpen] = useState(false);
  const [applyingProposalUserId, setApplyingProposalUserId] = useState<
    string | null
  >(null);
  const [isRetractingProposal, setIsRetractingProposal] = useState(false);

  // ---- Edit mode state ----
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(
    null,
  );
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editStartMinutes, setEditStartMinutes] = useState<number | null>(null);
  const [editEndMinutes, setEditEndMinutes] = useState<number | null>(null);
  const [addInviteeIds, setAddInviteeIds] = useState<string[]>([]);
  const [isAddingPeople, setIsAddingPeople] = useState(false);

  // ---- Friends/groups data for add-people UI ----
  const { data: friendsData } = useFriends();
  const { data: groupsData } = useGroups();
  const allFriends = useMemo(() => friendsData?.friends ?? [], [friendsData]);
  const allGroups = useMemo(
    () => (groupsData ?? []).filter((g) => g.memberIds.length > 0),
    [groupsData],
  );

  // Generate emoji only if the title has changed from the original
  const titleHasChanged = event?.title !== editTitle;
  const { emoji: previewEmoji, isLoading: isEmojiLoading } = useGenerateEmoji(
    titleHasChanged ? editTitle : '',
  );

  // ---- Derived values ----
  const isHost = event?.hostId === user?.userId;
  const userInvitee = event?.invitees.find((i) => i.userId === user?.userId);
  const canRespond = !isHost && userInvitee;
  const showRsvpBar =
    !isEditing &&
    canRespond &&
    event?.status !== 'cancelled' &&
    (userInvitee?.status === 'pending' || isEditingResponse);
  const showEditBar = isEditing;

  // End-time options: filter to only show times after the selected start time
  const endTimeOptions = useMemo(() => {
    if (editStartMinutes === null) return START_TIME_OPTIONS;
    return START_TIME_OPTIONS.filter(
      (option) => option.value > editStartMinutes,
    );
  }, [editStartMinutes]);

  // Build people array for preview card in edit mode
  const previewPeople = useMemo(() => {
    if (!event || !isEditing) return [];
    const people: AvatarStackPerson[] = [];

    // Add host first
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
  }, [event, isEditing]);

  // ---- Edit mode handlers ----

  const enterEditMode = () => {
    if (!event) return;
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    setEditTitle(event.title);
    setEditNotes(event.notes ?? '');
    setEditDate(
      new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    );
    setEditStartMinutes(
      snapToHalfHour(start.getHours() * 60 + start.getMinutes()),
    );
    setEditEndMinutes(snapToHalfHour(end.getHours() * 60 + end.getMinutes()));

    // Reconstruct locationData from event fields
    if (event.location) {
      setEditLocationData({
        name: event.location,
        address: event.locationAddress ?? '',
        placeId: event.locationPlaceId ?? '',
        latitude: event.latitude,
        longitude: event.longitude,
      });
    } else {
      setEditLocationData(null);
    }

    setAddInviteeIds([]);
    setIsAddingPeople(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setAddInviteeIds([]);
    setIsAddingPeople(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (
      !id ||
      !event ||
      !editDate ||
      editStartMinutes === null ||
      editEndMinutes === null
    )
      return;

    // Build full Date objects from editDate + minutes
    const newStart = new Date(editDate);
    newStart.setHours(
      Math.floor(editStartMinutes / 60),
      editStartMinutes % 60,
      0,
      0,
    );
    const newEnd = new Date(editDate);
    newEnd.setHours(Math.floor(editEndMinutes / 60), editEndMinutes % 60, 0, 0);

    // Build the update payload with only changed fields
    const data: Record<string, unknown> = {};

    if (editTitle.trim() !== event.title) {
      data.title = editTitle.trim();
      // Update emoji if title changed and we have a new emoji
      if (previewEmoji) {
        data.emoji = previewEmoji;
      }
    }
    if (newStart.toISOString() !== new Date(event.startTime).toISOString()) {
      data.startTime = newStart.toISOString();
    }
    if (newEnd.toISOString() !== new Date(event.endTime).toISOString()) {
      data.endTime = newEnd.toISOString();
    }
    if ((editNotes.trim() || null) !== (event.notes || null)) {
      data.notes = editNotes.trim() || null;
    }

    // Location comparison
    const currentLocName = event.location ?? null;
    const newLocName = editLocationData?.name ?? null;
    if (newLocName !== currentLocName) {
      if (editLocationData) {
        data.locationData = editLocationData;
      } else {
        data.location = null;
        data.locationData = null;
      }
    }

    if (addInviteeIds.length > 0) {
      data.addInviteeIds = addInviteeIds;
    }

    // Only call API if something changed
    if (Object.keys(data).length > 0) {
      try {
        await updateEvent.mutateAsync({ eventId: id, data: data as any });
        haptic.success();
      } catch (err) {
        haptic.error();
        console.error('Failed to update event:', err);
        return; // Stay in edit mode on failure
      }
    }

    setAddInviteeIds([]);
    setIsAddingPeople(false);
    setIsEditing(false);
  };

  // ---- Other handlers ----

  const handleResponse = async (status: InviteeStatus) => {
    if (!id || pendingResponse !== null) return;

    haptic.medium();

    setPendingResponse(status);
    try {
      await respondToEvent.mutateAsync({
        eventId: id,
        response: { status },
      });
      setIsEditingResponse(false);

      if (status === 'accepted') {
        haptic.success();
      }
    } catch (err) {
      haptic.error();
      console.error('Failed to respond to event:', err);
    } finally {
      setPendingResponse(null);
    }
  };

  const handleCounterProposalSubmit = async (
    counterProposal: CounterProposal,
  ) => {
    if (!id) return;
    await respondToEvent.mutateAsync({
      eventId: id,
      response: { status: userInvitee?.status ?? 'maybe', counterProposal },
    });
    setIsEditingResponse(false);
    haptic.success();
  };

  const handleRetractProposal = async () => {
    if (!id) return;
    haptic.medium();
    setIsRetractingProposal(true);
    try {
      await respondToEvent.mutateAsync({
        eventId: id,
        response: {
          status: userInvitee?.status ?? 'maybe',
          counterProposal: null,
        },
      });
      haptic.success();
    } catch (err) {
      haptic.error();
      console.error('Failed to retract counter proposal:', err);
    } finally {
      setIsRetractingProposal(false);
    }
  };

  const handleApplyProposal = async (
    proposal: CounterProposal,
    proposerUserId: string,
  ) => {
    if (!id || !event) return;
    haptic.medium();
    setApplyingProposalUserId(proposerUserId);
    try {
      const data: Record<string, unknown> = {};
      if (proposal.startTime) data.startTime = proposal.startTime;
      if (proposal.endTime) data.endTime = proposal.endTime;
      if (proposal.location) data.location = proposal.location;
      await updateEvent.mutateAsync({ eventId: id, data: data as any });
      haptic.success();
    } catch (err) {
      haptic.error();
      console.error('Failed to apply counter proposal:', err);
    } finally {
      setApplyingProposalUserId(null);
    }
  };

  const handleDelete = () => {
    haptic.warning();
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This action cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await cancelEvent.mutateAsync(id);
              router.back();
            } catch (err) {
              haptic.error();
              console.error('Failed to cancel event:', err);
            }
          },
        },
      ],
    );
  };

  const handleLocationSelect = (
    place: {
      placeId: string;
      name: string;
      address: string;
      latitude?: string;
      longitude?: string;
    } | null,
  ) => {
    if (!place) {
      setEditLocationData(null);
      return;
    }
    setEditLocationData({
      name: place.name,
      address: place.address,
      placeId: place.placeId,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  };

  // ---- Loading / Error states ----

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <KeyboardAwareScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 16,
          }}
        >
          {/* Header */}
          <BackHeader title="" subtitle={undefined} marginBottom="$4" />

          {/* Skeleton content */}
          <EventDetailSkeleton />
        </KeyboardAwareScrollView>
      </YStack>
    );
  }

  if (error || !event) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$4"
      >
        <Text fontSize={48} marginBottom="$4">
          😕
        </Text>
        <Text fontSize={18} fontWeight="600" textAlign="center">
          Event not found
        </Text>
        <Text color="$colorMuted" textAlign="center" marginTop="$2">
          This event may have been cancelled or you do not have access.
        </Text>
        <Button
          variant="secondary"
          marginTop="$4"
          onPress={() => router.back()}
        >
          Go Back
        </Button>
      </YStack>
    );
  }

  const { date, time } = formatEventDate(event.startTime, event.endTime);
  const canSave =
    editTitle.trim().length > 0 &&
    editDate !== null &&
    editStartMinutes !== null &&
    editEndMinutes !== null &&
    editEndMinutes > editStartMinutes;

  return (
    <YStack flex={1} backgroundColor="$background">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: showEditBar
            ? insets.bottom + 100
            : showRsvpBar
              ? insets.bottom + 140
              : insets.bottom + 32,
          paddingHorizontal: 16,
        }}
        bottomOffset={16}
      >
        {/* Header */}
        <BackHeader
          title={isEditing ? 'Edit Event' : ''}
          subtitle={undefined}
          marginBottom={isEditing ? '$4' : '$2'}
          onBack={isEditing ? cancelEdit : undefined}
          rightAction={
            isEditing ? (
              <GlassButton
                icon={<Trash2 size={18} color="$error" />}
                onPress={handleDelete}
                size={36}
              />
            ) : isHost && event.status !== 'cancelled' ? (
              <GlassButton
                icon={<Pencil size={18} color="$color" />}
                onPress={enterEditMode}
                size={36}
              />
            ) : undefined
          }
        />

        {/* Title, Emoji, Subtitle in read view */}
        {!isEditing && (
          <YStack gap="$2" marginBottom="$4" alignItems="center">
            <Circle size={52} backgroundColor="$backgroundHover">
              <Text fontSize={32}>{event.emoji ?? '📅'}</Text>
            </Circle>
            <YStack gap="$1" alignItems="center">
              <Text fontWeight="600" fontSize={24} textAlign="center">
                {event.title}
              </Text>
              <Text fontSize={14} color="$colorMuted" textAlign="center">
                Hosted by {isHost ? 'you' : event.hostName}
                {event.status === 'cancelled' ? ' · Cancelled' : ''}
              </Text>
            </YStack>
          </YStack>
        )}

        {/* Live preview card in edit mode */}
        {isEditing &&
          editDate &&
          editStartMinutes !== null &&
          editEndMinutes !== null && (
            <YStack marginBottom="$4">
              <EventCard
                title={editTitle}
                emoji={previewEmoji ?? event.emoji}
                isEmojiLoading={isEmojiLoading}
                timeLabel={(() => {
                  const start = new Date(editDate);
                  start.setHours(
                    Math.floor(editStartMinutes / 60),
                    editStartMinutes % 60,
                    0,
                    0,
                  );
                  const end = new Date(editDate);
                  end.setHours(
                    Math.floor(editEndMinutes / 60),
                    editEndMinutes % 60,
                    0,
                    0,
                  );
                  return `${formatDate(editDate)}, ${formatTime(start)} – ${formatTime(end)}`;
                })()}
                location={editLocationData?.name}
                isHost={true}
                people={previewPeople}
                attendeeSummary={
                  previewPeople.length > 1
                    ? `${previewPeople.length} people`
                    : 'Just you'
                }
                showAvatarStatus={false}
                isPreview={true}
              />
            </YStack>
          )}

        {/* ==================== Title (edit mode) ==================== */}
        {isEditing && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <YStack gap="$2">
                <XStack alignItems="center" gap="$1">
                  <Text fontWeight="500" fontSize={14}>
                    Title
                  </Text>
                  <Text fontSize={12} color="$error">
                    *
                  </Text>
                </XStack>
                <Input
                  placeholder="What's the plan?"
                  placeholderTextColor="$colorMuted"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={44}
                  fontSize={14}
                  paddingVertical={0}
                />
              </YStack>
            </Card>
          </Theme>
        )}

        {/* ==================== Date & Time ==================== */}
        <Theme name="Card">
          <Card marginBottom="$4">
            {isEditing ? (
              <YStack gap="$4">
                {/* Calendar */}
                <YStack>
                  <XStack alignItems="center" gap="$2" marginBottom="$3">
                    <Calendar size={14} color="$colorMuted" />
                    <Text fontWeight="500" fontSize={14}>
                      Date
                    </Text>
                  </XStack>
                  <InlineCalendar
                    selectedDate={editDate}
                    onSelectDate={setEditDate}
                  />
                </YStack>

                <Separator />

                {/* Start time */}
                <TimeChipPicker
                  label="Start time"
                  options={START_TIME_OPTIONS}
                  selectedValue={editStartMinutes}
                  onSelect={(value) => {
                    setEditStartMinutes(value);
                    // If end time is now before or equal to start, clear it
                    if (editEndMinutes !== null && editEndMinutes <= value) {
                      setEditEndMinutes(null);
                    }
                  }}
                  autoScrollToSelected
                />

                <Separator />

                {/* End time */}
                <TimeChipPicker
                  label="End time"
                  options={endTimeOptions}
                  selectedValue={editEndMinutes}
                  onSelect={setEditEndMinutes}
                  autoScrollToSelected
                />
              </YStack>
            ) : (
              <YStack gap="$4">
                {/* Date & Time (view mode) */}
                <XStack alignItems="flex-start" gap="$3">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius={6}
                    backgroundColor="$backgroundHover"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Calendar size={16} color="$colorMuted" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontWeight="500" fontSize={14}>
                      {date}
                    </Text>
                    <Text color="$colorMuted" fontSize={13}>
                      {time}
                    </Text>
                  </YStack>
                </XStack>

                {/* Location (view mode) */}
                {event.location && (
                  <YStack gap="$3">
                    <XStack alignItems="flex-start" gap="$3">
                      <YStack
                        width={36}
                        height={36}
                        borderRadius={6}
                        backgroundColor="$backgroundHover"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <MapPin size={16} color="$colorMuted" />
                      </YStack>
                      <YStack flex={1} justifyContent="center" minHeight={36}>
                        <Text fontWeight="500" fontSize={14}>
                          {event.location}
                        </Text>
                        {event.locationAddress && (
                          <Text color="$colorMuted" fontSize={13}>
                            {event.locationAddress}
                          </Text>
                        )}
                      </YStack>
                    </XStack>
                    {event.latitude && event.longitude && (
                      <MapPreview
                        latitude={parseFloat(event.latitude)}
                        longitude={parseFloat(event.longitude)}
                        name={event.location}
                        address={event.locationAddress}
                        height={150}
                      />
                    )}
                  </YStack>
                )}
              </YStack>
            )}
          </Card>
        </Theme>

        {/* ==================== Location (edit mode) ==================== */}
        {isEditing && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <MapPin size={14} color="$colorMuted" />
                  <Text fontWeight="500" fontSize={14}>
                    Location{' '}
                    <Text fontSize={14} color="$colorMuted" fontWeight="400">
                      (optional)
                    </Text>
                  </Text>
                </XStack>
                <LocationSearch
                  value={editLocationData?.name}
                  onSelect={handleLocationSelect}
                  placeholder="Search for a place..."
                />
                {editLocationData?.latitude && editLocationData?.longitude && (
                  <MapPreview
                    latitude={parseFloat(editLocationData.latitude)}
                    longitude={parseFloat(editLocationData.longitude)}
                    name={editLocationData.name}
                    address={editLocationData.address}
                    height={120}
                  />
                )}
              </YStack>
            </Card>
          </Theme>
        )}

        {/* ==================== Notes ==================== */}
        {isEditing ? (
          <Theme name="Card">
            <Card marginBottom="$4">
              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <FileText size={14} color="$colorMuted" />
                  <Text fontWeight="500" fontSize={14}>
                    Notes{' '}
                    <Text fontSize={14} color="$colorMuted" fontWeight="400">
                      (optional)
                    </Text>
                  </Text>
                </XStack>
                <TextArea
                  placeholder="Any details..."
                  placeholderTextColor="$colorMuted"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  padding="$3"
                  height={72}
                  fontSize={14}
                />
              </YStack>
            </Card>
          </Theme>
        ) : (
          event.notes && (
            <Theme name="Card">
              <Card marginBottom="$4">
                <Text fontWeight="600" marginBottom="$2">
                  Notes
                </Text>
                <Text color="$colorMuted">{event.notes}</Text>
              </Card>
            </Theme>
          )
        )}

        {/* ==================== Invitees List ==================== */}
        {(event.showInviteList || (isEditing && isHost)) && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <Text fontWeight="600" marginBottom="$3">
                Who is Going
              </Text>
              <YStack>
                {/* Host */}
                <YStack>
                  <XStack alignItems="center" gap="$3" paddingVertical="$2">
                    <Circle size={40} backgroundColor="$backgroundHover">
                      <Text fontSize={16}>{event.hostInitials}</Text>
                    </Circle>
                    <YStack flex={1}>
                      <XStack alignItems="center" gap="$2">
                        <Text fontWeight="500" fontSize={14}>
                          {event.hostName}
                        </Text>
                        <BadgeLabel variant="host">Host</BadgeLabel>
                      </XStack>
                      <XStack alignItems="center" gap="$2">
                        <Circle size={8} backgroundColor="$success" />
                        <Text fontSize={13} color="$colorMuted">
                          Organizer
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                  {event.invitees.length > 0 && (
                    <Separator marginVertical="$2" />
                  )}
                </YStack>
                {/* Invitees */}
                {event.invitees.map((invitee, index) => {
                  const isCurrentUser = invitee.userId === user?.userId;
                  const canChange =
                    isCurrentUser &&
                    invitee.status !== 'pending' &&
                    event.status !== 'cancelled';
                  return (
                    <YStack key={invitee.userId}>
                      <InviteeItem
                        invitee={invitee}
                        isCurrentUser={isCurrentUser}
                        isHost={isHost}
                        canChange={canChange && !isEditing}
                        isEditing={isCurrentUser && isEditingResponse}
                        isApplyingProposal={
                          applyingProposalUserId === invitee.userId
                        }
                        isRetractingProposal={
                          isCurrentUser && isRetractingProposal
                        }
                        onChangePress={() => {
                          haptic.selection();
                          setIsEditingResponse(true);
                        }}
                        onCancelPress={() => setIsEditingResponse(false)}
                        onApplyProposal={(proposal) =>
                          handleApplyProposal(proposal, invitee.userId)
                        }
                        onRetractProposal={
                          isCurrentUser ? handleRetractProposal : undefined
                        }
                      />
                      {index < event.invitees.length - 1 && (
                        <Separator marginVertical="$2" />
                      )}
                    </YStack>
                  );
                })}

                {/* Add people (host edit mode only) */}
                {isEditing && isHost && (
                  <YStack marginTop={event.invitees.length > 0 ? '$2' : '$0'}>
                    <Separator marginBottom="$2" />
                    <XStack
                      alignItems="center"
                      justifyContent="space-between"
                      paddingVertical="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => {
                        LayoutAnimation.configureNext(
                          LayoutAnimation.Presets.easeInEaseOut,
                        );
                        haptic.light();
                        setIsAddingPeople((prev) => !prev);
                      }}
                    >
                      <XStack alignItems="center" gap="$2">
                        <UserPlus size={16} color="$primary" />
                        <Text fontWeight="500" fontSize={14} color="$primary">
                          Add people
                        </Text>
                        {addInviteeIds.length > 0 && (
                          <Text fontSize={13} color="$colorMuted">
                            ({addInviteeIds.length} selected)
                          </Text>
                        )}
                      </XStack>
                      {isAddingPeople ? (
                        <ChevronUp size={16} color="$colorMuted" />
                      ) : (
                        <ChevronDown size={16} color="$colorMuted" />
                      )}
                    </XStack>

                    {isAddingPeople && (
                      <YStack marginTop="$3">
                        <FriendPicker
                          friends={allFriends}
                          groups={allGroups}
                          selectedIds={addInviteeIds}
                          onToggle={(id) => {
                            LayoutAnimation.configureNext(
                              LayoutAnimation.Presets.easeInEaseOut,
                            );
                            setAddInviteeIds((prev) =>
                              prev.includes(id)
                                ? prev.filter((i) => i !== id)
                                : [...prev, id],
                            );
                          }}
                          excludeIds={[
                            event.hostId,
                            ...event.invitees.map((i) => i.userId),
                          ]}
                        />
                      </YStack>
                    )}
                  </YStack>
                )}
              </YStack>
            </Card>
          </Theme>
        )}
      </KeyboardAwareScrollView>

      {/* ==================== Bottom Bar: Edit Mode ==================== */}
      {showEditBar && (
        <GlassBottomBar>
          <Button
            variant="primary"
            buttonSize="lg"
            fullWidth
            onPress={handleSave}
            disabled={!canSave || updateEvent.isPending || isEmojiLoading}
            loading={updateEvent.isPending || isEmojiLoading}
            loadingText="Saving..."
          >
            Save Changes
          </Button>
        </GlassBottomBar>
      )}

      {/* ==================== Bottom Bar: RSVP ==================== */}
      {showRsvpBar && userInvitee && (
        <GlassBottomBar>
          <YStack gap="$3">
            <Text fontWeight="600" textAlign="center" fontSize={14}>
              Are you going?
            </Text>
            <XStack gap="$3">
              <Button
                variant={
                  userInvitee.status === 'accepted' ? 'primary' : 'secondary'
                }
                flex={1}
                onPress={() => handleResponse('accepted')}
                loading={pendingResponse === 'accepted'}
                disabled={pendingResponse !== null}
              >
                Yes
              </Button>
              <Button
                variant={
                  userInvitee.status === 'declined' ? 'primary' : 'secondary'
                }
                flex={1}
                onPress={() => handleResponse('declined')}
                loading={pendingResponse === 'declined'}
                disabled={pendingResponse !== null}
              >
                No
              </Button>
              <Button
                variant={
                  userInvitee.status === 'maybe' ? 'primary' : 'secondary'
                }
                flex={1}
                onPress={() => handleResponse('maybe')}
                loading={pendingResponse === 'maybe'}
                disabled={pendingResponse !== null}
              >
                Maybe
              </Button>
            </XStack>
            <Text
              textAlign="center"
              fontSize={13}
              color="$primary"
              fontWeight="500"
              onPress={() => {
                haptic.light();
                setIsCounterProposalOpen(true);
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              {userInvitee.counterProposal
                ? 'Edit your suggestion'
                : 'Suggest a different time or place'}
            </Text>
          </YStack>
        </GlassBottomBar>
      )}

      {/* ==================== Counter Proposal Sheet ==================== */}
      {event && canRespond && (
        <CounterProposalSheet
          isOpen={isCounterProposalOpen}
          onClose={() => setIsCounterProposalOpen(false)}
          onSubmit={handleCounterProposalSubmit}
          eventStartTime={event.startTime}
          eventEndTime={event.endTime}
          eventLocation={event.location}
          existingProposal={userInvitee?.counterProposal}
        />
      )}
    </YStack>
  );
}
