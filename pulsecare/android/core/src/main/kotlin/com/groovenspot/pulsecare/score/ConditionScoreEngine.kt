package com.groovenspot.pulsecare.score

import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * 컨디션 점수 (기획서 13번). 기준선 → 하위 점수 → 가중합 → 상한 보정 순서로 계산하고,
 * 가장 크게 영향을 준 요인으로 이유 한 줄을 고릅니다.
 *
 * 하루 한 번, 기상 직후 지난밤 데이터로 계산합니다. 같은 입력이면 항상 같은 결과가 나옵니다.
 */
object ConditionScoreEngine {

    const val BASELINE_DAYS = 28
    private const val MIN_BASELINE_VALUES = 3
    private const val MIN_SLEEP_NEED_MINUTES = 7 * 60
    private const val MAX_NAP_MINUTES = 60
    private const val SHORT_SLEEP_MINUTES = 4 * 60
    private const val LEARNING_BADGE_LAST_DAY = 7
    private const val SLEEP_ONLY_LAST_DAY = 3
    private const val RELEARN_DAYS = 14
    private const val JET_LAG_DAYS = 3

    /** MAD를 표준편차 척도로 바꾸는 상수. */
    private const val MAD_SCALE = 1.4826
    private const val Z_LIMIT = 4.0

    // 행동 지표도 "평소 = 70점"이 되도록 내 기준 대비로 잽니다 (2026-10-27 결정, 기획서 13번 구간표를 대체).
    // 수면 시간: 필요량을 채우면 70, 필요량보다 더 자면 회복으로 보고 120%에서 100.
    private val SLEEP_DURATION_POINTS = listOf(
        0.60 to 10.0, 0.70 to 25.0, 0.85 to 45.0, 1.00 to 70.0, 1.10 to 85.0, 1.20 to 100.0,
    )

    // 기준선이 없는 가입 1~3일차 수면 점수에만 쓰는 절대 구간표 (효율 85%가 70점).
    private val SLEEP_EFFICIENCY_POINTS = listOf(0.70 to 10.0, 0.78 to 40.0, 0.85 to 70.0, 0.90 to 100.0)

    // 활동 부하: 7일/28일이 0.8~1.3이면 평소대로 70. 갑자기 늘면 크게, 크게 줄면 조금 낮아집니다.
    // 부하는 위험 요인이라 70을 넘지 않습니다.
    private val LOAD_POINTS = listOf(
        0.6 to 60.0, 0.8 to 70.0, 1.3 to 70.0, 1.5 to 55.0, 1.8 to 30.0, 2.0 to 10.0,
    )

    // 기준선 편차가 아주 작은 사람도 사소한 차이로 점수가 튀지 않게 두는 MAD 하한.
    private const val EFFICIENCY_MAD_FLOOR = 0.01
    private const val REGULARITY_MAD_FLOOR_MINUTES = 5.0

    fun score(today: DailyRecord, history: List<DailyRecord>, context: ScoreContext): ScoreResult {
        val sleep = today.sleep ?: return ScoreResult(
            kind = ScoreResult.Kind.NO_DATA,
            score = null,
            band = null,
            reason = "어젯밤 기록이 없어요. 오늘 컨디션은 어떤가요?",
        )

        val window = history
            .filter { it.date < today.date && ChronoUnit.DAYS.between(it.date, today.date) <= BASELINE_DAYS }
            .sortedBy { it.date }

        return if (context.dayIndex <= SLEEP_ONLY_LAST_DAY) {
            sleepOnly(today, sleep, context)
        } else {
            full(today, sleep, window, context)
        }
    }

    private fun sleepOnly(today: DailyRecord, sleep: SleepSummary, context: ScoreContext): ScoreResult {
        val sub = linkedMapOf<Metric, Double>()
        sub[Metric.SLEEP_DURATION] = sleepDurationScore(sleep, MIN_SLEEP_NEED_MINUTES.toDouble())
        sleep.efficiency?.let { sub[Metric.SLEEP_QUALITY] = Stats.interpolate(it, SLEEP_EFFICIENCY_POINTS) }
        val details = ReasonDetails(sleepNeedMinutes = MIN_SLEEP_NEED_MINUTES.toDouble())
        return finish(today, sleep, sub, details, context, ScoreResult.Kind.SLEEP_ONLY, setOf(Badge.LEARNING))
    }

