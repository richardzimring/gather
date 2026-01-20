import SwiftUI

struct AvatarView: View {
    let user: User?
    let size: CGFloat

    init(user: User?, size: CGFloat = AvatarSize.md) {
        self.user = user
        self.size = size
    }

    var body: some View {
        Group {
            if let avatarUrl = user?.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        placeholderView
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        placeholderView
                    @unknown default:
                        placeholderView
                    }
                }
            } else {
                placeholderView
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(Color.gatherBorder, lineWidth: 1)
        )
    }

    private var placeholderView: some View {
        ZStack {
            Circle()
                .fill(LinearGradient.gatherPrimaryGradient)

            Text(user?.initials ?? "?")
                .font(.system(size: size * 0.4, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Group Avatar

struct GroupAvatarView: View {
    let users: [User]
    let size: CGFloat
    let maxDisplay: Int

    init(users: [User], size: CGFloat = AvatarSize.md, maxDisplay: Int = 3) {
        self.users = users
        self.size = size
        self.maxDisplay = maxDisplay
    }

    var body: some View {
        let displayUsers = Array(users.prefix(maxDisplay))
        let overflow = users.count - maxDisplay

        HStack(spacing: -size * 0.3) {
            ForEach(displayUsers.indices, id: \.self) { index in
                AvatarView(user: displayUsers[index], size: size)
                    .overlay(
                        Circle()
                            .stroke(Color.gatherBackground, lineWidth: 2)
                    )
                    .zIndex(Double(maxDisplay - index))
            }

            if overflow > 0 {
                overflowBadge(count: overflow)
                    .zIndex(0)
            }
        }
    }

    private func overflowBadge(count: Int) -> some View {
        ZStack {
            Circle()
                .fill(Color.gatherSurface)

            Text("+\(count)")
                .font(.system(size: size * 0.35, weight: .semibold))
                .foregroundStyle(Color.gatherTextSecondary)
        }
        .frame(width: size, height: size)
        .overlay(
            Circle()
                .stroke(Color.gatherBackground, lineWidth: 2)
        )
    }
}

#Preview {
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.lg) {
            AvatarView(user: nil, size: AvatarSize.sm)
            AvatarView(user: nil, size: AvatarSize.md)
            AvatarView(user: nil, size: AvatarSize.lg)
            AvatarView(user: nil, size: AvatarSize.xl)
        }
    }
    .preferredColorScheme(.dark)
}
