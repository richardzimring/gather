import EventKit
import SwiftUI

struct SettingsView: View {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var calendarManager = CalendarManager.shared
    @StateObject private var notificationManager = NotificationManager.shared

    @State private var showLogoutAlert = false
    @State private var showDeleteAccountAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        // Profile Section
                        VStack(spacing: Spacing.md) {
                            if let user = authManager.currentUser {
                                HStack(spacing: Spacing.md) {
                                    AvatarView(user: user, size: AvatarSize.lg)

                                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                                        Text(user.displayName)
                                            .font(.gatherHeadline)
                                            .foregroundStyle(Color.gatherTextPrimary)

                                        Text(user.phoneNumber)
                                            .font(.gatherMonoCaption)
                                            .foregroundStyle(Color.gatherTextSecondary)
                                    }

                                    Spacer()
                                }
                                .padding(Spacing.md)
                            }

                            NavigationLink(destination: EditProfileView()) {
                                SettingsRow(
                                    icon: "person.circle",
                                    title: "Edit Profile"
                                )
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                        // Calendar Section
                        VStack(spacing: 0) {
                            SectionHeader(title: "Calendar")

                            NavigationLink(destination: CalendarSettingsView()) {
                                SettingsRow(
                                    icon: "calendar",
                                    title: "Calendar Sync",
                                    trailing: calendarManager.isAuthorized ? "Connected" : "Not Connected",
                                    trailingColor: calendarManager.isAuthorized ? .gatherTextSecondary : .gatherWarning
                                )
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                        // Notifications Section
                        VStack(spacing: 0) {
                            SectionHeader(title: "Notifications")

                            NavigationLink(destination: NotificationSettingsView()) {
                                SettingsRow(
                                    icon: "bell",
                                    title: "Notifications",
                                    trailing: notificationManager.isAuthorized ? "Enabled" : "Disabled",
                                    trailingColor: notificationManager.isAuthorized ? .gatherTextSecondary : .gatherWarning
                                )
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                        // About Section
                        VStack(spacing: 0) {
                            SectionHeader(title: "About")

                            SettingsRow(
                                icon: "info.circle",
                                title: "Version",
                                trailing: "1.0.0",
                                showChevron: false
                            )

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, 52)

                            Link(destination: URL(string: "https://gather.app/privacy")!) {
                                SettingsRow(
                                    icon: "hand.raised",
                                    title: "Privacy Policy"
                                )
                            }

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, 52)

                            Link(destination: URL(string: "https://gather.app/terms")!) {
                                SettingsRow(
                                    icon: "doc.text",
                                    title: "Terms of Service"
                                )
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )

                        // Account Section
                        VStack(spacing: 0) {
                            Button(action: { showLogoutAlert = true }) {
                                SettingsRow(
                                    icon: "arrow.right.square",
                                    title: "Log Out",
                                    showChevron: false
                                )
                            }

                            Divider()
                                .background(Color.gatherBorder)
                                .padding(.leading, 52)

                            Button(action: { showDeleteAccountAlert = true }) {
                                SettingsRow(
                                    icon: "trash",
                                    title: "Delete Account",
                                    titleColor: .gatherError,
                                    showChevron: false
                                )
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                    }
                    .padding(Spacing.screenEdge)
                }
            }
            .navigationTitle("Settings")
            .alert("Log Out", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Log Out", role: .destructive) {
                    Task {
                        await authManager.logout()
                    }
                }
            } message: {
                Text("Are you sure you want to log out?")
            }
            .alert("Delete Account", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task {
                        try? await authManager.deleteAccount()
                    }
                }
            } message: {
                Text("Are you sure you want to delete your account? This action cannot be undone.")
            }
        }
    }
}

// MARK: - Settings Row

struct SettingsRow: View {
    let icon: String
    let title: String
    var titleColor: Color = .gatherTextPrimary
    var trailing: String?
    var trailingColor: Color = .gatherTextSecondary
    var showChevron: Bool = true

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(titleColor)
                .frame(width: 24)

            Text(title)
                .font(.gatherBody)
                .foregroundStyle(titleColor)

            Spacer()

            if let trailing = trailing {
                Text(trailing)
                    .font(.gatherCaption)
                    .foregroundStyle(trailingColor)
            }

            if showChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.gatherTextTertiary)
            }
        }
        .padding(Spacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.gatherCaption)
            .foregroundStyle(Color.gatherTextTertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xs)
    }
}

// MARK: - Edit Profile View

struct EditProfileView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var displayName = ""
    @State private var isSaving = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            VStack(spacing: Spacing.xl) {
                // Avatar
                AvatarView(user: authManager.currentUser, size: AvatarSize.xxl)
                    .padding(.top, Spacing.xl)

                // Name Input
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Display Name")
                        .font(.gatherCaption)
                        .foregroundStyle(Color.gatherTextSecondary)

                    TextField("Your name", text: $displayName)
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
                .padding(.horizontal, Spacing.screenEdge)

                Spacer()
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Save") {
                    Task {
                        isSaving = true
                        try? await authManager.updateProfile(displayName: displayName)
                        isSaving = false
                        dismiss()
                    }
                }
                .foregroundStyle(Color.white)
                .disabled(displayName.trimmingCharacters(in: .whitespaces).count < 2 || isSaving)
            }
        }
        .onAppear {
            displayName = authManager.currentUser?.displayName ?? ""
        }
    }
}

