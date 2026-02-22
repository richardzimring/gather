import { Redirect } from 'expo-router';
import { YStack } from 'tamagui';

import { useAuth } from '../lib/hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';

/**
 * Root index handles auth-based routing.
 */
export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="large" color="$accent" />
      </YStack>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
