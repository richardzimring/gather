import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  FriendshipSchema,
  FriendWithUserSchema,
  FriendRequestSchema,
  UserSearchSchema,
  MatchContactsSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import type { User } from '../types';
import * as friendsService from '../services/friends';
import * as userService from '../services/users';
import * as reportsService from '../services/reports';
import { INVITE_BASE_URL } from '../constants';

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

const InviteCodeResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      inviteCode: z.string().optional(),
      inviteLink: z.string(),
    }),
    message: z.string().optional(),
  })
  .openapi('InviteCodeResponse');

const UserSearchResultSchema = z
  .object({
    userId: z.uuid(),
    fullName: z.string(),
    initials: z.string(),
    avatarUrl: z.string().optional(),
  })
  .openapi('UserSearchResult');

const UserSearchResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      users: z.array(UserSearchResultSchema),
    }),
  })
  .openapi('UserSearchResponse');

const toUserSearchResult = (user: User) => ({
  userId: user.userId,
  fullName: user.fullName,
  initials: user.initials,
  avatarUrl: user.avatarUrl,
});

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
    200: jsonContent(FriendsResponseSchema, 'Friends retrieved successfully'),
    ...errorResponses(401, 500),
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
    200: jsonContent(UserSearchResponseSchema, 'Search results'),
    ...errorResponses(400, 401, 500),
  },
});

const matchContactsRoute = createRoute({
  method: 'post',
  path: '/friends/match-contacts',
  tags: ['Friends'],
  summary: 'Match contacts',
  description:
    'Find which of your phone contacts are already on Gather (excludes you and current friends)',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(MatchContactsSchema),
  },
  responses: {
    200: jsonContent(UserSearchResponseSchema, 'Matched users'),
    ...errorResponses(400, 401, 500),
  },
});

const getInviteCodeRoute = createRoute({
  method: 'get',
  path: '/friends/invite-code',
  tags: ['Friends'],
  summary: 'Get invite code',
  description: 'Get your unique invite code',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(InviteCodeResponseSchema, 'Invite code retrieved'),
    ...errorResponses(401),
  },
});

const regenerateInviteCodeRoute = createRoute({
  method: 'post',
  path: '/friends/invite-code/regenerate',
  tags: ['Friends'],
  summary: 'Regenerate invite code',
  description: 'Generate a new invite code',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(InviteCodeResponseSchema, 'Invite code regenerated'),
    ...errorResponses(401, 404, 500),
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
    body: jsonBody(FriendRequestSchema),
  },
  responses: {
    201: jsonContent(FriendshipResponseSchema, 'Friend request sent'),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(FriendshipResponseSchema, 'Friend request accepted'),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(SimpleSuccessSchema, 'Friend request declined'),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(SimpleSuccessSchema, 'User blocked'),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(SimpleSuccessSchema, 'User reported'),
    ...errorResponses(400, 401, 500),
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
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: { description: 'Friend removed' },
    ...errorResponses(400, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(getFriendsRoute, async (c) => {
  const user = c.get('user');

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
});

app.openapi(searchUsersRoute, async (c) => {
  const user = c.get('user');
  const { query } = c.req.valid('query');

  const users = await userService.searchUsersByName(query, user.userId);

  return c.json(
    {
      success: true as const,
      data: { users: users.map(toUserSearchResult) },
    },
    200,
  );
});

app.openapi(matchContactsRoute, async (c) => {
  const user = c.get('user');
  const { phones } = c.req.valid('json');

  const matched = await friendsService.matchContacts(user.userId, phones);

  return c.json(
    {
      success: true as const,
      data: {
        users: matched.map(toUserSearchResult),
      },
    },
    200,
  );
});

app.openapi(getInviteCodeRoute, (c) => {
  const user = c.get('user');

  return c.json(
    {
      success: true as const,
      data: {
        inviteCode: user.inviteCode,
        inviteLink: `${INVITE_BASE_URL}/invite/${user.inviteCode}`,
      },
    },
    200,
  );
});

app.openapi(regenerateInviteCodeRoute, async (c) => {
  const user = c.get('user');

  const newInviteCode = await userService.regenerateInviteCode(user.userId);

  if (!newInviteCode) {
    return c.json(
      {
        success: false as const,
        error: 'Failed to regenerate invite code',
        message: 'User not found',
      },
      404,
    );
  }

  return c.json(
    {
      success: true as const,
      data: {
        inviteCode: newInviteCode,
        inviteLink: `${INVITE_BASE_URL}/invite/${newInviteCode}`,
      },
      message: 'Invite code regenerated successfully',
    },
    200,
  );
});

app.openapi(sendFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendUserId, inviteCode } = c.req.valid('json');

  const result = await friendsService.sendFriendRequest(
    user.userId,
    friendUserId,
    inviteCode,
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
});

app.openapi(acceptFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

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
});

app.openapi(declineFriendRequestRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

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
});

app.openapi(blockUserRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

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
});

app.openapi(reportUserRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

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
});

app.openapi(removeFriendRoute, async (c) => {
  const user = c.get('user');
  const { friendId } = c.req.valid('param');

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
});
