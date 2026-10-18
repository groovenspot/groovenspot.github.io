import SwiftUI
import WatchKit

/// Step 2: swipe right from the metrics page (or long-press it) to reach the controls.
struct SessionPagingView: View {
    enum Page { case controls, metrics }

    @EnvironmentObject private var workoutManager: WorkoutManager
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced
    @State private var selection: Page = .metrics

    var body: some View {
        TabView(selection: $selection) {
            ControlsView(onAction: { selection = .metrics })
                .tag(Page.controls)
            ActiveWorkoutView(onLongPress: {
                WKInterfaceDevice.current().play(.click)
                selection = .controls
            })
            .tag(Page.metrics)
        }
        .tabViewStyle(.page(indexDisplayMode: isLuminanceReduced ? .never : .automatic))
        .toolbar(.hidden, for: .navigationBar)
        .onChange(of: isLuminanceReduced) {
            // Always show the colour screen when the wrist drops.
            if isLuminanceReduced { selection = .metrics }
        }
    }
}
