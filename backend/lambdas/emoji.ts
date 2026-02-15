import { createRoute, z } from '@hono/zod-openapi';
import {
  createApp,
  handle,
  authMiddleware,
} from '../src/middleware/hono';
import { ErrorResponseSchema } from '../src/types';
import { generateEmoji } from '../src/services/emoji';

const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Request/Response Schemas
// ============================================

const GenerateEmojiRequestSchema = z
  .object({
    text: z.string().min(1).max(200),
  })
  .openapi('GenerateEmojiRequest');

const GenerateEmojiResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      emoji: z.string(),
    }),
  })
  .openapi('GenerateEmojiResponse');

// ============================================
// Route Definitions
// ============================================

const generateEmojiRoute = createRoute({
  method: 'post',
  path: '/emoji/generate',
  tags: ['Emoji'],
  summary: 'Generate an emoji for given text',
  description: 'Generate a single emoji that represents the provided text using AI, with caching',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateEmojiRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Emoji generated successfully',
      content: {
        'application/json': {
          schema: GenerateEmojiResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(generateEmojiRoute, async (c) => {
  const { text } = c.req.valid('json');

  try {
    const emoji = await generateEmoji(text);

    return c.json(
      {
        success: true as const,
        data: { emoji },
      },
      200,
    );
  } catch (error) {
    console.error('Error in POST /emoji/generate:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to generate emoji',
      },
      500,
    );
  }
});

// ============================================
// Export Handler
// ============================================

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
