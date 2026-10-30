import Foundation

public enum ExerciseKind: String, Sendable, Codable {
    /// 달리기·인터벌처럼 강한 운동. "강한 운동 쉬기"(C-01)를 깨뜨립니다.
    case vigorous = "VIGOROUS"
    case cardio = "CARDIO"
    case strength = "STRENGTH"
    case stretch = "STRETCH"
    case other = "OTHER"
}

public struct Exercise: Hashable, Sendable, Codable {
    public var start: LocalDateTime
    public var end: LocalDateTime
    public var kind: ExerciseKind

    public init(start: LocalDateTime, end: LocalDateTime, kind: ExerciseKind) {
        self.start = start
        self.end = end
        self.kind = kind
    }

    public var minutes: Int { LocalDateTime.minutesBetween(start, end) }
}

public struct Nap: Hashable, Sendable, Codable {
    public var start: LocalDateTime
    public var end: LocalDateTime

    public init(start: LocalDateTime, end: LocalDateTime) {
        self.start = start
        self.end = end
    }
}

/// 미션 날 하루의 워치 기록 (현지 시각). 아직 오지 않은 값은 비어 있습니다.
public struct DayActivity: Hashable, Sendable, Codable {
    public var date: LocalDate
    /// 시(0~23)별 걸음 수.
    public var stepsByHour: [Int: Int]
    public var floors: Double?
    public var exercises: [Exercise]
    /// 낮 동안의 짧은 수면 블록.
    public var naps: [Nap]
    /// 그날 밤 잠든 시각과 다음 날 일어난 시각. 다음 날 아침에야 채워집니다.
    public var nightBedtime: LocalDateTime?
    public var nextWake: LocalDateTime?
    /// 그날 아침 일어난 시각 (주말 기상 미션용).
    public var morningWake: LocalDateTime?
    /// 최근 28일 평소 취침·기상 시각 (중앙값).
    public var usualBedtime: LocalTime?
    public var usualWake: LocalTime?
    /// 그날 밤 포함 최근 7일 취침 시각 (7일 연속 미션용).
    public var recentBedtimes: [LocalTime]
    /// 앱 호흡 가이드를 끝까지 한 시각들.
    public var breathing: [LocalDateTime]
    /// 앱에 기록한 물 잔 수.
    public var waterCups: Int
    /// 몸 상태 태그를 남겼는지 (태그 없음도 남긴 것).
    public var tagged: Bool

    public init(date: LocalDate, stepsByHour: [Int: Int] = [:], floors: Double? = nil, exercises: [Exercise] = [], naps: [Nap] = [],
                nightBedtime: LocalDateTime? = nil, nextWake: LocalDateTime? = nil, morningWake: LocalDateTime? = nil,
                usualBedtime: LocalTime? = nil, usualWake: LocalTime? = nil, recentBedtimes: [LocalTime] = [],
                breathing: [LocalDateTime] = [], waterCups: Int = 0, tagged: Bool = false) {
        self.date = date
        self.stepsByHour = stepsByHour
        self.floors = floors
        self.exercises = exercises
        self.naps = naps
        self.nightBedtime = nightBedtime
        self.nextWake = nextWake
        self.morningWake = morningWake
        self.usualBedtime = usualBedtime
        self.usualWake = usualWake
        self.recentBedtimes = recentBedtimes
        self.breathing = breathing
        self.waterCups = waterCups
        self.tagged = tagged
    }

    public var totalSteps: Int { stepsByHour.values.reduce(0, +) }
}

public enum Check: String, Sendable, Codable {
    /// 워치 기록으로 완료 확인.
    case done = "DONE"
    /// 아직 판단할 수 없음 (시간이 남았거나 밤 기록이 아직 없음).
    case notYet = "NOT_YET"
    /// 기회가 지났고 기록상 하지 않음.
    case missed = "MISSED"
    /// 워치로 확인할 수 없는 미션: 사용자가 직접 체크합니다.
    case manual = "MANUAL"
}

/// 미션 자동 확인 (기획서 14번 "확인 방식"). 걸음·운동·수면 기록으로 판단하고,
/// 호흡 가이드·가족 기능처럼 아직 앱 기록이 없는 미션은 manual로 둡니다.
public enum MissionVerifier {
    /// 그날 밤 취침 기록으로 다음 날 아침에 확인하는 미션.
    public static let nightMissions: Set<String> = ["S-01", "S-06", "S-08", "C-05"]

    /// 물 마시기 미션(C-07)의 잔 수.
    public static let waterCups = 6

    /// 앱 호흡 가이드로 확인하는 미션 (홈 미션 카드에 "호흡 시작" 버튼).
    public static let breathingMissions: Set<String> = ["R-01", "C-04", "S-04", "R-08", "R-05"]

    private static let walk10MinSteps = 1_000
    private static let walk15MinSteps = 1_500

