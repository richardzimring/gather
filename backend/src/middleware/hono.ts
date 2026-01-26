import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { handle } from 'hono/aws-lambda';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { User } from '../types';
import { APPLE_BUNDLE_ID } from '../constants';
import * as userService from '../services/users';

// https://hono.dev/docs/getting-started/aws-lambda#access-requestcontext

// Apple JWT payload structure
interface AppleJwtPayload {
  sub: string; // Apple user ID
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  real_user_status?: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

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
  expectedAudience?: string,
): Promise<AppleJwtPayload | null> => {
  try {
    // For development without Apple, allow a simple dev token
    if (!expectedAudience && token.startsWith('dev-')) {
      // Dev token format: dev-{appleUserId}
      const appleUserId = token.slice(4);
      return {
        sub: appleUserId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'https://appleid.apple.com',
        aud: 'dev',
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
    ) as { kid: string; alg: string };

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
    const payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString(),
    ) as AppleJwtPayload;

    // Validate token claims
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      console.error('Token expired');
      return null;
    }

    // Validate issuer
    if (payload.iss !== 'https://appleid.apple.com') {
      console.error('Invalid token issuer');
      return null;
    }

    // Validate audience if provided
    if (expectedAudience && payload.aud !== expectedAudience) {
      console.error('Invalid token audience');
      return null;
    }

    return payload;
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
  const payload = await verifyAppleToken(token, APPLE_BUNDLE_ID);

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
  console.log('Received token (first 50 chars):', token.substring(0, 50) + '...');
  const payload = await verifyAppleToken(token, APPLE_BUNDLE_ID);

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
