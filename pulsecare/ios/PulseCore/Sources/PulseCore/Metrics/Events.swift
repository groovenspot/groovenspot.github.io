import Foundation

/// 이벤트 사전 (기획서 22번). 여기 없는 이벤트·속성은 앱이 보내지 않고 서버도 받지 않습니다.
/// 담지 않는 것: 점수 값, 걸음·심박 등 수치, 체크인 응답 값, 이름·연락처, 대화 원문.
public enum EventName: String, CaseIterable, Sendable {
    // 가입
    case signupCompleted = "signup_completed"
    case consentUpdated = "consent_updated"
    case watchLinkAttempted = "watch_link_attempted"
    case watchLinked = "watch_linked"
    case dataFirstReceived = "data_first_received"
    // 점수
    case scoreViewed = "score_viewed"
    case weeklyReportViewed = "weekly_report_viewed"
    case conditionCheckinAnswered = "condition_checkin_answered"
    // 미션
    case missionShown = "mission_shown"
    case missionCompleted = "mission_completed"
    case missionSkipped = "mission_skipped"
    /// 진료용 요약 PDF를 만들어 공유 시트를 엶 (기간만).
    case reportExported = "report_exported"
    // AI 챗 (대화 원문은 담지 않음)
    case chatMessageSent = "chat_message_sent"
    case chatCrisisRouted = "chat_crisis_routed"
    // 가족
    case familyInviteSent = "family_invite_sent"
    case familyInviteAccepted = "family_invite_accepted"
    case familyViewOpened = "family_view_opened"
    case familyMemberRemoved = "family_member_removed"
    // 알림
    case alertSent = "alert_sent"
    case alertFeedback = "alert_feedback"
    // 앱
    case appOpened = "app_opened"
    case pushPermissionChanged = "push_permission_changed"
    case accountDeleted = "account_deleted"

    public var key: String { rawValue }

    public var props: Set<String> {
        switch self {
        case .signupCompleted: ["via", "goal", "mode"]
        case .consentUpdated: ["item", "granted"]
        case .watchLinkAttempted: ["result"]
        case .watchLinked: ["platform"]
        case .dataFirstReceived: ["day"]
        case .scoreViewed: ["surface", "kind", "day"]
        case .weeklyReportViewed: ["surface", "badge"]
        case .conditionCheckinAnswered: ["answered"]
        case .missionShown: ["mission_id", "goal", "level"]
        case .missionCompleted: ["mission_id", "auto", "surface"]
        case .missionSkipped: ["mission_id", "reason"]
        case .reportExported: ["days"]
        case .chatMessageSent: ["topic"]
        case .chatCrisisRouted: []
        case .familyInviteSent, .familyInviteAccepted, .familyMemberRemoved: ["role"]
        case .familyViewOpened: ["wearers", "guardians"]
        case .alertSent: ["signal", "recipient"]
        case .alertFeedback: ["signal", "response", "recipient"]
        case .appOpened: ["source"]
        case .pushPermissionChanged: ["granted"]
        case .accountDeleted: []
        }
    }

    public static func of(_ key: String) -> EventName? { EventName(rawValue: key) }
}

/// 한 건. [props] 값은 짧은 문자열만 (숫자·참거짓도 문자열로).
public struct Event: Hashable, Sendable {
    public var name: EventName
    /// 에포크 밀리초.
    public var at: Int64
    public var props: [String: String]

    public init(name: EventName, at: Int64, props: [String: String] = [:]) {
        self.name = name
        self.at = at
        self.props = props
    }
}

public enum EventRules {
    public static let maxValueLength = 40
    public static let maxBatch = 500

    /// 활성 사용자 (22번): 그 기간에 직접 한 행동이 하나라도 있는 사람.
    /// 워치 기록으로 자동 확인된 미션은 직접 한 행동이 아니라 넣지 않습니다.
    public static func isActive(_ name: EventName, _ props: [String: String]) -> Bool {
        switch name {
        case .appOpened, .scoreViewed, .alertFeedback, .familyViewOpened: true
        case .missionCompleted: props["auto"] != "true"
        default: false
        }
    }

    /// 사전에 맞지 않는 속성은 버리고, 값은 길이를 자릅니다.
    public static func clean(_ name: EventName, _ props: [String: String]) -> [String: String] {
        props.filter { name.props.contains($0.key) }
            .mapValues { kotlinTake($0, maxValueLength) }
            .filter { !$0.value.isEmpty }
    }

    /// "가입 후 며칠째"는 구간으로만.
    public static func dayBucket(_ dayIndex: Int) -> String {
        switch dayIndex {
        case ...0: "0"
        case ...7: String(dayIndex)
        case ...14: "8-14"
        case ...30: "15-30"
        case ...90: "31-90"
        default: "90+"
        }
    }

    /// Kotlin take(n)은 UTF-16 단위로 자릅니다. 서버와 같은 길이 제한이 되도록 맞춥니다.
    private static func kotlinTake(_ s: String, _ n: Int) -> String {
        let units = Array(s.utf16)
        if units.count <= n { return s }
        return String(decoding: units.prefix(n), as: UTF16.self)
    }
}
