import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  GroupSchema,
  CreateGroupSchema,
  UpdateGroupSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import * as groupsService from '../services/groups';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const GroupsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      groups: z.array(GroupSchema),
    }),
  })
  .openapi('GroupsResponse');

const GroupResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      group: GroupSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('GroupResponse');

// ============================================
// Route Definitions
// ============================================

const getGroupsRoute = createRoute({
  method: 'get',
  path: '/groups',
  tags: ['Groups'],
  summary: 'Get all groups',
  description: 'Get all groups owned by the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(GroupsResponseSchema, 'Groups retrieved successfully'),
    ...errorResponses(401, 500),
  },
});

const createGroupRoute = createRoute({
  method: 'post',
  path: '/groups',
  tags: ['Groups'],
  summary: 'Create group',
  description: 'Create a new group',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(CreateGroupSchema),
  },
  responses: {
    201: jsonContent(GroupResponseSchema, 'Group created successfully'),
    ...errorResponses(400, 401, 500),
  },
});

const updateGroupRoute = createRoute({
  method: 'patch',
  path: '/groups/{groupId}',
  tags: ['Groups'],
  summary: 'Update group',
  description: 'Update an existing group',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      groupId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: jsonBody(UpdateGroupSchema),
  },
  responses: {
    200: jsonContent(GroupResponseSchema, 'Group updated successfully'),
    ...errorResponses(400, 401, 500),
  },
});

const deleteGroupRoute = createRoute({
  method: 'delete',
  path: '/groups/{groupId}',
  tags: ['Groups'],
  summary: 'Delete group',
  description: 'Delete an existing group',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      groupId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: { description: 'Group deleted successfully' },
    ...errorResponses(400, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(getGroupsRoute, async (c) => {
  const user = c.get('user');

  const groups = await groupsService.getGroups(user.userId);
  return c.json(
    {
      success: true as const,
      data: { groups },
    },
    200,
  );
});

app.openapi(createGroupRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  const group = await groupsService.createGroup(user.userId, data);
  return c.json(
    {
      success: true as const,
      data: { group },
      message: 'Group created successfully',
    },
    201,
  );
});

app.openapi(updateGroupRoute, async (c) => {
  const user = c.get('user');
  const { groupId } = c.req.valid('param');
  const data = c.req.valid('json');

  const result = await groupsService.updateGroup(groupId, user.userId, data);
  if (!result.success || !result.group) {
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
      data: { group: result.group },
      message: 'Group updated successfully',
    },
    200,
  );
});

app.openapi(deleteGroupRoute, async (c) => {
  const user = c.get('user');
  const { groupId } = c.req.valid('param');

  const result = await groupsService.deleteGroup(groupId, user.userId);
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
