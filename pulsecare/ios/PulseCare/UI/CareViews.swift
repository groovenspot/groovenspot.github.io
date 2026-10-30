import PulseCore
import SwiftUI

// MARK: 1분 호흡

/// 1분 호흡 가이드 (미션 R-01·C-04·S-04·R-08, 스트레스 알림의 "호흡 시작"). 원이 커지면 들이쉬고 작아지면 내쉽니다.
/// 끝까지 하면 기록해 미션 자동 확인에 씁니다.
struct BreathingView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var start: Date?
    @State private var finished = false

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                Text("1분 호흡").font(.system(size: 24, weight: .bold)).foregroundStyle(Palette.paper)
                Spacer()
                Button("닫기") { dismiss() }.foregroundStyle(Palette.mint)
            }
            Text("4초 들이쉬고 6초 내쉬기, 6번. 내쉬는 숨을 길게 하면 몸이 쉬는 쪽으로 바뀌어요.")
                .font(.system(size: 15)).foregroundStyle(Palette.line).frame(maxWidth: .infinity, alignment: .leading)
            Spacer()
            TimelineView(.animation(paused: start == nil)) { context in
                let elapsed = start.map { context.date.timeIntervalSince($0) } ?? 0
                let (phase, progress) = Breathing.at(elapsed)
                let scale: Double = start == nil || phase == .done ? 0.6
                    : phase == .inhale ? 0.55 + 0.45 * progress : 1.0 - 0.45 * progress
                VStack(spacing: 18) {
                    ZStack {
                        Circle().fill(Palette.mint.opacity(0.18)).frame(width: 300, height: 300).scaleEffect(scale).blur(radius: 6)
                        Circle().fill(Palette.mint.opacity(0.35)).frame(width: 240, height: 240).scaleEffect(scale)
                        Circle().fill(LinearGradient(colors: [Palette.mint, Color(hex: 0x3CC8A0)], startPoint: .top, endPoint: .bottom))
                            .frame(width: 170, height: 170).scaleEffect(scale)
                            .shadow(color: Palette.mint.opacity(0.5), radius: 24)
                        Text(finished ? Breathing.Phase.done.label : start == nil ? "준비" : phase.label)
                            .font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.navy)
                    }
                    .frame(width: 300, height: 300)
                    if start != nil && !finished {
                        Text("\(max(Int((Breathing.totalSeconds - elapsed).rounded()), 0))초 남았어요")
                            .font(.system(size: 16)).foregroundStyle(Palette.line)
                    }
                }
                .onChange(of: phase == .done) { _, done in
                    if done && start != nil && !finished { complete() }
                }
            }
            Spacer()
            if finished {
                Text("오늘 호흡 \(model.care.breathing(on: model.today).count)번 했어요").font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.mint)
            }
            if start == nil || finished {
                Button {
                    finished = false
                    start = Date()
                } label: {
                    Text(finished ? "한 번 더" : "시작하기").font(.system(size: 18, weight: .bold)).frame(maxWidth: .infinity, minHeight: 56)
                }
                .buttonStyle(PrimaryButtonStyle(color: Palette.mint, textColor: Palette.navy))
            }
        }
        .padding(24)
        .background(Palette.deep.ignoresSafeArea())
    }

    private func complete() {
        finished = true
        Task { await model.recordBreathing() }
        model.metrics.track(.missionCompleted, ["mission_id": "breathing", "auto": "true", "surface": "breathing_guide"])
    }
}

// MARK: 홈 카드

/// 아침 몸 상태 체크 (미션 C-08). 음주·야근·아픔을 남기면 오늘 점수 이유에 반영되고 기준선에서는 빠집니다.
struct TagCard: View {
    @EnvironmentObject private var model: AppModel
    @State private var picked: Set<DayTag> = []
    @State private var editing = false

