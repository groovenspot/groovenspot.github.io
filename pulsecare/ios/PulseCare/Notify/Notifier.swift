import Foundation
import PulseCore
import UserNotifications

/// 아침 리포트·저녁 요약·주의 알림 (기획서 12번). 아이폰은 앱이 정해진 시각에 깨어 있지 않을 수 있어,
/// 먼저 숫자 없는 기본 알림을 7일치 예약해 두고, 앱이 계산할 때마다 오늘 것을 실제 내용으로 바꿉니다.
/// 잠금화면 미리보기는 알림 종류별 가림 문구(hiddenPreviewsBodyPlaceholder)가 대신 보입니다.
final class Notifier: @unchecked Sendable {
    enum Category {
        static let morning = "MORNING"
        static let evening = "EVENING"
        static let caution = "CAUTION"
        // 서버 푸시 종류 (서버 PushMessage.type).
        static let emergency = "EMERGENCY"
        static let emergencyClosed = "EMERGENCY_CLOSED"
        static let emergencyAck = "EMERGENCY_ACK"
        static let guardianAlert = "GUARDIAN_ALERT"
        static let digest = "DIGEST"
        static let linked = "LINKED"
    }

    enum Action {
        static let done = "MISSION_DONE"
        static let retry = "RETRY"
        static let other = "OTHER_MISSION"
        static let ok = "ALERT_OK"
        static let falseAlarm = "ALERT_FALSE"
        static let ack = "EMERGENCY_ACK_ACTION"
        static let cancel = "EMERGENCY_CANCEL"
    }

    private let store: AppStore
    private let center = UNUserNotificationCenter.current()

    init(store: AppStore) { self.store = store }

    func registerCategories() {
        let quiet = AlertText.lockScreen(.caution)
        let urgent = AlertText.lockScreen(.emergency)
        func category(_ id: String, _ actions: [UNNotificationAction], _ placeholder: String) -> UNNotificationCategory {
            UNNotificationCategory(identifier: id, actions: actions, intentIdentifiers: [], hiddenPreviewsBodyPlaceholder: placeholder, options: [])
        }
        center.setNotificationCategories([
            category(Category.morning, [UNNotificationAction(identifier: Action.done, title: "미션 완료했어요")], MorningReport.publicText),
            category(Category.evening, [
                UNNotificationAction(identifier: Action.retry, title: EveningSummary.retry),
                UNNotificationAction(identifier: Action.other, title: EveningSummary.other, options: [.foreground]),
            ], quiet),
            category(Category.caution, [
                UNNotificationAction(identifier: Action.ok, title: FeedbackResponse.ok.label),
                UNNotificationAction(identifier: Action.falseAlarm, title: FeedbackResponse.falseAlarm.label),
            ], quiet),
            category(Category.emergency, [
                UNNotificationAction(identifier: Action.ack, title: "확인했어요", options: [.foreground]),
            ], urgent),
            category(Category.emergencyAck, [UNNotificationAction(identifier: Action.cancel, title: "취소하기", options: [.destructive])], urgent),
            category(Category.emergencyClosed, [], quiet),
            category(Category.guardianAlert, [], quiet),
            category(Category.digest, [], quiet),
            category(Category.linked, [], quiet),
        ])
    }

    func requestPermission(metrics: Metrics) async {
        registerCategories()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        metrics.track(.pushPermissionChanged, ["granted": String(granted)])
    }

