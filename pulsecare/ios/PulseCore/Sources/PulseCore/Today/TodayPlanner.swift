import Foundation

/// 홈 화면 한 장 (기획서 16번: 점수 → 미션 → 알림 순서).
public struct HomeState: Hashable, Sendable {
    public var date: LocalDate
    /// 가입일 = 1일차.
    public var dayIndex: Int
    public var score: ScoreResult
    public var mission: Mission
    public var missionDone: Bool
    /// 워치 기록으로 본 미션 상태. manual이면 직접 체크.
    public var missionCheck: Check = .manual
    public var canSwap: Bool
    /// 본인에게 보여줄 알림 카드. 오늘 감지된 신호만.
    public var alerts: [AlertMessage]
    /// [alerts]의 원래 신호 (알림 발송 규칙에 씁니다).
    public var alertDetections: [Detection] = []
    /// 수면 외 권한 일부가 꺼져 있음 (SYS-03).
    public var missingPermissions = false

    public init(date: LocalDate, dayIndex: Int, score: ScoreResult, mission: Mission, missionDone: Bool, missionCheck: Check = .manual,
                canSwap: Bool, alerts: [AlertMessage], alertDetections: [Detection] = [], missingPermissions: Bool = false) {
        self.date = date
        self.dayIndex = dayIndex
        self.score = score
        self.mission = mission
        self.missionDone = missionDone
        self.missionCheck = missionCheck
        self.canSwap = canSwap
        self.alerts = alerts
        self.alertDetections = alertDetections
        self.missingPermissions = missingPermissions
    }

    /// 첫 7일은 기준선 학습 중 (SYS-01).
    public var learning: Bool { dayIndex <= 7 }

    /// 워치로 보낼 오늘 요약.
    public var watchToday: WatchToday {
        WatchToday(date: date, score: score.score, band: score.band, reason: score.reason, missionId: mission.id,
                   missionTitle: mission.title, missionDone: missionDone, learningDay: learning ? dayIndex : nil)
    }
}

/// 저장할 것: 오늘 점수와 오늘 미션, 어제까지 미션 기록.
public struct Plan: Hashable, Sendable {
    public var home: HomeState
    public var today: TodayMission
    public var logs: [MissionLog]
    public var scores: [LocalDate: Int]
}

/// 하루 계획을 만듭니다. 화면과 저장소에서 분리해 기기 없이 테스트합니다.
/// 같은 날 다시 열면 같은 점수와 같은 미션이 나옵니다. 안드로이드 TodayPlanner와 같은 규칙입니다.
public final class TodayPlanner {
    /// 자가 입력 1~5를 미션 고르기용 점수 구간으로: 1·2는 컨디션 낮은 날, 3은 한 레벨 낮춤.
    public static let feelingToScore: [Int: Int] = [1: 20, 2: 40, 3: 60, 4: 75, 5: 90]

    private let picker: MissionPicker

    public init(picker: MissionPicker = MissionPicker()) { self.picker = picker }

    /// [records]는 기상일 기준 최근 29일 이상 (오늘 포함). [feeling]은 워치 기록이 없는 날의 자가 입력 1~5.
    public func plan(
        today: LocalDate,
        records: [DailyRecord],
        profile: Profile,
        stored: TodayMission?,
        logs: [MissionLog],
        scores: [LocalDate: Int],
        feeling: Int? = nil,
        missingPermissions: Bool = false,
        activities: [LocalDate: DayActivity] = [:],
        now: LocalDateTime? = nil,
        retryMissionId: String? = nil
    ) -> Plan {
        let now = now ?? today.atTime(12, 0)
        let dayIndex = Swift.max(LocalDate.daysBetween(profile.signupDate, today) + 1, 1)
        let withScores = records.map { $0.with(score: scores[$0.date]) }
        let todayRecord = withScores.first { $0.date == today } ?? DailyRecord(date: today, sleep: nil)
        let history = withScores.filter { $0.date < today }

        let signals = DailySignals.evaluate(withScores.filter { $0.date <= today }, dayIndex: dayIndex)
        let caution = signals.contains { $0.signal.grade == .caution }
        let score = ConditionScoreEngine.score(today: todayRecord, history: history, context: ScoreContext(dayIndex: dayIndex, cautionSignalActive: caution))

        // 어제까지의 오늘 미션을 기록으로 옮깁니다. 직접 체크하지 않았어도 워치 기록(어젯밤 취침 포함)으로 완료를 확인합니다.
        var allLogs = logs
        if let stored, stored.date < today, !logs.contains(where: { $0.date == stored.date }) {
            let verified = check(stored.missionId, activities[stored.date], now) == .done
            allLogs.append(MissionLog(date: stored.date, missionId: stored.missionId, completed: stored.completed || verified,
                                      auto: stored.auto || (!stored.completed && verified)))
        }

        var picked: TodayMission
        if let stored, stored.date == today {
            picked = stored
        } else if let retry = retryMissionId, MissionLibrary.find(retry) != nil, retryFits(retry, score, feeling) {
            picked = TodayMission(date: today, missionId: retry)
        } else {
            picked = TodayMission(date: today, missionId: picker.pick(pickInput(today, score, feeling, profile, allLogs)).id)
        }
        let missionCheck = check(picked.missionId, activities[today], now)
        if missionCheck == .done && !picked.completed {
            picked.completed = true
            picked.auto = true
        }

        var newScores = scores
        if let s = score.score { newScores[today] = s }
        return Plan(
            home: HomeState(
                date: today,
                dayIndex: dayIndex,
                score: score,
                mission: MissionLibrary[picked.missionId],
                missionDone: picked.completed,
                missionCheck: missionCheck,
                canSwap: !picked.swapped && !picked.completed,
                alerts: signals.map(AlertText.forSelf),
                alertDetections: signals,
                missingPermissions: missingPermissions
            ),
            today: picked,
            logs: allLogs.filter { $0.date < today },
            scores: newScores
        )
    }

