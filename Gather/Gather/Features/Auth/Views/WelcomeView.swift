import SwiftUI

struct WelcomeView: View {
    @Binding var showAuth: Bool

    var body: some View {
        ZStack {
            // Pure black background
            Color.gatherBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Hero Section
                VStack(spacing: Spacing.lg) {
                    // App Icon / Logo
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 120, height: 120)

                        Image(systemName: "person.3.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.black)
                    }
                    .shadow(color: .white.opacity(0.15), radius: 20)

                    VStack(spacing: Spacing.sm) {
                        Text("Gather")
                            .font(.gatherLargeTitle)
                            .foregroundStyle(Color.gatherTextPrimary)
                            .displayKerning()

                        Text("Make plans effortlessly")
                            .font(.gatherTitle3)
                            .foregroundStyle(Color.gatherTextSecondary)
                    }
                }

                Spacer()

                // Features List
                VStack(spacing: Spacing.lg) {
                    FeatureRow(
                        icon: "calendar.badge.clock",
                        title: "Share Your Availability",
                        description: "Let friends know when you're free"
                    )

                    FeatureRow(
                        icon: "person.2.fill",
                        title: "Connect with Friends",
                        description: "See when your friends are available"
                    )

                    FeatureRow(
                        icon: "bell.badge.fill",
                        title: "Get Invited",
                        description: "Receive and respond to invitations instantly"
                    )
                }
                .padding(.horizontal, Spacing.screenEdgeLarge)

                Spacer()

                // CTA Button
                VStack(spacing: Spacing.md) {
                    PrimaryButton(title: "Get Started", icon: "arrow.right") {
                        showAuth = true
                    }

                    Text("By continuing, you agree to our Terms of Service and Privacy Policy")
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextTertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, Spacing.screenEdge)
                .padding(.bottom, Spacing.xl)
            }
        }
    }
}

// MARK: - Feature Row

private struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .medium))
                .foregroundStyle(Color.white)
                .frame(width: 44, height: 44)
                .background(Color.gatherSurface)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.gatherHeadline)
                    .foregroundStyle(Color.gatherTextPrimary)

                Text(description)
                    .font(.gatherSubheadline)
                    .foregroundStyle(Color.gatherTextSecondary)
            }

            Spacer()
        }
    }
}

#Preview {
    WelcomeView(showAuth: .constant(false))
        .preferredColorScheme(.dark)
}
