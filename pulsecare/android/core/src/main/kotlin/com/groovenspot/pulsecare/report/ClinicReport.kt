package com.groovenspot.pulsecare.report

import com.groovenspot.pulsecare.alert.DailySignals
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.score.DailyRecord
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import kotlin.math.min
import kotlin.math.roundToInt

/** 한 항목의 요약: 평균, 범위, 측정한 날 수, 앞 절반 → 뒤 절반 평균. */
data class Stat(
    val mean: Double?,
    val min: Double?,
    val max: Double?,
    val days: Int,
    val firstHalf: Double?,
    val secondHalf: Double?,
)

data class WeekRow(
    val monday: LocalDate,
    val sleepMinutes: Double?,
    val restingHr: Double?,
    val hrv: Double?,
    val steps: Double?,
)

data class SignalDay(val date: LocalDate, val detection: Detection)

/**
 * 진료용 건강 요약 (미션 P-08 "한 달 건강 요약을 진료 때 공유"). 의사가 읽도록 점수보다 원래 수치를 먼저 둡니다.
 * 날짜는 기상일 기준이고, 걸음은 [DailyRecord] 규칙대로 전날 하루 값이라 하루 당겨서 셉니다.
 */
data class ClinicSummary(
    val from: LocalDate,
    val to: LocalDate,
    val days: Int,
    val sleep: Stat,
    val bedtime: LocalTime?,
    /** 6시간 미만으로 잔 밤. */
    val shortNights: Int,
    val restingHr: Stat,
    val hrv: Stat,
    val steps: Stat,
    val respiratoryRate: Stat,
    /** 산소포화도 90% 미만이 반복된 밤 / 측정한 밤. */
    val lowSpo2Nights: Int,
    val spo2Nights: Int,
    val signals: List<SignalDay>,
    val missionDays: Int,
    val missionLogged: Int,
    val scoreMean: Int?,
    val weeks: List<WeekRow>,
    /** 차트용 날짜별 값 (from..to, 없으면 null). */
    val dailySleep: List<Double?>,
    val dailyRestingHr: List<Double?>,
    val dailyHrv: List<Double?>,
    val dailySteps: List<Double?>,
)

object ClinicReport {

