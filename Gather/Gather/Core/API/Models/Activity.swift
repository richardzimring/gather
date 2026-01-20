import Foundation

struct Activity: Codable, Identifiable, Hashable {
    let activityId: String
    let userId: String?
    var name: String
    var emoji: String
    let isDefault: Bool
    let createdAt: String

    var id: String { activityId }

    func hash(into hasher: inout Hasher) {
        hasher.combine(activityId)
    }

    static func == (lhs: Activity, rhs: Activity) -> Bool {
        lhs.activityId == rhs.activityId
    }
}

struct ActivitiesResponse: Decodable {
    let activities: [Activity]
}

struct CreateActivityRequest: Encodable {
    let name: String
    let emoji: String
}

struct UpdateActivityRequest: Encodable {
    var name: String?
    var emoji: String?
}

struct ActivityResponse: Decodable {
    let activity: Activity
}

// MARK: - Default Activities for UI

extension Activity {
    static let defaultActivities: [Activity] = [
        Activity(activityId: "coffee", userId: nil, name: "Coffee", emoji: "☕", isDefault: true, createdAt: ""),
        Activity(activityId: "dinner", userId: nil, name: "Dinner", emoji: "🍽️", isDefault: true, createdAt: ""),
        Activity(activityId: "drinks", userId: nil, name: "Drinks", emoji: "🍻", isDefault: true, createdAt: ""),
        Activity(activityId: "workout", userId: nil, name: "Workout", emoji: "🏃", isDefault: true, createdAt: ""),
        Activity(activityId: "movie", userId: nil, name: "Movie", emoji: "🎬", isDefault: true, createdAt: ""),
        Activity(activityId: "gaming", userId: nil, name: "Gaming", emoji: "🎮", isDefault: true, createdAt: ""),
        Activity(activityId: "study", userId: nil, name: "Study", emoji: "📚", isDefault: true, createdAt: ""),
        Activity(activityId: "shopping", userId: nil, name: "Shopping", emoji: "🛍️", isDefault: true, createdAt: ""),
        Activity(activityId: "walk", userId: nil, name: "Walk", emoji: "🚶", isDefault: true, createdAt: ""),
        Activity(activityId: "party", userId: nil, name: "Party", emoji: "🎉", isDefault: true, createdAt: ""),
        Activity(activityId: "yoga", userId: nil, name: "Yoga", emoji: "🧘", isDefault: true, createdAt: ""),
        Activity(activityId: "sports", userId: nil, name: "Sports", emoji: "🎾", isDefault: true, createdAt: ""),
        Activity(activityId: "concert", userId: nil, name: "Concert", emoji: "🎵", isDefault: true, createdAt: ""),
        Activity(activityId: "beach", userId: nil, name: "Beach", emoji: "🏖️", isDefault: true, createdAt: ""),
        Activity(activityId: "other", userId: nil, name: "Other", emoji: "❓", isDefault: true, createdAt: "")
    ]
}
