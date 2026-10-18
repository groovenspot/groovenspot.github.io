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

    private static var screenshot: String? {
        #if DEBUG
        return ScreenshotMode.requested
        #else
        return nil
        #endif
    }

    var body: some Scene {
        WindowGroup {
            CompanionView(screenshot: Self.screenshot)
                .environmentObject(settings)
                .environmentObject(health)
                .environmentObject(ZoneSync.shared)
                .preferredColorScheme(.dark)
                .tint(HeartRateZone.target.color)
        }
    }
}
