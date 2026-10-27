import PulseCore
import SwiftUI

/// 첫 실행 동의. 개인정보 보호법 제22조: 항목별로 구분해 동의, 민감정보(제23조)는 따로, 선택 항목은 거부해도 이용 가능.
struct ConsentView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.openURL) private var openURL
    @State private var checked = Set<Item>()

    enum Item: CaseIterable, Hashable {
        case age, terms, privacy, health, analytics

        var label: String {
            switch self {
            case .age: "만 14세 이상이에요"
            case .terms: "서비스 이용약관 동의"
            case .privacy: "개인정보 수집·이용 동의"
            case .health: "건강정보(민감정보) 처리 동의"
            case .analytics: "이용 통계 수집 동의"
            }
        }

        var required: Bool { self != .analytics }

        var url: URL? {
            switch self {
            case .age: nil
            case .terms: AppConfig.termsUrl
            default: AppConfig.privacyUrl
            }
        }
    }

    var body: some View {
        OnboardingPage(step: "시작하기 전에", title: "펄스케어 이용 동의",
                       subtitle: "펄스케어는 진단이나 치료가 아닌 생활 습관 코칭 서비스예요. 필수 항목에 동의해야 시작할 수 있어요.",
                       primary: "동의하고 시작", enabled: Item.allCases.filter(\.required).allSatisfy(checked.contains)) {
            model.agree(analytics: checked.contains(.analytics))
        } content: {
            let all = checked.count == Item.allCases.count
            row("전체 동의", all, bold: true, url: nil) { checked = all ? [] : Set(Item.allCases) }
            Divider()
            ForEach(Item.allCases, id: \.self) { item in
                row("[\(item.required ? "필수" : "선택")] \(item.label)", checked.contains(item), bold: false, url: item.url) {
                    if checked.contains(item) { checked.remove(item) } else { checked.insert(item) }
                }
            }
            Text("건강 앱의 수면·심박·HRV·걸음 등 기록을 이 아이폰 안에서 읽어 컨디션 점수와 미션을 계산해요. 수치 자체는 서버로 보내지 않아요. 가족 연결을 켜면 점수·미션·주의 알림만 내가 연결한 보호자에게 전달돼요.")
                .font(.system(size: 13)).foregroundStyle(Palette.muted)
            Text("이용 통계: 앱을 연 횟수, 미션 완료처럼 어떤 기능을 썼는지를 무작위 기기 ID로 모아 서비스를 개선해요. 점수·건강 수치·이름은 보내지 않고, 내 정보에서 언제든 끌 수 있어요.")
                .font(.system(size: 13)).foregroundStyle(Palette.muted)
            Text("만 14세 미만은 펄스케어를 쓸 수 없어요.").font(.system(size: 13)).foregroundStyle(Palette.muted)
        }
    }

    private func row(_ text: String, _ on: Bool, bold: Bool, url: URL?, toggle: @escaping () -> Void) -> some View {
        HStack {
            Button(action: toggle) {
                HStack(spacing: 10) {
                    Image(systemName: on ? "checkmark.circle.fill" : "circle").foregroundStyle(on ? Palette.teal : Palette.line).font(.system(size: 22))
                    Text(text).font(.system(size: 15, weight: bold ? .bold : .regular)).foregroundStyle(Palette.navy)
                }
            }
            .buttonStyle(.plain)
            Spacer()
            if let url { Button("보기") { openURL(url) }.font(.system(size: 14)) }
        }
    }
}

/// 목표 고르기 (처음 한 번, 그리고 주간 리포트에서 바꿀 때).
struct GoalView: View {
    @EnvironmentObject private var model: AppModel
    var changing = false
    var onChanged: ((Goal) -> Void)?
    @State private var goal = Goal.sleep
    @State private var senior = false
    @State private var guardianOnly = false
    @State private var starting = false

    static let descriptions: [Goal: String] = [
        .sleep: "잠드는 시간과 수면의 질을 챙겨요",
        .weight: "걷기와 운동량을 조금씩 늘려요",
        .stress: "호흡과 쉬는 시간으로 회복을 도와요",
        .parent: "멀리 계신 부모님의 하루를 함께 챙겨요",
    ]

    var body: some View {
        OnboardingPage(
            step: changing ? "목표 바꾸기" : "1 / 2",
            title: "어떤 걸 가장 챙기고 싶으세요?",
            subtitle: changing ? "새 목표로 내일부터 미션을 드려요. 목표별 레벨은 그대로 기억해요." : "매일 이 목표에 맞는 미션을 하나씩 드려요. 나중에 바꿀 수 있어요.",
            primary: changing ? "바꾸기" : (starting ? "준비 중…" : "시작하기"),
            enabled: !starting
        ) {
            if changing {
                onChanged?(goal)
            } else {
                starting = true
                Task { await model.start(goal: goal, seniorMode: senior, guardianOnly: guardianOnly) }
            }
        } content: {
            ForEach([Goal.sleep, .weight, .stress, .parent], id: \.self) { g in
                Button {
                    goal = g
                    if g != .parent { guardianOnly = false }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(g.label).font(.system(size: 18, weight: .bold)).foregroundStyle(Palette.navy)
                        Text(Self.descriptions[g] ?? "").font(.system(size: 14)).foregroundStyle(Palette.muted)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Palette.card, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(goal == g ? Palette.teal : Palette.line, lineWidth: goal == g ? 2 : 1))
                }
                .buttonStyle(.plain)
            }
            if !changing {
                Toggle("큰 글씨로 쉽게 보기 (어르신용)", isOn: $senior).font(.system(size: 15)).tint(Palette.teal)
                if goal == .parent {
                    Toggle("워치 없이 보호자로만 쓸게요", isOn: $guardianOnly).font(.system(size: 15)).tint(Palette.teal)
                }
                VStack(alignment: .leading, spacing: 6) {
                    ForEach([
                        "수면 시간·심박 같은 건강 수치는 이 아이폰에서만 계산하고 서버에 보내지 않아요",
                        "건강 앱에서 읽기만 하고, 아무것도 쓰지 않아요",
                        "진단이나 치료가 아닌 생활 습관 코칭이에요",
                    ], id: \.self) { Text("· \($0)").font(.system(size: 14)).foregroundStyle(Palette.body) }
                }
            }
        }
    }
}

/// 가입 단계 한 장: 단계, 제목, 설명, 내용, 아래 고정 버튼.
struct OnboardingPage<Content: View>: View {
    var step: String
    var title: String
    var subtitle: String
    var primary: String
    var enabled: Bool
    var onPrimary: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(step).font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.teal)
                    Text(title).font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
                    Text(subtitle).font(.system(size: 15)).foregroundStyle(Palette.body)
                    content
                }
                .padding(24)
            }
            Button(action: onPrimary) {
                Text(primary).frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle(color: enabled ? Palette.teal : Palette.line))
            .disabled(!enabled)
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .background(Palette.paper)
    }
}
