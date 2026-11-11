import Foundation

/// 사용자가 고르는 목표 (1개만, 기획서 14번). lowDay는 점수 50 미만인 날 공통 미션입니다.
public enum Goal: String, CaseIterable, Sendable, Codable {
    case sleep = "SLEEP"
    case weight = "WEIGHT"
    case stress = "STRESS"
    case parent = "PARENT"
    case lowDay = "LOW_DAY"

    public var code: Character {
        switch self {
        case .sleep: "S"
        case .weight: "W"
        case .stress: "R"
        case .parent: "P"
        case .lowDay: "C"
        }
    }

    public var label: String {
        switch self {
        case .sleep: "잠 잘 자기"
        case .weight: "체중 관리"
        case .stress: "스트레스 줄이기"
        case .parent: "부모님 건강 챙기기"
        case .lowDay: "컨디션 낮은 날"
        }
    }
}

public enum Verification: String, Sendable, Codable { case auto = "AUTO", manual = "MANUAL" }

public struct Mission: Hashable, Sendable, Identifiable {
    public let id: String
    /// 워치에 뜨는 문장 (15자 안팎).
    public let title: String
    public let goal: Goal
    public let level: Int
    public let verification: Verification
    /// 이 미션과 짝이 되는 컨디션 점수 요인. 오늘 점수를 끌어내린 요인과 같으면 가산점.
    public let linked: Set<Metric>
    /// 주말에만 맞는 미션.
    public let weekendOnly: Bool
    /// 날씨가 나쁜 날 빼는 실외 미션.
    public let outdoor: Bool
    /// 시니어 "쉽게 보기" 모드에서도 주는 미션.
    public let seniorFriendly: Bool

    init(_ id: String, _ title: String, _ goal: Goal, _ level: Int, _ verification: Verification, _ linked: Set<Metric> = [],
         weekendOnly: Bool = false, outdoor: Bool = false, seniorFriendly: Bool = false) {
        self.id = id
        self.title = title
        self.goal = goal
        self.level = level
        self.verification = verification
        self.linked = linked
        self.weekendOnly = weekendOnly
        self.outdoor = outdoor
        self.seniorFriendly = seniorFriendly
    }

    public var points: Int { level * 10 }
}

/// 출시 라이브러리 40개 (목표별 8개 × 4 + 컨디션 낮은 날 8개). 수동 확인 11개.
public enum MissionLibrary {
    private static let A = Verification.auto
    private static let M = Verification.manual

    public static let all: [Mission] = [
        Mission("S-01", "취침 알림 받고 30분 안에 눕기", .sleep, 1, A, [.regularity], seniorFriendly: true),
        Mission("S-02", "오후 2시 이후 카페인 쉬기", .sleep, 1, M, [.sleepQuality]),
        Mission("S-03", "아침 햇빛 받으며 10분 걷기", .sleep, 1, A, [.regularity], outdoor: true, seniorFriendly: true),
        Mission("S-04", "잠들기 전 호흡 가이드 1회", .sleep, 1, A, [.sleepQuality], seniorFriendly: true),
        Mission("S-05", "취침 1시간 전 화면 끄기", .sleep, 2, M, [.sleepQuality]),
        Mission("S-06", "평소보다 30분 일찍 눕기", .sleep, 2, A, [.sleepDuration]),
        Mission("S-07", "주말에도 기상 시각 ±30분 지키기", .sleep, 2, A, [.regularity], weekendOnly: true),
        Mission("S-08", "7일 연속 같은 시각(±30분) 취침", .sleep, 3, A, [.regularity]),

        Mission("W-01", "점심 먹고 10분 걷기", .weight, 1, A, [.activityLoad], outdoor: true, seniorFriendly: true),
        Mission("W-02", "오늘 7,000보", .weight, 1, A, [.activityLoad], seniorFriendly: true),
        Mission("W-03", "엘리베이터 대신 계단 3층", .weight, 1, A, [.activityLoad]),
        Mission("W-04", "세 끼 식사 사진 기록", .weight, 1, M),
        Mission("W-05", "오늘 10,000보", .weight, 2, A, [.activityLoad]),
        Mission("W-06", "심박 존 2에서 20분 운동", .weight, 2, A, [.activityLoad]),
        Mission("W-07", "저녁 8시 이후 간식 쉬기", .weight, 2, M, [.sleepQuality]),
        Mission("W-08", "존 2 운동 40분 + 근력 10분", .weight, 3, A, [.activityLoad]),

        Mission("R-01", "1분 호흡 가이드 1회", .stress, 1, A, [.hrv]),
        Mission("R-02", "일하는 동안 50분마다 일어나기", .stress, 1, A, [.hrv]),
        Mission("R-03", "점심시간 15분 산책", .stress, 1, A, [.hrv], outdoor: true),
        Mission("R-04", "오늘 감사한 일 한 줄 적기", .stress, 1, M),
        Mission("R-05", "스트레스 알림이 오면 바로 호흡하기", .stress, 2, A, [.hrv]),
        Mission("R-06", "저녁 스트레칭 10분", .stress, 2, A, [.restingHr]),
        Mission("R-07", "퇴근 후 1시간 업무 알림 끄기", .stress, 2, M, [.hrv]),
        Mission("R-08", "아침·점심·저녁 호흡 3회", .stress, 3, A, [.hrv]),

        Mission("P-01", "부모님 오늘 요약 확인하기", .parent, 1, A),
        Mission("P-02", "앱에서 부모님께 안부 전화", .parent, 1, A),
        Mission("P-03", "부모님 복약 체크 확인하기", .parent, 1, A),
        Mission("P-04", "부모님 워치 착용·충전 확인", .parent, 1, A),
        Mission("P-05", "부모님과 걸음 챌린지 함께하기", .parent, 2, A, [.activityLoad]),
        Mission("P-06", "통화하며 주간 리포트 같이 보기", .parent, 2, M),
        Mission("P-07", "다음 병원 일정 등록하기", .parent, 2, M),
        Mission("P-08", "한 달 건강 요약을 진료 때 공유", .parent, 3, M),

        Mission("C-01", "오늘은 강한 운동 쉬기", .lowDay, 1, A, [.activityLoad]),
        Mission("C-02", "오후 3시 전 20분 낮잠", .lowDay, 1, A, [.sleepDuration]),
        Mission("C-03", "가벼운 산책 15분", .lowDay, 1, A, [.restingHr], outdoor: true, seniorFriendly: true),
        Mission("C-04", "1분 호흡 2회", .lowDay, 1, A, [.hrv]),
        Mission("C-05", "오늘 밤 평소보다 30분 일찍 자기", .lowDay, 1, A, [.sleepDuration], seniorFriendly: true),
        Mission("C-06", "저녁 스트레칭 5분", .lowDay, 1, A, [.hrv]),
        Mission("C-07", "물 6잔 마시기", .lowDay, 1, M),
        Mission("C-08", "몸 상태 태그 남기기", .lowDay, 1, M),
    ]

