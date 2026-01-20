import SwiftUI

struct LoadingView: View {
    var message: String?

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(Color.white)

            if let message = message {
                Text(message)
                    .font(.gatherSubheadline)
                    .foregroundStyle(Color.gatherTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gatherBackground)
    }
}

// MARK: - Loading Button

struct LoadingButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(.black)
                }
                Text(title)
                    .font(.gatherButtonPrimary)
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.button))
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.8 : 1)
    }
}

// MARK: - Skeleton Loading

struct SkeletonView: View {
    let width: CGFloat?
    let height: CGFloat

    init(width: CGFloat? = nil, height: CGFloat = 16) {
        self.width = width
        self.height = height
    }

    var body: some View {
        RoundedRectangle(cornerRadius: CornerRadius.xs)
            .fill(Color.gatherSurface)
            .frame(width: width, height: height)
            .shimmer()
    }
}

struct SkeletonListRow: View {
    var body: some View {
        HStack(spacing: Spacing.md) {
            SkeletonView(width: AvatarSize.md, height: AvatarSize.md)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonView(width: 120, height: 14)
                SkeletonView(width: 80, height: 12)
            }

            Spacer()
        }
        .padding(.vertical, Spacing.xs)
    }
}

struct SkeletonEventCard: View {
    var body: some View {
        HStack(spacing: Spacing.md) {
            SkeletonView(width: 56, height: 56)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonView(width: 150, height: 16)
                SkeletonView(width: 100, height: 14)
                SkeletonView(width: 80, height: 12)
            }

            Spacer()
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
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.xl) {
            LoadingView(message: "Loading...")
                .frame(height: 150)

            Divider()
                .background(Color.gatherBorder)

            LoadingButton(title: "Submit", isLoading: true) {}
            LoadingButton(title: "Submit", isLoading: false) {}

            Divider()
                .background(Color.gatherBorder)

            VStack(spacing: Spacing.sm) {
                SkeletonListRow()
                SkeletonListRow()
                SkeletonListRow()
            }
            .padding(.horizontal, Spacing.screenEdge)

            SkeletonEventCard()
                .padding(.horizontal, Spacing.screenEdge)
        }
    }
    .preferredColorScheme(.dark)
}
