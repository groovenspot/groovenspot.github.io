import XCTest
@testable import CardioPacer

final class ZoneModelsTests: XCTestCase {
    func testMaxHeartRatePercentageWithoutRestingHeartRate() {
        let profile = ZoneProfile(age: 35)
        XCTAssertEqual(profile.estimatedMaxHeartRate, 184) // 208 - 0.7 * 35 = 183.5
        XCTAssertEqual(profile.zone2Range, ZoneRange(lower: 110, upper: 129))
    }

    func testKarvonenWithRestingHeartRate() {
        let profile = ZoneProfile(age: 35, restingHeartRate: 60)
        // reserve = 124 → 60 + 74.4, 60 + 86.8
        XCTAssertEqual(profile.zone2Range, ZoneRange(lower: 134, upper: 147))
    }

    func testMaxHeartRateOverride() {
        let profile = ZoneProfile(age: 35, restingHeartRate: 50, maxHeartRateOverride: 200)
        XCTAssertEqual(profile.zone2Range, ZoneRange(lower: 140, upper: 155))
    }

    func testManualRangeWins() {
        let profile = ZoneProfile(age: 35, restingHeartRate: 60, method: .manual,
                                  manualRange: ZoneRange(lower: 130, upper: 145))
        XCTAssertEqual(profile.zone2Range, ZoneRange(lower: 130, upper: 145))
    }

    func testRangeNormalisesOrder() {
        XCTAssertEqual(ZoneRange(lower: 150, upper: 120), ZoneRange(lower: 120, upper: 150))
    }

    func testRangeBoundariesAreInclusive() {
        let range = ZoneRange(lower: 130, upper: 145)
        XCTAssertEqual(range.zone(for: 129), .below)
        XCTAssertEqual(range.zone(for: 130), .target)
        XCTAssertEqual(range.zone(for: 145), .target)
        XCTAssertEqual(range.zone(for: 146), .above)
    }

    func testTrackerLeavesZone2Immediately() {
        var tracker = ZoneTracker(range: ZoneRange(lower: 130, upper: 145))
        XCTAssertEqual(tracker.update(bpm: 140), .target)
        XCTAssertEqual(tracker.update(bpm: 146), .above)
    }

    func testTrackerHysteresisWhenComingDown() {
        var tracker = ZoneTracker(range: ZoneRange(lower: 130, upper: 145))
        tracker.update(bpm: 150)
        XCTAssertEqual(tracker.update(bpm: 145), .above)
        XCTAssertEqual(tracker.update(bpm: 144), .above)
        XCTAssertEqual(tracker.update(bpm: 143), .target)
    }

    func testTrackerHysteresisWhenComingUp() {
        var tracker = ZoneTracker(range: ZoneRange(lower: 130, upper: 145))
        tracker.update(bpm: 120)
        XCTAssertEqual(tracker.update(bpm: 131), .below)
        XCTAssertEqual(tracker.update(bpm: 132), .target)
        XCTAssertEqual(tracker.update(bpm: 129), .below)
    }

    func testLedgerCreditsTimeToPreviousZone() {
        var ledger = ZoneTimeLedger()
        ledger.mark(zone: .target, at: 0)
        ledger.mark(zone: .target, at: 10)
        ledger.mark(zone: .above, at: 20)
        ledger.mark(zone: nil, at: 30)
        XCTAssertEqual(ledger.seconds[.target], 20)
        XCTAssertEqual(ledger.seconds[.above], 10)
        XCTAssertEqual(ledger.total, 30)
        XCTAssertEqual(ledger.fraction(in: .target), 2.0 / 3.0, accuracy: 0.0001)
    }

    func testLedgerIgnoresTimeWhileClockIsStopped() {
        var ledger = ZoneTimeLedger()
        ledger.mark(zone: .target, at: 0)
        ledger.mark(zone: .target, at: 60)  // paused at 60s
        ledger.mark(zone: .target, at: 60)  // resumed, elapsed time didn't advance
        ledger.mark(zone: nil, at: 90)
        XCTAssertEqual(ledger.seconds[.target], 90)
    }

    func testSummaryPercent() {
        let summary = WorkoutSummary(duration: 600,
                                     zoneSeconds: [.below: 60, .target: 492, .above: 48],
                                     averageHeartRate: 138,
                                     range: ZoneRange(lower: 130, upper: 145))
        XCTAssertEqual(summary.zone2Percent, 82)
    }

    func testSummaryPercentWithNoData() {
        let summary = WorkoutSummary(duration: 0, zoneSeconds: [:], averageHeartRate: nil,
                                     range: ZoneRange(lower: 130, upper: 145))
        XCTAssertEqual(summary.zone2Percent, 0)
    }

    func testClockFormatting() {
        XCTAssertEqual(DurationFormatter.clock(765), "12:45")
        XCTAssertEqual(DurationFormatter.clock(3729), "1:02:09")
        XCTAssertEqual(DurationFormatter.clock(-5), "00:00")
    }
}
