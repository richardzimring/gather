import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  CalendarConnectionSchema,
  CalendarExportStatusSchema,
  DisableCalendarExportSchema,
  EnableCalendarExportSchema,
  SyncCalendarsSchema,
  GoogleCalendarSchema,
  GoogleSelectCalendarsSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import {
  getCalendarConnections,
  deleteProviderConnections,
  syncCalendarsForUser,
  handleProviderOAuthCallback,
  syncServerProviderConnections,
  getValidProviderAccessToken,
  selectProviderCalendars,
} from '../services/calendars';
import { getCalendarProvider } from '../services/calendar-providers';
import {
  getExportStatus,
  enableExportForProvider,
  disableExportForProvider,
  fullExportSync,
} from '../services/calendar-export';
import { STAGE } from '../constants';

export const app = createApp();

// ============================================
// OAuth Callbacks (no auth — Google/Microsoft redirect here)
// Must be registered BEFORE the auth middleware.
// ============================================

const APP_SCHEME = STAGE === 'prod' ? 'gather' : 'gather-dev';

for (const provider of ['google', 'outlook'] as const) {
  const callbackUrl = `${APP_SCHEME}://calendars/${provider}/callback`;

  app.get(`/calendars/${provider}/callback`, async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state'); // userId encoded during auth URL generation
    const error = c.req.query('error');

    if (error || !code || !state) {
      const reason = error ?? 'missing_code_or_state';
      console.error(`${provider} OAuth callback error:`, reason);
      return c.redirect(`${callbackUrl}?error=${encodeURIComponent(reason)}`);
    }

    try {
      await handleProviderOAuthCallback(state, provider, code);
      return c.redirect(`${callbackUrl}?success=true`);
    } catch (err) {
      console.error(`Error in GET /calendars/${provider}/callback:`, err);
      return c.redirect(
        `${callbackUrl}?error=${encodeURIComponent('oauth_exchange_failed')}`,
      );
    }
  });
}

// Apply auth middleware to all /calendars/* routes except the public OAuth callbacks.
// Using a scoped path means registration order no longer determines whether a route
// is public or protected — the callback exclusions are explicit.
app.use('/calendars/*', async (c, next) => {
  const path = c.req.path;
  if (
    path === '/calendars/google/callback' ||
    path === '/calendars/outlook/callback'
  ) {
    return next();
  }
  return authMiddleware(c, next);
});

// ============================================
// Response Schemas
// ============================================

const CalendarListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      connections: z.array(CalendarConnectionSchema),
    }),
  })
  .openapi('CalendarListResponse');

const DeleteCalendarResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
  })
  .openapi('DeleteCalendarResponse');

const SyncCalendarsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      connections: z.array(CalendarConnectionSchema),
    }),
    message: z.string().optional(),
  })
  .openapi('SyncCalendarsResponse');

// ============================================
// Route Definitions
// ============================================

// GET /calendars - List user's calendar connections
const listCalendarsRoute = createRoute({
  method: 'get',
  path: '/calendars',
  tags: ['Calendars'],
  summary: 'List calendar connections',
  description: 'Get all calendar connections for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(
      CalendarListResponseSchema,
      'List of calendar connections',
    ),
    ...errorResponses(401, 500),
  },
});

