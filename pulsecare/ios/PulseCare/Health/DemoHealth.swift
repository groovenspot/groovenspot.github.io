import Foundation
import PulseCore

/// 시뮬레이터·스크린샷용 가상 기록 (-demo). 건강 앱에 데이터가 없어도 화면을 확인할 수 있게
/// 평범한 6주에 마지막 사흘 안정시 심박이 오른 사람을 만듭니다. 같은 실행 인자면 항상 같은 화면이 나옵니다.
struct DemoHealth: HealthSource {
    var available: Bool { true }

    func requestAuthorization() async throws {}

    func read(from: LocalDate, to: LocalDate, zone: Zone) async -> RawHealth {
        var raw = RawHealth()
        var seed: UInt64 = 42
        func noise() -> Double {
            // 결정적 의사 난수 (xorshift), −1~1.
            seed ^= seed << 13
            seed ^= seed >> 7
            seed ^= seed << 17
            return Double(seed % 2001) / 1000 - 1
        }
        let first = from.minusDays(1)
        for offset in 0...LocalDate.daysBetween(first, to) {
            let day = first.plusDays(offset)
            let night = day.minusDays(1)
            let bedMinutes = 23 * 60 + 20 + Int(noise() * 30)
            let bed = zone.instant(night.atTime(0, 0).plusMinutes(bedMinutes))
            let asleep = 420 + Int(noise() * 35) - (day == to ? 40 : 0)
            let wake = bed.addingTimeInterval(TimeInterval((asleep + 25) * 60))
            let deepEnd = bed.addingTimeInterval(TimeInterval(15 * 60 + 85 * 60))
            raw.sleep.append(RawSleep(start: bed, end: wake, stages: [
                RawStage(start: bed, end: bed.addingTimeInterval(15 * 60), type: .awake),
                RawStage(start: bed.addingTimeInterval(15 * 60), end: deepEnd, type: .deep),
                RawStage(start: deepEnd, end: wake.addingTimeInterval(-10 * 60), type: .light),
                RawStage(start: wake.addingTimeInterval(-10 * 60), end: wake, type: .awake),
            ]))
            let mid = bed.addingTimeInterval(3 * 3600)
            let raised = LocalDate.daysBetween(day, to) < 3
            raw.hrv.append(Sample(mid, 46 + noise() * 6 - (raised ? 6 : 0)))
            raw.restingHr.append(Sample(zone.instant(day.atTime(9, 0)), 57 + noise() * 2 + (raised ? 15 : 0)))
            raw.respiratoryRate.append(Sample(mid, 14.5 + noise() * 0.6))
            raw.spo2.append(Sample(mid, 96 + noise()))
            raw.steps[day] = 7400 + Int(noise() * 1800)
            raw.activeCalories[day] = 420 + noise() * 80
        }
        for hour in [8, 12, 13, 18] { raw.stepsByHour[to.atTime(hour, 0)] = 900 + hour * 20 }
        raw.floors[to] = 2
        return raw
    }

    /// 데모 화면의 기준 시각: 2027년 6월 16일 수요일 아침 8시.
    static let now = LocalDate(2027, 6, 16).atTime(8, 0)
}
