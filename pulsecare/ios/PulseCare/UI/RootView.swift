import PulseCore
import SwiftUI

/// 동의 → 목표 → 탭(오늘·기록·가족). 보호자 전용이면 탭은 부모님·가족 두 개.
struct RootView: View {
    @EnvironmentObject private var model: AppModel
    @State private var tab = Tab.today
    @State private var sheet: Sheet?

    enum Tab: Hashable { case today, history, family }

    enum Sheet: String, Identifiable {
        case chat, settings
        var id: String { rawValue }
    }

    var body: some View {
        Group {
            if !model.consented {
                ConsentView()
            } else if model.profile == nil {
                GoalView()
            } else {
                tabs
            }
        }
        .tint(Palette.teal)
        .task {
            if AppConfig.demo { await prepareDemo() }
        }
    }

    private var tabs: some View {
        let guardianOnly = model.profile?.guardianOnly == true
        return TabView(selection: $tab) {
            Group {
                if guardianOnly {
                    GuardianHomeView(onOpenFamily: { tab = .family }, onOpenSettings: { sheet = .settings })
                } else if model.profile?.seniorMode == true {
                    EasyHomeView(onOpenSettings: { sheet = .settings })
                } else {
                    HomeView(onOpenChat: { sheet = .chat }, onOpenSettings: { sheet = .settings })
                }
            }
            .tabItem { Label(guardianOnly ? "부모님" : "오늘", systemImage: guardianOnly ? "heart.text.square" : "sun.max") }
            .tag(Tab.today)

            if !guardianOnly {
                HistoryView()
                    .tabItem { Label("기록", systemImage: "chart.xyaxis.line") }
                    .tag(Tab.history)
            }

            FamilyView()
                .tabItem { Label("가족", systemImage: "person.2") }
                .tag(Tab.family)
        }
        .sheet(item: $sheet) { s in
            Group {
                switch s {
                case .chat: ChatView()
                case .settings: SettingsView()
                }
            }
            .environmentObject(model)
            .environmentObject(model.family)
        }
    }

    /// 스크린샷용: 동의와 가입을 건너뛰고 원하는 화면을 엽니다.
    private func prepareDemo() async {
        let screen = AppConfig.demoScreen ?? "home"
        if screen == "consent" { return }
        model.agree(analytics: false)
        if screen == "goal" { return }
        if model.profile == nil {
            // 지난 2주 미션 기록 (주 5일 정도 완료) — 주간 리포트와 미션 달력용.
            let today = DemoHealth.now.date
            model.store.missionLogs = (1...14).map { ago in
                MissionLog(date: today.minusDays(ago), missionId: ["S-01", "S-04", "S-03", "S-02"][ago % 4], completed: ago % 7 != 3 && ago % 7 != 5, auto: ago % 3 == 0)
            }
            let guardian = screen == "guardian"
            await model.start(goal: guardian ? .parent : .sleep, seniorMode: screen == "easy", guardianOnly: guardian,
                              signupDate: DemoHealth.now.date.minusDays(40))
        }
        switch screen {
        case "history": tab = .history
        case "family": tab = .family
        case "chat": sheet = .chat
        case "settings": sheet = .settings
        default: tab = .today
        }
    }
}
