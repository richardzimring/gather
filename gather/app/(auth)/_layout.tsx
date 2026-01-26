import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

export default function AuthLayout() {
  const colorScheme = useColorScheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#ffffff',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  )
}
