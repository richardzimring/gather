import { useEffect } from 'react';
import { Animated, Easing, ViewStyle, useAnimatedValue } from 'react-native';
import { useTheme } from 'tamagui';

/**
 * Pulsing placeholder primitive shared by the skeleton shapes below.
 */
function Pulse({ style }: { style: ViewStyle[] }) {
  const opacity = useAnimatedValue(0.3);
  const theme = useTheme();

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
      style={[{ backgroundColor: theme.colorMuted.val, opacity }, ...style]}
    />
  );
}

/**
 * Pulsing skeleton bar used as a loading placeholder.
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
  return <Pulse style={[{ width, height, borderRadius }, style ?? {}]} />;
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
  return (
    <Pulse
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        style ?? {},
      ]}
    />
  );
}
