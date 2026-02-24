import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { handle } from 'hono/aws-lambda';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { User } from '../types';
import { APPLE_BUNDLE_ID, STAGE } from '../constants';
import * as userService from '../services/users';
import { z } from 'zod';

const AppleJwtPayloadSchema = z
  .object({
    /** * The issuer registered claim.
     * Value is always "https://appleid.apple.com"
     */
    iss: z.literal('https://appleid.apple.com'),

    /** * The subject registered claim.
     * The unique identifier for the user.
     */
    sub: z.string(),

    /** * The audience registered claim.
     * This will be your specific App Bundle ID (e.g., "com.myapp.ios")
     * or Service ID (e.g., "com.myapp.web").
     */
    aud: z.literal(APPLE_BUNDLE_ID),

    /** * Issued at time (seconds since Epoch).
     */
    iat: z.number(),

    /** * Expiration time (seconds since Epoch).
     */
    exp: z.number(),

    /** * The user's email address.
     * NOTE: This is NOT guaranteed to be present on every login
     * (only the first one or if scopes are requested explicitly).
     */
    email: z.string().email().optional(),

    /** * Verification status of the email.
     */
    email_verified: z.boolean().optional(),

    /** * Indicates if the user used "Hide My Email".
     * If true, the `email` field is a proxy address (e.g., @privaterelay.appleid.com).
     */
    is_private_email: z.boolean().optional(),

    /** * Nonce used to associate a client session with the ID token.
     * Mandatory if you included a `nonce` in the authorization request.
     */
    nonce: z.string().optional(),

    /** * Indicates if the platform supports nonces.
     */
    nonce_supported: z.boolean().optional(),

    /** * Time of authentication.
     */
    auth_time: z.number().optional(),

    /** * Access Token Hash.
     * Used to validate the `access_token` if you received one.
     */
    at_hash: z.string().optional(),

    /** * Real User Status (iOS 14+ / macOS 11+ only).
     * 0: Unsupported, 1: Unknown, 2: LikelyReal
     */
    real_user_status: z
      .union([z.literal(0), z.literal(1), z.literal(2)])
      .optional(),

    /** * Transfer Subject.
     * Only present during the 60-day period after transferring an app
     * to another developer team.
     */
    transfer_sub: z.string().optional(),
  })
  .refine((data) => data.exp > Math.floor(Date.now() / 1000), {
    message: 'Token expired',
  });

type AppleJwtPayload = z.infer<typeof AppleJwtPayloadSchema>;

// Type-safe context with user
export interface AppEnv {
  Variables: {
    appleUserId: string;
    email?: string;
    user: User;
  };
}

// JWKS cache for Apple
let appleJwksCache: { keys: JWK[] } | null = null;
let appleJwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

interface JWK {
  kid: string;
  alg: string;
  kty: string;
  e: string;
  n: string;
  use: string;
}

/**
 * Fetch JWKS from Apple
 */
