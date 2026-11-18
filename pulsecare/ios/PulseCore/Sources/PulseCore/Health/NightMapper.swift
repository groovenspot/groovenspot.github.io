import Foundation

/// HealthKit 기록을 플랫폼과 무관한 값으로 옮긴 것. 앱의 HealthKit 읽기 코드가 채웁니다.
public struct RawHealth: Sendable {
    public var sleep: [RawSleep] = []
    public var hrv: [Sample] = []
    public var restingHr: [Sample] = []
    public var respiratoryRate: [Sample] = []
    /// 0~100 (%).
    public var spo2: [Sample] = []
    /// 날짜별 하루 합계.
    public var steps: [LocalDate: Int] = [:]
    public var activeCalories: [LocalDate: Double] = [:]
    /// 시간대 시작 시각(현지)별 걸음 수. 미션 확인용이라 최근 이틀만 읽습니다.
    public var stepsByHour: [LocalDateTime: Int] = [:]
    public var floors: [LocalDate: Double] = [:]
    public var exercises: [RawExercise] = []

    public init() {}
}

public struct RawExercise: Hashable, Sendable {
    public var start: Date
    public var end: Date
    public var kind: ExerciseKind

    public init(start: Date, end: Date, kind: ExerciseKind) {
        self.start = start
        self.end = end
        self.kind = kind
    }
}

public struct Sample: Hashable, Sendable {
    public var time: Date
    public var value: Double

    public init(_ time: Date, _ value: Double) {
        self.time = time
        self.value = value
    }
}

public struct RawSleep: Hashable, Sendable {
    public var start: Date
    public var end: Date
    public var stages: [RawStage]

    public init(start: Date, end: Date, stages: [RawStage] = []) {
        self.start = start
        self.end = end
        self.stages = stages
    }
}

public struct RawStage: Hashable, Sendable {
    public var start: Date
    public var end: Date
    public var type: StageType

    public init(start: Date, end: Date, type: StageType) {
        self.start = start
        self.end = end
        self.type = type
    }
}

public enum StageType: Sendable { case awake, light, deep, rem, asleepUnknown, outOfBed, other }

/// 시간대 변환. 점수는 사용자의 현지 날짜·시각 기준입니다.
public struct Zone: Sendable {
    public let timeZone: TimeZone

    public init(_ timeZone: TimeZone = .current) { self.timeZone = timeZone }

    public func local(_ d: Date) -> LocalDateTime {
        let seconds = Int(d.timeIntervalSince1970.rounded(.down))
        return LocalDateTime(epochSecond: seconds + timeZone.secondsFromGMT(for: d))
    }

    /// 현지 시각 → 순간. 서머타임으로 없는 시각이면 뒤로 밀고, 두 번 있는 시각이면 앞의 것을 씁니다.
    public func instant(_ t: LocalDateTime) -> Date {
        let guess = Date(timeIntervalSince1970: TimeInterval(t.epochSecond - timeZone.secondsFromGMT(for: Date(timeIntervalSince1970: TimeInterval(t.epochSecond)))))
        let offset = timeZone.secondsFromGMT(for: guess)
        return Date(timeIntervalSince1970: TimeInterval(t.epochSecond - offset))
    }

    public func startOfDay(_ d: LocalDate) -> Date { instant(d.atStartOfDay) }
}

/// 기상 날짜별 DailyRecord를 만듭니다 (기획서 13번 "예외 처리"):
/// - 본 수면 = 전날 18시 ~ 그날 14시에 끝난 가장 긴 수면
/// - 낮잠 = 전날 10~20시에 끝난 3시간 미만 수면 (수면 시간에만 최대 1시간 더하는 건 점수 엔진이 합니다)
/// - HRV·호흡수·SpO2는 본 수면 동안의 값, 안정시 심박은 그날 기록
/// - 걸음·활동은 전날 하루 값
public enum NightMapper {
    private static let nightEndFrom = LocalTime(18, 0)
    private static let nightEndUntil = LocalTime(14, 0)
    private static let napEndFrom = LocalTime(10, 0)
    private static let napEndUntil = LocalTime(20, 0)
    private static let napMax: TimeInterval = 3 * 3600

    public static func map(_ raw: RawHealth, from: LocalDate, to: LocalDate, zone: Zone) -> [DailyRecord] {
        guard from <= to else { return [] }
        return (0...LocalDate.daysBetween(from, to)).map { day(raw, from.plusDays($0), zone: zone) }
    }

    /// [date] 아침에 끝난 본 수면.
    public static func mainSleep(_ raw: RawHealth, _ date: LocalDate, zone: Zone) -> RawSleep? {
        let nightStart = zone.instant(date.minusDays(1).atTime(nightEndFrom))
        let nightEnd = zone.instant(date.atTime(nightEndUntil))
        return raw.sleep
            .filter { $0.end > nightStart && $0.end <= nightEnd }
            .max { $0.end.timeIntervalSince($0.start) < $1.end.timeIntervalSince($1.start) }
    }

