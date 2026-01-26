import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useColorScheme } from 'react-native'
import { TamaguiProvider, Theme } from 'tamagui'

import { config } from '../tamagui.config'
import { AuthProvider } from './hooks/useAuth'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

interface AppProvidersProps {
  children: React.ReactNode
}

/**
 * Root providers wrapper for the app.
 * Includes Tamagui (theming), TanStack Query (data fetching), and Auth.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme()

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme={colorScheme ?? 'dark'}>
        <Theme name={colorScheme ?? 'dark'}>
          <AuthProvider>{children}</AuthProvider>
        </Theme>
      </TamaguiProvider>
    </QueryClientProvider>
  )
}