    private static let byId = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    public static subscript(id: String) -> Mission { byId[id]! }

    public static func find(_ id: String) -> Mission? { byId[id] }

    public static func of(_ goal: Goal) -> [Mission] { all.filter { $0.goal == goal } }
}

/// 지난 미션 기록 한 줄. [auto]는 직접 체크하지 않고 워치 기록으로 완료를 확인한 날.
public struct MissionLog: Hashable, Sendable, Codable {
    public var date: LocalDate
    public var missionId: String
    public var completed: Bool
    public var auto: Bool

    public init(date: LocalDate, missionId: String, completed: Bool, auto: Bool = false) {
        self.date = date
        self.missionId = missionId
        self.completed = completed
        self.auto = auto
    }
}

public struct PickInput: Sendable {
    public var date: LocalDate
    /// 오늘 컨디션 점수. 점수를 못 낸 날은 nil: 목표 미션을 레벨 그대로 줍니다.
    public var score: Int?
    /// 오늘 점수를 가장 크게 끌어내린 요인 (이유 한 줄의 지표).
    public var reasonMetric: Metric?
    public var goal: Goal
    /// 목표별로 따로 관리하는 현재 레벨, 1~3.
    public var level: Int
    public var history: [MissionLog]
    public var badWeather: Bool
    public var seniorMode: Bool
    /// "다른 미션"으로 바꿀 때 지금 미션을 뺍니다.
    public var exclude: Set<String>

    public init(date: LocalDate, score: Int?, reasonMetric: Metric?, goal: Goal, level: Int, history: [MissionLog] = [],
                badWeather: Bool = false, seniorMode: Bool = false, exclude: Set<String> = []) {
        self.date = date
        self.score = score
        self.reasonMetric = reasonMetric
        self.goal = goal
        self.level = level
        self.history = history
        self.badWeather = badWeather
        self.seniorMode = seniorMode
        self.exclude = exclude
    }
}

/// 미션 고르기의 무작위 값. 테스트에서는 정해진 값을 넣습니다.
public protocol RandomSource: AnyObject {
    /// 0 이상 1 미만.
    func nextDouble() -> Double
    /// 0 이상 [bound] 미만.
    func nextInt(_ bound: Int) -> Int
}

public final class SystemRandom: RandomSource {
    public init() {}
    public func nextDouble() -> Double { Double.random(in: 0..<1) }
    public func nextInt(_ bound: Int) -> Int { Int.random(in: 0..<bound) }
}

/// 오늘의 미션 고르기 (기획서 14번):
/// 구간 필터 → 레벨 필터 → 이유 연결 가산 → 반복 방지 → 일정 확인 → 선택 (20%는 새 미션).
public final class MissionPicker {
    public static let newMissionRate = 0.2
    private let random: RandomSource

    public init(random: RandomSource = SystemRandom()) { self.random = random }

