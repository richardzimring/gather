import SwiftUI

struct ProfileSetupView: View {
    @ObservedObject var viewModel: AuthViewModel
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: Spacing.sm) {
                    Text("What's your name?")
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)

                    Text("This is how your friends will see you")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .padding(.top, Spacing.xxl)

                Spacer()

                // Name Input
                VStack(spacing: Spacing.lg) {
                    // Avatar Preview
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: AvatarSize.xxl, height: AvatarSize.xxl)
                            .shadow(color: .white.opacity(0.15), radius: 20)

                        if viewModel.isNameValid {
                            Text(initials)
                                .font(.system(size: AvatarSize.xxl * 0.4, weight: .bold))
                                .foregroundStyle(.black)
                        } else {
                            Image(systemName: "person.fill")
                                .font(.system(size: AvatarSize.xxl * 0.4))
                                .foregroundStyle(.black)
                        }
                    }

                    // Name Field
                    TextField("Your name", text: $viewModel.displayName)
                        .font(.gatherTitle3)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .multilineTextAlignment(.center)
                        .textContentType(.name)
                        .autocapitalization(.words)
                        .focused($isFocused)
                        .padding(.vertical, Spacing.md)
                        .padding(.horizontal, Spacing.xl)
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.gatherSubheadline)
                            .foregroundStyle(Color.gatherError)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, Spacing.screenEdge)

                Spacer()

                // Continue Button
                VStack(spacing: Spacing.md) {
                    PrimaryButton(
                        title: "Continue",
                        isEnabled: viewModel.isNameValid,
                        isLoading: viewModel.isLoading
                    ) {
                        Task {
                            await viewModel.updateProfile()
                        }
                    }
                }
                .padding(.horizontal, Spacing.screenEdge)
                .padding(.bottom, Spacing.xl)
            }
        }
        .onAppear {
            isFocused = true
        }
    }

    private var initials: String {
        let parts = viewModel.displayName.trimmingCharacters(in: .whitespaces).split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        } else if let first = parts.first {
            return String(first.prefix(2)).uppercased()
        }
        return ""
    }
}

#Preview {
    ProfileSetupView(viewModel: AuthViewModel())
        .preferredColorScheme(.dark)
}
