/**
 * Default activities that all users have access to.
 * Each activity has an emoji and a display name.
 */
export const DEFAULT_ACTIVITIES = [
  { emoji: '☕', name: 'Coffee' },
  { emoji: '🍽️', name: 'Dinner' },
  { emoji: '🍕', name: 'Lunch' },
  { emoji: '🍻', name: 'Drinks' },
  { emoji: '🎬', name: 'Movie' },
  { emoji: '🎮', name: 'Gaming' },
  { emoji: '🏃', name: 'Run' },
  { emoji: '🎾', name: 'Tennis' },
  { emoji: '⛳', name: 'Golf' },
  { emoji: '🏀', name: 'Basketball' },
  { emoji: '⚽', name: 'Soccer' },
  { emoji: '🧘', name: 'Yoga' },
  { emoji: '🚴', name: 'Biking' },
  { emoji: '🥾', name: 'Hiking' },
  { emoji: '🏊', name: 'Swimming' },
  { emoji: '📚', name: 'Study' },
  { emoji: '🛒', name: 'Shopping' },
  { emoji: '🎤', name: 'Karaoke' },
  { emoji: '🎨', name: 'Art' },
  { emoji: '🎵', name: 'Concert' },
  { emoji: '🍿', name: 'Netflix' },
  { emoji: '🧩', name: 'Board Games' },
  { emoji: '✈️', name: 'Travel' },
  { emoji: '🏖️', name: 'Beach' },
  { emoji: '🎂', name: 'Party' },
  { emoji: '💬', name: 'Hangout' },
] as const

export type DefaultActivity = (typeof DEFAULT_ACTIVITIES)[number]

/**
 * Get emoji for an activity name (case-insensitive lookup).
 */
export function getActivityEmoji(name: string): string | undefined {
  const activity = DEFAULT_ACTIVITIES.find(
    (a) => a.name.toLowerCase() === name.toLowerCase()
  )
  return activity?.emoji
}

/**
 * Check if a given emoji is a valid activity emoji.
 */
export function isValidActivityEmoji(emoji: string): boolean {
  return DEFAULT_ACTIVITIES.some((a) => a.emoji === emoji)
}
