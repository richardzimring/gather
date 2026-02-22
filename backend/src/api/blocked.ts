import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  BlockedWindowSchema,
  CreateBlockedWindowSchema,
  UpdateBlockedWindowSchema,
  ErrorResponseSchema,
} from '../types';
import * as blockedService from '../services/blocked';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const BlockedWindowsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      windows: z.array(BlockedWindowSchema),
    }),
  })
  .openapi('BlockedWindowsResponse');

const BlockedWindowResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      window: BlockedWindowSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('BlockedWindowResponse');

// ============================================
// Route Definitions
// ============================================

const getBlockedRoute = createRoute({
  method: 'get',
  path: '/blocked',
  tags: ['Blocked'],
  summary: 'Get blocked windows',
  description:
    'Get blocked time windows for the current user (times when NOT available)',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: BlockedWindowsResponseSchema,
        },
      },
      description: 'Blocked windows retrieved successfully',
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

const createBlockedRoute = createRoute({
  method: 'post',
  path: '/blocked',
  tags: ['Blocked'],
  summary: 'Create blocked window',
  description: 'Create a new blocked time window (mark time as unavailable)',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBlockedWindowSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: BlockedWindowResponseSchema,
        },
      },
      description: 'Blocked window created successfully',
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

const updateBlockedRoute = createRoute({
  method: 'patch',
  path: '/blocked/{windowId}',
  tags: ['Blocked'],
  summary: 'Update blocked window',
  description: 'Update an existing blocked time window',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      windowId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateBlockedWindowSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: BlockedWindowResponseSchema,
        },
      },
      description: 'Blocked window updated successfully',
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

const deleteBlockedRoute = createRoute({
  method: 'delete',
  path: '/blocked/{windowId}',
  tags: ['Blocked'],
  summary: 'Delete blocked window',
  description: 'Delete an existing blocked time window',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      windowId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: {
      description: 'Blocked window deleted successfully',
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

// ============================================
// Route Handlers
// ============================================

app.openapi(getBlockedRoute, async (c) => {
  const user = c.get('user');

  try {
    const windows = await blockedService.getBlockedWindows(user.userId);
    return c.json(
      {
        success: true as const,
        data: { windows },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /blocked:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch blocked windows',
      },
      500,
    );
  }
});

app.openapi(createBlockedRoute, async (c) => {
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
    const window = await blockedService.createBlockedWindow(user.userId, data);
    return c.json(
      {
        success: true as const,
        data: { window },
        message: 'Blocked window created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /blocked:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create blocked window',
      },
      500,
    );
  }
});

app.openapi(updateBlockedRoute, async (c) => {
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
    const result = await blockedService.updateBlockedWindow(
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
        message: 'Blocked window updated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in PATCH /blocked/:windowId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update blocked window',
      },
      500,
    );
  }
});

app.openapi(deleteBlockedRoute, async (c) => {
  const user = c.get('user');
  const { windowId } = c.req.valid('param');

  try {
    const result = await blockedService.deleteBlockedWindow(
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
    console.error('Error in DELETE /blocked/:windowId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to delete blocked window',
      },
      500,
    );
  }
});
