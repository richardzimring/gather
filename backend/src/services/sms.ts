// SNS imports - uncomment when implementing actual SMS sending
// import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
// import { REGION } from '../constants';
// const snsClient = new SNSClient({ region: REGION });
import { v4 as uuidv4 } from 'uuid';
import * as db from './dynamodb';
import type { PendingInviteRecord, Event } from '../types';
import { getUserById } from './users';

// ============================================
// Key Builders
// ============================================

const pendingPk = (phone: string) => `PENDING#${phone}`;
const eventSk = (eventId: string) => `EVENT#${eventId}`;

// ============================================
// SMS Invite Operations
// ============================================

export const sendEventInviteSms = async (
  phoneNumber: string,
  event: Event,
  invitedByUserId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    // Get inviter's name
    const inviter = await getUserById(invitedByUserId);
    const inviterName = inviter?.displayName ?? 'A friend';

    // Create pending invite record
    const pendingInvite: PendingInviteRecord = {
      pk: pendingPk(phoneNumber),
      sk: eventSk(event.eventId),
      phoneNumber,
      eventId: event.eventId,
      invitedBy: invitedByUserId,
      createdAt: new Date().toISOString(),
      smsStatus: 'pending',
    };

    await db.putItem(pendingInvite);

    // Format date
    const eventDate = event.startTime 
      ? new Date(event.startTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      : 'soon';

    // Build message
    const inviteCode = uuidv4().slice(0, 8);
    const message = `${inviterName} invited you to ${event.title} on ${eventDate}! Download Gather to respond: https://gather.app/invite/${inviteCode}`;

    // Send SMS via SNS
    // TODO: Enable in production
    console.log(`[SMS] To: ${phoneNumber} - ${message}`);

    // In production:
    // const command = new PublishCommand({
    //   PhoneNumber: phoneNumber,
    //   Message: message,
    //   MessageAttributes: {
    //     'AWS.SNS.SMS.SenderID': {
    //       DataType: 'String',
    //       StringValue: 'Gather',
    //     },
    //     'AWS.SNS.SMS.SMSType': {
    //       DataType: 'String',
    //       StringValue: 'Transactional',
    //     },
    //   },
    // });
    // await snsClient.send(command);

    // Update status
    await db.updateItem<PendingInviteRecord>(
      pendingPk(phoneNumber),
      eventSk(event.eventId),
      { smsStatus: 'sent' }
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to send SMS invite:', error);
    
    // Update status to failed
    try {
      await db.updateItem<PendingInviteRecord>(
        pendingPk(phoneNumber),
        eventSk(event.eventId),
        { smsStatus: 'failed' }
      );
    } catch {
      // Ignore error updating status - original error is more important
    }

    return { success: false, message: 'Failed to send SMS' };
  }
};

// ============================================
// Pending Invite Operations
// ============================================

export const getPendingInvitesForPhone = async (
  phoneNumber: string
): Promise<PendingInviteRecord[]> => {
  return db.queryByPk<PendingInviteRecord>(pendingPk(phoneNumber), 'EVENT#');
};

export const linkPendingInvitesToUser = async (
  phoneNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string  // Reserved for future use when auto-adding user to events
): Promise<string[]> => {
  const pendingInvites = await getPendingInvitesForPhone(phoneNumber);
  const eventIds: string[] = [];

  for (const invite of pendingInvites) {
    // The event invite logic should be handled separately
    // Here we just return the event IDs so they can be processed
    eventIds.push(invite.eventId);

    // Delete the pending invite
    await db.deleteItem(pendingPk(phoneNumber), eventSk(invite.eventId));
  }

  return eventIds;
};

export const deletePendingInvite = async (
  phoneNumber: string,
  eventId: string
): Promise<void> => {
  await db.deleteItem(pendingPk(phoneNumber), eventSk(eventId));
};
