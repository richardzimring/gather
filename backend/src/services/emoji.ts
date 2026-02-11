import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { eq } from 'drizzle-orm';
import { db, emojiCache } from '../db';
import { GEMINI_API_KEY } from '../constants';

// Initialize Google Generative AI provider with API key
const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});

// Simple regex to validate emoji - matches most common emojis
const EMOJI_REGEX = /\p{Emoji}/u;

/**
 * Generate an emoji for the given text, using cache when available.
 * @param text - The text to generate an emoji for (e.g., event title, group name)
 * @returns A single emoji character
 */
export const generateEmoji = async (text: string): Promise<string> => {
  // Normalize text for cache lookup (lowercase, trimmed)
  const normalizedText = text.trim().toLowerCase();

  // Check cache first
  const cached = await db
    .select()
    .from(emojiCache)
    .where(eq(emojiCache.text, normalizedText))
    .limit(1);

  if (cached.length > 0 && cached[0]) {
    return cached[0].emoji;
  }

  // Generate emoji using Gemini
  const { text: response } = await generateText({
    model: google('gemini-2.0-flash-lite'),
    prompt: `Respond with only a single emoji that best represents: "${text}"

Rules:
- Output ONLY the emoji, nothing else
- No text, no explanation, no punctuation
- Pick the most relevant and recognizable emoji`,
  });

  // Extract the first emoji from the response
  const emoji = extractEmoji(response.trim());

  // Store in cache
  await db.insert(emojiCache).values({
    text: normalizedText,
    emoji,
  });

  return emoji;
};

/**
 * Extract the first emoji from a string, with fallback
 */
function extractEmoji(text: string): string {
  // Try to match an emoji
  const match = text.match(EMOJI_REGEX);
  if (match) {
    return match[0];
  }

  // Fallback emoji if extraction fails
  return '✨';
}
