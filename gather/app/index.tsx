import { Redirect } from 'expo-router'
import { Spinner, YStack } from 'tamagui'

import { useAuth } from '../lib/hooks/useAuth'
import { DottedGridBackground } from '../components/ui/DottedGridBackground'

/**
 * Root index handles auth-based routing.
 */
export default function Index() {
  const { isLoading, isAuthenticated } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <DottedGridBackground>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$accent" />
        </YStack>
      </DottedGridBackground>
    )
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}
