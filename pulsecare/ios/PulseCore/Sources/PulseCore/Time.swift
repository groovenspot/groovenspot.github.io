import Foundation

// java.time의 LocalDate·LocalTime·LocalDateTime과 같은 뜻의 시간대 없는 날짜·시각.
// 점수와 미션은 "사용자의 현지 날짜" 기준이라 Calendar·TimeZone 없이 날짜 산술만 합니다.

public enum DayOfWeek: Int, Sendable, Codable, CaseIterable {
    case monday = 1, tuesday, wednesday, thursday, friday, saturday, sunday

    public var isWeekend: Bool { self == .saturday || self == .sunday }
}

/// 1970-01-01부터의 일수로 담은 날짜.
public struct LocalDate: Hashable, Comparable, Sendable, CustomStringConvertible {
    public let epochDay: Int

    public init(epochDay: Int) { self.epochDay = epochDay }

    public init(_ year: Int, _ month: Int, _ day: Int) {
        // Howard Hinnant의 days_from_civil.
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (month + 9) % 12
        let doy = (153 * mp + 2) / 5 + day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        epochDay = era * 146_097 + doe - 719_468
    }

    private var civil: (year: Int, month: Int, day: Int) {
        let z = epochDay + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let doe = z - era * 146_097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        return (yoe + era * 400 + (m <= 2 ? 1 : 0), m, d)
    }

    public var year: Int { civil.year }
    public var month: Int { civil.month }
    public var day: Int { civil.day }

    /// 1970-01-01은 목요일.
    public var dayOfWeek: DayOfWeek { DayOfWeek(rawValue: ((epochDay + 3) % 7 + 7) % 7 + 1)! }

    public func plusDays(_ n: Int) -> LocalDate { LocalDate(epochDay: epochDay + n) }
    public func minusDays(_ n: Int) -> LocalDate { LocalDate(epochDay: epochDay - n) }

    /// 이번 주 월요일 (오늘이 월요일이면 오늘).
    public var monday: LocalDate { minusDays(dayOfWeek.rawValue - 1) }

    public func atTime(_ hour: Int, _ minute: Int = 0) -> LocalDateTime { LocalDateTime(self, LocalTime(hour, minute)) }
    public func atTime(_ time: LocalTime) -> LocalDateTime { LocalDateTime(self, time) }
    public var atStartOfDay: LocalDateTime { LocalDateTime(self, .midnight) }

    /// ChronoUnit.DAYS.between(from, to).
    public static func daysBetween(_ from: LocalDate, _ to: LocalDate) -> Int { to.epochDay - from.epochDay }

    public static func < (a: LocalDate, b: LocalDate) -> Bool { a.epochDay < b.epochDay }

    public var description: String {
        let c = civil
        return String(format: "%04d-%02d-%02d", c.year, c.month, c.day)
    }

    /// "2027-04-30".
    public init?(iso: String) {
        let p = iso.split(separator: "-")
        guard p.count == 3, let y = Int(p[0]), let m = Int(p[1]), let d = Int(p[2]),
              (1...12).contains(m), (1...31).contains(d) else { return nil }
        self.init(y, m, d)
    }

    /// 기기 현지 시각의 오늘.
    public static func today(_ now: Date = Date(), calendar: Calendar = .current) -> LocalDate {
        let c = calendar.dateComponents([.year, .month, .day], from: now)
        return LocalDate(c.year!, c.month!, c.day!)
    }
}

/// 하루 중 시각, 초 단위.
public struct LocalTime: Hashable, Comparable, Sendable, CustomStringConvertible {
    public let secondOfDay: Int

    public init(secondOfDay: Int) { self.secondOfDay = ((secondOfDay % 86400) + 86400) % 86400 }
    public init(_ hour: Int, _ minute: Int, _ second: Int = 0) { self.init(secondOfDay: hour * 3600 + minute * 60 + second) }

    public static let midnight = LocalTime(secondOfDay: 0)

