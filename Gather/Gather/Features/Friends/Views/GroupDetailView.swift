import SwiftUI

struct GroupDetailView: View {
    let group: FriendGroup
    @ObservedObject var viewModel: FriendsViewModel

    @State private var isEditing = false
    @State private var editedName = ""
    @State private var editedEmoji = ""
    @State private var selectedMemberIds: Set<String> = []
    @State private var showDeleteAlert = false

    @Environment(\.dismiss) private var dismiss

    var members: [Friendship] {
        viewModel.friends.filter { group.memberIds.contains($0.friendId) }
    }

    var body: some View {
        List {
            // Group Info Section
            Section {
                HStack(spacing: Spacing.md) {
                    if isEditing {
                        TextField("Emoji", text: $editedEmoji)
                            .font(.gatherEmojiLarge)
                            .frame(width: 64, height: 64)
                            .background(Color(.systemGray6))
                            .clipShape(Circle())
                            .multilineTextAlignment(.center)
                    } else {
                        Text(group.displayEmoji)
                            .font(.gatherEmojiLarge)
                            .frame(width: 64, height: 64)
                            .background(Color(.systemGray6))
                            .clipShape(Circle())
                    }

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        if isEditing && !group.isDefault {
                            TextField("Group name", text: $editedName)
                                .font(.gatherTitle3)
                        } else {
                            Text(group.name)
                                .font(.gatherTitle3)
                        }

                        Text("\(members.count) member\(members.count == 1 ? "" : "s")")
                            .font(.gatherCaption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, Spacing.xs)
            }

            // Members Section
            Section("Members") {
                if isEditing {
                    ForEach(viewModel.friends) { friendship in
                        Button(action: {
                            toggleMember(friendship.friendId)
                        }) {
                            HStack {
                                AvatarView(user: friendship.friend, size: AvatarSize.sm)

                                Text(friendship.displayName)
                                    .font(.gatherBody)
                                    .foregroundStyle(.primary)

                                Spacer()

                                if selectedMemberIds.contains(friendship.friendId) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color.gatherPrimary)
                                } else {
                                    Image(systemName: "circle")
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }
                    }
                } else {
                    if members.isEmpty {
                        Text("No members yet")
                            .font(.gatherSubheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(members) { friendship in
                            NavigationLink(destination: FriendDetailView(friendship: friendship)) {
                                FriendRow(friendship: friendship)
                            }
                        }
                    }
                }
            }

            // Delete Section
            if !group.isDefault {
                Section {
                    Button(action: { showDeleteAlert = true }) {
                        HStack {
                            Spacer()
                            Text("Delete Group")
                                .foregroundStyle(.red)
                            Spacer()
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(isEditing ? "Edit Group" : "Group")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if isEditing {
                    Button("Save") {
                        Task {
                            await saveChanges()
                        }
                    }
                } else if !group.isDefault {
                    Button("Edit") {
                        startEditing()
                    }
                }
            }
        }
        .alert("Delete Group", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteGroup(groupId: group.groupId)
                    dismiss()
                }
            }
        } message: {
            Text("Are you sure you want to delete \"\(group.name)\"?")
        }
    }

    private func startEditing() {
        editedName = group.name
        editedEmoji = group.emoji ?? "👥"
        selectedMemberIds = Set(group.memberIds)
        isEditing = true
    }

    private func toggleMember(_ friendId: String) {
        if selectedMemberIds.contains(friendId) {
            selectedMemberIds.remove(friendId)
        } else {
            selectedMemberIds.insert(friendId)
        }
    }

    private func saveChanges() async {
        let name = group.isDefault ? nil : editedName.trimmingCharacters(in: .whitespaces)
        let emoji = group.isDefault ? nil : editedEmoji

        await viewModel.updateGroup(
            groupId: group.groupId,
            name: name,
            emoji: emoji,
            memberIds: Array(selectedMemberIds)
        )

        isEditing = false
    }
}
