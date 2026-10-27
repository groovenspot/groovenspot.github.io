package com.groovenspot.pulsecare.history

import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionProgress
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.score.Badge
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ConditionScoreEngine
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.Metric
import com.groovenspot.pulsecare.score.ScoreContext
import com.groovenspot.pulsecare.score.ScoreResult
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

enum class Period(val days: Int, val label: String, val previous: String, val previousWith: String) {
    WEEK(7, "주간", "지난주", "지난주와"),
    MONTH(30, "월간", "지난달", "지난달과"),
}

/** 기록 탭의 하루. [dayIndex]는 가입일 = 1, 가입 전은 0 이하 (점수 없이 수면·회복만). */
data class HistoryDay(
    val date: LocalDate,
    val dayIndex: Int,
    val score: Int?,
    val band: Band?,
    val reason: String?,
    val subScores: Map<Metric, Double> = emptyMap(),
    /** 기준선 학습 중 (1~7일째). */
    val learning: Boolean = false,
    /** HRV가 없어 다른 지표로 추정한 점수. */
    val estimated: Boolean = false,
    /** 본 수면 + 낮잠(최대 1시간). */
    val sleepMinutes: Int? = null,
    val bedtime: LocalTime? = null,
    val hrvMs: Double? = null,
    val restingHr: Double? = null,
    val mission: MissionLog? = null,
)

/** 내 평소 범위: 최근 28일 중앙값 ± 1σ(1.4826·MAD). */
data class UsualRange(val low: Double, val mid: Double, val high: Double) {
    operator fun contains(v: Double) = v in low..high
}

data class History(
    val period: Period,
    val days: List<HistoryDay>,
    val averageScore: Int?,
    val previousAverage: Int?,
    val averageSleepMinutes: Int?,
    val sleep: UsualRange?,
    val hrv: UsualRange?,
    val restingHr: UsualRange?,
    val usualBedtime: LocalTime?,
    val periodBedtime: LocalTime?,
    val missionsDone: Int,
    val missionsAuto: Int,
    /** 기간 안에서 주간 배지를 받은 주의 마지막 날(일요일). */
    val weeklyBadges: List<LocalDate>,
) {
    /** 기간 요약 몇 줄. 나빠진 것도 탓하지 않고 사실만 말합니다. */
    val lines: List<String>
        get() = listOfNotNull(
            averageScore?.let { avg ->
                val diff = previousAverage?.let { avg - it }
                when {
                    diff == null -> "평균 컨디션 ${avg}점"
                    diff >= 2 -> "평균 컨디션 ${avg}점 · ${period.previous}보다 ${diff}점 올랐어요"
                    diff <= -2 -> "평균 컨디션 ${avg}점 · ${period.previous}보다 ${-diff}점 낮아요"
                    else -> "평균 컨디션 ${avg}점 · ${period.previousWith} 비슷해요"
                }
            },
            averageSleepMinutes?.let { "평균 수면 ${duration(it)}" },
            periodBedtime?.let { bt ->
                val usual = usualBedtime
                val diff = usual?.let { minutesBetween(it, bt) }
                when {
                    diff == null || abs(diff) < 15 -> "평균 취침 ${clock(bt)}"
                    diff > 0 -> "평균 취침 ${clock(bt)} · 평소보다 ${diff}분 늦어요"
                    else -> "평균 취침 ${clock(bt)} · 평소보다 ${-diff}분 일러요"
                }
            },
            "미션 ${missionsDone}일 완료" + if (missionsAuto > 0) " (워치로 확인 ${missionsAuto}일)" else "",
        )

    companion object {
        fun duration(minutes: Int): String = "${minutes / 60}시간 ${minutes % 60}분"
        fun clock(t: LocalTime): String = String.format(Locale.ROOT, "%02d:%02d", t.hour, t.minute)

        /** [from]에서 [to]까지 몇 분 늦은지 (자정을 넘는 취침 시각도 가깝게, −720~720). */
        fun minutesBetween(from: LocalTime, to: LocalTime): Int {
            val d = (to.toSecondOfDay() - from.toSecondOfDay()) / 60
            return ((d + 720 + 1440) % 1440) - 720
        }
    }
}

/**
 * 기록 탭 (기획서 16번): 주간·월간 점수, 수면, 회복 추이와 미션 달력.
 * 건강 수치는 저장하지 않으므로 Health Connect에서 읽은 [records]로 그때그때 만듭니다.
 * 앱이 보여준 점수가 저장돼 있으면 그 점수를, 없으면(앱을 열지 않은 날) 같은 엔진으로 다시 계산합니다.
 */
object HistoryBuilder {

    private const val MIN_RANGE_VALUES = 7

