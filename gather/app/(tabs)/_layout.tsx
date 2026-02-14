import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { useMemo } from 'react'
import { DynamicColorIOS, useColorScheme } from 'react-native'

import { useAuth } from '../../lib/hooks/useAuth'
import { useEvents, useFriends, useNotifications } from '../../lib/hooks'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const { user } = useAuth()

  // Register push token and set up notification listeners
  useNotifications()

  // Pending event invitations (where user is invitee with status "pending" and not the host)
  const { data: events } = useEvents()
  const pendingEventCount = useMemo(() => {
    return (
      events?.filter((event) => {
        const userInvitee = event.invitees.find(
          (i) => i.userId === user?.userId && i.status === 'pending'
        )
        return userInvitee && event.hostId !== user?.userId
      }).length ?? 0
    )
  }, [events, user?.userId])

  // Pending friend requests received
  const { data: friendsData } = useFriends()
  const pendingFriendCount = useMemo(
    () => friendsData?.pendingReceived?.length ?? 0,
    [friendsData]
  )

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
          {pendingEventCount > 0 && (
            <NativeTabs.Trigger.Badge>
              {String(pendingEventCount)}
            </NativeTabs.Trigger.Badge>
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="plan">
          <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'calendar.badge.plus', selected: 'calendar.badge.plus' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="friends">
          <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          {pendingFriendCount > 0 && (
            <NativeTabs.Trigger.Badge>
              {String(pendingFriendCount)}
            </NativeTabs.Trigger.Badge>
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}
