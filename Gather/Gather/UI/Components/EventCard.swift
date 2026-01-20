import SwiftUI

struct EventCard: View {
    let event: Event
    let currentUserId: String
    var onTap: (() -> Void)?

    private var isHost: Bool {
        event.hostId == currentUserId
    }

    private var userInvitee: EventInvitee? {
        event.invitees.first { $0.userId == currentUserId }
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: Spacing.md) {
                // Emoji Badge
                EmojiBadge(emoji: event.displayEmoji, size: 56)

                // Content
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(event.title)
                        .font(.gatherHeadline)
                        .foregroundStyle(Color.gatherTextPrimary)
                        .lineLimit(1)

                    if let startDate = event.startDate {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 12))
                            Text(startDate.relativeDateString)
                            Text("•")
                            Text(startDate.timeString)
                        }
                        .font(.gatherSubheadline)
                        .foregroundStyle(Color.gatherTextSecondary)
                    }

                    if let location = event.location, !location.isEmpty {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "mappin")
                                .font(.system(size: 11))
                            Text(location)
                                .lineLimit(1)
                        }
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextTertiary)
                    }
                }

                Spacer()

                // Status
                VStack(alignment: .trailing, spacing: Spacing.xxs) {
                    statusBadge

                    if event.invitees.count > 0 {
                        Text("\(event.acceptedCount)/\(event.invitees.count + 1)")
                            .font(.gatherCaption)
                            .foregroundStyle(Color.gatherTextTertiary)
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
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var statusBadge: some View {
        if isHost {
            Label("Host", systemImage: "crown.fill")
                .font(.gatherCaption)
                .foregroundStyle(.black)
                .padding(.horizontal, Spacing.xs)
                .padding(.vertical, Spacing.xxs)
                .background(Capsule().fill(Color.gatherAccent))
        } else if let invitee = userInvitee {
            statusLabel(for: invitee.status)
        }
    }

    private func statusLabel(for status: InviteeStatus) -> some View {
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

#Preview {
    ZStack {
        Color.gatherBackground.ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            EventCard(
                event: Event(
                    eventId: "1",
                    hostId: "user1",
                    title: "Coffee with Sarah",
                    activityId: nil,
                    emoji: "☕",
                    startTime: Date().adding(days: 1).iso8601String,
                    endTime: Date().adding(days: 1).adding(hours: 1).iso8601String,
                    location: "Starbucks Downtown",
                    notes: nil,
                    invitees: [
                        EventInvitee(userId: "user2", status: .accepted),
                        EventInvitee(userId: "user3", status: .pending)
                    ],
                    showInviteList: true,
                    status: .sent,
                    createdAt: Date().iso8601String,
                    updatedAt: Date().iso8601String
                ),
                currentUserId: "user1"
            )

            EventCard(
                event: Event(
                    eventId: "2",
                    hostId: "user2",
                    title: "Team Dinner",
                    activityId: nil,
                    emoji: "🍽️",
                    startTime: Date().adding(days: 3).iso8601String,
                    endTime: Date().adding(days: 3).adding(hours: 2).iso8601String,
                    location: nil,
                    notes: nil,
                    invitees: [
                        EventInvitee(userId: "user1", status: .pending)
                    ],
                    showInviteList: true,
                    status: .sent,
                    createdAt: Date().iso8601String,
                    updatedAt: Date().iso8601String
                ),
                currentUserId: "user1"
            )
        }
        .padding(Spacing.screenEdge)
    }
    .preferredColorScheme(.dark)
}
