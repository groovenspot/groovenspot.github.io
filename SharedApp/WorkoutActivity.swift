import HealthKit

enum WorkoutActivity: String, CaseIterable, Identifiable {
    case running
    case cycling
    case walking

    var id: String { rawValue }

    init?(healthKitType: HKWorkoutActivityType) {
        switch healthKitType {
        case .running: self = .running
        case .cycling: self = .cycling
        case .walking: self = .walking
        default: return nil
        }
    }

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

/// Custom metadata the watch adds to each saved HKWorkout, so the iPhone app can
/// list Cardio Pacer workouts with their Zone 2 result.
enum WorkoutMetadataKey {
    static let zone2Percent = "CardioPacerZone2Percent"
    static let zone2Lower = "CardioPacerZone2Lower"
    static let zone2Upper = "CardioPacerZone2Upper"
}
