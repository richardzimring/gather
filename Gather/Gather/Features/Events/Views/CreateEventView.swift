import SwiftUI

struct CreateEventView: View {
    @StateObject private var viewModel = CreateEventViewModel()
    @StateObject private var friendsViewModel = FriendsViewModel()

    @Environment(\.dismiss) private var dismiss

    var preselectedFriendIds: [String]?

    init(preselectedFriendIds: [String]? = nil) {
        self.preselectedFriendIds = preselectedFriendIds
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Progress Indicator
                    ProgressView(value: Double(viewModel.currentStep + 1), total: Double(viewModel.totalSteps))
                        .tint(Color.white)
                        .padding(.horizontal, Spacing.screenEdge)

                    // Step Title
                    Text(viewModel.stepTitle)
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .padding(.top, Spacing.lg)
                        .padding(.horizontal, Spacing.screenEdge)

                    // Step Content
                    Group {
                        switch viewModel.currentStep {
                        case 0:
                            ActivitySelectionStep(viewModel: viewModel)
                        case 1:
                            TimeSelectionStep(viewModel: viewModel)
                        case 2:
                            InviteeSelectionStep(viewModel: viewModel, friendsViewModel: friendsViewModel)
                        case 3:
                            DetailsStep(viewModel: viewModel)
                        case 4:
                            ReviewStep(viewModel: viewModel, friendsViewModel: friendsViewModel)
                        default:
                            EmptyView()
                        }
                    }
                    .frame(maxHeight: .infinity)

                    // Navigation Buttons
                    HStack(spacing: Spacing.md) {
                        if viewModel.currentStep > 0 {
                            SecondaryButton(title: "Back") {
                                viewModel.previousStep()
                            }
                        }

                        if viewModel.currentStep < viewModel.totalSteps - 1 {
                            PrimaryButton(
                                title: "Next",
                                isEnabled: viewModel.canProceed
                            ) {
                                viewModel.nextStep()
                            }
                        } else {
                            PrimaryButton(
                                title: "Send Invitations",
                                icon: "paperplane.fill",
                                isEnabled: viewModel.canProceed,
                                isLoading: viewModel.isLoading
                            ) {
                                Task {
                                    let success = await viewModel.createEvent()
                                    if success {
                                        dismiss()
                                    }
                                }
                            }
                        }
                    }
                    .padding(Spacing.screenEdge)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(Color.gatherTextSecondary)
                }
            }
            .task {
                await friendsViewModel.loadData()

                if let preselected = preselectedFriendIds {
                    viewModel.selectedFriendIds = Set(preselected)
                }
            }
        }
    }
}

// MARK: - Activity Selection Step

struct ActivitySelectionStep: View {
    @ObservedObject var viewModel: CreateEventViewModel
    @State private var activities: [Activity] = Activity.defaultActivities

    let columns = [GridItem(.adaptive(minimum: 80))]

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Custom title option
                TextField("Or type your own...", text: $viewModel.title)
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextPrimary)
                    .padding(Spacing.md)
                    .background(Color.gatherSurface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(Color.gatherBorder, lineWidth: 1)
                    )
                    .padding(.horizontal, Spacing.screenEdge)

                // Activity grid
                LazyVGrid(columns: columns, spacing: Spacing.sm) {
                    ForEach(activities) { activity in
                        ActivityGridItem(
                            activity: activity,
                            isSelected: viewModel.selectedActivity?.activityId == activity.activityId
                        ) {
                            viewModel.selectedActivity = activity
                            viewModel.title = ""
                        }
                    }
                }
                .padding(.horizontal, Spacing.screenEdge)
            }
            .padding(.vertical, Spacing.lg)
        }
        .task {
            // Load activities from API
            do {
                let response: ActivitiesResponse = try await APIClient.shared.get("/activities")
                activities = response.activities
            } catch {
                // Use defaults
            }
        }
    }
}

// MARK: - Time Selection Step

struct TimeSelectionStep: View {
    @ObservedObject var viewModel: CreateEventViewModel

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Date/Time Pickers
            VStack(spacing: Spacing.md) {
                HStack {
                    Text("Start")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                    Spacer()
                    DatePicker("", selection: $viewModel.startDate)
                        .labelsHidden()
                        .colorScheme(.dark)
                }
                .padding(Spacing.md)
                .background(Color.gatherSurface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )

                HStack {
                    Text("End")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                    Spacer()
                    DatePicker("", selection: $viewModel.endDate)
                        .labelsHidden()
                        .colorScheme(.dark)
                }
                .padding(Spacing.md)
                .background(Color.gatherSurface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )
            }
            .padding(.horizontal, Spacing.screenEdge)

            // Quick options
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Quick select")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextSecondary)

                HStack(spacing: Spacing.sm) {
                    QuickTimeButton(title: "1 hour") {
                        viewModel.endDate = viewModel.startDate.adding(hours: 1)
                    }

                    QuickTimeButton(title: "2 hours") {
                        viewModel.endDate = viewModel.startDate.adding(hours: 2)
                    }

                    QuickTimeButton(title: "3 hours") {
                        viewModel.endDate = viewModel.startDate.adding(hours: 3)
                    }
                }
            }
            .padding(.horizontal, Spacing.screenEdge)

            Spacer()

            // Validation message
            if viewModel.endDate <= viewModel.startDate {
                Text("End time must be after start time")
                    .font(.gatherSubheadline)
                    .foregroundStyle(Color.gatherError)
            }
        }
        .padding(.vertical, Spacing.lg)
    }
}

