import Foundation

enum InviteeStatus: String, Codable {
    case pending
    case accepted
    case declined
    case maybe

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .accepted: return "Going"
        case .declined: return "Not Going"
        case .maybe: return "Maybe"
        }
    }

    var icon: String {
        switch self {
        case .pending: return "clock"
        case .accepted: return "checkmark.circle.fill"
        case .declined: return "xmark.circle.fill"
        case .maybe: return "questionmark.circle.fill"
        }
    }
}

enum EventStatus: String, Codable {
    case draft
    case sent
    case confirmed
    case cancelled
}

struct CounterProposal: Codable {
    var startTime: String?
    var endTime: String?
    var location: String?
    var activityId: String?
    var message: String?
}

struct EventInvitee: Codable, Identifiable {
    let userId: String
    var status: InviteeStatus
    var respondedAt: String?
    var counterProposal: CounterProposal?

    var id: String { userId }
}

struct Event: Codable, Identifiable {
    let eventId: String
    let hostId: String
    var title: String
    var activityId: String?
    var emoji: String?
    var startTime: String
    var endTime: String
    var location: String?
    var notes: String?
    var invitees: [EventInvitee]
    let showInviteList: Bool
    let status: EventStatus
    var calendarEventId: String?
    let createdAt: String
    let updatedAt: String

    var id: String { eventId }

    var startDate: Date? {
        ISO8601DateFormatter().date(from: startTime)
    }

    var endDate: Date? {
        ISO8601DateFormatter().date(from: endTime)
    }

    var displayEmoji: String {
        emoji ?? "📅"
    }

    var acceptedCount: Int {
        invitees.filter { $0.status == .accepted }.count
    }

    var pendingCount: Int {
        invitees.filter { $0.status == .pending }.count
    }
}

struct EventsResponse: Decodable {
    let events: [Event]
}

struct EventResponse: Decodable {
    let event: Event
}

struct CreateEventRequest: Encodable {
    let title: String
    let activityId: String?
    let emoji: String?
    let startTime: String
    let endTime: String
    let location: String?
    let notes: String?
    let inviteeIds: [String]
    let showInviteList: Bool
}

struct UpdateEventRequest: Encodable {
    var title: String?
    var activityId: String?
    var emoji: String?
    var startTime: String?
    var endTime: String?
    var location: String?
    var notes: String?
    var showInviteList: Bool?
}

struct EventResponseRequest: Encodable {
    let status: InviteeStatus
    let counterProposal: CounterProposal?
}
