import { createRoute, z } from '@hono/zod-openapi';
import {
  createApp,
  verifyAppleToken,
  authMiddleware,
} from '../middleware/hono';
import { UserSchema, jsonContent, errorResponses, jsonBody } from '../types';
import * as userService from '../services/users';
import { notifyOwnerOfNewSignup } from '../services/owner-notify';

export const app = createApp();

// Apply auth middleware only to /auth/me (not /auth/apple/callback which is public)
app.use('/auth/me', authMiddleware);

// ============================================
// Schemas
// ============================================

const AppleCallbackSchema = z
  .object({
    identityToken: z
      .string()
      .min(1, 'Identity token is required')
      .openapi({ example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    /**
     * The user object (IMPORTANT: only present on register/first login).
     */
    user: z
      .object({
        name: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            middleName: z.string().optional(),
            namePrefix: z.string().optional(),
            nameSuffix: z.string().optional(),
            nickname: z.string().optional(),
          })
          .optional(),
        email: z.email().optional(),
      })
      .optional(),
  })
  .openapi('AppleCallback');

const AuthResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: UserSchema,
      token: z.string(),
      isNewUser: z.boolean(),
    }),
    message: z.string().optional(),
  })
  .openapi('AuthResponse');

const AuthMeResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: UserSchema,
    }),
  })
  .openapi('AuthMeResponse');

// ============================================
// Route Definitions
// ============================================

const appleCallbackRoute = createRoute({
  method: 'post',
  path: '/auth/apple/callback',
  tags: ['Authentication'],
  summary: 'Apple Sign In callback',
  description: 'Handle Apple Sign In callback and create/update user',
  request: {
    body: jsonBody(AppleCallbackSchema),
  },
  responses: {
    200: jsonContent(AuthResponseSchema, 'Authentication successful'),
    ...errorResponses(400, 401, 500),
  },
});

const getMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Authentication'],
  summary: 'Get authenticated user',
  description: 'Get the currently authenticated user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(AuthMeResponseSchema, 'User retrieved successfully'),
    ...errorResponses(401, 404, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(appleCallbackRoute, async (c) => {
  const { identityToken, user: firstTimeUser } = c.req.valid('json');

  // Verify the Apple identity token
  const payload = await verifyAppleToken(identityToken);

  if (!payload) {
    return c.json(
      {
        success: false as const,
        error: 'Unauthorized',
        message: 'Invalid or expired identity token',
      },
      401,
    );
  }

  const appleUserId = payload.sub;
  const userEmail = payload.email;

  if (!userEmail) {
    return c.json(
      {
        success: false as const,
        error: 'Bad Request',
        message:
          'Email is required but was not provided by Apple or in the request',
      },
      400,
    );
  }

  // Check if user already exists
  let user = await userService.getUserByAppleUserId(appleUserId);
  let isNewUser = false;

  if (!user) {
    const firstName =
      firstTimeUser?.name?.firstName ?? userEmail.split('@')[0] ?? 'User';
    const lastName = firstTimeUser?.name?.lastName ?? '';

    user = await userService.createUser({
      appleUserId,
      email: userEmail,
      firstName,
      lastName,
    });
    isNewUser = true;
    void notifyOwnerOfNewSignup(user);
  }

  // Return the identity token as the session token
  // The middleware will verify this token on subsequent requests
  return c.json(
    {
      success: true as const,
      data: {
        user,
        token: identityToken,
        isNewUser,
      },
      message: isNewUser
        ? 'User created successfully'
        : 'User retrieved successfully',
    },
    200,
  );
});

app.openapi(getMeRoute, async (c) => {
  // authMiddleware already verified the token and fetched the user
  const user = c.get('user');

  return c.json(
    {
      success: true as const,
      data: { user },
    },
    200,
  );
});
