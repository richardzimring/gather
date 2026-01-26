import { LinearGradient } from '@tamagui/linear-gradient'
import { useColorScheme } from 'react-native'
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg'
import { YStack, useTheme } from 'tamagui'

import { THEME_CONSTANTS } from '../../tamagui.config'

interface DottedGridBackgroundProps {
  children: React.ReactNode
  /** Whether to show the dotted grid overlay */
  showGrid?: boolean
  /** Whether to show the gradient */
  showGradient?: boolean
}

/**
 * A background component with a subtle dotted grid pattern and gradient.
 * Wraps content with the app's signature visual style.
 */
export function DottedGridBackground({
  children,
  showGrid = true,
  showGradient = true,
}: DottedGridBackgroundProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const { gridDotSize, gridDotOpacity, gridDotSpacing } = THEME_CONSTANTS

  // Grid dot color based on theme
  const dotColor = isDark ? 'white' : 'black'
  const dotOpacity = isDark ? gridDotOpacity : gridDotOpacity * 0.6

  // Gradient colors
  const gradientColors = isDark
    ? ['$gray1', '$gray3']
    : ['$background', '$backgroundHover']

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Gradient base */}
      {showGradient && (
        <LinearGradient
          colors={gradientColors}
          start={[0, 0]}
          end={[1, 1]}
          fullscreen
        />
      )}

      {/* Dotted grid overlay */}
      {showGrid && (
        <YStack fullscreen pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="dotGrid"
                width={gridDotSpacing}
                height={gridDotSpacing}
                patternUnits="userSpaceOnUse"
              >
                <Circle
                  cx={gridDotSpacing / 2}
                  cy={gridDotSpacing / 2}
                  r={gridDotSize / 2}
                  fill={dotColor}
                  opacity={dotOpacity}
                />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dotGrid)" />
          </Svg>
        </YStack>
      )}

      {/* Content */}
      <YStack flex={1}>{children}</YStack>
    </YStack>
  )
}
