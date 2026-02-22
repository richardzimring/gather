import { StyleSheet, View, useColorScheme } from 'react-native';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GlassBottomBarProps {
  children: React.ReactNode;
}

/**
 * Fixed bottom action bar with Liquid Glass effect.
 * Use for persistent actions like RSVP buttons or form submit buttons.
 * Falls back to a translucent background on platforms below iOS 26.
 */
export function GlassBottomBar({ children }: GlassBottomBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const useGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  const paddingBottom = Math.max(insets.bottom, 16);

  const fallbackBg =
    colorScheme === 'dark'
      ? 'rgba(28, 28, 30, 0.95)'
      : 'rgba(242, 242, 247, 0.95)';

  if (useGlass) {
    return (
      <GlassView style={[styles.bar, { paddingBottom }]}>{children}</GlassView>
    );
  }

  return (
    <View
      style={[
        styles.bar,
        styles.fallbackBorder,
        { paddingBottom, backgroundColor: fallbackBg },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  fallbackBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.15)',
  },
});
