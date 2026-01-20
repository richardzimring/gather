import SwiftUI

struct ActivityBadge: View {
    let activity: Activity
    let isSelected: Bool

    init(activity: Activity, isSelected: Bool = false) {
        self.activity = activity
        self.isSelected = isSelected
    }

    var body: some View {
        HStack(spacing: Spacing.xs) {
            Text(activity.emoji)
                .font(.gatherEmojiSmall)

            Text(activity.name)
                .font(.gatherSubheadline)
                .foregroundStyle(isSelected ? .black : Color.gatherTextPrimary)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(
            Capsule()
                .fill(isSelected ? Color.white : Color.gatherSurface)
        )
        .overlay(
            Capsule()
                .stroke(isSelected ? Color.clear : Color.gatherBorder, lineWidth: 1)
        )
    }
}

// MARK: - Activity Grid Item

struct ActivityGridItem: View {
    let activity: Activity
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: Spacing.xs) {
                Text(activity.emoji)
                    .font(.gatherEmojiLarge)

                Text(activity.name)
                    .font(.gatherCaption)
                    .foregroundStyle(isSelected ? .black : Color.gatherTextPrimary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isSelected ? Color.white : Color.gatherSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(isSelected ? Color.clear : Color.gatherBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Emoji Only Badge

struct EmojiBadge: View {
    let emoji: String
    let size: CGFloat

    init(emoji: String, size: CGFloat = 44) {
        self.emoji = emoji
        self.size = size
    }

    var body: some View {
        Text(emoji)
            .font(.system(size: size * 0.5))
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(Color.gatherSurface)
            )
            .overlay(
                Circle()
                    .stroke(Color.gatherBorder, lineWidth: 1)
            )
    }
}

#Preview {
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.lg) {
            HStack(spacing: Spacing.sm) {
                ActivityBadge(activity: Activity.defaultActivities[0])
                ActivityBadge(activity: Activity.defaultActivities[1], isSelected: true)
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: Spacing.sm) {
                ForEach(Activity.defaultActivities.prefix(8)) { activity in
                    ActivityGridItem(activity: activity, isSelected: activity.activityId == "coffee") {}
                }
            }

            HStack(spacing: Spacing.md) {
                EmojiBadge(emoji: "☕", size: 44)
                EmojiBadge(emoji: "🍽️", size: 56)
                EmojiBadge(emoji: "🎬", size: 64)
            }
        }
        .padding(Spacing.screenEdge)
    }
    .preferredColorScheme(.dark)
}
