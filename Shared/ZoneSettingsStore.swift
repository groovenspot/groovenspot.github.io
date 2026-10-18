import Foundation
import WidgetKit

/// Persists the user's `ZoneProfile` in the App Group so the complication can
/// show the same Zone 2 range as the app.
final class ZoneSettingsStore: ObservableObject {
    static let appGroupID = "group.com.groovenspot.cardiopacer"
    private static let profileKey = "zoneProfile"

    @Published private(set) var profile: ZoneProfile?

    private let defaults: UserDefaults

    init(defaults: UserDefaults = ZoneSettingsStore.sharedDefaults) {
        self.defaults = defaults
        self.profile = Self.loadProfile(from: defaults)
    }

    var isOnboarded: Bool { profile != nil }

    /// Falls back to defaults so the app always has a range to work with.
    var zone2Range: ZoneRange { (profile ?? .default).zone2Range }

    func save(_ profile: ZoneProfile) {
        self.profile = profile
        if let data = try? JSONEncoder().encode(profile) {
            defaults.set(data, forKey: Self.profileKey)
        }
        WidgetCenter.shared.reloadAllTimelines()
    }

    static var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroupID) ?? .standard
    }

    static func loadProfile(from defaults: UserDefaults = sharedDefaults) -> ZoneProfile? {
        guard let data = defaults.data(forKey: profileKey) else { return nil }
        return try? JSONDecoder().decode(ZoneProfile.self, from: data)
    }
}
