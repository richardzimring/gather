import Foundation

struct User: Codable, Identifiable, Equatable {
    let userId: String
    let phoneNumber: String
    var displayName: String
    var avatarUrl: String?
    let createdAt: String
    var calendarSyncEnabled: Bool
    var pushToken: String?
    var timezone: String

    var id: String { userId }

    var initials: String {
        let parts = displayName.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(displayName.prefix(2)).uppercased()
    }
}

struct UpdateUserRequest: Encodable {
    var displayName: String?
    var avatarUrl: String?
    var timezone: String?
    var calendarSyncEnabled: Bool?
}
