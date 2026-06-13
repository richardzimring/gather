import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  CreateInviteSchema,
  CreateInviteResultSchema,
  RedeemInviteResultSchema,
  jsonContent,
  errorResponses,
  jsonBody,
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
    'Create an invite for someone not yet on Gather. Returns a shareable link to send from your own device.',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(CreateInviteSchema),
  },
  responses: {
    201: jsonContent(CreateInviteResponseSchema, 'Invite created'),
    ...errorResponses(400, 401, 500),
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
    200: jsonContent(RedeemInviteResponseSchema, 'Invite redeemed'),
    ...errorResponses(404, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(createInviteRoute, async (c) => {
  const user = c.get('user');
  const { type, phone, eventId } = c.req.valid('json');

  const result = await pendingInvitesService.createPendingInvite({
    inviterUserId: user.userId,
    type,
    phone,
    eventId,
  });

  if (!result.success || !result.token || !result.inviteUrl) {
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
      },
    },
    201,
  );
});

app.openapi(redeemInviteRoute, async (c) => {
  const user = c.get('user');
  const { token } = c.req.valid('param');

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
});
