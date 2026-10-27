package com.groovenspot.pulsecare.mobile.health

import com.groovenspot.pulsecare.mission.DayActivity
import com.groovenspot.pulsecare.mission.Exercise
import com.groovenspot.pulsecare.mission.ExerciseKind
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

/** Health Connect 기록을 플랫폼과 무관한 값으로 옮긴 것. [HealthConnectSource]가 채웁니다. */
data class RawHealth(
    val sleep: List<RawSleep> = emptyList(),
    val hrv: List<Sample> = emptyList(),
    val restingHr: List<Sample> = emptyList(),
    val respiratoryRate: List<Sample> = emptyList(),
    val spo2: List<Sample> = emptyList(),
    /** 날짜별 하루 합계. */
    val steps: Map<LocalDate, Long> = emptyMap(),
    val activeCalories: Map<LocalDate, Double> = emptyMap(),
    /** 시간대 시작 시각(현지)별 걸음 수. 미션 확인용이라 최근 이틀만 읽습니다. */
    val stepsByHour: Map<LocalDateTime, Long> = emptyMap(),
    val floors: Map<LocalDate, Double> = emptyMap(),
    val exercises: List<RawExercise> = emptyList(),
)

data class RawExercise(val start: Instant, val end: Instant, val kind: ExerciseKind)

data class Sample(val time: Instant, val value: Double)

data class RawSleep(val start: Instant, val end: Instant, val stages: List<RawStage> = emptyList())

data class RawStage(val start: Instant, val end: Instant, val type: StageType)

enum class StageType { AWAKE, LIGHT, DEEP, REM, ASLEEP_UNKNOWN, OUT_OF_BED, OTHER }

/**
 * 기상 날짜별 [DailyRecord]를 만듭니다 (기획서 13번 "예외 처리"):
 * - 본 수면 = 전날 18시 ~ 그날 14시에 끝난 가장 긴 수면
 * - 낮잠 = 전날 10~20시에 끝난 3시간 미만 수면 (수면 시간에만 최대 1시간 더하는 건 점수 엔진이 합니다)
 * - HRV·호흡수·SpO2는 본 수면 동안의 값, 안정시 심박은 그날 기록
 * - 걸음·활동은 전날 하루 값
 */
object NightMapper {

    private val NIGHT_END_FROM = LocalTime.of(18, 0)
    private val NIGHT_END_UNTIL = LocalTime.of(14, 0)
    private val NAP_END_FROM = LocalTime.of(10, 0)
    private val NAP_END_UNTIL = LocalTime.of(20, 0)
    private val NAP_MAX = Duration.ofHours(3)

    fun map(raw: RawHealth, from: LocalDate, to: LocalDate, zone: ZoneId): List<DailyRecord> =
        generateSequence(from) { it.plusDays(1) }.takeWhile { it <= to }.map { day(raw, it, zone) }.toList()

    /** [date] 아침에 끝난 본 수면. */
    fun mainSleep(raw: RawHealth, date: LocalDate, zone: ZoneId): RawSleep? {
        val nightStart = date.minusDays(1).atTime(NIGHT_END_FROM).atZone(zone).toInstant()
        val nightEnd = date.atTime(NIGHT_END_UNTIL).atZone(zone).toInstant()
        return raw.sleep
            .filter { it.end > nightStart && it.end <= nightEnd }
            .maxByOrNull { Duration.between(it.start, it.end) }
    }

    /**
     * 미션 확인용 하루 활동 (기획서 14번). 그날 걸음·계단·운동·낮잠과,
     * 그날 밤 잠든 시각(다음 날 아침 기록), 평소 취침·기상 시각을 모읍니다.
     */
    fun activity(raw: RawHealth, date: LocalDate, zone: ZoneId): DayActivity {
        fun local(i: Instant) = i.atZone(zone).toLocalDateTime()
        val today = mainSleep(raw, date, zone)
        val tonight = mainSleep(raw, date.plusDays(1), zone)
        val past = (1L..28L).mapNotNull { mainSleep(raw, date.minusDays(it), zone) }
        val week = (0L..5L).mapNotNull { mainSleep(raw, date.minusDays(it), zone) } + listOfNotNull(tonight)
        val dayFrom = date.atTime(NAP_END_FROM).atZone(zone).toInstant()
        val dayUntil = date.atTime(NAP_END_UNTIL).atZone(zone).toInstant()
        return DayActivity(
            date = date,
            stepsByHour = raw.stepsByHour.filterKeys { it.toLocalDate() == date }.mapKeys { it.key.hour },
            floors = raw.floors[date],
            exercises = raw.exercises
                .filter { local(it.start).toLocalDate() == date }
                .map { Exercise(local(it.start), local(it.end), it.kind) },
            naps = raw.sleep
                .filter { it != today && it != tonight && it.end > dayFrom && it.end <= dayUntil && Duration.between(it.start, it.end) < NAP_MAX }
                .map { local(it.start) to local(it.end) },
            nightBedtime = tonight?.let { local(it.start) },
            nextWake = tonight?.let { local(it.end) },
            morningWake = today?.let { local(it.end) },
            usualBedtime = past.takeIf { it.size >= 3 }?.let { s -> MissionVerifier.median(s.map { local(it.start).toLocalTime() }) },
            usualWake = past.takeIf { it.size >= 3 }?.let { s -> MissionVerifier.median(s.map { local(it.end).toLocalTime() }) },
            recentBedtimes = week.map { local(it.start).toLocalTime() },
        )
    }

