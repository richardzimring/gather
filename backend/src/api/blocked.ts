import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  BlockedWindowSchema,
  CreateBlockedWindowSchema,
  UpdateBlockedWindowSchema,
  jsonContent,
  errorResponses,
  jsonBody,
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
    200: jsonContent(
      BlockedWindowsResponseSchema,
      'Blocked windows retrieved successfully',
    ),
    ...errorResponses(401, 500),
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
    body: jsonBody(CreateBlockedWindowSchema),
  },
  responses: {
    201: jsonContent(
      BlockedWindowResponseSchema,
      'Blocked window created successfully',
    ),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: jsonBody(UpdateBlockedWindowSchema),
  },
  responses: {
    200: jsonContent(
      BlockedWindowResponseSchema,
      'Blocked window updated successfully',
    ),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: { description: 'Blocked window deleted successfully' },
    ...errorResponses(400, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(getBlockedRoute, async (c) => {
  const user = c.get('user');

  const windows = await blockedService.getBlockedWindows(user.userId);
  return c.json(
    {
      success: true as const,
      data: { windows },
    },
    200,
  );
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

  const window = await blockedService.createBlockedWindow(user.userId, data);
  return c.json(
    {
      success: true as const,
      data: { window },
      message: 'Blocked window created successfully',
    },
    201,
  );
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
});

app.openapi(deleteBlockedRoute, async (c) => {
  const user = c.get('user');
  const { windowId } = c.req.valid('param');

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
});
