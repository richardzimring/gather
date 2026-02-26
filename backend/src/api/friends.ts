import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  FriendshipSchema,
  FriendWithUserSchema,
  FriendRequestSchema,
  UserSearchSchema,
  ErrorResponseSchema,
} from '../types';
import * as friendsService from '../services/friends';
import * as userService from '../services/users';
import * as reportsService from '../services/reports';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const FriendsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      friends: z.array(FriendWithUserSchema),
      pendingReceived: z.array(FriendWithUserSchema),
      pendingSent: z.array(FriendWithUserSchema),
    }),
  })
  .openapi('FriendsResponse');

const FriendshipResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      friendship: FriendshipSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('FriendshipResponse');

const FriendCodeResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      friendCode: z.string().optional(),
      friendLink: z.string(),
    }),
    message: z.string().optional(),
  })
  .openapi('FriendCodeResponse');

const UserSearchResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      users: z.array(
        z.object({
          userId: z.string().uuid(),
          fullName: z.string(),
          avatarUrl: z.string().optional(),
        }),
      ),
    }),
  })
  .openapi('UserSearchResponse');

const SimpleSuccessSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
    message: z.string().optional(),
  })
  .openapi('SimpleSuccess');

// ============================================
// Route Definitions
// ============================================

const getFriendsRoute = createRoute({
  method: 'get',
  path: '/friends',
  tags: ['Friends'],
  summary: 'Get all friends',
  description: 'Get all friends of the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FriendsResponseSchema,
        },
      },
      description: 'Friends retrieved successfully',
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

