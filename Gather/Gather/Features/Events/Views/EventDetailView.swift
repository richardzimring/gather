import SwiftUI

struct EventDetailView: View {
    @StateObject private var viewModel: EventDetailViewModel
    @State private var showCancelAlert = false
    @State private var showResponseSheet = false

    @Environment(\.dismiss) private var dismiss

    init(eventId: String) {
        _viewModel = StateObject(wrappedValue: EventDetailViewModel(eventId: eventId))
    }

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            Group {
                if viewModel.isLoading && viewModel.event == nil {
                    LoadingView(message: "Loading event...")
                } else if let event = viewModel.event {
                    eventContent(event)
                } else if let error = viewModel.errorMessage {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48, weight: .light))
                            .foregroundStyle(Color.gatherTextTertiary)
                        Text(error)
                            .font(.gatherBody)
                            .foregroundStyle(Color.gatherTextSecondary)
                    }
                }
            }
        }
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadEvent()
        }
        .refreshable {
            await viewModel.loadEvent()
        }
        .sheet(isPresented: $showResponseSheet) {
            if let event = viewModel.event {
                ResponseSheet(event: event, viewModel: viewModel)
            }
        }
        .alert("Cancel Event", isPresented: $showCancelAlert) {
            Button("Keep Event", role: .cancel) {}
            Button("Cancel Event", role: .destructive) {
                Task {
                    let success = await viewModel.cancelEvent()
                    if success {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("Are you sure you want to cancel this event? All invitees will be notified.")
        }
    }

    @ViewBuilder
    private func eventContent(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                // Header
                VStack(spacing: Spacing.md) {
                    EmojiBadge(emoji: event.displayEmoji, size: 80)

                    Text(event.title)
                        .font(.gatherTitle)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .multilineTextAlignment(.center)

                    if event.status == .cancelled {
                        Text("CANCELLED")
                            .font(.gatherCaption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xxs)
                            .background(Capsule().fill(Color.gatherError))
                    }
                }
                .padding(.top, Spacing.lg)

                // Details Card
                VStack(spacing: Spacing.md) {
                    DetailRow(icon: "calendar", title: "Date", value: event.startDate?.fullDateString ?? "")
                    DetailRow(icon: "clock", title: "Time", value: "\(event.startDate?.timeString ?? "") - \(event.endDate?.timeString ?? "")")

                    if let location = event.location, !location.isEmpty {
                        DetailRow(icon: "mappin", title: "Location", value: location)
                    }

                    if let notes = event.notes, !notes.isEmpty {
                        DetailRow(icon: "note.text", title: "Notes", value: notes)
                    }
                }
                .padding(Spacing.md)
                .background(Color.gatherSurface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.card)
                        .stroke(Color.gatherBorder, lineWidth: 1)
                )
                .padding(.horizontal, Spacing.screenEdge)

                // Invitees Card
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Text("Guests")
                            .font(.gatherHeadline)
                            .foregroundStyle(Color.gatherTextPrimary)

                        Spacer()

                        Text("\(event.acceptedCount + 1) going")
                            .font(.gatherSubheadline)
                            .foregroundStyle(Color.gatherTextSecondary)
                    }

                    // Host
                    HStack(spacing: Spacing.md) {
                        AvatarView(user: nil, size: AvatarSize.sm)

                        Text("Host")
                            .font(.gatherBody)
                            .foregroundStyle(Color.gatherTextPrimary)

                        Spacer()

                        Label("Host", systemImage: "crown.fill")
                            .font(.gatherCaption)
                            .foregroundStyle(Color.gatherAccent)
                    }

                    // Invitees
                    if event.showInviteList || viewModel.isHost {
                        ForEach(event.invitees) { invitee in
                            InviteeRow(invitee: invitee, isCurrentUser: invitee.userId == viewModel.currentUserId)
                        }
                    } else {
                        if let invitee = viewModel.userInvitee {
                            InviteeRow(invitee: invitee, isCurrentUser: true)
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
                .padding(.horizontal, Spacing.screenEdge)

                Spacer(minLength: Spacing.xxl)

                // Actions
                if event.status != .cancelled {
                    actionButtons(event)
                }
            }
            .padding(.bottom, Spacing.xl)
        }
    }

    @ViewBuilder
    private func actionButtons(_ event: Event) -> some View {
        VStack(spacing: Spacing.sm) {
            if viewModel.isHost {
                SecondaryButton(title: "Cancel Event", icon: "xmark") {
                    showCancelAlert = true
                }
                .padding(.horizontal, Spacing.screenEdge)
            } else if let invitee = viewModel.userInvitee {
                if invitee.status == .pending {
                    HStack(spacing: Spacing.sm) {
                        Button(action: {
                            Task {
                                await viewModel.respond(status: .declined)
                            }
                        }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.gatherTextPrimary)
                                .frame(width: 56, height: 56)
                                .background(Color.gatherSurface)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.gatherBorderStrong, lineWidth: 1)
                                )
                        }

                        Button(action: {
                            Task {
                                await viewModel.respond(status: .maybe)
                            }
                        }) {
                            Image(systemName: "questionmark")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.gatherTextPrimary)
                                .frame(width: 56, height: 56)
                                .background(Color.gatherSurface)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.gatherBorderStrong, lineWidth: 1)
                                )
                        }

                        Button(action: {
                            Task {
                                await viewModel.respond(status: .accepted)
                            }
                        }) {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "checkmark")
                                Text("Accept")
                            }
                            .font(.gatherButtonPrimary)
                            .foregroundStyle(.black)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, Spacing.md)
                            .background(Capsule().fill(Color.white))
                        }
                    }
                    .padding(.horizontal, Spacing.screenEdge)
                } else {
                    SecondaryButton(title: "Change Response") {
                        showResponseSheet = true
                    }
                    .padding(.horizontal, Spacing.screenEdge)
                }
            }
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.white)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.gatherCaption)
                    .foregroundStyle(Color.gatherTextTertiary)

                Text(value)
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextPrimary)
            }

            Spacer()
        }
    }
}