    /**
     * [records]는 [from] 이전 28일 이상을 포함해야 신호 판정이 맞습니다 (기준선).
     * [scores]는 앱이 보여준 날짜별 점수, [dayIndexOf]는 날짜 → 가입 후 며칠째.
     */
    fun build(
        from: LocalDate,
        to: LocalDate,
        records: List<DailyRecord>,
        logs: List<MissionLog>,
        scores: Map<LocalDate, Int>,
        dayIndexOf: (LocalDate) -> Int,
    ): ClinicSummary {
        val dates = generateSequence(from) { it.plusDays(1) }.takeWhile { !it.isAfter(to) }.toList()
        val byDate = records.associateBy { it.date }
        val inRange = dates.mapNotNull { byDate[it] }

        val sleepByDate = dates.map { d -> byDate[d]?.sleep?.let { (it.mainSleepMinutes + min(it.napMinutes, 60)).toDouble() } }
        val rhrByDate = dates.map { byDate[it]?.restingHr }
        val hrvByDate = dates.map { byDate[it]?.hrvMs }
        // 걸음은 다음 날 아침 기록에 들어 있으니 그날 걸음 = 다음 날 기록의 steps.
        val stepsByDate = dates.map { d -> byDate[d.plusDays(1)]?.steps?.toDouble() }
        val respByDate = dates.map { byDate[it]?.respiratoryRate }

        val signals = dates.flatMap { d ->
            val history = records.filter { !it.date.isAfter(d) && ChronoUnit.DAYS.between(it.date, d) <= 35 }
            DailySignals.evaluate(history, dayIndexOf(d)).map { SignalDay(d, it) }
        }
        // 같은 신호가 며칠 이어지면 첫날만 (다시 시작되면 다시).
        val firstDays = signals.filter { s ->
            signals.none { it.detection.signal == s.detection.signal && it.date == s.date.minusDays(1) }
        }

        val logsInRange = logs.filter { !it.date.isBefore(from) && !it.date.isAfter(to) }
        val weekStarts = dates.map { it.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }.distinct()

        return ClinicSummary(
            from = from,
            to = to,
            days = dates.size,
            sleep = stat(sleepByDate),
            bedtime = inRange.mapNotNull { it.sleep?.bedtime }.takeIf { it.isNotEmpty() }?.let(::medianTime),
            shortNights = sleepByDate.count { it != null && it < 360 },
            restingHr = stat(rhrByDate),
            hrv = stat(hrvByDate),
            steps = stat(stepsByDate),
            respiratoryRate = stat(respByDate),
            lowSpo2Nights = inRange.count { it.lowSpo2Repeated == true },
            spo2Nights = inRange.count { it.lowSpo2Repeated != null },
            signals = firstDays,
            missionDays = logsInRange.filter { it.completed }.map { it.date }.distinct().size,
            missionLogged = logsInRange.map { it.date }.distinct().size,
            scoreMean = scores.filterKeys { !it.isBefore(from) && !it.isAfter(to) }.values.takeIf { it.isNotEmpty() }?.average()?.roundToInt(),
            weeks = weekStarts.map { monday ->
                val idx = dates.indices.filter { dates[it].with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) == monday }
                WeekRow(
                    monday,
                    mean(idx.map { sleepByDate[it] }),
                    mean(idx.map { rhrByDate[it] }),
                    mean(idx.map { hrvByDate[it] }),
                    mean(idx.map { stepsByDate[it] }),
                )
            },
            dailySleep = sleepByDate,
            dailyRestingHr = rhrByDate,
            dailyHrv = hrvByDate,
            dailySteps = stepsByDate,
        )
    }

    /** 의사용 신호 이름 (병명 없이 관찰 사실로). */
    fun label(d: Detection): String {
        val usual = d.usual?.roundToInt()
        val current = d.current?.roundToInt()
        return when (d.signal) {
            Signal.RESTING_HR_RISE -> "안정시 심박 상승 ${d.days ?: 3}일 연속 (평소 $usual → $current bpm)"
            Signal.ACTIVITY_DROP -> "걸음 수 감소 ${d.days ?: 3}일 연속 (평소 $usual → $current 걸음)"
            Signal.LOW_SPO2 -> "수면 중 산소포화도 90% 미만 반복 (최근 7일 중 ${d.days}일)"
            Signal.SLEEP_DEBT -> "수면 부족 (평소 ${hours(d.usual)} → ${hours(d.current)})"
            Signal.STRESS -> "HRV 저하 ${d.days ?: 3}일 연속 (평소 $usual → $current ms)"
            else -> d.signal.name
        }
    }

    fun hours(minutes: Double?): String = minutes?.roundToInt()?.let { "${it / 60}시간 ${it % 60}분" } ?: "-"

    private fun stat(values: List<Double?>): Stat {
        val v = values.filterNotNull()
        val half = values.size / 2
        return Stat(
            mean = v.takeIf { it.isNotEmpty() }?.average(),
            min = v.minOrNull(),
            max = v.maxOrNull(),
            days = v.size,
            firstHalf = mean(values.take(half)),
            secondHalf = mean(values.drop(half)),
        )
    }

    private fun mean(values: List<Double?>): Double? = values.filterNotNull().takeIf { it.isNotEmpty() }?.average()

    /** 자정을 넘는 취침 시각도 가깝게: 정오 기준으로 돌려 중앙값. */
    private fun medianTime(times: List<LocalTime>): LocalTime {
        val shifted = times.map { (it.toSecondOfDay() / 60 + 720) % 1440 }.sorted()
        val m = shifted[shifted.size / 2]
        return LocalTime.of(((m + 720) % 1440) / 60, ((m + 720) % 1440) % 60)
    }
}