    /** 지난 기간과 비교하고 기준선 28일을 채우려면 [to]에서 이만큼 앞부터 읽어야 합니다. */
    fun readDays(period: Period): Long = period.days * 2L + ConditionScoreEngine.BASELINE_DAYS

    fun build(
        period: Period,
        to: LocalDate,
        records: List<DailyRecord>,
        signupDate: LocalDate,
        storedScores: Map<LocalDate, Int>,
        logs: List<MissionLog>,
    ): History {
        val from = to.minusDays(period.days - 1L)
        val previousFrom = from.minusDays(period.days.toLong())
        val withScores = records.map { it.copy(score = storedScores[it.date]) }.sortedBy { it.date }
        val byDate = withScores.associateBy { it.date }
        val logByDate = logs.associateBy { it.date }

        fun day(date: LocalDate): HistoryDay {
            val dayIndex = (ChronoUnit.DAYS.between(signupDate, date) + 1).toInt()
            val record = byDate[date] ?: DailyRecord(date, sleep = null)
            val sleepMinutes = record.sleep?.let { it.mainSleepMinutes + min(it.napMinutes, 60) }
            val base = HistoryDay(
                date = date,
                dayIndex = dayIndex,
                score = null,
                band = null,
                reason = null,
                sleepMinutes = sleepMinutes,
                bedtime = record.sleep?.bedtime,
                hrvMs = record.hrvMs,
                restingHr = record.restingHr,
                mission = logByDate[date],
            )
            if (dayIndex < 1) return base
            val result = ConditionScoreEngine.score(record, withScores.filter { it.date < date }, ScoreContext(dayIndex))
            val score = storedScores[date] ?: result.score
            return base.copy(
                score = score,
                band = score?.let { Band.of(it) },
                reason = result.reason.takeIf { result.kind != ScoreResult.Kind.NO_DATA },
                subScores = result.subScores,
                learning = dayIndex <= 7,
                estimated = Badge.ESTIMATED in result.badges,
            )
        }

        val days = dates(from, to).map(::day)
        val previous = dates(previousFrom, from.minusDays(1)).map(::day)

        val recent = withScores.filter { ChronoUnit.DAYS.between(it.date, to) in 0 until ConditionScoreEngine.BASELINE_DAYS }
        val bedtimes = days.mapNotNull { it.bedtime }
        val usualBedtimes = recent.mapNotNull { it.sleep?.bedtime }

        return History(
            period = period,
            days = days,
            averageScore = days.mapNotNull { it.score }.averageOrNull(),
            previousAverage = previous.mapNotNull { it.score }.averageOrNull(),
            averageSleepMinutes = days.mapNotNull { it.sleepMinutes }.averageOrNull(),
            sleep = range(recent.mapNotNull { r -> r.sleep?.let { it.mainSleepMinutes + min(it.napMinutes, 60).toDouble() } }, floor = 20.0),
            hrv = range(recent.mapNotNull { it.hrvMs }, floor = 2.0),
            restingHr = range(recent.mapNotNull { it.restingHr }, floor = 1.0),
            usualBedtime = usualBedtimes.takeIf { it.size >= MIN_RANGE_VALUES }?.let(MissionVerifier::median),
            periodBedtime = bedtimes.takeIf { it.isNotEmpty() }?.let(MissionVerifier::median),
            missionsDone = days.count { it.mission?.completed == true },
            missionsAuto = days.count { it.mission?.let { m -> m.completed && m.auto } == true },
            weeklyBadges = dates(from, to).filter { it.dayOfWeek == DayOfWeek.SUNDAY }.filter { sunday ->
                MissionProgress.weeklyBadge((6 downTo 0).map { logByDate[sunday.minusDays(it.toLong())]?.completed == true })
            },
        )
    }

    private fun dates(from: LocalDate, to: LocalDate): List<LocalDate> =
        generateSequence(from) { it.plusDays(1) }.takeWhile { it <= to }.toList()

    private fun List<Number>.averageOrNull(): Int? = takeIf { it.isNotEmpty() }?.map { it.toDouble() }?.average()?.roundToInt()

    /** 값이 7개 이상일 때만. 편차가 아주 작은 사람도 띠가 보이도록 반폭 하한 [floor]. */
    private fun range(values: List<Double>, floor: Double): UsualRange? {
        if (values.size < MIN_RANGE_VALUES) return null
        val sorted = values.sorted()
        val median = median(sorted)
        val half = max(1.4826 * median(values.map { abs(it - median) }.sorted()), floor)
        return UsualRange(median - half, median, median + half)
    }

    private fun median(sorted: List<Double>): Double {
        val mid = sorted.size / 2
        return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2
    }
}
