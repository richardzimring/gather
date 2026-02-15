import { createRoute, z } from '@hono/zod-openapi';
import { createApp, handle, authMiddleware } from '../src/middleware/hono';
import {
  BusyTimesQuerySchema,
  BusyTimeIntervalSchema,
  ErrorResponseSchema,
} from '../src/types';
import * as busyTimeService from '../src/services/busy-times';

const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const BusyTimesResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      busyTimes: z.record(z.string().uuid(), z.array(BusyTimeIntervalSchema)),
    }),
  })
  .openapi('BusyTimesResponse');

// ============================================
// Route Definitions
// ============================================

const postBusyTimesRoute = createRoute({
  method: 'post',
  path: '/busy-times',
  tags: ['BusyTimes'],
  summary: 'Query busy times for users',
  description:
    'Get busy time intervals for specified users within a date range. Returns a map of userId to sorted, merged busy intervals from all sources (blocked windows, calendar events, and in-app events).',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: BusyTimesQuerySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: BusyTimesResponseSchema,
        },
      },
      description: 'Busy times retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error or invalid user IDs',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

// ============================================
// Route Handler
// ============================================

app.openapi(postBusyTimesRoute, async (c) => {
  const user = c.get('user');
  const { userIds, startDate, endDate } = c.req.valid('json');

  // Validate dates
  if (endDate <= startDate) {
    return c.json(
      {
        success: false as const,
        error: 'Validation Error',
        message: 'endDate must be after startDate',
      },
      400,
    );
  }

  try {
    // Validate that all userIds are the current user or accepted friends
    await busyTimeService.validateUserIds(user.userId, userIds);

    const busyTimes = await busyTimeService.getBusyTimesForUsers(
      userIds,
      new Date(startDate),
      new Date(endDate),
    );

    return c.json(
      {
        success: true as const,
        data: { busyTimes },
      },
      200,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Invalid user IDs')
    ) {
      return c.json(
        {
          success: false as const,
          error: 'Validation Error',
          message: error.message,
        },
        400,
      );
    }

    console.error('Error in POST /busy-times:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to query busy times',
      },
      500,
    );
  }
});

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
