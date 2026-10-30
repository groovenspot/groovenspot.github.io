import Foundation
import PulseCore
import Security

/// 기기 안에만 저장합니다. 건강 수치는 저장하지 않고 HealthKit에서 매번 읽습니다 (점수 숫자와 미션 기록만).
/// 안드로이드 AppStore와 같은 항목입니다.
final class AppStore {
    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    private func load<T: Decodable>(_ key: String, _ type: T.Type = T.self) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? decoder.decode(T.self, from: data)
    }

    private func save<T: Encodable>(_ key: String, _ value: T?) {
        if let value, let data = try? encoder.encode(value) {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }

    var profile: Profile? {
        get { load("profile") }
        set { save("profile", newValue) }
    }

    var today: TodayMission? {
        get { load("today_mission") }
        set { save("today_mission", newValue) }
    }

    /// 지난 미션 기록 (오늘 제외). 최근 60일만 둡니다.
    var missionLogs: [MissionLog] {
        get { load("mission_logs") ?? [] }
        set { save("mission_logs", Array(newValue.sorted { $0.date < $1.date }.suffix(60))) }
    }

    /// 날짜별로 보여준 점수. 수면 필요량(컨디션 좋았던 날의 수면)을 구할 때 씁니다.
    var scores: [LocalDate: Int] {
        get {
            let raw: [String: Int] = load("scores") ?? [:]
            return Dictionary(uniqueKeysWithValues: raw.compactMap { k, v in LocalDate(iso: k).map { ($0, v) } })
        }
        set {
            let kept = newValue.sorted { $0.key < $1.key }.suffix(60)
            save("scores", Dictionary(uniqueKeysWithValues: kept.map { ($0.key.description, $0.value) }))
        }
    }

    var settings: NotificationSettings {
        get { load("notification_settings") ?? NotificationSettings() }
        set { save("notification_settings", newValue) }
    }

    /// 저녁 요약에서 "내일 다시"를 고르면 다음 날 같은 미션을 줍니다.
    var retry: Retry? {
        get { load("retry_mission") }
        set { save("retry_mission", newValue) }
    }

    struct Retry: Codable {
        var date: LocalDate
        var missionId: String
    }

    func retryFor(_ date: LocalDate) -> String? { retry.flatMap { $0.date == date ? $0.missionId : nil } }

    /// 아직 홈에서 확인하지 않은 주간 리포트의 일요일.
    var weeklyShownFor: LocalDate? {
        get { load("weekly_shown") }
        set { save("weekly_shown", newValue) }
    }

    /// 오늘 보낸 알림 신호. 날짜가 바뀌면 비웁니다.
    func sentAlerts(_ today: LocalDate) -> Set<String> {
        guard defaults.string(forKey: "alerts_day") == today.description else { return [] }
        return Set(defaults.stringArray(forKey: "alerts_sent") ?? [])
    }

    func markAlertSent(_ today: LocalDate, _ signal: String) {
        let all = sentAlerts(today).union([signal])
        defaults.set(today.description, forKey: "alerts_day")
        defaults.set(Array(all), forKey: "alerts_sent")
    }

    /// 내가 한 알림 응답 (최근 30일).
    var alertFeedback: [FeedbackEntry] {
        get { load("alert_feedback") ?? [] }
        set {
            let cutoff = LocalDateTime.now().plusDays(-30)
            save("alert_feedback", newValue.filter { $0.at > cutoff })
        }
    }

    /// 쉬는 중인 신호와 끝나는 날.
    var snoozedSignals: [Signal: LocalDate] {
        get { load("alert_snoozed") ?? [:] }
        set { save("alert_snoozed", newValue) }
    }

    /// "계속 받기"를 고른 시각.
    var snoozeDeclined: [Signal: LocalDateTime] {
        get { load("alert_snooze_declined") ?? [:] }
        set { save("alert_snooze_declined", newValue) }
    }

    /// 동의한 약관 버전과 시각 (동의 기록). 0이면 아직 동의하지 않음.
    var consentVersion: Int {
        get { defaults.integer(forKey: "consent_version") }
        set {
            defaults.set(newValue, forKey: "consent_version")
            defaults.set(Date().timeIntervalSince1970, forKey: "consent_at")
        }
    }

    var consentAt: Date? {
        let t = defaults.double(forKey: "consent_at")
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    var analyticsConsent: Bool {
        get { defaults.bool(forKey: "analytics_consent") }
        set { defaults.set(newValue, forKey: "analytics_consent") }
    }

    /// AI 상담 안내(국외 전송)에 동의함.
    var chatConsent: Bool {
        get { defaults.bool(forKey: "chat_consent") }
        set { defaults.set(newValue, forKey: "chat_consent") }
    }

    /// 계정과 분리된 무작위 설치 ID. "기록 지우기" 후에는 새로 만듭니다.
    var installId: String {
        if let id = defaults.string(forKey: "install_id") { return id }
        let id = UUID().uuidString.lowercased()
        defaults.set(id, forKey: "install_id")
        return id
    }

    /// APNs 기기 토큰 ("apns:" + 16진수). 계정을 만들기 전에 받으면 여기 두었다가 올립니다.
    var pushToken: String? {
        get { defaults.string(forKey: "push_token") }
        set { defaults.set(newValue, forKey: "push_token") }
    }

    /// 마지막으로 본 내 보호자 수. 0이면 하루 요약을 올리지 않습니다.
    var guardianCount: Int {
        get { defaults.integer(forKey: "family_guardians") }
        set { defaults.set(newValue, forKey: "family_guardians") }
    }

    var guardianCheckedOn: LocalDate? {
        get { load("guardian_checked_on") }
        set { save("guardian_checked_on", newValue) }
    }

    func onceSent(_ name: String) -> Bool { defaults.bool(forKey: "ev_once_\(name)") }
    func markOnce(_ name: String) { defaults.set(true, forKey: "ev_once_\(name)") }
    func lastDailyEvent(_ key: String) -> String? { defaults.string(forKey: "ev_daily_\(key)") }
    func setLastDailyEvent(_ key: String, _ mark: String) { defaults.set(mark, forKey: "ev_daily_\(key)") }

    /// 가족 서버 계정 (사용자 ID, 토큰). 토큰은 키체인에 둡니다.
    var account: (userId: String, token: String)? {
        get {
            guard let id = defaults.string(forKey: "family_user"), let token = Keychain.read("family_token") else { return nil }
            return (id, token)
        }
        set {
            if let newValue {
                defaults.set(newValue.userId, forKey: "family_user")
                Keychain.write("family_token", newValue.token)
            } else {
                defaults.removeObject(forKey: "family_user")
                Keychain.delete("family_token")
            }
        }
    }

    /// "기록 지우기": 이 아이폰에 저장한 펄스케어 기록을 모두 지웁니다 (건강 앱 데이터는 그대로).
    func clear() {
        for key in defaults.dictionaryRepresentation().keys { defaults.removeObject(forKey: key) }
        Keychain.delete("family_token")
    }
}

/// 가족 계정 토큰처럼 기기 밖으로 나가면 안 되는 값.
enum Keychain {
    private static let service = "com.groovenspot.pulsecare"

    static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func write(_ key: String, _ value: String) {
        delete(key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

/// 빌드 설정의 서버 주소 (project.yml의 PULSECARE_SERVER_URL).
enum AppConfig {
    static let serverUrl: String = (Bundle.main.object(forInfoDictionaryKey: "PulseCareServerURL") as? String)?
        .trimmingCharacters(in: .whitespaces) ?? ""

    static var serverConfigured: Bool { !serverUrl.isEmpty }

    static let consentVersion = 2
    static let privacyUrl = URL(string: "https://groovenspot.github.io/pulsecare/privacy/")!
    static let termsUrl = URL(string: "https://groovenspot.github.io/pulsecare/terms/")!
    static let deleteUrl = URL(string: "https://groovenspot.github.io/pulsecare/delete-account/")!

    /// 스크린샷·데모용 실행 인자 (-demo). 건강 앱 대신 정해진 가상 기록을 씁니다.
    static let demo = ProcessInfo.processInfo.arguments.contains("-demo")

    /// 데모로 열 화면 (-screen home|history|family|chat|settings|consent|goal|easy|guardian).
    static var demoScreen: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-screen"), i + 1 < args.count else { return nil }
        return args[i + 1]
    }
}
