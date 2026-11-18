import Foundation
import XCTest
@testable import PulseCore

/// 사례 묶음이 다루지 않는 부분: 날짜 산술, Kotlin 숫자 형식, 워치 약속, 이벤트 규칙.
final class CoreTests: XCTestCase {

    func testDateArithmetic() {
        let d = LocalDate(2027, 4, 30)
        XCTAssertEqual(d.description, "2027-04-30")
        XCTAssertEqual(d.dayOfWeek, .friday)
        XCTAssertEqual(d.plusDays(1).description, "2027-05-01")
        XCTAssertEqual(LocalDate(2028, 2, 28).plusDays(1).description, "2028-02-29")
        XCTAssertEqual(LocalDate(1970, 1, 1).epochDay, 0)
        XCTAssertEqual(LocalDate(iso: "2027-04-30"), d)
        XCTAssertEqual(d.monday, LocalDate(2027, 4, 26))
        XCTAssertEqual(LocalDate(2027, 4, 26).monday, LocalDate(2027, 4, 26))
        XCTAssertEqual(LocalTime(23, 30).plusMinutes(45), LocalTime(0, 15))
        XCTAssertEqual(LocalDateTime(iso: "2027-04-30T23:30"), d.atTime(23, 30))
        XCTAssertEqual(LocalDateTime.minutesBetween(d.atTime(23, 30), d.plusDays(1).atTime(0, 10)), 40)
        XCTAssertEqual(LocalDateTime(epochSecond: -1).description, "1969-12-31T23:59:59")
    }

    func testKotlinRounding() {
        XCTAssertEqual(2.5.roundToInt, 3)
        XCTAssertEqual((-2.5).roundToInt, -2)
        XCTAssertEqual((-2.6).roundToInt, -3)
        XCTAssertEqual(KotlinFormat.oneDecimal(1.25), "1.3")
        XCTAssertEqual(KotlinFormat.oneDecimal(1.449), "1.4")
        XCTAssertEqual(KotlinFormat.oneDecimal(2.0), "2.0")
        XCTAssertEqual(KotlinFormat.oneDecimal(1.96), "2.0")
        XCTAssertEqual(KotlinFormat.grouped(7000), "7,000")
        XCTAssertEqual(KotlinFormat.grouped(1_234_567), "1,234,567")
        XCTAssertEqual(KotlinFormat.grouped(300), "300")
    }

    func testLoadReasonUsesOneDecimal() {
        // 최근 일주일 부하가 평소보다 크게 늘어 이유가 활동 부하일 때 배수를 소수 한 자리로.
        let today = LocalDate(2027, 4, 30)
        let history = (1...28).map { ago in
            DailyRecord(date: today.minusDays(ago), sleep: SleepSummary(mainSleepMinutes: 450), activityLoad: ago <= 7 ? 250 : 100, score: 75)
        }
        let r = ConditionScoreEngine.score(today: DailyRecord(date: today, sleep: SleepSummary(mainSleepMinutes: 450)), history: history, context: ScoreContext(dayIndex: 60))
        XCTAssertEqual(r.reasonMetric, .activityLoad)
        XCTAssertTrue(r.reason.contains("배예요"), r.reason)
    }

    func testSubjectParticle() {
        XCTAssertEqual(AlertText.subject("엄마"), "가")
        XCTAssertEqual(AlertText.subject("김철수"), "가")
        XCTAssertEqual(AlertText.subject("박민"), "이")
        XCTAssertEqual(AlertText.subject("Sam"), "이(가)")
    }

    func testWatchRoundTrip() {
        let w = WatchToday(date: LocalDate(2027, 4, 30), score: 72, band: .good, reason: "자율신경이 평소보다 잘 회복됐어요",
                           missionId: "W-02", missionTitle: "오늘 7,000보", missionDone: false, learningDay: 3)
        let m = WatchContract.encode(w)
        XCTAssertEqual(m["band"], "GOOD")
        XCTAssertEqual(WatchContract.decode(m), w)
        XCTAssertNil(WatchContract.decode(["date": "nope", "missionId": "W-02"]))
        XCTAssertEqual(WatchContract.display(w, today: w.date).label, "학습 중 3일째")
        XCTAssertTrue(WatchContract.display(w, today: w.date.plusDays(1)).stale)
        XCTAssertEqual(WatchContract.sosText(WatchContract.sosSent(2)).title, "보호자 2명에게 알렸어요")
        XCTAssertEqual(WatchContract.sosText(WatchContract.sosSent(0)).title, "연결된 보호자가 없어요")
        XCTAssertEqual(WatchContract.sosText(WatchContract.sosFailed).title, "보호자에게 보내지 못했어요")
    }

    func testEventRules() {
        XCTAssertEqual(EventRules.clean(.scoreViewed, ["surface": "app", "score": "72", "kind": ""]), ["surface": "app"])
        XCTAssertFalse(EventRules.isActive(.missionCompleted, ["auto": "true"]))
        XCTAssertTrue(EventRules.isActive(.missionCompleted, ["auto": "false"]))
        XCTAssertEqual(EventRules.dayBucket(0), "0")
        XCTAssertEqual(EventRules.dayBucket(5), "5")
        XCTAssertEqual(EventRules.dayBucket(20), "15-30")
        XCTAssertEqual(EventRules.dayBucket(400), "90+")
        XCTAssertEqual(EventName.of("app_opened"), .appOpened)
    }

    func testEveningSummary() {
        let walk = MissionLibrary["W-02"]
        XCTAssertNil(EveningSummary.of(walk, done: true, infoBodies: []))
        XCTAssertEqual(EveningSummary.of(walk, done: false, infoBodies: [])?.askRetry, true)
        XCTAssertEqual(EveningSummary.of(MissionLibrary["S-06"], done: false, infoBodies: ["정보"])?.askRetry, false)
    }

    func testEmergencyPlan() {
        let plan = EmergencyEscalation.plan(.fall, ["a", "b"])
        XCTAssertEqual(plan.map(\.afterSeconds), [0, 60, 120, 240])
        XCTAssertEqual(plan.first?.action, .askSelf)
        XCTAssertEqual(EmergencyEscalation.plan(.sos, ["a"]).map(\.action), [.notify, .notifyAllAgain])
    }

    func testLibrary() {
        XCTAssertEqual(MissionLibrary.all.count, 40)
        XCTAssertEqual(MissionLibrary.all.filter { $0.verification == .manual }.count, 11)
        XCTAssertEqual(Set(MissionLibrary.all.map(\.id)).count, 40)
    }
}
