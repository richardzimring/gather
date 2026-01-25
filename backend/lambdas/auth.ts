import { createRoute, z } from '@hono/zod-openapi';
import { createApp, handle } from '../src/middleware/hono';
import { UserSchema, ErrorResponseSchema } from '../src/types';
import * as userService from '../src/services/users';

const app = createApp();

// ============================================
// Schemas
// ============================================

const CognitoCallbackSchema = z
  .object({
    cognitoId: z.string().min(1, 'Cognito ID is required').openapi({ example: 'us-east-1_abc123|user123' }),
    email: z.string().email('Valid email is required').openapi({ example: 'john@example.com' }),
    displayName: z.string().min(1).max(50).optional().openapi({ example: 'John Doe' }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
  })
  .openapi('CognitoCallback');

const AuthResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: UserSchema,
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

const cognitoCallbackRoute = createRoute({
  method: 'post',
  path: '/auth/cognito/callback',
  tags: ['Authentication'],
  summary: 'Cognito OAuth callback',
  description: 'Handle Cognito OAuth callback and create/update user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CognitoCallbackSchema,
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

app.openapi(cognitoCallbackRoute, async (c) => {
  const { cognitoId, email, displayName, avatarUrl } = c.req.valid('json');

  try {
    // Check if user already exists
    let user = await userService.getUserByCognitoId(cognitoId);
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await userService.createUser({
        cognitoId,
        email,
        displayName: displayName ?? email.split('@')[0] ?? 'User',
        avatarUrl,
      });
      isNewUser = true;
    }

    return c.json(
      {
        success: true as const,
        data: {
          user,
          isNewUser,
        },
        message: isNewUser
          ? 'User created successfully'
          : 'User retrieved successfully',
      },
      200,
    );
  } catch (error) {
    console.error('Error in cognito callback:', error);
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
  // This endpoint will be protected by Cognito JWT middleware
  // The middleware will set the cognitoId from the JWT
  const cognitoId = c.get('cognitoId') as string | undefined;

  if (!cognitoId) {
    return c.json(
      {
        success: false as const,
        error: 'Unauthorized',
        message: 'Not authenticated',
      },
      401,
    );
  }

  try {
    const user = await userService.getUserByCognitoId(cognitoId);

    if (!user) {
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
        data: { user },
      },
      200,
    );
  } catch (error) {
    console.error('Error in /auth/me:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to retrieve user',
      },
      500,
    );
  }
});

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
