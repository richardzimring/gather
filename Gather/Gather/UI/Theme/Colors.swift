import SwiftUI

extension Color {
    // MARK: - Background Colors (Pure Black Design)

    /// Primary background - pure black
    static let gatherBackground = Color.black

    /// Surface color for cards, lists, floating elements
    static let gatherSurface = Color(red: 0.1, green: 0.1, blue: 0.1)

    /// Slightly elevated surface
    static let gatherSurfaceElevated = Color(hex: "121212")

    // MARK: - Text Colors

    /// Primary text - pure white
    static let gatherTextPrimary = Color.white

    /// Secondary text - subtle
    static let gatherTextSecondary = Color.white.opacity(0.7)

    /// Tertiary text - captions, hints
    static let gatherTextTertiary = Color.white.opacity(0.4)

    // MARK: - Border & Divider Colors

    /// Subtle border for cards
    static let gatherBorder = Color.white.opacity(0.1)

    /// More visible border for emphasis
    static let gatherBorderStrong = Color.white.opacity(0.2)

    // MARK: - Accent Colors

    /// Primary accent - soft teal for availability/time
    static let gatherPrimary = Color(hex: "4ECDC4")

    /// Secondary accent - warm coral for connections
    static let gatherSecondary = Color(hex: "FF6B6B")

    /// Tertiary accent - golden for highlights
    static let gatherAccent = Color(hex: "FFE66D")

    // MARK: - Semantic Colors

    static let gatherSuccess = Color(hex: "4CAF50")
    static let gatherWarning = Color(hex: "FF9800")
    static let gatherError = Color(hex: "F44336")

    // MARK: - Status Colors

    static let availabilityAll = Color.gatherPrimary
    static let availabilityGroups = Color(hex: "9B59B6")
    static let availabilitySpecific = Color(hex: "3498DB")

    // MARK: - Event Status Colors

    static let eventPending = Color.gatherWarning
    static let eventAccepted = Color.gatherSuccess
    static let eventDeclined = Color.gatherError
    static let eventMaybe = Color(hex: "9E9E9E")
}

// MARK: - Hex Color Initializer

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)

        let alpha, red, green, blue: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (alpha, red, green, blue) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (alpha, red, green, blue) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (alpha, red, green, blue) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (alpha, red, green, blue) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(red) / 255,
            green: Double(green) / 255,
            blue: Double(blue) / 255,
            opacity: Double(alpha) / 255
        )
    }
}

// MARK: - Gradients

extension LinearGradient {
    static let gatherPrimaryGradient = LinearGradient(
        colors: [Color.gatherPrimary, Color.gatherPrimary.opacity(0.7)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let gatherSecondaryGradient = LinearGradient(
        colors: [Color.gatherSecondary, Color.gatherSecondary.opacity(0.7)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let gatherAccentGradient = LinearGradient(
        colors: [Color.gatherAccent, Color.gatherAccent.opacity(0.7)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - View Modifiers for Consistent Styling

extension View {
    /// Apply standard card styling
    func cardStyle(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Color.gatherSurface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.card)
                    .stroke(Color.gatherBorder, lineWidth: 1)
            )
    }

    /// Apply elevated card styling with subtle glow
    func elevatedCardStyle(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Color.gatherSurfaceElevated)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.card)
                    .stroke(Color.gatherBorder, lineWidth: 1)
            )
            .shadow(color: .white.opacity(0.05), radius: 10)
    }
}
