const getEnvironmentVariable = (param: string): string => {
  const value = process.env[param];
  if (!value) {
    throw new Error(`Environment variable "${param}" is not defined.`);
  }
  return value;
};

const getOptionalEnvironmentVariable = (param: string, fallback: string = ''): string => {
  return process.env[param] ?? fallback;
};

// AWS Configuration
export const REGION = getEnvironmentVariable('REGION');
export const STAGE = getEnvironmentVariable('STAGE');
export const PG_CONNECTION_STRING = getEnvironmentVariable(
  'PG_CONNECTION_STRING',
);
export const GEMINI_API_KEY = getEnvironmentVariable('GEMINI_API_KEY');

// Apple Sign In Configuration
// Bundle ID for verifying Apple identity tokens
export const APPLE_BUNDLE_ID = getEnvironmentVariable('APPLE_BUNDLE_ID');

// Google Calendar OAuth Configuration
// These are optional locally — required in deployed environments
export const GOOGLE_CLIENT_ID = getOptionalEnvironmentVariable('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = getOptionalEnvironmentVariable('GOOGLE_CLIENT_SECRET');
export const GOOGLE_REDIRECT_URI = getOptionalEnvironmentVariable('GOOGLE_REDIRECT_URI');

// Invite Code Configuration
export const INVITE_CODE_LENGTH = 8;

// Default Activities
export const DEFAULT_ACTIVITIES = [
  { emoji: '☕', name: 'Coffee' },
  { emoji: '🍽️', name: 'Dinner' },
  { emoji: '🍻', name: 'Drinks' },
  { emoji: '🏋️', name: 'Gym' },
  { emoji: '🎬', name: 'Movie' },
  { emoji: '🎮', name: 'Gaming' },
  { emoji: '📚', name: 'Study' },
  { emoji: '🛍️', name: 'Shopping' },
  { emoji: '🐶', name: 'Walk the dogs' },
  { emoji: '🏃', name: 'Run' },
  { emoji: '🎉', name: 'Party' },
  { emoji: '🧘', name: 'Yoga' },
  { emoji: '🎾', name: 'Tennis' },
  { emoji: '🎵', name: 'Concert' },
  { emoji: '🏖️', name: 'Beach' },
  { emoji: '🍿', name: 'Netflix and chill' },
] as const;

// Default Groups
export const DEFAULT_GROUPS = [
  { name: 'All Friends', emoji: '👥' },
  { name: 'Close Friends', emoji: '💫' },
] as const;