    /// 미션 확인용 하루 활동 (기획서 14번).
    public static func activity(_ raw: RawHealth, _ date: LocalDate, zone: Zone) -> DayActivity {
        let today = mainSleep(raw, date, zone: zone)
        let tonight = mainSleep(raw, date.plusDays(1), zone: zone)
        let past = (1...28).compactMap { mainSleep(raw, date.minusDays($0), zone: zone) }
        let week = (0...5).compactMap { mainSleep(raw, date.minusDays($0), zone: zone) } + [tonight].compactMap { $0 }
        let dayFrom = zone.instant(date.atTime(napEndFrom))
        let dayUntil = zone.instant(date.atTime(napEndUntil))
        var steps = [Int: Int]()
        for (t, v) in raw.stepsByHour where t.date == date { steps[t.time.hour] = v }
        return DayActivity(
            date: date,
            stepsByHour: steps,
            floors: raw.floors[date],
            exercises: raw.exercises
                .filter { zone.local($0.start).date == date }
                .map { Exercise(start: zone.local($0.start), end: zone.local($0.end), kind: $0.kind) },
            naps: raw.sleep
                .filter { $0 != today && $0 != tonight && $0.end > dayFrom && $0.end <= dayUntil && $0.end.timeIntervalSince($0.start) < napMax }
                .map { Nap(start: zone.local($0.start), end: zone.local($0.end)) },
            nightBedtime: tonight.map { zone.local($0.start) },
            nextWake: tonight.map { zone.local($0.end) },
            morningWake: today.map { zone.local($0.end) },
            usualBedtime: past.count >= 3 ? MissionVerifier.median(past.map { zone.local($0.start).time }) : nil,
            usualWake: past.count >= 3 ? MissionVerifier.median(past.map { zone.local($0.end).time }) : nil,
            recentBedtimes: week.map { zone.local($0.start).time }
        )
    }

    public static func day(_ raw: RawHealth, _ date: LocalDate, zone: Zone) -> DailyRecord {
        let main = mainSleep(raw, date, zone: zone)
        let napFrom = zone.instant(date.minusDays(1).atTime(napEndFrom))
        let napUntil = zone.instant(date.minusDays(1).atTime(napEndUntil))
        let napMinutes = raw.sleep
            .filter { $0 != main && $0.end > napFrom && $0.end <= napUntil && $0.end.timeIntervalSince($0.start) < napMax }
            .reduce(0) { $0 + asleepMinutes($1) }
        let yesterday = date.minusDays(1)
        let dayStart = zone.startOfDay(date)
        let dayEnd = zone.startOfDay(date.plusDays(1))

        return DailyRecord(
            date: date,
            sleep: main.map {
                SleepSummary(mainSleepMinutes: asleepMinutes($0), napMinutes: napMinutes, efficiency: efficiency($0),
                             deepRatio: deepRatio($0), bedtime: zone.local($0.start).time)
            },
            hrvMs: main.flatMap { median(within(raw.hrv, $0.start, $0.end)) },
            restingHr: median(within(raw.restingHr, dayStart, dayEnd)) ?? main.flatMap { median(within(raw.restingHr, $0.start, $0.end)) },
            respiratoryRate: main.flatMap { median(within(raw.respiratoryRate, $0.start, $0.end)) },
            activityLoad: raw.activeCalories[yesterday],
            steps: raw.steps[yesterday],
            lowSpo2Repeated: main.flatMap { lowSpo2(within(raw.spo2, $0.start, $0.end)) }
        )
    }

    private static let asleep: Set<StageType> = [.light, .deep, .rem, .asleepUnknown]

    private static func minutes(_ a: Date, _ b: Date) -> Int { Int(b.timeIntervalSince(a) / 60) }

    /// 단계 기록이 있으면 실제로 잔 시간, 없으면 세션 길이.
    static func asleepMinutes(_ s: RawSleep) -> Int {
        if s.stages.isEmpty { return minutes(s.start, s.end) }
        return s.stages.filter { asleep.contains($0.type) }.reduce(0) { $0 + minutes($1.start, $1.end) }
    }

    private static func efficiency(_ s: RawSleep) -> Double? {
        if s.stages.isEmpty { return nil }
        let inBed = Double(minutes(s.start, s.end))
        return inBed <= 0 ? nil : clamp(Double(asleepMinutes(s)) / inBed, 0.0, 1.0)
    }

    private static func deepRatio(_ s: RawSleep) -> Double? {
        if !s.stages.contains(where: { $0.type == .deep }) { return nil }
        let a = Double(asleepMinutes(s))
        let deep = s.stages.filter { $0.type == .deep }.reduce(0) { $0 + minutes($1.start, $1.end) }
        return a <= 0 ? nil : Double(deep) / a
    }

    /// SpO2 90% 미만이 서로 5분 넘게 떨어진 두 구간 이상이면 "반복". 측정이 없으면 nil.
    private static func lowSpo2(_ samples: [Sample]) -> Bool? {
        if samples.isEmpty { return nil }
        let low = samples.filter { $0.value < 90.0 }.map(\.time).sorted()
        var episodes = 0
        var last: Date?
        for t in low {
            if last == nil || t.timeIntervalSince(last!) > 5 * 60 { episodes += 1 }
            last = t
        }
        return episodes >= 2
    }

    private static func within(_ samples: [Sample], _ start: Date, _ end: Date) -> [Sample] {
        samples.filter { $0.time >= start && $0.time < end }
    }

    private static func median(_ samples: [Sample]) -> Double? {
        samples.isEmpty ? nil : Stats.median(samples.map(\.value))
    }
}
