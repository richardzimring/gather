import Foundation
import Combine

@MainActor
class AvailabilityViewModel: ObservableObject {
    @Published var windows: [AvailabilityWindow] = []
    @Published var friendsAvailability: [FriendAvailability] = []
    @Published var busyTimes: [DateInterval] = []

    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var selectedDate = Date()
    @Published var viewMode: ViewMode = .week

    enum ViewMode: String, CaseIterable {
        case week = "Week"
        case month = "Month"
    }

    private let calendarManager = CalendarManager.shared

    // MARK: - Data Loading

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let windowsResponse: AvailabilityWindowsResponse = APIClient.shared.get("/availability")
            async let friendsResponse: FriendsAvailabilityResponse = APIClient.shared.get("/availability/friends")

            let (windows, friends) = try await (windowsResponse, friendsResponse)

            self.windows = windows.windows
            self.friendsAvailability = friends.availability

            // Load calendar busy times if authorized
            if calendarManager.isAuthorized {
                await loadBusyTimes()
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func loadBusyTimes() async {
        let startDate = selectedDate.startOfWeek
        let endDate = startDate.adding(days: 30)

        busyTimes = await calendarManager.fetchBusyTimes(from: startDate, to: endDate)
    }

    // MARK: - Availability Actions

    func createWindow(
        startTime: Date,
        endTime: Date,
        recurring: Recurring?,
        visibleTo: Visibility,
        preferredActivities: [String]?,
        notes: String?
    ) async -> Bool {
        do {
            let request = CreateAvailabilityRequest(
                startTime: startTime.iso8601String,
                endTime: endTime.iso8601String,
                recurring: recurring,
                visibleTo: visibleTo,
                preferredActivities: preferredActivities,
                notes: notes
            )

            let _: AvailabilityWindowResponse = try await APIClient.shared.post("/availability", body: request)
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateWindow(
        windowId: String,
        startTime: Date?,
        endTime: Date?,
        recurring: Recurring?,
        visibleTo: Visibility?,
        preferredActivities: [String]?,
        notes: String?
    ) async -> Bool {
        do {
            let request = UpdateAvailabilityRequest(
                startTime: startTime?.iso8601String,
                endTime: endTime?.iso8601String,
                recurring: recurring,
                visibleTo: visibleTo,
                preferredActivities: preferredActivities,
                notes: notes
            )

            let _: AvailabilityWindowResponse = try await APIClient.shared.patch(
                "/availability/\(windowId)",
                body: request
            )
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteWindow(windowId: String) async -> Bool {
        do {
            try await APIClient.shared.delete("/availability/\(windowId)")
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Helpers

    func windowsForDate(_ date: Date) -> [AvailabilityWindow] {
        windows.filter { window in
            guard let startDate = window.startDate else { return false }
            return startDate.isSameDay(as: date)
        }
    }

    func friendsAvailableOnDate(_ date: Date) -> [FriendAvailability] {
        friendsAvailability.compactMap { friendAvail in
            let windowsOnDate = friendAvail.windows.filter { window in
                guard let startDate = window.startDate else { return false }
                return startDate.isSameDay(as: date)
            }

            if windowsOnDate.isEmpty {
                return nil
            }

            return FriendAvailability(userId: friendAvail.userId, windows: windowsOnDate)
        }
    }

    func isBusy(at date: Date) -> Bool {
        let interval = DateInterval(start: date, duration: 3600) // 1 hour window
        return busyTimes.contains { $0.overlaps(with: interval) }
    }
}
