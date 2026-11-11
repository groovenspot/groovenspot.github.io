import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// 가족 서버 화면용 모델 (서버 Api.kt, 안드로이드 ServerApi와 같은 모양).

public struct Person: Hashable, Sendable, Decodable {
    public var userId: String
    public var name: String
    public var phone: String?
}

public struct GuardianView: Hashable, Sendable, Decodable {
    public var person: Person
    public var priority: Int
}

public struct AlertView: Hashable, Sendable, Decodable {
    public var signal: String
    public var title: String
    public var body: String
}

public struct DaySummary: Hashable, Sendable, Decodable {
    public var day: String
    public var score: Int?
    public var band: String?
    public var missionTitle: String
    public var missionDone: Bool
    public var alerts: [AlertView]

    enum CodingKeys: String, CodingKey { case day, score, band, missionTitle, missionDone, alerts }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        day = try c.decode(String.self, forKey: .day)
        score = try c.decodeIfPresent(Int.self, forKey: .score)
        band = try c.decodeIfPresent(String.self, forKey: .band).flatMap { $0.isEmpty ? nil : $0 }
        missionTitle = try c.decode(String.self, forKey: .missionTitle)
        missionDone = try c.decode(Bool.self, forKey: .missionDone)
        alerts = try c.decodeIfPresent([AlertView].self, forKey: .alerts) ?? []
    }

    /// 보호자 화면의 한 줄. "72점 · 좋음" / "아직 오늘 기록이 없어요".
    public var scoreLine: String {
        guard let score else { return "점수 없음 (워치 미착용)" }
        let label = band.flatMap(Band.init(rawValue:))?.label
        return label.map { "\(score)점 · \($0)" } ?? "\(score)점"
    }
}

public struct EmergencyView: Hashable, Sendable, Decodable {
    public var id: String
    public var wearerId: String
    public var signal: String
    /// 에포크 밀리초.
    public var createdAt: Int64
    public var status: String
    public var title: String
    public var body: String
    public var closedBy: String?

    public var active: Bool { status == "ACTIVE" }
}

public struct WearerView: Hashable, Sendable, Decodable {
    public var person: Person
    public var today: DaySummary?
    public var emergencies: [EmergencyView]

    enum CodingKeys: String, CodingKey { case person, today, emergencies }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        person = try c.decode(Person.self, forKey: .person)
        today = try c.decodeIfPresent(DaySummary.self, forKey: .today)
        emergencies = try c.decodeIfPresent([EmergencyView].self, forKey: .emergencies) ?? []
    }
}

public struct Family: Hashable, Sendable, Decodable {
    public var guardians: [GuardianView]
    public var wearers: [WearerView]
}

public struct Invite: Hashable, Sendable, Decodable {
    public var code: String
    public var expiresAt: Int64
}

/// 서버가 준 오류. [message]는 그대로 보여줄 수 있는 한국어 문장.
public struct ServerError: Error, LocalizedError, Sendable {
    public var status: Int
    public var code: String
    public var message: String

    public var errorDescription: String? { message }
}

public struct ChatTurn: Hashable, Sendable {
    /// "user" 또는 "assistant".
    public var role: String
    public var text: String

    public init(role: String, text: String) {
        self.role = role
        self.text = text
    }
}

public struct ChatReply: Hashable, Sendable {
    public var reply: String
    public var crisis: Bool
    /// 오늘 남은 질문 수. 서버가 알려주지 않으면 -1.
    public var remainingToday: Int
}

/// 가족 서버 호출. 모든 호출은 async이고 실패하면 ServerError나 URLError를 던집니다.
public struct ServerApi: Sendable {
    public let baseUrl: String
    public let token: String?

    public init(baseUrl: String, token: String? = nil) {
        self.baseUrl = baseUrl
        self.token = token
    }

    public func signUp(name: String) async throws -> (userId: String, token: String) {
        struct R: Decodable { var userId: String; var token: String }
        let r: R = try await call("POST", "/v1/users", ["name": name])
        return (r.userId, r.token)
    }

    public func me() async throws -> Person { try await call("GET", "/v1/me") }

    @discardableResult
    public func updateMe(name: String? = nil, phone: String? = nil, pushToken: String? = nil) async throws -> Person {
        var body = [String: Any]()
        if let name { body["name"] = name }
        if let phone { body["phone"] = phone }
        if let pushToken { body["pushToken"] = pushToken }
        return try await call("PUT", "/v1/me", body)
    }

    public func deleteMe() async throws { try await send("DELETE", "/v1/me") }

    /// 옛 폰: 새 폰에 입력할 코드 (10분).
    public func transferCode() async throws -> Invite { try await call("POST", "/v1/me/transfer") }

    /// 새 폰: 코드로 같은 계정을 받습니다 (사용자 ID, 새 토큰).
    public func redeemTransfer(code: String) async throws -> (userId: String, token: String) {
        struct R: Decodable { var userId: String; var token: String }
        let r: R = try await call("POST", "/v1/transfer", ["code": code])
        return (r.userId, r.token)
    }

    /// [role]: 내가 맡을 역할. "GUARDIAN"(부모님 초대) 또는 "WEARER"(보호자 초대).
    public func invite(role: String) async throws -> Invite { try await call("POST", "/v1/invites", ["role": role]) }

