import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { LoaderCircle } from '@tamagui/lucide-icons';
import { useTheme } from 'tamagui';

type SpinnerProps = {
  size?: 'small' | 'large';
  color?: string;
};

/**
 * Animated spinner built on LoaderCircle icon.
 * Drop-in replacement for Tamagui's Spinner with the same size/color API.
 */
export function Spinner({ size = 'small', color }: SpinnerProps) {
  const rotate = useRef(new Animated.Value(0)).current;
  const theme = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const px = size === 'large' ? 32 : 16;

  // Resolve Tamagui token (e.g. "$accent") to a raw color value
  const resolvedColor = color?.startsWith('$')
    ? ((theme[color.slice(1) as keyof typeof theme] as any)?.val ?? '#888')
    : (color ?? '#888');

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <LoaderCircle size={px} color={resolvedColor} />
    </Animated.View>
  );
}
