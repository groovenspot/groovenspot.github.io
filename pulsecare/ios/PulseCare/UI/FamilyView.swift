import PulseCore
import SwiftUI

/// 가족 탭 (기획서 15·17번): 내가 챙기는 가족, 나를 챙기는 보호자(연락 순서), 초대, 새 폰으로 옮기기.
struct FamilyView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var family: FamilyModel

    @State private var name = ""
    @State private var phone = ""
    @State private var transferInput = ""
    @State private var inviteCode = ""
    @State private var invite: (role: String, code: Invite)?
    @State private var pendingAccept: (code: String, inviter: String, role: String)?
    @State private var confirmInvite = false
    @State private var transfer: Invite?
    @State private var unlinkTarget: (person: Person, role: String)?

    static let shareNotice = "보호자에게 매일 컨디션 점수와 구간, 오늘의 미션 완료 여부, 주의 알림(걸음 수 감소 등)과 긴급 알림(SOS·낙상)이 공유돼요. 수면 시간·심박 같은 수치는 공유하지 않아요. 언제든 연결을 끊을 수 있어요."

    private var guardianMode: Bool { model.profile?.guardianOnly == true }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("가족").font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
                    Spacer()
                    if family.me != nil { Button("새로고침") { Task { await family.load() } } }
                }
                if let e = family.error { Text(e).font(.system(size: 14)).foregroundStyle(Palette.coral) }
                if !family.configured {
                    SectionCard {
                        Text("가족 연결 준비 중").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.navy)
                        Text("이 테스트 빌드에는 가족 서버 주소가 없어요. 서버를 연결한 빌드에서 보호자 초대, 하루 요약 공유, 긴급 알림 전달을 쓸 수 있어요.")
                            .font(.system(size: 14)).foregroundStyle(Palette.body)
                    }
                } else if !family.hasAccount {
                    startCard
                    restoreCard
                } else {
                    linked
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Palette.paper)
        .task { await family.load() }
        .alert("보호자를 초대할까요?", isPresented: $confirmInvite) {
            Button("동의하고 초대") { Task { await makeInvite("WEARER") } }
            Button("취소", role: .cancel) {}
        } message: { Text(Self.shareNotice) }
        .alert(acceptTitle, isPresented: Binding(get: { pendingAccept != nil }, set: { if !$0 { pendingAccept = nil } })) {
            Button(pendingAccept?.role == "WEARER" ? "연결하기" : "동의하고 연결") {
                if let p = pendingAccept { Task { await family.accept(code: p.code, role: p.role == "WEARER" ? "GUARDIAN" : "WEARER") } }
                pendingAccept = nil
                inviteCode = ""
            }
            Button("취소", role: .cancel) { pendingAccept = nil }
        } message: { Text(acceptMessage) }
        .alert("새 폰에 이 코드를 입력하세요", isPresented: Binding(get: { transfer != nil }, set: { if !$0 { transfer = nil } })) {
            Button("닫기", role: .cancel) {}
        } message: {
            Text("\(transfer?.code ?? "")\n\n새 폰의 펄스케어 > 가족 탭 > \"폰을 바꿨어요\"에 입력하면 이름, 가족 연결, 연락 순서가 그대로 옮겨져요. 10분 동안 한 번만 쓸 수 있고, 옮기면 이 폰은 가족 계정에서 로그아웃돼요. 다른 사람에게 보여 주지 마세요.")
        }
        .alert(unlinkTarget.map { "\($0.person.name)님과 연결을 끊을까요?" } ?? "", isPresented: Binding(get: { unlinkTarget != nil }, set: { if !$0 { unlinkTarget = nil } })) {
            Button("연결 끊기", role: .destructive) {
                if let t = unlinkTarget { Task { await family.unlink(t.person.userId, role: t.role) } }
            }
            Button("취소", role: .cancel) {}
        } message: { Text("더 이상 하루 요약과 긴급 알림을 주고받지 않아요. 다시 연결하려면 새 초대 코드가 필요해요.") }
    }

    // 초대한 사람이 "WEARER"(보호자를 초대)면 나는 보호자가 되고, "GUARDIAN"(부모님을 초대)이면 그 사람이 내 보호자가 됩니다.
    private var acceptTitle: String {
        guard let p = pendingAccept else { return "" }
        return p.role == "WEARER" ? "\(p.inviter)님의 보호자가 돼요" : "\(p.inviter)님이 보호자가 돼요"
    }

    private var acceptMessage: String {
        guard let p = pendingAccept else { return "" }
        return p.role == "WEARER"
            ? "\(p.inviter)님의 하루 요약(컨디션 점수, 미션, 주의 알림)과 긴급 알림(SOS·낙상)을 받아요. 긴급 알림을 받으면 꼭 확인해 주세요."
            : Self.shareNotice
    }

    private var startCard: some View {
        SectionCard {
            Text("가족과 함께 챙기기").font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.navy)
            Text("부모님이나 가족을 초대하면 하루 요약을 함께 보고, SOS를 누르면 보호자에게 바로 알려요.").font(.system(size: 14)).foregroundStyle(Palette.body)
            TextField("가족에게 보일 이름 (예: 엄마, 민지)", text: $name).textFieldStyle(.roundedBorder)
            TextField("전화번호 (선택, 가족이 '전화하기'에 써요)", text: $phone).textFieldStyle(.roundedBorder).keyboardType(.phonePad)
            Button(family.busy ? "만드는 중…" : "시작하기") {
                Task { await family.start(name: name.trimmingCharacters(in: .whitespaces), phone: phone) }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(family.busy || name.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private var restoreCard: some View {
        SectionCard {
            Text("폰을 바꿨어요").font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.navy)
            Text("옛 폰의 가족 탭 > \"새 폰으로 옮기기\"에서 받은 10자리 코드를 넣으면 가족 연결을 그대로 가져와요.").font(.system(size: 13)).foregroundStyle(Palette.muted)
            HStack {
                TextField("옮기기 코드 10자리", text: $transferInput).textFieldStyle(.roundedBorder).textInputAutocapitalization(.characters)
                Button("불러오기") { Task { await family.restore(code: transferInput.trimmingCharacters(in: .whitespaces)) } }
                    .disabled(transferInput.count < 6 || family.busy)
            }
        }
    }

    @ViewBuilder
    private var linked: some View {
        if let f = family.family {
            if !f.wearers.isEmpty {
                Text("내가 챙기는 가족").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.teal)
                ForEach(f.wearers, id: \.person.userId) { w in
                    WearerCard(wearer: w)
                    Button("\(w.person.name)님과 연결 끊기") { unlinkTarget = (w.person, "WEARER") }.font(.system(size: 13)).foregroundStyle(Palette.muted)
                }
            }
            if !guardianMode {
                Text("나를 챙기는 보호자").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.teal)
                guardians(f.guardians.sorted { $0.priority < $1.priority })
            }
            if !AppConfig.demo && AppConfig.serverConfigured && model.store.pushToken == nil {
                Text("이 아이폰은 아직 푸시 알림을 받을 수 없어 가족 소식을 이 탭을 열 때만 확인해요. 설정 > 알림에서 펄스케어 알림을 켜 주세요.")
                    .font(.system(size: 13)).foregroundStyle(Palette.muted)
            }
        } else {
            Text("가족을 불러오는 중이에요").foregroundStyle(Palette.muted)
        }
        inviteCard
        if let me = family.me {
            HStack {
                Text("내 이름: \(me.name)" + (me.phone.map { " · \($0)" } ?? "")).font(.system(size: 13)).foregroundStyle(Palette.muted)
                Spacer()
                Button("새 폰으로 옮기기") { Task { transfer = await family.transferCode() } }.font(.system(size: 13)).disabled(family.busy)
            }
        }
    }

    private func guardians(_ list: [GuardianView]) -> some View {
        SectionCard {
            if list.isEmpty {
                Text("아직 보호자가 없어요. 아래에서 보호자를 초대하면 SOS가 보호자에게 가요.").font(.system(size: 14)).foregroundStyle(Palette.body)
            } else {
                Text("긴급할 때 이 순서로 1분 간격으로 알려요. 3분 안에 아무도 확인하지 않으면 모두에게 다시 알려요.").font(.system(size: 13)).foregroundStyle(Palette.muted)
                ForEach(Array(list.enumerated()), id: \.element.person.userId) { i, g in
                    HStack {
                        Text("\(g.priority)").font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.teal).frame(width: 24)
                        Text(g.person.name).font(.system(size: 16)).foregroundStyle(Palette.navy)
                        Spacer()
                        if i > 0 { Button("위로") { move(list, i, -1) }.font(.system(size: 13)) }
                        if i < list.count - 1 { Button("아래로") { move(list, i, 1) }.font(.system(size: 13)) }
                        Button("끊기") { unlinkTarget = (g.person, "GUARDIAN") }.font(.system(size: 13)).foregroundStyle(Palette.muted)
                    }
                }
            }
        }
    }

    private func move(_ list: [GuardianView], _ i: Int, _ by: Int) {
        var ids = list.map(\.person.userId)
        ids.swapAt(i, i + by)
        Task { await family.order(ids) }
    }

    private var inviteCard: some View {
        SectionCard {
            Text("초대하기").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.navy)
            if let invite {
                Text(invite.role == "WEARER" ? "보호자에게 보낼 코드" : "챙길 가족에게 보낼 코드").font(.system(size: 13)).foregroundStyle(Palette.muted)
                Text(invite.code.code).font(.system(size: 30, weight: .bold, design: .monospaced)).foregroundStyle(Palette.navy)
                Text("7일 동안 한 번 쓸 수 있어요. 받은 사람이 펄스케어 가족 탭에서 입력해요.").font(.system(size: 13)).foregroundStyle(Palette.muted)
                ShareLink(item: "펄스케어 가족 초대 코드: \(invite.code.code)\n앱의 가족 탭에서 입력해 주세요.") { Text("메시지로 보내기") }
                    .buttonStyle(PrimaryButtonStyle())
            }
            HStack(spacing: 8) {
                if !guardianMode {
                    Button("보호자 초대") { confirmInvite = true }.buttonStyle(OutlineButtonStyle()).disabled(family.busy)
                }
                Button("부모님 초대") { Task { await makeInvite("GUARDIAN") } }.buttonStyle(OutlineButtonStyle()).disabled(family.busy)
            }
            Text("받은 코드가 있나요?").font(.system(size: 13)).foregroundStyle(Palette.muted).padding(.top, 6)
            HStack {
                TextField("초대 코드 8자리", text: $inviteCode).textFieldStyle(.roundedBorder).textInputAutocapitalization(.characters)
                Button("확인") {
                    Task {
                        let code = inviteCode.trimmingCharacters(in: .whitespaces)
                        if let p = await family.preview(code: code) { pendingAccept = (code, p.inviterName, p.inviterRole) }
                    }
                }
                .disabled(inviteCode.count < 6 || family.busy)
            }
        }
    }

    private func makeInvite(_ role: String) async {
        if let code = await family.invite(role: role) { invite = (role, code) }
    }
}
