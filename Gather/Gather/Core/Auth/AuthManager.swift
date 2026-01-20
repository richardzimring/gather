import Foundation
import Combine

@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var isAuthenticated = false
    @Published private(set) var currentUser: User?
    @Published private(set) var isLoading = false

    private let keychain = KeychainService.shared

    private init() {
        Task {
            await checkAuthState()
        }
    }

    // MARK: - Token Access

    var accessToken: String? {
        get async {
            await keychain.accessToken
        }
    }

    // MARK: - Auth State

    func checkAuthState() async {
        let hasToken = await keychain.accessToken != nil
        if hasToken {
            // Try to fetch current user to validate token
            do {
                let user: User = try await APIClient.shared.get("/users/me")
                self.currentUser = user
                self.isAuthenticated = true
            } catch {
                // Token invalid, clear auth
                await logout()
            }
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }

    // MARK: - Phone Auth

    func requestVerificationCode(phoneNumber: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let request = RequestCodeRequest(phoneNumber: phoneNumber)
        let _: RequestCodeResponse = try await APIClient.shared.post(
            "/auth/request-code",
            body: request,
            authenticated: false
        )
    }

    func verifyCode(phoneNumber: String, code: String) async throws -> Bool {
        isLoading = true
        defer { isLoading = false }

        let request = VerifyCodeRequest(phoneNumber: phoneNumber, code: code)
        let response: AuthResponse = try await APIClient.shared.post(
            "/auth/verify-code",
            body: request,
            authenticated: false
        )

        // Save tokens
        try await keychain.saveTokens(
            access: response.tokens.accessToken,
            refresh: response.tokens.refreshToken
        )
        try await keychain.saveUserId(response.user.userId)

        self.currentUser = response.user
        self.isAuthenticated = true

        return response.isNewUser
    }

    // MARK: - Token Refresh

    func refreshTokens() async -> Bool {
        guard let refreshToken = await keychain.refreshToken else {
            return false
        }

        do {
            let request = RefreshTokenRequest(refreshToken: refreshToken)
            let response: RefreshTokenResponse = try await APIClient.shared.post(
                "/auth/refresh",
                body: request,
                authenticated: false
            )

            try await keychain.saveTokens(
                access: response.tokens.accessToken,
                refresh: response.tokens.refreshToken
            )

            return true
        } catch {
            // Refresh failed, user needs to re-authenticate
            await logout()
            return false
        }
    }

    // MARK: - Profile

    func updateProfile(displayName: String? = nil, avatarUrl: String? = nil, timezone: String? = nil) async throws {
        isLoading = true
        defer { isLoading = false }

        let request = UpdateUserRequest(
            displayName: displayName,
            avatarUrl: avatarUrl,
            timezone: timezone
        )

        let user: User = try await APIClient.shared.patch("/users/me", body: request)
        self.currentUser = user
    }

    func registerPushToken(_ token: String) async throws {
        let request = RegisterPushTokenRequest(pushToken: token)
        let _: EmptyResponse = try await APIClient.shared.post("/users/me/push-token", body: request)
    }

    // MARK: - Logout

    func logout() async {
        await keychain.clearAll()
        self.isAuthenticated = false
        self.currentUser = nil
    }

    func deleteAccount() async throws {
        try await APIClient.shared.delete("/users/me")
        await logout()
    }
}
