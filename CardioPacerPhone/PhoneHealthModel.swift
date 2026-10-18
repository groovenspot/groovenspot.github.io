import Foundation
import HealthKit

/// One Cardio Pacer workout read back from HealthKit.
struct PacerWorkout: Identifiable {
    let id: UUID
    let start: Date
    let duration: TimeInterval
    let activity: WorkoutActivity?
    let zone2Percent: Int
    let range: ZoneRange?
}

/// Reads profile hints and Cardio Pacer workouts from HealthKit on the iPhone.
@MainActor
final class PhoneHealthModel: ObservableObject {
    @Published private(set) var workouts: [PacerWorkout] = []

    private let healthStore = HKHealthStore()
    private let restingHeartRateType = HKQuantityType(.restingHeartRate)

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let toRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            restingHeartRateType,
            HKCharacteristicType(.dateOfBirth),
        ]
        try? await healthStore.requestAuthorization(toShare: [], read: toRead)
    }

    /// Age from the Health app's date of birth, if the user shared it.
    func fetchAge() -> Int? {
        guard let components = try? healthStore.dateOfBirthComponents(),
              let birthday = Calendar.current.date(from: components) else { return nil }
        return Calendar.current.dateComponents([.year], from: birthday, to: Date()).year
    }

    /// Most recent resting heart rate recorded by the watch.
    func fetchRestingHeartRate() async -> Int? {
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: restingHeartRateType)],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 1
        )
        guard let sample = try? await descriptor.result(for: healthStore).first else { return nil }
        let bpm = HKUnit.count().unitDivided(by: .minute())
        return Int(sample.quantity.doubleValue(for: bpm).rounded())
    }

    /// Workouts saved by the watch app, recognised by their Zone 2 metadata.
    func loadWorkouts() async {
        let ours = HKQuery.predicateForObjects(withMetadataKey: WorkoutMetadataKey.zone2Percent)
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.workout(ours)],
            sortDescriptors: [SortDescriptor(\.startDate, order: .reverse)],
            limit: 100
        )
        guard let results = try? await descriptor.result(for: healthStore) else { return }
        workouts = results.compactMap { workout in
            let metadata = workout.metadata ?? [:]
            guard let percent = metadata[WorkoutMetadataKey.zone2Percent] as? NSNumber else { return nil }
            var range: ZoneRange?
            if let lower = metadata[WorkoutMetadataKey.zone2Lower] as? NSNumber,
               let upper = metadata[WorkoutMetadataKey.zone2Upper] as? NSNumber {
                range = ZoneRange(lower: lower.intValue, upper: upper.intValue)
            }
            return PacerWorkout(id: workout.uuid,
                                start: workout.startDate,
                                duration: workout.duration,
                                activity: WorkoutActivity(healthKitType: workout.workoutActivityType),
                                zone2Percent: percent.intValue,
                                range: range)
        }
    }
}
