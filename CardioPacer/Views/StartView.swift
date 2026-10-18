import SwiftUI

/// Step 1: confirm the Zone 2 target, pick an activity, and start.
struct StartView: View {
    @EnvironmentObject private var workoutManager: WorkoutManager
    @EnvironmentObject private var settings: ZoneSettingsStore
    @AppStorage("lastActivity") private var activityRaw = WorkoutActivity.running.rawValue

    private var activity: WorkoutActivity {
        WorkoutActivity(rawValue: activityRaw) ?? .running
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                targetCard

                HStack(spacing: 6) {
                    ForEach(WorkoutActivity.allCases) { option in
                        activityButton(option)
                    }
                }

                Button {
                    Task { await workoutManager.start(activity: activity, range: settings.zone2Range) }
                } label: {
                    Label("시작", systemImage: "play.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .tint(HeartRateZone.target.color)
                .buttonStyle(.borderedProminent)
                .disabled(workoutManager.phase != .idle)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Cardio Pacer")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    ZoneSettingsView(isOnboarding: false)
                } label: {
                    Image(systemName: "gearshape.fill")
                }
                .accessibilityLabel("존 설정")
            }
        }
    }

    private var targetCard: some View {
        VStack(spacing: 2) {
            Text("목표 ZONE 2")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(settings.zone2Range.label)
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .minimumScaleFactor(0.6)
                .foregroundStyle(HeartRateZone.target.color)
            Text("BPM")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(HeartRateZone.target.color.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("목표 존 2, \(settings.zone2Range.lower)에서 \(settings.zone2Range.upper) BPM")
    }

    private func activityButton(_ option: WorkoutActivity) -> some View {
        let selected = option == activity
        return Button {
            activityRaw = option.rawValue
        } label: {
            Image(systemName: option.symbol)
                .font(.title3)
                .frame(maxWidth: .infinity, minHeight: 36)
        }
        .buttonStyle(.bordered)
        .tint(selected ? HeartRateZone.target.color : .gray)
        .accessibilityLabel(option.title)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