    /// 컨디션이 낮은 날(50 미만)에는 어제 미션 대신 회복 미션을 줍니다.
    private func retryFits(_ missionId: String, _ score: ScoreResult, _ feeling: Int?) -> Bool {
        guard let s = score.score ?? feeling.flatMap({ Self.feelingToScore[$0] }) else { return true }
        return s >= 50 || MissionLibrary[missionId].goal == .lowDay
    }

    private func check(_ missionId: String, _ activity: DayActivity?, _ now: LocalDateTime) -> Check {
        guard let activity else { return .manual }
        return MissionVerifier.check(missionId, activity, now: now)
    }

    /// "다른 미션": 하루 1번, 지금 미션을 빼고 다음 후보로.
    public func swap(_ home: HomeState, _ today: TodayMission, profile: Profile, logs: [MissionLog]) -> TodayMission {
        if today.swapped || today.completed { return today }
        var input = pickInput(home.date, home.score, nil, profile, logs)
        input.exclude = [today.missionId]
        var next = today
        next.missionId = picker.pick(input).id
        next.swapped = true
        return next
    }

    private func pickInput(_ today: LocalDate, _ score: ScoreResult, _ feeling: Int?, _ profile: Profile, _ logs: [MissionLog]) -> PickInput {
        PickInput(
            date: today,
            score: score.score ?? feeling.flatMap { Self.feelingToScore[$0] },
            reasonMetric: score.reasonMetric,
            goal: profile.goal,
            level: profile.level,
            history: logs,
            seniorMode: profile.seniorMode
        )
    }
}

/// 아침 리포트 알림 문구 (기획서 12번: 정보 알림은 아침 리포트에 모아서).
/// 잠금화면에는 점수·이유 없이 [publicText]만 보이고, 잠금을 풀면 전체가 보입니다.
public enum MorningReport {
    public struct Text: Hashable, Sendable {
        public var title: String
        public var body: String
    }

    public static let publicText = "오늘의 컨디션이 준비됐어요"
    public static let guardianPublic = "오늘의 보호자 미션이 있어요"
    public static let cautionPublic = AlertText.lockScreen(.caution)

    public static func of(_ home: HomeState) -> Text {
        let s = home.score
        let mission = "오늘의 미션: \(home.mission.title)"
        switch s.kind {
        case .noData: return Text(title: "어젯밤 기록이 없어요", body: "오늘 컨디션을 알려주시면 맞는 미션을 골라 드려요")
        case .sleepOnly: return Text(title: "수면 점수 \(KotlinFormat.str(s.score))점", body: "\(s.reason)\n\(mission)")
        case .full: return Text(title: "오늘 컨디션 \(KotlinFormat.str(s.score))점 · \(s.band?.label ?? "")", body: "\(s.reason)\n\(mission)")
        }
    }

    /// 아침 리포트에 함께 싣는 정보 등급 알림.
    public static func infoLines(_ home: HomeState, _ infoBodies: [String]) -> String {
        ([of(home).body] + infoBodies).joined(separator: "\n")
    }

    /// 보호자 전용 아침 알림. [parents]는 (이름, 점수 줄 또는 nil = 아직 기록 없음).
    public static func guardian(mission: String, parents: [(String, String?)]) -> Text {
        let lines = parents.map { "\($0.0): \($0.1 ?? "아직 오늘 기록이 없어요")" }
        return Text(title: "오늘의 보호자 미션", body: ([mission] + lines).joined(separator: "\n"))
    }
}
