import Foundation

/// 저녁 21:00 요약 (기획서 12번 "묶음 발송", 14번 "놓친 날 처리").
/// 미션을 끝냈고 전할 정보도 없으면 보내지 않습니다.
public enum EveningSummary {
    public struct Text: Hashable, Sendable {
        public var title: String
        public var body: String
        public var askRetry: Bool

        public init(title: String, body: String, askRetry: Bool) {
            self.title = title
            self.body = body
            self.askRetry = askRetry
        }
    }

    public static let retry = "내일 다시"
    public static let other = "다른 미션으로"

    public static func of(_ mission: Mission, done: Bool, infoBodies: [String]) -> Text? {
        // 취침 미션은 오늘 밤에 하는 것이라 아직 "놓쳤다"고 묻지 않습니다.
        let tonight = MissionVerifier.nightMissions.contains(mission.id)
        if !done && tonight {
            return Text(title: "오늘 밤 미션을 잊지 마세요",
                        body: (["\(mission.title). 내일 아침 수면 기록으로 확인해요"] + infoBodies).joined(separator: "\n"),
                        askRetry: false)
        }
        if !done {
            return Text(title: "오늘 미션, 내일 다시 해볼까요?",
                        body: (["\"\(mission.title)\"를 오늘은 못 했어요. 괜찮아요, 내일 다시 하거나 다른 미션을 받을 수 있어요"] + infoBodies)
                            .joined(separator: "\n"),
                        askRetry: true)
        }
        if !infoBodies.isEmpty {
            return Text(title: "오늘 저녁 요약", body: (["오늘 미션을 완료했어요"] + infoBodies).joined(separator: "\n"), askRetry: false)
        }
        return nil
    }
}

public struct WeeklySummary: Hashable, Sendable {
    /// 이번 주 마지막 날 (일요일).
    public var weekEnd: LocalDate
    public var goal: Goal
    /// 이번 주 미션을 완료한 날 수 (0~7).
    public var daysDone: Int
    /// 한 주 5일 이상 완료하면 주간 배지.
    public var badge: Bool
    public var points: Int
    public var levelChange: MissionProgress.LevelChange
    /// 레벨을 올릴 때 다음 레벨 (사용자가 수락해야 적용).
    public var nextLevel: Int
    /// 같은 목표 4주 이상이면 실제 변화 한 줄.
    public var change: String?
    /// 7일 연속 놓쳤으면 목표를 바꿀지 묻습니다.
    public var suggestGoalChange: Bool

    public var title: String { badge ? "이번 주 \(daysDone)일 완료 · 주간 배지" : "이번 주 \(daysDone)일 완료" }

    /// 리포트 본문. 놓친 주에도 탓하지 않습니다.
    public var lines: [String] {
        [
            change,
            "이번 주 포인트 \(points)점",
            MissionProgress.levelMessage(levelChange),
            suggestGoalChange ? "일주일 동안 미션이 잘 맞지 않았어요. 목표를 바꿔 볼까요?" : nil,
        ].compactMap { $0 }
    }
}

/// 일요일 저녁 주간 리포트. 레벨은 여기서만 바꿔 매일 흔들리지 않게 합니다.
public enum WeeklyReport {
    private static let changeReportDays = 28

