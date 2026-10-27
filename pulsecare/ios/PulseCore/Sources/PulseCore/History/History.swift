import Foundation

public enum Period: String, CaseIterable, Sendable, Codable {
    case week = "WEEK"
    case month = "MONTH"

    public var days: Int { self == .week ? 7 : 30 }
    public var label: String { self == .week ? "주간" : "월간" }
    public var previous: String { self == .week ? "지난주" : "지난달" }
    public var previousWith: String { self == .week ? "지난주와" : "지난달과" }
}

/// 기록 탭의 하루. [dayIndex]는 가입일 = 1, 가입 전은 0 이하 (점수 없이 수면·회복만).
public struct HistoryDay: Hashable, Sendable {
    public var date: LocalDate
    public var dayIndex: Int
    public var score: Int?
    public var band: Band?
    public var reason: String?
    public var subScores: [Metric: Double] = [:]
    /// 기준선 학습 중 (1~7일째).
    public var learning = false
    /// HRV가 없어 다른 지표로 추정한 점수.
    public var estimated = false
    /// 본 수면 + 낮잠(최대 1시간).
    public var sleepMinutes: Int?
    public var bedtime: LocalTime?
    public var hrvMs: Double?
    public var restingHr: Double?
    public var mission: MissionLog?
}

/// 내 평소 범위: 최근 28일 중앙값 ± 1σ(1.4826·MAD).
public struct UsualRange: Hashable, Sendable {
    public var low: Double
    public var mid: Double
    public var high: Double

    public func contains(_ v: Double) -> Bool { v >= low && v <= high }
}

public struct History: Hashable, Sendable {
    public var period: Period
    public var days: [HistoryDay]
    public var averageScore: Int?
    public var previousAverage: Int?
    public var averageSleepMinutes: Int?
    public var sleep: UsualRange?
    public var hrv: UsualRange?
    public var restingHr: UsualRange?
    public var usualBedtime: LocalTime?
    public var periodBedtime: LocalTime?
    public var missionsDone: Int
    public var missionsAuto: Int
    /// 기간 안에서 주간 배지를 받은 주의 마지막 날(일요일).
    public var weeklyBadges: [LocalDate]

    /// 기간 요약 몇 줄. 나빠진 것도 탓하지 않고 사실만 말합니다.
    public var lines: [String] {
        var out = [String]()
        if let avg = averageScore {
            if let prev = previousAverage {
                let diff = avg - prev
                if diff >= 2 {
                    out.append("평균 컨디션 \(avg)점 · \(period.previous)보다 \(diff)점 올랐어요")
                } else if diff <= -2 {
                    out.append("평균 컨디션 \(avg)점 · \(period.previous)보다 \(-diff)점 낮아요")
                } else {
                    out.append("평균 컨디션 \(avg)점 · \(period.previousWith) 비슷해요")
                }
            } else {
                out.append("평균 컨디션 \(avg)점")
            }
        }
        if let m = averageSleepMinutes { out.append("평균 수면 \(History.duration(m))") }
        if let bt = periodBedtime {
            let diff = usualBedtime.map { History.minutesBetween($0, bt) }
            if diff == nil || Swift.abs(diff!) < 15 {
                out.append("평균 취침 \(History.clock(bt))")
            } else if diff! > 0 {
                out.append("평균 취침 \(History.clock(bt)) · 평소보다 \(diff!)분 늦어요")
            } else {
                out.append("평균 취침 \(History.clock(bt)) · 평소보다 \(-diff!)분 일러요")
            }
        }
        out.append("미션 \(missionsDone)일 완료" + (missionsAuto > 0 ? " (워치로 확인 \(missionsAuto)일)" : ""))
        return out
    }

    public static func duration(_ minutes: Int) -> String { "\(minutes / 60)시간 \(minutes % 60)분" }
    public static func clock(_ t: LocalTime) -> String { String(format: "%02d:%02d", t.hour, t.minute) }

    /// [from]에서 [to]까지 몇 분 늦은지 (자정을 넘는 취침 시각도 가깝게, −720~720).
    public static func minutesBetween(_ from: LocalTime, _ to: LocalTime) -> Int {
        let d = (to.secondOfDay - from.secondOfDay) / 60
        return ((d + 720 + 1440) % 1440) - 720
    }
}

/// 기록 탭 (기획서 16번): 주간·월간 점수, 수면, 회복 추이와 미션 달력.
/// 건강 수치는 저장하지 않으므로 HealthKit에서 읽은 [records]로 그때그때 만듭니다.
public enum HistoryBuilder {
    private static let minRangeValues = 7

