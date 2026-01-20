import Combine
import Foundation
import UIKit
import UserNotifications

@MainActor
class NotificationManager: ObservableObject {
    static let shared = NotificationManager()

    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published private(set) var deviceToken: String?

    private init() {
        Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Authorization

    var isAuthorized: Bool {
        authorizationStatus == .authorized
    }

    func checkAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound]
            )
            await checkAuthorizationStatus()

            if granted {
                await registerForRemoteNotifications()
            }

            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    // MARK: - Remote Notifications

    func registerForRemoteNotifications() async {
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func handleDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString

        // Register with backend
        Task {
            try? await AuthManager.shared.registerPushToken(tokenString)
        }
    }

    // MARK: - Handle Notifications

    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else { return }

        switch type {
        case "friend_request":
            NotificationCenter.default.post(name: .friendRequestReceived, object: nil, userInfo: userInfo)
        case "event_invitation":
            NotificationCenter.default.post(name: .eventInvitationReceived, object: nil, userInfo: userInfo)
        case "event_response":
            NotificationCenter.default.post(name: .eventResponseReceived, object: nil, userInfo: userInfo)
        case "event_updated", "event_cancelled":
            NotificationCenter.default.post(name: .eventUpdated, object: nil, userInfo: userInfo)
        default:
            break
        }
    }

    // MARK: - Local Notifications

    func scheduleEventReminder(
        eventId: String,
        title: String,
        body: String,
        date: Date
    ) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["type": "event_reminder", "eventId": eventId]

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date),
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: "event_reminder_\(eventId)",
            content: content,
            trigger: trigger
        )

        try? await UNUserNotificationCenter.current().add(request)
    }

    func cancelEventReminder(eventId: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: ["event_reminder_\(eventId)"]
        )
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let friendRequestReceived = Notification.Name("friendRequestReceived")
    static let eventInvitationReceived = Notification.Name("eventInvitationReceived")
    static let eventResponseReceived = Notification.Name("eventResponseReceived")
    static let eventUpdated = Notification.Name("eventUpdated")
}
