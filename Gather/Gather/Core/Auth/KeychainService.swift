import Foundation
import Security

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case invalidData
}

actor KeychainService {
    static let shared = KeychainService()

    private let service = "app.gather.keychain"

    private init() {}

    // MARK: - Keys

    private enum Key: String {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case userId = "user_id"
    }

    // MARK: - Generic Operations

    private func save(_ data: Data, for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        // Try to delete existing item first
        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func load(for key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.unexpectedStatus(status)
        }

        guard let data = result as? Data else {
            throw KeychainError.invalidData
        }

        return data
    }

    private func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - String Helpers

    private func saveString(_ value: String, for key: Key) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.invalidData
        }
        try save(data, for: key.rawValue)
    }

    private func loadString(for key: Key) -> String? {
        guard let data = try? load(for: key.rawValue),
              let string = String(data: data, encoding: .utf8) else {
            return nil
        }
        return string
    }

    private func deleteValue(for key: Key) {
        try? delete(for: key.rawValue)
    }

    // MARK: - Public API

    var accessToken: String? {
        loadString(for: .accessToken)
    }

    var refreshToken: String? {
        loadString(for: .refreshToken)
    }

    var userId: String? {
        loadString(for: .userId)
    }

    func saveTokens(access: String, refresh: String) throws {
        try saveString(access, for: .accessToken)
        try saveString(refresh, for: .refreshToken)
    }

    func saveUserId(_ userId: String) throws {
        try saveString(userId, for: .userId)
    }

    func clearAll() {
        deleteValue(for: .accessToken)
        deleteValue(for: .refreshToken)
        deleteValue(for: .userId)
    }
}
