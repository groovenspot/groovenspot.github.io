package com.groovenspot.pulsecare.alert

import java.time.Duration
import java.time.Instant

data class HrSample(
    val time: Instant,
    val bpm: Int,
    /** 걷기 등 움직임이 감지됐는지. */
    val moving: Boolean = false,
    val asleep: Boolean = false,
    /** 운동 기록 중인지. */
    val inWorkout: Boolean = false,
)

/**
 * 실시간 고정 기준 신호 (가입 첫날부터 동작):
 * - 안정 중 높은 심박: 120 bpm 이상, 움직임 없이 10분
 * - 깨어 있을 때 낮은 심박: 40 bpm 미만 10분
 * 운동 중과 운동 끝난 뒤 10분은 회복 시간으로 보고 판정하지 않습니다.
 */
object HeartRateWatch {

    private val SUSTAIN: Duration = Duration.ofMinutes(10)
    private val RECOVERY: Duration = Duration.ofMinutes(10)

    fun evaluate(samples: List<HrSample>): List<Detection> {
        val sorted = samples.sortedBy { it.time }
        val workoutEnds = sorted.filter { it.inWorkout }.map { it.time }
        val usable = sorted.filter { s ->
            !s.inWorkout && workoutEnds.none { end -> !s.time.isBefore(end) && Duration.between(end, s.time) < RECOVERY }
        }
        return listOfNotNull(
            sustained(usable, Signal.HIGH_HR_AT_REST) { it.bpm >= 120 && !it.moving },
            sustained(usable, Signal.LOW_HR_AWAKE) { it.bpm < 40 && !it.asleep },
        )
    }

    /** 조건이 끊김 없이 10분 이상 이어진 구간이 있으면 감지. 샘플 사이가 2분 넘게 비면 끊긴 것으로 봅니다. */
    private fun sustained(samples: List<HrSample>, signal: Signal, condition: (HrSample) -> Boolean): Detection? {
        var start: HrSample? = null
        var prev: HrSample? = null
        for (s in samples) {
            val gap = prev?.let { Duration.between(it.time, s.time) > Duration.ofMinutes(2) } ?: false
            if (!condition(s) || gap) start = null
            if (condition(s)) {
                if (start == null) start = s
                if (Duration.between(start.time, s.time) >= SUSTAIN) {
                    return Detection(signal, current = s.bpm.toDouble())
                }
            }
            prev = s
        }
        return null
    }
}
