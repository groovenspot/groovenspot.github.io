import Foundation
import PulseCore
import UserNotifications
import WatchConnectivity

/// 애플워치와 주고받기. 오늘 요약은 applicationContext로 (워치가 나중에 켜져도 최신 것 하나),
/// 미션 완료·SOS·이용 통계는 워치가 보내는 메시지로 받습니다. 키는 안드로이드 워치와 같은 WatchContract.
final class PhoneSession: NSObject, WCSessionDelegate, @unchecked Sendable {
    static let shared = PhoneSession()

    @MainActor weak var model: AppModel?
    private var pending: [String: String]?

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func publish(_ home: HomeState) {
        let context = WatchContract.encode(home.watchToday)
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else {
            pending = context
            return
        }
        guard session.isPaired, session.isWatchAppInstalled else { return }
        try? session.updateApplicationContext([WatchContract.pathToday: context])
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated, let pending, session.isPaired, session.isWatchAppInstalled {
            try? session.updateApplicationContext([WatchContract.pathToday: pending])
            self.pending = nil
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) { session.activate() }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handle(message, reply: nil)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        handle(message, reply: replyHandler)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handle(userInfo, reply: nil)
    }

    private func handle(_ message: [String: Any], reply: (([String: Any]) -> Void)?) {
        guard let path = message["path"] as? String else {
            reply?([:])
            return
        }
        Task { @MainActor in
            guard let model = self.model else {
                reply?([WatchContract.pathSosResult: WatchContract.sosNoAccount])
                return
            }
            switch path {
            case WatchContract.pathMissionDone:
                await model.completeMission(surface: "watch")
                reply?([:])
            case WatchContract.pathSos:
                let result = await model.family.sos()
                model.notifier.sosSent(result)
                reply?([WatchContract.pathSosResult: result.code])
            case WatchContract.pathEvent:
                // "score_viewed|tile|FULL"처럼 이름|속성들. 사전에 없는 이벤트는 버립니다.
                if let text = message["event"] as? String {
                    let parts = text.split(separator: "|").map(String.init)
                    if let name = parts.first.flatMap(EventName.of) {
                        switch name {
                        case .scoreViewed: model.metrics.trackDaily(name, key: "watch", ["surface": parts.count > 1 ? parts[1] : "watch", "kind": parts.count > 2 ? parts[2] : ""])
                        case .watchLinked: model.metrics.trackOnce(name, ["platform": "watchos"])
                        default: model.metrics.track(name, ["surface": "watch"])
                        }
                    }
                }
                reply?([:])
            default:
                reply?([:])
            }
        }
    }
}

extension Notifier {
    /// 워치 SOS 결과를 아이폰에도 사실대로 남깁니다 (보호자에게 갔는지, 못 갔는지).
    func sosSent(_ result: SosResult) {
        let text = WatchContract.sosText(result.code)
        let content = UNMutableNotificationContent()
        content.title = text.title
        content.body = text.body
        content.sound = .default
        if case let .sent(id, _) = result {
            content.categoryIdentifier = Category.emergencyAck
            content.userInfo = ["emergencyId": id]
        }
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "sos-\(Date().timeIntervalSince1970)", content: content, trigger: nil))
    }
}
