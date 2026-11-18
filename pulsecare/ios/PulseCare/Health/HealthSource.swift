import Foundation
import HealthKit
import PulseCore

/// 점수에 필요한 건강 기록을 읽는 곳. 실제 기기는 HealthKit, 스크린샷·데모는 가상 기록.
protocol HealthSource: Sendable {
    var available: Bool { get }
    func requestAuthorization() async throws
    /// [from]~[to] 기상일의 기록. 권한이 없는 항목은 비워 둡니다 (SYS-03: 가능한 데이터로만 동작).
    func read(from: LocalDate, to: LocalDate, zone: Zone) async -> RawHealth
}

/// HealthKit에서 읽기만 합니다. 애플워치뿐 아니라 건강 앱에 기록을 쓰는 다른 워치·앱의 기록도 그대로 씁니다.
/// HRV는 애플워치가 주는 SDNN이라 안드로이드(RMSSD)와 단위가 다르지만, 점수는 내 기준선과만 비교해 문제없습니다.
final class HealthKitSource: HealthSource, @unchecked Sendable {
    private let store = HKHealthStore()

    var available: Bool { HKHealthStore.isHealthDataAvailable() }

    static let quantityTypes: [HKQuantityTypeIdentifier] = [
        .heartRateVariabilitySDNN, .restingHeartRate, .respiratoryRate, .oxygenSaturation,
        .stepCount, .activeEnergyBurned, .flightsClimbed, .heartRate,
    ]

