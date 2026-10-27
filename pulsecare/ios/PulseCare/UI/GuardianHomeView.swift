import PulseCore
import SwiftUI

/// 워치 없는 보호자의 "부모님" 탭: 긴급 → 부모님 오늘 카드 → 오늘의 보호자 미션.
struct GuardianHomeView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var family: FamilyModel
    var onOpenFamily: () -> Void
    var onOpenSettings: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                ScreenHeader(caption: koreanDate(model.today), title: "부모님 오늘") {
                    Button("내 정보", action: onOpenSettings).font(.system(size: 15, weight: .semibold))
                }
                if let error = family.error { Text(error).font(.system(size: 14)).foregroundStyle(Palette.coral) }
                content
                if let home = model.home { mission(home) }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Palette.paper)
        .refreshable {
            await model.refresh()
            await family.load()
        }
        .task { await family.load() }
    }

    @ViewBuilder
    private var content: some View {
        if !family.configured {
            SectionCard {
                Text("가족 연결 준비 중").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.navy)
                Text("이 테스트 빌드에는 가족 서버 주소가 없어 부모님 요약을 볼 수 없어요.").font(.system(size: 14)).foregroundStyle(Palette.body)
            }
        } else if !family.hasAccount || family.family?.wearers.isEmpty == true {
            SectionCard {
                Text("아직 연결된 부모님이 없어요").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.navy)
                Text("부모님 폰에 펄스케어를 설치하고 초대 코드를 입력하면, 매일 컨디션과 미션, 주의 알림을 여기서 함께 봐요. SOS를 누르면 바로 알려 드려요.")
                    .font(.system(size: 14)).foregroundStyle(Palette.body)
                Button(family.hasAccount ? "부모님 초대하기" : "가족 연결 시작하기", action: onOpenFamily).buttonStyle(PrimaryButtonStyle())
            }
        } else if let f = family.family {
            ForEach(f.wearers, id: \.person.userId) { w in WearerCard(wearer: w) }
        } else {
            Text("부모님 소식을 불러오는 중이에요").foregroundStyle(Palette.muted)
        }
    }

    private func mission(_ home: HomeState) -> some View {
        SectionCard {
            Text("오늘의 보호자 미션").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.teal)
            Text(home.mission.title).font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.navy)
            Text(missionHint(home.mission, .manual)).font(.system(size: 13)).foregroundStyle(Palette.muted)
            if home.missionDone {
                Text("완료했어요").font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.teal)
            } else {
                Button("완료했어요") { Task { await model.completeMission() } }.buttonStyle(PrimaryButtonStyle())
            }
        }
    }
}

/// 부모님 한 분의 오늘: 진행 중인 긴급, 점수·미션, 주의 알림, 전화.
struct WearerCard: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var family: FamilyModel
    @Environment(\.openURL) private var openURL
    var wearer: WearerView
    @State private var answered = Set<String>()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(wearer.emergencies.filter(\.active), id: \.id) { e in
                VStack(alignment: .leading, spacing: 8) {
                    Text(e.title).font(.system(size: 18, weight: .bold)).foregroundStyle(.white)
                    Text(e.body).font(.system(size: 15)).foregroundStyle(.white)
                    HStack(spacing: 10) {
                        Button("확인했어요") {
                            Task {
                                if await family.ack(e.id) {
                                    if let s = Signal(rawValue: e.signal) { model.feedback(Detection(s), .contacted) }
                                }
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle(color: .white, textColor: Palette.navy))
                        if let phone = wearer.person.phone {
                            Button("전화하기") { if let url = URL(string: "tel:\(phone)") { openURL(url) } }.foregroundStyle(.white)
                        }
                        Button("119") { if let url = URL(string: "tel:119") { openURL(url) } }.foregroundStyle(.white)
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 0.75, green: 0.15, blue: 0.15), in: RoundedRectangle(cornerRadius: 16))
            }
            SectionCard {
                HStack {
                    Text(wearer.person.name).font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.navy)
                    Spacer()
                    if let phone = wearer.person.phone {
                        Button("전화") { if let url = URL(string: "tel:\(phone)") { openURL(url) } }.font(.system(size: 15, weight: .semibold))
                    }
                }
                if let t = wearer.today {
                    Text(t.scoreLine).font(.system(size: 17, weight: .semibold)).foregroundStyle(Palette.body)
                    Text("미션: \(t.missionTitle) · \(t.missionDone ? "완료" : "아직")").font(.system(size: 15)).foregroundStyle(Palette.body)
                    ForEach(t.alerts, id: \.signal) { a in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(a.title).font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.amber)
                            Text(a.body).font(.system(size: 14)).foregroundStyle(Palette.body)
                            if answered.contains(a.signal) {
                                Text("알려 주셔서 고마워요").font(.system(size: 13)).foregroundStyle(Palette.teal)
                            } else if let s = Signal(rawValue: a.signal) {
                                HStack(spacing: 8) {
                                    Button(FeedbackResponse.contacted.label) {
                                        model.feedback(Detection(s), .contacted)
                                        answered.insert(a.signal)
                                    }
                                    .buttonStyle(OutlineButtonStyle())
                                    Button(FeedbackResponse.falseAlarm.label) {
                                        model.feedback(Detection(s), .falseAlarm)
                                        answered.insert(a.signal)
                                    }
                                    .foregroundStyle(Palette.muted)
                                }
                            }
                        }
                    }
                } else {
                    Text("아직 오늘 기록이 없어요").font(.system(size: 15)).foregroundStyle(Palette.muted)
                }
            }
        }
    }
}
