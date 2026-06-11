import { useEffect, useMemo, useRef, useState } from 'react';
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
  // Latest completed generation; emoji/isLoading are derived from it below so
  // the effect never needs to set state synchronously.
  const [generated, setGenerated] = useState<{
    text: string;
    emoji: string | null;
  } | null>(null);

  // Client-side cache to avoid redundant generation calls
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Debounced function to generate emoji
  const generateEmojiDebounced = useMemo(
    () =>
      debounce(async (trimmedText: string, cache: Map<string, string>) => {
        // Check cache first
        const cached = cache.get(trimmedText);
        if (cached !== undefined) {
          setGenerated({ text: trimmedText, emoji: cached });
          return;
        }

        try {
          const generatedEmoji = await generateEmojiForText(trimmedText);
          cache.set(trimmedText, generatedEmoji);
          setGenerated({ text: trimmedText, emoji: generatedEmoji });
        } catch (error) {
          console.error('Failed to generate emoji:', error);
          // Keep the previous emoji on error, but mark this text as done
          setGenerated((prev) => ({
            text: trimmedText,
            emoji: prev?.emoji ?? null,
          }));
        }
      }, 500),
    [],
  );

  useEffect(() => {
    const trimmedText = text.trim();

    // Empty text needs no generation; emoji/isLoading derive to the
    // placeholder state below
    if (!trimmedText) {
      generateEmojiDebounced.cancel();
      return;
    }

    generateEmojiDebounced(trimmedText, cacheRef.current);
    // Cached results don't need the debounce delay — resolve them immediately
    if (cacheRef.current.has(trimmedText)) {
      generateEmojiDebounced.flush();
    }

    // Cleanup on unmount or when text changes
    return () => {
      generateEmojiDebounced.cancel();
    };
  }, [text, generateEmojiDebounced]);

  // Derived state: empty text shows the placeholder; otherwise show the most
  // recently generated emoji and report loading until the current text's
  // generation has completed.
  const trimmedText = text.trim();
  const emoji = trimmedText ? (generated?.emoji ?? null) : null;
  const isLoading = trimmedText !== '' && generated?.text !== trimmedText;

  return { emoji, isLoading };
}
