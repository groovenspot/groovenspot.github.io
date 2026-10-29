import Foundation
import XCTest
@testable import PulseCore

/// 안드로이드 core(Kotlin)가 만든 사례로 Swift 결과를 맞춰 봅니다.
/// 사례는 android/core의 ParityFixturesTest가 만들고, Kotlin 로직이 바뀌면 그쪽 테스트가 먼저 실패합니다.
final class ParityTests: XCTestCase {

    private func load<T: Decodable>(_ name: String, as type: T.Type = T.self) throws -> T {
        let url = try XCTUnwrap(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
        return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
    }

    private func assertClose(_ a: Double?, _ b: Double?, _ what: @autoclosure () -> String, file: StaticString = #filePath, line: UInt = #line) {
        switch (a, b) {
        case (nil, nil): return
        case let (x?, y?):
            XCTAssertLessThanOrEqual(Swift.abs(x - y), 1e-9 * Swift.max(1, Swift.abs(y)), "\(what()): \(x) != \(y)", file: file, line: line)
        default:
            XCTFail("\(what()): \(String(describing: a)) != \(String(describing: b))", file: file, line: line)
        }
    }

    private func assertDetections(_ actual: [Detection], _ expected: [Detection], _ what: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(actual.map(\.signal), expected.map(\.signal), what, file: file, line: line)
        for (a, e) in zip(actual, expected) {
            assertClose(a.usual, e.usual, "\(what) usual", file: file, line: line)
            assertClose(a.current, e.current, "\(what) current", file: file, line: line)
            XCTAssertEqual(a.days, e.days, "\(what) days", file: file, line: line)
        }
    }

    // MARK: 점수와 하루 신호

    struct User: Decodable {
        var records: [DailyRecord]
        var logs: [MissionLog]
        var signupDate: LocalDate
        var days: [Day]
    }

    struct Day: Decodable {
        var context: ScoreContext
        var result: ExpectedScore
        var signals: [Detection]
    }

    struct ExpectedScore: Decodable {
        var kind: String
        var score: Int?
        var band: String?
        var reason: String
        var badges: [String]
        var subScores: [String: Double]
        var cap: String?
        var reasonMetric: String?
    }

    private lazy var users: [User] = try! load("scores")

    func testConditionScoresMatchAndroid() {
        var checked = 0
        for (u, user) in users.enumerated() {
            for (i, day) in user.days.enumerated() {
                let today = user.records[i].with(score: nil)
                let r = ConditionScoreEngine.score(today: today, history: Array(user.records[..<i]), context: day.context)
                let what = "사용자 \(u) \(today.date)"
                let e = day.result
                XCTAssertEqual(r.kind.rawValue, e.kind, what)
                XCTAssertEqual(r.score, e.score, what)
                XCTAssertEqual(r.band?.rawValue, e.band, what)
                XCTAssertEqual(r.reason, e.reason, what)
                XCTAssertEqual(r.badges.map(\.rawValue).sorted(), e.badges, what)
                XCTAssertEqual(r.cap?.rawValue, e.cap, what)
                XCTAssertEqual(r.reasonMetric?.rawValue, e.reasonMetric, what)
                XCTAssertEqual(Set(r.subScores.keys.map(\.rawValue)), Set(e.subScores.keys), what)
                for (k, v) in e.subScores { assertClose(r.subScores[Metric(rawValue: k)!], v, "\(what) \(k)") }
                checked += 1
            }
        }
        XCTAssertGreaterThan(checked, 500)
    }

    func testDailySignalsMatchAndroid() {
        for (u, user) in users.enumerated() {
            for (i, day) in user.days.enumerated() {
                let found = DailySignals.evaluate(Array(user.records[...i]), dayIndex: day.context.dayIndex)
                assertDetections(found, day.signals, "사용자 \(u) \(user.records[i].date)")
            }
        }
    }

    // MARK: 미션

    struct PickCase: Decodable {
        var date: LocalDate
        var score: Int?
        var reasonMetric: Metric?
        var goal: Goal
        var level: Int
        var history: [MissionLog]
        var badWeather: Bool
        var seniorMode: Bool
        var exclude: [String]
        var randomDouble: Double
        var randomInt: Int
        var expected: String
    }

    final class FixedRandom: RandomSource {
        let d: Double, k: Int
        init(_ d: Double, _ k: Int) {
            self.d = d
            self.k = k
        }
        func nextDouble() -> Double { d }
        func nextInt(_ bound: Int) -> Int { k % bound }
    }

    func testMissionPickerMatchesAndroid() throws {
        let cases: [PickCase] = try load("picker")
        for (i, c) in cases.enumerated() {
            let input = PickInput(date: c.date, score: c.score, reasonMetric: c.reasonMetric, goal: c.goal, level: c.level,
                                  history: c.history, badWeather: c.badWeather, seniorMode: c.seniorMode, exclude: Set(c.exclude))
            XCTAssertEqual(MissionPicker(random: FixedRandom(c.randomDouble, c.randomInt)).pick(input).id, c.expected, "사례 \(i)")
        }
    }

    struct VerifyCase: Decodable {
        struct Activity: Decodable {
            var date: LocalDate
            var stepsByHour: [String: Int]
            var floors: Double?
            var exercises: [Exercise]
            var naps: [Nap]
            var nightBedtime: LocalDateTime?
            var nextWake: LocalDateTime?
            var morningWake: LocalDateTime?
            var usualBedtime: LocalTime?
            var usualWake: LocalTime?
            var recentBedtimes: [LocalTime]
            var breathing: [LocalDateTime]
            var waterCups: Int
            var tagged: Bool
        }
        var activity: Activity
        var now: LocalDateTime
        var expected: [String: String]
    }

    func testMissionVerifierMatchesAndroid() throws {
        let cases: [VerifyCase] = try load("verifier")
        for (i, c) in cases.enumerated() {
            let a = c.activity
            let activity = DayActivity(
                date: a.date,
                stepsByHour: Dictionary(uniqueKeysWithValues: a.stepsByHour.map { (Int($0.key)!, $0.value) }),
                floors: a.floors, exercises: a.exercises, naps: a.naps,
                nightBedtime: a.nightBedtime, nextWake: a.nextWake, morningWake: a.morningWake,
                usualBedtime: a.usualBedtime, usualWake: a.usualWake, recentBedtimes: a.recentBedtimes,
                breathing: a.breathing, waterCups: a.waterCups, tagged: a.tagged
            )
            XCTAssertEqual(c.expected.count, MissionLibrary.all.count)
            for (id, check) in c.expected {
                XCTAssertEqual(MissionVerifier.check(id, activity, now: c.now).rawValue, check, "사례 \(i) \(id)")
            }
        }
    }

    // MARK: 복약·취침

    struct CareCase: Decodable {
        struct ExpectedDose: Decodable {
            var medicationId: String
            var time: LocalTime
            var taken: Bool
            var missed: Bool
        }
        var plans: [Medication]
        var logs: [DoseLog]
        var now: LocalDateTime
        var doses: [ExpectedDose]
        var missed: Detection?
        var next: LocalDateTime?
        var usualBedtime: LocalTime?
        var fixedBedtime: LocalTime?
        var bedtimeReminder: LocalTime
    }

    func testCareMatchesAndroid() throws {
        let cases: [CareCase] = try load("care")
        for (i, c) in cases.enumerated() {
            let doses = Medications.today(c.plans, c.logs, now: c.now)
            XCTAssertEqual(doses.map(\.medication.id), c.doses.map(\.medicationId), "사례 \(i)")
            XCTAssertEqual(doses.map(\.time), c.doses.map(\.time), "사례 \(i)")
            XCTAssertEqual(doses.map(\.taken), c.doses.map(\.taken), "사례 \(i)")
            XCTAssertEqual(doses.map(\.missed), c.doses.map(\.missed), "사례 \(i)")
            XCTAssertEqual(Medications.missed(doses), c.missed, "사례 \(i)")
            XCTAssertEqual(Medications.nextEvent(c.plans, after: c.now), c.next, "사례 \(i)")
            XCTAssertEqual(Bedtime.reminderAt(usual: c.usualBedtime, fixed: c.fixedBedtime), c.bedtimeReminder, "사례 \(i)")
        }
    }

    // MARK: 알림

    struct HeartCase: Decodable {
        struct Sample: Decodable {
            var time: Int
            var bpm: Int
            var moving: Bool
            var asleep: Bool
            var inWorkout: Bool
        }
        var samples: [Sample]
        var expected: [Detection]
    }

    func testHeartRateWatchMatchesAndroid() throws {
        let cases: [HeartCase] = try load("heart")
        for (i, c) in cases.enumerated() {
            let samples = c.samples.map {
                HrSample(time: Date(timeIntervalSince1970: TimeInterval($0.time)), bpm: $0.bpm, moving: $0.moving, asleep: $0.asleep, inWorkout: $0.inWorkout)
            }
            assertDetections(HeartRateWatch.evaluate(samples), c.expected, "사례 \(i)")
        }
    }

    struct SchedulerCase: Decodable {
        struct Ack: Decodable {
            var at: LocalDateTime
            var detection: Detection
        }
        struct Expected: Decodable {
            var type: String
            var time: LocalDateTime?
            var why: String?
        }
        var alert: PendingAlert
        var now: LocalDateTime
        var sentToday: [PendingAlert]
        var acknowledged: [Ack]
        var asleep: Bool
        var quietStart: LocalTime
        var quietEnd: LocalTime
        var dailyInfoLimit: Int
        var expected: Expected
    }

    func testAlertSchedulerMatchesAndroid() throws {
        let cases: [SchedulerCase] = try load("scheduler")
        for (i, c) in cases.enumerated() {
            var settings = AlertScheduler.Settings()
            settings.quietStart = c.quietStart
            settings.quietEnd = c.quietEnd
            settings.dailyInfoLimit = c.dailyInfoLimit
            let state = DeliveryState(
                sentToday: c.sentToday,
                acknowledged: Dictionary(uniqueKeysWithValues: c.acknowledged.map { ($0.detection.signal, Acknowledgement(at: $0.at, detection: $0.detection)) }),
                asleep: c.asleep
            )
            let expected: Decision = switch c.expected.type {
            case "now": .sendNow
            case "at": .sendAt(c.expected.time!, why: c.expected.why!)
            default: .drop(why: c.expected.why!)
            }
            XCTAssertEqual(AlertScheduler(settings: settings).decide(c.alert, now: c.now, state: state), expected, "사례 \(i)")
        }
    }

    struct TextCase: Decodable {
        struct Message: Decodable, Equatable {
            var title: String
            var body: String
            var buttons: [String]
        }
        var detection: Detection
        var name: String
        var location: String?
        var selfMessage: Message
        var guardian: Message
        var clinicLabel: String

        enum CodingKeys: String, CodingKey {
            case detection, name, location, guardian, clinicLabel
            case selfMessage = "self"
        }
    }

    func testAlertTextMatchesAndroid() throws {
        let cases: [TextCase] = try load("alert_text")
        func msg(_ m: AlertMessage) -> TextCase.Message { .init(title: m.title, body: m.body, buttons: m.buttons) }
        for (i, c) in cases.enumerated() {
            XCTAssertEqual(msg(AlertText.forSelf(c.detection)), c.selfMessage, "사례 \(i)")
            XCTAssertEqual(msg(AlertText.forGuardian(c.detection, name: c.name, location: c.location)), c.guardian, "사례 \(i)")
            XCTAssertEqual(ClinicReport.label(c.detection), c.clinicLabel, "사례 \(i)")
        }
    }

    struct FeedbackCase: Decodable {
        struct Ack: Decodable {
            var at: LocalDateTime
            var detection: Detection
        }
        var entries: [FeedbackEntry]
        var snoozed: [String: LocalDate]
        var declined: [String: LocalDateTime]
        var suggest: [String]
        var acknowledged: [String: Ack]
        var snoozedNow: [String]
    }

    func testAlertFeedbackMatchesAndroid() throws {
        let cases: [FeedbackCase] = try load("feedback")
        let today = LocalDate(2027, 5, 20)
        for (i, c) in cases.enumerated() {
            let snoozed = Dictionary(uniqueKeysWithValues: c.snoozed.map { (Signal(rawValue: $0.key)!, $0.value) })
            let declined = Dictionary(uniqueKeysWithValues: c.declined.map { (Signal(rawValue: $0.key)!, $0.value) })
            XCTAssertEqual(AlertFeedback.suggestSnooze(c.entries, today: today, snoozed: snoozed, declinedAt: declined).map(\.rawValue).sorted(), c.suggest, "사례 \(i)")
            let ack = AlertFeedback.acknowledged(c.entries)
            XCTAssertEqual(Set(ack.keys.map(\.rawValue)), Set(c.acknowledged.keys), "사례 \(i)")
            for (k, v) in c.acknowledged {
                XCTAssertEqual(ack[Signal(rawValue: k)!], Acknowledgement(at: v.at, detection: v.detection), "사례 \(i) \(k)")
            }
            XCTAssertEqual(Signal.allCases.filter { AlertFeedback.isSnoozed($0, snoozed, today: today) }.map(\.rawValue), c.snoozedNow, "사례 \(i)")
        }
    }

    // MARK: 리포트

    struct WeeklyCase: Decodable {
        var user: Int
        var weekEnd: LocalDate
        var goal: Goal
        var level: Int
        var goalSince: LocalDate
        var daysDone: Int
        var badge: Bool
        var points: Int
        var levelChange: MissionProgress.LevelChange
        var nextLevel: Int
        var change: String?
        var suggestGoalChange: Bool
        var title: String
        var lines: [String]
    }

    func testWeeklyReportMatchesAndroid() throws {
        let cases: [WeeklyCase] = try load("weekly")
        for (i, c) in cases.enumerated() {
            let u = users[c.user]
            let s = WeeklyReport.build(weekEnd: c.weekEnd, goal: c.goal, level: c.level, goalSince: c.goalSince, logs: u.logs, records: u.records)
            let what = "사례 \(i)"
            XCTAssertEqual(s.daysDone, c.daysDone, what)
            XCTAssertEqual(s.badge, c.badge, what)
            XCTAssertEqual(s.points, c.points, what)
            XCTAssertEqual(s.levelChange, c.levelChange, what)
            XCTAssertEqual(s.nextLevel, c.nextLevel, what)
            XCTAssertEqual(s.change, c.change, what)
            XCTAssertEqual(s.suggestGoalChange, c.suggestGoalChange, what)
            XCTAssertEqual(s.title, c.title, what)
            XCTAssertEqual(s.lines, c.lines, what)
        }
    }

    struct Range: Decodable {
        var low: Double
        var mid: Double
        var high: Double
    }

    struct HistoryCase: Decodable {
        struct Day: Decodable {
            var date: LocalDate
            var dayIndex: Int
            var score: Int?
            var band: Band?
            var reason: String?
            var learning: Bool
            var estimated: Bool
            var sleepMinutes: Int?
            var missionId: String?
        }
        var user: Int
        var period: Period
        var to: LocalDate
        var signupDate: LocalDate
        var days: [Day]
        var averageScore: Int?
        var previousAverage: Int?
        var averageSleepMinutes: Int?
        var sleep: Range?
        var hrv: Range?
        var restingHr: Range?
        var usualBedtime: LocalTime?
        var periodBedtime: LocalTime?
        var missionsDone: Int
        var missionsAuto: Int
        var weeklyBadges: [LocalDate]
        var lines: [String]
    }

    private func assertRange(_ a: UsualRange?, _ e: Range?, _ what: String) {
        XCTAssertEqual(a == nil, e == nil, what)
        guard let a, let e else { return }
        assertClose(a.low, e.low, what)
        assertClose(a.mid, e.mid, what)
        assertClose(a.high, e.high, what)
    }

    func testHistoryMatchesAndroid() throws {
        let cases: [HistoryCase] = try load("history")
        for (i, c) in cases.enumerated() {
            let u = users[c.user]
            // Kotlin 쪽과 같이: 앱이 보여준 점수는 3일에 2일만 남아 있다고 봅니다.
            var stored = [LocalDate: Int]()
            for (j, r) in u.records.enumerated() where j % 3 != 0 { if let s = r.score { stored[r.date] = s } }
            let raw = u.records.map { $0.with(score: nil) }
            let h = HistoryBuilder.build(period: c.period, to: c.to, records: raw, signupDate: c.signupDate, storedScores: stored, logs: u.logs)
            let what = "사례 \(i)"
            XCTAssertEqual(h.days.count, c.days.count, what)
            for (d, e) in zip(h.days, c.days) {
                XCTAssertEqual(d.date, e.date, what)
                XCTAssertEqual(d.dayIndex, e.dayIndex, what)
                XCTAssertEqual(d.score, e.score, "\(what) \(d.date)")
                XCTAssertEqual(d.band, e.band, "\(what) \(d.date)")
                XCTAssertEqual(d.reason, e.reason, "\(what) \(d.date)")
                XCTAssertEqual(d.learning, e.learning, what)
                XCTAssertEqual(d.estimated, e.estimated, what)
                XCTAssertEqual(d.sleepMinutes, e.sleepMinutes, what)
                XCTAssertEqual(d.mission?.missionId, e.missionId, what)
            }
            XCTAssertEqual(h.averageScore, c.averageScore, what)
            XCTAssertEqual(h.previousAverage, c.previousAverage, what)
            XCTAssertEqual(h.averageSleepMinutes, c.averageSleepMinutes, what)
            assertRange(h.sleep, c.sleep, "\(what) 수면")
            assertRange(h.hrv, c.hrv, "\(what) HRV")
            assertRange(h.restingHr, c.restingHr, "\(what) 안정시 심박")
            XCTAssertEqual(h.usualBedtime, c.usualBedtime, what)
            XCTAssertEqual(h.periodBedtime, c.periodBedtime, what)
            XCTAssertEqual(h.missionsDone, c.missionsDone, what)
            XCTAssertEqual(h.missionsAuto, c.missionsAuto, what)
            XCTAssertEqual(h.weeklyBadges, c.weeklyBadges, what)
            XCTAssertEqual(h.lines, c.lines, what)
        }
    }

    struct StatFixture: Decodable {
        var mean: Double?
        var min: Double?
        var max: Double?
        var days: Int
        var firstHalf: Double?
        var secondHalf: Double?
    }

    struct ClinicCase: Decodable {
        struct SignalAt: Decodable {
            var date: LocalDate
            var detection: Detection
        }
        struct Week: Decodable {
            var monday: LocalDate
            var sleepMinutes: Double?
            var restingHr: Double?
            var hrv: Double?
            var steps: Double?
        }
        var user: Int
        var from: LocalDate
        var to: LocalDate
        var signupDate: LocalDate
        var days: Int
        var sleep: StatFixture
        var bedtime: LocalTime?
        var shortNights: Int
        var restingHr: StatFixture
        var hrv: StatFixture
        var steps: StatFixture
        var respiratoryRate: StatFixture
        var lowSpo2Nights: Int
        var spo2Nights: Int
        var signals: [SignalAt]
        var missionDays: Int
        var missionLogged: Int
        var scoreMean: Int?
        var weeks: [Week]
    }

    private func assertStat(_ a: Stat, _ e: StatFixture, _ what: String) {
        assertClose(a.mean, e.mean, "\(what) 평균")
        assertClose(a.min, e.min, "\(what) 최소")
        assertClose(a.max, e.max, "\(what) 최대")
        XCTAssertEqual(a.days, e.days, what)
        assertClose(a.firstHalf, e.firstHalf, "\(what) 앞 절반")
        assertClose(a.secondHalf, e.secondHalf, "\(what) 뒤 절반")
    }

    func testClinicReportMatchesAndroid() throws {
        let cases: [ClinicCase] = try load("clinic")
        for (i, c) in cases.enumerated() {
            let u = users[c.user]
            var scores = [LocalDate: Int]()
            for r in u.records { if let s = r.score { scores[r.date] = s } }
            let raw = u.records.map { $0.with(score: nil) }
            let s = ClinicReport.build(from: c.from, to: c.to, records: raw, logs: u.logs, scores: scores) {
                LocalDate.daysBetween(c.signupDate, $0) + 1
            }
            let what = "사례 \(i)"
            XCTAssertEqual(s.days, c.days, what)
            assertStat(s.sleep, c.sleep, "\(what) 수면")
            XCTAssertEqual(s.bedtime, c.bedtime, what)
            XCTAssertEqual(s.shortNights, c.shortNights, what)
            assertStat(s.restingHr, c.restingHr, "\(what) 안정시 심박")
            assertStat(s.hrv, c.hrv, "\(what) HRV")
            assertStat(s.steps, c.steps, "\(what) 걸음")
            assertStat(s.respiratoryRate, c.respiratoryRate, "\(what) 호흡수")
            XCTAssertEqual(s.lowSpo2Nights, c.lowSpo2Nights, what)
            XCTAssertEqual(s.spo2Nights, c.spo2Nights, what)
            XCTAssertEqual(s.signals.map(\.date), c.signals.map(\.date), what)
            assertDetections(s.signals.map(\.detection), c.signals.map(\.detection), what)
            XCTAssertEqual(s.missionDays, c.missionDays, what)
            XCTAssertEqual(s.missionLogged, c.missionLogged, what)
            XCTAssertEqual(s.scoreMean, c.scoreMean, what)
            XCTAssertEqual(s.weeks.map(\.monday), c.weeks.map(\.monday), what)
            for (w, e) in zip(s.weeks, c.weeks) {
                assertClose(w.sleepMinutes, e.sleepMinutes, "\(what) 주 수면")
                assertClose(w.restingHr, e.restingHr, "\(what) 주 심박")
                assertClose(w.hrv, e.hrv, "\(what) 주 HRV")
                assertClose(w.steps, e.steps, "\(what) 주 걸음")
            }
        }
    }
}
