const getEnvironmentVariable = (param: string): string => {
  const value = process.env[param];
  if (!value) {
    throw new Error(`Environment variable "${param}" is not defined.`);
  }
  return value;
};

const getOptionalEnvironmentVariable = (
  param: string,
  fallback = '',
): string => {
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
export const GOOGLE_CLIENT_ID =
  getOptionalEnvironmentVariable('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = getOptionalEnvironmentVariable(
  'GOOGLE_CLIENT_SECRET',
);
export const GOOGLE_REDIRECT_URI = getOptionalEnvironmentVariable(
  'GOOGLE_REDIRECT_URI',
);

// Outlook Calendar OAuth Configuration
// These are optional locally — required in deployed environments
export const OUTLOOK_CLIENT_ID =
  getOptionalEnvironmentVariable('OUTLOOK_CLIENT_ID');
export const OUTLOOK_CLIENT_SECRET = getOptionalEnvironmentVariable(
  'OUTLOOK_CLIENT_SECRET',
);
export const OUTLOOK_REDIRECT_URI = getOptionalEnvironmentVariable(
  'OUTLOOK_REDIRECT_URI',
);

// Friend Code Configuration
export const FRIEND_CODE_LENGTH = 8;

// Default Groups
export const DEFAULT_GROUPS = [{ name: 'All Friends', emoji: '👥' }] as const;
