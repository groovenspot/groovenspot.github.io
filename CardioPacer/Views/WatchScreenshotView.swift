#if DEBUG
import SwiftUI

/// Renders one watch screen with sample data for App Store screenshots.
struct WatchScreenshotView: View {
    let screen: String

    @EnvironmentObject private var workoutManager: WorkoutManager
    @EnvironmentObject private var settings: ZoneSettingsStore

    private static let range = ZoneRange(lower: 134, upper: 147)

    var body: some View {
        content.task {
            settings.save(ZoneProfile(age: 35, restingHeartRate: 60))
            switch screen {
            case "zone1": workoutManager.showScreenshotSample(bpm: 124, zone: .below, elapsed: 765)
            case "zone2": workoutManager.showScreenshotSample(bpm: 138, zone: .target, elapsed: 765)
            case "zone3": workoutManager.showScreenshotSample(bpm: 156, zone: .above, elapsed: 765)
            default: break
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch screen {
        case "zone1", "zone2", "zone3":
            ActiveWorkoutView(onLongPress: {})
        case "summary":
            SummaryView(summary: WorkoutSummary(duration: 2_712,
                                                zoneSeconds: [.below: 270, .target: 2_224, .above: 218],
                                                averageHeartRate: 138,
                                                range: Self.range))
        default:
            NavigationStack { StartView() }
        }
    }
}
#endif
