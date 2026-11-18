import Foundation

enum Stats {
    static func median(_ values: [Double]) -> Double {
        precondition(!values.isEmpty)
        let sorted = values.sorted()
        let mid = sorted.count / 2
        return sorted.count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    /// 중앙값 절대 편차.
    static func mad(_ values: [Double], median m: Double? = nil) -> Double {
        let center = m ?? median(values)
        return median(values.map { Swift.abs($0 - center) })
    }

    static func standardDeviation(_ values: [Double]) -> Double {
        let mean = values.average
        var sum = 0.0
        for v in values { sum += (v - mean) * (v - mean) }
        return (sum / Double(values.count)).squareRoot()
    }

    /// 생체 신호의 기준선 대비 점수. z = 0 → 70, +1 → 89, −1 → 41, −2 → 18.
    static func logisticScore(_ directedZ: Double) -> Double { 100.0 / (1.0 + exp(-(1.2 * directedZ + 0.85))) }

    /// 구간표 선형 보간. 범위 밖은 양 끝 점수를 그대로 씁니다.
    static func interpolate(_ x: Double, _ points: [(Double, Double)]) -> Double {
        if x <= points.first!.0 { return points.first!.1 }
        if x >= points.last!.0 { return points.last!.1 }
        for i in 1..<points.count {
            let (x1, y1) = points[i]
            if x <= x1 {
                let (x0, y0) = points[i - 1]
                return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
            }
        }
        return points.last!.1
    }
}

/// 이유 문장에 넣을 숫자.
struct ReasonDetails {
    var sleepNeedMinutes: Double
    /// 오늘 안정시 심박 − 기준선 중앙값, bpm.
    var restingHrDelta: Double? = nil
    var loadRatio: Double? = nil
}

/// 컨디션 점수 (기획서 13번). 기준선 → 하위 점수 → 가중합 → 상한 보정 순서로 계산하고,
/// 가장 크게 영향을 준 요인으로 이유 한 줄을 고릅니다. 같은 입력이면 항상 같은 결과가 나옵니다.
public enum ConditionScoreEngine {
    public static let baselineDays = 28
    private static let minBaselineValues = 3
    private static let minSleepNeedMinutes = 7 * 60
    private static let maxNapMinutes = 60
    private static let shortSleepMinutes = 4 * 60
    private static let learningBadgeLastDay = 7
    private static let sleepOnlyLastDay = 3
    private static let relearnDays = 14
    private static let jetLagDays = 3

    /// MAD를 표준편차 척도로 바꾸는 상수.
    private static let madScale = 1.4826
    private static let zLimit = 4.0

    // 수면 시간: 필요량을 채우면 70, 필요량보다 더 자면 회복으로 보고 120%에서 100.
    private static let sleepDurationPoints: [(Double, Double)] = [(0.60, 10), (0.70, 25), (0.85, 45), (1.00, 70), (1.10, 85), (1.20, 100)]
    // 기준선이 없는 가입 1~3일차 수면 점수에만 쓰는 절대 구간표 (효율 85%가 70점).
    private static let sleepEfficiencyPoints: [(Double, Double)] = [(0.70, 10), (0.78, 40), (0.85, 70), (0.90, 100)]
    // 활동 부하: 7일/28일이 0.8~1.3이면 평소대로 70. 부하는 위험 요인이라 70을 넘지 않습니다.
    private static let loadPoints: [(Double, Double)] = [(0.6, 60), (0.8, 70), (1.3, 70), (1.5, 55), (1.8, 30), (2.0, 10)]

    private static let efficiencyMadFloor = 0.01
    private static let regularityMadFloorMinutes = 5.0

    public static func score(today: DailyRecord, history: [DailyRecord], context: ScoreContext) -> ScoreResult {
        guard let sleep = today.sleep else {
            return ScoreResult(kind: .noData, score: nil, band: nil, reason: "어젯밤 기록이 없어요. 오늘 컨디션은 어떤가요?")
        }
        let window = history
            .filter { $0.date < today.date && LocalDate.daysBetween($0.date, today.date) <= baselineDays }
            .stableSorted { $0.date }
        return context.dayIndex <= sleepOnlyLastDay
            ? sleepOnly(today, sleep, context)
            : full(today, sleep, window, context)
    }

