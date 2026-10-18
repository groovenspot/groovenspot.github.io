import HealthKit

enum WorkoutActivity: String, CaseIterable, Identifiable {
    case running
    case cycling
    case walking

    var id: String { rawValue }

    var title: String {
        switch self {
        case .running: "러닝"
        case .cycling: "사이클"
        case .walking: "빠르게 걷기"
        }
    }

    var symbol: String {
        switch self {
        case .running: "figure.run"
        case .cycling: "figure.outdoor.cycle"
        case .walking: "figure.walk"
        }
    }

    var healthKitType: HKWorkoutActivityType {
        switch self {
        case .running: .running
        case .cycling: .cycling
        case .walking: .walking
        }
    }
}
