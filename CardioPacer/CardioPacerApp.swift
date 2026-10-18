import SwiftUI

@main
struct CardioPacerApp: App {
    @StateObject private var workoutManager = WorkoutManager()
    @StateObject private var settings = ZoneSettingsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(workoutManager)
                .environmentObject(settings)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var workoutManager: WorkoutManager
    @EnvironmentObject private var settings: ZoneSettingsStore

    var body: some View {
        NavigationStack {
            if settings.isOnboarded {
                StartView()
            } else {
                ZoneSettingsView(isOnboarding: true)
            }
        }
        .fullScreenCover(isPresented: .constant(workoutManager.isSessionActive)) {
            SessionView()
                .environmentObject(workoutManager)
        }
        .alert("알림",
               isPresented: Binding(get: { workoutManager.errorMessage != nil },
                                    set: { if !$0 { workoutManager.errorMessage = nil } })) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(workoutManager.errorMessage ?? "")
        }
        .task {
            try? await workoutManager.requestAuthorization()
        }
    }
}

/// Live workout pages, then the summary once the session has ended.
struct SessionView: View {
    @EnvironmentObject private var workoutManager: WorkoutManager

    var body: some View {
        if let summary = workoutManager.summary {
            SummaryView(summary: summary)
        } else {
            SessionPagingView()
        }
    }
}
