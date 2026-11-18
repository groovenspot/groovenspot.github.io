import AppIntents
import PulseCore
import WidgetKit

/// 단축어·Siri가 앱 모델에 닿는 곳. 앱이 백그라운드로 깨어나 실행될 때도 같은 모델을 씁니다.
@MainActor
enum AppHolder {
    static var model: AppModel?

    static var current: AppModel {
        if let model { return model }
        let m = AppModel()
        model = m
        return m
    }
}

/// "펄스케어 오늘 컨디션": 앱을 열지 않고 점수와 미션을 말해 줍니다.
struct TodayScoreIntent: AppIntent {
    static var title: LocalizedStringResource = "오늘 컨디션"
    static var description = IntentDescription("오늘 컨디션 점수와 이유, 오늘의 미션을 알려줘요.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = AppHolder.current
        if model.home == nil { await model.refresh() }
        guard let t = SharedToday.load() else {
            return .result(dialog: "펄스케어를 한 번 열어 오늘 컨디션을 계산해 주세요.")
        }
        let d = WatchContract.display(t, today: LocalDate.today())
        let score = t.score.map { "오늘 컨디션은 \($0)점, \(d.label)이에요. " } ?? "어젯밤 워치 기록이 없어요. "
        let mission = t.missionDone ? "오늘 미션은 이미 끝냈어요." : "오늘의 미션은 \(t.missionTitle)예요."
        return .result(dialog: IntentDialog(stringLiteral: score + (t.score == nil ? "" : t.reason + ". ") + mission))
    }
}

/// "펄스케어 미션 완료".
struct CompleteMissionIntent: AppIntent {
    static var title: LocalizedStringResource = "오늘 미션 완료"
    static var description = IntentDescription("오늘의 미션을 완료로 체크해요.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = AppHolder.current
        if model.home == nil { await model.refresh() }
        guard let home = model.home else { return .result(dialog: "펄스케어를 한 번 열어 주세요.") }
        if home.missionDone { return .result(dialog: "오늘 미션은 이미 끝냈어요. 잘하셨어요!") }
        await model.completeMission(surface: "shortcut")
        return .result(dialog: IntentDialog(stringLiteral: "\(home.mission.title), 완료로 체크했어요."))
    }
}

/// "펄스케어 1분 호흡": 앱을 열어 호흡 가이드를 바로 시작합니다.
struct StartBreathingIntent: AppIntent {
    static var title: LocalizedStringResource = "1분 호흡"
    static var description = IntentDescription("1분 호흡 가이드를 열어요.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        AppHolder.current.openRequest = "breathing"
        return .result()
    }
}

/// "펄스케어 약 먹었어요": 지금 먹을 시각이 지난 약 중 가장 이른 것을 체크합니다.
struct TakeMedicationIntent: AppIntent {
    static var title: LocalizedStringResource = "약 먹었어요"
    static var description = IntentDescription("지금 먹을 약을 체크해요.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = AppHolder.current
        let due = model.todayDoses.filter { !$0.taken && $0.time <= model.now.time }
        guard let dose = due.first else {
            let text = model.care.medications.isEmpty ? "등록한 약이 없어요. 앱의 내 정보 > 약 알림에서 넣어 주세요." : "지금 체크할 약이 없어요."
            return .result(dialog: IntentDialog(stringLiteral: text))
        }
        await model.markTaken(dose)
        return .result(dialog: IntentDialog(stringLiteral: "\(timeLabel(dose.time)) \(dose.medication.name), 먹었다고 체크했어요."))
    }
}

struct PulseCareShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: TodayScoreIntent(), phrases: ["\(.applicationName) 오늘 컨디션", "\(.applicationName) 점수 알려줘"],
                    shortTitle: "오늘 컨디션", systemImageName: "heart.text.square")
        AppShortcut(intent: CompleteMissionIntent(), phrases: ["\(.applicationName) 미션 완료", "\(.applicationName) 오늘 미션 했어"],
                    shortTitle: "미션 완료", systemImageName: "checkmark.circle")
        AppShortcut(intent: StartBreathingIntent(), phrases: ["\(.applicationName) 1분 호흡", "\(.applicationName) 호흡 시작"],
                    shortTitle: "1분 호흡", systemImageName: "wind")
        AppShortcut(intent: TakeMedicationIntent(), phrases: ["\(.applicationName) 약 먹었어", "\(.applicationName) 약 체크"],
                    shortTitle: "약 먹었어요", systemImageName: "pills")
    }
}
