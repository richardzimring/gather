import { useEffect, useRef, useState } from 'react';
import debounce from 'lodash.debounce';
import { postEmojiGenerate } from '../api/client';

/**
 * Hook to generate emoji for text with debouncing and client-side caching.
 * Returns null when text is empty (for placeholder state).
 */
export function useGenerateEmoji(text: string) {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Client-side cache to avoid redundant API calls
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
        const response = await postEmojiGenerate({
          body: { text: trimmedText },
        });

        if (response.data?.success) {
          const generatedEmoji = response.data.data.emoji;
          cache.set(trimmedText, generatedEmoji);
          setEmoji(generatedEmoji);
        }
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

    // Otherwise, debounce the API call
    setIsLoading(true);
    generateEmojiDebounced(trimmedText, cacheRef.current);

    // Cleanup on unmount or when text changes
    return () => {
      generateEmojiDebounced.cancel();
    };
  }, [text, generateEmojiDebounced]);

  return { emoji, isLoading };
}
