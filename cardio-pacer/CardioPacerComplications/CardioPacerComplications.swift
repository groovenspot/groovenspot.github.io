import SwiftUI
import WidgetKit

/// Watch face complication / Smart Stack widget: shows the Zone 2 target and
/// launches the app with a single tap.
@main
struct CardioPacerComplications: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CardioPacerLauncher", provider: ZoneRangeProvider()) { entry in
            ComplicationView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Cardio Pacer")
        .description("탭 한 번으로 존 2 운동을 시작하세요.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
    }
}

struct ZoneRangeEntry: TimelineEntry {
    let date: Date
    let range: ZoneRange
}

struct ZoneRangeProvider: TimelineProvider {
    private var currentRange: ZoneRange {
        (ZoneSettingsStore.loadProfile() ?? .default).zone2Range
    }

    func placeholder(in context: Context) -> ZoneRangeEntry {
        ZoneRangeEntry(date: .now, range: ZoneRange(lower: 130, upper: 145))
    }

    func getSnapshot(in context: Context, completion: @escaping (ZoneRangeEntry) -> Void) {
        completion(ZoneRangeEntry(date: .now, range: currentRange))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZoneRangeEntry>) -> Void) {
        // The range only changes when the app saves new settings, which reloads timelines.
        completion(Timeline(entries: [ZoneRangeEntry(date: .now, range: currentRange)], policy: .never))
    }
}

struct ComplicationView: View {
    let entry: ZoneRangeEntry

    @Environment(\.widgetFamily) private var family

    private let green = HeartRateZone.target.color

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: -2) {
                    Image(systemName: "heart.fill")
                        .font(.caption)
                        .foregroundStyle(green)
                        .widgetAccentable()
                    Text("Z2")
                        .font(.system(.title3, design: .rounded).weight(.black))
                }
            }
        case .accessoryCorner:
            Image(systemName: "heart.fill")
                .font(.title3)
                .foregroundStyle(green)
                .widgetAccentable()
                .widgetLabel("Z2 \(entry.range.label)")
        case .accessoryInline:
            Label("Zone 2 · \(entry.range.label)", systemImage: "heart.fill")
        default:
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(green)
                    .frame(width: 5)
                    .widgetAccentable()
                VStack(alignment: .leading, spacing: 0) {
                    Text("Cardio Pacer")
                        .font(.headline)
                        .widgetAccentable()
                    Text("Zone 2 \(entry.range.label) BPM")
                        .font(.system(.body, design: .rounded).weight(.semibold))
                        .monospacedDigit()
                    Text("탭하여 시작")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
        }
    }
}
