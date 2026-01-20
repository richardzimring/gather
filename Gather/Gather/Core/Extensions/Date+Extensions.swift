import Foundation

extension Date {
    // MARK: - Formatting

    var iso8601String: String {
        ISO8601DateFormatter().string(from: self)
    }

    func formatted(as format: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = format
        return formatter.string(from: self)
    }

    var timeString: String {
        formatted(as: "h:mm a")
    }

    var shortDateString: String {
        formatted(as: "MMM d")
    }

    var fullDateString: String {
        formatted(as: "EEEE, MMMM d")
    }

    var relativeDateString: String {
        let calendar = Calendar.current

        if calendar.isDateInToday(self) {
            return "Today"
        } else if calendar.isDateInTomorrow(self) {
            return "Tomorrow"
        } else if calendar.isDateInYesterday(self) {
            return "Yesterday"
        } else {
            let daysFromNow = calendar.dateComponents([.day], from: Date(), to: self).day ?? 0

            if daysFromNow > 0 && daysFromNow < 7 {
                return formatted(as: "EEEE") // Day name
            } else {
                return shortDateString
            }
        }
    }

    // MARK: - Components

    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    var endOfDay: Date {
        var components = DateComponents()
        components.day = 1
        components.second = -1
        return Calendar.current.date(byAdding: components, to: startOfDay) ?? self
    }

    var startOfWeek: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        return calendar.date(from: components) ?? self
    }

    var startOfMonth: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: self)
        return calendar.date(from: components) ?? self
    }

    // MARK: - Arithmetic

    func adding(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }

    func adding(hours: Int) -> Date {
        Calendar.current.date(byAdding: .hour, value: hours, to: self) ?? self
    }

    func adding(minutes: Int) -> Date {
        Calendar.current.date(byAdding: .minute, value: minutes, to: self) ?? self
    }

    // MARK: - Comparisons

    var isInPast: Bool {
        self < Date()
    }

    var isInFuture: Bool {
        self > Date()
    }

    var isPast: Bool {
        self < Date()
    }

    func isSameDay(as other: Date) -> Bool {
        Calendar.current.isDate(self, inSameDayAs: other)
    }

    // MARK: - Week Helpers

    var dayOfWeek: Int {
        Calendar.current.component(.weekday, from: self) - 1 // 0 = Sunday
    }

    var daysInMonth: Int {
        Calendar.current.range(of: .day, in: .month, for: self)?.count ?? 30
    }
}

// MARK: - DateInterval Extension

extension DateInterval {
    func overlaps(with other: DateInterval) -> Bool {
        return start < other.end && end > other.start
    }
}
