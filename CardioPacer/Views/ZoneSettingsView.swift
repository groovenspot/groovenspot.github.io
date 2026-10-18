import SwiftUI

/// Onboarding and settings: age + resting heart rate (or a manual range) → Zone 2.
struct ZoneSettingsView: View {
    let isOnboarding: Bool

    @EnvironmentObject private var workoutManager: WorkoutManager
    @EnvironmentObject private var settings: ZoneSettingsStore
    @Environment(\.dismiss) private var dismiss

    @State private var draft = ZoneProfile.default
    @State private var useRestingHeartRate = false
    @State private var restingHeartRate = 60
    @State private var manualLower = 130
    @State private var manualUpper = 145
    @State private var isImporting = false
    @State private var didLoad = false

    private var profile: ZoneProfile {
        var profile = draft
        profile.restingHeartRate = useRestingHeartRate ? restingHeartRate : nil
        profile.manualRange = ZoneRange(lower: manualLower, upper: manualUpper)
        return profile
    }

    var body: some View {
        List {
            Section {
                VStack(spacing: 0) {
                    Text("ZONE 2")
                        .font(.caption2.weight(.heavy))
                        .foregroundStyle(.secondary)
                    Text("\(profile.zone2Range.label) BPM")
                        .font(.system(.title3, design: .rounded).weight(.heavy))
                        .monospacedDigit()
                        .foregroundStyle(HeartRateZone.target.color)
                }
                .frame(maxWidth: .infinity)
                .listRowBackground(Color.clear)
            }

            Section {
                Picker("방식", selection: $draft.method) {
                    Text("자동 계산").tag(ZoneProfile.Method.automatic)
                    Text("직접 입력").tag(ZoneProfile.Method.manual)
                }
            }

            if draft.method == .automatic {
                Section {
                    Picker("나이", selection: $draft.age) {
                        ForEach(10...90, id: \.self) { Text("\($0)세").tag($0) }
                    }
                    Toggle("안정 시 심박수", isOn: $useRestingHeartRate)
                    if useRestingHeartRate {
                        Picker("안정 시", selection: $restingHeartRate) {
                            ForEach(35...100, id: \.self) { Text("\($0) BPM").tag($0) }
                        }
                    }
                    Button {
                        Task { await importFromHealth() }
                    } label: {
                        Label(isImporting ? "불러오는 중…" : "건강 앱에서 불러오기", systemImage: "heart.text.square")
                    }
                    .disabled(isImporting)
                } footer: {
                    Text(useRestingHeartRate
                         ? "최대 심박수 \(profile.estimatedMaxHeartRate) BPM 기준, 여유 심박수의 60~70% (Karvonen)"
                         : "최대 심박수 \(profile.estimatedMaxHeartRate) BPM의 60~70%")
                }
            } else {
                Section {
                    Picker("하한", selection: $manualLower) {
                        ForEach(80...200, id: \.self) { Text("\($0) BPM").tag($0) }
                    }
                    Picker("상한", selection: $manualUpper) {
                        ForEach((manualLower + 1)...210, id: \.self) { Text("\($0) BPM").tag($0) }
                    }
                }
            }

            Section {
                Button(isOnboarding ? "시작하기" : "저장") {
                    settings.save(profile)
                    if !isOnboarding { dismiss() }
                }
                .foregroundStyle(HeartRateZone.target.color)
                .font(.headline)
            } footer: {
                Text("Cardio Pacer는 의료기기가 아니며, 계산된 구간은 일반적인 공식에 따른 참고값입니다. 심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.")
            }
        }
        .navigationTitle(isOnboarding ? "존 2 설정" : "설정")
        .onChange(of: manualLower) {
            if manualUpper <= manualLower { manualUpper = manualLower + 1 }
        }
        .onAppear(perform: loadIfNeeded)
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        let stored = settings.profile ?? .default
        draft = stored
        if let resting = stored.restingHeartRate {
            useRestingHeartRate = true
            restingHeartRate = resting
        }
        if let manual = stored.manualRange {
            manualLower = manual.lower
            manualUpper = manual.upper
        }
    }

    private func importFromHealth() async {
        isImporting = true
        defer { isImporting = false }
        try? await workoutManager.requestAuthorization()
        if let age = workoutManager.fetchAge(), (10...90).contains(age) {
            draft.age = age
        }
        if let resting = await workoutManager.fetchRestingHeartRate(), (35...100).contains(resting) {
            restingHeartRate = resting
            useRestingHeartRate = true
        }
    }
}
