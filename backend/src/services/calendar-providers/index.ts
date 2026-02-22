// ============================================
// Calendar Provider Abstraction
// ============================================

/**
 * Represents an external calendar from a provider (Google, Outlook, etc.)
 * Used when listing calendars the user can choose to import.
 */
export interface ExternalCalendar {
  externalCalendarId: string;
  calendarName: string;
  color?: string;
  isPrimary?: boolean;
}

/**
 * OAuth tokens returned after completing the authorization flow.
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  accountEmail?: string;
}

/**
 * Cached event data extracted from a provider's calendar.
 */
export interface ProviderEvent {
  externalEventId: string;
  startTime: Date;
  endTime: Date;
  isBusy: boolean;
}

/**
 * Strategy interface for calendar providers (Google, Outlook, etc.).
 * Each provider implements this interface to handle OAuth, calendar listing,
 * and event syncing in a provider-specific way.
 */
export interface CalendarProviderService {
  /** Generate the OAuth consent URL for the user to authorize access. */
  getAuthUrl(userId: string): string;

  /** Exchange an authorization code for OAuth tokens. */
  exchangeCode(code: string): Promise<OAuthTokens>;

  /** Refresh an expired access token using the stored refresh token. */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /** Fetch the list of calendars from the provider for a given access token. */
  fetchCalendars(accessToken: string): Promise<ExternalCalendar[]>;

  /** Fetch events from a specific calendar within a time range. */
  fetchEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<ProviderEvent[]>;
}

// ============================================
// Provider Factory
// ============================================

import { GoogleCalendarProvider } from './google';
import { OutlookCalendarProvider } from './outlook';

const providers: Record<string, CalendarProviderService> = {
  google: new GoogleCalendarProvider(),
  outlook: new OutlookCalendarProvider(),
};

/**
 * Get a CalendarProviderService by provider name.
 * Throws if the provider is not supported for server-side OAuth.
 */
export function getCalendarProvider(provider: string): CalendarProviderService {
  const service = providers[provider];
  if (!service) {
    throw new Error(
      `Calendar provider "${provider}" is not supported for server-side integration. ` +
        `Supported providers: ${Object.keys(providers).join(', ')}`,
    );
  }
  return service;
}
