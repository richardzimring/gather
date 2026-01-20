import SwiftUI

struct CreateGroupSheet: View {
    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var groupName = ""
    @State private var selectedEmoji = "👥"
    @State private var selectedFriendIds: Set<String> = []
    @State private var isLoading = false
    @State private var showEmojiPicker = false

    private let commonEmojis = ["👥", "💫", "🏠", "💼", "🎮", "⚽", "🎵", "📚", "🏋️", "🍕", "☕", "🎉"]

    var body: some View {
        NavigationStack {
            Form {
                // Group Info Section
                Section {
                    HStack(spacing: Spacing.md) {
                        Button(action: { showEmojiPicker.toggle() }) {
                            Text(selectedEmoji)
                                .font(.gatherEmojiLarge)
                                .frame(width: 64, height: 64)
                                .background(Color(.systemGray6))
                                .clipShape(Circle())
                        }

                        TextField("Group name", text: $groupName)
                            .font(.gatherTitle3)
                    }
                    .padding(.vertical, Spacing.xs)

                    if showEmojiPicker {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: Spacing.sm) {
                            ForEach(commonEmojis, id: \.self) { emoji in
                                Button(action: {
                                    selectedEmoji = emoji
                                    showEmojiPicker = false
                                }) {
                                    Text(emoji)
                                        .font(.gatherEmoji)
                                        .frame(width: 44, height: 44)
                                        .background(
                                            Circle()
                                                .fill(selectedEmoji == emoji ? Color.gatherPrimary.opacity(0.2) : Color.clear)
                                        )
                                }
                            }
                        }
                        .padding(.vertical, Spacing.xs)
                    }
                }

                // Members Section
                Section("Members") {
                    if viewModel.friends.isEmpty {
                        Text("Add friends first to create groups")
                            .font(.gatherSubheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(viewModel.friends) { friendship in
                            Button(action: {
                                toggleFriend(friendship.friendId)
                            }) {
                                HStack {
                                    AvatarView(user: friendship.friend, size: AvatarSize.sm)

                                    Text(friendship.displayName)
                                        .font(.gatherBody)
                                        .foregroundStyle(.primary)

                                    Spacer()

                                    if selectedFriendIds.contains(friendship.friendId) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(Color.gatherPrimary)
                                    } else {
                                        Image(systemName: "circle")
                                            .foregroundStyle(.tertiary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("New Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        Task {
                            await createGroup()
                        }
                    }
                    .disabled(groupName.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                }
            }
        }
    }

    private func toggleFriend(_ friendId: String) {
        if selectedFriendIds.contains(friendId) {
            selectedFriendIds.remove(friendId)
        } else {
            selectedFriendIds.insert(friendId)
        }
    }

    private func createGroup() async {
        isLoading = true

        let success = await viewModel.createGroup(
            name: groupName.trimmingCharacters(in: .whitespaces),
            emoji: selectedEmoji,
            memberIds: Array(selectedFriendIds)
        )

        if success {
            dismiss()
        }

        isLoading = false
    }
}

#Preview {
    CreateGroupSheet(viewModel: FriendsViewModel())
}
