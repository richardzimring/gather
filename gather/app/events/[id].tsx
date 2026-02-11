import { Calendar, MapPin, Pencil, Trash2 } from "@tamagui/lucide-icons";
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
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

import { BadgeLabel } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GlassBottomBar } from "../../components/ui/GlassBottomBar";
import { BackHeader } from "../../components/ui/ScreenHeader";
import { MapPreview } from "../../components/ui/MapPreview";
import { useAuth } from "../../lib/hooks/useAuth";
import { useEvent, useRespondToEvent, useCancelEvent } from "../../lib/hooks";
import type {
  EventInvitee,
  InviteeStatus,
} from "../../lib/api/generated/types.gen";

/**
 * Format date for display
 */
function formatEventDate(
  startTime: string,
  endTime: string
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

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: event, isLoading, error } = useEvent(id ?? "");
  const respondToEvent = useRespondToEvent();
  const cancelEvent = useCancelEvent();
  const [pendingResponse, setPendingResponse] = useState<InviteeStatus | null>(
    null
  );
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  const isHost = event?.hostId === user?.userId;
  const userInvitee = event?.invitees.find((i) => i.userId === user?.userId);
  const canRespond = !isHost && userInvitee;
  // Only show bottom bar if user hasn't responded yet OR is editing their response
  const showBottomBar =
    canRespond &&
    event?.status !== "cancelled" &&
    (userInvitee?.status === "pending" || isEditingResponse);

  const handleResponse = async (status: InviteeStatus) => {
    if (!id) return;
    setPendingResponse(status);
    try {
      await respondToEvent.mutateAsync({
        eventId: id,
        response: { status },
      });
      setIsEditingResponse(false); // Close editing mode after successful response
    } catch (err) {
      console.error("Failed to respond to event:", err);
    } finally {
      setPendingResponse(null);
    }
  };

  const handleCancel = () => {
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
      ]
    );
  };

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

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: showBottomBar ? insets.bottom + 100 : insets.bottom,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <BackHeader
          title={event.title}
          subtitle={`Hosted by ${isHost ? "you" : event.hostName}${
            event.status === "cancelled" ? " · Cancelled" : ""
          }`}
          marginBottom="$4"
          rightAction={
            isHost ? (
              <XStack gap="$2">
                <Button
                  variant="ghost"
                  buttonSize="sm"
                  circular
                  icon={<Pencil size={20} color="$color" />}
                  onPress={() => router.push(`/events/create?edit=${id}`)}
                />
                <Button
                  variant="ghost"
                  buttonSize="sm"
                  circular
                  icon={
                    cancelEvent.isPending ? undefined : (
                      <Trash2 size={20} color="$error" />
                    )
                  }
                  onPress={handleCancel}
                  loading={cancelEvent.isPending}
                  disabled={cancelEvent.isPending}
                />
              </XStack>
            ) : undefined
          }
        />

        {/* Event Details */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$4">
              {/* Date & Time */}
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

              {/* Location */}
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
          </Card>
        </Theme>

        {/* Notes */}
        {event.notes && (
          <Theme name="Card">
            <Card marginBottom="$4">
              <Text fontWeight="600" marginBottom="$2">
                Notes
              </Text>
              <Text color="$colorMuted">{event.notes}</Text>
            </Card>
          </Theme>
        )}

        {/* Invitees List */}
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
                        canChange={canChange}
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

      {/* Glass bottom bar for RSVP actions */}
      {showBottomBar && userInvitee && (
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
