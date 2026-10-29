import PulseCore
import SwiftUI

/// 내 정보 (기획서 16번 "내 정보") + 알림 설정.
struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var changingGoal = false
    @State private var confirmClear = false
    @State private var analytics = false

    /// 설정 화면에 쓰는 신호 이름과 조건 (기획서 12번 "신호별 판단 기준").
    static let signalText: [Signal: (String, String)] = [
        .restingHrRise: ("안정시 심박 상승", "3일 연속 평소보다 10 bpm 이상 높을 때"),
        .activityDrop: ("걸음 수 급감", "3일 연속 평소의 40% 이하일 때"),
        .lowSpo2: ("수면 중 산소포화도", "7일 중 3일, 90% 미만 구간이 반복될 때"),
        .sleepDebt: ("수면 부족 누적", "5일 중 4일, 필요량보다 1시간 이상 짧을 때"),
        .stress: ("스트레스 지속", "3일 연속 HRV가 평소보다 20% 이상 낮을 때"),
        .highHrAtRest: ("쉬는 중 높은 심박", "움직임 없이 120 bpm 이상이 10분 이어질 때"),
        .lowHrAwake: ("깨어 있을 때 낮은 심박", "깨어 있는데 40 bpm 미만이 10분 이어질 때"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                if let profile = model.profile {
                    Section("나") {
                        Button {
                            changingGoal = true
                        } label: {
                            row("목표", "\(profile.goal.label) · 레벨 \(profile.level)")
                        }
                        Toggle(isOn: Binding(get: { profile.seniorMode }, set: { model.setSeniorMode($0) })) {
                            row("쉽게 보기", "큰 글씨, 버튼은 꼭 필요한 것만. 미션은 걷기·수면 위주로")
                        }
                        if !profile.guardianOnly {
                            Button {
                                if let url = URL(string: "x-apple-health://") { openURL(url) }
                            } label: {
                                row("건강 데이터 권한", "건강 앱 > 공유 > 앱 > 펄스케어에서 읽을 항목 고르기")
                            }
                        }
                    }
                }
                if model.profile?.guardianOnly == false {
                    let _ = model.careVersion
                    Section {
                        Toggle(isOn: Binding(get: { model.care.bedtimeEnabled }, set: { on in Task { await model.setBedtime(enabled: on) } })) {
                            row("취침 알림", "잘 시간 30분 전에 알려요 (\(timeLabel(model.care.bedtimeReminder))). 미션 \"취침 알림 받고 30분 안에 눕기\"와 함께 써요")
                        }
                        if model.care.bedtimeEnabled {
                            DatePicker(model.care.bedtimeFixed == nil ? "취침 시각 (평소 기록에 맞춤)" : "취침 시각", selection: Binding(
                                get: { Zone(.current).instant(LocalDate.today().atTime(model.care.bedtimeFixed ?? model.care.usualBedtime ?? Bedtime.defaultBedtime)) },
                                set: { d in
                                    let t = Zone(.current).local(d).time
                                    Task { await model.setBedtime(fixed: .some(LocalTime(t.hour, t.minute))) }
                                }
                            ), displayedComponents: .hourAndMinute)
                            if model.care.bedtimeFixed != nil {
                                Button("평소 기록에 맞추기") { Task { await model.setBedtime(fixed: .some(nil)) } }
                            }
                        }
                        Button {
                            dismiss()
                            // 이 시트가 닫힌 뒤에 약 관리 시트를 엽니다 (시트는 한 번에 하나).
                            Task {
                                try? await Task.sleep(nanoseconds: 700_000_000)
                                model.openRequest = "medication"
                            }
                        } label: {
                            let n = model.care.medications.count
                            row("약 알림", n == 0 ? "먹는 약과 시각을 넣으면 시간마다 알리고 체크해요" : "약 \(n)개 · 시간마다 알리고 체크해요")
                        }
                    } header: {
                        Text("생활 도우미")
                    }
                }
                Section("알림") {
                    Toggle(isOn: binding(\.morningEnabled)) { row("아침 리포트", "컨디션 점수와 오늘의 미션") }
                    if model.settings.morningEnabled { DatePicker("받는 시각", selection: time(\.morningTime), displayedComponents: .hourAndMinute) }
                    Toggle(isOn: binding(\.eveningEnabled)) { row("저녁 요약", "못 한 미션과 하루 정보") }
                    if model.settings.eveningEnabled { DatePicker("받는 시각", selection: time(\.eveningTime), displayedComponents: .hourAndMinute) }
                    Toggle(isOn: binding(\.weeklyEnabled)) { row("주간 리포트", "일요일 저녁, 한 주 미션과 변화") }
                }
                Section {
                    DatePicker("시작", selection: time(\.quietStart), displayedComponents: .hourAndMinute)
                    DatePicker("끝", selection: time(\.quietEnd), displayedComponents: .hourAndMinute)
                } header: {
                    Text("방해 금지")
                } footer: {
                    Text("이 시간에는 주의·정보 알림을 모아 두었다가 아침에 보내요")
                }
                Section {
                    ForEach(NotificationSettings.adjustable, id: \.self) { s in
                        Toggle(isOn: Binding(
                            get: { model.settings.allows(s) },
                            set: { on in
                                var next = model.settings
                                if on { next.disabledSignals.remove(s) } else { next.disabledSignals.insert(s) }
                                model.updateSettings(next)
                            }
                        )) {
                            row(Self.signalText[s]?.0 ?? s.settingLabel, Self.signalText[s]?.1 ?? "")
                        }
                    }
                } header: {
                    Text("건강 알림")
                } footer: {
                    Text("넘어짐·SOS 긴급 알림은 끌 수 없어요. 애플워치의 넘어짐 감지와 긴급 SOS도 함께 켜 두세요.")
                }
                Section {
                    Button("기록 지우기 · 동의 철회 · 탈퇴", role: .destructive) { confirmClear = true }
                } header: {
                    Text("데이터")
                } footer: {
                    Text("건강 수치는 이 아이폰에서만 계산하고 저장하지 않아요. 저장하는 건 점수 숫자, 미션 기록, 설정뿐이에요. 가족 연결을 쓰면 이름과 하루 요약(점수·미션·주의 알림)이 서버에 있어요.")
                }
                Section("약관 · 개인정보") {
                    Toggle(isOn: Binding(get: { analytics }, set: { on in
                        analytics = on
                        model.metrics.setConsent(on)
                    })) {
                        row("이용 통계 보내기 (선택)", "어떤 기능을 썼는지만, 점수·수치·이름 없이. 끄면 모은 통계도 지워요")
                    }
                    Button { openURL(AppConfig.termsUrl) } label: { row("서비스 이용약관", "펄스케어는 진단·치료가 아닌 웰니스 서비스예요") }
                    Button { openURL(AppConfig.privacyUrl) } label: {
                        row("개인정보 처리방침", model.store.consentAt.map { "\(LocalDate.today($0)) 동의 · 수집 항목, 보관 기간, 삭제 방법" } ?? "수집 항목, 보관 기간, 삭제 방법")
                    }
                    Button { openURL(AppConfig.deleteUrl) } label: { row("계정 삭제 안내", "앱을 지운 뒤에도 서버 기록을 지우는 방법") }
                }
                Section {
                    Text("펄스케어 \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · 진단이나 치료가 아닌 생활 습관 코칭이에요")
                        .font(.system(size: 12)).foregroundStyle(Palette.muted)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.paper)
            .navigationTitle("내 정보")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("닫기") { dismiss() } } }
            .onAppear { analytics = model.store.analyticsConsent }
            .sheet(isPresented: $changingGoal) {
                GoalView(changing: true) { goal in
                    model.changeGoal(goal)
                    changingGoal = false
                }
                .environmentObject(model)
            }
            .alert("기록을 지우고 탈퇴할까요?", isPresented: $confirmClear) {
                Button("지우기", role: .destructive) {
                    Task {
                        await model.eraseEverything()
                        dismiss()
                    }
                }
                Button("취소", role: .cancel) {}
            } message: {
                Text("목표, 레벨, 미션 기록, 점수 기록, 설정, 동의 기록이 지워지고 처음 화면으로 돌아가요. 가족 계정이 있으면 서버의 계정, 가족 연결, 하루 요약, 긴급 기록도 바로 지워요. 건강 앱의 건강 데이터는 그대로예요. 앱을 다시 쓰려면 처음부터 동의해야 해요.")
            }
        }
    }

    private func row(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 16)).foregroundStyle(Palette.navy)
            if !detail.isEmpty { Text(detail).font(.system(size: 13)).foregroundStyle(Palette.muted) }
        }
    }

    private func binding(_ key: WritableKeyPath<NotificationSettings, Bool>) -> Binding<Bool> {
        Binding(get: { model.settings[keyPath: key] }, set: { v in
            var next = model.settings
            next[keyPath: key] = v
            model.updateSettings(next)
        })
    }

    /// LocalTime ↔ DatePicker의 Date (오늘 날짜, 기기 시간대).
    private func time(_ key: WritableKeyPath<NotificationSettings, LocalTime>) -> Binding<Date> {
        Binding(
            get: { Zone(.current).instant(LocalDate.today().atTime(model.settings[keyPath: key])) },
            set: { d in
                let t = Zone(.current).local(d).time
                var next = model.settings
                next[keyPath: key] = LocalTime(t.hour, t.minute)
                model.updateSettings(next)
            }
        )
    }
}
