import SwiftUI

struct FriendDetailView: View {
    let friendship: Friendship
    @State private var showRemoveAlert = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                // Profile Header
                VStack(spacing: Spacing.md) {
                    AvatarView(user: friendship.friend, size: AvatarSize.xxl)

                    Text(friendship.displayName)
                        .font(.gatherTitle2)

                    Text(friendship.friend.phoneNumber)
                        .font(.gatherSubheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, Spacing.xl)

                // Actions
                VStack(spacing: Spacing.sm) {
                    // Create event with friend
                    NavigationLink(destination: CreateEventView(preselectedFriendIds: [friendship.friendId])) {
                        HStack {
                            Image(systemName: "calendar.badge.plus")
                            Text("Create Event")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                        .font(.gatherBody)
                        .padding(Spacing.md)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .buttonStyle(.plain)

                    // View availability
                    NavigationLink(destination: FriendAvailabilityView(friendship: friendship)) {
                        HStack {
                            Image(systemName: "clock")
                            Text("View Availability")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                        .font(.gatherBody)
                        .padding(Spacing.md)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Spacing.lg)

                Spacer(minLength: Spacing.xxl)

                // Remove Friend
                Button(action: { showRemoveAlert = true }) {
                    Text("Remove Friend")
                        .font(.gatherBody)
                        .foregroundStyle(.red)
                }
                .padding(.bottom, Spacing.xl)
            }
        }
        .navigationTitle("Friend")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Remove Friend", isPresented: $showRemoveAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Remove", role: .destructive) {
                Task {
                    let viewModel = FriendsViewModel()
                    await viewModel.removeFriend(friendId: friendship.friendId)
                    dismiss()
                }
            }
        } message: {
            Text("Are you sure you want to remove \(friendship.displayName) as a friend?")
        }
    }
}

// MARK: - Friend Availability View

struct FriendAvailabilityView: View {
    let friendship: Friendship
    @State private var availability: [AvailabilityWindow] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                LoadingView(message: "Loading availability...")
            } else if availability.isEmpty {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 48))
                        .foregroundStyle(.tertiary)

                    Text("\(friendship.displayName) hasn't shared any availability with you")
                        .font(.gatherBody)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(Spacing.xl)
            } else {
                List {
                    ForEach(availability) { window in
                        AvailabilityRow(window: window)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle("\(friendship.friend.displayName)'s Availability")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadAvailability()
        }
    }

    private func loadAvailability() async {
        isLoading = true

        do {
            let response: FriendsAvailabilityResponse = try await APIClient.shared.get("/availability/friends")

            if let friendAvailability = response.availability.first(where: { $0.userId == friendship.friendId }) {
                availability = friendAvailability.windows
            }
        } catch {
            // Handle error silently
        }

        isLoading = false
    }
}

// MARK: - Availability Row

struct AvailabilityRow: View {
    let window: AvailabilityWindow

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if let startDate = window.startDate, let endDate = window.endDate {
                Text(startDate.relativeDateString)
                    .font(.gatherHeadline)

                Text("\(startDate.timeString) - \(endDate.timeString)")
                    .font(.gatherSubheadline)
                    .foregroundStyle(.secondary)
            }

            if let notes = window.notes, !notes.isEmpty {
                Text(notes)
                    .font(.gatherCaption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

#Preview {
    NavigationStack {
        FriendDetailView(
            friendship: Friendship(
                userId: "current",
                friendId: "friend1",
                status: .accepted,
                initiatedBy: "current",
                createdAt: Date().iso8601String,
                acceptedAt: Date().iso8601String,
                customName: nil,
                friend: User(
                    userId: "friend1",
                    phoneNumber: "+1234567890",
                    displayName: "Sarah Johnson",
                    avatarUrl: nil,
                    createdAt: Date().iso8601String,
                    calendarSyncEnabled: false,
                    timezone: "America/New_York"
                )
            )
        )
    }
}
