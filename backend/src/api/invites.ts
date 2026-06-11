import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  CreateInviteSchema,
  CreateInviteResultSchema,
  RedeemInviteResultSchema,
  ErrorResponseSchema,
} from '../types';
import * as pendingInvitesService from '../services/pending-invites';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const CreateInviteResponseSchema = z
  .object({
    success: z.literal(true),
    data: CreateInviteResultSchema,
    message: z.string().optional(),
  })
  .openapi('CreateInviteResponse');

const RedeemInviteResponseSchema = z
  .object({
    success: z.literal(true),
    data: RedeemInviteResultSchema,
    message: z.string().optional(),
  })
  .openapi('RedeemInviteResponse');

// ============================================
// Route Definitions
// ============================================

const createInviteRoute = createRoute({
  method: 'post',
  path: '/invites',
  tags: ['Invites'],
  summary: 'Create a pending invite',
  description:
    'Create an invite for someone not yet on Gather. Returns a shareable link and prefilled message to send from your own device.',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateInviteSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: CreateInviteResponseSchema,
        },
      },
      description: 'Invite created',
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

const redeemInviteRoute = createRoute({
  method: 'post',
  path: '/invites/{token}/redeem',
  tags: ['Invites'],
  summary: 'Redeem an invite by token',
  description:
    'Redeem a pending invite by its token (e.g. when the recipient taps the link after installing).',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      token: z.string().openapi({ example: 'aBcD1234' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: RedeemInviteResponseSchema,
        },
      },
      description: 'Invite redeemed',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invite not found',
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

app.openapi(createInviteRoute, async (c) => {
  const user = c.get('user');
  const { type, phone, eventId } = c.req.valid('json');

  try {
    const result = await pendingInvitesService.createPendingInvite({
      inviterUserId: user.userId,
      type,
      phone,
      eventId,
    });

    if (
      !result.success ||
      !result.token ||
      !result.inviteUrl ||
      !result.prefilledMessage
    ) {
      return c.json(
        {
          success: false as const,
          error: 'Invite Failed',
          message: result.message ?? 'Failed to create invite',
        },
        400,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {
          token: result.token,
          inviteUrl: result.inviteUrl,
          prefilledMessage: result.prefilledMessage,
        },
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /invites:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create invite',
      },
      500,
    );
  }
});

app.openapi(redeemInviteRoute, async (c) => {
  const user = c.get('user');
  const { token } = c.req.valid('param');

  try {
    const result = await pendingInvitesService.redeemInviteToken(
      user.userId,
      token,
    );

    if (!result.success || !result.type) {
      return c.json(
        {
          success: false as const,
          error: 'Not Found',
          message: result.message ?? 'Invite not found',
        },
        404,
      );
    }

    return c.json(
      {
        success: true as const,
        data: { type: result.type, eventId: result.eventId },
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /invites/:token/redeem:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to redeem invite',
      },
      500,
    );
  }
});
