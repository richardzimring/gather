import * as crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db, pendingInvites, eventInvitees } from '../db';
import { INVITE_BASE_URL } from '../constants';
import { normalizePhone } from '../utils/phone';
import { isUniqueViolation } from '../utils/pg';
import { getEvent } from './events';
import { getUserById } from './users';
import { sendFriendRequest } from './friends';
import { notifyEventInvitation } from './notifications';

export type PendingInviteType = 'friend' | 'event';

interface CreatePendingInviteParams {
  inviterUserId: string;
  type: PendingInviteType;
  phone: string;
  eventId?: string;
}

interface CreatePendingInviteResult {
  success: boolean;
  message?: string;
  token?: string;
  inviteUrl?: string;
  prefilledMessage?: string;
}

const generateInviteToken = (): string => {
  return crypto.randomBytes(16).toString('base64url').slice(0, 32);
};

// Friend invites link to the inviter's friend-code URL rather than the token,
// so tapping the link sends a friend request through the normal code flow. The
// token on a friend invite is never embedded anywhere; the row is only claimed
// by phone match when the recipient signs up. Event invites use the token URL.
const buildInviteUrls = (
  type: PendingInviteType,
  inviter: { firstName: string; inviteCode?: string },
  token: string,
  eventTitle?: string,
): Pick<CreatePendingInviteResult, 'inviteUrl' | 'prefilledMessage'> => {
  const inviteUrl =
    type === 'event'
      ? `${INVITE_BASE_URL}/e/${token}`
      : `${INVITE_BASE_URL}/invite/${inviter.inviteCode ?? token}`;

  const prefilledMessage =
    type === 'event'
      ? `${inviter.firstName} invited you to "${eventTitle}" on Gather. Join here: ${inviteUrl}`
      : `${inviter.firstName} invited you to join them on Gather. Join here: ${inviteUrl}`;

  return { inviteUrl, prefilledMessage };
};

/**
 * Create a pending invite for someone who is not yet on Gather. Returns a
 * shareable link and a prefilled message the inviter can send from their own
 * device.
 */
export const createPendingInvite = async (
  params: CreatePendingInviteParams,
): Promise<CreatePendingInviteResult> => {
  const { inviterUserId, type, eventId } = params;

  const phone = normalizePhone(params.phone);
  if (!phone) {
    return { success: false, message: 'Invalid phone number' };
  }

  const inviter = await getUserById(inviterUserId);
  if (!inviter) {
    return { success: false, message: 'Inviter not found' };
  }

  let eventTitle: string | undefined;
  if (type === 'event') {
    if (!eventId) {
      return {
        success: false,
        message: 'eventId is required for event invites',
      };
    }
    const event = await getEvent(eventId);
    if (!event) {
      return { success: false, message: 'Event not found' };
    }
    if (event.hostId !== inviterUserId) {
      return {
        success: false,
        message: 'Only the host can invite people to this event',
      };
    }
    eventTitle = event.title;
  }

  const findUnclaimedInvite = async () => {
    const conditions = [
      eq(pendingInvites.inviterUserId, inviterUserId),
      eq(pendingInvites.phone, phone),
      eq(pendingInvites.type, type),
      isNull(pendingInvites.claimedByUserId),
    ];
    if (type === 'event' && eventId) {
      conditions.push(eq(pendingInvites.eventId, eventId));
    } else if (type === 'friend') {
      conditions.push(isNull(pendingInvites.eventId));
    }

    const [row] = await db
      .select()
      .from(pendingInvites)
      .where(and(...conditions))
      .limit(1);
    return row;
  };

  let token = generateInviteToken();

  const existing = await findUnclaimedInvite();
  if (existing) {
    token = existing.token;
  } else {
    try {
      await db.insert(pendingInvites).values({
        type,
        inviterUserId,
        eventId: type === 'event' ? eventId : null,
        phone,
        token,
      });
    } catch (error) {
      // Lost a race with a concurrent identical request (partial unique index
      // on unclaimed invites) — reuse the row that won.
      const winner = isUniqueViolation(error)
        ? await findUnclaimedInvite()
        : undefined;
      if (!winner) throw error;
      token = winner.token;
    }
  }

  const { inviteUrl, prefilledMessage } = buildInviteUrls(
    type,
    inviter,
    token,
    eventTitle,
  );

  return { success: true, token, inviteUrl, prefilledMessage };
};

/**
 * Send a friend request from the inviter to the newly joined user. Errors
 * (e.g. already friends) are swallowed since claiming should be idempotent.
 */
