import SwiftUI

@main
struct CardioPacerPhoneApp: App {
    @StateObject private var settings: ZoneSettingsStore
    @StateObject private var health = PhoneHealthModel()

    init() {
        let settings = ZoneSettingsStore()
        _settings = StateObject(wrappedValue: settings)
        // Receives zone settings edited on the watch.
        ZoneSync.shared.activate(store: settings)
    }

    var body: some Scene {
        WindowGroup {
            CompanionView()
                .environmentObject(settings)
                .environmentObject(health)
                .environmentObject(ZoneSync.shared)
                .preferredColorScheme(.dark)
                .tint(HeartRateZone.target.color)
        }
    }
}
