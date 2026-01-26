const getEnvironmentVariable = (param: string): string => {
  const value = process.env[param];
  if (!value) {
    throw new Error(`Environment variable "${param}" is not defined.`);
  }
  return value;
};

const getOptionalEnvironmentVariable = (param: string): string | undefined => {
  return process.env[param];
};

// AWS Configuration
export const REGION = getEnvironmentVariable('REGION');
export const STAGE = getEnvironmentVariable('STAGE');

// DynamoDB Tables
export const MAIN_TABLE_NAME = getEnvironmentVariable('MAIN_TABLE_NAME');

// Apple Sign In Configuration
// Bundle ID for verifying Apple identity tokens
export const APPLE_BUNDLE_ID =
  getOptionalEnvironmentVariable('APPLE_BUNDLE_ID') ?? 'com.gather.app';

// Invite Code Configuration
export const INVITE_CODE_LENGTH = 8;

// Default Activities
export const DEFAULT_ACTIVITIES = [
  { emoji: '☕', name: 'Coffee' },
  { emoji: '🍽️', name: 'Dinner' },
  { emoji: '🍻', name: 'Drinks' },
  { emoji: '🏃', name: 'Workout' },
  { emoji: '🎬', name: 'Movie' },
  { emoji: '🎮', name: 'Gaming' },
  { emoji: '📚', name: 'Study' },
  { emoji: '🛍️', name: 'Shopping' },
  { emoji: '🚶', name: 'Walk' },
  { emoji: '🎉', name: 'Party' },
  { emoji: '🧘', name: 'Yoga' },
  { emoji: '🎾', name: 'Sports' },
  { emoji: '🎵', name: 'Concert' },
  { emoji: '🏖️', name: 'Beach' },
  { emoji: '❓', name: 'Other' },
] as const;

// Default Groups
export const DEFAULT_GROUPS = [
  { name: 'All Friends', emoji: '👥' },
  { name: 'Close Friends', emoji: '💫' },
] as const;