    func cancelAll() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }

    /// 오늘 계획이 바뀔 때마다: 아침·저녁 알림 내용을 고치고, 새 주의 신호를 알림 규칙대로 예약합니다.
    func planDay(home: HomeState, now: LocalDateTime, settings: NotificationSettings) async {
        let guardianOnly = store.profile?.guardianOnly == true

        // 아침 리포트: 앞으로 7일 기본 문구, 오늘 아직 시각 전이면 실제 내용.
        var morningIds = [String]()
        for offset in 0..<7 {
            let day = now.date.plusDays(offset)
            let id = "morning-\(day)"
            morningIds.append(id)
            let at = day.atTime(settings.morningTime)
            guard settings.morningEnabled, at > now else { continue }
            let text: MorningReport.Text
            if offset == 0 && !guardianOnly {
                text = MorningReport.of(home)
            } else {
                text = MorningReport.Text(title: "펄스케어", body: guardianOnly ? MorningReport.guardianPublic : MorningReport.publicText)
            }
            await schedule(id: id, title: text.title, body: text.body, category: Category.morning, at: at)
        }
        if !settings.morningEnabled { center.removePendingNotificationRequests(withIdentifiers: morningIds) }

        // 저녁 요약: 미션을 못 했거나 전할 정보 알림이 있을 때만.
        let eveningId = "evening-\(now.date)"
        let eveningAt = now.date.atTime(settings.eveningTime)
        let infoBodies = home.alertDetections.filter { $0.signal.grade == .info }.map { AlertText.forSelf($0).body }
        if settings.eveningEnabled, eveningAt > now, !guardianOnly,
           let text = EveningSummary.of(home.mission, done: home.missionDone, infoBodies: infoBodies) {
            await schedule(id: eveningId, title: text.title, body: text.body, category: text.askRetry ? Category.evening : Category.morning,
                           at: eveningAt, userInfo: ["missionId": home.mission.id])
        } else {
            center.removePendingNotificationRequests(withIdentifiers: [eveningId])
        }

        // 주의 신호: 빈도 제한·방해 금지·확인 후 24시간 규칙 (AlertScheduler).
        let scheduler = AlertScheduler(settings: settings.schedulerSettings)
        let sent = store.sentAlerts(now.date)
        let sentToday = home.alertDetections.filter { sent.contains($0.signal.rawValue) }.map { PendingAlert($0, .selfUser, createdAt: now) }
        let state = DeliveryState(sentToday: sentToday, acknowledged: AlertFeedback.acknowledged(store.alertFeedback))
        for d in home.alertDetections where d.signal.grade == .caution && !sent.contains(d.signal.rawValue) {
            if AlertFeedback.isSnoozed(d.signal, store.snoozedSignals, today: now.date) { continue }
            let message = AlertText.forSelf(d)
            let info = Self.userInfo(d)
            switch scheduler.decide(PendingAlert(d, .selfUser, createdAt: now), now: now, state: state) {
            case .sendNow:
                await schedule(id: "caution-\(now.date)-\(d.signal.rawValue)", title: message.title, body: message.body, category: Category.caution, at: nil, userInfo: info)
                store.markAlertSent(now.date, d.signal.rawValue)
            case let .sendAt(time, _):
                await schedule(id: "caution-\(now.date)-\(d.signal.rawValue)", title: message.title, body: message.body, category: Category.caution, at: time, userInfo: info)
                store.markAlertSent(now.date, d.signal.rawValue)
            case .drop:
                break
            }
        }
    }

    /// 알림 버튼으로 받은 응답을 신호로 되돌리기 위한 값.
    static func userInfo(_ d: Detection) -> [String: Any] {
        var o: [String: Any] = ["signal": d.signal.rawValue]
        if let u = d.usual { o["usual"] = u }
        if let c = d.current { o["current"] = c }
        if let n = d.days { o["days"] = n }
        return o
    }

    static func detection(_ info: [AnyHashable: Any]) -> Detection? {
        guard let name = info["signal"] as? String, let signal = Signal(rawValue: name) else { return nil }
        return Detection(signal, usual: info["usual"] as? Double, current: info["current"] as? Double, days: info["days"] as? Int)
    }

    private func schedule(id: String, title: String, body: String, category: String, at: LocalDateTime?, userInfo: [String: Any] = [:]) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.categoryIdentifier = category
        content.sound = .default
        content.userInfo = userInfo
        content.threadIdentifier = category
        let trigger: UNNotificationTrigger?
        if let at {
            var c = DateComponents()
            c.year = at.date.year
            c.month = at.date.month
            c.day = at.date.day
            c.hour = at.time.hour
            c.minute = at.time.minute
            trigger = UNCalendarNotificationTrigger(dateMatching: c, repeats: false)
        } else {
            trigger = nil
        }
        try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    /// 서버 푸시(보호자 알림)가 앱이 켜져 있을 때 왔을 때도 보이도록.
    static func presentationOptions() -> UNNotificationPresentationOptions { [.banner, .sound, .list] }
}
