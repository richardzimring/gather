import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  UserSchema,
  UpdateUserSchema,
  RegisterPushTokenSchema,
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
  PublicUserProfileSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import * as userService from '../services/users';
import * as friendsService from '../services/friends';
import { claimPendingInvitesForPhone } from '../services/pending-invites';
import { normalizePhone } from '../utils/phone';
import { isUniqueViolation } from '../utils/pg';

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
    200: jsonContent(UserResponseSchema, 'User profile retrieved successfully'),
    ...errorResponses(401),
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
    body: jsonBody(UpdateUserSchema),
  },
  responses: {
    200: jsonContent(UserResponseSchema, 'User profile updated successfully'),
    ...errorResponses(400, 401, 404, 409, 500),
  },
});

const PublicUserProfileResponseSchema = z
  .object({
    success: z.literal(true),
    data: PublicUserProfileSchema,
  })
  .openapi('PublicUserProfileResponse');

const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/profile',
  tags: ['Users'],
  summary: 'Get a public user profile',
  description:
    "Get another user's public profile (name, avatar, and your relationship to them). Used e.g. when tapping an attendee in a shared event.",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.uuid(),
    }),
  },
  responses: {
    200: jsonContent(
      PublicUserProfileResponseSchema,
      'Public profile retrieved successfully',
    ),
    ...errorResponses(401, 404, 500),
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
    204: { description: 'User deleted successfully' },
    ...errorResponses(401, 500),
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
    body: jsonBody(RegisterPushTokenSchema),
  },
  responses: {
    200: jsonContent(
      PushTokenResponseSchema,
      'Push token registered successfully',
    ),
    ...errorResponses(400, 401, 500),
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
    200: jsonContent(
      NotificationPreferencesResponseSchema,
      'Notification preferences retrieved successfully',
    ),
    ...errorResponses(401, 500),
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
    body: jsonBody(UpdateNotificationPreferencesSchema),
  },
  responses: {
    200: jsonContent(
      NotificationPreferencesResponseSchema,
      'Notification preferences updated successfully',
    ),
    ...errorResponses(400, 401, 500),
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

  // Normalize/validate phone before persisting. Empty string clears it.
  let normalizedPhone: string | null = null;
  if (data.phone !== undefined) {
    if (data.phone === null || data.phone.trim() === '') {
      data.phone = null;
    } else {
      const normalized = normalizePhone(data.phone);
      if (!normalized) {
        return c.json(
          {
            success: false as const,
            error: 'Validation Error',
            message: 'Please enter a valid phone number.',
          },
          400,
        );
      }
      data.phone = normalized;
      normalizedPhone = normalized;
    }
  }

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

    // A phone was just set: claim any pending invites addressed to it.
    if (normalizedPhone) {
      await claimPendingInvitesForPhone(user.userId, normalizedPhone).catch(
        (err) => console.error('Failed to claim pending invites:', err),
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
    // A unique-violation on the phone column means another account already
    // claimed this (unverified, self-reported) number.
    if (isUniqueViolation(error)) {
      return c.json(
        {
          success: false as const,
          error: 'Conflict',
          message: 'That phone number is already linked to another account.',
        },
        409,
      );
    }
    throw error;
  }
});

app.openapi(getUserProfileRoute, async (c) => {
  const viewer = c.get('user');
  const { userId } = c.req.valid('param');

  const target = await userService.getUserById(userId);
  if (!target) {
    return c.json(
      {
        success: false as const,
        error: 'Not Found',
        message: 'User not found',
      },
      404,
    );
  }

  const relationship = await friendsService.getRelationship(
    viewer.userId,
    target.userId,
  );

  return c.json(
    {
      success: true as const,
      data: {
        userId: target.userId,
        fullName: target.fullName,
        initials: target.initials,
        avatarUrl: target.avatarUrl,
        relationship,
      },
    },
    200,
  );
});

app.openapi(deleteMeRoute, async (c) => {
  const user = c.get('user');

  await userService.deleteUser(user.userId);
  return c.body(null, 204);
});

app.openapi(registerPushTokenRoute, async (c) => {
  const user = c.get('user');
  const { pushToken } = c.req.valid('json');

  await userService.updatePushToken(user.userId, pushToken);
  return c.json(
    {
      success: true as const,
      data: { registered: true },
      message: 'Push token registered successfully',
    },
    200,
  );
});

app.openapi(getNotificationPreferencesRoute, async (c) => {
  const user = c.get('user');

  const preferences = await userService.getNotificationPreferences(user.userId);
  return c.json(
    {
      success: true as const,
      data: preferences,
    },
    200,
  );
});

app.openapi(updateNotificationPreferencesRoute, async (c) => {
  const user = c.get('user');
  const updates = c.req.valid('json');

  const preferences = await userService.updateNotificationPreferences(
    user.userId,
    updates,
  );
  return c.json(
    {
      success: true as const,
      data: preferences,
      message: 'Notification preferences updated successfully',
    },
    200,
  );
});
