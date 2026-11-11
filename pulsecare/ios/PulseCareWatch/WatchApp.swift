import PulseCore
import SwiftUI
import WatchConnectivity

/// 애플워치 앱 (기획서 15번): 오늘 점수와 미션, 미션 완료, SOS.
/// 워치는 계산하지 않고 아이폰이 보낸 오늘 요약(WatchContract)만 보여줍니다.
@main
struct PulseCareWatchApp: App {
    @StateObject private var model = WatchModel()

    var body: some Scene {
        WindowGroup {
            TabView {
                TodayScreen().environmentObject(model)
                SosScreen().environmentObject(model)
            }
            .tabViewStyle(.verticalPage)
        }
    }
}

@MainActor
final class WatchModel: NSObject, ObservableObject, WCSessionDelegate {
    @Published private(set) var today: WatchToday?
    @Published var sosResult: String?
    @Published var sending = false

    private static let key = "today"

    override init() {
        super.init()
        if let saved = UserDefaults.standard.dictionary(forKey: Self.key) as? [String: String] { today = WatchContract.decode(saved) }
        if ProcessInfo.processInfo.arguments.contains("-demo") {
            today = WatchToday(date: LocalDate.today(), score: 58, band: .fair, reason: "안정시 심박이 평소보다 11 bpm 높아요",
                               missionId: "C-03", missionTitle: "가벼운 산책 15분", missionDone: false)
        }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    var display: WatchDisplay { WatchContract.display(today, today: LocalDate.today()) }

    func completeMission() {
        guard var t = today else { return }
        t.missionDone = true
        apply(t)
        send(["path": WatchContract.pathMissionDone], fallback: true)
    }

    func sos() {
        sending = true
        sosResult = nil
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else {
            // 아이폰이 멀리 있으면 메시지가 바로 가지 않아 나중에라도 전달되게 넣어 두고 사실대로 알립니다.
            session.transferUserInfo(["path": WatchContract.pathSos])
            sending = false
            sosResult = WatchContract.sosFailed
            return
        }
        session.sendMessage(["path": WatchContract.pathSos], replyHandler: { reply in
            let result = reply[WatchContract.pathSosResult] as? String
            Task { @MainActor in
                self.sending = false
                self.sosResult = result ?? WatchContract.sosFailed
            }
        }, errorHandler: { _ in
            Task { @MainActor in
                self.sending = false
                self.sosResult = WatchContract.sosFailed
            }
        })
    }

    func event(_ text: String) {
        send(["path": WatchContract.pathEvent, "event": text], fallback: false)
    }

    private func send(_ m: [String: Any], fallback: Bool) {
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        if session.isReachable {
            session.sendMessage(m, replyHandler: nil) { _ in if fallback { session.transferUserInfo(m) } }
        } else if fallback {
            session.transferUserInfo(m)
        }
    }

    private func apply(_ t: WatchToday) {
        today = t
        UserDefaults.standard.set(WatchContract.encode(t), forKey: Self.key)
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        Task { @MainActor in self.receive(context) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.receive(applicationContext) }
    }

    private func receive(_ context: [String: Any]) {
        guard let map = context[WatchContract.pathToday] as? [String: String], let t = WatchContract.decode(map) else { return }
        apply(t)
    }
}

struct TodayScreen: View {
    @EnvironmentObject private var model: WatchModel

    var body: some View {
        let d = model.display
        ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(d.score).font(.system(size: 44, weight: .bold, design: .rounded))
                    Text(d.label).font(.system(size: 15, weight: .semibold)).foregroundStyle(color)
                }
                Text(d.reason).font(.system(size: 14)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                if !d.mission.isEmpty {
                    Divider().padding(.vertical, 4)
                    Text("오늘의 미션").font(.system(size: 12, weight: .bold)).foregroundStyle(Color(red: 0.5, green: 0.82, blue: 0.74))
                    Text(d.mission).font(.system(size: 16, weight: .semibold)).fixedSize(horizontal: false, vertical: true)
                    if d.missionDone {
                        Label("완료했어요", systemImage: "checkmark.circle.fill").font(.system(size: 14)).foregroundStyle(.green)
                    } else if !d.stale {
                        Button("완료했어요") { model.completeMission() }.tint(Color(red: 0.06, green: 0.48, blue: 0.4))
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .onAppear { if model.today != nil { model.event("score_viewed|app|\(model.today?.score == nil ? "NO_DATA" : "FULL")") } }
    }

    private var color: Color {
        switch model.today?.band {
        case .peak, .good: Color(red: 0.5, green: 0.82, blue: 0.74)
        case .fair: Color(red: 0.9, green: 0.65, blue: 0.3)
        case .low, .veryLow: Color(red: 0.95, green: 0.5, blue: 0.35)
        case nil: .secondary
        }
    }
}

/// SOS: 길게 눌러 보냅니다 (잘못 눌림 방지). 보호자에게 갔는지 사실대로 보여줍니다.
struct SosScreen: View {
    @EnvironmentObject private var model: WatchModel

    var body: some View {
        VStack(spacing: 8) {
            if model.sending {
                ProgressView()
                Text("휴대폰에 알리는 중").font(.system(size: 14))
            } else if let result = model.sosResult {
                let text = WatchContract.sosText(result)
                Text(text.title).font(.system(size: 16, weight: .bold)).multilineTextAlignment(.center)
                Text(text.body).font(.system(size: 12)).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Button("닫기") { model.sosResult = nil }
            } else {
                Text("도움이 필요하면 길게 누르세요").font(.system(size: 13)).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Circle()
                    .fill(Color(red: 0.75, green: 0.15, blue: 0.15))
                    .overlay(Text("SOS").font(.system(size: 28, weight: .heavy)).foregroundStyle(.white))
                    .frame(width: 110, height: 110)
                    .onLongPressGesture(minimumDuration: 1.5) { model.sos() }
                Text("위급하면 측면 버튼을 길게 눌러 긴급 SOS").font(.system(size: 11)).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 6)
    }
}
