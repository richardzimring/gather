import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  BusyTimesQuerySchema,
  BusyTimeIntervalSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import * as busyTimeService from '../services/busy-times';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const BusyTimesResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      busyTimes: z.record(z.uuid(), z.array(BusyTimeIntervalSchema)),
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
    body: jsonBody(BusyTimesQuerySchema),
  },
  responses: {
    200: jsonContent(
      BusyTimesResponseSchema,
      'Busy times retrieved successfully',
    ),
    ...errorResponses(400, 401, 500),
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

    throw error;
  }
});
