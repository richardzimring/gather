import { calendar_v3, auth as googleAuth } from '@googleapis/calendar';
import { GaxiosError } from 'gaxios';

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from '../../constants';
import type {
  AuthUrlOptions,
  CalendarProviderService,
  ExportableEvent,
  ExternalCalendar,
  OAuthTokens,
  ProviderEvent,
} from './index';
import { OAuthRevokedError } from './index';

// ============================================
// Google Calendar Provider
// ============================================

const READ_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const EXPORT_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

/**
 * Google Calendar provider implementation using @googleapis/calendar SDK.
 * Handles OAuth 2.0 flow, calendar listing, and event fetching.
 */
export class GoogleCalendarProvider implements CalendarProviderService {
  private createOAuth2Client() {
    return new googleAuth.OAuth2({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI,
    });
  }

  private createCalendarClient(accessToken: string): calendar_v3.Calendar {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return new calendar_v3.Calendar({ auth: oauth2Client });
  }

  /**
   * Generate the Google OAuth consent URL.
   * The `state` parameter encodes the userId so we can associate tokens
   * with the correct user when Google redirects back.
   * Pass `includeExportScope: true` to request write access for exporting events.
   */
  getAuthUrl(userId: string, options?: AuthUrlOptions): string {
    const oauth2Client = this.createOAuth2Client();
    const scopes = options?.includeExportScope
      ? [...READ_SCOPES, EXPORT_SCOPE]
      : READ_SCOPES;

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      // Always force consent so Google issues a new refresh token with the
      // updated scope set (required for incremental authorization).
      prompt: 'consent',
      // Carry existing granted scopes forward when upgrading incrementally.
      include_granted_scopes: options?.includeExportScope ? true : undefined,
      state: userId,
    });
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        'Google OAuth did not return required tokens. Ensure the consent prompt is shown.',
      );
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000),
      grantedScopes: tokens.scope ? tokens.scope.split(' ') : undefined,
    };
  }

  /**
   * Refresh an expired access token using the stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh Google access token');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token ?? refreshToken,
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      };
    } catch (error: unknown) {
      // Re-throw OAuthRevokedError as-is (e.g. if thrown above for missing token)
      if (error instanceof OAuthRevokedError) throw error;

      // Google returns invalid_grant when the refresh token has been revoked or expired.
      if (
        error instanceof GaxiosError &&
        error.response?.data?.error === 'invalid_grant'
      ) {
        throw new OAuthRevokedError('Google OAuth access has been revoked');
      }

      throw new Error('Failed to refresh Google access token');
    }
  }

  /**
   * List the user's Google calendars.
   */
  async fetchCalendars(accessToken: string): Promise<ExternalCalendar[]> {
    const calendar = this.createCalendarClient(accessToken);
    const response = await calendar.calendarList.list();
    const items = response.data.items ?? [];

    return items.map((item) => ({
      externalCalendarId: item.id ?? '',
      calendarName: item.summary ?? 'Untitled Calendar',
      color: item.backgroundColor ?? undefined,
      isPrimary: item.primary ?? false,
    }));
  }

  /**
   * Fetch busy intervals from a specific Google calendar within a time range.
   * Uses the FreeBusy API which returns pre-merged busy windows — we never
   * need individual event details, just the time intervals.
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<ProviderEvent[]> {
    const calendar = this.createCalendarClient(accessToken);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busyIntervals = response.data.calendars?.[calendarId]?.busy ?? [];

    const events: ProviderEvent[] = [];

    for (const interval of busyIntervals) {
      if (!interval.start || !interval.end) continue;
      events.push({
        externalEventId: `${calendarId}_${interval.start}`,
        startTime: new Date(interval.start),
        endTime: new Date(interval.end),
        isBusy: true,
      });
    }

    return events;
  }

  /**
   * Create a new secondary Google Calendar with the given name.
   * Requires the `calendar.app.created` scope.
   */
  async createCalendar(
    accessToken: string,
    name: string,
    timeZone: string,
  ): Promise<ExternalCalendar> {
    const calendar = this.createCalendarClient(accessToken);

    const response = await calendar.calendars.insert({
      requestBody: { summary: name, timeZone },
    });

    return {
      externalCalendarId: response.data.id ?? '',
      calendarName: response.data.summary ?? name,
    };
  }

  /**
   * Create an event in a specific Google calendar.
   * Requires the `calendar.app.created` scope (when the calendar was created by this app).
   * Returns the provider's event ID.
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    event: ExportableEvent,
  ): Promise<string> {
    const calendar = this.createCalendarClient(accessToken);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        location: event.locationString,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 60 }],
        },
      },
    });

    if (!response.data.id) {
      throw new Error(
        'Google Calendar did not return an event ID after insert',
      );
    }

    return response.data.id;
  }

  /**
   * Update an existing event in a Google calendar.
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    externalEventId: string,
    event: ExportableEvent,
  ): Promise<void> {
    const calendar = this.createCalendarClient(accessToken);

    await calendar.events.update({
      calendarId,
      eventId: externalEventId,
      requestBody: {
        summary: event.title,
        description: event.description,
        location: event.locationString,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 60 }],
        },
      },
    });
  }

  /**
   * Delete an event from a Google calendar.
   */
  async deleteEvent(
    accessToken: string,
    calendarId: string,
    externalEventId: string,
  ): Promise<void> {
    const calendar = this.createCalendarClient(accessToken);

    await calendar.events.delete({ calendarId, eventId: externalEventId });
  }

  /**
   * Delete an entire Google calendar (e.g. the "Gather" export calendar).
   */
  async deleteCalendar(accessToken: string, calendarId: string): Promise<void> {
    const calendar = this.createCalendarClient(accessToken);

    await calendar.calendars.delete({ calendarId });
  }
}
