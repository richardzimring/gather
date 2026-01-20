import SwiftUI

struct AuthFlowView: View {
    @StateObject private var viewModel = AuthViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                Group {
                    if viewModel.isAuthenticated {
                        // Will be handled by parent view
                        EmptyView()
                            .onAppear { dismiss() }
                    } else if viewModel.isNewUser {
                        ProfileSetupView(viewModel: viewModel)
                    } else if viewModel.codeSent {
                        VerificationView(viewModel: viewModel)
                    } else {
                        PhoneEntryView(viewModel: viewModel)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if viewModel.codeSent && !viewModel.isNewUser {
                        Button(action: { viewModel.goBack() }) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(Color.white)
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    AuthFlowView()
        .preferredColorScheme(.dark)
}
