package com.groovenspot.pulsecare.alert

import com.groovenspot.pulsecare.score.ConditionScoreEngine
import com.groovenspot.pulsecare.score.DailyRecord
import java.time.temporal.ChronoUnit

/**
 * 하루 단위 신호를 아침마다 판정합니다 (기획서 12번 "신호별 판단 기준").
 * 한 번 튀는 값은 알리지 않고, 정해진 일수 동안 이어질 때만 알립니다.
 */
object DailySignals {

    private const val LEARNING_DAYS = 7
    private const val MIN_BASELINE_VALUES = 3

    /** [days]는 오늘을 포함한 최근 기록 (날짜 순서 무관). [dayIndex]는 가입일이 1. */
    fun evaluate(days: List<DailyRecord>, dayIndex: Int): List<Detection> {
        if (dayIndex <= LEARNING_DAYS || days.isEmpty()) return emptyList()
        val sorted = days.sortedBy { it.date }
        return listOfNotNull(
            restingHrRise(sorted),
            activityDrop(sorted),
            lowSpo2(sorted),
            sleepDebt(sorted),
            stress(sorted),
        )
    }

    /** 안정시 심박이 기준선 대비 +10 bpm 이상으로 3일 연속. */
    private fun restingHrRise(days: List<DailyRecord>): Detection? {
        val (recent, baseline) = split(days, 3)
        val usual = median(baseline.mapNotNull { it.restingHr }) ?: return null
        val values = recent.map { it.restingHr }
        if (values.size < 3 || values.any { it == null || it < usual + 10 }) return null
        return Detection(Signal.RESTING_HR_RISE, usual, values.last(), days = 3)
    }

    /** 걸음 수가 기준선의 40% 이하로 3일 연속. */
    private fun activityDrop(days: List<DailyRecord>): Detection? {
        val (recent, baseline) = split(days, 3)
        val usual = median(baseline.mapNotNull { it.steps?.toDouble() }) ?: return null
        val values = recent.map { it.steps }
        if (values.size < 3 || values.any { it == null || it > usual * 0.4 }) return null
        return Detection(Signal.ACTIVITY_DROP, usual, values.last()!!.toDouble(), days = 3)
    }

    /** 수면 중 SpO2 90% 미만 구간 반복이 최근 7일 중 3일. */
    private fun lowSpo2(days: List<DailyRecord>): Detection? {
        val count = lastDays(days, 7).count { it.lowSpo2Repeated == true }
        return if (count >= 3) Detection(Signal.LOW_SPO2, days = count) else null
    }

    /** 수면이 필요량보다 60분 이상 짧은 날이 최근 5일 중 4일. */
    private fun sleepDebt(days: List<DailyRecord>): Detection? {
        val (recent, baseline) = split(days, 5)
        val need = ConditionScoreEngine.sleepNeedMinutes(baseline)
        val short = recent.mapNotNull { it.sleep }.map { ConditionScoreEngine.totalSleepMinutes(it) }
        val shortDays = short.count { it <= need - 60 }
        if (shortDays < 4) return null
        return Detection(Signal.SLEEP_DEBT, need, short.average(), days = shortDays)
    }

    /** HRV가 기준선 대비 20% 이상 낮은 날이 3일 연속. */
    private fun stress(days: List<DailyRecord>): Detection? {
        val (recent, baseline) = split(days, 3)
        val usual = median(baseline.mapNotNull { it.hrvMs }) ?: return null
        val values = recent.map { it.hrvMs }
        if (values.size < 3 || values.any { it == null || it > usual * 0.8 }) return null
        return Detection(Signal.STRESS, usual, values.last(), days = 3)
    }

    /** 최근 [n]일과, 그 앞 28일 중 태그 없는 날(기준선). */
    private fun split(days: List<DailyRecord>, n: Int): Pair<List<DailyRecord>, List<DailyRecord>> {
        val recent = lastDays(days, n)
        val first = recent.minOfOrNull { it.date } ?: return recent to emptyList()
        val baseline = days.filter {
            it.date < first && ChronoUnit.DAYS.between(it.date, first) <= ConditionScoreEngine.BASELINE_DAYS && it.tags.isEmpty()
        }
        return recent to baseline
    }

    private fun lastDays(days: List<DailyRecord>, n: Int): List<DailyRecord> {
        val last = days.maxOf { it.date }
        return days.filter { ChronoUnit.DAYS.between(it.date, last) < n }
    }

    private fun median(values: List<Double>): Double? {
        if (values.size < MIN_BASELINE_VALUES) return null
        val s = values.sorted()
        return if (s.size % 2 == 1) s[s.size / 2] else (s[s.size / 2 - 1] + s[s.size / 2]) / 2
    }
}
