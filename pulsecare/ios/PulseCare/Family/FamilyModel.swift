import Foundation
import PulseCore

/// 워치 SOS를 보낸 결과. 워치와 폰 알림이 이걸 보고 사실대로 말합니다.
enum SosResult {
    case sent(emergencyId: String, guardians: Int)
    /// 서버 설정 전이거나 가족 계정이 없음.
    case noAccount
    case failed(String)

    var code: String {
        switch self {
        case let .sent(_, n): WatchContract.sosSent(n)
        case .noAccount: WatchContract.sosNoAccount
        case .failed: WatchContract.sosFailed
        }
    }
}

/// 가족 서버와 이 아이폰의 계정을 잇습니다. 서버가 설정되지 않은 빌드에서는 아무것도 하지 않습니다.
@MainActor
final class FamilyModel: ObservableObject {
    @Published private(set) var me: Person?
    @Published private(set) var family: Family?
    @Published var error: String?
    @Published private(set) var busy = false

    private let store: AppStore
    private let metrics: Metrics

    init(store: AppStore, metrics: Metrics) {
        self.store = store
        self.metrics = metrics
    }

    var configured: Bool { AppConfig.serverConfigured }
    var hasAccount: Bool { configured && store.account != nil }
    var myId: String? { store.account?.userId }

    private var api: ServerApi? {
        guard configured, let token = store.account?.token else { return nil }
        return ServerApi(baseUrl: AppConfig.serverUrl, token: token)
    }

    private func run(_ work: () async throws -> Void) async {
        busy = true
        defer { busy = false }
        do {
            error = nil
            try await work()
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// 가족 탭에서 처음 시작: 계정을 만들고 이름·전화번호·푸시 토큰을 올립니다.
    func start(name: String, phone: String?) async {
        await run {
            let (id, token) = try await ServerApi(baseUrl: AppConfig.serverUrl).signUp(name: name)
            store.account = (id, token)
            let phoneValue = phone.flatMap { $0.trimmingCharacters(in: .whitespaces).isEmpty ? nil : $0 }
            me = try await ServerApi(baseUrl: AppConfig.serverUrl, token: token).updateMe(phone: phoneValue, pushToken: store.pushToken)
            try await reloadFamily()
        }
    }

    /// 새 아이폰에서 코드로 기존 가족 계정을 불러옵니다. 옛 폰은 바로 로그아웃돼요.
    func restore(code: String) async {
        await run {
            let (id, token) = try await ServerApi(baseUrl: AppConfig.serverUrl).redeemTransfer(code: code)
            store.account = (id, token)
            me = try await ServerApi(baseUrl: AppConfig.serverUrl, token: token).updateMe(pushToken: store.pushToken)
            try await reloadFamily()
        }
    }

    func load() async {
        guard let api else { return }
        await run {
            me = try await api.me()
            try await reloadFamily()
        }
        metrics.track(.familyViewOpened, [
            "wearers": String(family?.wearers.count ?? 0),
            "guardians": String(family?.guardians.count ?? 0),
        ])
    }

    private func reloadFamily() async throws {
        guard let api else { return }
        let f = try await api.family()
        family = f
        store.guardianCount = f.guardians.count
    }

    func transferCode() async -> Invite? {
        var out: Invite?
        await run { out = try await api?.transferCode() }
        return out
    }

    /// [role]: 내가 맡을 역할. "GUARDIAN"(부모님 초대) 또는 "WEARER"(보호자 초대).
    func invite(role: String) async -> Invite? {
        var out: Invite?
        await run { out = try await api?.invite(role: role) }
        if out != nil { metrics.track(.familyInviteSent, ["role": role]) }
        return out
    }

    func preview(code: String) async -> (inviterName: String, inviterRole: String)? {
        var out: (inviterName: String, inviterRole: String)?
        await run { out = try await api?.preview(code: code) }
        return out
    }

    func accept(code: String, role: String) async {
        await run {
            guard let api else { return }
            let f = try await api.accept(code: code)
            family = f
            store.guardianCount = f.guardians.count
        }
        if error == nil { metrics.track(.familyInviteAccepted, ["role": role]) }
    }

    func unlink(_ userId: String, role: String) async {
        await run {
            guard let api else { return }
            let f = try await api.unlink(userId: userId)
            family = f
            store.guardianCount = f.guardians.count
        }
        if error == nil { metrics.track(.familyMemberRemoved, ["role": role]) }
    }

    func order(_ ids: [String]) async {
        await run {
            guard let api else { return }
            family = try await api.order(guardianIds: ids)
        }
    }

    func ack(_ id: String) async -> Bool {
        guard let api else { return false }
        do {
            _ = try await api.ack(id)
            try? await reloadFamily()
            return true
        } catch {
            return false
        }
    }

    func cancel(_ id: String) async -> Bool {
        guard let api else { return false }
        do {
            _ = try await api.cancel(id)
            return true
        } catch {
            return false
        }
    }

    /// 워치·아이폰 SOS.
    func sos() async -> SosResult {
        guard let api else { return .noAccount }
        do {
            let (id, n) = try await api.emergency(signal: Signal.sos.rawValue)
            return .sent(emergencyId: id, guardians: n)
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// 새 APNs 토큰. 계정이 있으면 바로 올리고, 없으면 계정을 만들 때 올립니다.
    func registerPushToken(_ token: String) async {
        store.pushToken = token
        guard let api else { return }
        _ = try? await api.updateMe(pushToken: token)
    }

    /// "기록 지우기": 서버의 계정·연결·요약을 지웁니다.
    func deleteAccount() async {
        if let api { try? await api.deleteMe() }
        me = nil
        family = nil
    }

    /// 오늘 요약을 보호자에게 (보호자가 있을 때만). 원수치는 보내지 않습니다.
    func uploadSummary(_ home: HomeState, today: LocalDate) async {
        guard let api, store.profile?.guardianOnly != true else { return }
        if store.guardianCount == 0 {
            // 내가 만든 초대를 보호자가 자기 폰에서 수락했을 수 있어 하루 한 번 서버에 다시 묻습니다.
            guard store.guardianCheckedOn != today else { return }
            store.guardianCheckedOn = today
            guard let f = try? await api.family() else { return }
            store.guardianCount = f.guardians.count
            if f.guardians.isEmpty { return }
        }
        try? await api.uploadSummary(ServerApi.summaryBody(home))
    }
}
