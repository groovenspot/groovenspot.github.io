import SwiftUI

extension HeartRateZone {
    var color: Color {
        switch self {
        case .below: Color(red: 0.12, green: 0.45, blue: 0.95)
        case .target: Color(red: 0.11, green: 0.70, blue: 0.33)
        case .above: Color(red: 0.90, green: 0.18, blue: 0.18)
        }
    }

    var title: String {
        switch self {
        case .below: "ZONE 1"
        case .target: "ZONE 2"
        case .above: "ZONE 3+"
        }
    }

    var message: String {
        switch self {
        case .below: "페이스를 조금 올리세요"
        case .target: "완벽합니다! 이대로 유지"
        case .above: "속도를 줄이세요"
        }
    }
}

enum PacerPalette {
    /// Shown before the first heart rate reading arrives.
    static let waiting = Color(white: 0.22)
}
