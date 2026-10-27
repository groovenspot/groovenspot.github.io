import PulseCore
import SwiftUI

/// 기획서·피치 덱·안드로이드 앱과 같은 팔레트.
enum Palette {
    static let navy = Color(red: 0x12 / 255, green: 0x23 / 255, blue: 0x3A / 255)
    static let teal = Color(red: 0x0F / 255, green: 0x7B / 255, blue: 0x66 / 255)
    static let mint = Color(red: 0x7F / 255, green: 0xD1 / 255, blue: 0xBC / 255)
    static let paper = Color(red: 0xF5 / 255, green: 0xF6 / 255, blue: 0xF1 / 255)
    static let card = Color(red: 0xFD / 255, green: 0xFD / 255, blue: 0xFB / 255)
    static let body = Color(red: 0x3D / 255, green: 0x4A / 255, blue: 0x5C / 255)
    static let muted = Color(red: 0x6B / 255, green: 0x77 / 255, blue: 0x87 / 255)
    static let line = Color(red: 0xDD / 255, green: 0xE1 / 255, blue: 0xD9 / 255)
    static let coral = Color(red: 0xD9 / 255, green: 0x65 / 255, blue: 0x3B / 255)
    static let amber = Color(red: 0xB7 / 255, green: 0x79 / 255, blue: 0x1F / 255)
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
}

/// 흰 카드 한 장.
struct SectionCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Palette.line, lineWidth: 1))
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
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var color: Color = Palette.teal
    var textColor: Color = .white

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(textColor)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(color.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(Palette.navy)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12).stroke(Palette.line, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
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
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(caption).font(.system(size: 14)).foregroundStyle(Palette.muted)
                Text(title).font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
            }
            Spacer()
            trailing
        }
    }
}
