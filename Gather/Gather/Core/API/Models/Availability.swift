import Foundation

enum RecurringPattern: String, Codable, CaseIterable {
    case daily
    case weekly
    case biweekly
    case monthly

    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .biweekly: return "Every 2 Weeks"
        case .monthly: return "Monthly"
        }
    }
}

struct Recurring: Codable {
    var pattern: RecurringPattern
    var daysOfWeek: [Int]?
    var endDate: String?
}

enum VisibilityType: String, Codable, CaseIterable {
    case all
    case groups
    case specific

    var displayName: String {
        switch self {
        case .all: return "All Friends"
        case .groups: return "Specific Groups"
        case .specific: return "Specific People"
        }
    }
}

struct Visibility: Codable {
    var type: VisibilityType
    var groupIds: [String]?
    var userIds: [String]?
}

struct AvailabilityWindow: Codable, Identifiable {
    let userId: String
    let windowId: String
    var startTime: String
    var endTime: String
    var recurring: Recurring?
    var visibleTo: Visibility
    var preferredActivities: [String]?
    var notes: String?
    let createdAt: String

    var id: String { windowId }

    var startDate: Date? {
        ISO8601DateFormatter().date(from: startTime)
    }

    var endDate: Date? {
        ISO8601DateFormatter().date(from: endTime)
    }
}

struct AvailabilityWindowsResponse: Decodable {
    let windows: [AvailabilityWindow]
}

struct CreateAvailabilityRequest: Encodable {
    let startTime: String
    let endTime: String
    let recurring: Recurring?
    let visibleTo: Visibility
    let preferredActivities: [String]?
    let notes: String?
}

struct UpdateAvailabilityRequest: Encodable {
    var startTime: String?
    var endTime: String?
    var recurring: Recurring?
    var visibleTo: Visibility?
    var preferredActivities: [String]?
    var notes: String?
}

struct AvailabilityWindowResponse: Decodable {
    let window: AvailabilityWindow
}

struct FriendAvailability: Decodable {
    let userId: String
    let windows: [AvailabilityWindow]
}

struct FriendsAvailabilityResponse: Decodable {
    let availability: [FriendAvailability]
}