// MARK: - Invitee Row

struct InviteeRow: View {
    let invitee: EventInvitee
    let isCurrentUser: Bool

    var body: some View {
        HStack(spacing: Spacing.md) {
            AvatarView(user: nil, size: AvatarSize.sm)

            VStack(alignment: .leading, spacing: 2) {
                Text(isCurrentUser ? "You" : "Guest")
                    .font(.gatherBody)
                    .foregroundStyle(Color.gatherTextPrimary)

                if let respondedAt = invitee.respondedAt {
                    Text("Responded \(respondedAt)")
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextTertiary)
                }
            }

            Spacer()

            statusBadge(for: invitee.status)
        }
    }

    private func statusBadge(for status: InviteeStatus) -> some View {
        HStack(spacing: Spacing.xxs) {
            Image(systemName: status.icon)
            Text(status.displayName)
        }
        .font(.gatherCaption)
        .foregroundStyle(statusColor(for: status))
        .padding(.horizontal, Spacing.xs)
        .padding(.vertical, Spacing.xxs)
        .background(
            Capsule()
                .fill(statusColor(for: status).opacity(0.2))
        )
    }

    private func statusColor(for status: InviteeStatus) -> Color {
        switch status {
        case .pending: return .eventPending
        case .accepted: return .eventAccepted
        case .declined: return .eventDeclined
        case .maybe: return .eventMaybe
        }
    }
}

// MARK: - Response Sheet

struct ResponseSheet: View {
    let event: Event
    @ObservedObject var viewModel: EventDetailViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                VStack(spacing: Spacing.xl) {
                    Text("Change your response")
                        .font(.gatherTitle2)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .padding(.top, Spacing.xl)

                    VStack(spacing: Spacing.md) {
                        ResponseOption(
                            status: .accepted,
                            currentStatus: viewModel.userInvitee?.status
                        ) {
                            Task {
                                await viewModel.respond(status: .accepted)
                                dismiss()
                            }
                        }

                        ResponseOption(
                            status: .maybe,
                            currentStatus: viewModel.userInvitee?.status
                        ) {
                            Task {
                                await viewModel.respond(status: .maybe)
                                dismiss()
                            }
                        }

                        ResponseOption(
                            status: .declined,
                            currentStatus: viewModel.userInvitee?.status
                        ) {
                            Task {
                                await viewModel.respond(status: .declined)
                                dismiss()
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.screenEdge)

                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(Color.gatherTextSecondary)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct ResponseOption: View {
    let status: InviteeStatus
    let currentStatus: InviteeStatus?
    let action: () -> Void

    var isSelected: Bool {
        status == currentStatus
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                Image(systemName: status.icon)
                    .font(.system(size: 22))
                    .foregroundStyle(statusColor)

                Text(status.displayName)
                    .font(.gatherHeadline)
                    .foregroundStyle(Color.gatherTextPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(Color.white)
                }
            }
            .padding(Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isSelected ? Color.white.opacity(0.1) : Color.gatherSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(isSelected ? Color.white.opacity(0.3) : Color.gatherBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var statusColor: Color {
        switch status {
        case .pending: return .eventPending
        case .accepted: return .eventAccepted
        case .declined: return .eventDeclined
        case .maybe: return .eventMaybe
        }
    }
}

#Preview {
    NavigationStack {
        EventDetailView(eventId: "preview")
    }
    .preferredColorScheme(.dark)
}
