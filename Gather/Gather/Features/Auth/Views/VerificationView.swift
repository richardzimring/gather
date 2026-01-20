import SwiftUI

struct VerificationView: View {
    @ObservedObject var viewModel: AuthViewModel
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: Spacing.sm) {
                    Text("Enter verification code")
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)

                    Text("We sent a code to \(viewModel.formattedPhoneNumber)")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .padding(.top, Spacing.xxl)

                Spacer()

                // Code Input
                VStack(spacing: Spacing.lg) {
                    // Code Boxes
                    HStack(spacing: Spacing.sm) {
                        ForEach(0..<6, id: \.self) { index in
                            CodeBox(
                                digit: digit(at: index),
                                isActive: viewModel.verificationCode.count == index
                            )
                        }
                    }
                    .onTapGesture {
                        isFocused = true
                    }

                    // Hidden text field for input
                    TextField("", text: $viewModel.verificationCode)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .focused($isFocused)
                        .opacity(0)
                        .frame(width: 0, height: 0)
                        .onChange(of: viewModel.verificationCode) { _, newValue in
                            let digits = newValue.filter { $0.isNumber }
                            if digits.count > 6 {
                                viewModel.verificationCode = String(digits.prefix(6))
                            } else {
                                viewModel.verificationCode = digits
                            }

                            // Auto-submit when 6 digits entered
                            if viewModel.verificationCode.count == 6 {
                                Task {
                                    await viewModel.verifyCode()
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

                // Actions
                VStack(spacing: Spacing.md) {
                    PrimaryButton(
                        title: "Verify",
                        isEnabled: viewModel.isCodeValid,
                        isLoading: viewModel.isLoading
                    ) {
                        Task {
                            await viewModel.verifyCode()
                        }
                    }

                    Button(action: {
                        Task {
                            await viewModel.resendCode()
                        }
                    }) {
                        Text("Didn't receive a code? Resend")
                            .font(.gatherSubheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.gatherPrimary)
                    }
                    .disabled(viewModel.isLoading)
                }
                .padding(.horizontal, Spacing.screenEdge)
                .padding(.bottom, Spacing.xl)
            }
        }
        .onAppear {
            isFocused = true
        }
    }

    private func digit(at index: Int) -> String {
        guard index < viewModel.verificationCode.count else { return "" }
        let stringIndex = viewModel.verificationCode.index(
            viewModel.verificationCode.startIndex,
            offsetBy: index
        )
        return String(viewModel.verificationCode[stringIndex])
    }
}

// MARK: - Code Box

private struct CodeBox: View {
    let digit: String
    let isActive: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(Color.gatherSurface)
                .frame(width: 48, height: 56)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(isActive ? Color.white : Color.gatherBorder, lineWidth: isActive ? 2 : 1)
                )

            Text(digit)
                .font(.gatherTitle)
                .foregroundStyle(Color.gatherTextPrimary)
        }
    }
}

#Preview {
    VerificationView(viewModel: AuthViewModel())
        .preferredColorScheme(.dark)
}
