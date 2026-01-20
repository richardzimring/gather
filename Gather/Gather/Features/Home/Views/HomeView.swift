import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showCreateEvent = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Pure black background
                Color.gatherBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.xl) {
                        // Pending Invitations
                        if !viewModel.pendingInvitations.isEmpty {
                            invitationsSection
                        }

                        // Upcoming Events
                        upcomingSection
                    }
                    .padding(.horizontal, Spacing.screenEdge)
                    .padding(.vertical, Spacing.lg)
                }
                .refreshable {
                    await viewModel.loadData()
                }

                // Floating Action Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        FloatingActionButton(icon: "plus") {
                            showCreateEvent = true
                        }
                    }
                }
                .padding(Spacing.screenEdge)
            }
            .navigationTitle("Home")
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showCreateEvent) {
                CreateEventView()
            }
        }
    }

    // MARK: - Sections

    private var invitationsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Invitations")
                    .font(.gatherTitle3)
                    .foregroundStyle(Color.gatherTextPrimary)

                Spacer()

                Text("\(viewModel.pendingInvitations.count)")
                    .font(.gatherCaption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.black)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(Capsule().fill(Color.white))
            }

            ForEach(viewModel.pendingInvitations) { event in
                InvitationCard(event: event) { status in
                    Task {
                        await viewModel.respondToInvitation(eventId: event.eventId, status: status)
                    }
                }
            }
        }
    }

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Upcoming")
                .font(.gatherTitle3)
                .foregroundStyle(Color.gatherTextPrimary)

            if viewModel.isLoading && viewModel.upcomingEvents.isEmpty {
                ForEach(0..<3, id: \.self) { _ in
                    SkeletonEventCard()
                }
            } else if viewModel.upcomingEvents.isEmpty && viewModel.pendingInvitations.isEmpty {
                EmptyStateView.noEvents()
                    .frame(maxWidth: .infinity)
            } else if viewModel.upcomingEvents.isEmpty {
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar")
                        .font(.system(size: 32, weight: .light))
                        .foregroundStyle(Color.gatherTextTertiary)
                    Text("No upcoming events")
                        .font(.gatherSubheadline)
                        .foregroundStyle(Color.gatherTextSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
            } else {
                ForEach(viewModel.upcomingEvents) { event in
                    NavigationLink(destination: EventDetailView(eventId: event.eventId)) {
                        EventCard(
                            event: event,
                            currentUserId: AuthManager.shared.currentUser?.userId ?? ""
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - Invitation Card

struct InvitationCard: View {
    let event: Event
    let onRespond: (InviteeStatus) -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                EmojiBadge(emoji: event.displayEmoji, size: 48)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(event.title)
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)

                    if let startDate = event.startDate {
                        Text("\(startDate.relativeDateString) at \(startDate.timeString)")
                            .font(.gatherSubheadline)
                            .foregroundStyle(Color.gatherTextSecondary)
                    }
                }

                Spacer()
            }

            HStack(spacing: Spacing.sm) {
                // Decline Button
                Button(action: { onRespond(.declined) }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.gatherTextPrimary)
                        .frame(width: 44, height: 44)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorderStrong, lineWidth: 1)
                        )
                }

                // Maybe Button
                Button(action: { onRespond(.maybe) }) {
                    Image(systemName: "questionmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.gatherTextPrimary)
                        .frame(width: 44, height: 44)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorderStrong, lineWidth: 1)
                        )
                }

                Spacer()

                // Accept Button
                Button(action: { onRespond(.accepted) }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark")
                        Text("Accept")
                    }
                    .font(.gatherButtonPrimary)
                    .foregroundStyle(.black)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.sm)
                    .background(Capsule().fill(Color.white))
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.gatherSurface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.card)
                .stroke(Color.gatherBorder, lineWidth: 1)
        )
    }
}

#Preview {
    HomeView()
        .preferredColorScheme(.dark)
}
