import { useEffect, useRef, useState } from 'react';
import debounce from 'lodash.debounce';
import { apple } from '@react-native-ai/apple';
import { generateText } from 'ai';
import { postEmojiGenerate } from '../api/client';

const EMOJI_REGEX = /\p{Emoji}/u;

async function generateEmojiForText(text: string): Promise<string> {
  try {
    const { text: response } = await generateText({
      model: apple(),
      prompt: `Respond with only a single emoji that best represents: "${text}"

Rules:
- Output ONLY the emoji, nothing else
- No text, no explanation, no punctuation
- Pick the most relevant and recognizable emoji`,
    });
    const emoji = response.trim().match(EMOJI_REGEX)?.[0];
    if (!emoji) {
      throw new Error('Failed to generate emoji');
    }
    return emoji;
  } catch {
    // Apple Intelligence unavailable (e.g. device older than iPhone 15 Pro) — fall back to backend
    const response = await postEmojiGenerate({ body: { text } });
    if (response.data?.success) {
      return response.data.data.emoji;
    }
    return '✨';
  }
}

/**
 * Hook to generate emoji for text with debouncing and client-side caching.
 * Attempts on-device generation via Apple Intelligence first, then falls back
 * to the backend API for devices that don't support it.
 * Returns null when text is empty (for placeholder state).
 */
export function useGenerateEmoji(text: string) {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Client-side cache to avoid redundant generation calls
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Debounced function to generate emoji
  const generateEmojiDebounced = useRef(
    debounce(async (trimmedText: string, cache: Map<string, string>) => {
      // Check cache first
      if (cache.has(trimmedText)) {
        setEmoji(cache.get(trimmedText)!);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const generatedEmoji = await generateEmojiForText(trimmedText);
        cache.set(trimmedText, generatedEmoji);
        setEmoji(generatedEmoji);
      } catch (error) {
        console.error('Failed to generate emoji:', error);
        // Keep previous emoji on error
      } finally {
        setIsLoading(false);
      }
    }, 500),
  ).current;

  useEffect(() => {
    const trimmedText = text.trim();

    // If text is empty, show no emoji (placeholder state)
    if (!trimmedText) {
      setEmoji(null);
      setIsLoading(false);
      generateEmojiDebounced.cancel();
      return;
    }

    // Check cache immediately for instant response
    if (cacheRef.current.has(trimmedText)) {
      setEmoji(cacheRef.current.get(trimmedText)!);
      setIsLoading(false);
      generateEmojiDebounced.cancel();
      return;
    }

    // Otherwise, debounce the generation call
    setIsLoading(true);
    generateEmojiDebounced(trimmedText, cacheRef.current);

    // Cleanup on unmount or when text changes
    return () => {
      generateEmojiDebounced.cancel();
    };
  }, [text, generateEmojiDebounced]);

  return { emoji, isLoading };
}
