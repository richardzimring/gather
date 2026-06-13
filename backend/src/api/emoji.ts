import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import { jsonContent, errorResponses } from '../types';
import { generateEmoji } from '../services/emoji';

export const app = createApp();

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
  description:
    'Generate a single emoji that represents the provided text using AI, with caching',
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
    200: jsonContent(
      GenerateEmojiResponseSchema,
      'Emoji generated successfully',
    ),
    ...errorResponses(400, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(generateEmojiRoute, async (c) => {
  const { text } = c.req.valid('json');

  const emoji = await generateEmoji(text);

  return c.json(
    {
      success: true as const,
      data: { emoji },
    },
    200,
  );
});
