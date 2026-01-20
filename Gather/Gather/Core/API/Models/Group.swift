import Foundation

struct FriendGroup: Codable, Identifiable {
    let groupId: String
    let ownerId: String
    var name: String
    var emoji: String?
    var memberIds: [String]
    let isDefault: Bool
    let createdAt: String

    var id: String { groupId }

    var displayEmoji: String {
        emoji ?? "👥"
    }
}

struct GroupsResponse: Decodable {
    let groups: [FriendGroup]
}

struct CreateGroupRequest: Encodable {
    let name: String
    let emoji: String?
    let memberIds: [String]?
}

struct UpdateGroupRequest: Encodable {
    var name: String?
    var emoji: String?
    var memberIds: [String]?
}

struct GroupResponse: Decodable {
    let group: FriendGroup
}
