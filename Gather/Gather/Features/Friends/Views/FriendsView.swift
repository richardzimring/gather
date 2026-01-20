import SwiftUI

struct FriendsView: View {
    @StateObject private var viewModel = FriendsViewModel()
    @State private var selectedTab = 0
    @State private var showAddFriend = false
    @State private var showCreateGroup = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Pure black background
                Color.gatherBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Segmented Control
                    CustomSegmentedControl(
                        selectedIndex: $selectedTab,
                        options: segmentOptions
                    )
                    .padding(.horizontal, Spacing.screenEdge)
                    .padding(.vertical, Spacing.sm)

                    // Content
                    Group {
                        switch selectedTab {
                        case 0:
                            friendsListView
                        case 1:
                            groupsListView
                        case 2:
                            requestsListView
                        default:
                            EmptyView()
                        }
                    }
                }
            }
            .navigationTitle("Friends")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        if selectedTab == 1 {
                            showCreateGroup = true
                        } else {
                            showAddFriend = true
                        }
                    }) {
                        Image(systemName: "plus")
                            .foregroundStyle(Color.white)
                    }
                }
            }
            .task {
                await viewModel.loadData()
            }
            .refreshable {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showAddFriend) {
                AddFriendSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showCreateGroup) {
                CreateGroupSheet(viewModel: viewModel)
            }
        }
    }

    private var segmentOptions: [String] {
        if viewModel.pendingReceived.count > 0 {
            return ["Friends", "Groups", "Requests (\(viewModel.pendingReceived.count))"]
        } else {
            return ["Friends", "Groups", "Requests"]
        }
    }

    // MARK: - Friends List

    private var friendsListView: some View {
        SwiftUI.Group {
            if viewModel.isLoading && viewModel.friends.isEmpty {
                ScrollView {
                    VStack(spacing: Spacing.sm) {
                        ForEach(0..<5, id: \.self) { _ in
                            SkeletonListRow()
                        }
                    }
                    .padding(.horizontal, Spacing.screenEdge)
                }
            } else if viewModel.friends.isEmpty {
                EmptyStateView.noFriends { showAddFriend = true }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.filteredFriends) { friendship in
                            NavigationLink(destination: FriendDetailView(friendship: friendship)) {
                                FriendRow(friendship: friendship)
                            }
                            .padding(.horizontal, Spacing.screenEdge)

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, Spacing.screenEdge + AvatarSize.md + Spacing.md)
                        }
                    }
                }
                .searchable(text: $viewModel.searchText, prompt: "Search friends")
            }
        }
    }

    // MARK: - Groups List

    private var groupsListView: some View {
        SwiftUI.Group {
            if viewModel.groups.isEmpty {
                EmptyStateView.noGroups { showCreateGroup = true }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.groups) { group in
                            NavigationLink(destination: GroupDetailView(group: group, viewModel: viewModel)) {
                                GroupRow(group: group, friendCount: countFriendsInGroup(group))
                            }
                            .padding(.horizontal, Spacing.screenEdge)

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, Spacing.screenEdge + AvatarSize.md + Spacing.md)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Requests List

    private var requestsListView: some View {
        SwiftUI.Group {
            if viewModel.pendingReceived.isEmpty && viewModel.pendingSent.isEmpty {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "person.badge.clock")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(Color.gatherTextTertiary)
                    Text("No pending requests")
                        .font(.gatherSubheadline)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        if !viewModel.pendingReceived.isEmpty {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("Received")
                                    .font(.gatherCaption)
                                    .foregroundStyle(Color.gatherTextSecondary)
                                    .textCase(.uppercase)
                                    .padding(.horizontal, Spacing.screenEdge)

                                ForEach(viewModel.pendingReceived) { friendship in
                                    FriendRequestRow(
                                        friendship: friendship,
                                        onAccept: {
                                            Task {
                                                await viewModel.acceptFriendRequest(friendId: friendship.friendId)
                                            }
                                        },
                                        onDecline: {
                                            Task {
                                                await viewModel.declineFriendRequest(friendId: friendship.friendId)
                                            }
                                        }
                                    )
                                    .padding(.horizontal, Spacing.screenEdge)
                                }
                            }
                        }

                        if !viewModel.pendingSent.isEmpty {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("Sent")
                                    .font(.gatherCaption)
                                    .foregroundStyle(Color.gatherTextSecondary)
                                    .textCase(.uppercase)
                                    .padding(.horizontal, Spacing.screenEdge)

                                ForEach(viewModel.pendingSent) { friendship in
                                    FriendRow(friendship: friendship, showStatus: true)
                                        .padding(.horizontal, Spacing.screenEdge)
                                }
                            }
                        }
                    }
                    .padding(.vertical, Spacing.md)
                }
            }
        }
    }

    private func countFriendsInGroup(_ group: FriendGroup) -> Int {
        viewModel.friends.filter { group.memberIds.contains($0.friendId) }.count
    }
}

// MARK: - Custom Segmented Control

struct CustomSegmentedControl: View {
    @Binding var selectedIndex: Int
    let options: [String]

    var body: some View {
        HStack(spacing: Spacing.xxs) {
            ForEach(options.indices, id: \.self) { index in
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedIndex = index
                    }
                }) {
                    Text(options[index])
                        .font(.gatherSubheadline)
                        .fontWeight(selectedIndex == index ? .semibold : .regular)
                        .foregroundStyle(selectedIndex == index ? .black : Color.gatherTextSecondary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            Capsule()
                                .fill(selectedIndex == index ? Color.white : Color.clear)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(Spacing.xxs)
        .background(Color.gatherSurface)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Color.gatherBorder, lineWidth: 1)
        )
    }
}

// MARK: - Group Row

struct GroupRow: View {
    let group: FriendGroup
    let friendCount: Int

    var body: some View {
        HStack(spacing: Spacing.md) {
            Text(group.displayEmoji)
                .font(.gatherEmoji)
                .frame(width: AvatarSize.md, height: AvatarSize.md)
                .background(Color.gatherSurface)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                HStack(spacing: Spacing.xs) {
                    Text(group.name)
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)

                    if group.isDefault {
                        Text("Default")
                            .font(.gatherCaption2)
                            .foregroundStyle(Color.gatherTextTertiary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(Color.gatherSurface)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                    }
                }

                Text("\(friendCount) friend\(friendCount == 1 ? "" : "s")")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.gatherTextTertiary)
        }
        .padding(.vertical, Spacing.sm)
    }
}

#Preview {
    FriendsView()
        .preferredColorScheme(.dark)
}