    public static func check(_ missionId: String, _ a: DayActivity, now: LocalDateTime) -> Check {
        let dayOver = now >= a.date.plusDays(1).atStartOfDay
        func byEndOfDay(_ done: Bool) -> Check { done ? .done : dayOver ? .missed : .notYet }
        func inWindow(_ fromHour: Int, _ toHour: Int, _ steps: Int) -> Check {
            let walked = (fromHour..<toHour).contains { (a.stepsByHour[$0] ?? 0) >= steps }
            if walked { return .done }
            return now >= a.date.atTime(toHour % 24).plusDays(toHour / 24) ? .missed : .notYet
        }
        func exerciseMinutes(_ kinds: Set<ExerciseKind>, after: LocalTime = .midnight) -> Int {
            a.exercises.filter { kinds.contains($0.kind) && $0.start.time >= after }.reduce(0) { $0 + $1.minutes }
        }

        switch missionId {
        // 걸음
        case "W-02": return byEndOfDay(a.totalSteps >= 7_000)
        case "W-05": return byEndOfDay(a.totalSteps >= 10_000)
        case "W-01": return inWindow(12, 14, walk10MinSteps)
        case "S-03": return inWindow(6, 10, walk10MinSteps)
        case "R-03": return inWindow(11, 14, walk15MinSteps)
        case "C-03": return inWindow(0, 24, walk15MinSteps)
        case "W-03": return byEndOfDay((a.floors ?? 0) >= 3.0)

        // 운동 기록
        case "W-06": return byEndOfDay(exerciseMinutes([.cardio, .vigorous]) >= 20)
        case "W-08": return byEndOfDay(exerciseMinutes([.cardio, .vigorous]) >= 40 && exerciseMinutes([.strength]) >= 10)
        case "R-06": return byEndOfDay(exerciseMinutes([.stretch], after: LocalTime(17, 0)) >= 10)
        case "C-06": return byEndOfDay(exerciseMinutes([.stretch]) >= 5)
        // 강한 운동을 20분 넘게 했으면 놓친 것. 하루가 끝나야 완료로 봅니다.
        case "C-01":
            if a.exercises.contains(where: { $0.kind == .vigorous && $0.minutes >= 20 }) { return .missed }
            return dayOver ? .done : .notYet

        // 낮잠: 오후 3시 전에 끝난 15분 이상 (20분 목표, 기기 오차 감안)
        case "C-02":
            return byEndOfDay(a.naps.contains { $0.end.time <= LocalTime(15, 30) && LocalDateTime.minutesBetween($0.start, $0.end) >= 15 })

        // 취침·기상: 다음 날 아침 수면 기록이 들어와야 판단
        case "S-01": return night(a, now) { bed, usual in minutesAfter(bed, usual) <= 30 }
        case "S-06", "C-05": return night(a, now) { bed, usual in minutesAfter(bed, usual) <= -30 }
        case "S-08":
            return night(a, now) { _, _ in
                a.recentBedtimes.count >= 7 && a.recentBedtimes.allSatisfy { Swift.abs(minutesAfter($0, median(a.recentBedtimes))) <= 30 }
            }
        case "S-07": return weekendWake(a, now)

        // 앱 기록: 호흡 가이드, 물, 몸 상태 태그
        case "R-01": return byEndOfDay(!a.breathing.isEmpty)
        case "C-04": return byEndOfDay(a.breathing.count >= 2)
        case "S-04": return byEndOfDay(a.breathing.contains { $0.time >= LocalTime(20, 0) })
        case "R-08":
            return byEndOfDay(a.breathing.contains { $0.time.hour < 11 } && a.breathing.contains { (11...16).contains($0.time.hour) }
                && a.breathing.contains { $0.time.hour >= 17 })
        case "C-07": return byEndOfDay(a.waterCups >= waterCups)
        case "C-08": return byEndOfDay(a.tagged)

        default: return .manual
        }
    }

    private static func night(_ a: DayActivity, _ now: LocalDateTime, _ ok: (LocalTime, LocalTime) -> Bool) -> Check {
        guard let usual = a.usualBedtime else { return .manual }
        guard let bed = a.nightBedtime else { return now >= a.date.plusDays(1).atTime(14, 0) ? .missed : .notYet }
        return ok(bed.time, usual) ? .done : .missed
    }

    private static func weekendWake(_ a: DayActivity, _ now: LocalDateTime) -> Check {
        guard a.date.dayOfWeek.isWeekend, let usual = a.usualWake else { return .manual }
        guard let wake = a.morningWake else { return now >= a.date.atTime(14, 0) ? .missed : .notYet }
        return Swift.abs(minutesAfter(wake.time, usual)) <= 30 ? .done : .missed
    }

    /// [t]가 [ref]보다 몇 분 늦은지 (자정을 넘나드는 취침도 연속으로, −12~+12시간).
    public static func minutesAfter(_ t: LocalTime, _ ref: LocalTime) -> Int {
        let d = (t.secondOfDay - ref.secondOfDay) / 60
        return ((d + 720) % 1440 + 1440) % 1440 - 720
    }

    /// 정오 기준으로 정렬한 취침 시각의 중앙값.
    public static func median(_ times: [LocalTime]) -> LocalTime {
        let sorted = times.stableSorted { ($0.secondOfDay / 60 + 720) % 1440 }
        return sorted[sorted.count / 2]
    }
}