    private static func sleepOnly(_ today: DailyRecord, _ sleep: SleepSummary, _ context: ScoreContext) -> ScoreResult {
        var sub = [Metric: Double]()
        sub[.sleepDuration] = sleepDurationScore(sleep, Double(minSleepNeedMinutes))
        if let e = sleep.efficiency { sub[.sleepQuality] = Stats.interpolate(e, sleepEfficiencyPoints) }
        let details = ReasonDetails(sleepNeedMinutes: Double(minSleepNeedMinutes))
        return finish(today, sleep, sub, details, context, .sleepOnly, [.learning])
    }

    private static func full(_ today: DailyRecord, _ sleep: SleepSummary, _ window: [DailyRecord], _ context: ScoreContext) -> ScoreResult {
        // 아픔·음주·야근 태그가 있는 날은 기준선에서 뺍니다.
        let clean = window.filter { $0.tags.isEmpty }
        let relearning = context.daysSinceDeviceChange.map { $0 < relearnDays } == true
        let jetLag = context.daysSinceTimezoneChange.map { $0 < jetLagDays } == true
        // 기기를 바꾸면 회복 지표는 바꾼 뒤 기록만으로 다시 배웁니다.
        let recoveryBaseline = relearning
            ? clean.filter { LocalDate.daysBetween($0.date, today.date) < context.daysSinceDeviceChange! }
            : clean

        let sleepNeed = sleepNeedMinutes(window)
        var sub = [Metric: Double]()
        sub[.sleepDuration] = sleepDurationScore(sleep, sleepNeed)
        if let s = sleepQualityScore(sleep, clean) { sub[.sleepQuality] = s }
        if !jetLag, let s = regularityScore(today, window, clean) { sub[.regularity] = s }
        if let s = physioScore(today.hrvMs, recoveryBaseline.compactMap(\.hrvMs), +1, context, .hrv) { sub[.hrv] = s }
        if let s = physioScore(today.restingHr, recoveryBaseline.compactMap(\.restingHr), -1, context, .restingHr) { sub[.restingHr] = s }
        if let s = loadScore(window) { sub[.activityLoad] = s }
        if let s = physioScore(today.skinTempC, clean.compactMap(\.skinTempC), 0, context, .skinTemp) { sub[.skinTemp] = s }
        if let s = physioScore(today.respiratoryRate, clean.compactMap(\.respiratoryRate), 0, context, .respiratoryRate) { sub[.respiratoryRate] = s }

        var badges = Set<Badge>()
        if context.dayIndex <= learningBadgeLastDay { badges.insert(.learning) }
        if today.hrvMs == nil { badges.insert(.estimated) }
        if relearning { badges.insert(.relearning) }
        if jetLag { badges.insert(.jetLag) }

        let rhrHistory = recoveryBaseline.compactMap(\.restingHr)
        let delta: Double? = today.restingHr.flatMap { rhrHistory.count >= minBaselineValues ? $0 - Stats.median(rhrHistory) : nil }
        let details = ReasonDetails(sleepNeedMinutes: sleepNeed, restingHrDelta: delta, loadRatio: loadRatio(window))
        return finish(today, sleep, sub, details, context, .full, badges)
    }

