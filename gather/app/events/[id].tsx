import { Calendar, MapPin, Pencil, FileText } from "@tamagui/lucide-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import {
  Circle,
  ScrollView,
  Text,
  Theme,
  XStack,
  YStack,
  Spinner,
  Separator,
  Input,
  TextArea,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";

import { BadgeLabel } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GlassBottomBar } from "../../components/ui/GlassBottomBar";
import { GlassButton } from "../../components/ui/GlassFAB";
import { InlineCalendar } from "../../components/ui/InlineCalendar";
import { LocationSearch } from "../../components/ui/LocationSearch";
import { BackHeader } from "../../components/ui/ScreenHeader";
import { MapPreview } from "../../components/ui/MapPreview";
import {
  TimeChipPicker,
  START_TIME_OPTIONS,
} from "../../components/ui/TimeChipPicker";
import { useAuth } from "../../lib/hooks/useAuth";
import {
  useEvent,
  useRespondToEvent,
  useCancelEvent,
  useUpdateEvent,
} from "../../lib/hooks";
import type {
  EventInvitee,
  InviteeStatus,
  LocationData,
} from "../../lib/api/generated/types.gen";

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
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  const date = start.toLocaleDateString("en-US", dateOptions);
  const startTimeStr = start.toLocaleTimeString("en-US", timeOptions);
  const endTimeStr = end.toLocaleTimeString("en-US", timeOptions);

  return {
    date,
    time: `${startTimeStr} - ${endTimeStr}`,
  };
}

/**
 * Get status badge color
 */
