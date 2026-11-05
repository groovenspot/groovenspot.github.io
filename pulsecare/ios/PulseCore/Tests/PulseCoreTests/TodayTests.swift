import Foundation
import XCTest
@testable import PulseCore

/// 안드로이드 TodayPlannerTest·NightMapperTest·MorningTest와 같은 사례.
final class TodayTests: XCTestCase {
    private let today = LocalDate(2027, 4, 30)
    private lazy var profile = Profile(goal: .sleep, signupDate: today.minusDays(40))
    private let planner = TodayPlanner()

    private func records(todaySleep: Int? = 450) -> [DailyRecord] {
        (0...29).map { ago in
            let w = ago % 3 - 1
            return DailyRecord(
                date: today.minusDays(ago),
                sleep: ago == 0 && todaySleep == nil ? nil : SleepSummary(
                    mainSleepMinutes: ago == 0 ? todaySleep! : 450 + w * 10,
                    efficiency: 0.9,
                    bedtime: LocalTime(23, 30).plusMinutes(w * 10)
                ),
                hrvMs: 50.0 + Double(w * 2),
                restingHr: 58.0 + Double(w),
                steps: 8000 + w * 400
            )
        }
    }

    func testOrdinaryMorning() {
        let plan = planner.plan(today: today, records: records(), profile: profile, stored: nil, logs: [], scores: [:])
        let home = plan.home
        XCTAssertEqual(home.score.kind, .full)
        XCTAssertTrue((60...80).contains(home.score.score!))
        XCTAssertEqual(home.dayIndex, 41)
        XCTAssertFalse(home.learning)
        XCTAssertTrue(home.canSwap)
        XCTAssertEqual(plan.scores[today], home.score.score)
        XCTAssertTrue(home.alerts.isEmpty)
    }

    func testSameDaySameMission() {
        let first = planner.plan(today: today, records: records(), profile: profile, stored: nil, logs: [], scores: [:])
        let again = planner.plan(today: today, records: records(), profile: profile, stored: first.today, logs: [], scores: first.scores)
        XCTAssertEqual(again.home.mission.id, first.today.missionId)
    }

    func testYesterdaysMissionMovesToHistory() {
        let yesterday = TodayMission(date: today.minusDays(1), missionId: "S-02", completed: true)
        let plan = planner.plan(today: today, records: records(), profile: profile, stored: yesterday, logs: [], scores: [:])
        XCTAssertEqual(plan.logs, [MissionLog(date: today.minusDays(1), missionId: "S-02", completed: true)])
        XCTAssertEqual(plan.today.date, today)
    }

    func testSwapOnlyOnce() {
        let plan = planner.plan(today: today, records: records(), profile: profile, stored: nil, logs: [], scores: [:])
        let swapped = planner.swap(plan.home, plan.today, profile: profile, logs: plan.logs)
        XCTAssertNotEqual(swapped.missionId, plan.today.missionId)
        XCTAssertTrue(swapped.swapped)
        XCTAssertEqual(planner.swap(plan.home, swapped, profile: profile, logs: plan.logs), swapped)
    }

    func testNoWatchUsesFeeling() {
        let plan = planner.plan(today: today, records: records(todaySleep: nil), profile: profile, stored: nil, logs: [], scores: [:], feeling: 1)
        XCTAssertEqual(plan.home.score.kind, .noData)
        XCTAssertEqual(plan.home.mission.goal, .lowDay)
        XCTAssertNil(plan.scores[today])
    }

    func testFirstDaysAreLearning() {
        var newcomer = profile
        newcomer.signupDate = today.minusDays(1)
        let home = planner.plan(today: today, records: Array(records().prefix(2)), profile: newcomer, stored: nil, logs: [], scores: [:]).home
        XCTAssertEqual(home.dayIndex, 2)
        XCTAssertTrue(home.learning)
        XCTAssertEqual(home.score.kind, .sleepOnly)
    }

    func testRaisedRestingHeartRateShowsAlertAndCapsScore() {
        let raised = records().map { r -> DailyRecord in
            var r = r
            if r.date >= today.minusDays(2) { r.restingHr = 72 }
            return r
        }
        let home = planner.plan(today: today, records: raised, profile: profile, stored: nil, logs: [], scores: [:]).home
        XCTAssertEqual(home.alerts.map(\.title), ["안정시 심박 상승"])
        XCTAssertLessThanOrEqual(home.score.score!, 60)
    }

