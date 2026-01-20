import Combine
import EventKit
import Foundation

@MainActor
class CalendarManager: ObservableObject {
    static let shared = CalendarManager()

    @Published private(set) var authorizationStatus: EKAuthorizationStatus = .notDetermined
    @Published private(set) var availableCalendars: [EKCalendar] = []
    @Published var selectedCalendarIds: Set<String> = []

    private let eventStore = EKEventStore()

    private init() {
        updateAuthorizationStatus()
        loadSelectedCalendars()
    }

    // MARK: - Authorization

    var isAuthorized: Bool {
        authorizationStatus == .fullAccess || authorizationStatus == .authorized
    }

    func updateAuthorizationStatus() {
        authorizationStatus = EKEventStore.authorizationStatus(for: .event)
        if isAuthorized {
            loadCalendars()
        }
    }

    func requestAccess() async -> Bool {
        do {
            let granted = try await eventStore.requestFullAccessToEvents()
            await MainActor.run {
                updateAuthorizationStatus()
            }
            return granted
        } catch {
            print("Calendar access error: \(error)")
            return false
        }
    }

    // MARK: - Calendars

    private func loadCalendars() {
        availableCalendars = eventStore.calendars(for: .event)
            .filter { $0.allowsContentModifications }
            .sorted { $0.title < $1.title }
    }

    private func loadSelectedCalendars() {
        if let ids = UserDefaults.standard.stringArray(forKey: "selectedCalendarIds") {
            selectedCalendarIds = Set(ids)
        }
    }

    func saveSelectedCalendars() {
        UserDefaults.standard.set(Array(selectedCalendarIds), forKey: "selectedCalendarIds")
    }

    // MARK: - Fetch Events (for busy times)

    func fetchBusyTimes(from startDate: Date, to endDate: Date) async -> [DateInterval] {
        guard isAuthorized else { return [] }

        let calendars = availableCalendars.filter { selectedCalendarIds.contains($0.calendarIdentifier) }
        guard !calendars.isEmpty else { return [] }

        let predicate = eventStore.predicateForEvents(
            withStart: startDate,
            end: endDate,
            calendars: calendars
        )

        let events = eventStore.events(matching: predicate)

        return events
            .filter { !$0.isAllDay } // Ignore all-day events
            .map { DateInterval(start: $0.startDate, end: $0.endDate) }
    }

    // MARK: - Create Event

    func createCalendarEvent(
        title: String,
        startDate: Date,
        endDate: Date,
        location: String? = nil,
        notes: String? = nil
    ) async throws -> String {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }

        let event = EKEvent(eventStore: eventStore)
        event.title = title
        event.startDate = startDate
        event.endDate = endDate
        event.location = location
        event.notes = notes
        event.calendar = eventStore.defaultCalendarForNewEvents

        // Add reminder 1 hour before
        let alarm = EKAlarm(relativeOffset: -3600)
        event.addAlarm(alarm)

        try eventStore.save(event, span: .thisEvent)

        return event.eventIdentifier
    }

    // MARK: - Update Event

    func updateCalendarEvent(
        identifier: String,
        title: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        location: String? = nil,
        notes: String? = nil
    ) async throws {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }

        guard let event = eventStore.event(withIdentifier: identifier) else {
            throw CalendarError.eventNotFound
        }

        if let title = title { event.title = title }
        if let startDate = startDate { event.startDate = startDate }
        if let endDate = endDate { event.endDate = endDate }
        if let location = location { event.location = location }
        if let notes = notes { event.notes = notes }

        try eventStore.save(event, span: .thisEvent)
    }

    // MARK: - Delete Event

    func deleteCalendarEvent(identifier: String) async throws {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }

        guard let event = eventStore.event(withIdentifier: identifier) else {
            throw CalendarError.eventNotFound
        }

        try eventStore.remove(event, span: .thisEvent)
    }
}

// MARK: - Errors

enum CalendarError: Error, LocalizedError {
    case notAuthorized
    case eventNotFound
    case saveFailed

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Calendar access not authorized"
        case .eventNotFound:
            return "Calendar event not found"
        case .saveFailed:
            return "Failed to save calendar event"
        }
    }
}