struct QuickTimeButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.gatherSubheadline)
                .foregroundStyle(Color.gatherTextPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.xs)
                .background(Color.gatherSurface)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Invitee Selection Step

struct InviteeSelectionStep: View {
    @ObservedObject var viewModel: CreateEventViewModel
    @ObservedObject var friendsViewModel: FriendsViewModel

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Toggle for showing invite list
            HStack {
                Text("Show guest list to invitees")
                    .font(.gatherSubheadline)
                    .foregroundStyle(Color.gatherTextPrimary)
                Spacer()
                Toggle("", isOn: $viewModel.showInviteList)
                    .labelsHidden()
                    .tint(Color.white)
            }
            .padding(.horizontal, Spacing.screenEdge)

            if friendsViewModel.friends.isEmpty {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "person.2")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(Color.gatherTextTertiary)

                    Text("Add friends first to invite them")
                        .font(.gatherBody)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(friendsViewModel.friends) { friendship in
                            Button(action: {
                                toggleFriend(friendship.friendId)
                            }) {
                                HStack(spacing: Spacing.md) {
                                    AvatarView(user: friendship.friend, size: AvatarSize.sm)

                                    Text(friendship.displayName)
                                        .font(.gatherBody)
                                        .foregroundStyle(Color.gatherTextPrimary)

                                    Spacer()

                                    if viewModel.selectedFriendIds.contains(friendship.friendId) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 22))
                                            .foregroundStyle(Color.white)
                                    } else {
                                        Image(systemName: "circle")
                                            .font(.system(size: 22))
                                            .foregroundStyle(Color.gatherTextTertiary)
                                    }
                                }
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.screenEdge)
                            }

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, Spacing.screenEdge + AvatarSize.sm + Spacing.md)
                        }
                    }
                }
            }

            // Selected count
            Text("\(viewModel.selectedFriendIds.count) friend\(viewModel.selectedFriendIds.count == 1 ? "" : "s") selected")
                .font(.gatherCaption)
                .foregroundStyle(Color.gatherTextSecondary)
                .padding(.bottom, Spacing.sm)
        }
    }

    private func toggleFriend(_ friendId: String) {
        if viewModel.selectedFriendIds.contains(friendId) {
            viewModel.selectedFriendIds.remove(friendId)
        } else {
            viewModel.selectedFriendIds.insert(friendId)
        }
    }
}

// MARK: - Details Step

struct DetailsStep: View {
    @ObservedObject var viewModel: CreateEventViewModel

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Location
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Label("Location", systemImage: "mappin")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextSecondary)

                TextField("Add a location...", text: $viewModel.location)
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextPrimary)
                    .padding(Spacing.md)
                    .background(Color.gatherSurface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(Color.gatherBorder, lineWidth: 1)
                    )
            }

            // Notes
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Label("Notes", systemImage: "note.text")
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextSecondary)

                TextField("Add notes...", text: $viewModel.notes, axis: .vertical)
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextPrimary)
                    .lineLimit(3...6)
                    .padding(Spacing.md)
                    .background(Color.gatherSurface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(Color.gatherBorder, lineWidth: 1)
                    )
            }

            Spacer()
        }
        .padding(.horizontal, Spacing.screenEdge)
        .padding(.vertical, Spacing.lg)
    }
}

// MARK: - Review Step

struct ReviewStep: View {
    @ObservedObject var viewModel: CreateEventViewModel
    @ObservedObject var friendsViewModel: FriendsViewModel

    var invitedFriends: [Friendship] {
        friendsViewModel.friends.filter { viewModel.selectedFriendIds.contains($0.friendId) }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Event Card Preview
                VStack(spacing: Spacing.md) {
                    EmojiBadge(emoji: viewModel.eventEmoji ?? "📅", size: 72)

                    Text(viewModel.eventTitle)
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)

                    VStack(spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "calendar")
                            Text(viewModel.startDate.relativeDateString)
                        }

                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "clock")
                            Text("\(viewModel.startDate.timeString) - \(viewModel.endDate.timeString)")
                        }

                        if !viewModel.location.isEmpty {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "mappin")
                                Text(viewModel.location)
                            }
                        }
                    }
                    .font(.gatherSubheadline)
                    .foregroundStyle(Color.gatherTextSecondary)
                }
                .padding(Spacing.xl)
                .frame(maxWidth: .infinity)
                .background(Color.gatherSurface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.card)
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )

                // Invitees
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Inviting \(invitedFriends.count) friend\(invitedFriends.count == 1 ? "" : "s")")
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)

                    HStack(spacing: -Spacing.sm) {
                        ForEach(invitedFriends.prefix(5)) { friendship in
                            AvatarView(user: friendship.friend, size: AvatarSize.sm)
                                .overlay(Circle().stroke(Color.gatherBackground, lineWidth: 2))
                        }

                        if invitedFriends.count > 5 {
                            Text("+\(invitedFriends.count - 5)")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextSecondary)
                                .frame(width: AvatarSize.sm, height: AvatarSize.sm)
                                .background(Color.gatherSurface)
                                .clipShape(Circle())
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.gatherSubheadline)
                        .foregroundStyle(Color.gatherError)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(Spacing.screenEdge)
        }
    }
}

#Preview {
    CreateEventView()
        .preferredColorScheme(.dark)
}
