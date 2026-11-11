import Foundation

/// 먹는 약 하나와 하루 복용 시각들.
public struct Medication: Hashable, Sendable, Codable, Identifiable {
    public var id: String
    public var name: String
    public var times: [LocalTime]

    public init(id: String, name: String, times: [LocalTime]) {
        self.id = id
        self.name = name
        self.times = times
    }
}

/// "먹었어요"를 누른 기록. [time]은 예정 시각 (같은 약을 하루 여러 번 먹을 때 구분).
public struct DoseLog: Hashable, Sendable, Codable {
    public var date: LocalDate
    public var medicationId: String
    public var time: LocalTime
    public var takenAt: LocalDateTime

    public init(date: LocalDate, medicationId: String, time: LocalTime, takenAt: LocalDateTime) {
        self.date = date
        self.medicationId = medicationId
        self.time = time
        self.takenAt = takenAt
    }
}

public struct Dose: Hashable, Sendable {
    public var medication: Medication
    public var time: LocalTime
    public var takenAt: LocalDateTime?
    public var missed: Bool

    public var taken: Bool { takenAt != nil }
}

/// 복약 체크 (기획서 12번 "복약 미체크", 미션 P-03). 예정 시각에서 3시간이 지나도 체크가 없으면 놓친 것으로 보고
/// 본인에게 한 번 묻고, 가족이 연결돼 있으면 보호자 하루 요약에도 실립니다. 약 이름은 서버로 보내지 않습니다.
public enum Medications {
    public static let missedAfterHours = 3

    public static func today(_ plans: [Medication], _ logs: [DoseLog], now: LocalDateTime) -> [Dose] {
        let date = now.date
        let doses = plans.flatMap { m in
            m.times.sorted().map { t -> Dose in
                let log = logs.first { $0.date == date && $0.medicationId == m.id && $0.time == t }
                return Dose(medication: m, time: t, takenAt: log?.takenAt,
                            missed: log == nil && now >= date.atTime(t).plusMinutes(missedAfterHours * 60))
            }
        }
        return doses.stableSorted { $0.time }
    }

    /// 오늘 놓친 복용이 있으면 정보 등급 신호 하나 (문구는 AlertText).
    public static func missed(_ doses: [Dose]) -> Detection? {
        let n = doses.filter(\.missed).count
        return n > 0 ? Detection(.medicationMissed, days: n) : nil
    }

    /// 다음에 알릴 일: 복용 시각 알림, 또는 3시간 뒤 놓침 확인. [after] 이후 가장 이른 것.
    public static func nextEvent(_ plans: [Medication], after: LocalDateTime) -> LocalDateTime? {
        (0...1).flatMap { d -> [LocalDateTime] in
            let day = after.date.plusDays(d)
            return plans.flatMap { m in m.times.flatMap { t in [day.atTime(t), day.atTime(t).plusMinutes(missedAfterHours * 60)] } }
        }
        .filter { $0 > after }.min()
    }
}

/// 취침 알림 (미션 S-01 "취침 알림 받고 30분 안에 눕기"). 평소 취침 시각 30분 전, 기록이 없으면 정한 시각.
public enum Bedtime {
    public static let leadMinutes = 30
    public static let defaultBedtime = LocalTime(23, 0)

    public static func reminderAt(usual: LocalTime?, fixed: LocalTime? = nil) -> LocalTime {
        (fixed ?? usual ?? defaultBedtime).plusMinutes(-leadMinutes)
    }
}

/// 몸 상태 태그 (아픔·음주·야근). 아침에 "어제"를 기록하면 그날 아침 기록(기상일)에 붙습니다.
public enum DayTags {
    public static func apply(_ records: [DailyRecord], _ tags: [LocalDate: Set<DayTag>]) -> [DailyRecord] {
        records.map { r in
            guard let t = tags[r.date] else { return r }
            var copy = r
            copy.tags = t
            return copy
        }
    }

    public static func label(_ tag: DayTag) -> String {
        switch tag {
        case .sick: "몸이 안 좋아요"
        case .alcohol: "술을 마셨어요"
        case .overtime: "늦게까지 일했어요"
        }
    }
}

/// 1분 호흡 가이드: 4초 들이쉬고 6초 내쉬기 6번. 화면과 워치가 같은 박자를 씁니다.
public enum Breathing {
    public static let inhaleSeconds = 4.0
    public static let exhaleSeconds = 6.0
    public static let cycles = 6
    public static var totalSeconds: Double { (inhaleSeconds + exhaleSeconds) * Double(cycles) }

    public enum Phase: Sendable {
        case inhale, exhale, done

        public var label: String {
            switch self {
            case .inhale: "들이쉬세요"
            case .exhale: "내쉬세요"
            case .done: "잘하셨어요"
            }
        }
    }

    /// [elapsed]초 시점의 단계와 그 단계 안에서의 진행(0~1).
    public static func at(_ elapsed: Double) -> (phase: Phase, progress: Double) {
        if elapsed >= totalSeconds { return (.done, 1) }
        let inCycle = Swift.max(elapsed, 0).truncatingRemainder(dividingBy: inhaleSeconds + exhaleSeconds)
        return inCycle < inhaleSeconds ? (.inhale, inCycle / inhaleSeconds) : (.exhale, (inCycle - inhaleSeconds) / exhaleSeconds)
    }
}
