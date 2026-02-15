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
} from '../src/services/calendars';

export const app = createApp();

// Apply auth middleware to all routes
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

export const handler = handle(app);
