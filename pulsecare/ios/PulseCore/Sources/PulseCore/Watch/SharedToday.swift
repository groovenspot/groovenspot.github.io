import Foundation

/// 아이폰 앱이 위젯·단축어와 나누는 오늘 요약 (앱 그룹 저장소). 워치와 같은 WatchContract 키를 씁니다.
public enum SharedToday {
    public static let group = "group.com.groovenspot.pulsecare"
    private static let key = "today"

    public static var defaults: UserDefaults { UserDefaults(suiteName: group) ?? .standard }

    public static func save(_ t: WatchToday?, defaults: UserDefaults = SharedToday.defaults) {
        if let t { defaults.set(WatchContract.encode(t), forKey: key) } else { defaults.removeObject(forKey: key) }
    }

    public static func load(defaults: UserDefaults = SharedToday.defaults) -> WatchToday? {
        (defaults.dictionary(forKey: key) as? [String: String]).flatMap(WatchContract.decode)
    }
}