// POST /calendars/sync - Bulk sync device calendars
const syncCalendarsRoute = createRoute({
  method: 'post',
  path: '/calendars/sync',
  tags: ['Calendars'],
  summary: 'Sync device calendars',
  description:
    'Bulk sync calendars and their events from the device. Upserts calendar connections, syncs cached events, and removes deselected calendars.',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(SyncCalendarsSchema),
  },
  responses: {
    200: jsonContent(
      SyncCalendarsResponseSchema,
      'Calendars synced successfully',
    ),
    ...errorResponses(401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(listCalendarsRoute, async (c) => {
  const user = c.get('user');

  const connections = await getCalendarConnections(user.userId);
  return c.json({ success: true as const, data: { connections } }, 200);
});

app.openapi(syncCalendarsRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  const connections = await syncCalendarsForUser(user.userId, body);
  return c.json(
    {
      success: true as const,
      data: { connections },
      message: 'Calendars synced successfully',
    },
    200,
  );
});

// ============================================
// Provider Calendar Disconnect
// ============================================

for (const provider of ['apple', 'google', 'outlook'] as const) {
  const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
  const route = createRoute({
    method: 'delete',
    path: `/calendars/${provider}`,
    tags: ['Calendars'],
    summary: `Disconnect ${displayName} Calendar`,
    description: `Remove all ${displayName} Calendar connections for the current user`,
    security: [{ BearerAuth: [] }],
    responses: {
      200: jsonContent(
        DeleteCalendarResponseSchema,
        `${displayName} Calendar disconnected`,
      ),
      ...errorResponses(401, 500),
    },
  });

  app.openapi(route, async (c) => {
    const user = c.get('user');
    // Delete the "Gather" export calendar and all exported events BEFORE
    // removing connections — we still need the provider tokens to authenticate
    // the calendar deletion with Google/Outlook.
    if (provider !== 'apple') {
      await disableExportForProvider(user.userId, provider, true);
    }
    await deleteProviderConnections(user.userId, provider);
    return c.json(
      {
        success: true as const,
        message: `${displayName} Calendar disconnected`,
      },
      200,
    );
  });
}

// ============================================
// Google Calendar OAuth + Sync Response Schemas
// ============================================

const GoogleAuthUrlResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      authUrl: z.string(),
    }),
  })
  .openapi('GoogleAuthUrlResponse');

const GoogleCalendarListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      calendars: z.array(GoogleCalendarSchema),
    }),
  })
  .openapi('GoogleCalendarListResponse');

// ============================================
// Google Calendar Route Definitions
// ============================================

// GET /calendars/google/auth-url
const googleAuthUrlRoute = createRoute({
  method: 'get',
  path: '/calendars/google/auth-url',
  tags: ['Calendars', 'Google'],
  summary: 'Get Google OAuth URL',
  description:
    'Get the Google OAuth consent URL for the current user to authorize calendar access',
  security: [{ BearerAuth: [] }],
  request: {
    query: z.object({
      includeExportScope: z.coerce.boolean().optional().openapi({
        description: 'Request export (write) scope in addition to read scopes',
      }),
    }),
  },
  responses: {
    200: jsonContent(GoogleAuthUrlResponseSchema, 'OAuth URL generated'),
    ...errorResponses(401, 500),
  },
});

// GET /calendars/google/calendars
const googleCalendarsRoute = createRoute({
  method: 'get',
  path: '/calendars/google/calendars',
  tags: ['Calendars', 'Google'],
  summary: 'List Google calendars',
  description:
    "List the user's Google calendars (fetched live from Google API). Requires an existing Google connection.",
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(
      GoogleCalendarListResponseSchema,
      'List of Google calendars',
    ),
    ...errorResponses(401, 403, 404, 500),
  },
});

// POST /calendars/google/select
const googleSelectRoute = createRoute({
  method: 'post',
  path: '/calendars/google/select',
  tags: ['Calendars', 'Google'],
  summary: 'Select Google calendars to import',
  description:
    'Choose which Google calendars to import for availability tracking',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(GoogleSelectCalendarsSchema),
  },
  responses: {
    200: jsonContent(CalendarListResponseSchema, 'Calendar selection updated'),
    ...errorResponses(401, 500),
  },
});

// POST /calendars/google/sync
const googleSyncRoute = createRoute({
  method: 'post',
  path: '/calendars/google/sync',
  tags: ['Calendars', 'Google'],
  summary: 'Sync Google calendars',
  description:
    'Trigger a server-side re-sync of all connected Google calendars for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(SyncCalendarsResponseSchema, 'Google calendars synced'),
    ...errorResponses(401, 500),
  },
});

