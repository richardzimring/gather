import SwiftUI

struct PrimaryButton: View {
    let title: String
    var icon: String?
    var isEnabled: Bool = true
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(.black)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .semibold))
                }

                Text(title)
                    .font(.gatherButtonPrimary)
            }
            .foregroundStyle(Color.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.button)
                    .fill(isEnabled ? Color.white : Color.white.opacity(0.3))
            )
        }
        .disabled(!isEnabled || isLoading)
        .opacity(isLoading ? 0.8 : 1)
    }
}

struct SecondaryButton: View {
    let title: String
    var icon: String?
    var isEnabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .semibold))
                }
                Text(title)
                    .font(.gatherButtonSecondary)
            }
            .foregroundStyle(isEnabled ? Color.white : Color.gatherTextTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.button)
                    .fill(Color.gatherSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.button)
                    .stroke(Color.gatherBorderStrong, lineWidth: 1)
            )
        }
        .disabled(!isEnabled)
    }
}

struct TertiaryButton: View {
    let title: String
    var icon: String?
    var tint: Color = .gatherPrimary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(title)
                    .font(.gatherSubheadline)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(tint)
        }
    }
}

struct IconButton: View {
    let icon: String
    var size: CGFloat = 44
    var tint: Color = .white
    var background: Color = .gatherSurface
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.4, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(background)
                )
                .overlay(
                    Circle()
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )
        }
    }
}

struct FloatingActionButton: View {
    let icon: String
    var size: CGFloat = 56
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.black)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(Color.white)
                )
                .shadow(color: .white.opacity(0.2), radius: 12)
        }
        .glassEffect()
    }
}

#Preview {
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.lg) {
            PrimaryButton(title: "Get Started", icon: "arrow.right") {}
            PrimaryButton(title: "Loading...", isLoading: true) {}
            PrimaryButton(title: "Disabled", isEnabled: false) {}

            SecondaryButton(title: "Skip", icon: "arrow.right.circle") {}
            SecondaryButton(title: "Disabled", isEnabled: false) {}

            TertiaryButton(title: "Learn More", icon: "arrow.right") {}

            HStack(spacing: Spacing.md) {
                IconButton(icon: "plus") {}
                IconButton(icon: "xmark", tint: .gatherError) {}
                IconButton(icon: "checkmark", tint: .gatherSuccess) {}
            }

            FloatingActionButton(icon: "plus") {}
        }
        .padding(Spacing.screenEdge)
    }
    .preferredColorScheme(.dark)
}