    func testStepMissionCompletesFromWatchData() {
        var weight = profile
        weight.goal = .weight
        let walked = DayActivity(date: today, stepsByHour: [9: 4_000, 13: 3_500])
        let plan = planner.plan(today: today, records: records(), profile: weight, stored: TodayMission(date: today, missionId: "W-02"), logs: [], scores: [:],
                                activities: [today: walked], now: today.atTime(15, 0))
        XCTAssertTrue(plan.today.completed)
        XCTAssertTrue(plan.today.auto)
        XCTAssertEqual(plan.home.missionCheck, .done)
    }

    func testLastNightFinishesYesterdaysBedtimeMission() {
        let yesterday = today.minusDays(1)
        let early = DayActivity(date: yesterday, nightBedtime: yesterday.atTime(22, 45), usualBedtime: LocalTime(23, 30))
        let plan = planner.plan(today: today, records: records(), profile: profile, stored: TodayMission(date: yesterday, missionId: "S-06"), logs: [], scores: [:],
                                activities: [yesterday: early], now: today.atTime(7, 30))
        XCTAssertEqual(plan.logs, [MissionLog(date: yesterday, missionId: "S-06", completed: true, auto: true)])
    }

    func testRetryTomorrowKeepsTheSameMission() {
        let plan = planner.plan(today: today, records: records(), profile: profile, stored: nil, logs: [], scores: [:], retryMissionId: "S-05")
        XCTAssertEqual(plan.today.missionId, "S-05")
    }

    func testLowDayOverridesRetry() {
        let plan = planner.plan(today: today, records: records(todaySleep: nil), profile: profile, stored: nil, logs: [], scores: [:], feeling: 1, retryMissionId: "S-05")
        XCTAssertEqual(plan.home.mission.goal, .lowDay)
    }

    func testGuardianOnlyGetsParentMissionWithoutRecords() {
        let guardian = Profile(goal: .parent, signupDate: today.minusDays(20), guardianOnly: true)
        let plan = planner.plan(today: today, records: [], profile: guardian, stored: nil, logs: [], scores: [:])
        XCTAssertTrue(plan.home.mission.id.hasPrefix("P-"))
        XCTAssertEqual(plan.home.score.kind, .noData)
        XCTAssertTrue(plan.home.alerts.isEmpty)
    }

    func testProfileRoundTrip() throws {
        let p = Profile(goal: .stress, signupDate: today, levels: [.stress: 2, .sleep: 3], seniorMode: true, goalSince: today.plusDays(3))
        let data = try JSONEncoder().encode(p)
        XCTAssertEqual(try JSONDecoder().decode(Profile.self, from: data), p)
        XCTAssertTrue(String(decoding: data, as: UTF8.self).contains("\"STRESS\":2"))
        var s = NotificationSettings()
        s.disabledSignals = [.stress, .sos]
        XCTAssertEqual(try JSONDecoder().decode(NotificationSettings.self, from: JSONEncoder().encode(s)), s)
        XCTAssertTrue(s.allows(.sos))
        XCTAssertFalse(s.allows(.stress))
    }

    // MARK: 아침 리포트

    private func home(_ score: ScoreResult) -> HomeState {
        HomeState(date: LocalDate(2027, 6, 16), dayIndex: 40, score: score, mission: MissionLibrary["W-01"], missionDone: false, canSwap: true, alerts: [])
    }

    func testMorningReportText() {
        let text = MorningReport.of(home(ScoreResult(kind: .full, score: 78, band: .good, reason: "자율신경이 평소보다 잘 회복됐어요")))
        XCTAssertEqual(text.title, "오늘 컨디션 78점 · 좋음")
        XCTAssertEqual(text.body, "자율신경이 평소보다 잘 회복됐어요\n오늘의 미션: 점심 먹고 10분 걷기")
        XCTAssertEqual(MorningReport.of(home(ScoreResult(kind: .noData, score: nil, band: nil, reason: ""))).title, "어젯밤 기록이 없어요")
        XCTAssertFalse(MorningReport.publicText.contains(where: \.isNumber))
        XCTAssertEqual(MorningReport.cautionPublic, "확인할 알림이 있어요")
    }

    // MARK: HealthKit 기록 → 하루 기록

    private let zone = Zone(TimeZone(identifier: "Asia/Seoul")!)
    private let date = LocalDate(2027, 4, 30)
    private func at(_ day: LocalDate, _ h: Int, _ m: Int = 0) -> Date { zone.instant(day.atTime(h, m)) }
    private var yesterday: LocalDate { date.minusDays(1) }

