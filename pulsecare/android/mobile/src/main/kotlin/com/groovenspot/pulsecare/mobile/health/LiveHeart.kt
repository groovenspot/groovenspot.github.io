package com.groovenspot.pulsecare.mobile.health

import com.groovenspot.pulsecare.alert.HrSample
import java.time.Duration
import java.time.Instant

/** 걸음 기록 구간 (Health Connect StepsRecord). */
data class StepSpan(val start: Instant, val end: Instant, val count: Long)

/**
 * 실시간 심박 판정([com.groovenspot.pulsecare.alert.HeartRateWatch])에 넣을 샘플을 만듭니다.
 * - 움직임: 샘플 시각 앞뒤 1분 안의 걸음 기록이 분당 [MOVING_STEPS_PER_MIN]보(가벼운 걷기) 이상
 * - 잠: 수면 기록 안 / 운동: 운동 기록 안
 * 워치가 걸음을 늦게 올리면 움직임을 놓칠 수 있어, 판정은 10분 이상 이어질 때만 합니다 (HeartRateWatch).
 */
object LiveHeart {
    private const val MOVING_STEPS_PER_MIN = 20.0

    fun samples(
        heartRate: List<Pair<Instant, Long>>,
        steps: List<StepSpan>,
        sleeps: List<Pair<Instant, Instant>>,
        workouts: List<Pair<Instant, Instant>>,
    ): List<HrSample> = heartRate.sortedBy { it.first }.map { (t, bpm) ->
        HrSample(
            time = t,
            bpm = bpm.toInt(),
            moving = moving(t, steps),
            asleep = sleeps.any { (s, e) -> !t.isBefore(s) && t.isBefore(e) },
            inWorkout = workouts.any { (s, e) -> !t.isBefore(s) && t.isBefore(e) },
        )
    }

    private fun moving(t: Instant, steps: List<StepSpan>): Boolean {
        val from = t.minus(Duration.ofMinutes(1))
        val to = t.plus(Duration.ofMinutes(1))
        return steps.any { s ->
            s.end.isAfter(from) && s.start.isBefore(to) && run {
                val minutes = Duration.between(s.start, s.end).toMillis() / 60_000.0
                s.count / minutes.coerceAtLeast(1.0) >= MOVING_STEPS_PER_MIN
            }
        }
    }
}
