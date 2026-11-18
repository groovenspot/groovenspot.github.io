import Foundation
import XCTest
@testable import PulseCore

/// 안드로이드 CareTest와 같은 사례.
final class CareTests: XCTestCase {
    private let day = LocalDate(2027, 6, 16)

    func testBreathingRhythm() {
        XCTAssertEqual(Breathing.at(0).phase, .inhale)
        XCTAssertEqual(Breathing.at(5).phase, .exhale)
        XCTAssertEqual(Breathing.at(7).progress, 0.5, accuracy: 1e-9)
        XCTAssertEqual(Breathing.at(10).phase, .inhale)
        XCTAssertEqual(Breathing.at(60).phase, .done)
    }

    func testAppRecordsCompleteMissions() {
        let now = day.atTime(21, 0)
        let a = DayActivity(date: day, breathing: [day.atTime(7, 30), day.atTime(12, 10), day.atTime(20, 30)], waterCups: 6, tagged: true)
        for id in ["R-01", "C-04", "S-04", "R-08", "C-07", "C-08"] { XCTAssertEqual(MissionVerifier.check(id, a, now: now), .done, id) }
        XCTAssertEqual(MissionVerifier.check("C-07", DayActivity(date: day), now: day.plusDays(1).atTime(8, 0)), .missed)
    }

    func testTagsAttachToMorningRecord() {
        let r = DayTags.apply([DailyRecord(date: day, sleep: nil), DailyRecord(date: day.minusDays(1), sleep: nil)], [day: [.alcohol]])
        XCTAssertEqual(r[0].tags, [.alcohol])
        XCTAssertTrue(r[1].tags.isEmpty)
    }
}

final class SharedTodayTests: XCTestCase {
    func testRoundTrip() {
        let d = UserDefaults(suiteName: "pulsecare-test-\(UUID().uuidString)")!
        let t = WatchToday(date: LocalDate(2027, 6, 16), score: 72, band: .good, reason: "r", missionId: "R-01", missionTitle: "1분 호흡 가이드 1회", missionDone: false)
        SharedToday.save(t, defaults: d)
        XCTAssertEqual(SharedToday.load(defaults: d), t)
        SharedToday.save(nil, defaults: d)
        XCTAssertNil(SharedToday.load(defaults: d))
    }
}
