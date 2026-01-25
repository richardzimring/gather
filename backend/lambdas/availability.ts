import { createRoute, z } from '@hono/zod-openapi';
import {
  createApp,
  handle,
  authMiddleware,
} from '../src/middleware/hono';
import {
  AvailabilityWindowSchema,
  CreateAvailabilitySchema,
  UpdateAvailabilitySchema,
  ErrorResponseSchema,
} from '../src/types';
import * as availabilityService from '../src/services/availability';

const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const AvailabilityWindowsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      windows: z.array(AvailabilityWindowSchema),
    }),
  })
  .openapi('AvailabilityWindowsResponse');

const AvailabilityWindowResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      window: AvailabilityWindowSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('AvailabilityWindowResponse');

const FriendAvailabilitySchema = z.object({
  userId: z.string().uuid(),
  windows: z.array(AvailabilityWindowSchema),
});

const FriendsAvailabilityResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      availability: z.array(FriendAvailabilitySchema),
    }),
  })
  .openapi('FriendsAvailabilityResponse');

// Query schema for friends availability
const FriendsAvailabilityQuerySchema = z.object({
  startDate: z.string().datetime().optional().openapi({ example: '2024-01-15T00:00:00.000Z' }),
  endDate: z.string().datetime().optional().openapi({ example: '2024-01-22T23:59:59.000Z' }),
});

// ============================================
// Route Definitions
// ============================================

const getAvailabilityRoute = createRoute({
  method: 'get',
  path: '/availability',
  tags: ['Availability'],
  summary: 'Get availability windows',
  description: 'Get availability windows for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AvailabilityWindowsResponseSchema,
        },
      },
      description: 'Availability windows retrieved successfully',
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

const createAvailabilityRoute = createRoute({
  method: 'post',
  path: '/availability',
  tags: ['Availability'],
  summary: 'Create availability window',
  description: 'Create a new availability window',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAvailabilitySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AvailabilityWindowResponseSchema,
        },
      },
      description: 'Availability window created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
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

const updateAvailabilityRoute = createRoute({
  method: 'patch',
  path: '/availability/{windowId}',
  tags: ['Availability'],
  summary: 'Update availability window',
  description: 'Update an existing availability window',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      windowId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateAvailabilitySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AvailabilityWindowResponseSchema,
        },
      },
      description: 'Availability window updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error or update failed',
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

const deleteAvailabilityRoute = createRoute({
  method: 'delete',
  path: '/availability/{windowId}',
  tags: ['Availability'],
  summary: 'Delete availability window',
  description: 'Delete an existing availability window',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      windowId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: {
      description: 'Availability window deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Delete failed',
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

const getFriendsAvailabilityRoute = createRoute({
  method: 'get',
  path: '/availability/friends',
  tags: ['Availability'],
  summary: 'Get friends availability',
  description: 'Get availability windows for friends',
  security: [{ BearerAuth: [] }],
  request: {
    query: FriendsAvailabilityQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FriendsAvailabilityResponseSchema,
        },
      },
      description: 'Friends availability retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
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
// Route Handlers
// ============================================

app.openapi(getAvailabilityRoute, async (c) => {
  const user = c.get('user');

  try {
    const windows = await availabilityService.getAvailabilityWindows(
      user.userId,
    );
    return c.json(
      {
        success: true as const,
        data: { windows },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /availability:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch availability',
      },
      500,
    );
  }
});

app.openapi(createAvailabilityRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  // Validate that end time is after start time
  if (data.endTime <= data.startTime) {
    return c.json(
      {
        success: false as const,
        error: 'Validation Error',
        message: 'End time must be after start time',
      },
      400,
    );
  }

  try {
    const window = await availabilityService.createAvailabilityWindow(
      user.userId,
      data,
    );
    return c.json(
      {
        success: true as const,
        data: { window },
        message: 'Availability window created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /availability:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create availability window',
      },
      500,
    );
  }
});

app.openapi(updateAvailabilityRoute, async (c) => {
  const user = c.get('user');
  const { windowId } = c.req.valid('param');
  const data = c.req.valid('json');

  // Validate times if both are provided
  if (data.startTime && data.endTime) {
    if (data.endTime <= data.startTime) {
      return c.json(
        {
          success: false as const,
          error: 'Validation Error',
          message: 'End time must be after start time',
        },
        400,
      );
    }
  }

  try {
    const result = await availabilityService.updateAvailabilityWindow(
      user.userId,
      windowId,
      data,
    );
    if (!result.success || !result.window) {
      return c.json(
        {
          success: false as const,
          error: 'Update Failed',
          message: result.message ?? 'Update failed',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: { window: result.window },
        message: 'Availability window updated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in PATCH /availability/:windowId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update availability window',
      },
      500,
    );
  }
});

app.openapi(deleteAvailabilityRoute, async (c) => {
  const user = c.get('user');
  const { windowId } = c.req.valid('param');

  try {
    const result = await availabilityService.deleteAvailabilityWindow(
      user.userId,
      windowId,
    );
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: 'Delete Failed',
          message: result.message ?? 'Delete failed',
        },
        400,
      );
    }

    return c.body(null, 204);
  } catch (error) {
    console.error('Error in DELETE /availability/:windowId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to delete availability window',
      },
      500,
    );
  }
});

app.openapi(getFriendsAvailabilityRoute, async (c) => {
  const user = c.get('user');
  const { startDate, endDate } = c.req.valid('query');

  try {
    const availability = await availabilityService.getFriendsAvailability(
      user.userId,
      startDate,
      endDate,
    );

    return c.json(
      {
        success: true as const,
        data: { availability },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /availability/friends:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch friends availability',
      },
      500,
    );
  }
});

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
