import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  UserSchema,
  UpdateUserSchema,
  RegisterPushTokenSchema,
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
  ErrorResponseSchema,
} from '../types';
import * as userService from '../services/users';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const UserResponseSchema = z
  .object({
    success: z.literal(true),
    data: UserSchema,
    message: z.string().optional(),
  })
  .openapi('UserResponse');

const PushTokenResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      registered: z.boolean(),
    }),
    message: z.string().optional(),
  })
  .openapi('PushTokenResponse');

const NotificationPreferencesResponseSchema = z
  .object({
    success: z.literal(true),
    data: NotificationPreferencesSchema,
    message: z.string().optional(),
  })
  .openapi('NotificationPreferencesResponse');

// ============================================
// Route Definitions
// ============================================

const getMeRoute = createRoute({
  method: 'get',
  path: '/users/me',
  tags: ['Users'],
  summary: 'Get current user',
  description: 'Get the profile of the currently authenticated user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
      description: 'User profile retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
});

const updateMeRoute = createRoute({
  method: 'patch',
  path: '/users/me',
  tags: ['Users'],
  summary: 'Update current user',
  description: 'Update the profile of the currently authenticated user',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
      description: 'User profile updated successfully',
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
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
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

const deleteMeRoute = createRoute({
  method: 'delete',
  path: '/users/me',
  tags: ['Users'],
  summary: 'Delete current user',
  description: 'Delete the currently authenticated user account',
  security: [{ BearerAuth: [] }],
  responses: {
    204: {
      description: 'User deleted successfully',
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

const registerPushTokenRoute = createRoute({
  method: 'post',
  path: '/users/me/push-token',
  tags: ['Users'],
  summary: 'Register push notification token',
  description: 'Register a push notification token for the current user',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterPushTokenSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PushTokenResponseSchema,
        },
      },
      description: 'Push token registered successfully',
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

const getNotificationPreferencesRoute = createRoute({
  method: 'get',
  path: '/users/me/notification-preferences',
  tags: ['Users'],
  summary: 'Get notification preferences',
  description: 'Get the notification preferences for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NotificationPreferencesResponseSchema,
        },
      },
      description: 'Notification preferences retrieved successfully',
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

const updateNotificationPreferencesRoute = createRoute({
  method: 'put',
  path: '/users/me/notification-preferences',
  tags: ['Users'],
  summary: 'Update notification preferences',
  description: 'Update the notification preferences for the current user',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateNotificationPreferencesSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NotificationPreferencesResponseSchema,
        },
      },
      description: 'Notification preferences updated successfully',
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

app.openapi(getMeRoute, (c) => {
  const user = c.get('user');
  return c.json(
    {
      success: true as const,
      data: user,
    },
    200,
  );
});

app.openapi(updateMeRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  try {
    const updatedUser = await userService.updateUser(user.userId, data);
    if (!updatedUser) {
      return c.json(
        {
          success: false as const,
          error: 'Not Found',
          message: 'User not found',
        },
        404,
      );
    }

    return c.json(
      {
        success: true as const,
        data: updatedUser,
        message: 'Profile updated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in PATCH /users/me:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      },
      500,
    );
  }
});

app.openapi(deleteMeRoute, async (c) => {
  const user = c.get('user');

  try {
    await userService.deleteUser(user.userId);
    return c.body(null, 204);
  } catch (error) {
    console.error('Error in DELETE /users/me:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to delete user',
      },
      500,
    );
  }
});

app.openapi(registerPushTokenRoute, async (c) => {
  const user = c.get('user');
  const { pushToken } = c.req.valid('json');

  try {
    await userService.updatePushToken(user.userId, pushToken);
    return c.json(
      {
        success: true as const,
        data: { registered: true },
        message: 'Push token registered successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /users/me/push-token:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to register push token',
      },
      500,
    );
  }
});

app.openapi(getNotificationPreferencesRoute, async (c) => {
  const user = c.get('user');

  try {
    const preferences = await userService.getNotificationPreferences(user.userId);
    return c.json(
      {
        success: true as const,
        data: preferences,
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /users/me/notification-preferences:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to get notification preferences',
      },
      500,
    );
  }
});

app.openapi(updateNotificationPreferencesRoute, async (c) => {
  const user = c.get('user');
  const updates = c.req.valid('json');

  try {
    const preferences = await userService.updateNotificationPreferences(user.userId, updates);
    return c.json(
      {
        success: true as const,
        data: preferences,
        message: 'Notification preferences updated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in PUT /users/me/notification-preferences:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update notification preferences',
      },
      500,
    );
  }
});
