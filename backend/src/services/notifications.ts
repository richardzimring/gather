// SNS imports - uncomment when implementing actual push notifications
// import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
// import { REGION, SNS_TOPIC_ARN } from '../constants';
// const snsClient = new SNSClient({ region: REGION });
import * as db from './dynamodb';
import type { UserRecord, Event } from '../types';

// ============================================
// Key Builders
// ============================================

const userPk = (userId: string) => `USER#${userId}`;

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
  payload: NotificationPayload
): Promise<void> => {
  try {
    // Get user's push token
    const userRecord = await db.getItem<UserRecord>(userPk(userId), 'PROFILE');
    
    if (!userRecord?.pushToken) {
      console.log(`No push token for user ${userId}`);
      return;
    }

    // For now, log the notification
    // TODO: Implement actual APNs sending via SNS Platform Application
    console.log(`[PUSH] To: ${userId}`, payload);

    // In production with SNS Platform Application:
    // const command = new PublishCommand({
    //   TargetArn: userRecord.pushEndpointArn, // SNS endpoint ARN
    //   Message: JSON.stringify({
    //     APNS: JSON.stringify({
    //       aps: {
    //         alert: {
    //           title: payload.title,
    //           body: payload.body,
    //         },
    //         badge: 1,
    //         sound: 'default',
    //       },
    //       ...payload.data,
    //     }),
    //   }),
    //   MessageStructure: 'json',
    // });
    // await snsClient.send(command);
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error);
  }
};

export const sendPushNotifications = async (
  userIds: string[],
  payload: NotificationPayload
): Promise<void> => {
  await Promise.all(userIds.map(userId => sendPushNotification(userId, payload)));
};

// ============================================
// Notification Helpers
// ============================================

export const notifyFriendRequest = async (
  targetUserId: string,
  fromUserName: string
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
  friendName: string
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
  hostName: string
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
  status: string
): Promise<void> => {
  const statusText = status === 'accepted' ? 'is going' : 
                     status === 'declined' ? "can't make it" : 
                     status === 'maybe' ? 'might come' : 'responded';

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
  event: Event
): Promise<void> => {
  await sendPushNotifications(inviteeIds, {
    type: 'event_updated',
    title: 'Event Updated',
    body: `${event.title} has been updated`,
    data: {
      type: 'event_updated',
      eventId: event.eventId,
    },
  });
};

export const notifyEventCancelled = async (
  inviteeIds: string[],
  event: Event
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
  proposerName: string
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
