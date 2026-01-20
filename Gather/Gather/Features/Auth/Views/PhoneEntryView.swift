import SwiftUI

struct PhoneEntryView: View {
    @ObservedObject var viewModel: AuthViewModel
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: Spacing.sm) {
                    Text("Enter your phone number")
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)

                    Text("We'll send you a verification code")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .padding(.top, Spacing.xxl)

                Spacer()

                // Phone Input
                VStack(spacing: Spacing.lg) {
                    HStack(spacing: Spacing.sm) {
                        // Country Code
                        HStack(spacing: Spacing.xs) {
                            Text("🇺🇸")
                                .font(.gatherEmoji)
                            Text("+1")
                                .font(.gatherHeadline)
                                .foregroundStyle(Color.gatherTextPrimary)
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                        // Phone Number Field
                        TextField("(555) 123-4567", text: $viewModel.phoneNumber)
                            .keyboardType(.phonePad)
                            .font(.gatherTitle3)
                            .foregroundStyle(Color.gatherTextPrimary)
                            .focused($isFocused)
                            .padding(Spacing.md)
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                            .onChange(of: viewModel.phoneNumber) { _, newValue in
                                // Limit to 10 digits
                                let digits = newValue.filter { $0.isNumber }
                                if digits.count > 10 {
                                    viewModel.phoneNumber = String(digits.prefix(10))
                                }
                            }
                    }

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
                        isEnabled: viewModel.isPhoneValid,
                        isLoading: viewModel.isLoading
                    ) {
                        Task {
                            await viewModel.requestCode()
                        }
                    }

                    Text("Standard message and data rates may apply")
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextTertiary)
                }
                .padding(.horizontal, Spacing.screenEdge)
                .padding(.bottom, Spacing.xl)
            }
        }
        .onAppear {
            isFocused = true
        }
    }
}

#Preview {
    PhoneEntryView(viewModel: AuthViewModel())
        .preferredColorScheme(.dark)
}