    private fun full(
        today: DailyRecord,
        sleep: SleepSummary,
        window: List<DailyRecord>,
        context: ScoreContext,
    ): ScoreResult {
        // 아픔·음주·야근 태그가 있는 날은 기준선에서 뺍니다.
        val clean = window.filter { it.tags.isEmpty() }
        val relearning = context.daysSinceDeviceChange?.let { it < RELEARN_DAYS } == true
        val jetLag = context.daysSinceTimezoneChange?.let { it < JET_LAG_DAYS } == true
        // 기기를 바꾸면 회복 지표는 바꾼 뒤 기록만으로 다시 배웁니다.
        val recoveryBaseline = if (relearning) {
            clean.filter { ChronoUnit.DAYS.between(it.date, today.date) < context.daysSinceDeviceChange!! }
        } else {
            clean
        }

        val sleepNeed = sleepNeedMinutes(window)
        val sub = linkedMapOf<Metric, Double>()
        sub[Metric.SLEEP_DURATION] = sleepDurationScore(sleep, sleepNeed)
        sleepQualityScore(sleep, clean)?.let { sub[Metric.SLEEP_QUALITY] = it }
        if (!jetLag) regularityScore(today, window, clean)?.let { sub[Metric.REGULARITY] = it }

        physioScore(today.hrvMs, recoveryBaseline.mapNotNull { it.hrvMs }, direction = +1, context, Metric.HRV)
            ?.let { sub[Metric.HRV] = it }
        physioScore(today.restingHr, recoveryBaseline.mapNotNull { it.restingHr }, direction = -1, context, Metric.RESTING_HR)
            ?.let { sub[Metric.RESTING_HR] = it }
        loadScore(window)?.let { sub[Metric.ACTIVITY_LOAD] = it }
        physioScore(today.skinTempC, clean.mapNotNull { it.skinTempC }, direction = 0, context, Metric.SKIN_TEMP)
            ?.let { sub[Metric.SKIN_TEMP] = it }
        physioScore(today.respiratoryRate, clean.mapNotNull { it.respiratoryRate }, direction = 0, context, Metric.RESPIRATORY_RATE)
            ?.let { sub[Metric.RESPIRATORY_RATE] = it }

        val badges = buildSet {
            if (context.dayIndex <= LEARNING_BADGE_LAST_DAY) add(Badge.LEARNING)
            if (today.hrvMs == null) add(Badge.ESTIMATED)
            if (relearning) add(Badge.RELEARNING)
            if (jetLag) add(Badge.JET_LAG)
        }
        val rhrHistory = recoveryBaseline.mapNotNull { it.restingHr }
        val details = ReasonDetails(
            sleepNeedMinutes = sleepNeed,
            restingHrDelta = today.restingHr?.takeIf { rhrHistory.size >= MIN_BASELINE_VALUES }
                ?.let { it - Stats.median(rhrHistory) },
            loadRatio = loadRatio(window),
        )
        return finish(today, sleep, sub, details, context, ScoreResult.Kind.FULL, badges)
    }

