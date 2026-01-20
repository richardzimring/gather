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

// JWT Configuration
export const JWT_SECRET = getEnvironmentVariable('JWT_SECRET');
export const JWT_ACCESS_EXPIRY = '1h';
export const JWT_REFRESH_EXPIRY = '30d';

// SMS/SNS Configuration
export const SNS_TOPIC_ARN = getOptionalEnvironmentVariable('SNS_TOPIC_ARN');

// Rate Limiting
export const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
export const MAX_VERIFICATION_ATTEMPTS = 5;
export const VERIFICATION_COOLDOWN_MINUTES = 60;

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
