import { createAnimations } from '@tamagui/animations-react-native'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { themes as defaultThemes, tokens as defaultTokens } from '@tamagui/themes'
import { createTamagui, createTokens } from 'tamagui'

// ============================================================================
// ANIMATIONS
// ============================================================================
const animations = createAnimations({
  bouncy: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  lazy: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: 'spring',
    damping: 15,
    stiffness: 120,
  },
  slow: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
})

// ============================================================================
// FONTS
// ============================================================================
const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
  },
  face: {
    400: { normal: 'System' },
    500: { normal: 'System' },
    600: { normal: 'System' },
    700: { normal: 'System' },
  },
})

const bodyFont = createInterFont({
  face: {
    400: { normal: 'System' },
    500: { normal: 'System' },
    600: { normal: 'System' },
    700: { normal: 'System' },
  },
})

// ============================================================================
// TOKENS (Static Design Values)
// ============================================================================
const tokens = createTokens({
  ...defaultTokens,
  color: {
    // Base grays (dark mode oriented)
    gray1: '#0a0a0a',   // deepest background
    gray2: '#0c0c0c',   // card background dark
    gray3: '#141414',   // elevated surface
    gray4: '#1a1a1a',   // borders dark
    gray5: '#262626',   // subtle borders
    gray6: '#404040',   // muted elements
    gray7: '#525252',   // disabled text
    gray8: '#737373',   // placeholder
    gray9: '#a3a3a3',   // secondary text
    gray10: '#d4d4d4',  // primary text dark mode
    gray11: '#e5e5e5',  // bright text
    gray12: '#fafafa',  // white

    // Light mode grays (inverted)
    lightGray1: '#ffffff',  // background
    lightGray2: '#fafafa',  // card background
    lightGray3: '#f5f5f5',  // elevated surface
    lightGray4: '#e5e5e5',  // borders
    lightGray5: '#d4d4d4',  // subtle borders
    lightGray6: '#a3a3a3',  // muted elements
    lightGray7: '#737373',  // disabled text
    lightGray8: '#525252',  // placeholder
    lightGray9: '#404040',  // secondary text
    lightGray10: '#262626', // primary text
    lightGray11: '#171717', // dark text
    lightGray12: '#0a0a0a', // black

    // Accent (subtle blue)
    accent1: '#eff6ff',   // lightest (light mode bg)
    accent2: '#dbeafe',
    accent3: '#bfdbfe',
    accent4: '#93c5fd',
    accent5: '#60a5fa',   // muted accent
    accent6: '#3b82f6',   // primary accent
    accent7: '#2563eb',   // hover
    accent8: '#1d4ed8',   // pressed
    accent9: '#1e40af',   // dark accent

    // Semantic
    success: '#22c55e',
    successLight: '#86efac',
    successDark: '#166534',
    warning: '#f59e0b',
    warningLight: '#fcd34d',
    warningDark: '#92400e',
    error: '#ef4444',
    errorLight: '#fca5a5',
    errorDark: '#991b1b',

    // Transparent
    transparent: 'transparent',
    white: '#ffffff',
    black: '#000000',
  },
})

// ============================================================================
// THEMES
// ============================================================================

// ===== DARK THEME =====
const dark = {
  background: tokens.color.gray1,
  backgroundHover: tokens.color.gray2,
  backgroundPress: tokens.color.gray3,
  backgroundFocus: tokens.color.gray3,
  backgroundStrong: tokens.color.gray2,
  backgroundTransparent: 'rgba(10, 10, 10, 0)',

  color: tokens.color.gray11,
  colorHover: tokens.color.gray12,
  colorPress: tokens.color.gray10,
  colorFocus: tokens.color.gray11,
  colorTransparent: 'rgba(229, 229, 229, 0)',

  colorMuted: tokens.color.gray8,
  colorSubtle: tokens.color.gray9,

  borderColor: tokens.color.gray4,
  borderColorHover: tokens.color.gray5,
  borderColorPress: tokens.color.gray4,
  borderColorFocus: tokens.color.accent6,

  placeholderColor: tokens.color.gray7,

  // Accent colors
  accent: tokens.color.accent6,
  accentHover: tokens.color.accent5,
  accentPress: tokens.color.accent7,
  accentBackground: tokens.color.accent9,
  accentColor: tokens.color.accent1,
  accentSubtle: 'rgba(59, 130, 246, 0.15)', // accent6 with 15% opacity

  // Semantic
  success: tokens.color.success,
  successSubtle: 'rgba(34, 197, 94, 0.15)', // success with 15% opacity
  warning: tokens.color.warning,
  error: tokens.color.error,
  errorSubtle: 'rgba(239, 68, 68, 0.15)', // error with 15% opacity

  // Shadows (minimal in dark mode)
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowColorHover: 'rgba(0,0,0,0.6)',
}

