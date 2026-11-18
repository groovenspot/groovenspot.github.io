import Foundation

/// 컨디션 점수를 이루는 8개 지표와 가중치 (기획서 13번 "점수 구성"). 선언 순서가 계산 순서입니다.
public enum Metric: String, CaseIterable, Sendable, Codable {
    case sleepDuration = "SLEEP_DURATION"
    case sleepQuality = "SLEEP_QUALITY"
    case regularity = "REGULARITY"
    case hrv = "HRV"
    case restingHr = "RESTING_HR"
    case activityLoad = "ACTIVITY_LOAD"
    case skinTemp = "SKIN_TEMP"
    case respiratoryRate = "RESPIRATORY_RATE"

    public enum Group: Sendable { case sleep, recovery, load, auxiliary }

    public var weight: Double {
        switch self {
        case .sleepDuration: 0.15
        case .sleepQuality: 0.10
        case .regularity: 0.10
        case .hrv: 0.25
        case .restingHr: 0.15
        case .activityLoad: 0.15
        case .skinTemp: 0.05
        case .respiratoryRate: 0.05
        }
    }

    public var group: Group {
        switch self {
        case .sleepDuration, .sleepQuality, .regularity: .sleep
        case .hrv, .restingHr: .recovery
        case .activityLoad: .load
        case .skinTemp, .respiratoryRate: .auxiliary
        }
    }
}

/// 사용자가 남기는 하루 태그. 그날 점수에는 반영하고 기준선 계산에서는 뺍니다.
public enum DayTag: String, CaseIterable, Sendable, Codable {
    case sick = "SICK"
    case alcohol = "ALCOHOL"
    case overtime = "OVERTIME"
}

/// 지난밤 수면. 가장 긴 블록이 본 수면이고, 낮잠은 수면 시간에만 최대 1시간 더합니다.
public struct SleepSummary: Hashable, Sendable, Codable {
    public var mainSleepMinutes: Int
    public var napMinutes: Int
    /// 침대에 있던 시간 중 실제로 잔 비율, 0~1.
    public var efficiency: Double?
    /// 깊은 잠 비율, 0~1.
    public var deepRatio: Double?
    public var bedtime: LocalTime?

    public init(mainSleepMinutes: Int, napMinutes: Int = 0, efficiency: Double? = nil, deepRatio: Double? = nil, bedtime: LocalTime? = nil) {
        self.mainSleepMinutes = mainSleepMinutes
        self.napMinutes = napMinutes
        self.efficiency = efficiency
        self.deepRatio = deepRatio
        self.bedtime = bedtime
    }
}

/// 하루치 기록. [date]는 아침(기상) 날짜이고, 수면·생체 신호는 그 전날 밤, 활동은 그 전날 하루 값입니다.
/// 기기가 주지 않는 값은 nil로 둡니다.
public struct DailyRecord: Hashable, Sendable, Codable {
    public var date: LocalDate
    /// nil이면 밤에 워치를 차지 않은 날입니다.
    public var sleep: SleepSummary?
    /// 수면 중 RMSSD, ms.
    public var hrvMs: Double?
    /// 수면 중 최저 구간 심박, bpm.
    public var restingHr: Double?
    public var skinTempC: Double?
    public var respiratoryRate: Double?
    /// 전날 하루 활동 부하. 기기별 단위라 같은 기기 안에서만 비교합니다.
    public var activityLoad: Double?
    /// 전날 하루 걸음 수.
    public var steps: Int?
    /// 지난밤 SpO2 90% 미만 구간이 반복됐는지. 측정하지 않는 기기는 nil.
    public var lowSpo2Repeated: Bool?
    public var tags: Set<DayTag>
    /// 그날 아침 보여준 점수.
    public var score: Int?

    public init(
        date: LocalDate,
        sleep: SleepSummary?,
        hrvMs: Double? = nil,
        restingHr: Double? = nil,
        skinTempC: Double? = nil,
        respiratoryRate: Double? = nil,
        activityLoad: Double? = nil,
        steps: Int? = nil,
        lowSpo2Repeated: Bool? = nil,
        tags: Set<DayTag> = [],
        score: Int? = nil
    ) {
        self.date = date
        self.sleep = sleep
        self.hrvMs = hrvMs
        self.restingHr = restingHr
        self.skinTempC = skinTempC
        self.respiratoryRate = respiratoryRate
        self.activityLoad = activityLoad
        self.steps = steps
        self.lowSpo2Repeated = lowSpo2Repeated
        self.tags = tags
        self.score = score
    }

    public func with(score: Int?) -> DailyRecord {
        var r = self
        r.score = score
        return r
    }
}

