package com.groovenspot.cardiopacer.zone

import kotlin.math.roundToInt

// Kotlin port of Shared/ZoneModels.swift — keep the two in sync.

/** The three bands the whole UI is reduced to. */
enum class HeartRateZone {
    /** Zone 1 or lower — speed up a little (blue). */
    BELOW,

    /** Zone 2 — the target aerobic band (green). */
    TARGET,

    /** Zone 3 or higher — slow down (red). */
    ABOVE,
}

/** An inclusive BPM range for Zone 2, e.g. 130..145. */
data class ZoneRange(val lower: Int, val upper: Int) {
    fun zoneFor(bpm: Double): HeartRateZone = when {
        bpm < lower -> HeartRateZone.BELOW
        bpm > upper -> HeartRateZone.ABOVE
        else -> HeartRateZone.TARGET
    }

    val label: String get() = "$lower–$upper"

    companion object {
        fun of(a: Int, b: Int) = ZoneRange(minOf(a, b), maxOf(a, b))
    }
}

/** User inputs that determine the Zone 2 range. */
data class ZoneProfile(
    val age: Int,
    val restingHeartRate: Int? = null,
    val maxHeartRateOverride: Int? = null,
    val method: Method = Method.AUTOMATIC,
    val manualRange: ZoneRange? = null,
) {
    enum class Method {
        /** Derive the range from age (and resting heart rate, when known). */
        AUTOMATIC,

        /** Use [manualRange] as entered. */
        MANUAL,
    }

    /** Tanaka formula (208 − 0.7 × age), unless the user knows their measured max. */
    val estimatedMaxHeartRate: Int
        get() = maxHeartRateOverride ?: (208 - 0.7 * age).roundToInt()

    val zone2Range: ZoneRange
        get() {
            if (method == Method.MANUAL && manualRange != null) return manualRange

            val maxHr = estimatedMaxHeartRate.toDouble()
            val resting = restingHeartRate?.toDouble()
            if (resting != null && resting < maxHr) {
                // Karvonen: resting + fraction × (max − resting)
                val reserve = maxHr - resting
                return ZoneRange.of(
                    (resting + ZONE2_LOW * reserve).roundToInt(),
                    (resting + ZONE2_HIGH * reserve).roundToInt(),
                )
            }
            return ZoneRange.of((ZONE2_LOW * maxHr).roundToInt(), (ZONE2_HIGH * maxHr).roundToInt())
        }

    companion object {
        /** Zone 2 as a fraction of heart rate reserve (Karvonen) or of max heart rate. */
        const val ZONE2_LOW = 0.60
        const val ZONE2_HIGH = 0.70

        val DEFAULT = ZoneProfile(age = 35)
    }
}

/**
 * Converts a stream of BPM readings into zones, with hysteresis so the screen
 * doesn't flicker (and the wrist doesn't buzz repeatedly) around a boundary.
 *
 * Leaving Zone 2 is immediate; coming back requires moving [hysteresis] BPM
 * inside the range.
 */
class ZoneTracker(val range: ZoneRange, private val hysteresis: Double = 2.0) {
    var current: HeartRateZone? = null
        private set

    fun update(bpm: Double): HeartRateZone {
        var lower = range.lower.toDouble()
        var upper = range.upper.toDouble()
        when (current) {
            HeartRateZone.ABOVE -> upper -= hysteresis
            HeartRateZone.BELOW -> lower += hysteresis
            else -> Unit
        }
        val zone = when {
            bpm > upper -> HeartRateZone.ABOVE
            bpm < lower -> HeartRateZone.BELOW
            else -> HeartRateZone.TARGET
        }
        current = zone
        return zone
    }
}

/**
 * Accumulates active (non-paused) time spent in each zone.
 *
 * Call [mark] with the workout's active elapsed time whenever the zone is
 * re-evaluated; the time since the previous mark is credited to the previous zone.
 */
class ZoneTimeLedger {
    private val _millis = mutableMapOf<HeartRateZone, Long>()
    val millis: Map<HeartRateZone, Long> get() = _millis

    private var lastMark: Long? = null
    private var currentZone: HeartRateZone? = null

    fun mark(zone: HeartRateZone?, elapsedMillis: Long) {
        val last = lastMark
        val current = currentZone
        if (current != null && last != null && elapsedMillis > last) {
            _millis[current] = (_millis[current] ?: 0L) + (elapsedMillis - last)
        }
        currentZone = zone
        lastMark = elapsedMillis
    }

    val total: Long get() = _millis.values.sum()

    fun fraction(zone: HeartRateZone): Double =
        if (total > 0) (_millis[zone] ?: 0L).toDouble() / total else 0.0
}

data class WorkoutSummary(
    val durationMillis: Long,
    val zoneMillis: Map<HeartRateZone, Long>,
    val averageHeartRate: Double?,
    val range: ZoneRange,
) {
    val trackedMillis: Long get() = zoneMillis.values.sum()

    fun fraction(zone: HeartRateZone): Double =
        if (trackedMillis > 0) (zoneMillis[zone] ?: 0L).toDouble() / trackedMillis else 0.0

    /** "Zone 2 달성률" as a whole percentage. */
    val zone2Percent: Int get() = (fraction(HeartRateZone.TARGET) * 100).roundToInt()
}

object DurationFormatter {
    /** 12:45 or 1:02:09 */
    fun clock(millis: Long): String {
        val total = (millis / 1000).coerceAtLeast(0)
        val h = total / 3600
        val m = (total % 3600) / 60
        val s = total % 60
        return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
    }
}
