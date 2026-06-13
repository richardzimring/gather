export const FRIEND_INVITE_SHARE_MESSAGE = 'hey add me on Gather';

/** SMS body — link must be in the message text. */
export function friendInviteSmsMessage(inviteUrl: string): string {
  return `${FRIEND_INVITE_SHARE_MESSAGE} ${inviteUrl}`;
}

export function eventInviteSmsMessage(
  eventTitle: string,
  inviteUrl: string,
): string {
  return `hey you in for ${eventTitle}? ${inviteUrl}`;
}