    private fun finish(
        today: DailyRecord,
        sleep: SleepSummary,
        sub: Map<Metric, Double>,
        details: ReasonDetails,
        context: ScoreContext,
        kind: ScoreResult.Kind,
        badges: Set<Badge>,
    ): ScoreResult {
        val totalWeight = sub.keys.sumOf { it.weight }
        val weighted = sub.entries.sumOf { (metric, s) -> metric.weight * s } / totalWeight

        val caps = buildList {
            if (sleep.mainSleepMinutes < SHORT_SLEEP_MINUTES) add(Cap.SHORT_SLEEP)
            if (DayTag.SICK in today.tags) add(Cap.SICK)
            if (context.cautionSignalActive) add(Cap.CAUTION_SIGNAL)
            if (kind == ScoreResult.Kind.FULL && Metric.HRV !in sub && Metric.RESTING_HR !in sub) {
                add(Cap.NO_RECOVERY_DATA)
            }
        }
        val binding = caps.minByOrNull { it.max }?.takeIf { weighted > it.max }
        val score = min(weighted, binding?.max?.toDouble() ?: 100.0).roundToInt().coerceIn(0, 100)

        val reason = ReasonText.pick(score, sub, binding, today, sleep, details)
        return ScoreResult(
            kind = kind,
            score = score,
            band = Band.of(score),
            reason = reason.text,
            badges = badges,
            subScores = sub,
            cap = binding,
            reasonMetric = reason.metric,
        )
    }

    // --- 수면 ---

    /** 낮잠은 최대 1시간까지 수면 시간에 더합니다. */
    internal fun totalSleepMinutes(sleep: SleepSummary): Int =
        sleep.mainSleepMinutes + min(sleep.napMinutes, MAX_NAP_MINUTES)

    /** 최근 28일 중 컨디션이 좋았던 날(70점 이상)의 수면 중앙값. 7시간 아래로는 내리지 않습니다. */
    internal fun sleepNeedMinutes(window: List<DailyRecord>): Double {
        val goodNights = window
            .filter { (it.score ?: 0) >= 70 && it.tags.isEmpty() }
            .mapNotNull { it.sleep?.let { s -> totalSleepMinutes(s).toDouble() } }
        val need = if (goodNights.size >= MIN_BASELINE_VALUES) Stats.median(goodNights) else 0.0
        return max(need, MIN_SLEEP_NEED_MINUTES.toDouble())
    }

    private fun sleepDurationScore(sleep: SleepSummary, needMinutes: Double): Double =
        Stats.interpolate(totalSleepMinutes(sleep) / needMinutes, SLEEP_DURATION_POINTS)

    /**
     * 수면 효율을 내 기준선과 비교한 점수 (평소 = 70). 기준선이 아직 없으면 절대 구간표를 씁니다.
     * 깊은 잠 비율이 기준선보다 낮으면 최대 10점을 뺍니다 (z −2에서 10점).
     */
    private fun sleepQualityScore(sleep: SleepSummary, clean: List<DailyRecord>): Double? {
        val efficiency = sleep.efficiency ?: return null
        val history = clean.mapNotNull { it.sleep?.efficiency }
        var s = if (history.size >= MIN_BASELINE_VALUES) {
            Stats.logisticScore(robustZ(efficiency, history, EFFICIENCY_MAD_FLOOR))
        } else {
            Stats.interpolate(efficiency, SLEEP_EFFICIENCY_POINTS)
        }
        val deep = sleep.deepRatio
        val deepHistory = clean.mapNotNull { it.sleep?.deepRatio }
        if (deep != null && deepHistory.size >= MIN_BASELINE_VALUES) {
            val z = robustZ(deep, deepHistory)
            if (z < 0) s -= min(10.0, -z * 5.0)
        }
        return max(s, 0.0)
    }

    /**
     * 최근 7일 취침 시각 표준편차를, 지난 날들의 같은 값(각 날까지의 7일 편차)과 비교합니다.
     * 평소보다 들쭉날쭉하면 낮고, 평소보다 일정하면 높습니다 (평소 = 70).
     */
    private fun regularityScore(today: DailyRecord, window: List<DailyRecord>, clean: List<DailyRecord>): Double? {
        val all = window + today
        val todaySpread = bedtimeSpread(today, all) ?: return null
        val history = clean.mapNotNull { bedtimeSpread(it, all) }
        if (history.size < MIN_BASELINE_VALUES) return null
        return Stats.logisticScore(-robustZ(todaySpread, history, REGULARITY_MAD_FLOOR_MINUTES))
    }

