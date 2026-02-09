import { createAnimations } from '@tamagui/animations-react-native'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { tokens as defaultTokens } from '@tamagui/themes'
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

// Display font for logo and greetings (Roslindale-style)
// Note: To use actual Roslindale font, add the font files and update the face mappings
const displayFont = createInterFont({
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
    // Using serif-style font as fallback until Roslindale is loaded
    // Replace with 'Roslindale-Regular', 'Roslindale-Medium', etc. when available
    400: { normal: 'System' },
    500: { normal: 'System' },
    600: { normal: 'System' },
    700: { normal: 'System' },
  },
})

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
// Stone palette from shadcn - warm neutral grays with slight warm undertone
const tokens = createTokens({
  ...defaultTokens,
  color: {
    // Stone palette - Dark mode (12-step scale)
    gray1: '#0c0a09',   // background - deepest
    gray2: '#1c1917',   // card background
    gray3: '#292524',   // elevated/popover
    gray4: '#44403c',   // border
    gray5: '#57534e',   // border hover
    gray6: '#78716c',   // muted elements
    gray7: '#a8a29e',   // disabled/placeholder
    gray8: '#d6d3d1',   // secondary text
    gray9: '#e7e5e4',   // primary text
    gray10: '#f5f5f4',  // bright text
    gray11: '#fafaf9',  // brightest
    gray12: '#ffffff',  // white

    // Stone palette - Light mode (12-step scale)
    lightGray1: '#fafaf9',  // background
    lightGray2: '#f5f5f4',  // card
    lightGray3: '#e7e5e4',  // elevated
    lightGray4: '#d6d3d1',  // border
    lightGray5: '#a8a29e',  // border hover
    lightGray6: '#78716c',  // muted
    lightGray7: '#57534e',  // disabled
    lightGray8: '#44403c',  // placeholder
    lightGray9: '#292524',  // secondary text
    lightGray10: '#1c1917', // primary text
    lightGray11: '#0c0a09', // darkest text
    lightGray12: '#000000', // black

    // Primary - using Stone foreground as primary (neutral, not colored)
    // This follows shadcn Mira convention where primary is the foreground color
    primary1: '#fafaf9',
    primary2: '#f5f5f4',
    primary3: '#e7e5e4',
    primary4: '#d6d3d1',
    primary5: '#a8a29e',
    primary6: '#78716c',
    primary7: '#57534e',
    primary8: '#44403c',
    primary9: '#292524',
    primary10: '#1c1917',
    primary11: '#0c0a09',

    // Semantic colors (kept for functional use)
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
// THEMES (shadcn Mira / Stone style)
// ============================================================================

// ===== DARK THEME =====
const dark = {
  background: tokens.color.gray1,
  backgroundHover: tokens.color.gray2,
  backgroundPress: tokens.color.gray3,
  backgroundFocus: tokens.color.gray3,
  backgroundStrong: tokens.color.gray2,
  backgroundTransparent: 'rgba(12, 10, 9, 0)',

  color: tokens.color.gray11,
  colorHover: tokens.color.gray12,
  colorPress: tokens.color.gray10,
  colorFocus: tokens.color.gray11,
  colorTransparent: 'rgba(250, 250, 249, 0)',

  colorMuted: tokens.color.gray7,
  colorSubtle: tokens.color.gray8,

  borderColor: tokens.color.gray4,
  borderColorHover: tokens.color.gray5,
  borderColorPress: tokens.color.gray4,
  borderColorFocus: tokens.color.gray6,

  placeholderColor: tokens.color.gray6,

  // Primary colors (neutral - Stone foreground becomes primary in Mira style)
  primary: tokens.color.gray10,
  primaryHover: tokens.color.gray11,
  primaryPress: tokens.color.gray9,
  primaryForeground: tokens.color.gray1,

  // Secondary colors (muted backgrounds)
  secondary: tokens.color.gray3,
  secondaryHover: tokens.color.gray4,
  secondaryPress: tokens.color.gray5,
  secondaryForeground: tokens.color.gray11,

  // Muted colors
  muted: tokens.color.gray3,
  mutedForeground: tokens.color.gray7,

  // Semantic
  success: tokens.color.success,
  successSubtle: 'rgba(34, 197, 94, 0.15)',
  warning: tokens.color.warning,
  error: tokens.color.error,
  errorSubtle: 'rgba(239, 68, 68, 0.15)',
  destructive: tokens.color.error,
  destructiveForeground: tokens.color.gray11,

  // Shadows (minimal in dark mode)
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowColorHover: 'rgba(0,0,0,0.6)',

  // Ring (focus indicator)
  ring: tokens.color.gray6,
}

// Dark Card sub-theme
const dark_Card = {
  ...dark,
  background: tokens.color.gray2,
  backgroundHover: tokens.color.gray3,
  backgroundPress: tokens.color.gray4,
  borderColor: tokens.color.gray4,
}

// Dark Button sub-theme (primary style - inverted colors)
const dark_Button = {
  ...dark,
  background: tokens.color.gray10,
  backgroundHover: tokens.color.gray9,
  backgroundPress: tokens.color.gray8,
  color: tokens.color.gray1,
  colorHover: tokens.color.gray1,
  colorPress: tokens.color.gray2,
}

// Dark secondary/muted theme
const dark_secondary = {
  ...dark,
  background: tokens.color.gray3,
  backgroundHover: tokens.color.gray4,
  backgroundPress: tokens.color.gray5,
  color: tokens.color.gray11,
  borderColor: tokens.color.gray4,
}

// ===== LIGHT THEME =====
const light = {
  background: tokens.color.lightGray1,
  backgroundHover: tokens.color.lightGray2,
  backgroundPress: tokens.color.lightGray3,
  backgroundFocus: tokens.color.lightGray3,
  backgroundStrong: tokens.color.lightGray2,
  backgroundTransparent: 'rgba(250, 250, 249, 0)',

  color: tokens.color.lightGray11,
  colorHover: tokens.color.lightGray12,
  colorPress: tokens.color.lightGray10,
  colorFocus: tokens.color.lightGray11,
  colorTransparent: 'rgba(12, 10, 9, 0)',

  colorMuted: tokens.color.lightGray6,
  colorSubtle: tokens.color.lightGray8,

  borderColor: tokens.color.lightGray4,
  borderColorHover: tokens.color.lightGray5,
  borderColorPress: tokens.color.lightGray4,
  borderColorFocus: tokens.color.lightGray6,

  placeholderColor: tokens.color.lightGray5,

  // Primary colors (neutral - Stone foreground becomes primary in Mira style)
  primary: tokens.color.lightGray10,
  primaryHover: tokens.color.lightGray11,
  primaryPress: tokens.color.lightGray9,
  primaryForeground: tokens.color.lightGray1,

  // Secondary colors (muted backgrounds)
  secondary: tokens.color.lightGray3,
  secondaryHover: tokens.color.lightGray4,
  secondaryPress: tokens.color.lightGray5,
  secondaryForeground: tokens.color.lightGray11,

  // Muted colors
  muted: tokens.color.lightGray3,
  mutedForeground: tokens.color.lightGray6,

  // Semantic
  success: tokens.color.success,
  successSubtle: 'rgba(34, 197, 94, 0.15)',
  warning: tokens.color.warning,
  error: tokens.color.error,
  errorSubtle: 'rgba(239, 68, 68, 0.15)',
  destructive: tokens.color.error,
  destructiveForeground: tokens.color.lightGray1,

  // Shadows
  shadowColor: 'rgba(0,0,0,0.08)',
  shadowColorHover: 'rgba(0,0,0,0.12)',

  // Ring (focus indicator)
  ring: tokens.color.lightGray5,
}

// Light Card sub-theme
const light_Card = {
  ...light,
  background: tokens.color.lightGray1,
  backgroundHover: tokens.color.lightGray2,
  backgroundPress: tokens.color.lightGray3,
  borderColor: tokens.color.lightGray4,
}

// Light Button sub-theme (primary style - inverted colors)
const light_Button = {
  ...light,
  background: tokens.color.lightGray10,
  backgroundHover: tokens.color.lightGray11,
  backgroundPress: tokens.color.lightGray9,
  color: tokens.color.lightGray1,
  colorHover: tokens.color.lightGray1,
  colorPress: tokens.color.lightGray2,
}

// Light secondary/muted theme
const light_secondary = {
  ...light,
  background: tokens.color.lightGray3,
  backgroundHover: tokens.color.lightGray4,
  backgroundPress: tokens.color.lightGray5,
  color: tokens.color.lightGray11,
  borderColor: tokens.color.lightGray4,
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
    display: displayFont,
    heading: headingFont,
    body: bodyFont,
  },
  tokens,
  themes: {
    dark,
    dark_Card,
    dark_Button,
    dark_secondary,
    light,
    light_Card,
    light_Button,
    light_secondary,
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
export { tokens }
export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

// ============================================================================
// THEME CONSTANTS (for custom usage outside Tamagui)
// shadcn Mira style - compact, smaller radii
// ============================================================================
export const THEME_CONSTANTS = {
  // Border radius (Mira style - smaller, more compact)
  radiusNone: 0,
  radiusSmall: 4,    // compact corners
  radiusMedium: 6,   // default for most components
  radiusLarge: 8,    // larger elements like cards
  radiusFull: 9999,  // pills/circles

  // Component sizing (compact)
  buttonHeightSm: 32,
  buttonHeightMd: 36,
  buttonHeightLg: 44,
  inputHeight: 36,

  // Animation durations
  durationFast: 150,
  durationMedium: 200,
  durationSlow: 300,
} as const
