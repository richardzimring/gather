import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import type { Event } from '../types';

// ============================================
// Expo Push Service Client
// ============================================

const expo = new Expo();

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'event_invitation'
  | 'event_response'
  | 'event_updated'
  | 'event_cancelled'
  | 'event_reminder'
  | 'counter_proposal';

// Map notification types to preference keys
const NOTIFICATION_TYPE_TO_PREFERENCE: Record<NotificationType, string | null> =
  {
    friend_request: 'friendRequests',
    friend_accepted: 'friendRequests',
    event_invitation: 'eventInvites',
    event_response: 'eventUpdates',
    event_updated: 'eventUpdates',
    event_cancelled: 'eventUpdates',
    event_reminder: 'eventUpdates',
    counter_proposal: 'eventUpdates',
  };

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ============================================
// Send Push Notification
// ============================================

export const sendPushNotification = async (
  userId: string,
  payload: NotificationPayload,
): Promise<void> => {
  try {
    // Get user's push token and notification preferences
    const result = await db
      .select({
        pushToken: users.pushToken,
        notificationPreferences: users.notificationPreferences,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = result[0];

    if (!user?.pushToken) {
      console.log(`No push token for user ${userId}`);
      return;
    }

    // Check notification preferences
    const prefKey = NOTIFICATION_TYPE_TO_PREFERENCE[payload.type];
    if (prefKey && user.notificationPreferences) {
      const prefs = user.notificationPreferences as Record<string, boolean>;
      if (prefs[prefKey] === false) {
        console.log(`User ${userId} has disabled ${prefKey} notifications`);
        return;
      }
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.error(
        `Push token for user ${userId} is not a valid Expo push token`,
      );
      return;
    }

    const message: ExpoPushMessage = {
      to: user.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    };

    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      await handlePushTickets(tickets, [userId]);
    }
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error);
  }
};

export const sendPushNotifications = async (
  userIds: string[],
  payload: NotificationPayload,
): Promise<void> => {
  if (userIds.length === 0) return;

  try {
    // Get all users' push tokens and preferences
    const results = await Promise.all(
      userIds.map((userId) =>
        db
          .select({
            id: users.id,
            pushToken: users.pushToken,
            notificationPreferences: users.notificationPreferences,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
      ),
    );

    const messages: ExpoPushMessage[] = [];
    const messageUserIds: string[] = [];

    for (const result of results) {
      const user = result[0];
      if (!user?.pushToken) continue;

      // Check notification preferences
      const prefKey = NOTIFICATION_TYPE_TO_PREFERENCE[payload.type];
      if (prefKey && user.notificationPreferences) {
        const prefs = user.notificationPreferences as Record<string, boolean>;
        if (prefs[prefKey] === false) continue;
      }

      if (!Expo.isExpoPushToken(user.pushToken)) {
        console.error(
          `Push token for user ${user.id} is not a valid Expo push token`,
        );
        continue;
      }

      messages.push({
        to: user.pushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      });
      messageUserIds.push(user.id);
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    let ticketIndex = 0;

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      const chunkUserIds = messageUserIds.slice(
        ticketIndex,
        ticketIndex + chunk.length,
      );
      await handlePushTickets(tickets, chunkUserIds);
      ticketIndex += chunk.length;
    }
  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
};

// ============================================
// Ticket Error Handling
// ============================================

const handlePushTickets = async (
  tickets: ExpoPushTicket[],
  userIds: string[],
): Promise<void> => {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const userId = userIds[i];

    if (!ticket || !userId) continue;

    if (ticket.status === 'error') {
      console.error(
        `Push notification error for user ${userId}:`,
        ticket.message,
      );

      // If the device is not registered, clear the push token
      if (ticket.details?.error === 'DeviceNotRegistered') {
        console.log(`Clearing invalid push token for user ${userId}`);
        await db
          .update(users)
          .set({ pushToken: null })
          .where(eq(users.id, userId));
      }
    }
  }
};

// ============================================
// Notification Helpers
// ============================================

export const notifyFriendRequest = async (
  targetUserId: string,
  fromUserName: string,
): Promise<void> => {
  await sendPushNotification(targetUserId, {
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${fromUserName} wants to be your friend`,
    data: { type: 'friend_request' },
  });
};

export const notifyFriendAccepted = async (
  targetUserId: string,
  friendName: string,
): Promise<void> => {
  await sendPushNotification(targetUserId, {
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    body: `${friendName} accepted your friend request`,
    data: { type: 'friend_accepted' },
  });
};

export const notifyEventInvitation = async (
  inviteeIds: string[],
  event: Event,
  hostName: string,
): Promise<void> => {
  await sendPushNotifications(inviteeIds, {
    type: 'event_invitation',
    title: 'New Invitation',
    body: `${hostName} invited you to ${event.title}`,
    data: {
      type: 'event_invitation',
      eventId: event.eventId,
    },
  });
};

export const notifyEventResponse = async (
  hostId: string,
  event: Event,
  responderName: string,
  status: string,
): Promise<void> => {
  const statusText =
    status === 'accepted'
      ? 'is going'
      : status === 'declined'
        ? "can't make it"
        : status === 'maybe'
          ? 'might come'
          : 'responded';

  await sendPushNotification(hostId, {
    type: 'event_response',
    title: 'Event Response',
    body: `${responderName} ${statusText} to ${event.title}`,
    data: {
      type: 'event_response',
      eventId: event.eventId,
    },
  });
};

export const notifyEventUpdated = async (
  inviteeIds: string[],
  event: Event,
  requiresReconfirmation = false,
): Promise<void> => {
  await sendPushNotifications(inviteeIds, {
    type: 'event_updated',
    title: requiresReconfirmation ? 'Event Details Changed' : 'Event Updated',
    body: requiresReconfirmation
      ? `${event.title} has new details — please re-confirm your attendance`
      : `${event.title} has been updated`,
    data: {
      type: 'event_updated',
      eventId: event.eventId,
    },
  });
};

export const notifyEventCancelled = async (
  inviteeIds: string[],
  event: Event,
): Promise<void> => {
  await sendPushNotifications(inviteeIds, {
    type: 'event_cancelled',
    title: 'Event Cancelled',
    body: `${event.title} has been cancelled`,
    data: {
      type: 'event_cancelled',
      eventId: event.eventId,
    },
  });
};

export const notifyCounterProposal = async (
  hostId: string,
  event: Event,
  proposerName: string,
): Promise<void> => {
  await sendPushNotification(hostId, {
    type: 'counter_proposal',
    title: 'Counter Proposal',
    body: `${proposerName} suggested changes to ${event.title}`,
    data: {
      type: 'counter_proposal',
      eventId: event.eventId,
    },
  });
};