    private static func finish(
        _ today: DailyRecord,
        _ sleep: SleepSummary,
        _ sub: [Metric: Double],
        _ details: ReasonDetails,
        _ context: ScoreContext,
        _ kind: ScoreResult.Kind,
        _ badges: Set<Badge>
    ) -> ScoreResult {
        // 안드로이드와 같은 순서로 더해야 소수 끝자리까지 같습니다.
        let present = Metric.allCases.filter { sub[$0] != nil }
        var totalWeight = 0.0
        for m in present { totalWeight += m.weight }
        var weightedSum = 0.0
        for m in present { weightedSum += m.weight * sub[m]! }
        let weighted = weightedSum / totalWeight

        var caps = [Cap]()
        if sleep.mainSleepMinutes < shortSleepMinutes { caps.append(.shortSleep) }
        if today.tags.contains(.sick) { caps.append(.sick) }
        if context.cautionSignalActive { caps.append(.cautionSignal) }
        if kind == .full && sub[.hrv] == nil && sub[.restingHr] == nil { caps.append(.noRecoveryData) }
        let binding = caps.min { $0.max < $1.max }.flatMap { weighted > Double($0.max) ? $0 : nil }
        let score = Swift.min(Swift.max(Swift.min(weighted, Double(binding?.max ?? 100)).roundToInt, 0), 100)

        let reason = ReasonText.pick(score: score, sub: sub, cap: binding, today: today, sleep: sleep, details: details)
        return ScoreResult(
            kind: kind,
            score: score,
            band: Band.of(score),
            reason: reason.text,
            badges: badges,
            subScores: sub,
            cap: binding,
            reasonMetric: reason.metric
        )
    }

    // MARK: 수면

    /// 낮잠은 최대 1시간까지 수면 시간에 더합니다.
    public static func totalSleepMinutes(_ sleep: SleepSummary) -> Int {
        sleep.mainSleepMinutes + Swift.min(sleep.napMinutes, maxNapMinutes)
    }

    /// 최근 28일 중 컨디션이 좋았던 날(70점 이상)의 수면 중앙값. 7시간 아래로는 내리지 않습니다.
    public static func sleepNeedMinutes(_ window: [DailyRecord]) -> Double {
        let goodNights = window
            .filter { ($0.score ?? 0) >= 70 && $0.tags.isEmpty }
            .compactMap { $0.sleep.map { Double(totalSleepMinutes($0)) } }
        let need = goodNights.count >= minBaselineValues ? Stats.median(goodNights) : 0.0
        return Swift.max(need, Double(minSleepNeedMinutes))
    }

    private static func sleepDurationScore(_ sleep: SleepSummary, _ needMinutes: Double) -> Double {
        Stats.interpolate(Double(totalSleepMinutes(sleep)) / needMinutes, sleepDurationPoints)
    }

    /// 수면 효율을 내 기준선과 비교한 점수 (평소 = 70). 깊은 잠 비율이 기준선보다 낮으면 최대 10점을 뺍니다.
    private static func sleepQualityScore(_ sleep: SleepSummary, _ clean: [DailyRecord]) -> Double? {
        guard let efficiency = sleep.efficiency else { return nil }
        let history = clean.compactMap { $0.sleep?.efficiency }
        var s = history.count >= minBaselineValues
            ? Stats.logisticScore(robustZ(efficiency, history, efficiencyMadFloor))
            : Stats.interpolate(efficiency, sleepEfficiencyPoints)
        let deepHistory = clean.compactMap { $0.sleep?.deepRatio }
        if let deep = sleep.deepRatio, deepHistory.count >= minBaselineValues {
            let z = robustZ(deep, deepHistory)
            if z < 0 { s -= Swift.min(10.0, -z * 5.0) }
        }
        return Swift.max(s, 0.0)
    }

    /// 최근 7일 취침 시각 표준편차를 지난 날들의 같은 값과 비교합니다 (평소 = 70).
    private static func regularityScore(_ today: DailyRecord, _ window: [DailyRecord], _ clean: [DailyRecord]) -> Double? {
        let all = window + [today]
        guard let todaySpread = bedtimeSpread(today, all) else { return nil }
        let history = clean.compactMap { bedtimeSpread($0, all) }
        if history.count < minBaselineValues { return nil }
        return Stats.logisticScore(-robustZ(todaySpread, history, regularityMadFloorMinutes))
    }

