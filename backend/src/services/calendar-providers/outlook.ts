import { Client } from '@microsoft/microsoft-graph-client';
import type {
  Calendar,
  CalendarColor,
  Event,
  FreeBusyStatus,
} from '@microsoft/microsoft-graph-types';
import { z } from 'zod';

import {
  OUTLOOK_CLIENT_ID,
  OUTLOOK_CLIENT_SECRET,
  OUTLOOK_REDIRECT_URI,
} from '../../constants';
import type {
  CalendarProviderService,
  ExternalCalendar,
  OAuthTokens,
  ProviderEvent,
} from './index';
import { OAuthRevokedError } from './index';

// ============================================
// Outlook Calendar Provider
// ============================================

/** Outlook Calendar scopes */
const SCOPES = ['Calendars.Read', 'offline_access'];

/** Microsoft OAuth 2.0 endpoints */
const OAUTH_AUTHORIZE_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OAUTH_TOKEN_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * Color mapping from Outlook's CalendarColor enum to hex codes.
 * These colors match Microsoft's Outlook calendar color palette
 * and work well in both light and dark UI modes.
 */
const OUTLOOK_COLOR_MAP: Record<string, string> = {
  auto: '#808080', // Gray - default fallback
  lightBlue: '#5B9BD5', // Light Blue
  lightGreen: '#70AD47', // Light Green
  lightOrange: '#FFC000', // Light Orange
  lightGray: '#A6A6A6', // Light Gray
  lightYellow: '#FFD966', // Light Yellow
  lightTeal: '#4AACC5', // Light Teal
  lightPink: '#F06292', // Light Pink
  lightBrown: '#A67C52', // Light Brown
  lightRed: '#E74856', // Light Red
  maxColor: '#808080', // Gray - fallback
};

// ============================================
// Zod Schemas for API Responses
// ============================================

/**
 * Schema for Microsoft OAuth 2.0 token response.
 * Validates the response from token and refresh token endpoints.
 */
const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional().default(3600),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

/**
 * Schema for CalendarColor enum from Microsoft Graph types.
 * Allows the color value or null (NullableOption<CalendarColor>).
 */
const CalendarColorSchema = z
  .enum([
    'auto',
    'lightBlue',
    'lightGreen',
    'lightOrange',
    'lightGray',
    'lightYellow',
    'lightTeal',
    'lightPink',
    'lightBrown',
    'lightRed',
    'maxColor',
  ])
  .nullable()
  .optional() satisfies z.ZodType<CalendarColor | null | undefined>;

/**
 * Schema for FreeBusyStatus enum from Microsoft Graph types.
 */
const FreeBusyStatusSchema = z
  .enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'])
  .optional() satisfies z.ZodType<FreeBusyStatus | undefined>;

/**
 * Schema for Microsoft Graph Calendar object.
 * Aligns with the Calendar type from @microsoft/microsoft-graph-types.
 */
const GraphCalendarSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  color: CalendarColorSchema,
  isDefaultCalendar: z.boolean().optional(),
}) satisfies z.ZodType<Partial<Calendar>>;

/**
 * Schema for Microsoft Graph calendars list response.
 */
const GraphCalendarsResponseSchema = z.object({
  value: z.array(GraphCalendarSchema).optional().default([]),
  '@odata.nextLink': z.string().optional(),
});

/**
 * Schema for Microsoft Graph Event object.
 * Aligns with the Event type from @microsoft/microsoft-graph-types.
 */
const GraphEventSchema = z.object({
  id: z.string().optional(),
  start: z
    .object({
      dateTime: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  end: z
    .object({
      dateTime: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  showAs: FreeBusyStatusSchema,
  isCancelled: z.boolean().optional(),
}) satisfies z.ZodType<Partial<Event>>;

/**
 * Schema for Microsoft Graph events list response.
 */
const GraphEventsResponseSchema = z.object({
  value: z.array(GraphEventSchema).optional().default([]),
  '@odata.nextLink': z.string().optional(),
});

/**
 * Outlook Calendar provider implementation using Microsoft Graph SDK.
 * Handles OAuth 2.0 flow, calendar listing, and event fetching.
 */
export class OutlookCalendarProvider implements CalendarProviderService {
  /**
   * Create a Microsoft Graph client with the given access token.
   */
  private createGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Generate the Microsoft OAuth consent URL.
   * The `state` parameter encodes the userId so we can associate tokens
   * with the correct user when Microsoft redirects back.
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      response_type: 'code',
      redirect_uri: OUTLOOK_REDIRECT_URI,
      response_mode: 'query',
      scope: SCOPES.join(' '),
      state: userId,
    });

    return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      code,
      redirect_uri: OUTLOOK_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to exchange Outlook authorization code: ${error}`,
      );
    }

    const json = await response.json();
    const data = OAuthTokenResponseSchema.parse(json);

    if (!data.refresh_token) {
      throw new Error(
        'Outlook OAuth did not return required tokens. Ensure the consent prompt is shown.',
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Refresh an expired access token using the stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      if (errorBody?.error === 'invalid_grant') {
        throw new OAuthRevokedError('Outlook OAuth access has been revoked');
      }
      throw new Error(
        `Failed to refresh Outlook access token: ${JSON.stringify(errorBody)}`,
      );
    }

    const json = await response.json();
    const data = OAuthTokenResponseSchema.parse(json);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * List the user's Outlook calendars.
   */
  async fetchCalendars(accessToken: string): Promise<ExternalCalendar[]> {
    const client = this.createGraphClient(accessToken);

    const response = await client
      .api('/me/calendars')
      .select(['id', 'name', 'color', 'isDefaultCalendar'])
      .get();

    const validated = GraphCalendarsResponseSchema.parse(response);
    const calendars = validated.value;

    return calendars.map((cal) => ({
      externalCalendarId: cal.id ?? '',
      calendarName: cal.name ?? 'Untitled Calendar',
      color: cal.color
        ? (OUTLOOK_COLOR_MAP[cal.color] ?? OUTLOOK_COLOR_MAP.auto)
        : undefined,
      isPrimary: cal.isDefaultCalendar ?? false,
    }));
  }

  /**
   * Fetch events from a specific Outlook calendar within a time range.
   * Uses `calendarView` to expand recurring events into individual instances.
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<ProviderEvent[]> {
    const client = this.createGraphClient(accessToken);
    const events: ProviderEvent[] = [];

    // Use calendarView to expand recurring events
    let nextLink: string | undefined;
    const url = `/me/calendars/${calendarId}/calendarView`;

    do {
      const response = nextLink
        ? await client.api(nextLink).get()
        : await client
            .api(url)
            .query({
              startDateTime: timeMin.toISOString(),
              endDateTime: timeMax.toISOString(),
            })
            .select(['id', 'start', 'end', 'showAs', 'isCancelled'])
            .top(250)
            .get();

      const validated = GraphEventsResponseSchema.parse(response);
      const items = validated.value;

      for (const event of items) {
        // Skip cancelled events
        if (event.isCancelled) continue;

        // Get start and end times
        const startStr = event.start?.dateTime;
        const endStr = event.end?.dateTime;

        if (!startStr || !endStr) continue;

        const startTime = new Date(startStr);
        const endTime = new Date(endStr);

        // Determine busy status from showAs field
        // 'free' and 'tentative' are not busy, everything else is busy
        const isBusy = event.showAs !== 'free' && event.showAs !== 'tentative';

        events.push({
          externalEventId: event.id ?? `${calendarId}_${startStr}`,
          startTime,
          endTime,
          isBusy,
        });
      }

      nextLink = validated['@odata.nextLink'];
    } while (nextLink);

    return events;
  }
}