// MARK: - Calendar Settings View

struct CalendarSettingsView: View {
    @StateObject private var calendarManager = CalendarManager.shared
    @StateObject private var authManager = AuthManager.shared

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    if !calendarManager.isAuthorized {
                        // Connect Calendar Card
                        VStack(spacing: Spacing.md) {
                            Image(systemName: "calendar.badge.plus")
                                .font(.system(size: 48, weight: .light))
                                .foregroundStyle(Color.gatherPrimary)

                            Text("Connect Your Calendar")
                                .font(.gatherHeadline)
                                .foregroundStyle(Color.gatherTextPrimary)

                            Text("See your busy times and automatically add events to your calendar when you accept invitations.")
                                .font(.gatherSubheadline)
                                .foregroundStyle(Color.gatherTextSecondary)
                                .multilineTextAlignment(.center)

                            PrimaryButton(title: "Connect Calendar") {
                                Task {
                                    let granted = await calendarManager.requestAccess()
                                    if granted {
                                        try? await authManager.updateProfile(
                                            displayName: nil,
                                            avatarUrl: nil,
                                            timezone: nil
                                        )
                                    }
                                }
                            }
                        }
                        .padding(Spacing.xl)
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                    } else {
                        // Calendar list
                        VStack(spacing: 0) {
                            SectionHeader(title: "Calendars to Check")

                            ForEach(calendarManager.availableCalendars, id: \.calendarIdentifier) { calendar in
                                Button(action: {
                                    toggleCalendar(calendar.calendarIdentifier)
                                }) {
                                    HStack(spacing: Spacing.md) {
                                        Circle()
                                            .fill(Color(cgColor: calendar.cgColor))
                                            .frame(width: 12, height: 12)

                                        Text(calendar.title)
                                            .font(.gatherBody)
                                            .foregroundStyle(Color.gatherTextPrimary)

                                        Spacer()

                                        if calendarManager.selectedCalendarIds.contains(calendar.calendarIdentifier) {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(Color.white)
                                        }
                                    }
                                    .padding(Spacing.md)
                                }

                                if calendar.calendarIdentifier != calendarManager.availableCalendars.last?.calendarIdentifier {
                                    Divider()
                                        .background(Color.gatherBorder)
                                        .padding(.leading, 52)
                                }
                            }
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                    }
                }
                .padding(Spacing.screenEdge)
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func toggleCalendar(_ id: String) {
        if calendarManager.selectedCalendarIds.contains(id) {
            calendarManager.selectedCalendarIds.remove(id)
        } else {
            calendarManager.selectedCalendarIds.insert(id)
        }
        calendarManager.saveSelectedCalendars()
    }
}

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @StateObject private var notificationManager = NotificationManager.shared

    var body: some View {
        ZStack {
            Color.gatherBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    if !notificationManager.isAuthorized {
                        // Enable Notifications Card
                        VStack(spacing: Spacing.md) {
                            Image(systemName: "bell.badge")
                                .font(.system(size: 48, weight: .light))
                                .foregroundStyle(Color.gatherPrimary)

                            Text("Enable Notifications")
                                .font(.gatherHeadline)
                                .foregroundStyle(Color.gatherTextPrimary)

                            Text("Get notified when friends invite you to events, respond to your invitations, and more.")
                                .font(.gatherSubheadline)
                                .foregroundStyle(Color.gatherTextSecondary)
                                .multilineTextAlignment(.center)

                            PrimaryButton(title: "Enable Notifications") {
                                Task {
                                    await notificationManager.requestAuthorization()
                                }
                            }
                        }
                        .padding(Spacing.xl)
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                    } else {
                        // Notification Settings
                        VStack(spacing: 0) {
                            SectionHeader(title: "Notify me about")

                            NotificationToggleRow(title: "Event invitations", isOn: .constant(true))
                            NotificationToggleRow(title: "Friend requests", isOn: .constant(true))
                            NotificationToggleRow(title: "Event responses", isOn: .constant(true))
                            NotificationToggleRow(title: "Event reminders", isOn: .constant(true))
                        }
                        .background(Color.gatherSurface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.card)
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                    }
                }
                .padding(Spacing.screenEdge)
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct NotificationToggleRow: View {
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(title, isOn: $isOn)
            .font(.gatherBody)
            .foregroundStyle(Color.gatherTextPrimary)
            .tint(Color.white)
            .padding(Spacing.md)
    }
}

#Preview {
    SettingsView()
        .preferredColorScheme(.dark)
}
