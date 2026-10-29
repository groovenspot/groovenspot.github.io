import PulseCore
import SwiftUI

/// 색. 밝은 회색 바탕에 흰 카드, 진한 글자와 회색 단계로 위계를 두고, 강조는 청록 하나만 씁니다.
/// (토스·애플 건강처럼 군더더기 없는 금융·건강 앱 화면을 참고)
enum Palette {
    /// 제목·숫자 (거의 검정).
    static let navy = Color(hex: 0x191F28)
    /// 강조: 버튼, 좋은 구간, 링크.
    static let teal = Color(hex: 0x0E9F7A)
    /// 어두운 바탕 위 강조.
    static let mint = Color(hex: 0x7FE3C6)
    /// 화면 바탕.
    static let paper = Color(hex: 0xF2F4F6)
    static let card = Color.white
    /// 본문.
    static let body = Color(hex: 0x4E5968)
    /// 보조 글자.
    static let muted = Color(hex: 0x8B95A1)
    /// 구분선·빈 칸.
    static let line = Color(hex: 0xE5E8EB)
    static let coral = Color(hex: 0xF0603A)
    static let amber = Color(hex: 0xE08A00)
    /// 보조 버튼 바탕 (카드 위 연한 회색).
    static let fill = Color(hex: 0xF2F4F6)
    /// 진한 카드 (주간 리포트, 호흡) 그라데이션.
    static let deep = LinearGradient(colors: [Color(hex: 0x14213D), Color(hex: 0x0B5A4E)], startPoint: .topLeading, endPoint: .bottomTrailing)
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

extension Band {
    /// 낮은 구간도 빨강 대신 주황 계열로: 빨강은 긴급에만 씁니다 (기획서 12번 문구 가이드).
    var color: Color {
        switch self {
        case .peak, .good: Palette.teal
        case .fair: Palette.amber
        case .low, .veryLow: Palette.coral
        }
    }

    /// 점수 링의 그라데이션 (밝은 쪽 → 구간 색).
    var ringColors: [Color] {
        switch self {
        case .peak, .good: [Color(hex: 0x7FE3C6), Palette.teal]
        case .fair: [Color(hex: 0xFFD27A), Palette.amber]
        case .low, .veryLow: [Color(hex: 0xFFB199), Palette.coral]
        }
    }
}

/// 흰 카드 한 장. 테두리 없이 아주 옅은 그림자로 바탕과 나눕니다.
struct SectionCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) { content }
            .padding(22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 14, x: 0, y: 4)
    }
}

/// 카드 머리: 색 원 안의 아이콘 + 작은 제목 + 오른쪽 보조.
struct CardHeader<Trailing: View>: View {
    var icon: String
    var title: String
    var tint: Color = Palette.teal
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 30, height: 30)
                .background(tint.opacity(0.12), in: Circle())
            Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.body)
            Spacer()
            trailing
        }
    }
}

extension CardHeader where Trailing == EmptyView {
    init(icon: String, title: String, tint: Color = Palette.teal) {
        self.init(icon: icon, title: title, tint: tint) { EmptyView() }
    }
}

struct Chip: View {
    var text: String
    var color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.12), in: Capsule())
    }
}

/// 꽉 찬 주 버튼.
struct PrimaryButtonStyle: ButtonStyle {
    var color: Color = Palette.teal
    var textColor: Color = .white

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(textColor)
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(color, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// 보조 버튼: 연한 회색 바탕 (테두리 없음).
struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Palette.body)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Palette.fill, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// 점수 링 (구간 색 그라데이션, 0~100).
struct ScoreRing: View {
    var score: Int?
    var band: Band?
    var size: CGFloat = 132
    var lineWidth: CGFloat = 12
    var caption: String? = nil

    @State private var shown = 0.0

    var body: some View {
        ZStack {
            Circle().stroke(Palette.line, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: shown)
                .stroke(AngularGradient(colors: band?.ringColors ?? [Palette.line, Palette.muted], center: .center, startAngle: .degrees(0), endAngle: .degrees(360 * max(shown, 0.01))),
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text(score.map(String.init) ?? "-").font(.system(size: size * 0.36, weight: .bold, design: .rounded)).foregroundStyle(Palette.navy)
                if let caption { Text(caption).font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.muted) }
            }
        }
        .frame(width: size, height: size)
        .onAppear { withAnimation(.easeOut(duration: 0.9)) { shown = Double(score ?? 0) / 100 } }
        .onChange(of: score) { _, s in withAnimation(.easeOut(duration: 0.6)) { shown = Double(s ?? 0) / 100 } }
    }
}

/// "6월 16일 수요일".
func koreanDate(_ d: LocalDate) -> String {
    let names = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
    return "\(d.month)월 \(d.day)일 \(names[d.dayOfWeek.rawValue - 1])"
}

/// 화면 위 제목 줄.
struct ScreenHeader<Trailing: View>: View {
    var caption: String
    var title: String
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text(caption).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.muted)
                Text(title).font(.system(size: 28, weight: .bold)).foregroundStyle(Palette.navy)
            }
            Spacer()
            trailing
        }
        .padding(.top, 8)
    }
}

/// 제목 줄 오른쪽 원형 아이콘 버튼.
struct HeaderIconButton: View {
    var systemName: String
    var label: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.body)
                .frame(width: 40, height: 40)
                .background(Palette.card, in: Circle())
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        }
        .accessibilityLabel(label)
    }
}

extension Goal {
    /// 미션 카드 아이콘.
    var icon: String {
        switch self {
        case .sleep: "moon.stars.fill"
        case .weight: "figure.walk"
        case .stress: "wind"
        case .parent: "heart.circle.fill"
        case .lowDay: "leaf.fill"
        }
    }
}
