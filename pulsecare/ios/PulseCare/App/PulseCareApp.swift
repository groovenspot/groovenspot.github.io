import BackgroundTasks
import PulseCore
import SwiftUI
import UIKit
import UserNotifications

@main
struct PulseCareApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(delegate.model)
                .environmentObject(delegate.model.family)
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                delegate.model.metrics.trackDaily(.appOpened, key: "app", ["source": "launcher"])
                Task { await delegate.model.refresh() }
            case .background:
                AppDelegate.scheduleRefresh()
                Task { await delegate.model.metrics.flush() }
            default:
                break
            }
        }
    }
}

/// 푸시 토큰, 알림 버튼, 백그라운드 새로고침.
@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    nonisolated static let refreshTask = "com.groovenspot.pulsecare.refresh"

    /// 단축어(App Intents)와 같은 모델을 씁니다.
    lazy var model: AppModel = AppHolder.current

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        model.notifier.registerCategories()
        PhoneSession.shared.model = model
        PhoneSession.shared.activate()
        if !AppConfig.demo {
            application.registerForRemoteNotifications()
            BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.refreshTask, using: nil) { task in
                Self.handleRefresh(task, model: self)
            }
            (model.health as? HealthKitSource)?.enableSleepDelivery { [weak self] in
                await self?.model.refresh()
            }
        }
        return true
    }

    // MARK: 백그라운드 새로고침

    /// 아침 리포트 시각 조금 전에 깨워 달라고 요청합니다. iOS가 정확한 시각을 보장하지는 않아
    /// 기본 문구 알림이 미리 예약돼 있고, 깨어나면 실제 점수로 바꿉니다.
    nonisolated static func scheduleRefresh() {
        guard !AppConfig.demo else { return }
        let request = BGAppRefreshTaskRequest(identifier: refreshTask)
        let settings = AppStore().settings
        let now = LocalDateTime.now()
        var at = now.date.atTime(settings.morningTime).plusMinutes(-30)
        if at <= now { at = at.plusDays(1) }
        request.earliestBeginDate = Zone(.current).instant(at)
        try? BGTaskScheduler.shared.submit(request)
    }

    private nonisolated static func handleRefresh(_ task: BGTask, model owner: AppDelegate) {
        scheduleRefresh()
        let work = Task { @MainActor in
            await owner.model.refresh()
            await owner.model.metrics.flush()
            task.setTaskCompleted(success: true)
        }
        task.expirationHandler = { work.cancel() }
    }

    // MARK: 푸시

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // 서버는 "apns:" 접두어를 보고 FCM 대신 APNs로 보냅니다.
        let token = "apns:" + deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { @MainActor in await model.family.registerPushToken(token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {}

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        Notifier.presentationOptions()
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        let model = await MainActor.run { self.model }
        switch response.actionIdentifier {
        case Notifier.Action.done:
            await model.completeMission(surface: "notification")
        case Notifier.Action.retry:
            if let id = info["missionId"] as? String { await MainActor.run { model.retryTomorrow(id) } }
        case Notifier.Action.ok, Notifier.Action.falseAlarm:
            if let d = Notifier.detection(info) {
                await MainActor.run { model.feedback(d, response.actionIdentifier == Notifier.Action.ok ? .ok : .falseAlarm) }
            }
        case Notifier.Action.ack:
            if let id = info["emergencyId"] as? String { _ = await model.family.ack(id) }
        case Notifier.Action.cancel:
            if let id = info["emergencyId"] as? String { _ = await model.family.cancel(id) }
        case Notifier.Action.doseTaken:
            if let id = info["medicationId"] as? String, let t = (info["time"] as? String).flatMap(LocalTime.init(iso:)) {
                await MainActor.run {
                    model.care.markTaken(id, t, now: model.now)
                    model.notifier.doseTaken(id, t, on: model.today)
                }
            }
        default:
            break
        }
    }
}