const searchUsersRoute = createRoute({
  method: 'get',
  path: '/friends/search',
  tags: ['Friends'],
  summary: 'Search users',
  description: 'Search for users by name',
  security: [{ BearerAuth: [] }],
  request: {
    query: UserSearchSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSearchResponseSchema,
        },
      },
      description: 'Search results',
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

const getFriendCodeRoute = createRoute({
  method: 'get',
  path: '/friends/friend-code',
  tags: ['Friends'],
  summary: 'Get friend code',
  description: 'Get your unique friend code',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FriendCodeResponseSchema,
        },
      },
      description: 'Friend code retrieved',
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

const regenerateFriendCodeRoute = createRoute({
  method: 'post',
  path: '/friends/friend-code/regenerate',
  tags: ['Friends'],
  summary: 'Regenerate friend code',
  description: 'Generate a new friend code',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FriendCodeResponseSchema,
        },
      },
      description: 'Friend code regenerated',
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

const sendFriendRequestRoute = createRoute({
  method: 'post',
  path: '/friends/request',
  tags: ['Friends'],
  summary: 'Send friend request',
  description: 'Send a friend request to another user',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: FriendRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: FriendshipResponseSchema,
        },
      },
      description: 'Friend request sent',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Friend request failed',
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

const acceptFriendRequestRoute = createRoute({
  method: 'post',
  path: '/friends/{friendId}/accept',
  tags: ['Friends'],
  summary: 'Accept friend request',
  description: 'Accept a friend request',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      friendId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FriendshipResponseSchema,
        },
      },
      description: 'Friend request accepted',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Accept failed',
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

const declineFriendRequestRoute = createRoute({
  method: 'post',
  path: '/friends/{friendId}/decline',
  tags: ['Friends'],
  summary: 'Decline friend request',
  description: 'Decline a friend request',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      friendId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SimpleSuccessSchema,
        },
      },
      description: 'Friend request declined',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Decline failed',
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

const blockUserRoute = createRoute({
  method: 'post',
  path: '/friends/{friendId}/block',
  tags: ['Friends'],
  summary: 'Block user',
  description: 'Block a user',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      friendId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SimpleSuccessSchema,
        },
      },
      description: 'User blocked',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Block failed',
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

const reportUserRoute = createRoute({
  method: 'post',
  path: '/friends/{friendId}/report',
  tags: ['Friends'],
  summary: 'Report user',
  description: 'Report a user for inappropriate behavior',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      friendId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SimpleSuccessSchema,
        },
      },
      description: 'User reported',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Report failed',
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

const removeFriendRoute = createRoute({
  method: 'delete',
  path: '/friends/{friendId}',
  tags: ['Friends'],
  summary: 'Remove friend',
  description: 'Remove a friend or cancel a friend request',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      friendId: z
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: {
      description: 'Friend removed',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Remove failed',
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

app.openapi(getFriendsRoute, async (c) => {
  const user = c.get('user');

  try {
    const friendships = await friendsService.getFriendships(user.userId);

    // Separate into categories
    const friends = friendships.filter((f) => f.status === 'accepted');
    const pendingReceived = friendships.filter(
      (f) => f.status === 'pending' && f.initiatedBy !== user.userId,
    );
    const pendingSent = friendships.filter(
      (f) => f.status === 'pending' && f.initiatedBy === user.userId,
    );

    return c.json(
      {
        success: true as const,
        data: {
          friends,
          pendingReceived,
          pendingSent,
        },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /friends:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch friends',
      },
      500,
    );
  }
});

app.openapi(searchUsersRoute, async (c) => {
  const user = c.get('user');
  const { query } = c.req.valid('query');

  try {
    const users = await userService.searchUsersByName(query, user.userId);

    return c.json(
      {
        success: true as const,
        data: { users },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /friends/search:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to search users',
      },
      500,
    );
  }
});

app.openapi(getFriendCodeRoute, (c) => {
  const user = c.get('user');

  return c.json(
    {
      success: true as const,
      data: {
        friendCode: user.friendCode,
        friendLink: `https://gather.app/add/${user.friendCode}`,
      },
    },
    200,
  );
});

app.openapi(regenerateFriendCodeRoute, async (c) => {
  const user = c.get('user');

  try {
    const newFriendCode = await userService.regenerateFriendCode(user.userId);

    if (!newFriendCode) {
      return c.json(
        {
          success: false as const,
          error: 'Failed to regenerate friend code',
          message: 'User not found',
        },
        404,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {
          friendCode: newFriendCode,
          friendLink: `https://gather.app/add/${newFriendCode}`,
        },
        message: 'Friend code regenerated successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error regenerating friend code:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to regenerate friend code',
      },
      500,
    );
  }
});

app.openapi(sendFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendUserId, friendCode } = c.req.valid('json');

  try {
    const result = await friendsService.sendFriendRequest(
      user.userId,
      friendUserId,
      friendCode,
    );

    if (!result.success || !result.friendship) {
      return c.json(
        {
          success: false as const,
          error: 'Friend Request Failed',
          message: result.message ?? 'Failed to send friend request',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: { friendship: result.friendship },
        message: result.message ?? 'Friend request sent',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /friends/request:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to send friend request',
      },
      500,
    );
  }
});

app.openapi(acceptFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

  try {
    const result = await friendsService.acceptFriendRequest(
      user.userId,
      friendId,
    );
    if (!result.success || !result.friendship) {
      return c.json(
        {
          success: false as const,
          error: 'Accept Failed',
          message: result.message ?? 'Failed to accept friend request',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: { friendship: result.friendship },
        message: result.message ?? 'Friend request accepted',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /friends/:friendId/accept:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to accept friend request',
      },
      500,
    );
  }
});

app.openapi(declineFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

  try {
    const result = await friendsService.declineFriendRequest(
      user.userId,
      friendId,
    );
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: 'Decline Failed',
          message: result.message ?? 'Failed to decline friend request',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {},
        message: result.message ?? 'Friend request declined',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /friends/:friendId/decline:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to decline friend request',
      },
      500,
    );
  }
});

app.openapi(blockUserRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

  try {
    const result = await friendsService.blockUser(user.userId, friendId);
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: 'Block Failed',
          message: result.message ?? 'Failed to block user',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {},
        message: result.message ?? 'User blocked',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /friends/:friendId/block:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to block user',
      },
      500,
    );
  }
});

app.openapi(reportUserRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

  try {
    const result = await reportsService.reportUser(user.userId, friendId);
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: 'Report Failed',
          message: result.message ?? 'Failed to report user',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {},
        message: result.message ?? 'User reported',
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /friends/:friendId/report:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to report user',
      },
      500,
    );
  }
});

app.openapi(removeFriendRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

  try {
    const result = await friendsService.removeFriend(user.userId, friendId);
    if (!result.success) {
      return c.json(
        {
          success: false as const,
          error: 'Remove Failed',
          message: result.message ?? 'Failed to remove friend',
        },
        400,
      );
    }

    return c.body(null, 204);
  } catch (error) {
    console.error('Error in DELETE /friends/:friendId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to remove friend',
      },
      500,
    );
  }
});
