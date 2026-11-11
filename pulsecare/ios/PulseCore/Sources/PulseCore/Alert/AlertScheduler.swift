import Foundation

public enum Recipient: String, Sendable, Codable { case selfUser = "SELF", guardian = "GUARDIAN" }

public struct PendingAlert: Hashable, Sendable, Codable {
    public var detection: Detection
    public var recipient: Recipient
    public var createdAt: LocalDateTime

    public init(_ detection: Detection, _ recipient: Recipient, createdAt: LocalDateTime) {
        self.detection = detection
        self.recipient = recipient
        self.createdAt = createdAt
    }

    public var signal: Signal { detection.signal }
}

/// 신호별 마지막 확인 시각과 그때 값.
public struct Acknowledgement: Hashable, Sendable, Codable {
    public var at: LocalDateTime
    public var detection: Detection

    public init(at: LocalDateTime, detection: Detection) {
        self.at = at
        self.detection = detection
    }
}

/// 이미 보낸 알림과 사용자 상태.
public struct DeliveryState: Sendable {
    /// 오늘 보낸 알림 (받는 사람 포함).
    public var sentToday: [PendingAlert]
    public var acknowledged: [Signal: Acknowledgement]
    public var asleep: Bool

    public init(sentToday: [PendingAlert] = [], acknowledged: [Signal: Acknowledgement] = [:], asleep: Bool = false) {
        self.sentToday = sentToday
        self.acknowledged = acknowledged
        self.asleep = asleep
    }
}

public enum Decision: Hashable, Sendable {
    case sendNow
    case sendAt(LocalDateTime, why: String)
    case drop(why: String)
}

/// 빈도 제한과 방해 금지 (기획서 12번). 긴급은 어떤 제한도 받지 않습니다.
public struct AlertScheduler: Sendable {
    public struct Settings: Hashable, Sendable, Codable {
        public var quietStart = LocalTime(23, 0)
        public var quietEnd = LocalTime(7, 0)
        public var morningReport = LocalTime(7, 30)
        public var eveningSummary = LocalTime(21, 0)
        public var guardianSummary = LocalTime(20, 0)
        public var dailyInfoLimit = 3
        public var dailyCautionLimit = 2

        public init() {}
    }

    public let settings: Settings

    public init(settings: Settings = Settings()) { self.settings = settings }

    public func decide(_ alert: PendingAlert, now: LocalDateTime, state: DeliveryState) -> Decision {
        let signal = alert.signal
        if signal.grade == .emergency { return .sendNow }

        // 확인한 주의 신호는 24시간 동안 다시 알리지 않습니다. 값이 더 나빠졌으면 예외.
        if let ack = state.acknowledged[signal],
           LocalDateTime.secondsBetween(ack.at, now) < 24 * 3600, !worse(alert.detection, ack.detection) {
            return .drop(why: "확인 후 24시간 안 같은 신호")
        }

        // 보호자에게는 긴급·활동량 급감 외에는 하루 1회 요약으로만.
        if alert.recipient == .guardian && signal != .activityDrop {
            return .sendAt(next(now, settings.guardianSummary), why: "보호자 하루 요약")
        }

        let sentToSame = state.sentToday.filter { $0.recipient == alert.recipient }
        if sentToSame.contains(where: { $0.signal == signal }) { return .drop(why: "오늘 이미 보낸 신호") }
        switch signal.grade {
        case .info where sentToSame.filter({ $0.signal.grade == .info }).count >= settings.dailyInfoLimit:
            return .drop(why: "정보 알림 하루 상한")
        case .caution where sentToSame.filter({ $0.signal.grade == .caution }).count >= settings.dailyCautionLimit:
            return .drop(why: "주의 알림 하루 상한")
        default: break
        }

        if quiet(now.time) || state.asleep {
            let wake = next(now, settings.quietEnd)
            return signal.grade == .info
                ? .sendAt(next(wake, settings.morningReport), why: "방해 금지 후 아침 리포트")
                : .sendAt(wake, why: "방해 금지 후 전달")
        }

        // 정보 알림은 아침 리포트와 저녁 요약에 모아서.
        if signal.grade == .info {
            return .sendAt(Swift.min(next(now, settings.morningReport), next(now, settings.eveningSummary)), why: "정보 알림 묶음 발송")
        }
        return .sendNow
    }

