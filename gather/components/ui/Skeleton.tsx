import { useEffect } from 'react';
import { Animated, Easing, ViewStyle, useAnimatedValue } from 'react-native';

/**
 * Pulsing skeleton bar used as a loading placeholder.
 * Extracted from plan.tsx for reuse across the app.
 */
export function SkeletonBar({
  width,
  height = 14,
  borderRadius = 6,
  style,
}: {
  width: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useAnimatedValue(0.3);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#888',
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Pulsing skeleton circle used for avatar placeholders.
 */
export function SkeletonCircle({
  size,
  style,
}: {
  size: number;
  style?: ViewStyle;
}) {
  const opacity = useAnimatedValue(0.3);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#888',
          opacity,
        },
        style,
      ]}
    />
  );
}
