import Foundation
import HealthKit

/// Owns the HKWorkoutSession / HKLiveWorkoutBuilder pair, turns live heart rate
/// into zones, fires the haptic alert, and produces the end-of-workout summary.
@MainActor
final class WorkoutManager: NSObject, ObservableObject {
    enum Phase: Equatable {
        case idle
        case starting
        case running
        case paused
        case ending
        case ended
    }

    /// Minimum gap between two "zone exceeded" alerts.
    static let alertCooldown: TimeInterval = 5

    let healthStore = HKHealthStore()

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var heartRate: Double?
    @Published private(set) var zone: HeartRateZone?
    @Published private(set) var range = ZoneProfile.default.zone2Range
    @Published private(set) var activity: WorkoutActivity = .running
    @Published private(set) var summary: WorkoutSummary?
    @Published var errorMessage: String?

    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var tracker = ZoneTracker(range: ZoneProfile.default.zone2Range)
    private var ledger = ZoneTimeLedger()
    private var lastAlert: Date?
    #if targetEnvironment(simulator)
    private var demoTask: Task<Void, Never>?
    #endif

    var isSessionActive: Bool { phase != .idle }

    // MARK: - Authorization

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let toShare: Set<HKSampleType> = [HKQuantityType.workoutType()]
        let toRead: Set<HKObjectType> = [
            HKQuantityType.workoutType(),
            HealthTypes.heartRate,
            HealthTypes.restingHeartRate,
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.distanceWalkingRunning),
            HKQuantityType(.distanceCycling),
            HKCharacteristicType(.dateOfBirth),
        ]
        try await healthStore.requestAuthorization(toShare: toShare, read: toRead)
    }

    // MARK: - Profile helpers

    /// Age from the Health app's date of birth, if the user shared it.
    func fetchAge() -> Int? {
        guard let components = try? healthStore.dateOfBirthComponents(),
              let birthday = Calendar.current.date(from: components) else { return nil }
        return Calendar.current.dateComponents([.year], from: birthday, to: Date()).year
    }

    /// Most recent resting heart rate recorded by the watch.
    func fetchRestingHeartRate() async -> Int? {
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HealthTypes.restingHeartRate)],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 1
        )
        guard let sample = try? await descriptor.result(for: healthStore).first else { return nil }
        return Int(sample.quantity.doubleValue(for: .beatsPerMinute).rounded())
    }

    // MARK: - Session control

    func start(activity: WorkoutActivity, range: ZoneRange) async {
        guard phase == .idle else { return }
        phase = .starting
        self.activity = activity
        self.range = range
        tracker = ZoneTracker(range: range)
        ledger = ZoneTimeLedger()
        heartRate = nil
        zone = nil
        summary = nil
        lastAlert = nil

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = activity.healthKitType
        configuration.locationType = .outdoor

        do {
            try await requestAuthorization()
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore,
                                                         workoutConfiguration: configuration)
            session.delegate = self
            builder.delegate = self
            self.session = session
            self.builder = builder

            let startDate = Date()
            session.startActivity(with: startDate)
            try await builder.beginCollection(at: startDate)
            Haptics.started()
            #if targetEnvironment(simulator)
            startDemoHeartRate()
            #endif
        } catch {
            errorMessage = "운동을 시작할 수 없습니다.\n\(error.localizedDescription)"
            session?.end()
            reset()
        }
    }

    func pause() { session?.pause() }

    func resume() { session?.resume() }

    func togglePause() {
        phase == .paused ? resume() : pause()
    }

    func end() {
        guard phase == .running || phase == .paused else { return }
        phase = .ending
        session?.end()
    }

    /// Dismisses the summary and returns to the start screen.
    func reset() {
        stopDemoHeartRate()
        session = nil
        builder = nil
        heartRate = nil
        zone = nil
        summary = nil
        phase = .idle
    }

    /// Active (non-paused) workout time, for the on-screen clock.
    func elapsedTime(at date: Date) -> TimeInterval {
        builder?.elapsedTime(at: date) ?? 0
    }

    // MARK: - Live data

    private func handle(heartRate bpm: Double, at date: Date) {
        heartRate = bpm
        guard phase == .running else { return }

        let previous = zone
        let newZone = tracker.update(bpm: bpm)
        ledger.mark(zone: newZone, at: elapsedTime(at: date))
        zone = newZone

        if newZone == .above, previous != .above, canAlert(at: date) {
            lastAlert = date
            Haptics.zoneExceeded()
        }
    }

    private func canAlert(at date: Date) -> Bool {
        guard let lastAlert else { return true }
        return date.timeIntervalSince(lastAlert) >= Self.alertCooldown
    }

    private func handle(state: HKWorkoutSessionState, at date: Date) {
        switch state {
        case .running:
            // Resume crediting time from where the clock picks up again.
            ledger.mark(zone: zone, at: elapsedTime(at: date))
            phase = .running
        case .paused:
            ledger.mark(zone: zone, at: elapsedTime(at: date))
            phase = .paused
        case .ended:
            Task { await finish(at: date) }
        default:
            break
        }
    }

    private func finish(at endDate: Date) async {
        guard let builder else { reset(); return }
        phase = .ending
        stopDemoHeartRate()
        ledger.mark(zone: nil, at: builder.elapsedTime(at: endDate))

        let average = builder.statistics(for: HealthTypes.heartRate)?
            .averageQuantity()?
            .doubleValue(for: .beatsPerMinute)

        do {
            try await builder.endCollection(at: endDate)
            _ = try await builder.finishWorkout()
        } catch {
            errorMessage = "운동 기록 저장에 실패했습니다.\n\(error.localizedDescription)"
        }

        Haptics.stopped()
        summary = WorkoutSummary(duration: builder.elapsedTime(at: endDate),
                                 zoneSeconds: ledger.seconds,
                                 averageHeartRate: average,
                                 range: range)
        phase = .ended
    }
}

