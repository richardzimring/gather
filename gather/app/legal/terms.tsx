import { router } from "expo-router";
import { ScrollView, Text, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackHeader } from "../../components/ui/ScreenHeader";

export default function TermsOfServiceScreen() {
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
        <BackHeader title="Terms of Service" onBack={() => router.back()} />

        <YStack gap="$4">
          <Text color="$colorMuted" fontSize={13}>
            Last updated: February 19, 2026
          </Text>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Acceptance of Terms
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"By accessing or using Gather (\"the App\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App."}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Description of Service
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather is a social planning application that allows users to
              coordinate events and plans with friends. The App enables users to
              share availability, create events, invite friends, and manage
              social groups.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              User Accounts
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              You must sign in with Apple to create an account. You are
              responsible for maintaining the security of your account. You must
              be at least 13 years old to use the App.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Third-Party Calendar Integrations
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              Gather offers optional integrations with Google Calendar, Microsoft
              Outlook Calendar, and Apple Calendar. These integrations are used
              solely to display your availability to friends within the app.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              By connecting a third-party calendar, you authorize Gather to
              access your calendar data as described in our Privacy Policy. You
              may disconnect any calendar integration at any time from the app
              settings. Disconnecting immediately removes all associated calendar
              data from our servers.
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"Your use of connected third-party services (Google, Microsoft) is also subject to those services' own terms of service and privacy policies. Gather's access is read-only and limited to availability data."}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              User Conduct
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"You agree not to:\n- Use the App for any unlawful purpose\n- Harass, abuse, or harm other users\n- Post offensive, inappropriate, or misleading content\n- Attempt to gain unauthorized access to other users' accounts\n- Use the App to send spam or unsolicited communications\n- Interfere with or disrupt the App's functionality"}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Content and Intellectual Property
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              You retain ownership of content you create within the App (such as
              event details and messages). By using the App, you grant us a
              license to use this content solely for the purpose of providing
              and improving the service.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Reporting and Blocking
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We provide tools to block and report users who violate these
              terms. We reserve the right to investigate reports and take
              appropriate action, including suspending or terminating accounts
              that violate our policies.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Account Termination
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              You may delete your account at any time from the Profile screen.
              We may also suspend or terminate your account if you violate these
              terms. Upon deletion, your data will be permanently removed from
              our servers.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Disclaimers
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              {"The App is provided \"as is\" without warranties of any kind. We do not guarantee that the App will be available at all times or that it will be free of errors."}
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Limitation of Liability
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              To the fullest extent permitted by law, Gather shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the App.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Changes to Terms
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              We may update these Terms of Service from time to time. Continued
              use of the App after changes constitutes acceptance of the updated
              terms.
            </Text>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={18} fontWeight="600">
              Contact Us
            </Text>
            <Text color="$color" fontSize={14} lineHeight={22}>
              If you have any questions about these Terms of Service, please
              contact us at support@gather.app.
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