function getStatusColor(status: InviteeStatus) {
  switch (status) {
    case "accepted":
      return "$success";
    case "declined":
      return "$error";
    case "maybe":
      return "$warning";
    default:
      return "$colorMuted";
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
 * Invitee item component
 */
function InviteeItem({
  invitee,
  isCurrentUser,
  canChange,
  isEditing,
  onChangePress,
  onCancelPress,
}: {
  invitee: EventInvitee;
  isCurrentUser?: boolean;
  canChange?: boolean;
  isEditing?: boolean;
  onChangePress?: () => void;
  onCancelPress?: () => void;
}) {
  return (
    <XStack alignItems="center" gap="$3" paddingVertical="$2">
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
  );
}

// ============================================
// Main Screen
// ============================================

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: event, isLoading, error } = useEvent(id ?? "");
  const respondToEvent = useRespondToEvent();
  const cancelEvent = useCancelEvent();
  const updateEvent = useUpdateEvent();
  const [pendingResponse, setPendingResponse] = useState<InviteeStatus | null>(
    null,
  );
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  // ---- Edit mode state ----
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(
    null,
  );
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editStartMinutes, setEditStartMinutes] = useState<number | null>(null);
  const [editEndMinutes, setEditEndMinutes] = useState<number | null>(null);

  // ---- Derived values ----
  const isHost = event?.hostId === user?.userId;
  const userInvitee = event?.invitees.find((i) => i.userId === user?.userId);
  const canRespond = !isHost && userInvitee;
  const showRsvpBar =
    !isEditing &&
    canRespond &&
    event?.status !== "cancelled" &&
    (userInvitee?.status === "pending" || isEditingResponse);
  const showEditBar = isEditing;

  // End-time options: filter to only show times after the selected start time
  const endTimeOptions = useMemo(() => {
    if (editStartMinutes === null) return START_TIME_OPTIONS;
    return START_TIME_OPTIONS.filter(
      (option) => option.value > editStartMinutes,
    );
  }, [editStartMinutes]);

  // ---- Edit mode handlers ----

  const enterEditMode = () => {
    if (!event) return;
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    setEditTitle(event.title);
    setEditNotes(event.notes ?? "");
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
        address: event.locationAddress ?? "",
        placeId: event.locationPlaceId ?? "",
        latitude: event.latitude,
        longitude: event.longitude,
      });
    } else {
      setEditLocationData(null);
    }

    setIsEditing(true);
  };

  const cancelEdit = () => {
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

    // Only call API if something changed
    if (Object.keys(data).length > 0) {
      try {
        await updateEvent.mutateAsync({ eventId: id, data: data as any });
      } catch (err) {
        console.error("Failed to update event:", err);
        return; // Stay in edit mode on failure
      }
    }

    setIsEditing(false);
  };

  // ---- Other handlers ----

  const handleResponse = async (status: InviteeStatus) => {
    if (!id) return;
    setPendingResponse(status);
    try {
      await respondToEvent.mutateAsync({
        eventId: id,
        response: { status },
      });
      setIsEditingResponse(false);
    } catch (err) {
      console.error("Failed to respond to event:", err);
    } finally {
      setPendingResponse(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to cancel this event? This action cannot be undone.",
      [
        { text: "Keep Event", style: "cancel" },
        {
          text: "Cancel Event",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              await cancelEvent.mutateAsync(id);
              router.back();
            } catch (err) {
              console.error("Failed to cancel event:", err);
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
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="large" color="$color" />
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
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom:
            showRsvpBar || showEditBar
              ? insets.bottom + 100
              : insets.bottom + 32,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <BackHeader
          title={isEditing ? "Edit Event" : event.title}
          subtitle={
            isEditing
              ? undefined
              : `Hosted by ${isHost ? "you" : event.hostName}${
                  event.status === "cancelled" ? " · Cancelled" : ""
                }`
          }
          marginBottom="$4"
          onBack={isEditing ? cancelEdit : undefined}
          rightAction={
            isEditing ? (
              <Button variant="ghost" buttonSize="sm" onPress={cancelEdit}>
                Cancel
              </Button>
            ) : isHost && event.status !== "cancelled" ? (
              <GlassButton
                icon={<Pencil size={18} color="$color" />}
                onPress={enterEditMode}
                size={36}
              />
            ) : undefined
          }
        />

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
        {event.showInviteList && (
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
                    invitee.status !== "pending" &&
                    event.status !== "cancelled";
                  return (
                    <YStack key={invitee.userId}>
                      <InviteeItem
                        invitee={invitee}
                        isCurrentUser={isCurrentUser}
                        canChange={canChange && !isEditing}
                        isEditing={isCurrentUser && isEditingResponse}
                        onChangePress={() => setIsEditingResponse(true)}
                        onCancelPress={() => setIsEditingResponse(false)}
                      />
                      {index < event.invitees.length - 1 && (
                        <Separator marginVertical="$2" />
                      )}
                    </YStack>
                  );
                })}
              </YStack>
            </Card>
          </Theme>
        )}
      </ScrollView>

      {/* ==================== Bottom Bar: Edit Mode ==================== */}
      {showEditBar && (
        <GlassBottomBar>
          <YStack gap="$3">
            <Button
              variant="primary"
              buttonSize="lg"
              fullWidth
              onPress={handleSave}
              disabled={!canSave || updateEvent.isPending}
              loading={updateEvent.isPending}
            >
              {updateEvent.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="ghost"
              buttonSize="sm"
              onPress={handleDelete}
              disabled={cancelEvent.isPending}
            >
              <Text color="$error" fontWeight="500" fontSize={14}>
                {cancelEvent.isPending ? "Deleting..." : "Delete Event"}
              </Text>
            </Button>
          </YStack>
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
                  userInvitee.status === "accepted" ? "primary" : "secondary"
                }
                flex={1}
                onPress={() => handleResponse("accepted")}
                loading={pendingResponse === "accepted"}
                disabled={pendingResponse !== null}
              >
                Yes
              </Button>
              <Button
                variant={
                  userInvitee.status === "declined" ? "primary" : "secondary"
                }
                flex={1}
                onPress={() => handleResponse("declined")}
                loading={pendingResponse === "declined"}
                disabled={pendingResponse !== null}
              >
                No
              </Button>
              <Button
                variant={
                  userInvitee.status === "maybe" ? "primary" : "secondary"
                }
                flex={1}
                onPress={() => handleResponse("maybe")}
                loading={pendingResponse === "maybe"}
                disabled={pendingResponse !== null}
              >
                Maybe
              </Button>
            </XStack>
          </YStack>
        </GlassBottomBar>
      )}
    </YStack>
  );
}