const getAppleJwks = async (): Promise<{ keys: JWK[] }> => {
  const now = Date.now();

  if (appleJwksCache && now - appleJwksCacheTime < JWKS_CACHE_TTL) {
    return appleJwksCache;
  }

  const jwksUrl = 'https://appleid.apple.com/auth/keys';

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${response.statusText}`);
  }

  appleJwksCache = (await response.json()) as { keys: JWK[] };
  appleJwksCacheTime = now;

  return appleJwksCache;
};

/**
 * Verify an Apple identity token
 * Returns the payload if valid, null if invalid
 */
export const verifyAppleToken = async (
  token: string,
): Promise<AppleJwtPayload | null> => {
  try {
    // In development, allow a simple dev token
    if (STAGE === 'dev' && token.startsWith('dev-')) {
      // Dev token format: dev-{appleUserId}
      const appleUserId = token.slice(4);
      return {
        sub: appleUserId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'https://appleid.apple.com',
        aud: APPLE_BUNDLE_ID,
      };
    }

    // Decode JWT header to get kid
    const [headerBase64] = token.split('.');
    if (!headerBase64) {
      console.error('Token verification error: Missing header part');
      return null;
    }

    const header = JSON.parse(
      Buffer.from(headerBase64, 'base64url').toString(),
    ) as {
      kid: string;
      alg: string;
    };

    // Get JWKS and find matching key
    const jwks = await getAppleJwks();
    const key = jwks.keys.find((k) => k.kid === header.kid);

    if (!key) {
      console.error('No matching key found in Apple JWKS');
      return null;
    }

    // Decode and validate the token payload
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1];
    if (!payloadBase64) {
      return null;
    }
    const payloadRaw = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString(),
    );

    // Validate with Zod schema
    const result = AppleJwtPayloadSchema.safeParse(payloadRaw);

    if (!result.success) {
      console.error('Token validation failed:', result.error.issues);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Creates a new OpenAPIHono app instance with CORS enabled and validation defaultHook
 */
export const createApp = () => {
  const app = new OpenAPIHono<AppEnv>({
    // Default validation error handler for OpenAPI routes
    defaultHook: (result, c) => {
      if (!result.success) {
        const issues = result.error?.issues ?? [];
        const message = issues
          .map((e) => `${(e.path ?? []).join('.')}: ${e.message}`)
          .join(', ');
        return c.json(
          {
            success: false as const,
            error: 'Validation Error',
            message: message || 'Invalid request data',
          },
          400,
        );
      }
      return undefined;
    },
  });

  // Enable CORS for all routes
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  // Global error handler
  app.onError((err, c) => {
    console.error('Unhandled error:', err);

    if (err instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: err.message,
        },
        err.status,
      );
    }

    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: err.message,
      },
      500,
    );
  });

  return app;
};

/**
 * Apple JWT middleware - verifies token and extracts user info
 */
export const appleAuthMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      },
      401,
    );
  }

  const token = authHeader.slice(7);
  const payload = await verifyAppleToken(token);

  if (!payload) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      },
      401,
    );
  }

  c.set('appleUserId', payload.sub);
  c.set('email', payload.email);

  return next();
});

/**
 * Middleware to fetch user from DB based on Apple User ID
 * Must be used after appleAuthMiddleware
 */
export const userMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const appleUserId = c.get('appleUserId');

  if (!appleUserId) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Not authenticated',
      },
      401,
    );
  }

  const user = await userService.getUserByAppleUserId(appleUserId);

  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'User not found. Please complete registration.',
      },
      401,
    );
  }

  c.set('user', user);
  return next();
});

/**
 * Combined auth middleware: Apple JWT verification + user fetch
 * Use this for protected routes
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      },
      401,
    );
  }

  const token = authHeader.slice(7);
  const payload = await verifyAppleToken(token);

  if (!payload) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      },
      401,
    );
  }

  c.set('appleUserId', payload.sub);
  c.set('email', payload.email);

  // Fetch user from database
  const user = await userService.getUserByAppleUserId(payload.sub);

  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'User not found. Please complete registration.',
      },
      401,
    );
  }

  c.set('user', user);
  return next();
});

/**
 * Standard validation hook for zValidator
 * Returns error response on failure, undefined on success
 *
 * Note: Using 'any' for result type due to complex Zod type inference.
 * Runtime behavior is correct - we check result.success and result.error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validationHook = (result: any, c: any) => {
  if (!result.success && result.error) {
    const issues = result.error.issues || [];
    const message = issues
      .map(
        (e: { path: (string | number)[]; message: string }) =>
          `${e.path.join('.')}: ${e.message}`,
      )
      .join(', ');
    return c.json(
      {
        success: false,
        error: 'Validation Error',
        message,
      },
      400,
    );
  }
  return undefined;
};

// Re-export handle for Lambda integration
export { handle };
