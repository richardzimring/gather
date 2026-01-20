import SwiftUI

struct AvailabilityView: View {
    @StateObject private var viewModel = AvailabilityViewModel()
    @State private var showAddAvailability = false
    @State private var selectedWindow: AvailabilityWindow?

    var body: some View {
        NavigationStack {
            ZStack {
                // Pure black background
                Color.gatherBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // View Mode Toggle
                    CustomSegmentedControl(
                        selectedIndex: Binding(
                            get: { viewModel.viewMode == .week ? 0 : 1 },
                            set: { viewModel.viewMode = $0 == 0 ? .week : .month }
                        ),
                        options: ["Week", "Month"]
                    )
                    .padding(.horizontal, Spacing.screenEdge)
                    .padding(.vertical, Spacing.sm)

                    // Calendar
                    if viewModel.viewMode == .week {
                        WeekCalendarView(
                            selectedDate: $viewModel.selectedDate,
                            windows: viewModel.windows,
                            onDateSelected: { _ in },
                            onAddTapped: { showAddAvailability = true }
                        )
                    } else {
                        MonthCalendarView(
                            selectedDate: $viewModel.selectedDate,
                            windows: viewModel.windows,
                            onDateSelected: { _ in }
                        )
                    }

                    Divider()
                        .background(Color.gatherBorder)

                    // Day Detail
                    DayDetailView(
                        date: viewModel.selectedDate,
                        windows: viewModel.windowsForDate(viewModel.selectedDate),
                        onWindowTapped: { window in
                            selectedWindow = window
                        },
                        onAddTapped: { showAddAvailability = true }
                    )
                }
            }
            .navigationTitle("Availability")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showAddAvailability = true }) {
                        Image(systemName: "plus")
                            .foregroundStyle(Color.white)
                    }
                }
            }
            .task {
                await viewModel.loadData()
            }
            .refreshable {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showAddAvailability) {
                AddAvailabilitySheet(viewModel: viewModel, initialDate: viewModel.selectedDate)
            }
            .sheet(item: $selectedWindow) { window in
                AvailabilityDetailSheet(viewModel: viewModel, window: window)
            }
        }
    }
}

// MARK: - Week Calendar View

struct WeekCalendarView: View {
    @Binding var selectedDate: Date
    let windows: [AvailabilityWindow]
    let onDateSelected: (Date) -> Void
    let onAddTapped: () -> Void

    private var weekDays: [Date] {
        let start = selectedDate.startOfWeek
        return (0..<7).map { start.adding(days: $0) }
    }

    var body: some View {
        VStack(spacing: Spacing.sm) {
            // Navigation
            HStack {
                Button(action: { selectedDate = selectedDate.adding(days: -7) }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.gatherTextSecondary)
                        .frame(width: 36, height: 36)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                }

                Spacer()

                Text(weekDateRange)
                    .font(.gatherHeadline)
                    .foregroundStyle(Color.gatherTextPrimary)

                Spacer()

                Button(action: { selectedDate = selectedDate.adding(days: 7) }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.gatherTextSecondary)
                        .frame(width: 36, height: 36)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, Spacing.screenEdge)

            // Days
            HStack(spacing: Spacing.xxs) {
                ForEach(weekDays, id: \.self) { date in
                    DayCell(
                        date: date,
                        isSelected: date.isSameDay(as: selectedDate),
                        hasAvailability: hasAvailability(on: date)
                    ) {
                        selectedDate = date
                        onDateSelected(date)
                    }
                }
            }
            .padding(.horizontal, Spacing.sm)
        }
        .padding(.vertical, Spacing.sm)
    }

    private var weekDateRange: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let start = weekDays.first ?? selectedDate
        let end = weekDays.last ?? selectedDate
        return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
    }

    private func hasAvailability(on date: Date) -> Bool {
        windows.contains { window in
            guard let startDate = window.startDate else { return false }
            return startDate.isSameDay(as: date)
        }
    }
}

// MARK: - Day Cell

struct DayCell: View {
    let date: Date
    let isSelected: Bool
    let hasAvailability: Bool
    let action: () -> Void

    private var isToday: Bool {
        date.isSameDay(as: Date())
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: Spacing.xxs) {
                Text(dayOfWeek)
                    .font(.gatherCaption2)
                    .foregroundStyle(Color.gatherTextTertiary)

                ZStack {
                    Circle()
                        .fill(isSelected ? Color.white : Color.clear)
                        .frame(width: 36, height: 36)

                    if !isSelected && isToday {
                        Circle()
                            .stroke(Color.gatherPrimary, lineWidth: 2)
                            .frame(width: 36, height: 36)
                    }

                    Text("\(Calendar.current.component(.day, from: date))")
                        .font(.gatherSubheadline)
                        .fontWeight(isToday ? .bold : .regular)
                        .foregroundStyle(isSelected ? .black : (isToday ? Color.gatherPrimary : Color.gatherTextPrimary))
                }

                Circle()
                    .fill(hasAvailability ? Color.gatherPrimary : Color.clear)
                    .frame(width: 6, height: 6)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private var dayOfWeek: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date).uppercased()
    }
}

