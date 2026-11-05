import Foundation
import PulseCore

/// 이용 통계 (기획서 22번, 선택 동의). 동의하지 않았으면 아무것도 모으지 않습니다.
/// 계정과 분리된 무작위 설치 ID만 붙이고, 점수·수치·이름은 이벤트 사전(EventName)에 없어 보낼 수 없습니다.
final class Metrics: @unchecked Sendable {
    private let store: AppStore
    private let lock = NSLock()
    private let file: URL
    static let maxQueued = 2000

    init(store: AppStore) {
        self.store = store
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        file = dir.appendingPathComponent("events.jsonl")
    }

    var enabled: Bool { store.analyticsConsent }

    func track(_ name: EventName, _ props: [String: String] = [:]) {
        guard enabled else { return }
        let line: [String: Any] = [
            "name": name.key,
            "at": Int64(Date().timeIntervalSince1970 * 1000),
            "props": EventRules.clean(name, props),
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: line), let text = String(data: data, encoding: .utf8) else { return }
        locked { write(Array((read() + [text]).suffix(Self.maxQueued))) }
    }

    /// 하루에 한 번만 (같은 화면에서 점수를 여러 번 봐도 한 번).
    func trackDaily(_ name: EventName, key: String, _ props: [String: String] = [:]) {
        guard enabled else { return }
        let mark = "\(LocalDate.today())|\(name.key)|\(key)"
        guard store.lastDailyEvent("\(name.key)_\(key)") != mark else { return }
        store.setLastDailyEvent("\(name.key)_\(key)", mark)
        track(name, props)
    }

    /// 처음 한 번만 (워치 연결, 첫 기록).
    func trackOnce(_ name: EventName, _ props: [String: String] = [:]) {
        guard enabled, !store.onceSent(name.key) else { return }
        store.markOnce(name.key)
        track(name, props)
    }

    /// 켜고 끄기. 끄면 모아 둔 것을 버리고 서버에서도 지웁니다.
    func setConsent(_ on: Bool) {
        if on {
            store.analyticsConsent = true
            track(.consentUpdated, ["item": "analytics", "granted": "true"])
        } else {
            store.analyticsConsent = false
            clear()
            forget()
        }
    }

    func forget() {
        guard AppConfig.serverConfigured else { return }
        let id = store.installId
        Task.detached { try? await ServerApi(baseUrl: AppConfig.serverUrl).forgetEvents(installId: id) }
    }

    func clear() {
        locked { try? FileManager.default.removeItem(at: file) }
    }

    var queued: Int { locked { read().count } }

    private func locked<T>(_ body: () -> T) -> T {
        lock.lock()
        defer { lock.unlock() }
        return body()
    }

    /// 모아 둔 것을 보냅니다. 보낸 개수, 실패하면 -1.
    @discardableResult
    func flush() async -> Int {
        guard AppConfig.serverConfigured, enabled else { return 0 }
        var sent = 0
        while true {
            let batch: [String] = locked { Array(read().prefix(EventRules.maxBatch)) }
            if batch.isEmpty { return sent }
            let events = batch.compactMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) }
            let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
            let body: [String: Any] = ["installId": store.installId, "appVersion": "ios-\(version)", "events": events]
            do {
                try await ServerApi(baseUrl: AppConfig.serverUrl).sendEvents(body)
            } catch {
                return -1
            }
            locked { write(Array(read().dropFirst(batch.count))) }
            sent += batch.count
        }
    }

    private func read() -> [String] {
        guard let text = try? String(contentsOf: file, encoding: .utf8) else { return [] }
        return text.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
    }

    private func write(_ lines: [String]) {
        try? lines.joined(separator: "\n").write(to: file, atomically: true, encoding: .utf8)
    }
}
