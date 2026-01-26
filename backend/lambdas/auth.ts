import { createRoute, z } from '@hono/zod-openapi';
import { createApp, handle, verifyAppleToken } from '../src/middleware/hono';
import { UserSchema, ErrorResponseSchema } from '../src/types';
import * as userService from '../src/services/users';
import { APPLE_BUNDLE_ID } from '../src/constants';

const app = createApp();

// ============================================
// Schemas
// ============================================

const AppleCallbackSchema = z
  .object({
    identityToken: z.string().min(1, 'Identity token is required').openapi({ example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    email: z.string().email().optional().openapi({ example: 'john@example.com' }),
    displayName: z.string().min(1).max(50).optional().openapi({ example: 'John Doe' }),
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
  const { identityToken, email, displayName } = c.req.valid('json');
  console.log('Apple callback received');

  try {
    // Verify the Apple identity token
    const payload = await verifyAppleToken(identityToken, APPLE_BUNDLE_ID);
    
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
    const tokenEmail = payload.email;
    
    console.log('Apple token verified:', { appleUserId, tokenEmail });

    // Use email from token if available, otherwise from request body
    const userEmail = tokenEmail ?? email;
    
    if (!userEmail) {
      return c.json(
        {
          success: false as const,
          error: 'Bad Request',
          message: 'Email is required but was not provided by Apple or in the request',
        },
        400,
      );
    }

    // Check if user already exists
    let user = await userService.getUserByAppleUserId(appleUserId);
    let isNewUser = false;

    if (!user) {
      // Create new user
      console.log('Creating new user...');
      user = await userService.createUser({
        appleUserId,
        email: userEmail,
        displayName: displayName ?? userEmail.split('@')[0] ?? 'User',
      });
      console.log('User created successfully:', user.userId);
      isNewUser = true;
    } else {
      console.log('User already exists:', user.userId);
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
  // This endpoint will be protected by Apple JWT middleware
  // The middleware will set the appleUserId from the JWT
  const appleUserId = c.get('appleUserId') as string | undefined;

  if (!appleUserId) {
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
    const user = await userService.getUserByAppleUserId(appleUserId);

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