// MARK: - Month Calendar View

struct MonthCalendarView: View {
    @Binding var selectedDate: Date
    let windows: [AvailabilityWindow]
    let onDateSelected: (Date) -> Void

    var body: some View {
        VStack(spacing: Spacing.sm) {
            // Navigation
            HStack {
                Button(action: { changeMonth(by: -1) }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.gatherTextSecondary)
                        .frame(width: 36, height: 36)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                }

                Spacer()

                Text(monthYearString)
                    .font(.gatherHeadline)
                    .foregroundStyle(Color.gatherTextPrimary)

                Spacer()

                Button(action: { changeMonth(by: 1) }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.gatherTextSecondary)
                        .frame(width: 36, height: 36)
                        .background(Color.gatherSurface)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gatherBorder, lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, Spacing.screenEdge)

            // Calendar Grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: Spacing.xs) {
                // Day headers
                ForEach(["S", "M", "T", "W", "T", "F", "S"], id: \.self) { day in
                    Text(day)
                        .font(.gatherCaption2)
                        .foregroundStyle(Color.gatherTextTertiary)
                }

                // Day cells
                ForEach(daysInMonth, id: \.self) { date in
                    if let date = date {
                        DayCell(
                            date: date,
                            isSelected: date.isSameDay(as: selectedDate),
                            hasAvailability: hasAvailability(on: date)
                        ) {
                            selectedDate = date
                            onDateSelected(date)
                        }
                    } else {
                        Color.clear
                            .frame(height: 44)
                    }
                }
            }
            .padding(.horizontal, Spacing.sm)
        }
        .padding(.vertical, Spacing.sm)
    }

    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: selectedDate)
    }

    private var daysInMonth: [Date?] {
        let calendar = Calendar.current
        let startOfMonth = selectedDate.startOfMonth
        let daysInMonth = selectedDate.daysInMonth
        let firstWeekday = calendar.component(.weekday, from: startOfMonth) - 1

        var days: [Date?] = Array(repeating: nil, count: firstWeekday)

        for day in 0..<daysInMonth {
            days.append(startOfMonth.adding(days: day))
        }

        return days
    }

    private func changeMonth(by months: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: months, to: selectedDate) {
            selectedDate = newDate
        }
    }

    private func hasAvailability(on date: Date) -> Bool {
        windows.contains { window in
            guard let startDate = window.startDate else { return false }
            return startDate.isSameDay(as: date)
        }
    }
}

// MARK: - Day Detail View

struct DayDetailView: View {
    let date: Date
    let windows: [AvailabilityWindow]
    let onWindowTapped: (AvailabilityWindow) -> Void
    let onAddTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text(date.fullDateString)
                    .font(.gatherHeadline)
                    .foregroundStyle(Color.gatherTextPrimary)

                Spacer()

                TertiaryButton(title: "Add", icon: "plus") {
                    onAddTapped()
                }
            }
            .padding(.horizontal, Spacing.screenEdge)
            .padding(.top, Spacing.md)

            if windows.isEmpty {
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 32, weight: .light))
                        .foregroundStyle(Color.gatherTextTertiary)

                    Text("No availability set")
                        .font(.gatherSubheadline)
                        .foregroundStyle(Color.gatherTextSecondary)

                    Button(action: onAddTapped) {
                        Text("Add Availability")
                            .font(.gatherSubheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.gatherPrimary)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: Spacing.sm) {
                        ForEach(windows) { window in
                            AvailabilityWindowCard(window: window) {
                                onWindowTapped(window)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.screenEdge)
                }
            }
        }
    }
}

// MARK: - Availability Window Card

struct AvailabilityWindowCard: View {
    let window: AvailabilityWindow
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.md) {
                // Time indicator
                Rectangle()
                    .fill(visibilityColor)
                    .frame(width: 4)
                    .clipShape(Capsule())

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    if let startDate = window.startDate, let endDate = window.endDate {
                        Text("\(startDate.timeString) - \(endDate.timeString)")
                            .font(.gatherHeadline)
                            .foregroundStyle(Color.gatherTextPrimary)
                    }

                    HStack(spacing: Spacing.xs) {
                        Image(systemName: visibilityIcon)
                            .font(.system(size: 11))
                        Text(visibilityText)
                            .font(.gatherCaption)
                    }
                    .foregroundStyle(Color.gatherTextSecondary)

                    if let notes = window.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.gatherCaption)
                            .foregroundStyle(Color.gatherTextTertiary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.gatherTextTertiary)
            }
            .padding(Spacing.md)
            .background(Color.gatherSurface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(Color.gatherBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var visibilityColor: Color {
        switch window.visibleTo.type {
        case .all: return .availabilityAll
        case .groups: return .availabilityGroups
        case .specific: return .availabilitySpecific
        }
    }

    private var visibilityIcon: String {
        switch window.visibleTo.type {
        case .all: return "person.3"
        case .groups: return "person.2"
        case .specific: return "person"
        }
    }

    private var visibilityText: String {
        window.visibleTo.type.displayName
    }
}

#Preview {
    AvailabilityView()
        .preferredColorScheme(.dark)
}