    public static func build(
        weekEnd: LocalDate,
        goal: Goal,
        level: Int,
        goalSince: LocalDate,
        logs: [MissionLog],
        records: [DailyRecord]
    ) -> WeeklySummary {
        let last14 = (0...13).reversed().map { ago in logs.contains { $0.date == weekEnd.minusDays(ago) && $0.completed } }
        let thisWeek = logs.filter { (0...6).contains(LocalDate.daysBetween($0.date, weekEnd)) && $0.completed }
        let daysDone = Set(thisWeek.map(\.date)).count

        let now = average(goal, records, weekEnd, 0)
        let lastWeek = average(goal, records, weekEnd, 7)
        let improved = now != nil && lastWeek != nil && better(goal, now!, lastWeek!)
        let change = MissionProgress.weeklyLevel(level, last14, improved)

        let heldFourWeeks = LocalDate.daysBetween(goalSince, weekEnd) >= changeReportDays
        let fourWeeksAgo = average(goal, records, weekEnd, changeReportDays)

        let nextLevel: Int
        switch change {
        case .suggestUp: nextLevel = Swift.min(level + 1, 3)
        case .down: nextLevel = Swift.max(level - 1, 1)
        case .stay: nextLevel = level
        }
        return WeeklySummary(
            weekEnd: weekEnd,
            goal: goal,
            daysDone: daysDone,
            badge: MissionProgress.weeklyBadge(Array(last14.suffix(7))),
            points: thisWeek.reduce(0) { $0 + MissionLibrary[$1.missionId].points },
            levelChange: change,
            nextLevel: nextLevel,
            change: heldFourWeeks && now != nil && fourWeeksAgo != nil ? changeLine(goal, now!, fourWeeksAgo!) : nil,
            suggestGoalChange: MissionProgress.suggestGoalChange(last14)
        )
    }

    /// 목표와 연결된 지표의 7일 평균. [offset]일 앞으로 당긴 7일. 4일 이상 기록이 있어야 계산합니다.
    static func average(_ goal: Goal, _ records: [DailyRecord], _ weekEnd: LocalDate, _ offset: Int) -> Double? {
        let end = weekEnd.minusDays(offset)
        let week = records.filter { (0...6).contains(LocalDate.daysBetween($0.date, end)) }
        let values: [Double]
        switch goal {
        case .sleep: values = week.compactMap { $0.sleep.map { Double(ConditionScoreEngine.totalSleepMinutes($0)) } }
        // 기록의 걸음은 전날 하루 값이라 하루 뒤 기록을 봅니다.
        case .weight: values = records.filter { (0...6).contains(LocalDate.daysBetween($0.date, end.plusDays(1))) }.compactMap { $0.steps.map(Double.init) }
        case .stress: values = week.compactMap(\.hrvMs)
        case .parent, .lowDay: values = []
        }
        return values.count >= 4 ? values.average : nil
    }

    private static func better(_ goal: Goal, _ now: Double, _ before: Double) -> Bool {
        switch goal {
        case .sleep: now - before >= 10 // 10분 이상
        case .weight: now - before >= 500 // 500보 이상
        case .stress: now - before >= 2 // 2ms 이상
        case .parent, .lowDay: false
        }
    }

    static func changeLine(_ goal: Goal, _ now: Double, _ before: Double) -> String? {
        let diff = now - before
        switch goal {
        case .sleep:
            let m = Swift.abs(diff).roundToInt
            if m < 5 { return "4주 전과 비슷하게 잘 자고 있어요" }
            return diff > 0 ? "4주 전보다 평균 수면이 \(m)분 늘었어요" : "4주 전보다 평균 수면이 \(m)분 줄었어요. 이번 주는 조금 일찍 누워 봐요"
        case .weight:
            let steps = (Swift.abs(diff) / 100).roundToInt * 100
            if steps < 300 { return "4주 전과 비슷하게 걷고 있어요" }
            return diff > 0
                ? "4주 전보다 하루 걸음이 평균 \(KotlinFormat.grouped(steps))보 늘었어요"
                : "4주 전보다 하루 걸음이 평균 \(KotlinFormat.grouped(steps))보 줄었어요"
        case .stress:
            let ms = Swift.abs(diff).roundToInt
            if ms < 2 { return "4주 전과 비슷하게 회복하고 있어요" }
            return diff > 0 ? "4주 전보다 HRV가 평균 \(ms)ms 높아졌어요. 회복이 좋아지고 있어요" : "4주 전보다 HRV가 평균 \(ms)ms 낮아졌어요. 쉬는 시간을 조금 늘려 봐요"
        case .parent, .lowDay:
            return nil
        }
    }
}

