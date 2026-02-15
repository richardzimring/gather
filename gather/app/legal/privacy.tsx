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
            Last updated: February 14, 2026
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
              {"We use your information to:\n- Provide and maintain the app\n- Facilitate event planning and coordination with your friends\n- Send you notifications about events and social activity\n- Improve and personalize your experience\n- Respond to your requests and inquiries"}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Data Sharing
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"We do not sell your personal information. We share your information only with other Gather users as part of the app's core functionality (e.g., your name and availability with friends you've connected with)."}
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
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Security
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We implement appropriate technical and organizational measures to
              protect your personal information. Authentication is handled
              through Apple Sign In, and all data is transmitted over encrypted
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
