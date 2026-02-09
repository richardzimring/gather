import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { DynamicColorIOS, useColorScheme } from 'react-native'

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        labelStyle={{
          color: DynamicColorIOS({
            dark: 'white',
            light: 'black',
          }),
        }}
        tintColor={DynamicColorIOS({
          dark: 'white',
          light: 'black',
        })}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="plan">
          <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'calendar.badge.plus', selected: 'calendar.badge.plus' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="friends">
          <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}