    public var hour: Int { secondOfDay / 3600 }
    public var minute: Int { secondOfDay / 60 % 60 }
    public var second: Int { secondOfDay % 60 }

    /// 자정을 넘으면 돌아갑니다 (LocalTime.plusMinutes와 같음).
    public func plusMinutes(_ n: Int) -> LocalTime { LocalTime(secondOfDay: secondOfDay + n * 60) }

    public static func < (a: LocalTime, b: LocalTime) -> Bool { a.secondOfDay < b.secondOfDay }

    public var description: String {
        second == 0 ? String(format: "%02d:%02d", hour, minute) : String(format: "%02d:%02d:%02d", hour, minute, second)
    }

    /// "23:30" 또는 "23:30:15".
    public init?(iso: String) {
        let p = iso.split(separator: ":").map { Int($0) }
        guard p.count == 2 || p.count == 3, p.allSatisfy({ $0 != nil }) else { return nil }
        self.init(p[0]!, p[1]!, p.count == 3 ? p[2]! : 0)
    }
}

public struct LocalDateTime: Hashable, Comparable, Sendable, CustomStringConvertible {
    public let date: LocalDate
    public let time: LocalTime

    public init(_ date: LocalDate, _ time: LocalTime) {
        self.date = date
        self.time = time
    }

    public init(epochSecond: Int) {
        let day = Int((Double(epochSecond) / 86400).rounded(.down))
        self.init(LocalDate(epochDay: day), LocalTime(secondOfDay: epochSecond - day * 86400))
    }

    public var epochSecond: Int { date.epochDay * 86400 + time.secondOfDay }

    public func plusDays(_ n: Int) -> LocalDateTime { LocalDateTime(date.plusDays(n), time) }
    public func plusMinutes(_ n: Int) -> LocalDateTime { LocalDateTime(epochSecond: epochSecond + n * 60) }
    public func plusSeconds(_ n: Int) -> LocalDateTime { LocalDateTime(epochSecond: epochSecond + n) }

    /// Duration.between(from, to).toMinutes(): 0 쪽으로 버림.
    public static func minutesBetween(_ from: LocalDateTime, _ to: LocalDateTime) -> Int { (to.epochSecond - from.epochSecond) / 60 }
    public static func secondsBetween(_ from: LocalDateTime, _ to: LocalDateTime) -> Int { to.epochSecond - from.epochSecond }

    public static func < (a: LocalDateTime, b: LocalDateTime) -> Bool { a.epochSecond < b.epochSecond }

    public var description: String { "\(date)T\(time)" }

    /// "2027-04-30T23:30" 또는 "2027-04-30T23:30:15".
    public init?(iso: String) {
        let p = iso.split(separator: "T")
        guard p.count == 2, let d = LocalDate(iso: String(p[0])), let t = LocalTime(iso: String(p[1])) else { return nil }
        self.init(d, t)
    }

    /// 기기 현지 시각.
    public static func now(_ now: Date = Date(), calendar: Calendar = .current) -> LocalDateTime {
        let c = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: now)
        return LocalDateTime(LocalDate(c.year!, c.month!, c.day!), LocalTime(c.hour!, c.minute!, c.second!))
    }
}

extension LocalDate: Codable {
    public init(from decoder: Decoder) throws {
        let s = try decoder.singleValueContainer().decode(String.self)
        guard let d = LocalDate(iso: s) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "날짜 형식이 아니에요: \(s)"))
        }
        self = d
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(description)
    }
}

extension LocalTime: Codable {
    public init(from decoder: Decoder) throws {
        let s = try decoder.singleValueContainer().decode(String.self)
        guard let t = LocalTime(iso: s) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "시각 형식이 아니에요: \(s)"))
        }
        self = t
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(description)
    }
}

extension LocalDateTime: Codable {
    public init(from decoder: Decoder) throws {
        let s = try decoder.singleValueContainer().decode(String.self)
        guard let t = LocalDateTime(iso: s) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "일시 형식이 아니에요: \(s)"))
        }
        self = t
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(description)
    }
}