// ============================================
// Google Calendar Route Handlers
// ============================================

app.openapi(googleAuthUrlRoute, async (c) => {
  const user = c.get('user');

  const { includeExportScope } = c.req.valid('query');
  const provider = getCalendarProvider('google');
  const authUrl = provider.getAuthUrl(
    user.userId,
    includeExportScope ? { includeExportScope: true } : undefined,
  );
  return c.json({ success: true as const, data: { authUrl } }, 200);
});

app.openapi(googleCalendarsRoute, async (c) => {
  const user = c.get('user');

  const accessToken = await getValidProviderAccessToken(user.userId, 'google');

  if (!accessToken) {
    return c.json(
      {
        success: false as const,
        error: 'Not Found',
        message:
          'No Google Calendar connection found. Please connect Google Calendar first.',
      },
      404,
    );
  }

  const provider = getCalendarProvider('google');
  const calendars = await provider.fetchCalendars(accessToken);

  return c.json(
    {
      success: true as const,
      data: { calendars },
    },
    200,
  );
});

app.openapi(googleSelectRoute, async (c) => {
  const user = c.get('user');
  const { calendarIds } = c.req.valid('json');

  const connections = await selectProviderCalendars(
    user.userId,
    'google',
    calendarIds,
  );
  return c.json(
    {
      success: true as const,
      data: { connections },
    },
    200,
  );
});

app.openapi(googleSyncRoute, async (c) => {
  const user = c.get('user');

  const connections = await syncServerProviderConnections(
    user.userId,
    'google',
  );
  return c.json(
    {
      success: true as const,
      data: { connections },
      message: 'Google calendars synced successfully',
    },
    200,
  );
});

// ============================================
// Outlook Calendar Route Definitions
// ============================================

// GET /calendars/outlook/auth-url
const outlookAuthUrlRoute = createRoute({
  method: 'get',
  path: '/calendars/outlook/auth-url',
  tags: ['Calendars', 'Outlook'],
  summary: 'Get Outlook OAuth URL',
  description:
    'Get the Outlook OAuth consent URL for the current user to authorize calendar access',
  security: [{ BearerAuth: [] }],
  request: {
    query: z.object({
      includeExportScope: z.coerce.boolean().optional().openapi({
        description: 'Request export (write) scope in addition to read scopes',
      }),
    }),
  },
  responses: {
    200: jsonContent(GoogleAuthUrlResponseSchema, 'OAuth URL generated'),
    ...errorResponses(401, 500),
  },
});

// GET /calendars/outlook/calendars
const outlookCalendarsRoute = createRoute({
  method: 'get',
  path: '/calendars/outlook/calendars',
  tags: ['Calendars', 'Outlook'],
  summary: 'List Outlook calendars',
  description:
    "List the user's Outlook calendars (fetched live from Microsoft Graph API). Requires an existing Outlook connection.",
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(
      GoogleCalendarListResponseSchema,
      'List of Outlook calendars',
    ),
    ...errorResponses(401, 403, 404, 500),
  },
});

// POST /calendars/outlook/select
const outlookSelectRoute = createRoute({
  method: 'post',
  path: '/calendars/outlook/select',
  tags: ['Calendars', 'Outlook'],
  summary: 'Select Outlook calendars to import',
  description:
    'Choose which Outlook calendars to import for availability tracking',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(GoogleSelectCalendarsSchema),
  },
  responses: {
    200: jsonContent(CalendarListResponseSchema, 'Calendar selection updated'),
    ...errorResponses(401, 500),
  },
});

// POST /calendars/outlook/sync
const outlookSyncRoute = createRoute({
  method: 'post',
  path: '/calendars/outlook/sync',
  tags: ['Calendars', 'Outlook'],
  summary: 'Sync Outlook calendars',
  description:
    'Trigger a server-side re-sync of all connected Outlook calendars for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(SyncCalendarsResponseSchema, 'Outlook calendars synced'),
    ...errorResponses(401, 500),
  },
});

