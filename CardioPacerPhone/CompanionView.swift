import SwiftUI

/// iPhone companion: set up Zone 2 comfortably, send it to the watch, and review past workouts.
struct CompanionView: View {
    /// Debug-only: render with sample data for App Store screenshots ("companion" or "history").
    var screenshot: String?

    @EnvironmentObject private var settings: ZoneSettingsStore
    @EnvironmentObject private var health: PhoneHealthModel
    @EnvironmentObject private var sync: ZoneSync

    @State private var draft = ZoneProfile.default
    @State private var useRestingHeartRate = false
    @State private var restingHeartRate = 60
    @State private var manualLower = 130
    @State private var manualUpper = 145
    @State private var isImporting = false
    @State private var justSent = false

    private var profile: ZoneProfile {
        var profile = draft
        profile.restingHeartRate = useRestingHeartRate ? restingHeartRate : nil
        profile.manualRange = ZoneRange(lower: manualLower, upper: manualUpper)
        return profile
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("목표 ZONE 2")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Text("\(profile.zone2Range.label) BPM")
                                .font(.system(size: 40, weight: .heavy, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(HeartRateZone.target.color)
                            Label(sync.isCounterpartInstalled ? "Apple Watch에 설치됨" : "Apple Watch에 앱을 설치하세요",
                                  systemImage: sync.isCounterpartInstalled ? "applewatch" : "applewatch.slash")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 6)
                    }

                    settingsSection

                    Section {
                        Button {
                            settings.save(profile)
                            ZoneSync.shared.send(profile)
                            justSent = true
                        } label: {
                            Label(justSent && profile == settings.profile ? "워치로 보냈어요" : "저장하고 워치로 보내기",
                                  systemImage: "paperplane.fill")
                                .frame(maxWidth: .infinity)
                                .font(.headline)
                        }
                        .buttonStyle(.borderedProminent)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                    }

                    historySection
                }
                .navigationTitle("Cardio Pacer")
                .refreshable { await health.loadWorkouts() }
                .task {
                    #if DEBUG
                    if let screenshot {
                        let sample = ZoneProfile(age: 35, restingHeartRate: 60)
                        settings.save(sample)
                        load(sample)
                        health.showScreenshotSamples()
                        sync.showScreenshotCounterpart()
                        if screenshot == "history" {
                            try? await Task.sleep(for: .milliseconds(300))
                            proxy.scrollTo("history", anchor: .top)
                        }
                        return
                    }
                    #endif
                    load(settings.profile ?? .default)
                    await health.requestAuthorization()
                    await health.loadWorkouts()
                }
                .onChange(of: settings.profile) {
                    // Edited on the watch while this screen is open.
                    if let updated = settings.profile, updated != profile { load(updated) }
                }
                .onChange(of: manualLower) {
                    if manualUpper <= manualLower { manualUpper = manualLower + 1 }
                }
            }
        }
    }

    private var settingsSection: some View {
        Section {
            Picker("방식", selection: $draft.method) {
                Text("자동 계산").tag(ZoneProfile.Method.automatic)
                Text("직접 입력").tag(ZoneProfile.Method.manual)
            }
            .pickerStyle(.segmented)

            if draft.method == .automatic {
                Stepper("나이 \(draft.age)세", value: $draft.age, in: 10...90)
                Toggle("안정 시 심박수 사용", isOn: $useRestingHeartRate)
                if useRestingHeartRate {
                    Stepper("안정 시 심박수 \(restingHeartRate) BPM", value: $restingHeartRate, in: 35...100)
                }
                Button {
                    Task { await importFromHealth() }
                } label: {
                    Label(isImporting ? "불러오는 중…" : "건강 앱에서 불러오기", systemImage: "heart.text.square")
                }
                .disabled(isImporting)
            } else {
                Stepper("하한 \(manualLower) BPM", value: $manualLower, in: 80...200)
                Stepper("상한 \(manualUpper) BPM", value: $manualUpper, in: (manualLower + 1)...210)
            }
        } header: {
            Text("존 설정")
        } footer: {
            Text(draft.method == .manual
                 ? "입력한 범위를 그대로 사용합니다."
                 : useRestingHeartRate
                    ? "최대 심박수 \(profile.estimatedMaxHeartRate) BPM 기준, 여유 심박수의 60~70% (Karvonen)"
                    : "최대 심박수 \(profile.estimatedMaxHeartRate) BPM의 60~70%")
        }
        .monospacedDigit()
    }

    private var historySection: some View {
        Section {
            if health.workouts.isEmpty {
                Text("워치에서 운동을 마치면 여기에 Zone 2 달성률이 쌓입니다.")
                    .foregroundStyle(.secondary)
            }
            ForEach(health.workouts) { workout in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(workout.start, format: .dateTime.month().day().weekday().hour().minute())
                            .font(.subheadline.weight(.semibold))
                        Text([workout.activity?.title, DurationFormatter.clock(workout.duration), workout.range.map { "\($0.label) BPM" }]
                            .compactMap { $0 }
                            .joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text("\(workout.zone2Percent)%")
                        .font(.system(.title2, design: .rounded).weight(.heavy))
                        .foregroundStyle(HeartRateZone.target.color)
                }
                .monospacedDigit()
                .accessibilityElement(children: .combine)
            }
        } header: {
            Text("운동 기록")
                .id("history")
        } footer: {
            Text("Cardio Pacer는 의료기기가 아니며, 계산된 구간은 일반적인 공식에 따른 참고값입니다. 심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.")
        }
    }

    private func load(_ stored: ZoneProfile) {
        draft = stored
        useRestingHeartRate = stored.restingHeartRate != nil
        restingHeartRate = stored.restingHeartRate ?? 60
        if let manual = stored.manualRange {
            manualLower = manual.lower
            manualUpper = manual.upper
        }
        justSent = false
    }

    private func importFromHealth() async {
        isImporting = true
        defer { isImporting = false }
        await health.requestAuthorization()
        if let age = health.fetchAge(), (10...90).contains(age) {
            draft.age = age
        }
        if let resting = await health.fetchRestingHeartRate(), (35...100).contains(resting) {
            restingHeartRate = resting
            useRestingHeartRate = true
        }
    }
}
