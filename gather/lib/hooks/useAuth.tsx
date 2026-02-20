import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useQueryClient } from '@tanstack/react-query'

import { setAuthToken, setup401Interceptor, getAuthMe, postAuthAppleCallback, type User } from '../api/client'
import { DEV_APPLE_USER_ID } from '../config'

const AUTH_TOKEN_KEY = 'gather_auth_token'
const APPLE_USER_ID_KEY = 'gather_apple_user_id'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

interface AuthState {
  user: User | null
  status: AuthStatus
}

interface AuthContextValue extends AuthState {
  // Computed properties
  isLoading: boolean
  isAuthenticated: boolean

  // Auth methods
  signInWithApple: () => Promise<{ isNewUser: boolean } | undefined>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Auth provider component that wraps the app and provides auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: 'loading',
  })
  const queryClient = useQueryClient()

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth()
  }, [])

  const handleUnauthorized = useCallback(async () => {
    setup401Interceptor(null)
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(APPLE_USER_ID_KEY),
    ])
    setAuthToken(null)
    queryClient.clear()
    setState({ user: null, status: 'unauthenticated' })
  }, [queryClient])

  const loadStoredAuth = async () => {
    try {
      // Check for stored token
      let token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY)

      // In dev mode, auto-inject a dev token if none exists
      if (__DEV__ && !token && DEV_APPLE_USER_ID) {
        token = `dev-${DEV_APPLE_USER_ID}`
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
        console.log('Dev mode: Auto-injected dev auth token')
      }

      if (token) {
        setAuthToken(token)

        // Try to refresh user data
        try {
          const response = await getAuthMe()
          if (response.data?.success) {
            setup401Interceptor(handleUnauthorized)
            setState({
              user: response.data.data.user,
              status: 'authenticated',
            })
            return
          }
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }

        // Token is invalid, clear it
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
        await SecureStore.deleteItemAsync(APPLE_USER_ID_KEY)
        setAuthToken(null)
      }

      setState({
        user: null,
        status: 'unauthenticated',
      })
    } catch (error) {
      console.error('Failed to load stored auth:', error)
      setState({
        user: null,
        status: 'unauthenticated',
      })
    }
  }

  const refreshUser = useCallback(async () => {
    try {
      const response = await getAuthMe()
      if (response.data?.success) {
        setState((prev) => ({
          ...prev,
          user: response.data.data.user,
          status: 'authenticated',
        }))
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // Token might be invalid, clear it in parallel
      await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(APPLE_USER_ID_KEY),
      ])
      setAuthToken(null)
      setState({
        user: null,
        status: 'unauthenticated',
      })
    }
  }, [])

  /**
   * Sign in with Apple
   */
  const signInWithApple = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))

    try {
      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple')
      }

      // Extract first and last name from Apple (only provided on first sign-in)
      const firstName = credential.fullName?.givenName ?? undefined
      const lastName = credential.fullName?.familyName ?? undefined

      // Send to backend for verification and user creation/lookup
      const response = await postAuthAppleCallback({
        body: {
          identityToken: credential.identityToken,
          user: {
            email: credential.email ?? undefined,
            name: {
              firstName,
              lastName,
            },
          },
        },
      })

      if (response.data?.success) {
        const { user, token, isNewUser } = response.data.data

        // Store the token and Apple user ID
        await Promise.all([
          SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
          SecureStore.setItemAsync(APPLE_USER_ID_KEY, credential.user),
        ])
        setAuthToken(token)
        setup401Interceptor(handleUnauthorized)

        setState({
          user,
          status: 'authenticated',
        })

        return { isNewUser: isNewUser ?? false }
      } else {
        throw new Error('Failed to authenticate with backend')
      }
    } catch (error) {
      console.error('Sign in with Apple failed:', error)
      setState((prev) => ({ ...prev, status: 'unauthenticated' }))
      throw error
    }
  }, [])

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    setup401Interceptor(null)

    // Clear stored tokens in parallel
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(APPLE_USER_ID_KEY),
    ])
    setAuthToken(null)

    // Clear query cache
    queryClient.clear()

    setState({
      user: null,
      status: 'unauthenticated',
    })
  }, [queryClient])

  // Computed properties
  const isLoading = state.status === 'loading'
  const isAuthenticated = state.status === 'authenticated'

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isLoading,
        isAuthenticated,
        signInWithApple,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth state and methods.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook that returns true only when auth is ready (not loading).
 */
export function useAuthReady() {
  const { isLoading } = useAuth()
  return !isLoading
}