// ============================================
// Outlook Calendar Route Handlers
// ============================================

app.openapi(outlookAuthUrlRoute, async (c) => {
  const user = c.get('user');

  const { includeExportScope } = c.req.valid('query');
  const provider = getCalendarProvider('outlook');
  const authUrl = provider.getAuthUrl(
    user.userId,
    includeExportScope ? { includeExportScope: true } : undefined,
  );
  return c.json({ success: true as const, data: { authUrl } }, 200);
});

app.openapi(outlookCalendarsRoute, async (c) => {
  const user = c.get('user');

  const accessToken = await getValidProviderAccessToken(user.userId, 'outlook');

  if (!accessToken) {
    return c.json(
      {
        success: false as const,
        error: 'Not Found',
        message:
          'No Outlook Calendar connection found. Please connect Outlook Calendar first.',
      },
      404,
    );
  }

  const provider = getCalendarProvider('outlook');
  const calendars = await provider.fetchCalendars(accessToken);

  return c.json(
    {
      success: true as const,
      data: { calendars },
    },
    200,
  );
});

app.openapi(outlookSelectRoute, async (c) => {
  const user = c.get('user');
  const { calendarIds } = c.req.valid('json');

  const connections = await selectProviderCalendars(
    user.userId,
    'outlook',
    calendarIds,
  );
  return c.json(
    {
      success: true as const,
      data: { connections },
    },
    200,
  );
});

app.openapi(outlookSyncRoute, async (c) => {
  const user = c.get('user');

  const connections = await syncServerProviderConnections(
    user.userId,
    'outlook',
  );
  return c.json(
    {
      success: true as const,
      data: { connections },
      message: 'Outlook calendars synced successfully',
    },
    200,
  );
});

// ============================================
// Calendar Export Response Schemas
// ============================================

const ExportStatusListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      statuses: z.array(CalendarExportStatusSchema),
    }),
  })
  .openapi('ExportStatusListResponse');

const ExportStatusResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      status: CalendarExportStatusSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('ExportStatusResponse');

const ExportAuthUrlResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      authUrl: z.string(),
    }),
  })
  .openapi('ExportAuthUrlResponse');

const ExportSyncResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
  })
  .openapi('ExportSyncResponse');

// ============================================
// Calendar Export Route Definitions
// ============================================

// GET /calendars/export/status
const exportStatusRoute = createRoute({
  method: 'get',
  path: '/calendars/export/status',
  tags: ['Calendars', 'CalendarExport'],
  summary: 'Get calendar export status',
  description:
    'Get the export sync status for each calendar provider (google, outlook, apple)',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(
      ExportStatusListResponseSchema,
      'Export status per provider',
    ),
    ...errorResponses(401, 500),
  },
});

// POST /calendars/export/enable
const enableExportRoute = createRoute({
  method: 'post',
  path: '/calendars/export/enable',
  tags: ['Calendars', 'CalendarExport'],
  summary: 'Enable calendar export',
  description:
    'Enable syncing Gather events to the user\'s calendar. Creates a "Gather" secondary calendar if needed.',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(EnableCalendarExportSchema),
  },
  responses: {
    200: jsonContent(ExportStatusResponseSchema, 'Export enabled'),
    ...errorResponses(400, 401, 500),
  },
});

// POST /calendars/export/disable
const disableExportRoute = createRoute({
  method: 'post',
  path: '/calendars/export/disable',
  tags: ['Calendars', 'CalendarExport'],
  summary: 'Disable calendar export',
  description: "Disable syncing Gather events to the user's calendar.",
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(DisableCalendarExportSchema),
  },
  responses: {
    200: jsonContent(ExportSyncResponseSchema, 'Export disabled'),
    ...errorResponses(401, 500),
  },
});