/// 한 항목의 요약: 평균, 범위, 측정한 날 수, 앞 절반 → 뒤 절반 평균.
public struct Stat: Hashable, Sendable {
    public var mean: Double?
    public var min: Double?
    public var max: Double?
    public var days: Int
    public var firstHalf: Double?
    public var secondHalf: Double?
}

public struct WeekRow: Hashable, Sendable {
    public var monday: LocalDate
    public var sleepMinutes: Double?
    public var restingHr: Double?
    public var hrv: Double?
    public var steps: Double?
}

public struct SignalDay: Hashable, Sendable {
    public var date: LocalDate
    public var detection: Detection
}

/// 진료용 건강 요약 (미션 P-08). 의사가 읽도록 점수보다 원래 수치를 먼저 둡니다.
/// 날짜는 기상일 기준이고, 걸음은 전날 하루 값이라 하루 당겨서 셉니다.
public struct ClinicSummary: Hashable, Sendable {
    public var from: LocalDate
    public var to: LocalDate
    public var days: Int
    public var sleep: Stat
    public var bedtime: LocalTime?
    /// 6시간 미만으로 잔 밤.
    public var shortNights: Int
    public var restingHr: Stat
    public var hrv: Stat
    public var steps: Stat
    public var respiratoryRate: Stat
    /// 산소포화도 90% 미만이 반복된 밤 / 측정한 밤.
    public var lowSpo2Nights: Int
    public var spo2Nights: Int
    public var signals: [SignalDay]
    public var missionDays: Int
    public var missionLogged: Int
    public var scoreMean: Int?
    public var weeks: [WeekRow]
    /// 차트용 날짜별 값 (from..to, 없으면 nil).
    public var dailySleep: [Double?]
    public var dailyRestingHr: [Double?]
    public var dailyHrv: [Double?]
    public var dailySteps: [Double?]
}

