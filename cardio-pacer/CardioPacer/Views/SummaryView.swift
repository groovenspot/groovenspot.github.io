import SwiftUI

/// Step 3: how much of the workout was spent in Zone 2.
struct SummaryView: View {
    let summary: WorkoutSummary

    @EnvironmentObject private var workoutManager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                VStack(spacing: 0) {
                    Text("Zone 2 달성률")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text("\(summary.zone2Percent)%")
                        .font(.system(size: 52, weight: .black, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(HeartRateZone.target.color)
                }
                .accessibilityElement(children: .combine)

                ZoneBreakdownBar(summary: summary)

                VStack(spacing: 4) {
                    row("운동 시간", DurationFormatter.clock(summary.duration))
                    row("목표 범위", "\(summary.range.label) BPM")
                    if let average = summary.averageHeartRate {
                        row("평균 심박수", "\(Int(average.rounded())) BPM")
                    }
                    ForEach(HeartRateZone.allCases, id: \.self) { zone in
                        row(zone.title,
                            DurationFormatter.clock(summary.zoneSeconds[zone] ?? 0),
                            color: zone.color)
                    }
                }

                Button("완료") {
                    workoutManager.reset()
                }
                .buttonStyle(.borderedProminent)
                .tint(HeartRateZone.target.color)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("요약")
    }

    private func row(_ title: String, _ value: String, color: Color = .secondary) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(color)
            Spacer()
            Text(value)
                .monospacedDigit()
        }
        .font(.footnote)
    }
}

/// Proportion of tracked time in blue / green / red.
struct ZoneBreakdownBar: View {
    let summary: WorkoutSummary

    var body: some View {
        GeometryReader { proxy in
            HStack(spacing: 2) {
                ForEach(HeartRateZone.allCases, id: \.self) { zone in
                    let fraction = summary.fraction(in: zone)
                    if fraction > 0 {
                        zone.color
                            .frame(width: max(2, (proxy.size.width - 4) * fraction))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PacerPalette.waiting)
            .clipShape(Capsule())
        }
        .frame(height: 10)
        .accessibilityHidden(true)
    }
}
