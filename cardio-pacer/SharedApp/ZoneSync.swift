import Foundation
import WatchConnectivity

/// Keeps the zone profile in sync between the iPhone and Apple Watch apps.
///
/// Uses the application context: only the latest profile matters, and the system
/// delivers it whenever the other device next becomes reachable.
final class ZoneSync: NSObject, ObservableObject {
    static let shared = ZoneSync()

    private static let profileKey = "profile"

    /// iPhone only: whether a paired watch has Cardio Pacer installed.
    @Published private(set) var isCounterpartInstalled = false

    private weak var store: ZoneSettingsStore?
    private var pending: ZoneProfile?

    private var session: WCSession? {
        WCSession.isSupported() ? WCSession.default : nil
    }

    /// Call once at launch, before any `send`.
    func activate(store: ZoneSettingsStore) {
        self.store = store
        guard let session else { return }
        session.delegate = self
        session.activate()
    }

    /// Sends a profile changed on this device to the other one.
    func send(_ profile: ZoneProfile) {
        guard let session else { return }
        guard session.activationState == .activated else {
            pending = profile
            return
        }
        guard let data = try? JSONEncoder().encode(profile) else { return }
        do {
            try session.updateApplicationContext([
                Self.profileKey: data,
                // Makes every send a change, so the other side always receives it.
                "sentAt": Date().timeIntervalSince1970,
            ])
        } catch {
            pending = profile
        }
    }

    #if DEBUG
    func showScreenshotCounterpart() {
        isCounterpartInstalled = true
    }
    #endif

    private func apply(_ context: [String: Any]) {
        guard let data = context[Self.profileKey] as? Data,
              let profile = try? JSONDecoder().decode(ZoneProfile.self, from: data) else { return }
        DispatchQueue.main.async {
            guard let store = self.store, store.profile != profile else { return }
            store.save(profile)
        }
    }

    private func refreshCounterpartState(_ session: WCSession) {
        #if os(iOS)
        let installed = session.isPaired && session.isWatchAppInstalled
        #else
        let installed = session.isCompanionAppInstalled
        #endif
        DispatchQueue.main.async { self.isCounterpartInstalled = installed }
    }
}

extension ZoneSync: WCSessionDelegate {
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        guard activationState == .activated else { return }
        refreshCounterpartState(session)
        apply(session.receivedApplicationContext)
        DispatchQueue.main.async {
            if let pending = self.pending {
                self.pending = nil
                self.send(pending)
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    #if os(iOS)
    func sessionWatchStateDidChange(_ session: WCSession) {
        refreshCounterpartState(session)
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // The user switched watches; reconnect to the new one.
        session.activate()
    }
    #endif
}
