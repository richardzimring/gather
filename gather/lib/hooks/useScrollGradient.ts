import { useRef } from 'react';
import { Animated } from 'react-native';

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
  const scrollY = useRef(new Animated.Value(0)).current;
  const gradientOpacity = useRef(
    scrollY.interpolate({
      inputRange: [0, 200],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  ).current;

  return {
    gradientOpacity,
    scrollProps: {
      onScroll: (e) => scrollY.setValue(e.nativeEvent.contentOffset.y),
      scrollEventThrottle: 16,
    },
  };
}
