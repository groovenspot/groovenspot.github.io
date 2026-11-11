import PulseCore
import SwiftUI
import WidgetKit

/// 홈 화면·잠금화면 위젯: 오늘 점수·구간·이유와 미션. 앱이 계산한 오늘 요약(앱 그룹)을 그대로 보여주고,
/// 날이 바뀌었는데 아직 새 계산이 없으면 "어제 기록"으로 보입니다 (워치 화면과 같은 규칙).
struct Entry: TimelineEntry {
    let date: Date
    let today: WatchToday?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), today: WatchToday(date: LocalDate.today(), score: 74, band: .good, reason: "자율신경이 평소보다 잘 회복됐어요",
                                              missionId: "S-01", missionTitle: "취침 알림 받고 30분 안에 눕기", missionDone: false))
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : Entry(date: Date(), today: SharedToday.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        // 앱이 새로 계산하면 위젯을 다시 그리게 합니다. 자정에는 "어제 기록"으로 바뀌도록 한 번 더.
        let midnight = Calendar.current.startOfDay(for: Date()).addingTimeInterval(24 * 3600 + 60)
        let now = Entry(date: Date(), today: SharedToday.load())
        let later = Entry(date: midnight, today: now.today)
        completion(Timeline(entries: [now, later], policy: .after(midnight.addingTimeInterval(6 * 3600))))
    }
}

private enum WidgetPalette {
    static let navy = Color(red: 0x12 / 255, green: 0x23 / 255, blue: 0x3A / 255)
    static let teal = Color(red: 0x0F / 255, green: 0x7B / 255, blue: 0x66 / 255)
    static let body = Color(red: 0x3D / 255, green: 0x4A / 255, blue: 0x5C / 255)
    static let paper = Color(red: 0xFD / 255, green: 0xFD / 255, blue: 0xFB / 255)
    static let amber = Color(red: 0xB7 / 255, green: 0x79 / 255, blue: 0x1F / 255)
    static let coral = Color(red: 0xD9 / 255, green: 0x65 / 255, blue: 0x3B / 255)

    static func band(_ b: Band?) -> Color {
        switch b {
        case .peak, .good: teal
        case .fair: amber
        case .low, .veryLow: coral
        case nil: body
        }
    }
}

struct ScoreWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: Entry

    var body: some View {
        let d = WatchContract.display(entry.today, today: LocalDate.today(entry.date))
        let label = entry.today == nil ? "펄스케어" : d.label
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text(d.score).font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("컨디션").font(.system(size: 9))
                }
            }
        case .accessoryInline:
            Text(entry.today?.score.map { "컨디션 \($0)점 · \(label)" } ?? "펄스케어 · \(label)")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("컨디션 \(d.score) · \(label)").font(.system(size: 14, weight: .bold))
                Text(d.missionDone ? "✓ \(d.mission)" : d.mission).font(.system(size: 12)).lineLimit(2)
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(d.score).font(.system(size: family == .systemSmall ? 40 : 44, weight: .bold)).foregroundStyle(WidgetPalette.navy)
                    Text(label).font(.system(size: 14, weight: .bold)).foregroundStyle(WidgetPalette.band(entry.today?.band))
                }
                Text(entry.today == nil ? "앱을 열어 오늘 컨디션을 확인하세요" : d.reason)
                    .font(.system(size: 13)).foregroundStyle(WidgetPalette.body).lineLimit(family == .systemSmall ? 3 : 2)
                Spacer(minLength: 0)
                if !d.mission.isEmpty {
                    Text(d.missionDone ? "✓ \(d.mission)" : "오늘의 미션 · \(d.mission)")
                        .font(.system(size: 12, weight: .semibold)).foregroundStyle(WidgetPalette.teal).lineLimit(family == .systemSmall ? 2 : 1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

struct ScoreWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "score", provider: Provider()) { entry in
            ScoreWidgetView(entry: entry)
                .containerBackground(for: .widget) { WidgetPalette.paper }
                .widgetURL(URL(string: "pulsecare://today"))
        }
        .configurationDisplayName("오늘 컨디션")
        .description("오늘 컨디션 점수와 미션을 홈 화면·잠금화면에서 봐요.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct PulseCareWidgets: WidgetBundle {
    var body: some Widget { ScoreWidget() }
}
