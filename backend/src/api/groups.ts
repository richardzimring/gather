import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  GroupSchema,
  CreateGroupSchema,
  UpdateGroupSchema,
  ErrorResponseSchema,
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
    200: {
      content: {
        'application/json': {
          schema: GroupsResponseSchema,
        },
      },
      description: 'Groups retrieved successfully',
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

const createGroupRoute = createRoute({
  method: 'post',
  path: '/groups',
  tags: ['Groups'],
  summary: 'Create group',
  description: 'Create a new group',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGroupSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: GroupResponseSchema,
        },
      },
      description: 'Group created successfully',
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateGroupSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GroupResponseSchema,
        },
      },
      description: 'Group updated successfully',
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    204: {
      description: 'Group deleted successfully',
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

app.openapi(getGroupsRoute, async (c) => {
  const user = c.get('user');

  try {
    const groups = await groupsService.getGroups(user.userId);
    return c.json(
      {
        success: true as const,
        data: { groups },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /groups:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch groups',
      },
      500,
    );
  }
});

app.openapi(createGroupRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  try {
    const group = await groupsService.createGroup(user.userId, data);
    return c.json(
      {
        success: true as const,
        data: { group },
        message: 'Group created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /groups:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create group',
      },
      500,
    );
  }
});

app.openapi(updateGroupRoute, async (c) => {
  const user = c.get('user');
  const { groupId } = c.req.valid('param');
  const data = c.req.valid('json');

  try {
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
  } catch (error) {
    console.error('Error in PATCH /groups/:groupId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update group',
      },
      500,
    );
  }
});

app.openapi(deleteGroupRoute, async (c) => {
  const user = c.get('user');
  const { groupId } = c.req.valid('param');

  try {
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
  } catch (error) {
    console.error('Error in DELETE /groups/:groupId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to delete group',
      },
      500,
    );
  }
});
