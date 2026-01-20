import Foundation
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    @Published var upcomingEvents: [Event] = []
    @Published var pendingInvitations: [Event] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()

    init() {
        setupNotificationObservers()
    }

    // MARK: - Data Loading

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: EventsResponse = try await APIClient.shared.get("/events")
            let currentUserId = AuthManager.shared.currentUser?.userId ?? ""

            // Separate into upcoming (accepted/host) and pending invitations
            var upcoming: [Event] = []
            var pending: [Event] = []

            for event in response.events {
                if event.status == .cancelled { continue }

                let isHost = event.hostId == currentUserId
                let invitee = event.invitees.first { $0.userId == currentUserId }

                if isHost {
                    upcoming.append(event)
                } else if let invitee = invitee {
                    if invitee.status == .pending {
                        pending.append(event)
                    } else if invitee.status == .accepted || invitee.status == .maybe {
                        upcoming.append(event)
                    }
                }
            }

            // Sort by start time
            self.upcomingEvents = upcoming.sorted {
                ($0.startDate ?? .distantPast) < ($1.startDate ?? .distantPast)
            }
            self.pendingInvitations = pending.sorted {
                ($0.startDate ?? .distantPast) < ($1.startDate ?? .distantPast)
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Event Actions

    func respondToInvitation(eventId: String, status: InviteeStatus) async {
        do {
            let request = EventResponseRequest(status: status, counterProposal: nil)
            let _: EventResponse = try await APIClient.shared.post(
                "/events/\(eventId)/respond",
                body: request
            )

            // Reload data to update lists
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Notification Observers

    private func setupNotificationObservers() {
        NotificationCenter.default.publisher(for: .eventInvitationReceived)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task {
                    await self?.loadData()
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .eventUpdated)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task {
                    await self?.loadData()
                }
            }
            .store(in: &cancellables)
    }
}
