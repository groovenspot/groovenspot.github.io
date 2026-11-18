import Foundation

/// 알림 등급 (기획서 12번).
public enum Grade: String, Sendable, Codable { case info = "INFO", caution = "CAUTION", emergency = "EMERGENCY" }

/// 출시 알림 신호 12개. 기준값은 의료 자문단 검토 전 초안입니다.
/// fixedThreshold 신호는 기준선이 없는 가입 첫 7일에도 동작합니다.
public enum Signal: String, CaseIterable, Sendable, Codable {
    case sos = "SOS"
    case fall = "FALL"
    case highHrAtRest = "HIGH_HR_AT_REST"
    case lowHrAwake = "LOW_HR_AWAKE"
    /// 워치 제조사(인허가) 기능의 결과를 그대로 받습니다.
    case irregularRhythm = "IRREGULAR_RHYTHM"
    case restingHrRise = "RESTING_HR_RISE"
    case activityDrop = "ACTIVITY_DROP"
    case lowSpo2 = "LOW_SPO2"
    case sleepDebt = "SLEEP_DEBT"
    case stress = "STRESS"
    case medicationMissed = "MEDICATION_MISSED"
    case watchNotWorn = "WATCH_NOT_WORN"

    public var grade: Grade {
        switch self {
        case .sos, .fall: .emergency
        case .highHrAtRest, .lowHrAwake, .irregularRhythm, .restingHrRise, .activityDrop, .lowSpo2: .caution
        case .sleepDebt, .stress, .medicationMissed, .watchNotWorn: .info
        }
    }

    public var fixedThreshold: Bool {
        switch self {
        case .sos, .fall, .highHrAtRest, .lowHrAwake: true
        default: false
        }
    }
}

/// 감지된 신호와 문구에 넣을 값 ("평소 62 → 지금 84").
public struct Detection: Hashable, Sendable, Codable {
    public var signal: Signal
    public var usual: Double?
    public var current: Double?
    /// 며칠째 이어지는지.
    public var days: Int?

    public init(_ signal: Signal, usual: Double? = nil, current: Double? = nil, days: Int? = nil) {
        self.signal = signal
        self.usual = usual
        self.current = current
        self.days = days
    }
}

/// 하루 단위 신호를 아침마다 판정합니다 (기획서 12번 "신호별 판단 기준").
/// 한 번 튀는 값은 알리지 않고, 정해진 일수 동안 이어질 때만 알립니다.
public enum DailySignals {
    private static let learningDays = 7
    private static let minBaselineValues = 3

    /// [days]는 오늘을 포함한 최근 기록 (날짜 순서 무관). [dayIndex]는 가입일이 1.
    public static func evaluate(_ days: [DailyRecord], dayIndex: Int) -> [Detection] {
        if dayIndex <= learningDays || days.isEmpty { return [] }
        let sorted = days.stableSorted { $0.date }
        return [restingHrRise(sorted), activityDrop(sorted), lowSpo2(sorted), sleepDebt(sorted), stress(sorted)].compactMap { $0 }
    }

    /// 안정시 심박이 기준선 대비 +10 bpm 이상으로 3일 연속.
    private static func restingHrRise(_ days: [DailyRecord]) -> Detection? {
        let (recent, baseline) = split(days, 3)
        guard let usual = median(baseline.compactMap(\.restingHr)) else { return nil }
        let values = recent.map(\.restingHr)
        if values.count < 3 || values.contains(where: { $0 == nil || $0! < usual + 10 }) { return nil }
        return Detection(.restingHrRise, usual: usual, current: values.last!, days: 3)
    }

    /// 걸음 수가 기준선의 40% 이하로 3일 연속.
    private static func activityDrop(_ days: [DailyRecord]) -> Detection? {
        let (recent, baseline) = split(days, 3)
        guard let usual = median(baseline.compactMap { $0.steps.map(Double.init) }) else { return nil }
        let values = recent.map(\.steps)
        if values.count < 3 || values.contains(where: { $0 == nil || Double($0!) > usual * 0.4 }) { return nil }
        return Detection(.activityDrop, usual: usual, current: Double(values.last!!), days: 3)
    }

    /// 수면 중 SpO2 90% 미만 구간 반복이 최근 7일 중 3일.
    private static func lowSpo2(_ days: [DailyRecord]) -> Detection? {
        let count = lastDays(days, 7).filter { $0.lowSpo2Repeated == true }.count
        return count >= 3 ? Detection(.lowSpo2, days: count) : nil
    }

    /// 수면이 필요량보다 60분 이상 짧은 날이 최근 5일 중 4일.
    private static func sleepDebt(_ days: [DailyRecord]) -> Detection? {
        let (recent, baseline) = split(days, 5)
        let need = ConditionScoreEngine.sleepNeedMinutes(baseline)
        let short = recent.compactMap(\.sleep).map(ConditionScoreEngine.totalSleepMinutes)
        let shortDays = short.filter { Double($0) <= need - 60 }.count
        if shortDays < 4 { return nil }
        return Detection(.sleepDebt, usual: need, current: short.map(Double.init).average, days: shortDays)
    }