const sendInviterFriendRequest = async (
  inviterUserId: string,
  newUserId: string,
): Promise<void> => {
  if (inviterUserId === newUserId) return;
  try {
    await sendFriendRequest(inviterUserId, newUserId);
  } catch (error) {
    console.error('Failed to send friend request from invite:', error);
  }
};

/**
 * Add the newly joined user to the invite's event (if they aren't already in
 * it) and notify them.
 */
const addToEvent = async (
  eventId: string,
  newUserId: string,
): Promise<void> => {
  const event = await getEvent(eventId);
  if (!event) return;
  if (event.hostId === newUserId) return;
  if (event.invitees.some((i) => i.userId === newUserId)) return;

  await db
    .insert(eventInvitees)
    .values({ eventId, userId: newUserId, status: 'pending' })
    .onConflictDoNothing();

  const host = await getUserById(event.hostId);
  if (host) {
    await notifyEventInvitation([newUserId], event, host.fullName);
  }
};

type PendingInviteRow = typeof pendingInvites.$inferSelect;

const processInvite = async (
  invite: PendingInviteRow,
  userId: string,
): Promise<void> => {
  if (invite.type === 'friend') {
    await sendInviterFriendRequest(invite.inviterUserId, userId);
  } else if (invite.type === 'event' && invite.eventId) {
    await addToEvent(invite.eventId, userId);
    await sendInviterFriendRequest(invite.inviterUserId, userId);
  }
};

/** Atomically claim an invite. Returns true if this call won the claim. */
const claimInvite = async (
  inviteId: string,
  userId: string,
): Promise<boolean> => {
  const claimed = await db
    .update(pendingInvites)
    .set({ claimedByUserId: userId, claimedAt: new Date() })
    .where(
      and(
        eq(pendingInvites.id, inviteId),
        isNull(pendingInvites.claimedByUserId),
      ),
    )
    .returning({ id: pendingInvites.id });
  return claimed.length > 0;
};

/** Release a claim we just won so a failed redemption can be retried. */
const releaseClaim = async (
  inviteId: string,
  userId: string,
): Promise<void> => {
  await db
    .update(pendingInvites)
    .set({ claimedByUserId: null, claimedAt: null })
    .where(
      and(
        eq(pendingInvites.id, inviteId),
        eq(pendingInvites.claimedByUserId, userId),
      ),
    );
};

/**
 * Claim the invite, then process it (claim-first so two concurrent redeemers
 * can't both process). If processing fails, the claim is released so the
 * redemption can be retried. Returns false if someone else holds the claim.
 */
const claimAndProcess = async (
  invite: PendingInviteRow,
  userId: string,
): Promise<boolean> => {
  if (!(await claimInvite(invite.id, userId))) return false;
  try {
    await processInvite(invite, userId);
    return true;
  } catch (error) {
    await releaseClaim(invite.id, userId);
    throw error;
  }
};

interface RedeemResult {
  success: boolean;
  message?: string;
  type?: PendingInviteType;
  eventId?: string;
}

/**
 * Redeem an invite directly by its token (recipient tapped the link while
 * signed in). Idempotent.
 */
export const redeemInviteToken = async (
  userId: string,
  token: string,
): Promise<RedeemResult> => {
  const [invite] = await db
    .select()
    .from(pendingInvites)
    .where(eq(pendingInvites.token, token))
    .limit(1);

  if (!invite) {
    return { success: false, message: 'Invite not found' };
  }

  if (invite.claimedByUserId) {
    if (invite.claimedByUserId !== userId) {
      return { success: false, message: 'Invite not found' };
    }
    return {
      success: true,
      type: invite.type,
      eventId: invite.eventId ?? undefined,
    };
  }

  if (!(await claimAndProcess(invite, userId))) {
    // Lost a race with a concurrent redemption by someone else.
    return { success: false, message: 'Invite not found' };
  }

  return {
    success: true,
    type: invite.type,
    eventId: invite.eventId ?? undefined,
  };
};

/**
 * Claim all unclaimed invites addressed to a given (normalized E.164) phone
 * number. Triggered when a user sets/updates their phone. Awaited by the
 * caller (Lambda freezes after the response, so this can't be left dangling),
 * but failures only log — they never fail the phone update itself.
 */
export const claimPendingInvitesForPhone = async (
  userId: string,
  normalizedPhone: string,
): Promise<void> => {
  const invites = await db
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.phone, normalizedPhone),
        isNull(pendingInvites.claimedByUserId),
      ),
    );

  for (const invite of invites) {
    if (invite.inviterUserId === userId) continue;
    try {
      await claimAndProcess(invite, userId);
    } catch (error) {
      console.error('Failed to claim pending invite:', invite.id, error);
    }
  }
};
