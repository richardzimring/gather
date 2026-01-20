import Combine
import Foundation

@MainActor
class CreateEventViewModel: ObservableObject {
    @Published var title = ""
    @Published var selectedActivity: Activity?
    @Published var startDate = Date().adding(hours: 1)
    @Published var endDate = Date().adding(hours: 2)
    @Published var location = ""
    @Published var notes = ""
    @Published var selectedFriendIds: Set<String> = []
    @Published var showInviteList = true

    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var currentStep = 0
    let totalSteps = 5

    // MARK: - Computed Properties

    var stepTitle: String {
        switch currentStep {
        case 0: return "What do you want to do?"
        case 1: return "When?"
        case 2: return "Who's invited?"
        case 3: return "Where? (Optional)"
        case 4: return "Review"
        default: return ""
        }
    }

    var canProceed: Bool {
        switch currentStep {
        case 0: return selectedActivity != nil || !title.isEmpty
        case 1: return endDate > startDate
        case 2: return !selectedFriendIds.isEmpty
        case 3: return true // Location is optional
        case 4: return true
        default: return false
        }
    }

    var eventTitle: String {
        if !title.isEmpty {
            return title
        }
        if let activity = selectedActivity {
            return activity.name
        }
        return "Event"
    }

    var eventEmoji: String? {
        selectedActivity?.emoji
    }

    // MARK: - Navigation

    func nextStep() {
        if currentStep < totalSteps - 1 {
            currentStep += 1
        }
    }

    func previousStep() {
        if currentStep > 0 {
            currentStep -= 1
        }
    }

    // MARK: - Event Creation

    func createEvent() async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            let request = CreateEventRequest(
                title: eventTitle,
                activityId: selectedActivity?.activityId,
                emoji: eventEmoji,
                startTime: startDate.iso8601String,
                endTime: endDate.iso8601String,
                location: location.isEmpty ? nil : location,
                notes: notes.isEmpty ? nil : notes,
                inviteeIds: Array(selectedFriendIds),
                showInviteList: showInviteList
            )

            let _: EventResponse = try await APIClient.shared.post("/events", body: request)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

@MainActor
class EventDetailViewModel: ObservableObject {
    @Published var event: Event?
    @Published var isLoading = false
    @Published var errorMessage: String?

    let eventId: String

    init(eventId: String) {
        self.eventId = eventId
    }

    var currentUserId: String {
        AuthManager.shared.currentUser?.userId ?? ""
    }

    var isHost: Bool {
        event?.hostId == currentUserId
    }

    var userInvitee: EventInvitee? {
        event?.invitees.first { $0.userId == currentUserId }
    }

    // MARK: - Data Loading

    func loadEvent() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: EventResponse = try await APIClient.shared.get("/events/\(eventId)")
            event = response.event
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Event Actions

    func respond(status: InviteeStatus, counterProposal: CounterProposal? = nil) async -> Bool {
        do {
            let request = EventResponseRequest(status: status, counterProposal: counterProposal)
            let response: EventResponse = try await APIClient.shared.post(
                "/events/\(eventId)/respond",
                body: request
            )
            event = response.event

            // Add to calendar if accepted
            if status == .accepted, let event = event {
                await addToCalendar(event)
            }

            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func cancelEvent() async -> Bool {
        do {
            try await APIClient.shared.delete("/events/\(eventId)")

            // Remove from calendar
            if let calendarEventId = event?.calendarEventId {
                try? await CalendarManager.shared.deleteCalendarEvent(identifier: calendarEventId)
            }

            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func addToCalendar(_ event: Event) async {
        guard let startDate = event.startDate, let endDate = event.endDate else { return }

        do {
            let calendarEventId = try await CalendarManager.shared.createCalendarEvent(
                title: event.title,
                startDate: startDate,
                endDate: endDate,
                location: event.location,
                notes: event.notes
            )

            // Update event with calendar ID
            let updateRequest = UpdateEventRequest()
            // Note: calendarEventId would need to be stored server-side
            print("Created calendar event: \(calendarEventId)")
        } catch {
            print("Failed to add to calendar: \(error)")
        }
    }
}
