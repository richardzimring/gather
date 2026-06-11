import { useMemo } from 'react';
import { Animated, useAnimatedValue } from 'react-native';

interface ScrollGradientResult {
  gradientOpacity: Animated.AnimatedInterpolation<number>;
  scrollProps: {
    onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
    scrollEventThrottle: number;
  };
}

/**
 * Drives the page gradient opacity based on scroll position.
 * The gradient fades out over the first 200px of downward scroll,
 * and remains fully visible when the user pulls to refresh.
 */
export function useScrollGradient(): ScrollGradientResult {
  const scrollY = useAnimatedValue(0);
  const gradientOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );

  return {
    gradientOpacity,
    scrollProps: {
      onScroll: (e) => scrollY.setValue(e.nativeEvent.contentOffset.y),
      scrollEventThrottle: 16,
    },
  };
}