    var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKCategoryType(.sleepAnalysis), HKObjectType.workoutType()]
        for id in Self.quantityTypes { types.insert(HKQuantityType(id)) }
        return types
    }

    func requestAuthorization() async throws {
        guard available else { return }
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    /// 새 수면 기록이 들어오면 앱을 깨워 아침 리포트를 만듭니다.
    func enableSleepDelivery(_ onUpdate: @escaping @Sendable () async -> Void) {
        guard available else { return }
        let type = HKCategoryType(.sleepAnalysis)
        let query = HKObserverQuery(sampleType: type, predicate: nil) { _, completion, error in
            guard error == nil else {
                completion()
                return
            }
            Task {
                await onUpdate()
                completion()
            }
        }
        store.execute(query)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    func read(from: LocalDate, to: LocalDate, zone: Zone) async -> RawHealth {
        guard available else { return RawHealth() }
        // 전날 저녁에 시작한 수면과 전날 활동까지 들어오게 하루 앞에서, 그날 밤 수면까지 하루 뒤로 읽습니다.
        let start = zone.startOfDay(from.minusDays(1))
        let end = zone.startOfDay(to.plusDays(2))
        let range = HKQuery.predicateForSamples(withStart: start, end: end)
        var raw = RawHealth()
        raw.sleep = await sleep(range)
        raw.hrv = await samples(.heartRateVariabilitySDNN, range, HKUnit.secondUnit(with: .milli))
        raw.restingHr = await samples(.restingHeartRate, range, HKUnit.count().unitDivided(by: .minute()))
        raw.respiratoryRate = await samples(.respiratoryRate, range, HKUnit.count().unitDivided(by: .minute()))
        raw.spo2 = await samples(.oxygenSaturation, range, .percent()).map { Sample($0.time, $0.value * 100) }
        raw.steps = await daily(.stepCount, from: from.minusDays(1), to: to, zone: zone, unit: .count()).mapValues { Int($0.rounded()) }
        raw.activeCalories = await daily(.activeEnergyBurned, from: from.minusDays(1), to: to, zone: zone, unit: .kilocalorie())
        raw.floors = await daily(.flightsClimbed, from: to.minusDays(1), to: to, zone: zone, unit: .count())
        raw.stepsByHour = await hourlySteps(from: to.minusDays(1), to: to, zone: zone)
        raw.exercises = await workouts(HKQuery.predicateForSamples(withStart: zone.startOfDay(to.minusDays(1)), end: end))
        return raw
    }

    // MARK: 수면

    /// 애플워치는 수면 단계를 조각으로 씁니다. 같은 기기 조각을 30분 안쪽 간격끼리 묶어 한 번의 잠으로 봅니다.
    /// 여러 기기·앱이 같은 밤을 쓰면 단계 기록이 가장 많은 출처 하나만 씁니다 (중복으로 잠이 두 배가 되지 않게).
    private func sleep(_ range: NSPredicate) async -> [RawSleep] {
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: range)],
            sortDescriptors: [SortDescriptor(\.startDate)]
        )
        guard let all = try? await descriptor.result(for: store), !all.isEmpty else { return [] }
        let bySource = Dictionary(grouping: all) { $0.sourceRevision.source.bundleIdentifier }
        let best = bySource.max { a, b in
            let sa = a.value.filter { Self.stage($0.value) != nil && Self.stage($0.value) != .asleepUnknown }.count
            let sb = b.value.filter { Self.stage($0.value) != nil && Self.stage($0.value) != .asleepUnknown }.count
            return sa != sb ? sa < sb : a.value.count < b.value.count
        }?.value ?? []

        var sessions = [RawSleep]()
        for s in best.sorted(by: { $0.startDate < $1.startDate }) {
            let stage = Self.stage(s.value).map { RawStage(start: s.startDate, end: s.endDate, type: $0) }
            if var last = sessions.last, s.startDate.timeIntervalSince(last.end) <= 30 * 60 {
                last.end = max(last.end, s.endDate)
                if let stage { last.stages.append(stage) }
                sessions[sessions.count - 1] = last
            } else {
                sessions.append(RawSleep(start: s.startDate, end: s.endDate, stages: stage.map { [$0] } ?? []))
            }
        }
        // 침대에 있던 시간만 있고 잠 기록이 없는 묶음(아이폰 수면 일정만)은 세션 길이로 봅니다.
        return sessions.map { s in
            s.stages.allSatisfy({ $0.type == .awake }) ? RawSleep(start: s.start, end: s.end) : s
        }
    }

    private static func stage(_ value: Int) -> StageType? {
        switch HKCategoryValueSleepAnalysis(rawValue: value) {
        case .inBed: return nil
        case .awake: return .awake
        case .asleepCore: return .light
        case .asleepDeep: return .deep
        case .asleepREM: return .rem
        case .asleepUnspecified: return .asleepUnknown
        default: return .other
        }
    }

    // MARK: 수치

    private func samples(_ id: HKQuantityTypeIdentifier, _ range: NSPredicate, _ unit: HKUnit) async -> [Sample] {
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(id), predicate: range)],
            sortDescriptors: [SortDescriptor(\.startDate)]
        )
        guard let result = try? await descriptor.result(for: store) else { return [] }
        return result.map { Sample($0.startDate, $0.quantity.doubleValue(for: unit)) }
    }

    /// 현지 자정 기준 하루 합계.
    private func daily(_ id: HKQuantityTypeIdentifier, from: LocalDate, to: LocalDate, zone: Zone, unit: HKUnit) async -> [LocalDate: Double] {
        await collection(id, from: from, to: to, zone: zone, interval: DateComponents(day: 1), unit: unit)
            .reduce(into: [:]) { out, item in out[item.0.date] = item.1 }
    }

    private func hourlySteps(from: LocalDate, to: LocalDate, zone: Zone) async -> [LocalDateTime: Int] {
        await collection(.stepCount, from: from, to: to, zone: zone, interval: DateComponents(hour: 1), unit: .count())
            .reduce(into: [:]) { out, item in out[item.0] = Int(item.1.rounded()) }
    }

    private func collection(_ id: HKQuantityTypeIdentifier, from: LocalDate, to: LocalDate, zone: Zone, interval: DateComponents, unit: HKUnit) async -> [(LocalDateTime, Double)] {
        let start = zone.startOfDay(from)
        let end = zone.startOfDay(to.plusDays(1))
        let descriptor = HKStatisticsCollectionQueryDescriptor(
            predicate: .quantitySample(type: HKQuantityType(id), predicate: HKQuery.predicateForSamples(withStart: start, end: end)),
            options: .cumulativeSum,
            anchorDate: start,
            intervalComponents: interval
        )
        guard let result = try? await descriptor.result(for: store) else { return [] }
        var out = [(LocalDateTime, Double)]()
        result.enumerateStatistics(from: start, to: end) { stats, _ in
            if let sum = stats.sumQuantity() { out.append((zone.local(stats.startDate), sum.doubleValue(for: unit))) }
        }
        return out
    }

    private func workouts(_ range: NSPredicate) async -> [RawExercise] {
        let descriptor = HKSampleQueryDescriptor(predicates: [.workout(range)], sortDescriptors: [SortDescriptor(\.startDate)])
        guard let result = try? await descriptor.result(for: store) else { return [] }
        return result.map { RawExercise(start: $0.startDate, end: $0.endDate, kind: Self.kind($0.workoutActivityType)) }
    }

    static func kind(_ t: HKWorkoutActivityType) -> ExerciseKind {
        switch t {
        case .running, .highIntensityIntervalTraining, .crossTraining, .jumpRope, .kickboxing, .boxing, .stairClimbing, .soccer, .basketball, .tennis, .squash:
            return .vigorous
        case .walking, .hiking, .cycling, .elliptical, .rowing, .swimming, .mixedCardio, .stairs, .dance, .cardioDance:
            return .cardio
        case .traditionalStrengthTraining, .functionalStrengthTraining, .coreTraining:
            return .strength
        case .yoga, .flexibility, .pilates, .cooldown, .mindAndBody, .taiChi:
            return .stretch
        default:
            return .other
        }
    }
}
