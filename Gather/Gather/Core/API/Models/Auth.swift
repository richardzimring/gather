import Foundation

// MARK: - Request Models

struct RequestCodeRequest: Encodable {
    let phoneNumber: String
}

struct VerifyCodeRequest: Encodable {
    let phoneNumber: String
    let code: String
}

struct RefreshTokenRequest: Encodable {
    let refreshToken: String
}

struct RegisterPushTokenRequest: Encodable {
    let pushToken: String
}

// MARK: - Response Models

struct RequestCodeResponse: Decodable {
    let phoneNumber: String
}

struct AuthTokens: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct AuthResponse: Decodable {
    let user: User
    let tokens: AuthTokens
    let isNewUser: Bool
}

struct RefreshTokenResponse: Decodable {
    let tokens: AuthTokens
}
