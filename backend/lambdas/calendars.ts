import { createRoute, z } from '@hono/zod-openapi';
import { handle } from 'hono/aws-lambda';
import {
  createApp,
  authMiddleware,
} from '../src/middleware/hono';
import {
  CalendarConnectionSchema,
  CreateCalendarConnectionSchema,
  UpdateCalendarConnectionSchema,
  BusySlotSchema,
  SyncCalendarsSchema,
  GoogleCalendarSchema,
  GoogleSelectCalendarsSchema,
  ErrorResponseSchema,
} from '../src/types';
import {
  getCalendarConnections,
  getCalendarConnection,
  createCalendarConnection,
  updateCalendarConnection,
  deleteCalendarConnection,
  getBusySlotsForUser,
  syncCalendarsForUser,
  handleProviderOAuthCallback,
  syncServerProviderConnections,
  getValidProviderAccessToken,
  selectProviderCalendars,
} from '../src/services/calendars';
import { getCalendarProvider } from '../src/services/calendar-providers';

export const app = createApp();

// ============================================
// Google OAuth Callback (no auth — Google redirects here)
// Must be registered BEFORE the auth middleware.
// ============================================

const APP_SCHEME_CALLBACK = 'gather://calendars/google/callback';

app.get('/calendars/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state'); // userId encoded during auth URL generation
  const error = c.req.query('error');

  if (error || !code || !state) {
    const reason = error ?? 'missing_code_or_state';
    console.error('Google OAuth callback error:', reason);
    return c.redirect(
      `${APP_SCHEME_CALLBACK}?error=${encodeURIComponent(reason)}`,
    );
  }

  try {
    await handleProviderOAuthCallback(state, 'google', code);
    return c.redirect(`${APP_SCHEME_CALLBACK}?success=true`);
  } catch (err) {
    console.error('Error in GET /calendars/google/callback:', err);
    return c.redirect(
      `${APP_SCHEME_CALLBACK}?error=${encodeURIComponent('oauth_exchange_failed')}`,
    );
  }
});

// ============================================
// Outlook OAuth Callback (no auth — Microsoft redirects here)
// Must be registered BEFORE the auth middleware.
// ============================================

const OUTLOOK_APP_SCHEME_CALLBACK = 'gather://calendars/outlook/callback';

app.get('/calendars/outlook/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state'); // userId encoded during auth URL generation
  const error = c.req.query('error');

  if (error || !code || !state) {
    const reason = error ?? 'missing_code_or_state';
    console.error('Outlook OAuth callback error:', reason);
    return c.redirect(
      `${OUTLOOK_APP_SCHEME_CALLBACK}?error=${encodeURIComponent(reason)}`,
    );
  }

  try {
    await handleProviderOAuthCallback(state, 'outlook', code);
    return c.redirect(`${OUTLOOK_APP_SCHEME_CALLBACK}?success=true`);
  } catch (err) {
    console.error('Error in GET /calendars/outlook/callback:', err);
    return c.redirect(
      `${OUTLOOK_APP_SCHEME_CALLBACK}?error=${encodeURIComponent('oauth_exchange_failed')}`,
    );
  }
});

// Apply auth middleware to all remaining routes
app.use('*', authMiddleware);

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

const SingleCalendarResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      connection: CalendarConnectionSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('SingleCalendarResponse');

const BusySlotsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      busySlots: z.array(BusySlotSchema),
    }),
  })
  .openapi('BusySlotsResponse');

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
    200: {
      description: 'List of calendar connections',
      content: {
        'application/json': {
          schema: CalendarListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /calendars - Create a calendar connection
const createCalendarRoute = createRoute({
  method: 'post',
  path: '/calendars',
  tags: ['Calendars'],
  summary: 'Create calendar connection',
  description: 'Create a new calendar connection',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCalendarConnectionSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Calendar connection created',
      content: {
        'application/json': {
          schema: SingleCalendarResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /calendars/busy-slots - Get busy slots for the current user
const getBusySlotsRoute = createRoute({
  method: 'get',
  path: '/calendars/busy-slots',
  tags: ['Calendars'],
  summary: 'Get busy slots',
  description: 'Get busy time slots from connected calendars',
  security: [{ BearerAuth: [] }],
  request: {
    query: z.object({
      startDate: z.string().datetime().optional().openapi({ example: '2024-01-15T00:00:00.000Z' }),
      endDate: z.string().datetime().optional().openapi({ example: '2024-02-15T00:00:00.000Z' }),
    }),
  },
  responses: {
    200: {
      description: 'List of busy slots',
      content: {
        'application/json': {
          schema: BusySlotsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /calendars/sync - Bulk sync device calendars
const syncCalendarsRoute = createRoute({
  method: 'post',
  path: '/calendars/sync',
  tags: ['Calendars'],
  summary: 'Sync device calendars',
  description: 'Bulk sync calendars and their events from the device. Upserts calendar connections, syncs cached events, and removes deselected calendars.',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SyncCalendarsSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Calendars synced successfully',
      content: {
        'application/json': {
          schema: SyncCalendarsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /calendars/:id - Get a specific calendar connection
const getCalendarRoute = createRoute({
  method: 'get',
  path: '/calendars/{connectionId}',
  tags: ['Calendars'],
  summary: 'Get calendar connection',
  description: 'Get a specific calendar connection by ID',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      connectionId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      description: 'Calendar connection details',
      content: {
        'application/json': {
          schema: SingleCalendarResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /calendars/:id - Update a calendar connection
const updateCalendarRoute = createRoute({
  method: 'patch',
  path: '/calendars/{connectionId}',
  tags: ['Calendars'],
  summary: 'Update calendar connection',
  description: 'Update a calendar connection settings',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      connectionId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateCalendarConnectionSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Calendar connection updated',
      content: {
        'application/json': {
          schema: SingleCalendarResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /calendars/:id - Delete a calendar connection
const deleteCalendarRoute = createRoute({
  method: 'delete',
  path: '/calendars/{connectionId}',
  tags: ['Calendars'],
  summary: 'Delete calendar connection',
  description: 'Delete a calendar connection',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      connectionId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      description: 'Calendar connection deleted',
      content: {
        'application/json': {
          schema: DeleteCalendarResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(listCalendarsRoute, async (c) => {
  const user = c.get('user');
  
  try {
    const connections = await getCalendarConnections(user.userId);
    return c.json(
      { success: true as const, data: { connections } },
      200
    );
  } catch (error) {
    console.error('Error in GET /calendars:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to fetch calendar connections' },
      500
    );
  }
});

app.openapi(createCalendarRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  
  try {
    const connection = await createCalendarConnection(user.userId, body);
    return c.json(
      { success: true as const, data: { connection } },
      201
    );
  } catch (error) {
    console.error('Error in POST /calendars:', error);
    return c.json(
      { success: false as const, error: 'Failed to create calendar connection', message: String(error) },
      500
    );
  }
});

app.openapi(getBusySlotsRoute, async (c) => {
  const user = c.get('user');
  const { startDate, endDate } = c.req.valid('query');
  
  try {
    // Default to next 30 days if not specified
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const busySlots = await getBusySlotsForUser(user.userId, start, end);
    return c.json(
      { success: true as const, data: { busySlots } },
      200
    );
  } catch (error) {
    console.error('Error in GET /calendars/busy-slots:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to fetch busy slots' },
      500
    );
  }
});

app.openapi(syncCalendarsRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const connections = await syncCalendarsForUser(user.userId, body);
    return c.json(
      { success: true as const, data: { connections }, message: 'Calendars synced successfully' },
      200
    );
  } catch (error) {
    console.error('Error in POST /calendars/sync:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to sync calendars' },
      500
    );
  }
});

app.openapi(getCalendarRoute, async (c) => {
  const user = c.get('user');
  const { connectionId } = c.req.valid('param');
  
  try {
    const connection = await getCalendarConnection(connectionId, user.userId);
    if (!connection) {
      return c.json(
        { success: false as const, error: 'Not Found', message: 'Calendar connection not found' },
        404
      );
    }
    
    return c.json(
      { success: true as const, data: { connection } },
      200
    );
  } catch (error) {
    console.error('Error in GET /calendars/:id:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to fetch calendar connection' },
      500
    );
  }
});

app.openapi(updateCalendarRoute, async (c) => {
  const user = c.get('user');
  const { connectionId } = c.req.valid('param');
  const body = c.req.valid('json');
  
  try {
    const result = await updateCalendarConnection(connectionId, user.userId, body);
    if (!result.success || !result.connection) {
      return c.json(
        { success: false as const, error: 'Not Found', message: result.message ?? 'Calendar connection not found' },
        404
      );
    }
    
    return c.json(
      { success: true as const, data: { connection: result.connection } },
      200
    );
  } catch (error) {
    console.error('Error in PATCH /calendars/:id:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to update calendar connection' },
      500
    );
  }
});

app.openapi(deleteCalendarRoute, async (c) => {
  const user = c.get('user');
  const { connectionId } = c.req.valid('param');
  
  try {
    const result = await deleteCalendarConnection(connectionId, user.userId);
    if (!result.success) {
      return c.json(
        { success: false as const, error: 'Not Found', message: result.message ?? 'Calendar connection not found' },
        404
      );
    }
    
    return c.json(
      { success: true as const, message: 'Calendar connection deleted' },
      200
    );
  } catch (error) {
    console.error('Error in DELETE /calendars/:id:', error);
    return c.json(
      { success: false as const, error: 'Internal Server Error', message: 'Failed to delete calendar connection' },
      500
    );
  }
});

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
  description: 'Get the Google OAuth consent URL for the current user to authorize calendar access',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'OAuth URL generated',
      content: {
        'application/json': {
          schema: GoogleAuthUrlResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
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
    200: {
      description: 'List of Google calendars',
      content: {
        'application/json': {
          schema: GoogleCalendarListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'No Google connection found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /calendars/google/select
const googleSelectRoute = createRoute({
  method: 'post',
  path: '/calendars/google/select',
  tags: ['Calendars', 'Google'],
  summary: 'Select Google calendars to import',
  description: 'Choose which Google calendars to import for availability tracking',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GoogleSelectCalendarsSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Calendar selection updated',
      content: {
        'application/json': {
          schema: CalendarListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /calendars/google/sync
const googleSyncRoute = createRoute({
  method: 'post',
  path: '/calendars/google/sync',
  tags: ['Calendars', 'Google'],
  summary: 'Sync Google calendars',
  description: 'Trigger a server-side re-sync of all connected Google calendars for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'Google calendars synced',
      content: {
        'application/json': {
          schema: SyncCalendarsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================
// Google Calendar Route Handlers
// ============================================

app.openapi(googleAuthUrlRoute, async (c) => {
  const user = c.get('user');

  try {
    const provider = getCalendarProvider('google');
    const authUrl = provider.getAuthUrl(user.userId);
    return c.json({ success: true as const, data: { authUrl } }, 200);
  } catch (error) {
    console.error('Error in GET /calendars/google/auth-url:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to generate Google auth URL',
      },
      500,
    );
  }
});

app.openapi(googleCalendarsRoute, async (c) => {
  const user = c.get('user');

  try {
    const accessToken = await getValidProviderAccessToken(user.userId, 'google');

    if (!accessToken) {
      return c.json(
        {
          success: false as const,
          error: 'Not Found',
          message: 'No Google Calendar connection found. Please connect Google Calendar first.',
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
  } catch (error) {
    console.error('Error in GET /calendars/google/calendars:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch Google calendars',
      },
      500,
    );
  }
});

app.openapi(googleSelectRoute, async (c) => {
  const user = c.get('user');
  const { calendarIds } = c.req.valid('json');

  try {
    const connections = await selectProviderCalendars(user.userId, 'google', calendarIds);
    return c.json(
      {
        success: true as const,
        data: { connections },
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /calendars/google/select:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update Google calendar selection',
      },
      500,
    );
  }
});

app.openapi(googleSyncRoute, async (c) => {
  const user = c.get('user');

  try {
    const connections = await syncServerProviderConnections(user.userId, 'google');
    return c.json(
      {
        success: true as const,
        data: { connections },
        message: 'Google calendars synced successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /calendars/google/sync:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to sync Google calendars',
      },
      500,
    );
  }
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
  description: 'Get the Outlook OAuth consent URL for the current user to authorize calendar access',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'OAuth URL generated',
      content: {
        'application/json': {
          schema: GoogleAuthUrlResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
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
    200: {
      description: 'List of Outlook calendars',
      content: {
        'application/json': {
          schema: GoogleCalendarListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'No Outlook connection found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /calendars/outlook/select
const outlookSelectRoute = createRoute({
  method: 'post',
  path: '/calendars/outlook/select',
  tags: ['Calendars', 'Outlook'],
  summary: 'Select Outlook calendars to import',
  description: 'Choose which Outlook calendars to import for availability tracking',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GoogleSelectCalendarsSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Calendar selection updated',
      content: {
        'application/json': {
          schema: CalendarListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /calendars/outlook/sync
const outlookSyncRoute = createRoute({
  method: 'post',
  path: '/calendars/outlook/sync',
  tags: ['Calendars', 'Outlook'],
  summary: 'Sync Outlook calendars',
  description: 'Trigger a server-side re-sync of all connected Outlook calendars for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'Outlook calendars synced',
      content: {
        'application/json': {
          schema: SyncCalendarsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================
// Outlook Calendar Route Handlers
// ============================================

app.openapi(outlookAuthUrlRoute, async (c) => {
  const user = c.get('user');

  try {
    const provider = getCalendarProvider('outlook');
    const authUrl = provider.getAuthUrl(user.userId);
    return c.json({ success: true as const, data: { authUrl } }, 200);
  } catch (error) {
    console.error('Error in GET /calendars/outlook/auth-url:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to generate Outlook auth URL',
      },
      500,
    );
  }
});

app.openapi(outlookCalendarsRoute, async (c) => {
  const user = c.get('user');

  try {
    const accessToken = await getValidProviderAccessToken(user.userId, 'outlook');

    if (!accessToken) {
      return c.json(
        {
          success: false as const,
          error: 'Not Found',
          message: 'No Outlook Calendar connection found. Please connect Outlook Calendar first.',
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
  } catch (error) {
    console.error('Error in GET /calendars/outlook/calendars:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch Outlook calendars',
      },
      500,
    );
  }
});

app.openapi(outlookSelectRoute, async (c) => {
  const user = c.get('user');
  const { calendarIds } = c.req.valid('json');

  try {
    const connections = await selectProviderCalendars(user.userId, 'outlook', calendarIds);
    return c.json(
      {
        success: true as const,
        data: { connections },
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /calendars/outlook/select:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update Outlook calendar selection',
      },
      500,
    );
  }
});

app.openapi(outlookSyncRoute, async (c) => {
  const user = c.get('user');

  try {
    const connections = await syncServerProviderConnections(user.userId, 'outlook');
    return c.json(
      {
        success: true as const,
        data: { connections },
        message: 'Outlook calendars synced successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /calendars/outlook/sync:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to sync Outlook calendars',
      },
      500,
    );
  }
});

export const handler = handle(app);
