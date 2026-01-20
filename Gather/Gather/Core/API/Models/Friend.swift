import Foundation

enum FriendshipStatus: String, Codable {
    case pending
    case accepted
    case blocked
}

struct Friendship: Codable, Identifiable {
    let userId: String
    let friendId: String
    let status: FriendshipStatus
    let initiatedBy: String
    let createdAt: String
    let acceptedAt: String?
    let customName: String?
    let friend: User

    var id: String { friendId }

    var displayName: String {
        customName ?? friend.displayName
    }
}

struct FriendsResponse: Decodable {
    let friends: [Friendship]
    let pendingReceived: [Friendship]
    let pendingSent: [Friendship]
}

struct FriendRequestRequest: Encodable {
    let phoneNumber: String
}

struct FriendRequestResponse: Decodable {
    let friendship: Friendship
}