    var body: some View {
        let saved = model.care.tags[model.today]
        SectionCard {
            if let saved, !editing {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.teal)
                    Text(saved.isEmpty ? "어제는 특별한 일 없었어요" : "어제: " + DayTag.allCases.filter(saved.contains).map(DayTags.label).joined(separator: " · "))
                        .font(.system(size: 14)).foregroundStyle(Palette.body)
                    Spacer()
                    Button("고치기") {
                        picked = saved
                        editing = true
                    }
                    .font(.system(size: 13))
                }
            } else {
                CardHeader(icon: "sun.horizon.fill", title: "아침 체크", tint: Palette.amber)
                Text("어제는 어땠나요?").font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.navy)
                Text("남겨 두면 오늘 점수에 반영하고, 내 평소 기준에서는 빼요").font(.system(size: 13)).foregroundStyle(Palette.muted)
                HStack(spacing: 8) {
                    ForEach([DayTag.alcohol, .overtime, .sick], id: \.self) { tag in
                        let on = picked.contains(tag)
                        Button {
                            if on { picked.remove(tag) } else { picked.insert(tag) }
                        } label: {
                            Text(DayTags.label(tag)).font(.system(size: 13))
                                .foregroundStyle(on ? Palette.paper : Palette.navy)
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .background(on ? Palette.teal : Palette.fill, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                Button(picked.isEmpty ? "특별한 일 없었어요" : "남기기") {
                    editing = false
                    Task { await model.saveTags(picked) }
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }
}

/// 물 6잔 (미션 C-07). 잔을 누를 때마다 하나씩.
struct WaterCard: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        let cups = model.care.water[model.today] ?? 0
        SectionCard {
            CardHeader(icon: "drop.fill", title: "물 마시기", tint: Color(hex: 0x3B82F6)) {
                if cups > 0 { Button("하나 빼기") { Task { await model.setWater(cups - 1) } }.font(.system(size: 13)).foregroundStyle(Palette.muted) }
            }
            Text("\(cups) / \(MissionVerifier.waterCups)잔").font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.navy)
            HStack(spacing: 8) {
                ForEach(0..<MissionVerifier.waterCups, id: \.self) { i in
                    Image(systemName: i < cups ? "drop.fill" : "drop")
                        .font(.system(size: 22))
                        .foregroundStyle(i < cups ? Color(hex: 0x3B82F6) : Palette.line)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .background((i < cups ? Color(hex: 0x3B82F6).opacity(0.1) : Palette.fill), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onTapGesture { Task { await model.setWater(i < cups ? i : i + 1) } }
                }
            }
            Button("한 잔 마셨어요") { Task { await model.setWater(cups + 1) } }.buttonStyle(OutlineButtonStyle())
        }
    }
}

/// 오늘 먹을 약. 지난 시각인데 체크가 없으면 주황색, 3시간 넘으면 "놓쳤어요".
struct MedicationCard: View {
    @EnvironmentObject private var model: AppModel
    var large = false
    var onManage: () -> Void

    var body: some View {
        let doses = model.todayDoses
        if !doses.isEmpty {
            SectionCard {
                CardHeader(icon: "pills.fill", title: "오늘 먹을 약", tint: Color(hex: 0x8B5CF6)) {
                    Button("관리", action: onManage).font(.system(size: large ? 16 : 13)).foregroundStyle(Palette.muted)
                }
                ForEach(doses, id: \.self) { d in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(timeLabel(d.time)) · \(d.medication.name)").font(.system(size: large ? 20 : 16, weight: .semibold)).foregroundStyle(Palette.navy)
                            if let note = note(d) {
                                Text(note).font(.system(size: large ? 16 : 13))
                                    .foregroundStyle(d.taken ? Palette.teal : d.missed ? Palette.coral : Palette.amber)
                            }
                        }
                        Spacer()
                        if !d.taken {
                            Button("먹었어요") { Task { await model.markTaken(d) } }.buttonStyle(PrimaryButtonStyle())
                        }
                    }
                }
            }
        }
    }

    private func note(_ d: Dose) -> String? {
        if d.taken { return "먹었어요" }
        if d.missed { return "3시간째 체크가 없어요" }
        return d.time <= model.now.time ? "먹을 시간이에요" : nil
    }
}

/// 07:30 → "오전 7:30", 21:00 → "오후 9:00".
func timeLabel(_ t: LocalTime) -> String {
    let h = t.hour % 12 == 0 ? 12 : t.hour % 12
    return "\(t.hour < 12 ? "오전" : "오후") \(h):\(String(format: "%02d", t.minute))"
}

// MARK: 약 관리

/// 약 이름과 하루 복용 시각. 이름은 이 아이폰에만 남고 보호자에게는 "약 체크 없음"만 갑니다.
struct MedicationsView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var times: [Date] = [MedicationsView.date(LocalTime(8, 0))]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("시간마다 알리고 \"먹었어요\"로 체크해요. 3시간이 지나도 체크가 없으면 한 번 더 묻고, 가족이 연결돼 있으면 보호자 하루 요약에 \"약 체크 없음\"이 실려요. 약 이름은 이 아이폰에만 남아요.")
                        .font(.system(size: 14)).foregroundStyle(Palette.body)
                }
                if !model.care.medications.isEmpty {
                    Section("먹는 약") {
                        ForEach(model.care.medications) { m in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(m.name).font(.system(size: 17, weight: .bold))
                                Text(m.times.sorted().map(timeLabel).joined(separator: ", ")).font(.system(size: 13)).foregroundStyle(Palette.muted)
                            }
                        }
                        .onDelete { idx in
                            var meds = model.care.medications
                            meds.remove(atOffsets: idx)
                            Task { await model.saveMedications(meds) }
                        }
                    }
                }
                Section("약 추가") {
                    TextField("약 이름 (예: 혈압약)", text: $name)
                    ForEach(times.indices, id: \.self) { i in
                        DatePicker("복용 시각 \(i + 1)", selection: $times[i], displayedComponents: .hourAndMinute)
                    }
                    if times.count < 4 {
                        Button("시각 더하기") { times.append(Self.date(LocalTime(20, 0))) }
                    }
                    if times.count > 1 {
                        Button("마지막 시각 빼기", role: .destructive) { times.removeLast() }
                    }
                    Button("추가하기") {
                        let picked = Array(Set(times.map { Zone(.current).local($0).time }.map { LocalTime($0.hour, $0.minute) })).sorted()
                        let med = Medication(id: String(UUID().uuidString.prefix(8)), name: String(name.trimmingCharacters(in: .whitespaces).prefix(20)), times: picked)
                        Task { await model.saveMedications(model.care.medications + [med]) }
                        name = ""
                        times = [Self.date(LocalTime(8, 0))]
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.paper)
            .navigationTitle("약 알림")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("닫기") { dismiss() } } }
        }
    }

    static func date(_ t: LocalTime) -> Date { Zone(.current).instant(LocalDate.today().atTime(t)) }
}
