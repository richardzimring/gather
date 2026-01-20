import Foundation
import Combine

@MainActor
class FriendsViewModel: ObservableObject {
    @Published var friends: [Friendship] = []
    @Published var pendingReceived: [Friendship] = []
    @Published var pendingSent: [Friendship] = []
    @Published var groups: [FriendGroup] = []

    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var searchText = ""

    private var cancellables = Set<AnyCancellable>()

    init() {
        setupNotificationObservers()
    }

    // MARK: - Computed Properties

    var filteredFriends: [Friendship] {
        if searchText.isEmpty {
            return friends
        }
        return friends.filter {
            $0.displayName.localizedCaseInsensitiveContains(searchText)
        }
    }

    // MARK: - Data Loading

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let friendsResponse: FriendsResponse = APIClient.shared.get("/friends")
            async let groupsResponse: GroupsResponse = APIClient.shared.get("/groups")

            let (friends, groups) = try await (friendsResponse, groupsResponse)

            self.friends = friends.friends
            self.pendingReceived = friends.pendingReceived
            self.pendingSent = friends.pendingSent
            self.groups = groups.groups
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Friend Actions

    func sendFriendRequest(phoneNumber: String) async -> Bool {
        do {
            let request = FriendRequestRequest(phoneNumber: phoneNumber)
            let _: FriendRequestResponse = try await APIClient.shared.post(
                "/friends/request",
                body: request
            )
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func acceptFriendRequest(friendId: String) async {
        do {
            let _: EmptyResponse = try await APIClient.shared.post(
                "/friends/\(friendId)/accept",
                body: EmptyRequest()
            )
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func declineFriendRequest(friendId: String) async {
        do {
            let _: EmptyResponse = try await APIClient.shared.post(
                "/friends/\(friendId)/decline",
                body: EmptyRequest()
            )
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeFriend(friendId: String) async {
        do {
            try await APIClient.shared.delete("/friends/\(friendId)")
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Group Actions

    func createGroup(name: String, emoji: String?, memberIds: [String]) async -> Bool {
        do {
            let request = CreateGroupRequest(name: name, emoji: emoji, memberIds: memberIds)
            let _: GroupResponse = try await APIClient.shared.post("/groups", body: request)
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateGroup(groupId: String, name: String?, emoji: String?, memberIds: [String]?) async {
        do {
            let request = UpdateGroupRequest(name: name, emoji: emoji, memberIds: memberIds)
            let _: GroupResponse = try await APIClient.shared.patch("/groups/\(groupId)", body: request)
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteGroup(groupId: String) async {
        do {
            try await APIClient.shared.delete("/groups/\(groupId)")
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Notification Observers

    private func setupNotificationObservers() {
        NotificationCenter.default.publisher(for: .friendRequestReceived)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task {
                    await self?.loadData()
                }
            }
            .store(in: &cancellables)
    }
}

// MARK: - Helper Types

struct EmptyRequest: Encodable {}
