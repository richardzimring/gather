import SwiftUI

struct AddAvailabilitySheet: View {
    @ObservedObject var viewModel: AvailabilityViewModel
    let initialDate: Date

    @Environment(\.dismiss) private var dismiss

    @State private var startDate: Date
    @State private var endDate: Date
    @State private var isRecurring = false
    @State private var recurringPattern: RecurringPattern = .weekly
    @State private var visibilityType: VisibilityType = .all
    @State private var selectedGroupIds: Set<String> = []
    @State private var selectedUserIds: Set<String> = []
    @State private var notes = ""
    @State private var isLoading = false

    init(viewModel: AvailabilityViewModel, initialDate: Date) {
        self.viewModel = viewModel
        self.initialDate = initialDate

        // Set default times (next hour to +2 hours)
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day, .hour], from: initialDate)
        components.hour = (components.hour ?? 12) + 1
        let start = calendar.date(from: components) ?? initialDate
        let end = start.adding(hours: 2)

        _startDate = State(initialValue: start)
        _endDate = State(initialValue: end)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        // Time Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("TIME")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            VStack(spacing: 0) {
                                HStack {
                                    Text("Start")
                                        .font(.gatherBody)
                                        .foregroundStyle(Color.gatherTextSecondary)
                                    Spacer()
                                    DatePicker("", selection: $startDate)
                                        .labelsHidden()
                                        .colorScheme(.dark)
                                }
                                .padding(Spacing.md)

                                Divider()
                                    .background(Color.gatherBorder)

                                HStack {
                                    Text("End")
                                        .font(.gatherBody)
                                        .foregroundStyle(Color.gatherTextSecondary)
                                    Spacer()
                                    DatePicker("", selection: $endDate)
                                        .labelsHidden()
                                        .colorScheme(.dark)
                                }
                                .padding(Spacing.md)
                            }
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                        }

                        // Recurring Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("REPEAT")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            VStack(spacing: 0) {
                                HStack {
                                    Text("Recurring")
                                        .font(.gatherBody)
                                        .foregroundStyle(Color.gatherTextPrimary)
                                    Spacer()
                                    Toggle("", isOn: $isRecurring)
                                        .labelsHidden()
                                        .tint(Color.white)
                                }
                                .padding(Spacing.md)

                                if isRecurring {
                                    Divider()
                                        .background(Color.gatherBorder)

                                    HStack {
                                        Text("Repeat")
                                            .font(.gatherBody)
                                            .foregroundStyle(Color.gatherTextSecondary)
                                        Spacer()
                                        Picker("", selection: $recurringPattern) {
                                            ForEach(RecurringPattern.allCases, id: \.self) { pattern in
                                                Text(pattern.displayName).tag(pattern)
                                            }
                                        }
                                        .tint(Color.white)
                                    }
                                    .padding(Spacing.md)
                                }
                            }
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                        }

                        // Visibility Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("WHO CAN SEE THIS?")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            VStack(spacing: Spacing.sm) {
                                CustomSegmentedControl(
                                    selectedIndex: Binding(
                                        get: {
                                            switch visibilityType {
                                            case .all: return 0
                                            case .groups: return 1
                                            case .specific: return 2
                                            }
                                        },
                                        set: {
                                            visibilityType = [.all, .groups, .specific][$0]
                                        }
                                    ),
                                    options: ["All Friends", "Groups", "Specific"]
                                )

                                Text(visibilityDescription)
                                    .font(.gatherCaption)
                                    .foregroundStyle(Color.gatherTextSecondary)
                            }
                            .padding(Spacing.md)
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                        }

                        // Notes Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("NOTES (OPTIONAL)")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            TextField("Add a note...", text: $notes, axis: .vertical)
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
                    }
                    .padding(Spacing.screenEdge)
                }
            }
            .navigationTitle("Add Availability")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(Color.gatherTextSecondary)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            await save()
                        }
                    }
                    .foregroundStyle(Color.white)
                    .fontWeight(.semibold)
                    .disabled(isLoading || endDate <= startDate)
                }
            }
        }
    }

    private var visibilityDescription: String {
        switch visibilityType {
        case .all:
            return "All your friends can see this availability"
        case .groups:
            return "Select which groups can see this"
        case .specific:
            return "Select specific friends who can see this"
        }
    }

    private func save() async {
        isLoading = true

        let recurring: Recurring? = isRecurring ? Recurring(pattern: recurringPattern) : nil

        let visibility = Visibility(
            type: visibilityType,
            groupIds: visibilityType == .groups ? Array(selectedGroupIds) : nil,
            userIds: visibilityType == .specific ? Array(selectedUserIds) : nil
        )

        let success = await viewModel.createWindow(
            startTime: startDate,
            endTime: endDate,
            recurring: recurring,
            visibleTo: visibility,
            preferredActivities: nil,
            notes: notes.isEmpty ? nil : notes
        )

        if success {
            dismiss()
        }

        isLoading = false
    }
}