    func testMainSleepWithStages() {
        var raw = RawHealth()
        raw.sleep = [RawSleep(start: at(yesterday, 23, 30), end: at(date, 7), stages: [
            RawStage(start: at(yesterday, 23, 30), end: at(yesterday, 23, 50), type: .awake),
            RawStage(start: at(yesterday, 23, 50), end: at(date, 1, 20), type: .deep),
            RawStage(start: at(date, 1, 20), end: at(date, 5), type: .light),
            RawStage(start: at(date, 5), end: at(date, 7), type: .rem),
        ])]
        raw.hrv = [Sample(at(date, 3), 48), Sample(at(date, 4), 52), Sample(at(date, 12), 20)]
        raw.restingHr = [Sample(at(date, 8), 58)]
        raw.steps = [yesterday: 8123, date: 400]
        let r = NightMapper.day(raw, date, zone: zone)
        let sleep = r.sleep!
        XCTAssertEqual(sleep.mainSleepMinutes, 430)
        XCTAssertEqual(sleep.efficiency!, 430.0 / 450.0, accuracy: 1e-9)
        XCTAssertEqual(sleep.deepRatio!, 90.0 / 430.0, accuracy: 1e-9)
        XCTAssertEqual(sleep.bedtime, LocalTime(23, 30))
        XCTAssertEqual(r.hrvMs!, 50, accuracy: 1e-9)
        XCTAssertEqual(r.restingHr!, 58, accuracy: 1e-9)
        XCTAssertEqual(r.steps, 8123)
    }

    func testLongestBlockIsMainSleepAndNapsAreSeparate() {
        var raw = RawHealth()
        raw.sleep = [
            RawSleep(start: at(yesterday, 14), end: at(yesterday, 14, 40)),
            RawSleep(start: at(date, 1), end: at(date, 3)),
            RawSleep(start: at(date, 3, 30), end: at(date, 8)),
        ]
        let sleep = NightMapper.day(raw, date, zone: zone).sleep!
        XCTAssertEqual(sleep.mainSleepMinutes, 270)
        XCTAssertEqual(sleep.napMinutes, 40)
        XCTAssertNil(sleep.efficiency)
        XCTAssertNil(NightMapper.day(RawHealth(), date, zone: zone).sleep)
    }

    func testRepeatedLowSpo2() {
        var raw = RawHealth()
        raw.sleep = [RawSleep(start: at(yesterday, 23), end: at(date, 7))]
        raw.spo2 = [Sample(at(date, 2), 88), Sample(at(date, 2, 2), 87), Sample(at(date, 4), 89), Sample(at(date, 5), 96)]
        XCTAssertEqual(NightMapper.day(raw, date, zone: zone).lowSpo2Repeated, true)
        raw.spo2 = [Sample(at(date, 2), 88), Sample(at(date, 5), 96)]
        XCTAssertEqual(NightMapper.day(raw, date, zone: zone).lowSpo2Repeated, false)
    }

    func testDayActivityForMissions() {
        var raw = RawHealth()
        raw.sleep = [
            RawSleep(start: at(yesterday, 23, 40), end: at(date, 7)),
            RawSleep(start: at(date, 13, 30), end: at(date, 13, 55)),
            RawSleep(start: at(date, 22, 50), end: at(date.plusDays(1), 6, 50)),
        ]
        raw.stepsByHour = [date.atTime(12, 0): 1_300, yesterday.atTime(12, 0): 9_000]
        raw.exercises = [RawExercise(start: at(date, 19), end: at(date, 19, 30), kind: .cardio)]
        let a = NightMapper.activity(raw, date, zone: zone)
        XCTAssertEqual(a.stepsByHour, [12: 1_300])
        XCTAssertEqual(a.naps.count, 1)
        XCTAssertEqual(a.nightBedtime, date.atTime(22, 50))
        XCTAssertEqual(a.morningWake, date.atTime(7, 0))
        XCTAssertEqual(a.exercises.map(\.minutes), [30])
        XCTAssertEqual(NightMapper.map(RawHealth(), from: date.minusDays(29), to: date, zone: zone).count, 30)
    }

    func testZoneRoundTrip() {
        let t = LocalDate(2027, 4, 30).atTime(23, 30)
        XCTAssertEqual(zone.local(zone.instant(t)), t)
        XCTAssertEqual(zone.instant(t).timeIntervalSince1970, Date(timeIntervalSince1970: TimeInterval(t.epochSecond - 9 * 3600)).timeIntervalSince1970)
    }
}