    /// HRV가 기준선 대비 20% 이상 낮은 날이 3일 연속.
    private static func stress(_ days: [DailyRecord]) -> Detection? {
        let (recent, baseline) = split(days, 3)
        guard let usual = median(baseline.compactMap(\.hrvMs)) else { return nil }
        let values = recent.map(\.hrvMs)
        if values.count < 3 || values.contains(where: { $0 == nil || $0! > usual * 0.8 }) { return nil }
        return Detection(.stress, usual: usual, current: values.last!, days: 3)
    }

    /// 최근 [n]일과, 그 앞 28일 중 태그 없는 날(기준선).
    private static func split(_ days: [DailyRecord], _ n: Int) -> ([DailyRecord], [DailyRecord]) {
        let recent = lastDays(days, n)
        guard let first = recent.map(\.date).min() else { return (recent, []) }
        let baseline = days.filter {
            $0.date < first && LocalDate.daysBetween($0.date, first) <= ConditionScoreEngine.baselineDays && $0.tags.isEmpty
        }
        return (recent, baseline)
    }

    private static func lastDays(_ days: [DailyRecord], _ n: Int) -> [DailyRecord] {
        let last = days.map(\.date).max()!
        return days.filter { LocalDate.daysBetween($0.date, last) < n }
    }

    private static func median(_ values: [Double]) -> Double? {
        values.count < minBaselineValues ? nil : Stats.median(values)
    }
}

public struct HrSample: Hashable, Sendable {
    public var time: Date
    public var bpm: Int
    /// 걷기 등 움직임이 감지됐는지.
    public var moving: Bool
    public var asleep: Bool
    /// 운동 기록 중인지.
    public var inWorkout: Bool

    public init(time: Date, bpm: Int, moving: Bool = false, asleep: Bool = false, inWorkout: Bool = false) {
        self.time = time
        self.bpm = bpm
        self.moving = moving
        self.asleep = asleep
        self.inWorkout = inWorkout
    }
}

/// 실시간 고정 기준 신호 (가입 첫날부터 동작):
/// - 안정 중 높은 심박: 120 bpm 이상, 움직임 없이 10분
/// - 깨어 있을 때 낮은 심박: 40 bpm 미만 10분
/// 운동 중과 운동 끝난 뒤 10분은 회복 시간으로 보고 판정하지 않습니다.
public enum HeartRateWatch {
    private static let sustain: TimeInterval = 10 * 60
    private static let recovery: TimeInterval = 10 * 60
    private static let maxGap: TimeInterval = 2 * 60

    public static func evaluate(_ samples: [HrSample]) -> [Detection] {
        let sorted = samples.stableSorted { $0.time }
        let workoutEnds = sorted.filter(\.inWorkout).map(\.time)
        let usable = sorted.filter { s in
            !s.inWorkout && !workoutEnds.contains { end in s.time >= end && s.time.timeIntervalSince(end) < recovery }
        }
        return [
            sustained(usable, .highHrAtRest) { $0.bpm >= 120 && !$0.moving },
            sustained(usable, .lowHrAwake) { $0.bpm < 40 && !$0.asleep },
        ].compactMap { $0 }
    }

    /// 조건이 끊김 없이 10분 이상 이어진 구간이 있으면 감지. 샘플 사이가 2분 넘게 비면 끊긴 것으로 봅니다.
    private static func sustained(_ samples: [HrSample], _ signal: Signal, _ condition: (HrSample) -> Bool) -> Detection? {
        var start: HrSample?
        var prev: HrSample?
        for s in samples {
            let gap = prev.map { s.time.timeIntervalSince($0.time) > maxGap } ?? false
            if !condition(s) || gap { start = nil }
            if condition(s) {
                if start == nil { start = s }
                if s.time.timeIntervalSince(start!.time) >= sustain { return Detection(signal, current: Double(s.bpm)) }
            }
            prev = s
        }
        return nil
    }
}

/// 긴급 알림 연락 흐름 (기획서 12번). 앱은 119에 자동 신고하지 않습니다.
public enum EmergencyEscalation {
    public enum Action: String, Sendable { case askSelf = "ASK_SELF", notify = "NOTIFY", notifyAllAgain = "NOTIFY_ALL_AGAIN" }

    public struct Step: Hashable, Sendable {
        public var afterSeconds: Int
        public var action: Action
        public var guardians: [String] = []
    }

    private static let selfWindow = 60
    private static let guardianInterval = 60
    private static let repeatAfter = 180

    /// [guardians]는 우선순위 순서의 보호자 ID. 누군가 확인하면 남은 단계는 취소합니다.
    public static func plan(_ signal: Signal, _ guardians: [String]) -> [Step] {
        precondition(signal == .fall || signal == .sos, "긴급 연락 흐름은 낙상과 SOS만")
        var steps = [Step]()
        var first = 0
        if signal == .fall {
            steps.append(Step(afterSeconds: 0, action: .askSelf))
            first = selfWindow
        }
        for (i, g) in guardians.enumerated() { steps.append(Step(afterSeconds: first + i * guardianInterval, action: .notify, guardians: [g])) }
        if !guardians.isEmpty { steps.append(Step(afterSeconds: first + repeatAfter, action: .notifyAllAgain, guardians: guardians)) }
        return steps.stableSorted { $0.afterSeconds }
    }

    /// 확인이 [ackAfterSeconds]초에 들어왔을 때 실제로 나간 단계.
    public static func stepsBefore(_ plan: [Step], _ ackAfterSeconds: Int) -> [Step] { plan.filter { $0.afterSeconds < ackAfterSeconds } }
}
