import { Animated, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  style?: object;
}

export function GradientBackground({ style }: GradientBackgroundProps = {}) {
  const colorScheme = useColorScheme();

  // The gradient is a dark-mode accent only
  if (colorScheme !== 'dark') return null;

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[
          'rgba(130,80,220,0.22)',
          'rgba(80,60,200,0.10)',
          'rgba(0,0,0,0)',
        ]}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
    </Animated.View>
  );
}
