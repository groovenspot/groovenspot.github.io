import Foundation

extension Goal: CodingKeyRepresentable {}
extension Signal: CodingKeyRepresentable {}

/// 사용자가 정한 것.
public struct Profile: Hashable, Sendable, Codable {
    public var goal: Goal
    public var signupDate: LocalDate
    /// 목표별 레벨 (기획서 14번: 레벨은 목표별로 따로).
    public var levels: [Goal: Int]
    public var seniorMode: Bool
    /// 지금 목표를 고른 날. 4주가 지나면 주간 리포트에 변화 한 줄이 붙습니다.
    public var goalSince: LocalDate
    /// 워치 없이 보호자로만 쓰는 사람: HealthKit을 읽지 않고, 홈은 부모님 카드입니다.
    public var guardianOnly: Bool

    public init(goal: Goal, signupDate: LocalDate, levels: [Goal: Int] = [:], seniorMode: Bool = false, goalSince: LocalDate? = nil, guardianOnly: Bool = false) {
        self.goal = goal
        self.signupDate = signupDate
        self.levels = levels
        self.seniorMode = seniorMode
        self.goalSince = goalSince ?? signupDate
        self.guardianOnly = guardianOnly
    }

    public var level: Int { levels[goal] ?? 1 }
}

/// 오늘 고른 미션. 하루 동안 바뀌지 않고, "다른 미션"은 하루 1번.
public struct TodayMission: Hashable, Sendable, Codable {
    public var date: LocalDate
    public var missionId: String
    public var swapped: Bool
    public var completed: Bool
    /// 직접 체크하지 않고 워치 기록으로 완료를 확인함.
    public var auto: Bool

    public init(date: LocalDate, missionId: String, swapped: Bool = false, completed: Bool = false, auto: Bool = false) {
        self.date = date
        self.missionId = missionId
        self.swapped = swapped
        self.completed = completed
        self.auto = auto
    }
}

/// "내 정보 > 알림" (기획서 12번): 모든 시간과 신호별 알림을 바꿀 수 있고, 긴급 알림만 끌 수 없습니다.
public struct NotificationSettings: Hashable, Sendable, Codable {
    public var morningEnabled = true
    public var morningTime = LocalTime(7, 30)
    public var eveningEnabled = true
    public var eveningTime = LocalTime(21, 0)
    public var weeklyEnabled = true
    public var quietStart = LocalTime(23, 0)
    public var quietEnd = LocalTime(7, 0)
    /// 사용자가 끈 신호. 긴급 신호(SOS·낙상)는 넣어도 무시합니다.
    public var disabledSignals: Set<Signal> = []

    public init() {}

    public func allows(_ signal: Signal) -> Bool { !disabledSignals.contains(signal) || Self.alwaysOn.contains(signal) }

    public static let alwaysOn: Set<Signal> = [.sos, .fall]

    /// 설정 화면에 보여주는 신호 (지금 앱이 판정하는 것만).
    public static let adjustable: [Signal] = [.restingHrRise, .activityDrop, .lowSpo2, .sleepDebt, .stress, .highHrAtRest, .lowHrAwake]

    public var schedulerSettings: AlertScheduler.Settings {
        var s = AlertScheduler.Settings()
        s.quietStart = quietStart
        s.quietEnd = quietEnd
        s.morningReport = morningTime
        s.eveningSummary = eveningTime
        return s
    }
}

extension Signal {
    /// 설정 화면의 신호 이름.
    public var settingLabel: String {
        switch self {
        case .sos: "SOS"
        case .fall: "낙상"
        case .highHrAtRest: "쉬는 중 높은 심박"
        case .lowHrAwake: "깨어 있을 때 낮은 심박"
        case .irregularRhythm: "심장 리듬"
        case .restingHrRise: "안정시 심박 상승"
        case .activityDrop: "걸음 수 감소"
        case .lowSpo2: "수면 중 산소포화도"
        case .sleepDebt: "수면 부족"
        case .stress: "스트레스(HRV 저하)"
        case .medicationMissed: "복약"
        case .watchNotWorn: "워치 미착용"
        }
    }
}
