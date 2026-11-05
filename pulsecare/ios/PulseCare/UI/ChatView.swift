import PulseCore
import SwiftUI

/// AI 건강 상담. 대화는 이 화면을 여는 동안만 기억하고 아이폰·서버 어디에도 저장하지 않습니다.
/// 위기·응급 표현은 서버가 모델을 부르기 전에 걸러 109·119 안내를 돌려줍니다.
struct ChatView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var messages: [Message] = []
    @State private var input = ""
    @State private var sending = false
    @State private var remaining: Int?
    @State private var error: String?
    @State private var consented = false

    struct Message: Identifiable, Hashable {
        let id = UUID()
        var fromUser: Bool
        var text: String
        var crisis = false
    }

    static let notice = """
    질문과 오늘 화면 정보(컨디션 점수·이유·미션)가 답을 만들기 위해 Anthropic(미국)의 AI로 전송돼요. 펄스케어 서버에는 대화를 저장하지 않고, 화면을 닫으면 대화도 사라져요. 이름·연락처·주민번호는 적지 마세요.

    AI는 의료진이 아니라 진단이나 약 처방을 하지 않아요. 응급 상황에서는 119에 전화하세요.
    """

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("AI 건강 상담").font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
                    if let remaining, remaining >= 0 { Text("오늘 남은 질문 \(remaining)번").font(.system(size: 12)).foregroundStyle(Palette.muted) }
                }
                Spacer()
                Button("닫기") { dismiss() }
            }
            .padding(20)

            if !AppConfig.serverConfigured && !AppConfig.demo {
                notice("AI 상담은 서버가 연결된 빌드에서 쓸 수 있어요.")
            } else if !(consented || model.store.chatConsent) {
                VStack(alignment: .leading, spacing: 14) {
                    Text("시작하기 전에").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.teal)
                    Text(Self.notice).font(.system(size: 15)).foregroundStyle(Palette.body)
                    Button("알겠어요, 시작할게요") {
                        model.store.chatConsent = true
                        consented = true
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    Spacer()
                }
                .padding(20)
            } else {
                conversation
            }
        }
        .background(Palette.paper)
    }

    private func notice(_ text: String) -> some View {
        VStack {
            Text(text).font(.system(size: 15)).foregroundStyle(Palette.body).padding(20)
            Spacer()
        }
    }

    private var conversation: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        if messages.isEmpty {
                            Text("수면, 운동, 오늘 점수에 대해 물어보세요.").font(.system(size: 14)).foregroundStyle(Palette.muted)
                            ForEach(ServerApi.chatSuggestions, id: \.self) { s in
                                Button(s) { send(s) }.buttonStyle(OutlineButtonStyle())
                            }
                        }
                        ForEach(messages) { m in bubble(m).id(m.id) }
                        if sending { Text("답을 쓰는 중이에요…").font(.system(size: 14)).foregroundStyle(Palette.muted) }
                        if let error { Text(error).font(.system(size: 14)).foregroundStyle(Palette.coral) }
                    }
                    .padding(.horizontal, 20)
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
            HStack(spacing: 8) {
                TextField("궁금한 것을 적어 주세요", text: $input, axis: .vertical)
                    .lineLimit(1...4)
                    .textFieldStyle(FilledFieldStyle())
                Button("보내기") { send(input) }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(sending || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(16)
            .background(Palette.card.shadow(.drop(color: .black.opacity(0.05), radius: 10, y: -2)))
        }
    }

    private func bubble(_ m: Message) -> some View {
        HStack {
            if m.fromUser { Spacer(minLength: 40) }
            Text(m.text)
                .font(.system(size: 15))
                .foregroundStyle(m.fromUser ? .white : (m.crisis ? Palette.coral : Palette.body))
                .padding(12)
                .background(m.fromUser ? Palette.teal : Palette.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .shadow(color: .black.opacity(m.fromUser ? 0 : 0.04), radius: 8, y: 2)
            if !m.fromUser { Spacer(minLength: 40) }
        }
    }

    private func send(_ text: String) {
        let question = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !sending else { return }
        messages.append(Message(fromUser: true, text: question))
        input = ""
        error = nil
        sending = true
        // 위기 안내 답은 다음 질문의 대화 맥락에서 뺍니다.
        let turns = messages.filter { !$0.crisis }.map { ChatTurn(role: $0.fromUser ? "user" : "assistant", text: $0.text) }
        let context = model.home.map(ServerApi.chatContext)
        Task {
            defer { sending = false }
            if AppConfig.demo && !AppConfig.serverConfigured {
                messages.append(Message(fromUser: false, text: "어젯밤 수면은 평소와 비슷했지만, 안정시 심박이 사흘째 평소보다 높아요. 오늘은 강한 운동 대신 가벼운 산책을 권해요. 계속 높으면 전문가와 상담해 보세요."))
                remaining = 29
                return
            }
            do {
                let reply = try await ServerApi(baseUrl: AppConfig.serverUrl).chat(installId: model.store.installId, turns: turns, context: context)
                messages.append(Message(fromUser: false, text: reply.reply, crisis: reply.crisis))
                remaining = reply.remainingToday
                model.metrics.track(.chatMessageSent, ["topic": ServerApi.chatTopic(question)])
                if reply.crisis { model.metrics.track(.chatCrisisRouted) }
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
