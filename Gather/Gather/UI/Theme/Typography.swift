import SwiftUI

extension Font {
    // MARK: - Display Fonts (SF Pro, Bold/Semibold)

    static let gatherLargeTitle = Font.system(size: 34, weight: .bold, design: .default)
    static let gatherTitle = Font.system(size: 28, weight: .semibold, design: .default)
    static let gatherTitle2 = Font.system(size: 22, weight: .semibold, design: .default)
    static let gatherTitle3 = Font.system(size: 20, weight: .semibold, design: .default)

    // MARK: - Body Fonts

    static let gatherHeadline = Font.system(size: 17, weight: .semibold)
    static let gatherBody = Font.system(size: 17, weight: .regular)
    static let gatherCallout = Font.system(size: 16, weight: .regular)
    static let gatherSubheadline = Font.system(size: 15, weight: .regular)
    static let gatherFootnote = Font.system(size: 13, weight: .regular)
    static let gatherCaption = Font.system(size: 12, weight: .regular)
    static let gatherCaption2 = Font.system(size: 11, weight: .regular)

    // MARK: - Monospaced Fonts (for technical/data display)

    static let gatherMonoBody = Font.system(.body, design: .monospaced)
    static let gatherMonoCaption = Font.system(.caption, design: .monospaced)
    static let gatherMonoSmall = Font.system(size: 11, weight: .regular, design: .monospaced)

    // MARK: - Special Fonts

    static let gatherEmoji = Font.system(size: 32)
    static let gatherEmojiLarge = Font.system(size: 48)
    static let gatherEmojiSmall = Font.system(size: 20)

    // MARK: - Button Fonts

    static let gatherButtonPrimary = Font.system(size: 17, weight: .heavy)
    static let gatherButtonSecondary = Font.system(size: 17, weight: .semibold)
}

// MARK: - Text Styles

struct GatherTextStyle: ViewModifier {
    enum Style {
        case largeTitle
        case title
        case title2
        case title3
        case headline
        case body
        case callout
        case subheadline
        case footnote
        case caption
        case caption2
        case mono
        case monoCaption
    }

    let style: Style

    func body(content: Content) -> some View {
        content
            .font(font)
    }

    private var font: Font {
        switch style {
        case .largeTitle: return .gatherLargeTitle
        case .title: return .gatherTitle
        case .title2: return .gatherTitle2
        case .title3: return .gatherTitle3
        case .headline: return .gatherHeadline
        case .body: return .gatherBody
        case .callout: return .gatherCallout
        case .subheadline: return .gatherSubheadline
        case .footnote: return .gatherFootnote
        case .caption: return .gatherCaption
        case .caption2: return .gatherCaption2
        case .mono: return .gatherMonoBody
        case .monoCaption: return .gatherMonoCaption
        }
    }
}

extension View {
    func gatherTextStyle(_ style: GatherTextStyle.Style) -> some View {
        modifier(GatherTextStyle(style: style))
    }

    /// Apply tight kerning for large display titles
    func displayKerning() -> some View {
        self.kerning(-1.0)
    }
}

// MARK: - Text Color Modifiers

extension Text {
    func primaryText() -> Text {
        self.foregroundColor(.gatherTextPrimary)
    }

    func secondaryText() -> Text {
        self.foregroundColor(.gatherTextSecondary)
    }

    func tertiaryText() -> Text {
        self.foregroundColor(.gatherTextTertiary)
    }
}
