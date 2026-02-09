import { CalendarPlus, Home, User, Users } from '@tamagui/lucide-icons'
import { Tabs } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useColorScheme, Platform, Pressable, GestureResponderEvent } from 'react-native'

// Tab bar colors based on theme
const COLORS = {
  dark: {
    background: '#0c0c0c',
    border: '#1a1a1a',
    active: '#3b82f6',
    inactive: '#737373',
  },
  light: {
    background: '#ffffff',
    border: '#e5e5e5',
    active: '#3b82f6',
    inactive: '#a3a3a3',
  },
}

interface TabBarButtonProps {
  children: React.ReactNode
  onPress?: (e: GestureResponderEvent | React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
  accessibilityState?: { selected?: boolean }
}

function HapticTabButton({
  children,
  onPress,
  accessibilityState,
  ...props
}: TabBarButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress?.(e)
  }

  return (
    <Pressable
      onPress={handlePress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}
    >
      {children}
    </Pressable>
  )
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = COLORS[colorScheme]

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarButton: (props) => <HapticTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <CalendarPlus size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
