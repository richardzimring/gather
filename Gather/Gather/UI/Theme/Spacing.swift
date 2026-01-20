import SwiftUI

enum Spacing {
    /// 4pt
    static let xxs: CGFloat = 4

    /// 8pt
    static let xs: CGFloat = 8

    /// 12pt
    static let sm: CGFloat = 12

    /// 16pt
    static let md: CGFloat = 16

    /// 20pt - outer margin (design guide)
    static let lg: CGFloat = 20

    /// 24pt - outer margin (design guide)
    static let xl: CGFloat = 24

    /// 32pt
    static let xxl: CGFloat = 32

    /// 40pt
    static let xxxl: CGFloat = 40

    /// 48pt
    static let huge: CGFloat = 48

    // MARK: - Screen Edge Padding

    /// Generous outer padding for airy look against black background
    static let screenEdge: CGFloat = 20

    /// Extra generous outer padding
    static let screenEdgeLarge: CGFloat = 24
}

enum CornerRadius {
    /// 4pt
    static let xs: CGFloat = 4

    /// 8pt
    static let sm: CGFloat = 8

    /// 12pt
    static let md: CGFloat = 12

    /// 16pt - standard card radius
    static let lg: CGFloat = 16

    /// 20pt - elevated card radius
    static let card: CGFloat = 20

    /// 24pt
    static let xl: CGFloat = 24

    /// 30pt - button radius (capsule-like)
    static let button: CGFloat = 30

    /// Full rounded (pill shape)
    static let full: CGFloat = 9999
}

enum IconSize {
    /// 16pt
    static let sm: CGFloat = 16

    /// 20pt
    static let md: CGFloat = 20

    /// 24pt
    static let lg: CGFloat = 24

    /// 32pt
    static let xl: CGFloat = 32

    /// 48pt
    static let xxl: CGFloat = 48
}

enum AvatarSize {
    /// 32pt
    static let sm: CGFloat = 32

    /// 44pt
    static let md: CGFloat = 44

    /// 64pt
    static let lg: CGFloat = 64

    /// 88pt
    static let xl: CGFloat = 88

    /// 120pt
    static let xxl: CGFloat = 120
}
