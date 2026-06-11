const getEnvironmentVariable = (param: string): string => {
  const value = process.env[param];
  if (!value) {
    throw new Error(`Environment variable "${param}" is not defined.`);
  }
  return value;
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
export const GOOGLE_CLIENT_ID = getEnvironmentVariable('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = getEnvironmentVariable(
  'GOOGLE_CLIENT_SECRET',
);
export const GOOGLE_REDIRECT_URI = getEnvironmentVariable(
  'GOOGLE_REDIRECT_URI',
);

// Outlook Calendar OAuth Configuration
export const OUTLOOK_CLIENT_ID = getEnvironmentVariable('OUTLOOK_CLIENT_ID');
export const OUTLOOK_CLIENT_SECRET = getEnvironmentVariable(
  'OUTLOOK_CLIENT_SECRET',
);
export const OUTLOOK_REDIRECT_URI = getEnvironmentVariable(
  'OUTLOOK_REDIRECT_URI',
);

// Owner Notifications
export const OWNER_EMAIL = getEnvironmentVariable('OWNER_EMAIL');

// Invite Code Configuration
export const INVITE_CODE_LENGTH = 8;

// Base URL used to build shareable invite links (friend + event invites).
// Points at the Cloudflare Pages site that hosts the apple-app-site-association
// file and the invite landing pages.
export const INVITE_BASE_URL =
  process.env.INVITE_BASE_URL ?? 'https://gather.rzimring.com';

// Default Groups
export const DEFAULT_GROUPS = [{ name: 'All Friends', emoji: '👥' }] as const;
