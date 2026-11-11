package com.groovenspot.pulsecare.score

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.sqrt

internal object Stats {
    fun median(values: List<Double>): Double {
        require(values.isNotEmpty())
        val sorted = values.sorted()
        val mid = sorted.size / 2
        return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2
    }

    /** 중앙값 절대 편차. */
    fun mad(values: List<Double>, median: Double = median(values)): Double =
        median(values.map { abs(it - median) })

    fun standardDeviation(values: List<Double>): Double {
        val mean = values.average()
        return sqrt(values.sumOf { (it - mean) * (it - mean) } / values.size)
    }

    /**
     * 생체 신호의 기준선 대비 점수. z = 0 → 70, +1 → 89, −1 → 41, −2 → 18.
     * s = 100 / (1 + e^-(1.2·z + 0.85)), z에는 방향(d)이 이미 반영돼 있어야 합니다.
     */
    fun logisticScore(directedZ: Double): Double = 100.0 / (1.0 + exp(-(1.2 * directedZ + 0.85)))

    /**
     * 구간표 선형 보간. [points]는 x 오름차순 (x, 점수) 쌍이고,
     * 범위 밖은 양 끝 점수를 그대로 씁니다.
     */
    fun interpolate(x: Double, points: List<Pair<Double, Double>>): Double {
        if (x <= points.first().first) return points.first().second
        if (x >= points.last().first) return points.last().second
        for (i in 1 until points.size) {
            val (x1, y1) = points[i]
            if (x <= x1) {
                val (x0, y0) = points[i - 1]
                return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
            }
        }
        return points.last().second
    }
}
