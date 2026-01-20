import SwiftUI

struct AddFriendSheet: View {
    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var phoneNumber = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xl) {
                // Header
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.gatherPrimary)

                    Text("Add a Friend")
                        .font(.gatherTitle2)

                    Text("Enter their phone number to send a friend request")
                        .font(.gatherBody)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, Spacing.xl)

                // Phone Input
                VStack(spacing: Spacing.md) {
                    HStack(spacing: Spacing.sm) {
                        Text("🇺🇸 +1")
                            .font(.gatherHeadline)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                        TextField("Phone number", text: $phoneNumber)
                            .keyboardType(.phonePad)
                            .font(.gatherHeadline)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.gatherSubheadline)
                            .foregroundStyle(.red)
                    }

                    if showSuccess {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Friend request sent!")
                        }
                        .font(.gatherSubheadline)
                        .foregroundStyle(.green)
                    }
                }
                .padding(.horizontal, Spacing.lg)

                Spacer()

                // Send Button
                PrimaryButton(
                    title: "Send Friend Request",
                    icon: "paperplane.fill",
                    isEnabled: isValidPhone,
                    isLoading: isLoading
                ) {
                    Task {
                        await sendRequest()
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xl)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var isValidPhone: Bool {
        phoneNumber.filter { $0.isNumber }.count >= 10
    }

    private var e164Phone: String {
        "+1\(phoneNumber.filter { $0.isNumber })"
    }

    private func sendRequest() async {
        isLoading = true
        errorMessage = nil
        showSuccess = false

        let success = await viewModel.sendFriendRequest(phoneNumber: e164Phone)

        if success {
            showSuccess = true
            phoneNumber = ""

            // Dismiss after short delay
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            dismiss()
        } else {
            errorMessage = viewModel.errorMessage
        }

        isLoading = false
    }
}

#Preview {
    AddFriendSheet(viewModel: FriendsViewModel())
}
