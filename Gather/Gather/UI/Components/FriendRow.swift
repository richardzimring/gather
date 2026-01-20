import SwiftUI

struct FriendRow: View {
    let friendship: Friendship
    var showStatus: Bool = false
    var onTap: (() -> Void)?

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: Spacing.md) {
                AvatarView(user: friendship.friend, size: AvatarSize.md)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(friendship.displayName)
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)

                    if showStatus {
                        statusText
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.gatherTextTertiary)
            }
            .padding(.vertical, Spacing.sm)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var statusText: some View {
        switch friendship.status {
        case .pending:
            if friendship.initiatedBy == friendship.userId {
                Text("Request sent")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextSecondary)
            } else {
                Text("Wants to be friends")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherPrimary)
            }
        case .accepted:
            Text("Friends")
                .font(.gatherCaption)
                .foregroundStyle(Color.gatherTextSecondary)
        case .blocked:
            Text("Blocked")
                .font(.gatherCaption)
                .foregroundStyle(Color.gatherTextTertiary)
        }
    }
}

// MARK: - Friend Request Row

struct FriendRequestRow: View {
    let friendship: Friendship
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                AvatarView(user: friendship.friend, size: AvatarSize.md)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(friendship.friend.displayName)
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)

                    Text("Wants to be friends")
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextSecondary)
                }

                Spacer()
            }

            HStack(spacing: Spacing.sm) {
                Button(action: onDecline) {
                    Text("Decline")
                        .font(.gatherSubheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.gatherSurface)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(Color.gatherBorderStrong, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                Button(action: onAccept) {
                    Text("Accept")
                        .font(.gatherSubheadline)
                        .fontWeight(.heavy)
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(Spacing.md)
        .background(Color.gatherSurface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.card)
                .stroke(Color.gatherBorder, lineWidth: 1)
        )
    }
}

#Preview {
    let sampleUser = User(
        userId: "1",
        phoneNumber: "+1234567890",
        displayName: "Sarah Johnson",
        avatarUrl: nil,
        createdAt: Date().iso8601String,
        calendarSyncEnabled: false,
        timezone: "America/New_York"
    )

    let sampleFriendship = Friendship(
        userId: "current",
        friendId: "1",
        status: .pending,
        initiatedBy: "1",
        createdAt: Date().iso8601String,
        acceptedAt: nil,
        customName: nil,
        friend: sampleUser
    )

    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            FriendRow(friendship: sampleFriendship, showStatus: true)
                .padding(.horizontal, Spacing.screenEdge)

            FriendRequestRow(friendship: sampleFriendship, onAccept: {}, onDecline: {})
                .padding(.horizontal, Spacing.screenEdge)
        }
    }
    .preferredColorScheme(.dark)
}