    fun day(raw: RawHealth, date: LocalDate, zone: ZoneId): DailyRecord {
        val main = mainSleep(raw, date, zone)

        val napFrom = date.minusDays(1).atTime(NAP_END_FROM).atZone(zone).toInstant()
        val napUntil = date.minusDays(1).atTime(NAP_END_UNTIL).atZone(zone).toInstant()
        val napMinutes = raw.sleep
            .filter { it != main && it.end > napFrom && it.end <= napUntil && Duration.between(it.start, it.end) < NAP_MAX }
            .sumOf { asleepMinutes(it) }

        val yesterday = date.minusDays(1)
        val dayStart = date.atStartOfDay(zone).toInstant()
        val dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant()

        return DailyRecord(
            date = date,
            sleep = main?.let {
                SleepSummary(
                    mainSleepMinutes = asleepMinutes(it),
                    napMinutes = napMinutes,
                    efficiency = efficiency(it),
                    deepRatio = deepRatio(it),
                    bedtime = it.start.atZone(zone).toLocalTime(),
                )
            },
            hrvMs = main?.let { median(raw.hrv.within(it.start, it.end)) },
            restingHr = median(raw.restingHr.within(dayStart, dayEnd))
                ?: main?.let { median(raw.restingHr.within(it.start, it.end)) },
            respiratoryRate = main?.let { median(raw.respiratoryRate.within(it.start, it.end)) },
            lowSpo2Repeated = main?.let { lowSpo2(raw.spo2.within(it.start, it.end)) },
            steps = raw.steps[yesterday]?.toInt(),
            activityLoad = raw.activeCalories[yesterday],
        )
    }

    private val ASLEEP = setOf(StageType.LIGHT, StageType.DEEP, StageType.REM, StageType.ASLEEP_UNKNOWN)

    /** 단계 기록이 있으면 실제로 잔 시간, 없으면 세션 길이. */
    internal fun asleepMinutes(s: RawSleep): Int {
        if (s.stages.isEmpty()) return Duration.between(s.start, s.end).toMinutes().toInt()
        return s.stages.filter { it.type in ASLEEP }.sumOf { Duration.between(it.start, it.end).toMinutes() }.toInt()
    }

    private fun efficiency(s: RawSleep): Double? {
        if (s.stages.isEmpty()) return null
        val inBed = Duration.between(s.start, s.end).toMinutes().toDouble()
        return if (inBed <= 0) null else (asleepMinutes(s) / inBed).coerceIn(0.0, 1.0)
    }

    private fun deepRatio(s: RawSleep): Double? {
        if (s.stages.none { it.type == StageType.DEEP }) return null
        val asleep = asleepMinutes(s).toDouble()
        val deep = s.stages.filter { it.type == StageType.DEEP }.sumOf { Duration.between(it.start, it.end).toMinutes() }
        return if (asleep <= 0) null else deep / asleep
    }

    /** SpO2 90% 미만이 서로 5분 넘게 떨어진 두 구간 이상이면 "반복". 측정이 없으면 null. */
    private fun lowSpo2(samples: List<Sample>): Boolean? {
        if (samples.isEmpty()) return null
        val low = samples.filter { it.value < 90.0 }.map { it.time }.sorted()
        var episodes = 0
        var last: Instant? = null
        for (t in low) {
            if (last == null || Duration.between(last, t) > Duration.ofMinutes(5)) episodes++
            last = t
        }
        return episodes >= 2
    }

    private fun List<Sample>.within(start: Instant, end: Instant) = filter { it.time >= start && it.time < end }

    private fun median(samples: List<Sample>): Double? {
        if (samples.isEmpty()) return null
        val v = samples.map { it.value }.sorted()
        return if (v.size % 2 == 1) v[v.size / 2] else (v[v.size / 2 - 1] + v[v.size / 2]) / 2
    }
}
