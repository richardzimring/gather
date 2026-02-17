import { Pressable, StyleSheet, useColorScheme } from 'react-native'
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect'
import { YStack } from 'tamagui'
import { haptic } from '../../lib/haptics'

interface GlassButtonProps {
  /** Icon element to display inside the button */
  icon: React.ReactNode
  /** Press handler */
  onPress: () => void
  /** Button diameter (defaults to 40) */
  size?: number
}

/**
 * Circular button with Liquid Glass effect.
 * Use in headers for primary actions (create, add, etc.).
 * Falls back to a translucent background on platforms below iOS 26.
 */
export function GlassButton({ icon, onPress, size = 40 }: GlassButtonProps) {
  const colorScheme = useColorScheme()
  const useGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()

  const handlePress = () => {
    haptic.light()
    onPress()
  }

  const fallbackBg =
    colorScheme === 'dark'
      ? 'rgba(58, 58, 60, 0.85)'
      : 'rgba(242, 242, 247, 0.85)'

  const glassStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {useGlass ? (
        <GlassView style={glassStyle} isInteractive>
          <YStack
            alignItems="center"
            justifyContent="center"
            width={size}
            height={size}
          >
            {icon}
          </YStack>
        </GlassView>
      ) : (
        <YStack
          alignItems="center"
          justifyContent="center"
          width={size}
          height={size}
          borderRadius={size / 2}
          style={{ backgroundColor: fallbackBg }}
        >
          {icon}
        </YStack>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.9 }],
  },
})
