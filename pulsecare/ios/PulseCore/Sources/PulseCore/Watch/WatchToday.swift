import Foundation

/// 폰이 워치로 보내는 오늘 요약 (기획서 15번). 워치는 계산하지 않고 받은 것만 보여줍니다.
public struct WatchToday: Hashable, Sendable, Codable {
    public var date: LocalDate
    /// 워치를 안 차서 점수가 없는 날은 nil.
    public var score: Int?
    public var band: Band?
    /// 이유 한 줄.
    public var reason: String
    public var missionId: String
    public var missionTitle: String
    public var missionDone: Bool
    /// 첫 7일 학습 중이면 며칠째인지.
    public var learningDay: Int?

    public init(date: LocalDate, score: Int?, band: Band?, reason: String, missionId: String, missionTitle: String, missionDone: Bool, learningDay: Int? = nil) {
        self.date = date
        self.score = score
        self.band = band
        self.reason = reason
        self.missionId = missionId
        self.missionTitle = missionTitle
        self.missionDone = missionDone
        self.learningDay = learningDay
    }
}

/// 워치 화면·위젯·컴플리케이션에 그대로 쓰는 글자.
public struct WatchDisplay: Hashable, Sendable {
    public var score: String
    public var label: String
    public var reason: String
    public var mission: String
    public var missionDone: Bool
    /// 오늘 것이 아니면 미션 완료 버튼을 숨깁니다.
    public var stale: Bool
}

/// 안드로이드 워치와 같은 약속. 애플워치는 WatchConnectivity의 applicationContext·message에 같은 키를 씁니다.
public enum WatchContract {
    public static let pathToday = "/pulsecare/today"
    public static let pathMissionDone = "/pulsecare/mission-done"
    public static let pathSos = "/pulsecare/sos"
    public static let pathSosResult = "/pulsecare/sos-result"
    /// 워치에서 일어난 일을 폰의 이용 통계로 ("score_viewed|tile|FULL").
    public static let pathEvent = "/pulsecare/event"

    /// 폰이 워치에 돌려주는 SOS 결과: "SENT:2", "NO_ACCOUNT", "FAILED".
    public static let sosNoAccount = "NO_ACCOUNT"
    public static let sosFailed = "FAILED"
    public static func sosSent(_ guardians: Int) -> String { "SENT:\(guardians)" }

    /// 워치 SOS 화면 문구 (제목, 설명). 보호자에게 가지 않았으면 그렇게 말합니다.
    public static func sosText(_ result: String?) -> (title: String, body: String) {
        let sent = result.flatMap { $0.hasPrefix("SENT:") ? Int($0.dropFirst(5)) : nil }
        if result == nil { return ("휴대폰에 알렸어요", "보호자에게 보내는 중이에요.") }
        if let sent, sent > 0 { return ("보호자 \(sent)명에게 알렸어요", "괜찮으면 휴대폰 알림에서 취소해 주세요.") }
        if sent == 0 { return ("연결된 보호자가 없어요", "위급하면 워치 긴급 SOS(측면 버튼 길게)나 119를 쓰세요.") }
        if result == sosFailed { return ("보호자에게 보내지 못했어요", "위급하면 워치 긴급 SOS(측면 버튼 길게)나 119를 쓰세요.") }
        return ("휴대폰에 알렸어요", "보호자 연결 전이에요. 위급하면 워치 긴급 SOS나 119를 쓰세요.")
    }

    /// 문자열 사전으로. 없는 값은 키를 빼 둡니다.
    public static func encode(_ w: WatchToday) -> [String: String] {
        var m = [String: String]()
        m["date"] = w.date.description
        if let s = w.score { m["score"] = String(s) }
        if let b = w.band { m["band"] = b.rawValue }
        m["reason"] = w.reason
        m["missionId"] = w.missionId
        m["missionTitle"] = w.missionTitle
        m["missionDone"] = String(w.missionDone)
        if let l = w.learningDay { m["learningDay"] = String(l) }
        return m
    }

    public static func decode(_ m: [String: String]) -> WatchToday? {
        guard let dateText = m["date"], let date = LocalDate(iso: dateText), let missionId = m["missionId"] else { return nil }
        var score: Int?
        if let s = m["score"] {
            guard let v = Int(s) else { return nil }
            score = v
        }
        var band: Band?
        if let b = m["band"] {
            guard let v = Band(rawValue: b) else { return nil }
            band = v
        }
        var learningDay: Int?
        if let l = m["learningDay"] {
            guard let v = Int(l) else { return nil }
            learningDay = v
        }
        return WatchToday(
            date: date,
            score: score,
            band: band,
            reason: m["reason"] ?? "",
            missionId: missionId,
            missionTitle: m["missionTitle"] ?? "",
            missionDone: m["missionDone"]?.lowercased() == "true",
            learningDay: learningDay
        )
    }

    public static func display(_ w: WatchToday?, today: LocalDate) -> WatchDisplay {
        guard let w else {
            return WatchDisplay(score: "-", label: "연결 전", reason: "아이폰에서 펄스케어를 열어 주세요", mission: "", missionDone: false, stale: true)
        }
        let stale = w.date != today
        let label: String
        if stale {
            label = "어제 기록"
        } else if w.score == nil {
            label = "기록 없음"
        } else if let day = w.learningDay {
            label = "학습 중 \(day)일째"
        } else {
            label = w.band?.label ?? ""
        }
        return WatchDisplay(
            score: w.score.map(String.init) ?? "-",
            label: label,
            reason: stale ? "아침 리포트가 오면 바뀌어요" : w.reason,
            mission: w.missionTitle,
            missionDone: w.missionDone,
            stale: stale
        )
    }
}
