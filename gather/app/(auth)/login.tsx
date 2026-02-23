import { useState, useEffect, useRef } from 'react';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Platform,
  useColorScheme,
  Animated,
  Dimensions,
  StyleSheet,
  View,
  Image,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Path } from 'react-native-svg';

import { useAuth } from '../../lib/hooks/useAuth';

const { width: W, height: H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Blob morphing engine
// Each blob defines a series of SVG path keyframes it loops through.
// We tween the path string character-by-character by decomposing into numbers.
// ─────────────────────────────────────────────────────────────────────────────

// Extract all numbers from an SVG path string
function extractNumbers(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

// Reconstruct path string from numbers, preserving the template structure
function reconstructPath(template: string, values: number[]): string {
  let i = 0;
  return template.replace(/-?\d+(\.\d+)?/g, () => {
    const v = values[i++];
    return v !== undefined ? Math.round(v).toString() : '0';
  });
}

// Interpolate two number arrays
function lerpNumbers(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * t);
}

// Easing: smoothstep
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Blob keyframe paths — organic, asymmetric shapes centered around a point.
// These are hand-crafted blobs that morph through each other.
// ─────────────────────────────────────────────────────────────────────────────

// Blob A — upper left, large, violet
const BLOB_A_FRAMES = [
  `M${W * 0.15},${H * 0.0} C${W * 0.55},${H * -0.08} ${W * 0.75},${H * 0.18} ${W * 0.62},${H * 0.38} C${W * 0.5},${H * 0.56} ${W * 0.18},${H * 0.52} ${W * 0.02},${H * 0.38} C${W * -0.14},${H * 0.22} ${W * -0.2},${H * 0.06} ${W * 0.15},${H * 0.0} Z`,
  `M${W * 0.22},${H * -0.04} C${W * 0.58},${H * -0.12} ${W * 0.82},${H * 0.12} ${W * 0.7},${H * 0.34} C${W * 0.58},${H * 0.54} ${W * 0.28},${H * 0.58} ${W * 0.08},${H * 0.42} C${W * -0.1},${H * 0.28} ${W * -0.14},${H * 0.08} ${W * 0.22},${H * -0.04} Z`,
  `M${W * 0.1},${H * 0.02} C${W * 0.48},${H * -0.06} ${W * 0.72},${H * 0.22} ${W * 0.58},${H * 0.44} C${W * 0.44},${H * 0.62} ${W * 0.12},${H * 0.56} ${W * -0.04},${H * 0.4} C${W * -0.18},${H * 0.24} ${W * -0.26},${H * 0.1} ${W * 0.1},${H * 0.02} Z`,
];

// Blob B — right side, mid-screen, indigo/blue
const BLOB_B_FRAMES = [
  `M${W * 0.9},${H * 0.25} C${W * 1.1},${H * 0.38} ${W * 1.08},${H * 0.6} ${W * 0.88},${H * 0.68} C${W * 0.68},${H * 0.76} ${W * 0.5},${H * 0.64} ${W * 0.52},${H * 0.46} C${W * 0.54},${H * 0.28} ${W * 0.7},${H * 0.14} ${W * 0.9},${H * 0.25} Z`,
  `M${W * 0.95},${H * 0.2} C${W * 1.18},${H * 0.34} ${W * 1.12},${H * 0.58} ${W * 0.92},${H * 0.7} C${W * 0.72},${H * 0.8} ${W * 0.52},${H * 0.66} ${W * 0.54},${H * 0.48} C${W * 0.56},${H * 0.28} ${W * 0.74},${H * 0.08} ${W * 0.95},${H * 0.2} Z`,
  `M${W * 0.85},${H * 0.28} C${W * 1.06},${H * 0.42} ${W * 1.04},${H * 0.64} ${W * 0.84},${H * 0.72} C${W * 0.64},${H * 0.8} ${W * 0.46},${H * 0.62} ${W * 0.48},${H * 0.44} C${W * 0.5},${H * 0.24} ${W * 0.66},${H * 0.16} ${W * 0.85},${H * 0.28} Z`,
];

// Blob D — center/left mid-screen, teal/cyan
const BLOB_D_FRAMES = [
  `M${W * 0.0},${H * 0.36} C${W * 0.08},${H * 0.22} ${W * 0.32},${H * 0.26} ${W * 0.46},${H * 0.38} C${W * 0.58},${H * 0.5} ${W * 0.52},${H * 0.66} ${W * 0.34},${H * 0.7} C${W * 0.16},${H * 0.74} ${W * -0.06},${H * 0.62} ${W * 0.0},${H * 0.36} Z`,
  `M${W * -0.04},${H * 0.32} C${W * 0.06},${H * 0.18} ${W * 0.28},${H * 0.2} ${W * 0.44},${H * 0.34} C${W * 0.58},${H * 0.46} ${W * 0.56},${H * 0.64} ${W * 0.36},${H * 0.72} C${W * 0.18},${H * 0.78} ${W * -0.1},${H * 0.64} ${W * -0.04},${H * 0.32} Z`,
  `M${W * 0.04},${H * 0.4} C${W * 0.1},${H * 0.26} ${W * 0.34},${H * 0.28} ${W * 0.48},${H * 0.42} C${W * 0.6},${H * 0.54} ${W * 0.5},${H * 0.7} ${W * 0.3},${H * 0.74} C${W * 0.12},${H * 0.78} ${W * -0.04},${H * 0.6} ${W * 0.04},${H * 0.4} Z`,
];

// Blob C — bottom center, rose/mauve
const BLOB_C_FRAMES = [
  `M${W * 0.5},${H * 0.68} C${W * 0.74},${H * 0.64} ${W * 0.9},${H * 0.78} ${W * 0.82},${H * 0.9} C${W * 0.74},${H * 1.02} ${W * 0.48},${H * 1.04} ${W * 0.3},${H * 0.96} C${W * 0.12},${H * 0.88} ${W * 0.1},${H * 0.72} ${W * 0.5},${H * 0.68} Z`,
  `M${W * 0.45},${H * 0.64} C${W * 0.7},${H * 0.6} ${W * 0.88},${H * 0.76} ${W * 0.78},${H * 0.9} C${W * 0.68},${H * 1.04} ${W * 0.4},${H * 1.06} ${W * 0.22},${H * 0.98} C${W * 0.06},${H * 0.9} ${W * 0.06},${H * 0.7} ${W * 0.45},${H * 0.64} Z`,
  `M${W * 0.55},${H * 0.7} C${W * 0.78},${H * 0.68} ${W * 0.94},${H * 0.8} ${W * 0.86},${H * 0.94} C${W * 0.78},${H * 1.06} ${W * 0.52},${H * 1.08} ${W * 0.34},${H * 1.0} C${W * 0.16},${H * 0.92} ${W * 0.14},${H * 0.74} ${W * 0.55},${H * 0.7} Z`,
];

type BlobConfig = {
  frames: string[];
  gradientId: string;
  color1: string;
  color2: string;
  opacity: number;
  period: number; // ms per full cycle
  phaseOffset: number; // 0–1
};

const BLOBS: BlobConfig[] = [
  {
    frames: BLOB_A_FRAMES,
    gradientId: 'blobA',
    color1: 'rgba(130, 80, 220, 0.9)',
    color2: 'rgba(80, 60, 180, 0.0)',
    opacity: 0.28,
    period: 20000,
    phaseOffset: 0,
  },
  {
    frames: BLOB_B_FRAMES,
    gradientId: 'blobB',
    color1: 'rgba(60, 100, 230, 0.9)',
    color2: 'rgba(40, 80, 200, 0.0)',
    opacity: 0.22,
    period: 24000,
    phaseOffset: 0.33,
  },
  {
    frames: BLOB_C_FRAMES,
    gradientId: 'blobC',
    color1: 'rgba(190, 70, 150, 0.9)',
    color2: 'rgba(150, 50, 120, 0.0)',
    opacity: 0.2,
    period: 28000,
    phaseOffset: 0.66,
  },
  {
    frames: BLOB_D_FRAMES,
    gradientId: 'blobD',
    color1: 'rgba(40, 180, 180, 0.9)',
    color2: 'rgba(20, 140, 160, 0.0)',
    opacity: 0.16,
    period: 22000,
    phaseOffset: 0.5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MorphingBlob — drives path morphing via requestAnimationFrame + useState
// ─────────────────────────────────────────────────────────────────────────────

function MorphingBlob({ blob }: { blob: BlobConfig }) {
  const [currentPath, setCurrentPath] = useState(blob.frames[0]);
  const frameNumbersRef = useRef(blob.frames.map(extractNumbers));
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const frameNumbers = frameNumbersRef.current;
    const frameCount = blob.frames.length;
    const template = blob.frames[0];

    const tick = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now - blob.phaseOffset * blob.period;
      }
      const elapsed = (now - startTimeRef.current) % blob.period;
      const totalT = elapsed / blob.period; // 0–1 through full cycle

      // Which segment are we in?
      const segCount = frameCount; // loops back to frame 0
      const segDuration = 1 / segCount;
      const segIndex = Math.floor(totalT / segDuration);
      const segT = (totalT - segIndex * segDuration) / segDuration;
      const eased = smoothstep(segT);

      const fromIdx = segIndex % frameCount;
      const toIdx = (segIndex + 1) % frameCount;

      const interpolated = lerpNumbers(
        frameNumbers[fromIdx],
        frameNumbers[toIdx],
        eased,
      );
      setCurrentPath(reconstructPath(template, interpolated));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [blob]);

  return (
    <Path
      d={currentPath}
      fill={`url(#${blob.gradientId})`}
      opacity={blob.opacity}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuroraBackground — the full SVG canvas with all blobs + gradients
// ─────────────────────────────────────────────────────────────────────────────

function AuroraBackground({ isDark }: { isDark: boolean }) {
  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${W} ${H}`}
    >
      <Defs>
        {BLOBS.map((blob) => (
          <RadialGradient
            key={blob.gradientId}
            id={blob.gradientId}
            cx="40%"
            cy="40%"
            rx="60%"
            ry="60%"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0%" stopColor={blob.color1} />
            <Stop offset="100%" stopColor={blob.color2} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {BLOBS.map((blob) => (
        <MorphingBlob key={blob.gradientId} blob={blob} />
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { signInWithApple, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 1400,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 1200,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  const handleAppleSignIn = async () => {
    setError(null);
    try {
      const result = await signInWithApple();
      if (result?.isNewUser) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {/* Base gradient — deep, rich dark */}
      <LinearGradient
        colors={
          isDark
            ? ['#08060e', '#0d0a18', '#060410']
            : ['#f4f2fb', '#ede9f8', '#f0eef9']
        }
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Morphing aurora blobs */}
      <AuroraBackground isDark={isDark} />

      {/* Vignette — darkens edges so blobs feel ambient, not harsh */}
      <LinearGradient
        colors={
          isDark
            ? [
                'rgba(8,6,14,0.6)',
                'rgba(8,6,14,0.0)',
                'rgba(8,6,14,0.0)',
                'rgba(8,6,14,0.7)',
              ]
            : [
                'rgba(244,242,251,0.5)',
                'rgba(244,242,251,0.0)',
                'rgba(244,242,251,0.0)',
                'rgba(244,242,251,0.6)',
              ]
        }
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {/* Logo + Wordmark */}
        <YStack gap="$1" alignItems="center">
          <Image
            source={
              isDark
                ? require('../../assets/images/splash-icon-light.png')
                : require('../../assets/images/splash-icon-dark.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <YStack gap="$2" alignItems="center">
            <Text
              fontSize={44}
              fontWeight="700"
              textAlign="center"
              letterSpacing={-2}
              color={isDark ? 'rgba(255,255,255,0.92)' : 'rgba(12,10,9,0.9)'}
            >
              Gather
            </Text>
            <Text
              fontSize={16}
              lineHeight={25}
              textAlign="center"
              maxWidth={200}
              letterSpacing={0.08}
              color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(20,15,40,0.42)'}
            >
              Find the time to see the people you love.
            </Text>
          </YStack>
        </YStack>

        {/* Sign In + Footer — grouped at bottom */}
        <YStack gap="$5" alignItems="center">
          {/* Sign In */}
          <YStack gap="$4" alignItems="center">
            {Platform.OS === 'ios' && isAppleAuthAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            ) : (
              <YStack
                backgroundColor={
                  isDark ? 'rgba(130,80,220,0.08)' : 'rgba(100,60,200,0.06)'
                }
                padding="$4"
                borderRadius="$3"
                alignItems="center"
                gap="$2"
                borderWidth={1}
                borderColor={
                  isDark ? 'rgba(130,80,220,0.18)' : 'rgba(100,60,200,0.14)'
                }
              >
                <Text
                  color={
                    isDark ? 'rgba(255,255,255,0.45)' : 'rgba(12,10,9,0.45)'
                  }
                  fontSize={14}
                  textAlign="center"
                >
                  Sign in with Apple is only available on iOS devices.
                </Text>
                {__DEV__ && (
                  <Text color="$yellow10" fontSize={12} textAlign="center">
                    Dev mode: Use Expo Go on an iOS device to test.
                  </Text>
                )}
              </YStack>
            )}

            <YStack height={22} justifyContent="center" alignItems="center">
              {error && (
                <Text color="$red10" fontSize={14} textAlign="center">
                  {error}
                </Text>
              )}
              {isLoading && (
                <Text
                  color={
                    isDark ? 'rgba(255,255,255,0.35)' : 'rgba(12,10,9,0.35)'
                  }
                  fontSize={14}
                >
                  Signing in...
                </Text>
              )}
            </YStack>
          </YStack>

          {/* Footer */}
          <YStack alignItems="center">
            <Text
              color={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(12,10,9,0.25)'}
              fontSize={12}
              textAlign="center"
              maxWidth={300}
            >
              By continuing, you agree to our{' '}
              <Link href="/legal/terms" asChild>
                <Text
                  color={
                    isDark ? 'rgba(255,255,255,0.4)' : 'rgba(12,10,9,0.42)'
                  }
                  fontSize={12}
                  textDecorationLine="underline"
                  pressStyle={{ opacity: 0.6 }}
                >
                  Terms of Service
                </Text>
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" asChild>
                <Text
                  color={
                    isDark ? 'rgba(255,255,255,0.4)' : 'rgba(12,10,9,0.42)'
                  }
                  fontSize={12}
                  textDecorationLine="underline"
                  pressStyle={{ opacity: 0.6 }}
                >
                  Privacy Policy
                </Text>
              </Link>
            </Text>
          </YStack>
        </YStack>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  appleButton: {
    width: 280,
    height: 52,
  },
  logo: {
    width: 72,
    height: 72,
  },
});
