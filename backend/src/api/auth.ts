import { createRoute, z } from '@hono/zod-openapi';
import {
  createApp,
  verifyAppleToken,
  authMiddleware,
} from '../middleware/hono';
import { UserSchema, ErrorResponseSchema } from '../types';
import * as userService from '../services/users';

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
        email: z.string().email().optional(),
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
    body: {
      content: {
        'application/json': {
          schema: AppleCallbackSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Authentication successful',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid identity token',
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

const getMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Authentication'],
  summary: 'Get authenticated user',
  description: 'Get the currently authenticated user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthMeResponseSchema,
        },
      },
      description: 'User retrieved successfully',
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

// ============================================
// Route Handlers
// ============================================

app.openapi(appleCallbackRoute, async (c) => {
  const { identityToken, user: firstTimeUser } = c.req.valid('json');

  try {
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

    console.log('Apple token verified:', { appleUserId, userEmail });

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

      console.log('Creating new user...');
      user = await userService.createUser({
        appleUserId,
        email: userEmail,
        firstName,
        lastName,
      });
      console.log('User created successfully:', user.userId);
      isNewUser = true;
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
  } catch (error) {
    console.error('Error in Apple callback:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to process authentication',
      },
      500,
    );
  }
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
