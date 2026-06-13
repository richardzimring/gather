import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verifyWithJwks } from 'hono/jwt';
import type { HonoJsonWebKey } from 'hono/utils/jwt/jws';
import type { User } from '../types';
import { APPLE_BUNDLE_ID, STAGE } from '../constants';
import * as userService from '../services/users';
import { OAuthRevokedError } from '../services/calendar-providers';
import { z } from 'zod';

// Claims we consume from a verified Apple identity token. Signature, exp, iss,
// and aud are all enforced by verifyWithJwks before this schema runs.
const AppleJwtPayloadSchema = z.looseObject({
  /** Unique, stable identifier for the user (per Apple team). */
  sub: z.string(),
  /**
   * The user's email address. NOT guaranteed to be present on every login
   * (only the first one or if scopes are requested explicitly). May be a
   * private relay address when the user chose "Hide My Email".
   */
  email: z.email().optional(),
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

// Apple rotates its signing keys infrequently; cache them across invocations
// of a warm Lambda so we don't refetch the JWKS on every request.
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const JWKS_CACHE_TTL = 3600000; // 1 hour

let appleKeysCache: { keys: HonoJsonWebKey[]; fetchedAt: number } | null = null;

const getAppleJwks = async (): Promise<HonoJsonWebKey[]> => {
  const now = Date.now();
  if (appleKeysCache && now - appleKeysCache.fetchedAt < JWKS_CACHE_TTL) {
    return appleKeysCache.keys;
  }

  const response = await fetch(APPLE_JWKS_URI);
  if (!response.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${response.statusText}`);
  }

  const { keys } = (await response.json()) as { keys: HonoJsonWebKey[] };
  appleKeysCache = { keys, fetchedAt: now };
  return keys;
};

/**
 * Verify an Apple identity token: signature (against Apple's JWKS), exp, iss,
 * and aud. Returns the payload if valid, null if invalid.
 */
export const verifyAppleToken = async (
  token: string,
): Promise<AppleJwtPayload | null> => {
  // In development, allow a simple dev token of the form dev-{appleUserId}
  if (STAGE === 'dev' && token.startsWith('dev-')) {
    return { sub: token.slice(4) };
  }

  try {
    const payload = await verifyWithJwks(token, {
      keys: await getAppleJwks(),
      allowedAlgorithms: ['RS256'],
      verification: {
        iss: 'https://appleid.apple.com',
        aud: APPLE_BUNDLE_ID,
      },
    });

    const result = AppleJwtPayloadSchema.safeParse(payload);
    if (!result.success) {
      console.error('Token claims validation failed:', result.error.issues);
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

  // Global error handler. Route handlers don't catch unexpected errors —
  // anything thrown lands here and becomes a consistent error envelope.
  app.onError((err, c) => {
    if (err instanceof OAuthRevokedError) {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message:
            'Calendar access has been revoked. Please reconnect your account.',
        },
        403,
      );
    }

    if (err instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: err.message,
        },
        err.status,
      );
    }

    console.error('Unhandled error:', err);
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
 * Auth middleware: verifies the Apple identity token and loads the user.
 * Use this for protected routes.
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