    public func pick(_ input: PickInput) -> Mission {
        let lowDay = input.score.map { $0 < 50 } == true
        let pool = MissionLibrary.of(lowDay ? .lowDay : input.goal)

        // 50~69점인 날은 한 레벨 낮춰서. 3일 연속 놓쳤으면 가장 쉬운 레벨 1을 하루 끼워 넣습니다.
        var maxLevel = clamp(input.level, 1, 3)
        if let s = input.score, (50...69).contains(s) { maxLevel -= 1 }
        if missedDaysInRow(input) >= 3 { maxLevel = 1 }
        maxLevel = Swift.max(maxLevel, 1)

        let byLevel = pool.filter { $0.level <= maxLevel }
            .filter { !input.seniorMode || $0.seniorFriendly }
            .filter { !input.exclude.contains($0.id) }

        let recent = Set(input.history.filter { (1...3).contains(LocalDate.daysBetween($0.date, input.date)) }.map(\.missionId))
        let missedTwice = missedTwiceInARow(input.history)
        let weekend = input.date.dayOfWeek.isWeekend

        let fresh = byLevel
            .filter { !recent.contains($0.id) && !missedTwice.contains($0.id) }
            .filter { !$0.weekendOnly || weekend }
            .filter { !$0.outdoor || !input.badWeather }

        // 다 걸러지면 반복 방지부터 풀고, 그래도 없으면 레벨 1 공통 미션으로.
        var candidates = fresh
        if candidates.isEmpty { candidates = byLevel.filter { (!$0.weekendOnly || weekend) && (!$0.outdoor || !input.badWeather) } }
        if candidates.isEmpty {
            candidates = MissionLibrary.of(.lowDay).filter { !input.exclude.contains($0.id) && !($0.outdoor && input.badWeather) }
        }

        let neverShown = candidates.filter { c in !input.history.contains { $0.missionId == c.id } }
        if !neverShown.isEmpty && random.nextDouble() < Self.newMissionRate {
            return neverShown[random.nextInt(neverShown.count)]
        }
        return candidates.max { a, b in
            let ra = rank(a, input), rb = rank(b, input)
            return ra != rb ? ra < rb : String(a.id.reversed()) < String(b.id.reversed())
        }!
    }

    /// 이유 연결 가산점 + 과거 완료율 (기록이 없으면 0.5).
    private func rank(_ mission: Mission, _ input: PickInput) -> Double {
        let linkBonus = input.reasonMetric.map { mission.linked.contains($0) } == true ? 1.0 : 0.0
        let logs = input.history.filter { $0.missionId == mission.id }
        let completion = logs.isEmpty ? 0.5 : Double(logs.filter(\.completed).count) / Double(logs.count)
        return linkBonus + completion
    }

    private func missedDaysInRow(_ input: PickInput) -> Int {
        var n = 0
        for log in input.history.stableSortedDescending(by: { $0.date }) {
            if log.completed { break }
            n += 1
        }
        return n
    }

    /// 최근 두 번 연달아 놓친 미션.
    private func missedTwiceInARow(_ history: [MissionLog]) -> Set<String> {
        Set(Dictionary(grouping: history, by: \.missionId).filter { _, logs in
            let last2 = logs.stableSortedDescending(by: { $0.date }).prefix(2)
            return last2.count == 2 && !last2.contains(where: \.completed)
        }.keys)
    }
}

/// 레벨은 일요일 주간 리포트에서만 바꿉니다 (기획서 14번 "난이도 레벨").
public enum MissionProgress {
    public enum LevelChange: String, Sendable, Codable { case suggestUp = "SUGGEST_UP", down = "DOWN", stay = "STAY" }

    /// [daily]는 최근 14일 완료 여부, 오래된 날부터. [metricImproved]는 이 목표와 연결된 지표가 좋아졌는지.
    public static func weeklyLevel(_ level: Int, _ daily: [Bool], _ metricImproved: Bool) -> LevelChange {
        let last7 = daily.suffix(7).filter { $0 }.count
        let last14 = daily.suffix(14).filter { $0 }.count
        switch level {
        case 1: return last7 >= 5 ? .suggestUp : .stay
        case 2:
            if last7 <= 3 { return .down }
            if last14 >= 10 && metricImproved { return .suggestUp }
            return .stay
        default: return last7 <= 3 ? .down : .stay
        }
    }

    public static func levelMessage(_ change: LevelChange) -> String? {
        switch change {
        case .suggestUp: "다음 주부터 조금 더 도전해 볼까요?"
        case .down: "이번 주는 가벼운 미션으로 리듬을 되찾아요"
        case .stay: nil
        }
    }

    /// 연속 일수가 아니라 한 주에 5일 이상 완료하면 주간 배지.
    public static func weeklyBadge(_ weekCompletions: [Bool]) -> Bool { weekCompletions.filter { $0 }.count >= 5 }

    /// 7일 연속 놓치면 목표를 바꿀지 묻는 카드를 홈에 띄웁니다.
    public static func suggestGoalChange(_ daily: [Bool]) -> Bool { daily.count >= 7 && !daily.suffix(7).contains(true) }
}
