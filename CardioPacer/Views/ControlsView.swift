import SwiftUI

/// Pause / resume and end, one swipe right of the metrics screen.
struct ControlsView: View {
    var onAction: () -> Void

    @EnvironmentObject private var workoutManager: WorkoutManager

    private var isPaused: Bool { workoutManager.phase == .paused }

    var body: some View {
        HStack(spacing: 12) {
            control(title: "종료", symbol: "xmark", tint: HeartRateZone.above.color) {
                workoutManager.end()
            }
            control(title: isPaused ? "재개" : "정지",
                    symbol: isPaused ? "play.fill" : "pause.fill",
                    tint: .yellow) {
                workoutManager.togglePause()
                onAction()
            }
        }
        .disabled(workoutManager.phase == .ending || workoutManager.phase == .starting)
    }

    private func control(title: String, symbol: String, tint: Color, action: @escaping () -> Void) -> some View {
        VStack(spacing: 6) {
            Button(action: action) {
                Image(systemName: symbol)
                    .font(.title2.weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: 52)
            }
            .tint(tint)
            .buttonStyle(.bordered)
            .accessibilityLabel(title)
            Text(title)
                .font(.footnote.weight(.semibold))
        }
    }
}
