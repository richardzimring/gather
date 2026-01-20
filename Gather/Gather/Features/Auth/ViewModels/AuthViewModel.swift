import Foundation
import Combine

@MainActor
class AuthViewModel: ObservableObject {
    @Published var phoneNumber: String = ""
    @Published var verificationCode: String = ""
    @Published var displayName: String = ""

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var codeSent = false
    @Published var isNewUser = false
    @Published var isAuthenticated = false

    private let authManager = AuthManager.shared

    // MARK: - Computed Properties

    var formattedPhoneNumber: String {
        // Format as user types: (555) 123-4567
        let digits = phoneNumber.filter { $0.isNumber }
        var result = ""

        for (index, digit) in digits.enumerated() {
            if index == 0 { result += "(" }
            if index == 3 { result += ") " }
            if index == 6 { result += "-" }
            if index < 10 {
                result += String(digit)
            }
        }

        return result
    }

    var e164PhoneNumber: String {
        let digits = phoneNumber.filter { $0.isNumber }
        return "+1\(digits)" // Assuming US for now
    }

    var isPhoneValid: Bool {
        phoneNumber.filter { $0.isNumber }.count == 10
    }

    var isCodeValid: Bool {
        verificationCode.count == 6 && verificationCode.allSatisfy { $0.isNumber }
    }

    var isNameValid: Bool {
        displayName.trimmingCharacters(in: .whitespaces).count >= 2
    }

    // MARK: - Actions

    func requestCode() async {
        guard isPhoneValid else {
            errorMessage = "Please enter a valid phone number"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authManager.requestVerificationCode(phoneNumber: e164PhoneNumber)
            codeSent = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func verifyCode() async {
        guard isCodeValid else {
            errorMessage = "Please enter a valid 6-digit code"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            isNewUser = try await authManager.verifyCode(phoneNumber: e164PhoneNumber, code: verificationCode)

            if isNewUser {
                // Stay on profile setup
            } else {
                isAuthenticated = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func updateProfile() async {
        guard isNameValid else {
            errorMessage = "Please enter your name"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authManager.updateProfile(displayName: displayName.trimmingCharacters(in: .whitespaces))
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func resendCode() async {
        verificationCode = ""
        await requestCode()
    }

    func goBack() {
        if codeSent && !isNewUser {
            codeSent = false
            verificationCode = ""
        }
    }
}
