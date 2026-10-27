import Foundation
import PulseCore
import SwiftUI

/// 앱 전체 상태. 건강 앱을 읽어 오늘 계획을 만들고 저장합니다. 홈 화면, 아침 알림, 워치가 같이 씁니다.
@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var profile: Profile?
    @Published private(set) var home: HomeState?
    @Published private(set) var weekly: WeeklySummary?
    @Published private(set) var loading = false
    @Published var consented: Bool
    @Published var settings: NotificationSettings

    let store: AppStore
    let health: HealthSource
    let planner = TodayPlanner()
    lazy var metrics = Metrics(store: store)
    lazy var notifier = Notifier(store: store)
    lazy var family = FamilyModel(store: store, metrics: metrics)

    private let clock: () -> LocalDateTime
    private var zone: Zone { Zone(.current) }

    init(store: AppStore = AppStore(), health: HealthSource? = nil, clock: (() -> LocalDateTime)? = nil) {
        self.store = store
        self.health = health ?? (AppConfig.demo ? DemoHealth() : HealthKitSource())
        self.clock = clock ?? (AppConfig.demo ? { DemoHealth.now } : { LocalDateTime.now() })
        profile = store.profile
        consented = store.consentVersion >= AppConfig.consentVersion
        settings = store.settings
    }

    var today: LocalDate { clock().date }
    var now: LocalDateTime { clock() }

    // MARK: 가입

    func agree(analytics: Bool) {
        store.consentVersion = AppConfig.consentVersion
        consented = true
        metrics.setConsent(analytics)
    }

    func start(goal: Goal, seniorMode: Bool, guardianOnly: Bool, signupDate: LocalDate? = nil) async {
        let p = Profile(goal: guardianOnly ? .parent : goal, signupDate: signupDate ?? today, seniorMode: seniorMode, guardianOnly: guardianOnly)
        store.profile = p
        profile = p
        metrics.track(.signupCompleted, ["via": "app", "goal": p.goal.rawValue, "mode": guardianOnly ? "guardian" : (seniorMode ? "senior" : "standard")])
        if !guardianOnly { try? await health.requestAuthorization() }
        // 데모(스크린샷)에서는 시스템 권한 창이 화면을 가리지 않게 묻지 않습니다.
        if !AppConfig.demo { await notifier.requestPermission(metrics: metrics) }
        await refresh()
    }

    func changeGoal(_ goal: Goal) {
        guard var p = profile, p.goal != goal else { return }
        p.goal = goal
        p.goalSince = today
        store.profile = p
        profile = p
    }

    func setSeniorMode(_ on: Bool) {
        guard var p = profile else { return }
        p.seniorMode = on
        store.profile = p
        profile = p
    }

    // MARK: 오늘

    /// 건강 앱을 다시 읽고 오늘 계획을 만듭니다. [feeling]은 워치 기록이 없는 날의 자가 입력 1~5.
    func refresh(feeling: Int? = nil) async {
        guard let profile else { return }
        loading = true
        defer { loading = false }
        let now = clock()
        let today = now.date
        // 점수 기준선 28일 + 미션용 평소 취침 시각 28일, 주간 리포트의 4주 전 평균까지 읽습니다.
        let from = today.minusDays(36)
        let raw = profile.guardianOnly ? RawHealth() : await health.read(from: from, to: today, zone: zone)
        let records = NightMapper.map(raw, from: from, to: today, zone: zone)
        let before = store.today
        let logsBefore = store.missionLogs
        let plan = planner.plan(
            today: today,
            records: records,
            profile: profile,
            stored: store.today,
            logs: store.missionLogs,
            scores: store.scores,
            feeling: feeling,
            activities: [today.minusDays(1): NightMapper.activity(raw, today.minusDays(1), zone: zone), today: NightMapper.activity(raw, today, zone: zone)],
            now: now,
            retryMissionId: store.retryFor(today)
        )
        track(before: before, logsBefore: logsBefore, plan: plan, profile: profile, hasSleep: !raw.sleep.isEmpty)
        store.today = plan.today
        store.missionLogs = plan.logs
        store.scores = plan.scores

        // 사용자가 끈 신호는 홈 카드와 알림에서 뺍니다. 점수 상한(주의 신호)은 건강 판단이라 그대로 둡니다.
        var shown = plan.home
        let allowed = shown.alertDetections.filter { settings.allows($0.signal) }
        shown.alertDetections = allowed
        shown.alerts = allowed.map(AlertText.forSelf)
        home = shown
        weekly = weeklyIfDue(profile, records)

        PhoneSession.shared.publish(shown)
        await notifier.planDay(home: shown, now: now, settings: settings)
        await family.uploadSummary(shown, today: today)
    }

    private func track(before: TodayMission?, logsBefore: [MissionLog], plan: Plan, profile: Profile, hasSleep: Bool) {
        let t = plan.today
        if before == nil || before?.date != t.date || before?.missionId != t.missionId {
            metrics.track(.missionShown, ["mission_id": t.missionId, "goal": profile.goal.rawValue, "level": String(profile.level)])
        }
        if t.auto && t.completed && !(before?.date == t.date && before?.completed == true) {
            metrics.track(.missionCompleted, ["mission_id": t.missionId, "auto": "true", "surface": "watch_data"])
        }
        for log in plan.logs where log.auto && !logsBefore.contains(where: { $0.date == log.date }) {
            metrics.track(.missionCompleted, ["mission_id": log.missionId, "auto": "true", "surface": "watch_data"])
        }
        if hasSleep && !profile.guardianOnly { metrics.trackOnce(.dataFirstReceived, ["day": EventRules.dayBucket(plan.home.dayIndex)]) }
    }

    /// 미션 완료 (앱·워치·알림 버튼).
    func completeMission(surface: String = "app") async {
        guard var t = store.today, t.date == today, !t.completed else { return }
        t.completed = true
        store.today = t
        metrics.track(.missionCompleted, ["mission_id": t.missionId, "auto": "false", "surface": surface])
        await refresh()
    }

    func swapMission() async {
        guard let home, let profile, let t = store.today else { return }
        let next = planner.swap(home, t, profile: profile, logs: store.missionLogs)
        metrics.track(.missionSkipped, ["mission_id": t.missionId, "reason": "swap"])
        store.today = next
        await refresh()
    }

    /// 저녁 요약의 "내일 다시".
    func retryTomorrow(_ missionId: String) {
        store.retry = AppStore.Retry(date: today.plusDays(1), missionId: missionId)
        metrics.track(.missionSkipped, ["mission_id": missionId, "reason": "retry_tomorrow"])
    }

    // MARK: 주간 리포트

    /// 일요일 저녁(주간 리포트를 켠 경우)부터 다음 토요일까지, 확인하지 않았으면 홈에 보여줍니다.
    private func weeklyIfDue(_ profile: Profile, _ records: [DailyRecord]) -> WeeklySummary? {
        guard settings.weeklyEnabled, !profile.guardianOnly else { return nil }
        let now = clock()
        var sunday = now.date.minusDays(now.date.dayOfWeek.rawValue % 7)
        if now.date.dayOfWeek == .sunday && now.time < settings.eveningTime { sunday = sunday.minusDays(7) }
        guard sunday >= profile.signupDate.plusDays(6), store.weeklyShownFor != sunday else { return nil }
        return WeeklyReport.build(weekEnd: sunday, goal: profile.goal, level: profile.level, goalSince: profile.goalSince,
                                  logs: store.missionLogs, records: records)
    }

    func closeWeekly(acceptLevel: Bool) {
        guard let w = weekly, var p = profile else { return }
        if acceptLevel || w.levelChange == .down {
            p.levels[w.goal] = w.nextLevel
            store.profile = p
            profile = p
        }
        store.weeklyShownFor = w.weekEnd
        metrics.track(.weeklyReportViewed, ["surface": "app", "badge": String(w.badge)])
        weekly = nil
    }

    // MARK: 알림 응답

    func feedback(_ d: Detection, _ response: FeedbackResponse) {
        var entries = store.alertFeedback
        entries.append(FeedbackEntry(at: now, detection: d, response: response))
        store.alertFeedback = entries
        metrics.track(.alertFeedback, ["signal": d.signal.rawValue, "response": response.key, "recipient": "self"])
        objectWillChange.send()
    }

    func todayResponse(_ signal: Signal) -> FeedbackResponse? {
        store.alertFeedback.last { $0.detection.signal == signal && $0.at.date == today }?.response
    }

    var snoozeSuggestions: Set<Signal> {
        AlertFeedback.suggestSnooze(store.alertFeedback, today: today, snoozed: store.snoozedSignals, declinedAt: store.snoozeDeclined)
    }

    var snoozedUntil: [Signal: LocalDate] { store.snoozedSignals.filter { $0.value >= today } }

    func snooze(_ signal: Signal, accept: Bool) {
        if accept {
            store.snoozedSignals[signal] = today.plusDays(AlertFeedback.snoozeDays)
        } else {
            store.snoozeDeclined[signal] = now
        }
        objectWillChange.send()
    }

    func unsnooze(_ signal: Signal) {
        store.snoozedSignals[signal] = nil
        objectWillChange.send()
    }

    // MARK: 설정

    func updateSettings(_ s: NotificationSettings) {
        settings = s
        store.settings = s
        Task { await refresh() }
    }

    /// "기록 지우기": 이 아이폰의 펄스케어 기록, 서버 계정, 이용 통계를 지웁니다 (건강 앱 데이터는 그대로).
    func eraseEverything() async {
        await family.deleteAccount()
        metrics.forget()
        notifier.cancelAll()
        store.clear()
        profile = nil
        home = nil
        weekly = nil
        consented = false
        settings = NotificationSettings()
    }

    // MARK: 기록 탭·진료 요약

    func history(_ period: Period) async -> History? {
        guard let profile else { return nil }
        let to = today
        let from = to.minusDays(HistoryBuilder.readDays(period))
        let raw = await health.read(from: from, to: to, zone: zone)
        return HistoryBuilder.build(period: period, to: to, records: NightMapper.map(raw, from: from, to: to, zone: zone),
                                    signupDate: profile.signupDate, storedScores: store.scores, logs: store.missionLogs + [store.today].compactMap { t in
                                        t.map { MissionLog(date: $0.date, missionId: $0.missionId, completed: $0.completed, auto: $0.auto) }
                                    })
    }

    func clinicSummary(days: Int) async -> ClinicSummary? {
        guard let profile else { return nil }
        let to = today.minusDays(1)
        let from = to.minusDays(days - 1)
        let readFrom = from.minusDays(ConditionScoreEngine.baselineDays + 7)
        let raw = await health.read(from: readFrom, to: today, zone: zone)
        let summary = ClinicReport.build(from: from, to: to, records: NightMapper.map(raw, from: readFrom, to: today, zone: zone),
                                         logs: store.missionLogs, scores: store.scores) { LocalDate.daysBetween(profile.signupDate, $0) + 1 }
        metrics.track(.reportExported, ["days": String(days)])
        return summary
    }
}