// MARK: - Simulator demo

extension WorkoutManager {
    /// The simulator has no heart rate sensor. Feed a slow sine wave that sweeps
    /// through all three zones (about once a minute) so every screen can be
    /// exercised and captured for App Store screenshots.
    private func startDemoHeartRate() {
        #if targetEnvironment(simulator)
        let mid = Double(range.lower + range.upper) / 2
        let amplitude = Double(range.upper - range.lower) / 2 + 8
        demoTask = Task { [weak self] in
            var t = 0.0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2))
                guard let self else { return }
                t += 2
                self.handle(heartRate: (mid + amplitude * sin(t / 10)).rounded(), at: Date())
            }
        }
        #endif
    }

    private func stopDemoHeartRate() {
        #if targetEnvironment(simulator)
        demoTask?.cancel()
        demoTask = nil
        #endif
    }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState,
                                    date: Date) {
        Task { @MainActor in
            self.handle(state: toState, at: date)
        }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        let message = error.localizedDescription
        Task { @MainActor in
            self.errorMessage = message
        }
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                                    didCollectDataOf collectedTypes: Set<HKSampleType>) {
        guard collectedTypes.contains(HealthTypes.heartRate),
              let statistics = workoutBuilder.statistics(for: HealthTypes.heartRate),
              let bpm = statistics.mostRecentQuantity()?.doubleValue(for: .beatsPerMinute) else { return }
        let date = statistics.mostRecentQuantityDateInterval()?.end ?? Date()
        Task { @MainActor in
            self.handle(heartRate: bpm, at: date)
        }
    }
}

enum HealthTypes {
    static let heartRate = HKQuantityType(.heartRate)
    static let restingHeartRate = HKQuantityType(.restingHeartRate)
}

extension HKUnit {
    static let beatsPerMinute = HKUnit.count().unitDivided(by: .minute())
}
