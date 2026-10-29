import PulseCore
import SwiftUI

/// 시니어 "쉽게 보기" 홈: 큰 글씨, 꼭 필요한 버튼만, 보호자 전화와 SOS를 함께 둡니다.
/// 점수 배지·"다른 미션"·학습 진행률처럼 판단이 필요한 요소는 뺍니다.
struct EasyHomeView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var family: FamilyModel
    @Environment(\.openURL) private var openURL
    var onOpenSettings: () -> Void
    @State private var sos: SosStage?

    enum SosStage: Identifiable {
        case confirm, sending
        case done(title: String, detail: String, emergencyId: String?)

        var id: String {
            switch self {
            case .confirm: "confirm"
            case .sending: "sending"
            case .done: "done"
            }
        }
    }

    /// 1순위 보호자 중 전화번호가 있는 사람.
    private var guardian: (name: String, phone: String)? {
        family.family?.guardians.sorted { $0.priority < $1.priority }
            .compactMap { g in g.person.phone.map { (g.person.name, $0) } }.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text(model.home.map { koreanDate($0.date) } ?? "").font(.system(size: 20)).foregroundStyle(Palette.muted)
                    Spacer()
                    Button("내 정보", action: onOpenSettings).font(.system(size: 18))
                }
                if let home = model.home {
                    scoreCard(home)
                    missionCard(home)
                    MedicationCard(large: true) { model.openRequest = "medication" }
                    ForEach(Array(zip(home.alerts, home.alertDetections).enumerated()), id: \.offset) { _, pair in
                        alertCard(pair.0, pair.1)
                    }
                }
                if let g = guardian {
                    Button {
                        if let url = URL(string: "tel:\(g.phone)") { openURL(url) }
                    } label: {
                        Text("\(g.name)에게 전화").font(.system(size: 22, weight: .bold)).frame(maxWidth: .infinity, minHeight: 64)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Palette.teal)
                    .background(RoundedRectangle(cornerRadius: 16).stroke(Palette.teal, lineWidth: 2))
                }
                Button {
                    sos = .confirm
                } label: {
                    Text("도움 요청 (SOS)").font(.system(size: 22, weight: .bold)).frame(maxWidth: .infinity, minHeight: 64)
                }
                .buttonStyle(PrimaryButtonStyle(color: Color(red: 0.75, green: 0.15, blue: 0.15)))
            }
            .padding(20)
        }
        .background(Palette.paper)
        .refreshable { await model.refresh() }
        .task { await family.load() }
        .sheet(item: $sos) { stage in sosSheet(stage).presentationDetents([.medium]) }
    }

    private func scoreCard(_ home: HomeState) -> some View {
        SectionCard {
            if home.score.kind == .noData {
                Text("오늘 몸은 어떠세요?").font(.system(size: 24, weight: .bold)).foregroundStyle(Palette.navy)
                Text("어젯밤 워치 기록이 없어요").font(.system(size: 16)).foregroundStyle(Palette.muted)
                ForEach([(4, "좋아요"), (3, "보통이에요"), (2, "안 좋아요")], id: \.0) { value, label in
                    Button {
                        Task { await model.refresh(feeling: value) }
                    } label: {
                        Text(label).font(.system(size: 20)).foregroundStyle(Palette.navy).frame(maxWidth: .infinity, minHeight: 56)
                    }
                    .buttonStyle(.plain)
                    .background(RoundedRectangle(cornerRadius: 14).stroke(Palette.line, lineWidth: 1))
                }
            } else {
                Text("오늘 컨디션").font(.system(size: 18)).foregroundStyle(Palette.muted)
                HStack(alignment: .bottom, spacing: 12) {
                    Text(home.score.score.map(String.init) ?? "-").font(.system(size: 72, weight: .bold)).foregroundStyle(Palette.navy)
                    if let band = home.score.band {
                        Text(band.label).font(.system(size: 28, weight: .bold)).foregroundStyle(band.color).padding(.bottom, 12)
                    }
                }
                Text(home.score.reason).font(.system(size: 20)).foregroundStyle(Palette.body)
            }
        }
    }

    private func missionCard(_ home: HomeState) -> some View {
        SectionCard {
            Text("오늘 할 일").font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.teal)
            Text(home.mission.title).font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
            if home.missionDone {
                Text("잘하셨어요! 오늘 할 일을 마쳤어요").font(.system(size: 20, weight: .semibold)).foregroundStyle(Palette.teal)
            } else {
                Button {
                    Task { await model.completeMission() }
                } label: {
                    Text("했어요").font(.system(size: 22, weight: .bold)).frame(maxWidth: .infinity, minHeight: 56)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }

    private func alertCard(_ alert: AlertMessage, _ d: Detection) -> some View {
        SectionCard {
            Text(alert.title).font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.amber)
            Text(alert.body).font(.system(size: 18)).foregroundStyle(Palette.body)
            if d.signal.grade == .caution {
                if model.todayResponse(d.signal) != nil {
                    Text("알려 주셔서 고마워요").font(.system(size: 18)).foregroundStyle(Palette.teal)
                } else {
                    HStack(spacing: 12) {
                        Button("괜찮아요") { model.feedback(d, .ok) }.font(.system(size: 18)).buttonStyle(OutlineButtonStyle())
                        Button("틀렸어요") { model.feedback(d, .falseAlarm) }.font(.system(size: 18)).foregroundStyle(Palette.muted)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func sosSheet(_ stage: SosStage) -> some View {
        VStack(spacing: 18) {
            switch stage {
            case .confirm:
                Text("보호자에게 도움을 요청할까요?").font(.system(size: 24, weight: .bold)).foregroundStyle(Palette.navy)
                Text("잘못 눌렀으면 취소를 눌러 주세요.").font(.system(size: 18)).foregroundStyle(Palette.body)
                Button {
                    send()
                } label: {
                    Text("도움 요청 보내기").font(.system(size: 22, weight: .bold)).frame(maxWidth: .infinity, minHeight: 60)
                }
                .buttonStyle(PrimaryButtonStyle(color: Color(red: 0.75, green: 0.15, blue: 0.15)))
                Button("취소") { sos = nil }.font(.system(size: 20))
            case .sending:
                ProgressView()
                Text("보호자에게 알리는 중이에요").font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.navy)
                Text("잠시만 기다려 주세요.").font(.system(size: 18)).foregroundStyle(Palette.body)
            case let .done(title, detail, id):
                Text(title).font(.system(size: 24, weight: .bold)).foregroundStyle(Palette.navy)
                Text(detail).font(.system(size: 18)).foregroundStyle(Palette.body).multilineTextAlignment(.center)
                Button("119 전화") { if let url = URL(string: "tel:119") { openURL(url) } }
                    .font(.system(size: 20, weight: .bold)).foregroundStyle(Color(red: 0.75, green: 0.15, blue: 0.15))
                if let id {
                    Button("괜찮아요, 취소") {
                        Task {
                            if await family.cancel(id) {
                                sos = nil
                            } else {
                                sos = .done(title: title, detail: "취소하지 못했어요. 인터넷을 확인하고 다시 눌러 주시거나 보호자에게 직접 전화해 주세요.", emergencyId: id)
                            }
                        }
                    }
                    .font(.system(size: 18))
                }
                Button("닫기") { sos = nil }.font(.system(size: 18))
            }
        }
        .padding(24)
    }

    private func send() {
        sos = .sending
        Task {
            let result = await family.sos()
            model.metrics.track(.alertSent, ["signal": "SOS", "recipient": "guardian"])
            let text = WatchContract.sosText(result.code)
            if case let .sent(id, n) = result, n > 0 {
                sos = .done(title: text.title, detail: "괜찮으면 \"괜찮아요, 취소\"를 눌러 주세요. 위급하면 119에 전화하세요.", emergencyId: id)
            } else {
                sos = .done(title: text.title, detail: text.body, emergencyId: nil)
            }
        }
    }
}
