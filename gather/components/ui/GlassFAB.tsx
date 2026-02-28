import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { YStack } from 'tamagui';
import { haptic } from '../../lib/haptics';

export interface GlassButtonProps {
  /** Icon element to display inside the button */
  icon: React.ReactNode;
  /** Press handler */
  onPress: () => void;
  /** Button diameter (defaults to 40) */
  size?: number;
  /** Disable the button */
  disabled?: boolean;
}

/**
 * Circular button with Liquid Glass effect.
 * Use in headers for primary actions (create, add, etc.).
 * Falls back to a translucent background on platforms below iOS 26.
 */
export function GlassButton({
  icon,
  onPress,
  size = 40,
  disabled = false,
}: GlassButtonProps) {
  const colorScheme = useColorScheme();
  const useGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  const handlePress = () => {
    if (disabled) return;
    haptic.light();
    onPress();
  };

  const fallbackBg =
    colorScheme === 'dark'
      ? 'rgba(58, 58, 60, 0.85)'
      : 'rgba(242, 242, 247, 0.85)';

  const glassStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      disabled={disabled}
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
          style={{ backgroundColor: fallbackBg, opacity: disabled ? 0.5 : 1 }}
        >
          {icon}
        </YStack>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