// MARK: - Availability Detail Sheet

struct AvailabilityDetailSheet: View {
    @ObservedObject var viewModel: AvailabilityViewModel
    let window: AvailabilityWindow

    @Environment(\.dismiss) private var dismiss

    @State private var showDeleteAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.gatherBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        // Time Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("TIME")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            VStack(spacing: 0) {
                                if let startDate = window.startDate, let endDate = window.endDate {
                                    DetailInfoRow(title: "Date", value: startDate.fullDateString)
                                    Divider().background(Color.gatherBorder)
                                    DetailInfoRow(title: "Start", value: startDate.timeString)
                                    Divider().background(Color.gatherBorder)
                                    DetailInfoRow(title: "End", value: endDate.timeString)
                                }

                                if let recurring = window.recurring {
                                    Divider().background(Color.gatherBorder)
                                    DetailInfoRow(title: "Repeats", value: recurring.pattern.displayName)
                                }
                            }
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                        }

                        // Visibility Section
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("VISIBILITY")
                                .font(.gatherCaption)
                                .foregroundStyle(Color.gatherTextTertiary)

                            DetailInfoRow(title: "Visible to", value: window.visibleTo.type.displayName)
                                .padding(Spacing.md)
                                .background(Color.gatherSurface)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                                        .stroke(Color.gatherBorder, lineWidth: 1)
                                )
                        }

                        // Notes Section
                        if let notes = window.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("NOTES")
                                    .font(.gatherCaption)
                                    .foregroundStyle(Color.gatherTextTertiary)

                                Text(notes)
                                    .font(.gatherBody)
                                    .foregroundStyle(Color.gatherTextPrimary)
                                    .padding(Spacing.md)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.gatherSurface)
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                                            .stroke(Color.gatherBorder, lineWidth: 1)
                                    )
                            }
                        }

                        // Delete Button
                        Button(action: { showDeleteAlert = true }) {
                            HStack {
                                Spacer()
                                Text("Delete Availability")
                                    .font(.gatherBody)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(Color.gatherError)
                                Spacer()
                            }
                            .padding(Spacing.md)
                            .background(Color.gatherSurface)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.gatherBorder, lineWidth: 1)
                            )
                        }
                    }
                    .padding(Spacing.screenEdge)
                }
            }
            .navigationTitle("Availability")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(Color.white)
                }
            }
            .alert("Delete Availability", isPresented: $showDeleteAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task {
                        let success = await viewModel.deleteWindow(windowId: window.windowId)
                        if success {
                            dismiss()
                        }
                    }
                }
            } message: {
                Text("Are you sure you want to delete this availability window?")
            }
        }
    }
}

// MARK: - Detail Info Row

struct DetailInfoRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
                .font(.gatherBody)
                .foregroundStyle(Color.gatherTextSecondary)
            Spacer()
            Text(value)
                .font(.gatherBody)
                .foregroundStyle(Color.gatherTextPrimary)
        }
        .padding(Spacing.md)
    }
}
