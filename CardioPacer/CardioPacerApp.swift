import SwiftUI

@main
struct CardioPacerApp: App {
    @StateObject private var workoutManager = WorkoutManager()
    @StateObject private var settings: ZoneSettingsStore

    init() {
        let settings = ZoneSettingsStore()
        _settings = StateObject(wrappedValue: settings)
        // Receives zone settings edited in the iPhone app.
        ZoneSync.shared.activate(store: settings)
    }

    var body: some Scene {
        WindowGroup {
            Group {
                #if DEBUG
                if let screen = ScreenshotMode.requested {
                    WatchScreenshotView(screen: screen)
                } else {
                    RootView()
                }
                #else
                RootView()
                #endif
            }
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