    /** [day]까지 7일간 취침 시각의 표준편차(분). 정오 기준으로 재서 자정을 넘나드는 취침도 연속으로 다룹니다. */
    private fun bedtimeSpread(day: DailyRecord, records: List<DailyRecord>): Double? {
        val bedtimes = records
            .filter { it.date <= day.date && ChronoUnit.DAYS.between(it.date, day.date) < 7 }
            .mapNotNull { it.sleep?.bedtime }
            .map { (((it.hour * 60 + it.minute) - 12 * 60 + 24 * 60) % (24 * 60)).toDouble() }
        if (bedtimes.size < 4) return null
        return Stats.standardDeviation(bedtimes)
    }

    // --- 활동 부하 ---

    /** 최근 7일 평균 ÷ 28일 평균. 28일 중 14일 이상 기록이 있어야 계산합니다. */
    internal fun loadRatio(window: List<DailyRecord>): Double? {
        val loads = window.mapNotNull { r -> r.activityLoad?.let { r.date to it } }
        if (loads.size < 14) return null
        val chronic = loads.map { it.second }.average()
        if (chronic <= 0) return null
        val last = window.maxOf { it.date }
        val acute = loads.filter { ChronoUnit.DAYS.between(it.first, last) < 7 }.map { it.second }
        if (acute.isEmpty()) return null
        return acute.average() / chronic
    }

    private fun loadScore(window: List<DailyRecord>): Double? =
        loadRatio(window)?.let { Stats.interpolate(it, LOAD_POINTS) }

    // --- 생체 신호 ---

    /**
     * [direction] +1: 높을수록 좋음 (HRV), −1: 낮을수록 좋음 (안정시 심박), 0: 어느 쪽이든 벗어나면 나쁨 (체온·호흡수).
     */
    private fun physioScore(
        value: Double?,
        history: List<Double>,
        direction: Int,
        context: ScoreContext,
        metric: Metric,
    ): Double? {
        if (value == null) return null
        val baseline = baseline(history, metric, context) ?: return null
        val z = ((value - baseline.first) / (MAD_SCALE * baseline.second)).coerceIn(-Z_LIMIT, Z_LIMIT)
        val directed = if (direction == 0) -abs(z) else direction * z
        return Stats.logisticScore(directed)
    }

    /** (중앙값, MAD). 가입 28일 전에는 표준값이 있으면 개인 비중을 날짜만큼(4/28 → 28/28) 늘려 섞습니다. */
    private fun baseline(history: List<Double>, metric: Metric, context: ScoreContext): Pair<Double, Double>? {
        val norm = context.norms?.let {
            when (metric) {
                Metric.HRV -> it.hrvMedian to it.hrvMad
                Metric.RESTING_HR -> it.restingHrMedian to it.restingHrMad
                else -> null
            }
        }
        val personal = if (history.size >= MIN_BASELINE_VALUES) {
            val m = Stats.median(history)
            m to madFloor(Stats.mad(history, m), m)
        } else {
            null
        }
        if (norm == null || context.dayIndex >= BASELINE_DAYS) return personal
        if (personal == null) return norm
        val w = (context.dayIndex.coerceIn(4, BASELINE_DAYS)).toDouble() / BASELINE_DAYS
        return (w * personal.first + (1 - w) * norm.first) to (w * personal.second + (1 - w) * norm.second)
    }

    /** 매일 값이 같으면 MAD가 0이 됩니다. 아주 작은 차이로 점수가 튀지 않게 중앙값의 2%를 하한으로 둡니다. */
    private fun madFloor(mad: Double, median: Double): Double = max(mad, max(abs(median) * 0.02, 1e-6))

    private fun robustZ(value: Double, history: List<Double>, absoluteFloor: Double = 0.0): Double {
        val m = Stats.median(history)
        val mad = max(madFloor(Stats.mad(history, m), m), absoluteFloor)
        return ((value - m) / (MAD_SCALE * mad)).coerceIn(-Z_LIMIT, Z_LIMIT)
    }
}
