package com.groovenspot.pulsecare.score

import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** 이유 문장에 넣을 숫자. */
internal data class ReasonDetails(
    val sleepNeedMinutes: Double,
    /** 오늘 안정시 심박 − 기준선 중앙값, bpm. */
    val restingHrDelta: Double? = null,
    val loadRatio: Double? = null,
)

internal data class Reason(val text: String, val metric: Metric?)

/**
 * 이유 한 줄 고르기 (기획서 13번):
 * 1. 지표별 기여도 = w × (s − 70)
 * 2. 70점 이상이면 가장 큰 플러스 요인, 미만이면 가장 큰 마이너스 요인
 * 3. 상한 보정이 걸렸으면 그 이유가 먼저
 * 4. 음주·야근 태그가 있으면 문장 앞에 언급
 */
internal object ReasonText {

    fun pick(
        score: Int,
        sub: Map<Metric, Double>,
        cap: Cap?,
        today: DailyRecord,
        sleep: SleepSummary,
        details: ReasonDetails,
    ): Reason {
        val base = if (cap != null) {
            Reason(capText(cap), null)
        } else {
            val contributions = sub.mapValues { (metric, s) -> metric.weight * (s - 70.0) }
            val chosen = if (score >= 70) {
                contributions.filterValues { it > 0 }.maxByOrNull { it.value }
            } else {
                contributions.filterValues { it < 0 }.minByOrNull { it.value }
            }
            if (chosen == null) {
                Reason("평소와 비슷한 컨디션이에요", null)
            } else {
                Reason(metricText(chosen.key, chosen.value > 0, sleep, details), chosen.key)
            }
        }
        val prefix = tagPrefix(today.tags)
        return if (prefix == null) base else base.copy(text = "$prefix ${base.text}")
    }

    private fun tagPrefix(tags: Set<DayTag>): String? = when {
        DayTag.ALCOHOL in tags -> "어제 술을 마셨다고 기록하셨어요."
        DayTag.OVERTIME in tags -> "어제 늦게까지 일했다고 기록하셨어요."
        else -> null // 아픔 태그는 상한 보정 문장이 직접 다룹니다.
    }

    private fun capText(cap: Cap): String = when (cap) {
        Cap.SHORT_SLEEP -> "어젯밤 수면이 4시간이 안 됐어요. 오늘은 무리하지 마세요"
        Cap.SICK -> "몸이 안 좋다고 기록하셨어요. 오늘은 쉬어 가세요"
        Cap.CAUTION_SIGNAL -> "며칠째 평소와 다른 신호가 있어요. 오늘은 무리하지 마세요"
        Cap.NO_RECOVERY_DATA -> "심박 데이터가 없어 수면 위주로 계산했어요"
    }

    private fun metricText(metric: Metric, positive: Boolean, sleep: SleepSummary, d: ReasonDetails): String =
        when (metric) {
            Metric.SLEEP_DURATION -> if (positive) {
                "어젯밤 필요한 만큼 충분히 잤어요"
            } else {
                val short = (d.sleepNeedMinutes - ConditionScoreEngine.totalSleepMinutes(sleep)).roundToInt()
                "어젯밤 수면이 필요량보다 ${duration(short)} 짧았어요"
            }
            Metric.SLEEP_QUALITY -> if (positive) "어젯밤 깊게 잘 잤어요" else "어젯밤 자주 깨서 잠의 질이 평소보다 낮았어요"
            Metric.REGULARITY -> if (positive) "요즘 일정한 시간에 잠들고 있어요" else "최근 일주일 잠드는 시간이 들쭉날쭉했어요"
            Metric.HRV -> if (positive) "자율신경이 평소보다 잘 회복됐어요" else "자율신경 회복이 평소보다 더뎌요"
            Metric.RESTING_HR -> {
                val bpm = d.restingHrDelta?.let { abs(it).roundToInt() }
                when {
                    bpm == null || bpm == 0 -> if (positive) "안정시 심박이 평소보다 낮아요" else "안정시 심박이 평소보다 높아요"
                    positive -> "안정시 심박이 평소보다 $bpm bpm 낮아요"
                    else -> "안정시 심박이 평소보다 $bpm bpm 높아요"
                }
            }
            Metric.ACTIVITY_LOAD -> {
                val ratio = d.loadRatio
                when {
                    positive -> "최근 운동량이 몸에 알맞아요"
                    ratio != null && ratio > 1.0 -> "최근 일주일 운동량이 평소의 ${String.format(Locale.ROOT, "%.1f", ratio)}배예요. 오늘은 쉬어 가세요"
                    else -> "최근 일주일 활동이 평소보다 많이 줄었어요"
                }
            }
            Metric.SKIN_TEMP -> if (positive) "잘 때 체온이 평소처럼 안정적이었어요" else "잘 때 피부 온도가 평소와 달랐어요"
            Metric.RESPIRATORY_RATE -> if (positive) "잘 때 호흡이 평소처럼 안정적이었어요" else "잘 때 호흡수가 평소와 달랐어요"
        }

    /** 70 → "1시간 10분", 45 → "45분", 120 → "2시간". */
    internal fun duration(minutes: Int): String {
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h == 0 -> "${m}분"
            m == 0 -> "${h}시간"
            else -> "${h}시간 ${m}분"
        }
    }
}