    /// [day]까지 7일간 취침 시각의 표준편차(분). 정오 기준으로 재서 자정을 넘나드는 취침도 연속으로 다룹니다.
    private static func bedtimeSpread(_ day: DailyRecord, _ records: [DailyRecord]) -> Double? {
        let bedtimes = records
            .filter { $0.date <= day.date && LocalDate.daysBetween($0.date, day.date) < 7 }
            .compactMap { $0.sleep?.bedtime }
            .map { Double((($0.hour * 60 + $0.minute) - 12 * 60 + 24 * 60) % (24 * 60)) }
        if bedtimes.count < 4 { return nil }
        return Stats.standardDeviation(bedtimes)
    }

    // MARK: 활동 부하

    /// 최근 7일 평균 ÷ 28일 평균. 28일 중 14일 이상 기록이 있어야 계산합니다.
    public static func loadRatio(_ window: [DailyRecord]) -> Double? {
        let loads = window.compactMap { r in r.activityLoad.map { (r.date, $0) } }
        if loads.count < 14 { return nil }
        let chronic = loads.map(\.1).average
        if chronic <= 0 { return nil }
        let last = window.map(\.date).max()!
        let acute = loads.filter { LocalDate.daysBetween($0.0, last) < 7 }.map(\.1)
        if acute.isEmpty { return nil }
        return acute.average / chronic
    }

    private static func loadScore(_ window: [DailyRecord]) -> Double? {
        loadRatio(window).map { Stats.interpolate($0, loadPoints) }
    }

    // MARK: 생체 신호

    /// [direction] +1: 높을수록 좋음 (HRV), −1: 낮을수록 좋음 (안정시 심박), 0: 어느 쪽이든 벗어나면 나쁨.
    private static func physioScore(_ value: Double?, _ history: [Double], _ direction: Int, _ context: ScoreContext, _ metric: Metric) -> Double? {
        guard let value, let b = baseline(history, metric, context) else { return nil }
        let z = clamp((value - b.median) / (madScale * b.mad), -zLimit, zLimit)
        let directed = direction == 0 ? -Swift.abs(z) : Double(direction) * z
        return Stats.logisticScore(directed)
    }

    /// (중앙값, MAD). 가입 28일 전에는 표준값이 있으면 개인 비중을 날짜만큼(4/28 → 28/28) 늘려 섞습니다.
    private static func baseline(_ history: [Double], _ metric: Metric, _ context: ScoreContext) -> (median: Double, mad: Double)? {
        let norm: (median: Double, mad: Double)? = context.norms.flatMap { n in
            switch metric {
            case .hrv: (n.hrvMedian, n.hrvMad)
            case .restingHr: (n.restingHrMedian, n.restingHrMad)
            default: nil
            }
        }
        var personal: (median: Double, mad: Double)?
        if history.count >= minBaselineValues {
            let m = Stats.median(history)
            personal = (m, madFloor(Stats.mad(history, median: m), m))
        }
        guard let norm, context.dayIndex < baselineDays else { return personal }
        guard let personal else { return norm }
        let w = Double(clamp(context.dayIndex, 4, baselineDays)) / Double(baselineDays)
        return (w * personal.median + (1 - w) * norm.median, w * personal.mad + (1 - w) * norm.mad)
    }

    /// 매일 값이 같으면 MAD가 0이 됩니다. 중앙값의 2%를 하한으로 둡니다.
    private static func madFloor(_ mad: Double, _ median: Double) -> Double { Swift.max(mad, Swift.max(Swift.abs(median) * 0.02, 1e-6)) }

    private static func robustZ(_ value: Double, _ history: [Double], _ absoluteFloor: Double = 0.0) -> Double {
        let m = Stats.median(history)
        let mad = Swift.max(madFloor(Stats.mad(history, median: m), m), absoluteFloor)
        return clamp((value - m) / (madScale * mad), -zLimit, zLimit)
    }
}

func clamp<T: Comparable>(_ v: T, _ lo: T, _ hi: T) -> T { Swift.min(Swift.max(v, lo), hi) }