// POST /calendars/export/sync
const exportSyncRoute = createRoute({
  method: 'post',
  path: '/calendars/export/sync',
  tags: ['Calendars', 'CalendarExport'],
  summary: 'Trigger full export sync',
  description:
    "Re-sync all active Gather events to the user's export calendars.",
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(ExportSyncResponseSchema, 'Export sync triggered'),
    ...errorResponses(401, 500),
  },
});

// GET /calendars/google/export-auth-url
const googleExportAuthUrlRoute = createRoute({
  method: 'get',
  path: '/calendars/google/export-auth-url',
  tags: ['Calendars', 'Google', 'CalendarExport'],
  summary: 'Get Google OAuth URL with export scope',
  description:
    'Get the Google OAuth consent URL including the calendar.app.created write scope for enabling event export',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(ExportAuthUrlResponseSchema, 'OAuth URL generated'),
    ...errorResponses(401, 500),
  },
});

// GET /calendars/outlook/export-auth-url
const outlookExportAuthUrlRoute = createRoute({
  method: 'get',
  path: '/calendars/outlook/export-auth-url',
  tags: ['Calendars', 'Outlook', 'CalendarExport'],
  summary: 'Get Outlook OAuth URL with export scope',
  description:
    'Get the Outlook OAuth consent URL with Calendars.ReadWrite scope for enabling event export',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(ExportAuthUrlResponseSchema, 'OAuth URL generated'),
    ...errorResponses(401, 500),
  },
});

// ============================================
// Calendar Export Route Handlers
// ============================================

app.openapi(exportStatusRoute, async (c) => {
  const user = c.get('user');
  const statuses = await getExportStatus(user.userId);
  return c.json({ success: true as const, data: { statuses } }, 200);
});

app.openapi(enableExportRoute, async (c) => {
  const user = c.get('user');
  const { provider } = c.req.valid('json');

  if (provider === 'apple') {
    return c.json(
      {
        success: false as const,
        error: 'Bad Request',
        message:
          'Apple export is managed on device. Use the apple export toggle in the app.',
      },
      400,
    );
  }

  try {
    const status = await enableExportForProvider(
      user.userId,
      provider,
      user.timezone ?? 'UTC',
    );
    return c.json(
      {
        success: true as const,
        data: { status },
        message: 'Calendar export enabled',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /calendars/export/enable:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to enable export';
    return c.json(
      { success: false as const, error: 'Bad Request', message },
      400,
    );
  }
});

app.openapi(disableExportRoute, async (c) => {
  const user = c.get('user');
  const { provider, deleteCalendar } = c.req.valid('json');

  // Apple export is managed device-side; no server-side action needed
  if (provider === 'apple') {
    return c.json(
      { success: true as const, message: 'Apple export is managed on device' },
      200,
    );
  }

  await disableExportForProvider(user.userId, provider, deleteCalendar);
  return c.json(
    { success: true as const, message: 'Calendar export disabled' },
    200,
  );
});

app.openapi(exportSyncRoute, async (c) => {
  const user = c.get('user');
  await fullExportSync(user.userId);
  return c.json(
    { success: true as const, message: 'Export sync triggered' },
    200,
  );
});

app.openapi(googleExportAuthUrlRoute, async (c) => {
  const user = c.get('user');
  const provider = getCalendarProvider('google');
  const authUrl = provider.getAuthUrl(user.userId, {
    includeExportScope: true,
  });
  return c.json({ success: true as const, data: { authUrl } }, 200);
});

app.openapi(outlookExportAuthUrlRoute, async (c) => {
  const user = c.get('user');
  const provider = getCalendarProvider('outlook');
  const authUrl = provider.getAuthUrl(user.userId, {
    includeExportScope: true,
  });
  return c.json({ success: true as const, data: { authUrl } }, 200);
});
