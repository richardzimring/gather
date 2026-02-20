import { router } from "expo-router";
import { ScrollView, Text, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackHeader } from "../../components/ui/ScreenHeader";

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
            Last updated: February 19, 2026
          </Text>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Introduction
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"Gather (\"we,\" \"our,\" or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application."}
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
              specifically, calendar names and event start/end times with
              free/busy status. See the calendar sections below for full
              details.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Location Information
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"With your permission, we may collect your device's location to provide location-based search results when creating events. This information is used only to improve search relevance and is not stored on our servers."}
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
              {"We use your information to:\n\u2022 Provide and maintain the app\n\u2022 Facilitate event planning and coordination with your friends\n\u2022 Send you notifications about events and social activity\n\u2022 Improve and personalize your experience\n\u2022 Respond to your requests and inquiries"}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Google Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Google Calendar. If you
              choose to connect your Google account, we request read-only access
              (calendar.readonly scope) to your Google Calendar data.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"Using this access, we read:\n\u2022 Your Google account name and email — to identify which account is connected.\n\u2022 Your calendar names and colors — so you can select which calendars to include.\n\u2022 Event start/end times and free/busy status — to show your availability. We do not read or store event titles, descriptions, locations, or attendees."}
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"Your Google data is used only for availability. We do not sell or share it with third parties. OAuth tokens are stored securely on our servers. You can disconnect at any time from app settings.\n\nOur use of Google data adheres to the Google API Services User Data Policy, including the Limited Use requirements."}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Outlook Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Microsoft Outlook
              Calendar. If you choose to connect your Outlook account, we
              request Calendars.Read (read-only) and offline_access scopes.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"Using this access, we read:\n\u2022 Your Microsoft account name and email — to identify which account is connected.\n\u2022 Your calendar names and colors — so you can select which calendars to include.\n\u2022 Event start/end times and free/busy status — to show your availability. We do not read or store event titles, descriptions, locations, or attendees."}
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Your Microsoft data is used only for availability. We do not sell
              or share it with third parties. OAuth tokens are stored securely
              on our servers. You can disconnect at any time from app settings.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Apple Calendar Integration
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers an optional integration with Apple Calendar on your
              iOS device using native calendar permissions — no OAuth or
              third-party account connection is required.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"If you grant calendar access, we read:\n\u2022 Calendar names — so you can select which calendars to include.\n\u2022 Event start/end times and free/busy status — to show your availability. Only availability data is sent to our servers; event titles, descriptions, and locations are not stored."}
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              With your permission, Gather can also add events to your Apple
              Calendar (for example, to save a Gather event to your device).
              This action is always initiated by you. You can revoke access at
              any time in iOS Settings under Privacy &amp; Security → Calendars.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Data Sharing
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"We do not sell your personal information. We share your information only with other Gather users as part of the app's core functionality (e.g., your name and availability with friends you've connected with). Calendar data is used only to compute your free/busy availability — individual event details are never shared with other users."}
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
              {"We may update this Privacy Policy from time to time. We will notify you of any changes by updating the \"Last updated\" date at the top of this policy."}
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
