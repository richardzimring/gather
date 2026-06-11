import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persists an invite that was tapped while the user was signed out (or before
 * they finished onboarding) so it can be processed once they are authenticated.
 */

const FRIEND_INVITE_KEY = 'pending_friend_invite_code';
const EVENT_INVITE_KEY = 'pending_event_invite_token';

export async function setPendingFriendInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FRIEND_INVITE_KEY, code);
  } catch (error) {
    console.error('Failed to store pending friend invite:', error);
  }
}

export async function getPendingFriendInvite(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FRIEND_INVITE_KEY);
  } catch (error) {
    console.error('Failed to read pending friend invite:', error);
    return null;
  }
}

export async function clearPendingFriendInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FRIEND_INVITE_KEY);
  } catch (error) {
    console.error('Failed to clear pending friend invite:', error);
  }
}

export async function setPendingEventInvite(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENT_INVITE_KEY, token);
  } catch (error) {
    console.error('Failed to store pending event invite:', error);
  }
}

export async function getPendingEventInvite(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(EVENT_INVITE_KEY);
  } catch (error) {
    console.error('Failed to read pending event invite:', error);
    return null;
  }
}

export async function clearPendingEventInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EVENT_INVITE_KEY);
  } catch (error) {
    console.error('Failed to clear pending event invite:', error);
  }
}
