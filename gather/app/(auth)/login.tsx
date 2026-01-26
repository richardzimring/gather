import { useState, useEffect } from 'react'
import { H1, Text, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Platform, useColorScheme } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'

import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { useAuth } from '../../lib/hooks/useAuth'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const { signInWithApple, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false)

  useEffect(() => {
    // Check if Apple Authentication is available on this device
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable)
  }, [])

  const handleAppleSignIn = async () => {
    setError(null)

    try {
      await signInWithApple()
      // Navigation handled by auth state change in index.tsx
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow, don't show error
        return
      }
      console.error('Apple Sign In error:', err)
      setError('Failed to sign in with Apple. Please try again.')
    }
  }

  return (
    <DottedGridBackground>
      <YStack
        flex={1}
        paddingTop={insets.top + 60}
        paddingBottom={insets.bottom + 40}
        paddingHorizontal="$4"
        justifyContent="space-between"
      >
        {/* Header */}
        <YStack gap="$3" alignItems="center">
          <Text fontSize={64}>👋</Text>
          <H1 fontSize={32} fontWeight="700" textAlign="center">
            Welcome to Gather
          </H1>
          <Text
            color="$colorMuted"
            fontSize={16}
            lineHeight={24}
            textAlign="center"
            maxWidth={300}
          >
            Coordinate plans with friends and find the perfect time to hang out.
          </Text>
        </YStack>

        {/* Sign In Section */}
        <YStack gap="$4" alignItems="center">
          {error && (
            <Text color="$red10" fontSize={14} textAlign="center">
              {error}
            </Text>
          )}

          {Platform.OS === 'ios' && isAppleAuthAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                colorScheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={{
                width: 280,
                height: 50,
              }}
              onPress={handleAppleSignIn}
            />
          ) : (
            <YStack
              backgroundColor="$backgroundHover"
              padding="$4"
              borderRadius="$3"
              alignItems="center"
              gap="$2"
            >
              <Text color="$colorMuted" fontSize={14} textAlign="center">
                Sign in with Apple is only available on iOS devices.
              </Text>
              {__DEV__ && (
                <Text color="$yellow10" fontSize={12} textAlign="center">
                  Dev mode: Use Expo Go on an iOS device to test.
                </Text>
              )}
            </YStack>
          )}

          {isLoading && (
            <Text color="$colorMuted" fontSize={14}>
              Signing in...
            </Text>
          )}
        </YStack>

        {/* Footer */}
        <YStack alignItems="center" gap="$2">
          <Text color="$colorMuted" fontSize={12} textAlign="center" maxWidth={300}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </YStack>
      </YStack>
    </DottedGridBackground>
  )
}
