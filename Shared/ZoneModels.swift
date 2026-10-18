import Foundation

/// The three bands the whole UI is reduced to.
enum HeartRateZone: Int, Codable, CaseIterable, Hashable {
    /// Zone 1 or lower — speed up a little (blue).
    case below = 1
    /// Zone 2 — the target aerobic band (green).
    case target = 2
    /// Zone 3 or higher — slow down (red).
    case above = 3
}

/// An inclusive BPM range for Zone 2, e.g. 130...145.
struct ZoneRange: Codable, Equatable, Hashable {
    var lower: Int
    var upper: Int

    init(lower: Int, upper: Int) {
        self.lower = min(lower, upper)
        self.upper = max(lower, upper)
    }

    func zone(for bpm: Double) -> HeartRateZone {
        if bpm < Double(lower) { return .below }
        if bpm > Double(upper) { return .above }
        return .target
    }

    var label: String { "\(lower)–\(upper)" }
}

/// User inputs that determine the Zone 2 range.
struct ZoneProfile: Codable, Equatable {
    enum Method: String, Codable, CaseIterable, Identifiable {
        /// Derive the range from age (and resting heart rate, when known).
        case automatic
        /// Use `manualRange` as entered.
        case manual

        var id: String { rawValue }
    }

    /// Zone 2 expressed as a fraction of heart rate reserve (Karvonen) or of max heart rate.
    static let zone2Fractions: ClosedRange<Double> = 0.60...0.70

    var age: Int
    var restingHeartRate: Int?
    var maxHeartRateOverride: Int?
    var method: Method
    var manualRange: ZoneRange?

    init(age: Int,
         restingHeartRate: Int? = nil,
         maxHeartRateOverride: Int? = nil,
         method: Method = .automatic,
         manualRange: ZoneRange? = nil) {
        self.age = age
        self.restingHeartRate = restingHeartRate
        self.maxHeartRateOverride = maxHeartRateOverride
        self.method = method
        self.manualRange = manualRange
    }

    /// Tanaka formula (208 − 0.7 × age), unless the user knows their measured max.
    var estimatedMaxHeartRate: Int {
        maxHeartRateOverride ?? Int((208 - 0.7 * Double(age)).rounded())
    }

    var zone2Range: ZoneRange {
        if method == .manual, let manualRange { return manualRange }

        let maxHR = Double(estimatedMaxHeartRate)
        let fractions = Self.zone2Fractions
        if let resting = restingHeartRate.map(Double.init), resting < maxHR {
            // Karvonen: resting + fraction × (max − resting)
            let reserve = maxHR - resting
            return ZoneRange(lower: Int((resting + fractions.lowerBound * reserve).rounded()),
                             upper: Int((resting + fractions.upperBound * reserve).rounded()))
        }
        return ZoneRange(lower: Int((fractions.lowerBound * maxHR).rounded()),
                         upper: Int((fractions.upperBound * maxHR).rounded()))
    }

    static let `default` = ZoneProfile(age: 35)
}

/// Converts a stream of BPM readings into zones, with hysteresis so the screen
/// doesn't flicker (and the wrist doesn't buzz repeatedly) around a boundary.
///
/// Leaving Zone 2 is immediate; coming back requires moving `hysteresis` BPM
/// inside the range.
struct ZoneTracker {
    var range: ZoneRange
    var hysteresis: Double

    private(set) var current: HeartRateZone?

    init(range: ZoneRange, hysteresis: Double = 2) {
        self.range = range
        self.hysteresis = hysteresis
    }

    @discardableResult
    mutating func update(bpm: Double) -> HeartRateZone {
        var lower = Double(range.lower)
        var upper = Double(range.upper)
        switch current {
        case .above: upper -= hysteresis
        case .below: lower += hysteresis
        default: break
        }

        let zone: HeartRateZone
        if bpm > upper {
            zone = .above
        } else if bpm < lower {
            zone = .below
        } else {
            zone = .target
        }
        current = zone
        return zone
    }
}

/// Accumulates active (non-paused) time spent in each zone.
///
/// Call `mark(zone:at:)` with the workout's elapsed time whenever the zone is
/// re-evaluated; the time since the previous mark is credited to the previous zone.
struct ZoneTimeLedger {
    private(set) var seconds: [HeartRateZone: TimeInterval] = [:]
    private var lastMark: TimeInterval?
    private var currentZone: HeartRateZone?

    mutating func mark(zone: HeartRateZone?, at elapsed: TimeInterval) {
        if let currentZone, let lastMark, elapsed > lastMark {
            seconds[currentZone, default: 0] += elapsed - lastMark
        }
        currentZone = zone
        lastMark = elapsed
    }

    var total: TimeInterval { seconds.values.reduce(0, +) }

    func fraction(in zone: HeartRateZone) -> Double {
        let total = total
        guard total > 0 else { return 0 }
        return (seconds[zone] ?? 0) / total
    }
}

struct WorkoutSummary: Equatable {
    var duration: TimeInterval
    var zoneSeconds: [HeartRateZone: TimeInterval]
    var averageHeartRate: Double?
    var range: ZoneRange

    var trackedSeconds: TimeInterval { zoneSeconds.values.reduce(0, +) }

    func fraction(in zone: HeartRateZone) -> Double {
        guard trackedSeconds > 0 else { return 0 }
        return (zoneSeconds[zone] ?? 0) / trackedSeconds
    }

    /// "Zone 2 달성률" as a whole percentage.
    var zone2Percent: Int { Int((fraction(in: .target) * 100).rounded()) }
}

enum DurationFormatter {
    /// 12:45 or 1:02:09
    static func clock(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}