// Dark Card sub-theme - deep black cards
const dark_Card = {
  ...dark,
  background: tokens.color.gray2,
  backgroundHover: tokens.color.gray3,
  backgroundPress: tokens.color.gray4,
  borderColor: tokens.color.gray4,
}

// Dark Button sub-theme
const dark_Button = {
  ...dark,
  background: tokens.color.accent6,
  backgroundHover: tokens.color.accent5,
  backgroundPress: tokens.color.accent7,
  color: tokens.color.white,
  colorHover: tokens.color.white,
  colorPress: tokens.color.white,
}

// Dark Accent sub-theme - for tinted sections
const dark_accent = {
  ...dark,
  background: tokens.color.accent9,
  backgroundHover: tokens.color.accent8,
  backgroundPress: tokens.color.accent7,
  color: tokens.color.accent1,
  borderColor: tokens.color.accent7,
}

// ===== LIGHT THEME =====
const light = {
  background: tokens.color.lightGray1,
  backgroundHover: tokens.color.lightGray2,
  backgroundPress: tokens.color.lightGray3,
  backgroundFocus: tokens.color.lightGray3,
  backgroundStrong: tokens.color.lightGray2,
  backgroundTransparent: 'rgba(255, 255, 255, 0)',

  color: tokens.color.lightGray11,
  colorHover: tokens.color.lightGray12,
  colorPress: tokens.color.lightGray10,
  colorFocus: tokens.color.lightGray11,
  colorTransparent: 'rgba(23, 23, 23, 0)',

  colorMuted: tokens.color.lightGray7,
  colorSubtle: tokens.color.lightGray9,

  borderColor: tokens.color.lightGray4,
  borderColorHover: tokens.color.lightGray5,
  borderColorPress: tokens.color.lightGray4,
  borderColorFocus: tokens.color.accent6,

  placeholderColor: tokens.color.lightGray6,

  // Accent colors
  accent: tokens.color.accent6,
  accentHover: tokens.color.accent7,
  accentPress: tokens.color.accent8,
  accentBackground: tokens.color.accent1,
  accentColor: tokens.color.lightGray12,
  accentSubtle: 'rgba(59, 130, 246, 0.15)', // accent6 with 15% opacity

  // Semantic
  success: tokens.color.success,
  successSubtle: 'rgba(34, 197, 94, 0.15)', // success with 15% opacity
  warning: tokens.color.warning,
  error: tokens.color.error,
  errorSubtle: 'rgba(239, 68, 68, 0.15)', // error with 15% opacity

  // Shadows
  shadowColor: 'rgba(0,0,0,0.08)',
  shadowColorHover: 'rgba(0,0,0,0.12)',
}

// Light Card sub-theme - pure white cards
const light_Card = {
  ...light,
  background: tokens.color.lightGray1,
  backgroundHover: tokens.color.lightGray2,
  backgroundPress: tokens.color.lightGray3,
  borderColor: tokens.color.lightGray4,
}

// Light Button sub-theme
const light_Button = {
  ...light,
  background: tokens.color.accent6,
  backgroundHover: tokens.color.accent7,
  backgroundPress: tokens.color.accent8,
  color: tokens.color.white,
  colorHover: tokens.color.white,
  colorPress: tokens.color.white,
}

// Light Accent sub-theme
const light_accent = {
  ...light,
  background: tokens.color.accent1,
  backgroundHover: tokens.color.accent2,
  backgroundPress: tokens.color.accent3,
  color: tokens.color.accent9,
  borderColor: tokens.color.accent3,
}

// ============================================================================
// TAMAGUI CONFIG
// ============================================================================
export const config = createTamagui({
  animations,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  tokens,
  themes: {
    dark,
    dark_Card,
    dark_Button,
    dark_accent,
    light,
    light_Card,
    light_Button,
    light_accent,
  },
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

// ============================================================================
// THEME CONSTANTS (for custom usage outside Tamagui)
// ============================================================================
export const THEME_CONSTANTS = {
  // Border radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusFull: 9999,

  // Dotted grid background
  gridDotSize: 2,
  gridDotOpacity: 0.08,
  gridDotSpacing: 24,

  // Animation durations
  durationFast: 150,
  durationMedium: 250,
  durationSlow: 400,
} as const
