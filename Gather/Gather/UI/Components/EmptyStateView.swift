import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 56, weight: .light))
                .foregroundStyle(Color.gatherTextTertiary)

            VStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.gatherTitle3)
                    .foregroundStyle(Color.gatherTextPrimary)
                    .multilineTextAlignment(.center)

                Text(message)
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextSecondary)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.gatherButtonPrimary)
                        .foregroundStyle(.black)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.white)
                        .clipShape(Capsule())
                }
                .padding(.top, Spacing.sm)
            }
        }
        .padding(Spacing.xl)
    }
}

// MARK: - Preset Empty States

extension EmptyStateView {
    static func noFriends(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "person.2",
            title: "No Friends Yet",
            message: "Add friends to see their availability and invite them to events.",
            actionTitle: "Add Friend",
            action: action
        )
    }

    static func noEvents(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "calendar",
            title: "No Upcoming Events",
            message: "Create an event to start planning with your friends.",
            actionTitle: "Create Event",
            action: action
        )
    }

    static var noInvitations: EmptyStateView {
        EmptyStateView(
            icon: "envelope.open",
            title: "No Invitations",
            message: "You're all caught up! New invitations will appear here."
        )
    }

    static func noAvailability(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "clock",
            title: "No Availability Set",
            message: "Let your friends know when you're free by adding availability windows.",
            actionTitle: "Add Availability",
            action: action
        )
    }

    static func noGroups(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "person.3",
            title: "No Groups Yet",
            message: "Create groups to easily manage who can see your availability.",
            actionTitle: "Create Group",
            action: action
        )
    }
}

#Preview {
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        ScrollView {
            VStack(spacing: Spacing.xxl) {
                EmptyStateView.noFriends()

                Divider()
                    .background(Color.gatherBorder)

                EmptyStateView.noEvents()

                Divider()
                    .background(Color.gatherBorder)

                EmptyStateView.noInvitations
            }
        }
    }
    .preferredColorScheme(.dark)
}
