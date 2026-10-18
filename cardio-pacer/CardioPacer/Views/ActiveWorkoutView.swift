import SwiftUI

/// The main "no clutter" screen: full-screen zone colour, BPM, zone, elapsed time.
struct ActiveWorkoutView: View {
    var onLongPress: () -> Void

    @EnvironmentObject private var workoutManager: WorkoutManager
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced

    private var zone: HeartRateZone? { workoutManager.zone }
    private var isPaused: Bool { workoutManager.phase == .paused }

    private var background: Color {
        let base = zone?.color ?? PacerPalette.waiting
        return isLuminanceReduced || isPaused ? base.opacity(0.45) : base
    }

    var body: some View {
        ZStack {
            background
                .ignoresSafeArea()
                .animation(.easeInOut(duration: 0.25), value: zone)

            VStack(spacing: 0) {
                Text(isPaused ? "일시정지" : (zone?.title ?? "측정 중…"))
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .tracking(1)

                Spacer(minLength: 0)

                bpm

                Text(zone?.message ?? "심박수를 측정하고 있어요")
                    .font(.system(.footnote, design: .rounded).weight(.semibold))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .opacity(0.9)

                Spacer(minLength: 0)

                ElapsedTimeView()
                    .font(.system(.title3, design: .rounded).weight(.bold))
            }
            .foregroundStyle(.white)
            .padding(.vertical, 4)
        }
        .contentShape(Rectangle())
        .onLongPressGesture(minimumDuration: 0.6, perform: onLongPress)
        .accessibilityElement(children: .combine)
    }

    private var bpm: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(workoutManager.heartRate.map { "\(Int($0.rounded()))" } ?? "--")
                .font(.system(size: 76, weight: .black, design: .rounded))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .contentTransition(.numericText())
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: "heart.fill")
                    .symbolEffect(.pulse, isActive: !isLuminanceReduced && !isPaused)
                Text("BPM")
                    .font(.caption2.weight(.heavy))
            }
            .font(.footnote)
        }
        .animation(.default, value: workoutManager.heartRate)
    }
}

/// Elapsed (non-paused) workout time, ticking once a second.
struct ElapsedTimeView: View {
    @EnvironmentObject private var workoutManager: WorkoutManager

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            Text(DurationFormatter.clock(workoutManager.elapsedTime(at: context.date)))
                .monospacedDigit()
        }
    }
}
