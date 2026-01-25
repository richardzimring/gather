import { createRoute, z } from '@hono/zod-openapi';
import {
  createApp,
  handle,
  authMiddleware,
} from '../src/middleware/hono';
import {
  ActivitySchema,
  CreateActivitySchema,
  UpdateActivitySchema,
  ErrorResponseSchema,
} from '../src/types';
import * as activitiesService from '../src/services/activities';

const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const ActivitiesResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      activities: z.array(ActivitySchema),
    }),
  })
  .openapi('ActivitiesResponse');

const ActivityResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      activity: ActivitySchema,
    }),
    message: z.string().optional(),
  })
  .openapi('ActivityResponse');

// ============================================
// Route Definitions
// ============================================

const getActivitiesRoute = createRoute({
  method: 'get',
  path: '/activities',
  tags: ['Activities'],
  summary: 'Get all activities',
  description: 'Get all activities (default + user-created)',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ActivitiesResponseSchema,
        },
      },
      description: 'Activities retrieved successfully',
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

const createActivityRoute = createRoute({
  method: 'post',
  path: '/activities',
  tags: ['Activities'],
  summary: 'Create activity',
  description: 'Create a new custom activity',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateActivitySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ActivityResponseSchema,
        },
      },
      description: 'Activity created successfully',
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

const updateActivityRoute = createRoute({
  method: 'patch',
  path: '/activities/{activityId}',
  tags: ['Activities'],
  summary: 'Update activity',
  description: 'Update a custom activity',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      activityId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateActivitySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ActivityResponseSchema,
        },
      },
      description: 'Activity updated successfully',
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

const deleteActivityRoute = createRoute({
  method: 'delete',
  path: '/activities/{activityId}',
  tags: ['Activities'],
  summary: 'Delete activity',
  description: 'Delete a custom activity',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      activityId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: {
      description: 'Activity deleted successfully',
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

app.openapi(getActivitiesRoute, async (c) => {
  const user = c.get('user');

  try {
    const activities = await activitiesService.getActivities(user.userId);
    return c.json(
      {
        success: true as const,
        data: { activities },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /activities:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch activities',
      },
      500,
    );
  }
});

app.openapi(createActivityRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  try {
    const activity = await activitiesService.createActivity(user.userId, data);
    return c.json(
      {
        success: true as const,
        data: { activity },
        message: 'Activity created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /activities:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create activity',
      },
      500,
    );
  }
});

app.openapi(updateActivityRoute, async (c) => {
  const user = c.get('user');
  const { activityId } = c.req.valid('param');
  const data = c.req.valid('json');

  try {
    const result = await activitiesService.updateActivity(
      activityId,
      user.userId,
      data,
    );
    if (!result.success || !result.activity) {
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
        data: { activity: result.activity },
        message: 'Activity updated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in PATCH /activities/:activityId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update activity',
      },
      500,
    );
  }
});

app.openapi(deleteActivityRoute, async (c) => {
  const user = c.get('user');
  const { activityId } = c.req.valid('param');

  try {
    const result = await activitiesService.deleteActivity(
      activityId,
      user.userId,
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
    console.error('Error in DELETE /activities/:activityId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to delete activity',
      },
      500,
    );
  }
});

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