/// 연령·성별 표준값. 가입 4~27일차에 개인 기준선이 덜 쌓였을 때 섞어 씁니다.
public struct PopulationNorms: Hashable, Sendable, Codable {
    public var hrvMedian: Double
    public var hrvMad: Double
    public var restingHrMedian: Double
    public var restingHrMad: Double

    public init(hrvMedian: Double, hrvMad: Double, restingHrMedian: Double, restingHrMad: Double) {
        self.hrvMedian = hrvMedian
        self.hrvMad = hrvMad
        self.restingHrMedian = restingHrMedian
        self.restingHrMad = restingHrMad
    }
}

public struct ScoreContext: Hashable, Sendable, Codable {
    /// 가입일이 1일차입니다.
    public var dayIndex: Int
    /// 알림 정책(12번)의 주의 등급 신호가 켜져 있는지.
    public var cautionSignalActive: Bool
    /// 워치를 바꾼 지 며칠 됐는지 (바꾼 날 = 0).
    public var daysSinceDeviceChange: Int?
    /// 시간대가 바뀐 지 며칠 됐는지 (바뀐 날 = 0).
    public var daysSinceTimezoneChange: Int?
    public var norms: PopulationNorms?

    public init(dayIndex: Int, cautionSignalActive: Bool = false, daysSinceDeviceChange: Int? = nil, daysSinceTimezoneChange: Int? = nil, norms: PopulationNorms? = nil) {
        self.dayIndex = dayIndex
        self.cautionSignalActive = cautionSignalActive
        self.daysSinceDeviceChange = daysSinceDeviceChange
        self.daysSinceTimezoneChange = daysSinceTimezoneChange
        self.norms = norms
    }
}

public enum Band: String, CaseIterable, Sendable, Codable {
    case peak = "PEAK"
    case good = "GOOD"
    case fair = "FAIR"
    case low = "LOW"
    case veryLow = "VERY_LOW"

    public var label: String {
        switch self {
        case .peak: "최상"
        case .good: "좋음"
        case .fair: "보통"
        case .low: "낮음"
        case .veryLow: "매우 낮음"
        }
    }

    public var meaning: String {
        switch self {
        case .peak: "평소보다 확실히 잘 회복됨"
        case .good: "평소 수준 이상"
        case .fair: "평소보다 조금 부족"
        case .low: "회복이 더디거나 부담이 쌓임"
        case .veryLow: "크게 지친 상태"
        }
    }

    public var advice: String {
        switch self {
        case .peak: "강도 높은 운동에 좋은 날"
        case .good: "평소 계획대로"
        case .fair: "가벼운 활동, 30분 일찍 자기"
        case .low: "강한 운동 대신 휴식·산책"
        case .veryLow: "휴식, 여러 날 이어지면 전문가 상담"
        }
    }

    public static func of(_ score: Int) -> Band {
        switch score {
        case 85...: .peak
        case 70...: .good
        case 50...: .fair
        case 30...: .low
        default: .veryLow
        }
    }
}

public enum Badge: String, CaseIterable, Sendable, Codable {
    case learning = "LEARNING"
    case estimated = "ESTIMATED"
    case relearning = "RELEARNING"
    case jetLag = "JET_LAG"

    public var label: String {
        switch self {
        case .learning: "학습 중"
        case .estimated: "추정"
        case .relearning: "재학습 중"
        case .jetLag: "시차 적응 중"
        }
    }
}

/// 상한 보정. 가중합이 높아도 명백한 문제가 있으면 점수를 누릅니다.
public enum Cap: String, CaseIterable, Sendable, Codable {
    case shortSleep = "SHORT_SLEEP"
    case sick = "SICK"
    case cautionSignal = "CAUTION_SIGNAL"
    case noRecoveryData = "NO_RECOVERY_DATA"

    public var max: Int {
        switch self {
        case .shortSleep: 50
        case .sick: 50
        case .cautionSignal: 60
        case .noRecoveryData: 80
        }
    }
}

public struct ScoreResult: Hashable, Sendable {
    public enum Kind: String, Sendable, Codable {
        /// 8개 지표 중 측정된 것으로 계산한 컨디션 점수.
        case full = "FULL"
        /// 가입 1~3일차: 기준선이 없어 수면 점수만.
        case sleepOnly = "SLEEP_ONLY"
        /// 밤에 워치를 차지 않아 점수를 내지 않음. 느낌 입력을 받습니다.
        case noData = "NO_DATA"
    }

    public var kind: Kind
    /// noData면 nil.
    public var score: Int?
    public var band: Band?
    /// 이유 한 줄.
    public var reason: String
    public var badges: Set<Badge> = []
    public var subScores: [Metric: Double] = [:]
    /// 실제로 점수를 누른 상한.
    public var cap: Cap?
    /// 이유 한 줄을 고른 지표. 상한이나 태그가 이유면 nil.
    public var reasonMetric: Metric?
}
