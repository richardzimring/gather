import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

import { tokens } from '../../tamagui.config'

export default function AuthLayout() {
  const colorScheme = useColorScheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? tokens.color.gray1.val : tokens.color.lightGray1.val,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  )
}