public enum ClinicReport {
    /// [records]는 [from] 이전 28일 이상을 포함해야 신호 판정이 맞습니다 (기준선).
    /// [scores]는 앱이 보여준 날짜별 점수, [dayIndexOf]는 날짜 → 가입 후 며칠째.
    public static func build(
        from: LocalDate,
        to: LocalDate,
        records: [DailyRecord],
        logs: [MissionLog],
        scores: [LocalDate: Int],
        dayIndexOf: (LocalDate) -> Int
    ) -> ClinicSummary {
        let dates = from <= to ? (0...LocalDate.daysBetween(from, to)).map { from.plusDays($0) } : []
        let byDate = records.associateBy(\.date)
        let inRange = dates.compactMap { byDate[$0] }

        let sleepByDate = dates.map { d in byDate[d]?.sleep.map { Double($0.mainSleepMinutes + Swift.min($0.napMinutes, 60)) } }
        let rhrByDate = dates.map { byDate[$0]?.restingHr }
        let hrvByDate = dates.map { byDate[$0]?.hrvMs }
        // 걸음은 다음 날 아침 기록에 들어 있으니 그날 걸음 = 다음 날 기록의 steps.
        let stepsByDate = dates.map { d in byDate[d.plusDays(1)]?.steps.map(Double.init) }
        let respByDate = dates.map { byDate[$0]?.respiratoryRate }

        // 수면 부족 판정의 필요량은 컨디션 좋았던 날의 수면이라, 앱이 보여준 점수를 붙여 판정합니다.
        let withScores = records.map { $0.with(score: scores[$0.date] ?? $0.score) }
        let signals = dates.flatMap { d in
            let history = withScores.filter { $0.date <= d && LocalDate.daysBetween($0.date, d) <= 35 }
            return DailySignals.evaluate(history, dayIndex: dayIndexOf(d)).map { SignalDay(date: d, detection: $0) }
        }
        // 같은 신호가 며칠 이어지면 첫날만 (다시 시작되면 다시).
        let firstDays = signals.filter { s in
            !signals.contains { $0.detection.signal == s.detection.signal && $0.date == s.date.minusDays(1) }
        }

        let logsInRange = logs.filter { $0.date >= from && $0.date <= to }
        let weekStarts = dates.map(\.monday).distinct { $0 }
        let bedtimes = inRange.compactMap { $0.sleep?.bedtime }
        let scoresInRange = scores.filter { $0.key >= from && $0.key <= to }.map { Double($0.value) }

        return ClinicSummary(
            from: from,
            to: to,
            days: dates.count,
            sleep: stat(sleepByDate),
            bedtime: bedtimes.isEmpty ? nil : MissionVerifier.median(bedtimes),
            shortNights: sleepByDate.filter { $0 != nil && $0! < 360 }.count,
            restingHr: stat(rhrByDate),
            hrv: stat(hrvByDate),
            steps: stat(stepsByDate),
            respiratoryRate: stat(respByDate),
            lowSpo2Nights: inRange.filter { $0.lowSpo2Repeated == true }.count,
            spo2Nights: inRange.filter { $0.lowSpo2Repeated != nil }.count,
            signals: firstDays,
            missionDays: Set(logsInRange.filter(\.completed).map(\.date)).count,
            missionLogged: Set(logsInRange.map(\.date)).count,
            scoreMean: scoresInRange.isEmpty ? nil : scoresInRange.average.roundToInt,
            weeks: weekStarts.map { monday in
                let idx = dates.indices.filter { dates[$0].monday == monday }
                return WeekRow(
                    monday: monday,
                    sleepMinutes: mean(idx.map { sleepByDate[$0] }),
                    restingHr: mean(idx.map { rhrByDate[$0] }),
                    hrv: mean(idx.map { hrvByDate[$0] }),
                    steps: mean(idx.map { stepsByDate[$0] })
                )
            },
            dailySleep: sleepByDate,
            dailyRestingHr: rhrByDate,
            dailyHrv: hrvByDate,
            dailySteps: stepsByDate
        )
    }

    /// 의사용 신호 이름 (병명 없이 관찰 사실로).
    public static func label(_ d: Detection) -> String {
        let usual = KotlinFormat.str(d.usual?.roundToInt)
        let current = KotlinFormat.str(d.current?.roundToInt)
        switch d.signal {
        case .restingHrRise: return "안정시 심박 상승 \(d.days ?? 3)일 연속 (평소 \(usual) → \(current) bpm)"
        case .activityDrop: return "걸음 수 감소 \(d.days ?? 3)일 연속 (평소 \(usual) → \(current) 걸음)"
        case .lowSpo2: return "수면 중 산소포화도 90% 미만 반복 (최근 7일 중 \(KotlinFormat.str(d.days))일)"
        case .sleepDebt: return "수면 부족 (평소 \(hours(d.usual)) → \(hours(d.current)))"
        case .stress: return "HRV 저하 \(d.days ?? 3)일 연속 (평소 \(usual) → \(current) ms)"
        default: return d.signal.rawValue
        }
    }

    public static func hours(_ minutes: Double?) -> String {
        guard let m = minutes?.roundToInt else { return "-" }
        return "\(m / 60)시간 \(m % 60)분"
    }

    private static func stat(_ values: [Double?]) -> Stat {
        let v = values.compactMap { $0 }
        let half = values.count / 2
        return Stat(
            mean: v.isEmpty ? nil : v.average,
            min: v.min(),
            max: v.max(),
            days: v.count,
            firstHalf: mean(Array(values.prefix(half))),
            secondHalf: mean(Array(values.dropFirst(half)))
        )
    }

    private static func mean(_ values: [Double?]) -> Double? {
        let v = values.compactMap { $0 }
        return v.isEmpty ? nil : v.average
    }
}
