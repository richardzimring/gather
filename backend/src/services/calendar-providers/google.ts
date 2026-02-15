import { calendar_v3, auth as googleAuth } from '@googleapis/calendar';

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from '../../constants';
import type {
  CalendarProviderService,
  ExternalCalendar,
  OAuthTokens,
  ProviderEvent,
} from './index';

// ============================================
// Google Calendar Provider
// ============================================

/** Google Calendar read-only scope */
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

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
   */
  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
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
    };
  }

  /**
   * Refresh an expired access token using the stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

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
   * Fetch events from a specific Google calendar within a time range.
   * Uses `singleEvents: true` to expand recurring events into individual instances.
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<ProviderEvent[]> {
    const calendar = this.createCalendarClient(accessToken);
    const events: ProviderEvent[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken,
      });

      const items = response.data.items ?? [];

      for (const event of items) {
        // Skip cancelled events
        if (event.status === 'cancelled') continue;

        // Determine start/end times (dateTime for timed, date for all-day)
        const startStr = event.start?.dateTime ?? event.start?.date;
        const endStr = event.end?.dateTime ?? event.end?.date;

        if (!startStr || !endStr) continue;

        const startTime = new Date(startStr);
        const endTime = new Date(endStr);

        // Determine busy status from transparency
        // Google uses 'transparent' for free, 'opaque' (default) for busy
        const isBusy = event.transparency !== 'transparent';

        events.push({
          externalEventId: event.id ?? `${calendarId}_${startStr}`,
          startTime,
          endTime,
          isBusy,
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  }
}