    private func quiet(_ t: LocalTime) -> Bool {
        settings.quietStart > settings.quietEnd
            ? t >= settings.quietStart || t < settings.quietEnd
            : t >= settings.quietStart && t < settings.quietEnd
    }

    /// [from] 이후(같은 시각 포함) 처음 오는 [at].
    private func next(_ from: LocalDateTime, _ at: LocalTime) -> LocalDateTime {
        let today = from.date.atTime(at)
        return today >= from ? today : today.plusDays(1)
    }

    /// 기준선에서 더 멀어졌으면 더 나빠진 것으로 봅니다.
    private func worse(_ now: Detection, _ before: Detection) -> Bool {
        guard let nowGap = gap(now), let beforeGap = gap(before) else { return false }
        return nowGap > beforeGap
    }

    private func gap(_ d: Detection) -> Double? {
        guard let current = d.current else { return nil }
        guard let usual = d.usual else { return current }
        return Swift.abs(current - usual)
    }
}

/// 알림에 대한 응답 (기획서 12번 "알림 응답", 22번 "알림 오탐 신고율").
public enum FeedbackResponse: String, CaseIterable, Sendable, Codable {
    /// 본인: 알림은 맞지만 괜찮음.
    case ok = "OK"
    /// 본인·보호자: 실제와 다른 알림. 오탐 신고율에 들어갑니다.
    case falseAlarm = "FALSE_ALARM"
    /// 보호자: 연락해 봤음.
    case contacted = "CONTACTED"

    public var key: String {
        switch self {
        case .ok: "ok"
        case .falseAlarm: "false_alarm"
        case .contacted: "contacted"
        }
    }

    public var label: String {
        switch self {
        case .ok: "괜찮아요"
        case .falseAlarm: "잘못된 알림이에요"
        case .contacted: "연락했어요"
        }
    }
}

public struct FeedbackEntry: Hashable, Sendable, Codable {
    public var at: LocalDateTime
    public var detection: Detection
    public var response: FeedbackResponse

    public init(at: LocalDateTime, detection: Detection, response: FeedbackResponse) {
        self.at = at
        self.detection = detection
        self.response = response
    }
}

/// 응답을 알림 규칙에 연결합니다. 긴급(SOS·낙상)은 쉬게 할 수 없습니다.
public enum AlertFeedback {
    public static let snoozeDays = 7
    private static let windowDays = 14
    private static let falseAlarmsToSuggest = 2

    /// 스케줄러의 "확인한 신호" 상태: 신호별 마지막 응답 시각과 그때 값.
    public static func acknowledged(_ entries: [FeedbackEntry]) -> [Signal: Acknowledgement] {
        Dictionary(grouping: entries, by: \.detection.signal).mapValues { list in
            let last = list.max { $0.at < $1.at }!
            return Acknowledgement(at: last.at, detection: last.detection)
        }
    }

    /// 쉬자고 제안할 신호. 이미 쉬는 중이거나 제안을 거절한 뒤 새 오탐이 없으면 제외.
    public static func suggestSnooze(
        _ entries: [FeedbackEntry],
        today: LocalDate,
        snoozed: [Signal: LocalDate],
        declinedAt: [Signal: LocalDateTime] = [:]
    ) -> Set<Signal> {
        let recent = entries.filter { $0.response == .falseAlarm && LocalDate.daysBetween($0.at.date, today) < windowDays }
        return Set(Dictionary(grouping: recent, by: \.detection.signal).filter { signal, list in
            signal.grade != .emergency &&
                list.count >= falseAlarmsToSuggest &&
                snoozed[signal].map { !(today > $0) } != true &&
                declinedAt[signal].map { declined in !list.contains { $0.at > declined } } != true
        }.keys)
    }

    /// 쉬는 중인 신호 (끝나는 날까지 포함).
    public static func isSnoozed(_ signal: Signal, _ snoozed: [Signal: LocalDate], today: LocalDate) -> Bool {
        signal.grade != .emergency && snoozed[signal].map { !(today > $0) } == true
    }
}
