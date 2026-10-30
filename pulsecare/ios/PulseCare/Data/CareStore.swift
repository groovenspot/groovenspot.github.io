import Foundation
import PulseCore

/// 생활 도우미 기록: 몸 상태 태그, 호흡 가이드, 물, 복약, 취침 알림. 안드로이드 CareStore와 같은 항목이고
/// 기기 밖으로 나가지 않습니다 (약 이름 포함). "기록 지우기"를 하면 앱 저장소와 함께 지워집니다.
final class CareStore {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    private func load<T: Decodable>(_ key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func save<T: Encodable>(_ key: String, _ value: T) {
        defaults.set(try? JSONEncoder().encode(value), forKey: key)
    }

    /// 기상일별 몸 상태 태그. 빈 집합 = "특별한 일 없었어요"로 남긴 날. 최근 60일.
    var tags: [LocalDate: Set<DayTag>] {
        get {
            let raw: [String: [DayTag]] = load("care_tags") ?? [:]
            return Dictionary(uniqueKeysWithValues: raw.compactMap { k, v in LocalDate(iso: k).map { ($0, Set(v)) } })
        }
        set {
            let kept = newValue.sorted { $0.key < $1.key }.suffix(60)
            save("care_tags", Dictionary(uniqueKeysWithValues: kept.map { ($0.key.description, Array($0.value).sorted { $0.rawValue < $1.rawValue }) }))
        }
    }

    /// 호흡 가이드를 끝까지 한 시각. 최근 7일.
    var breathing: [LocalDateTime] {
        get { load("care_breathing") ?? [] }
        set {
            let cutoff = LocalDate.today().minusDays(7)
            save("care_breathing", newValue.filter { $0.date >= cutoff })
        }
    }

    func breathing(on date: LocalDate) -> [LocalDateTime] { breathing.filter { $0.date == date } }

    /// 날짜별 물 잔 수. 최근 7일.
    var water: [LocalDate: Int] {
        get {
            let raw: [String: Int] = load("care_water") ?? [:]
            return Dictionary(uniqueKeysWithValues: raw.compactMap { k, v in LocalDate(iso: k).map { ($0, v) } })
        }
        set {
            let kept = newValue.sorted { $0.key < $1.key }.suffix(7)
            save("care_water", Dictionary(uniqueKeysWithValues: kept.map { ($0.key.description, $0.value) }))
        }
    }

    var medications: [Medication] {
        get { load("care_medications") ?? [] }
        set { save("care_medications", newValue) }
    }

    /// "먹었어요" 기록. 최근 30일.
    var doseLogs: [DoseLog] {
        get { load("care_doses") ?? [] }
        set {
            let cutoff = LocalDate.today().minusDays(30)
            save("care_doses", newValue.filter { $0.date >= cutoff })
        }
    }

    func markTaken(_ medicationId: String, _ time: LocalTime, now: LocalDateTime) {
        guard !doseLogs.contains(where: { $0.date == now.date && $0.medicationId == medicationId && $0.time == time }) else { return }
        doseLogs.append(DoseLog(date: now.date, medicationId: medicationId, time: time, takenAt: now))
    }

    /// 취침 알림 (미션 S-01). 기본은 꺼짐.
    var bedtimeEnabled: Bool {
        get { defaults.bool(forKey: "care_bedtime_on") }
        set { defaults.set(newValue, forKey: "care_bedtime_on") }
    }

    /// 직접 정한 취침 시각. 없으면 평소 취침 시각(최근 기록)에 맞춥니다.
    var bedtimeFixed: LocalTime? {
        get { defaults.string(forKey: "care_bedtime_fixed").flatMap(LocalTime.init(iso:)) }
        set { defaults.set(newValue?.description, forKey: "care_bedtime_fixed") }
    }

    /// 마지막으로 계산한 평소 취침 시각 (취침 알림 예약용).
    var usualBedtime: LocalTime? {
        get { defaults.string(forKey: "care_usual_bedtime").flatMap(LocalTime.init(iso:)) }
        set { defaults.set(newValue?.description, forKey: "care_usual_bedtime") }
    }

    var bedtimeReminder: LocalTime { Bedtime.reminderAt(usual: usualBedtime, fixed: bedtimeFixed) }

    /// 워치 기록에 앱 기록(호흡 가이드, 물, 몸 상태 태그)을 더해 미션을 확인합니다.
    func withCare(_ a: DayActivity) -> DayActivity {
        var out = a
        out.breathing = breathing(on: a.date)
        out.waterCups = water[a.date] ?? 0
        out.tagged = tags[a.date] != nil
        return out
    }
}