    /// 지난 기간과 비교하고 기준선 28일을 채우려면 [to]에서 이만큼 앞부터 읽어야 합니다.
    public static func readDays(_ period: Period) -> Int { period.days * 2 + ConditionScoreEngine.baselineDays }

    public static func build(
        period: Period,
        to: LocalDate,
        records: [DailyRecord],
        signupDate: LocalDate,
        storedScores: [LocalDate: Int],
        logs: [MissionLog]
    ) -> History {
        let from = to.minusDays(period.days - 1)
        let previousFrom = from.minusDays(period.days)
        let withScores = records.map { $0.with(score: storedScores[$0.date]) }.stableSorted { $0.date }
        let byDate = withScores.associateBy(\.date)
        let logByDate = logs.associateBy(\.date)

        func day(_ date: LocalDate) -> HistoryDay {
            let dayIndex = LocalDate.daysBetween(signupDate, date) + 1
            let record = byDate[date] ?? DailyRecord(date: date, sleep: nil)
            var base = HistoryDay(
                date: date,
                dayIndex: dayIndex,
                score: nil,
                band: nil,
                reason: nil,
                sleepMinutes: record.sleep.map { $0.mainSleepMinutes + Swift.min($0.napMinutes, 60) },
                bedtime: record.sleep?.bedtime,
                hrvMs: record.hrvMs,
                restingHr: record.restingHr,
                mission: logByDate[date]
            )
            if dayIndex < 1 { return base }
            let result = ConditionScoreEngine.score(today: record, history: withScores.filter { $0.date < date }, context: ScoreContext(dayIndex: dayIndex))
            let score = storedScores[date] ?? result.score
            base.score = score
            base.band = score.map(Band.of)
            base.reason = result.kind != .noData ? result.reason : nil
            base.subScores = result.subScores
            base.learning = dayIndex <= 7
            base.estimated = result.badges.contains(.estimated)
            return base
        }

        let days = dates(from, to).map(day)
        let previous = dates(previousFrom, from.minusDays(1)).map(day)

        let recent = withScores.filter { (0..<ConditionScoreEngine.baselineDays).contains(LocalDate.daysBetween($0.date, to)) }
        let bedtimes = days.compactMap(\.bedtime)
        let usualBedtimes = recent.compactMap { $0.sleep?.bedtime }

        return History(
            period: period,
            days: days,
            averageScore: averageOrNil(days.compactMap(\.score)),
            previousAverage: averageOrNil(previous.compactMap(\.score)),
            averageSleepMinutes: averageOrNil(days.compactMap(\.sleepMinutes)),
            sleep: range(recent.compactMap { r in r.sleep.map { Double($0.mainSleepMinutes) + Double(Swift.min($0.napMinutes, 60)) } }, floor: 20),
            hrv: range(recent.compactMap(\.hrvMs), floor: 2),
            restingHr: range(recent.compactMap(\.restingHr), floor: 1),
            usualBedtime: usualBedtimes.count >= minRangeValues ? MissionVerifier.median(usualBedtimes) : nil,
            periodBedtime: bedtimes.isEmpty ? nil : MissionVerifier.median(bedtimes),
            missionsDone: days.filter { $0.mission?.completed == true }.count,
            missionsAuto: days.filter { $0.mission.map { $0.completed && $0.auto } == true }.count,
            weeklyBadges: dates(from, to).filter { $0.dayOfWeek == .sunday }.filter { sunday in
                MissionProgress.weeklyBadge((0...6).reversed().map { logByDate[sunday.minusDays($0)]?.completed == true })
            }
        )
    }

    private static func dates(_ from: LocalDate, _ to: LocalDate) -> [LocalDate] {
        from <= to ? (0...LocalDate.daysBetween(from, to)).map { from.plusDays($0) } : []
    }

    private static func averageOrNil(_ values: [Int]) -> Int? {
        values.isEmpty ? nil : values.map(Double.init).average.roundToInt
    }

    /// 값이 7개 이상일 때만. 편차가 아주 작은 사람도 띠가 보이도록 반폭 하한 [floor].
    private static func range(_ values: [Double], floor: Double) -> UsualRange? {
        if values.count < minRangeValues { return nil }
        let median = Stats.median(values)
        let half = Swift.max(1.4826 * Stats.median(values.map { Swift.abs($0 - median) }), floor)
        return UsualRange(low: median - half, mid: median, high: median + half)
    }
}
