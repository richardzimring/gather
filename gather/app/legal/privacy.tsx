import { router } from 'expo-router';
import { ScrollView, Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '../../components/ui/ScreenHeader';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        <BackHeader title="Privacy Policy" onBack={() => router.back()} />

        <YStack gap="$4">
          <Text color="$colorMuted" fontSize={13}>
            Last updated: February 28, 2026
          </Text>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Introduction
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'Gather ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.'
              }
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Information We Collect
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We collect information that you provide directly to us when you
              create an account, including your name, email address, and Apple
              ID. We also collect information about your use of the app,
              including events you create, friendships you establish, and
              availability windows you set.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you choose to connect a third-party calendar (Google Calendar,
              Outlook Calendar, or Apple Calendar), we collect the minimum
              calendar data necessary to determine your availability —
              specifically, calendar names and free/busy time intervals. See the
              calendar sections below for full details.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Location Information
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                "With your permission, we may collect your device's location to provide location-based search results when creating events. This information is used only to improve search relevance and is not stored on our servers."
              }
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Push Notifications
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              With your consent, we send push notifications to keep you informed
              about event invitations, friend requests, and updates to your
              plans. You can manage your notification preferences in the app
              settings at any time.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              How We Use Your Information
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'We use your information to:\n\u2022 Provide and maintain the app\n\u2022 Facilitate event planning and coordination with your friends\n\u2022 Send you notifications about events and social activity\n\u2022 Improve and personalize your experience\n\u2022 Respond to your requests and inquiries'
              }
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Google Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Google Calendar. If you
              choose to connect your Google account, we request the following
              OAuth scopes for calendar availability:
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                '\u2022 calendar.calendarlist.readonly — read-only access to your list of Google calendars.\n\u2022 calendar.freebusy — read-only access to free/busy availability on your calendars.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'Using these scopes, we read your calendar names and colors (so you can select which to include) and free/busy time intervals (to show your availability to friends). We do not read or store event titles, descriptions, locations, or attendees.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you additionally enable the optional Google Calendar export
              feature, we also request:
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                '\u2022 calendar.app.created — allows Gather to create and manage a dedicated secondary calendar named "Gather" in your Google account, and to create, update, and delete events within that calendar.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'When export is enabled, Gather writes your Gather event details — including title, date and time, location, notes, and the names of other attendees — into your "Gather" Google calendar. This data is written solely to keep your Google calendar in sync with your Gather events. We do not read events from your existing Google calendars beyond the free/busy data described above.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'We do not sell or share your Google data with third parties. OAuth tokens are stored securely on our servers. You can disconnect at any time from app settings, which permanently revokes our access and removes all exported events.\n\nOur use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.'
              }
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Outlook Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Microsoft Outlook
              Calendar. If you choose to connect your Outlook account for
              calendar availability, we request the following OAuth scopes:
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                '\u2022 Calendars.Read — read-only access to your Outlook calendar data.\n\u2022 offline_access — allows us to refresh your calendar data in the background without requiring you to re-authorize.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'Using these scopes, we read your Microsoft account name and email (to identify which account is connected), your calendar names and colors (so you can select which to include), and event start/end times and free/busy status (to show your availability). We do not read or store event titles, descriptions, locations, or attendees.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you additionally enable the optional Outlook Calendar export
              feature, we request Calendars.ReadWrite instead of Calendars.Read.
              This allows Gather to create a dedicated secondary calendar named
              &quot;Gather&quot; in your Outlook account, and to create, update,
              and delete events within that calendar.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'When export is enabled, Gather writes your Gather event details — including title, date and time, location, notes, and the names of other attendees — into your "Gather" Outlook calendar. This data is written solely to keep your Outlook calendar in sync with your Gather events.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We do not sell or share your Microsoft data with third parties.
              OAuth tokens are stored securely on our servers. You can
              disconnect at any time from app settings, which permanently
              revokes our access and removes all exported events.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Apple Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Apple Calendar on your
              iOS device using native iOS calendar permissions — no OAuth or
              third-party account connection is required.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'If you grant calendar access, we read:\n\u2022 Calendar names — so you can select which calendars to include.\n\u2022 Event start/end times and free/busy status — to show your availability. Only availability data is sent to our servers; event titles, descriptions, and locations are not stored.'
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you enable the optional Apple Calendar export feature, Gather
              will create a dedicated calendar named &quot;Gather&quot; on your
              device and automatically sync your Gather events into it. Events
              written to this calendar include the event title, date and time,
              location, notes, and the names of other attendees. This sync runs
              automatically in the background whenever your events change. You
              can disable export at any time from the calendar settings screen,
              which will delete the &quot;Gather&quot; calendar and all its
              events from your device.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              You can revoke Apple Calendar access entirely at any time in iOS
              Settings under Privacy &amp; Security → Calendars.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Data Sharing
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                "We do not sell your personal information. We share your information only with other Gather users as part of the app's core functionality (e.g., your name and availability with friends you've connected with). Calendar data imported from your connected calendars is used only to compute your free/busy availability — individual event details from your external calendars are never shared with other users."
              }
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you enable calendar export, your Gather event details (title,
              time, location, notes, and attendee names) are written to your
              connected calendar account. This data is sent to Google or
              Microsoft solely on your behalf to populate your personal calendar
              — it is not shared with any other third party.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Data Retention and Deletion
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We retain your information for as long as your account is active.
              You can delete your account at any time from the Profile screen,
              which will permanently remove all your data from our servers.
              Disconnecting a calendar integration immediately deletes all
              cached calendar data and OAuth tokens associated with that
              connection.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Security
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We implement appropriate technical and organizational measures to
              protect your personal information. Account creation and
              authentication is handled through Apple Sign In. Optional Google
              and Outlook calendar integrations use OAuth 2.0 — authorization
              codes are exchanged server-side and access tokens are stored
              securely in our database. All data is transmitted over encrypted
              connections.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              {"Children's Privacy"}
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather is not intended for children under the age of 13. We do not
              knowingly collect personal information from children under 13. If
              we learn that we have collected information from a child under 13,
              we will delete that information promptly.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Changes to This Policy
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {
                'We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this policy.'
              }
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Contact Us
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you have any questions about this Privacy Policy, please
              contact us at support@gather.app.
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