    /// (초대한 사람 이름, 그 사람이 맡을 역할).
    public func preview(code: String) async throws -> (inviterName: String, inviterRole: String) {
        struct R: Decodable { var inviterName: String; var inviterRole: String }
        let clean = String(code.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) })
        let r: R = try await call("GET", "/v1/invites/\(clean)")
        return (r.inviterName, r.inviterRole)
    }

    public func accept(code: String) async throws -> Family { try await call("POST", "/v1/invites/accept", ["code": code]) }

    public func family() async throws -> Family { try await call("GET", "/v1/family") }

    public func unlink(userId: String) async throws -> Family { try await call("DELETE", "/v1/family/\(userId)") }

    public func order(guardianIds: [String]) async throws -> Family { try await call("PUT", "/v1/family/order", ["guardianIds": guardianIds]) }

    public func uploadSummary(_ body: [String: Any]) async throws { try await send("POST", "/v1/summaries", body) }

    /// 긴급 요청. 돌려주는 값: (긴급 ID, 알릴 보호자 수).
    public func emergency(signal: String) async throws -> (id: String, guardians: Int) {
        struct R: Decodable { var id: String; var guardians: Int }
        let r: R = try await call("POST", "/v1/emergencies", ["signal": signal])
        return (r.id, r.guardians)
    }

    public func ack(_ id: String) async throws -> EmergencyView { try await call("POST", "/v1/emergencies/\(id)/ack") }

    public func cancel(_ id: String) async throws -> EmergencyView { try await call("POST", "/v1/emergencies/\(id)/cancel") }

    /// AI 건강 상담.
    public func chat(installId: String, turns: [ChatTurn], context: [String: Any]?) async throws -> ChatReply {
        struct R: Decodable { var reply: String; var crisis: Bool?; var remainingToday: Int? }
        var body: [String: Any] = ["installId": installId, "messages": turns.map { ["role": $0.role, "text": $0.text] }]
        if let context { body["context"] = context }
        let r: R = try await call("POST", "/v1/chat", body)
        return ChatReply(reply: r.reply, crisis: r.crisis ?? false, remainingToday: r.remainingToday ?? -1)
    }

    /// 이용 통계 (로그인 없이 설치 ID로).
    public func sendEvents(_ body: [String: Any]) async throws { try await send("POST", "/v1/events", body) }

    public func forgetEvents(installId: String) async throws { try await send("POST", "/v1/events/forget", ["installId": installId]) }

    // MARK: 요청

    private func call<T: Decodable>(_ method: String, _ path: String, _ body: [String: Any]? = nil) async throws -> T {
        let data = try await send(method, path, body)
        return try JSONDecoder().decode(T.self, from: data)
    }

    @discardableResult
    private func send(_ method: String, _ path: String, _ body: [String: Any]? = nil) async throws -> Data {
        let base = baseUrl.hasSuffix("/") ? String(baseUrl.dropLast()) : baseUrl
        guard let url = URL(string: base + path) else { throw URLError(.badURL) }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status >= 400 || status == 0 { throw Self.error(status: status, data: data) }
        return data
    }

    static func error(status: Int, data: Data) -> ServerError {
        let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        return ServerError(
            status: status,
            code: o?["error"] as? String ?? "HTTP_\(status)",
            message: o?["message"] as? String ?? "잠시 후 다시 시도해 주세요"
        )
    }

    /// 오늘 요약을 보호자에게. 수면 시간·심박 같은 원수치는 보내지 않고, 점수·구간·미션과 주의 신호만 보냅니다.
    public static func summaryBody(_ home: HomeState) -> [String: Any] {
        [
            "day": home.date.description,
            "score": home.score.score.map { $0 as Any } ?? NSNull(),
            "band": home.score.band.map { $0.rawValue as Any } ?? NSNull(),
            "missionTitle": home.mission.title,
            "missionDone": home.missionDone,
            "signals": home.alertDetections.map { d -> [String: Any] in
                var o: [String: Any] = ["signal": d.signal.rawValue]
                if let u = d.usual { o["usual"] = u }
                if let c = d.current { o["current"] = c }
                if let n = d.days { o["days"] = n }
                return o
            },
        ]
    }

    /// AI 상담에 같이 보내는 오늘 홈 화면 내용 (사용자가 상담 안내에 동의한 범위).
    public static func chatContext(_ home: HomeState) -> [String: Any] {
        var o: [String: Any] = ["mission": home.mission.title, "goal": home.mission.goal.label]
        if let s = home.score.score { o["score"] = s }
        if let b = home.score.band { o["band"] = b.label }
        if !home.score.reason.trimmingCharacters(in: .whitespaces).isEmpty { o["reason"] = home.score.reason }
        return o
    }

    /// 이용 통계용 주제 (원문은 보내지 않음).
    public static func chatTopic(_ text: String) -> String {
        func any(_ words: [String]) -> Bool { words.contains { text.contains($0) } }
        if any(["잠", "수면", "졸", "깼", "불면"]) { return "sleep" }
        if any(["운동", "걷", "산책", "걸음", "달리", "근력"]) { return "exercise" }
        if any(["스트레스", "불안", "긴장", "호흡", "피곤", "지쳐"]) { return "stress" }
        if any(["점수", "컨디션", "HRV", "심박"]) { return "score" }
        return "other"
    }

    public static let chatSuggestions = ["오늘 점수가 왜 이렇게 나왔어요?", "잠이 잘 안 와요", "오늘 운동해도 될까요?", "HRV가 뭐예요?"]
}
