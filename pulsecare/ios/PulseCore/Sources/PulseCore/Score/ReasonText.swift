import Foundation

struct Reason {
    var text: String
    var metric: Metric?
}

/// 이유 한 줄 고르기 (기획서 13번):
/// 1. 지표별 기여도 = w × (s − 70)
/// 2. 70점 이상이면 가장 큰 플러스 요인, 미만이면 가장 큰 마이너스 요인
/// 3. 상한 보정이 걸렸으면 그 이유가 먼저
/// 4. 음주·야근 태그가 있으면 문장 앞에 언급
enum ReasonText {
    static func pick(score: Int, sub: [Metric: Double], cap: Cap?, today: DailyRecord, sleep: SleepSummary, details: ReasonDetails) -> Reason {
        var base: Reason
        if let cap {
            base = Reason(text: capText(cap), metric: nil)
        } else {
            // 같은 값이면 앞 지표가 이기도록 지표 순서대로 봅니다.
            let contributions = Metric.allCases.compactMap { m in sub[m].map { (m, m.weight * ($0 - 70.0)) } }
            let chosen = score >= 70
                ? contributions.filter { $0.1 > 0 }.max { $0.1 < $1.1 }
                : contributions.filter { $0.1 < 0 }.min { $0.1 < $1.1 }
            if let chosen {
                base = Reason(text: metricText(chosen.0, chosen.1 > 0, sleep, details), metric: chosen.0)
            } else {
                base = Reason(text: "평소와 비슷한 컨디션이에요", metric: nil)
            }
        }
        if let prefix = tagPrefix(today.tags) { base.text = "\(prefix) \(base.text)" }
        return base
    }

    private static func tagPrefix(_ tags: Set<DayTag>) -> String? {
        if tags.contains(.alcohol) { return "어제 술을 마셨다고 기록하셨어요." }
        if tags.contains(.overtime) { return "어제 늦게까지 일했다고 기록하셨어요." }
        return nil // 아픔 태그는 상한 보정 문장이 직접 다룹니다.
    }

    private static func capText(_ cap: Cap) -> String {
        switch cap {
        case .shortSleep: "어젯밤 수면이 4시간이 안 됐어요. 오늘은 무리하지 마세요"
        case .sick: "몸이 안 좋다고 기록하셨어요. 오늘은 쉬어 가세요"
        case .cautionSignal: "며칠째 평소와 다른 신호가 있어요. 오늘은 무리하지 마세요"
        case .noRecoveryData: "심박 데이터가 없어 수면 위주로 계산했어요"
        }
    }

    private static func metricText(_ metric: Metric, _ positive: Bool, _ sleep: SleepSummary, _ d: ReasonDetails) -> String {
        switch metric {
        case .sleepDuration:
            if positive { return "어젯밤 필요한 만큼 충분히 잤어요" }
            let short = (d.sleepNeedMinutes - Double(ConditionScoreEngine.totalSleepMinutes(sleep))).roundToInt
            return "어젯밤 수면이 필요량보다 \(duration(short)) 짧았어요"
        case .sleepQuality:
            return positive ? "어젯밤 깊게 잘 잤어요" : "어젯밤 자주 깨서 잠의 질이 평소보다 낮았어요"
        case .regularity:
            return positive ? "요즘 일정한 시간에 잠들고 있어요" : "최근 일주일 잠드는 시간이 들쭉날쭉했어요"
        case .hrv:
            return positive ? "자율신경이 평소보다 잘 회복됐어요" : "자율신경 회복이 평소보다 더뎌요"
        case .restingHr:
            let bpm = d.restingHrDelta.map { Swift.abs($0).roundToInt }
            guard let bpm, bpm != 0 else { return positive ? "안정시 심박이 평소보다 낮아요" : "안정시 심박이 평소보다 높아요" }
            return positive ? "안정시 심박이 평소보다 \(bpm) bpm 낮아요" : "안정시 심박이 평소보다 \(bpm) bpm 높아요"
        case .activityLoad:
            if positive { return "최근 운동량이 몸에 알맞아요" }
            if let ratio = d.loadRatio, ratio > 1.0 {
                return "최근 일주일 운동량이 평소의 \(KotlinFormat.oneDecimal(ratio))배예요. 오늘은 쉬어 가세요"
            }
            return "최근 일주일 활동이 평소보다 많이 줄었어요"
        case .skinTemp:
            return positive ? "잘 때 체온이 평소처럼 안정적이었어요" : "잘 때 피부 온도가 평소와 달랐어요"
        case .respiratoryRate:
            return positive ? "잘 때 호흡이 평소처럼 안정적이었어요" : "잘 때 호흡수가 평소와 달랐어요"
        }
    }

    /// 70 → "1시간 10분", 45 → "45분", 120 → "2시간".
    static func duration(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        if h == 0 { return "\(m)분" }
        if m == 0 { return "\(h)시간" }
        return "\(h)시간 \(m)분"
    }
}
