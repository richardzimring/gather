// ============================================
// Calendar Provider Abstraction
// ============================================

/**
 * Thrown when an OAuth refresh token has been revoked or expired permanently
 * (e.g. the user revoked Gather's access in their Google/Outlook account settings).
 * Distinct from transient network/API errors so callers can clean up stale connections.
 */
export class OAuthRevokedError extends Error {
  constructor(message = 'OAuth access has been revoked') {
    super(message);
    this.name = 'OAuthRevokedError';
  }
}

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
  /** Scopes actually granted by the user during this authorization. */
  grantedScopes?: string[];
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
 * Event data used when exporting a Gather event to an external calendar.
 */
export interface ExportableEvent {
  title: string;
  description?: string;
  /**
   * Combined location string formatted as "Display Name, Full Address" (or
   * just one of those if the other is absent). Calendar apps use this to
   * render a tappable map link.
   */
  locationString?: string;
  startTime: Date;
  endTime: Date;
  timeZone: string;
}

/**
 * Options for generating the OAuth consent URL.
 */
export interface AuthUrlOptions {
  /** Whether to include write/export scopes in addition to the read scopes. */
  includeExportScope?: boolean;
}

/**
 * Strategy interface for calendar providers (Google, Outlook, etc.).
 * Each provider implements this interface to handle OAuth, calendar listing,
 * and event syncing in a provider-specific way.
 */
export interface CalendarProviderService {
  /** Generate the OAuth consent URL for the user to authorize access. */
  getAuthUrl(userId: string, options?: AuthUrlOptions): string;

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

  /** Create a new secondary calendar in the provider. Returns the created calendar. */
  createCalendar(
    accessToken: string,
    name: string,
    timeZone: string,
  ): Promise<ExternalCalendar>;

  /** Create an event in a specific calendar. Returns the external event ID. */
  createEvent(
    accessToken: string,
    calendarId: string,
    event: ExportableEvent,
  ): Promise<string>;

  /** Update an existing exported event. */
  updateEvent(
    accessToken: string,
    calendarId: string,
    externalEventId: string,
    event: ExportableEvent,
  ): Promise<void>;

  /** Delete an exported event from a calendar. */
  deleteEvent(
    accessToken: string,
    calendarId: string,
    externalEventId: string,
  ): Promise<void>;

  /** Delete an entire calendar created by this app (e.g. the "Gather" export calendar). */
  deleteCalendar(accessToken: string, calendarId: string): Promise<void>;
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
