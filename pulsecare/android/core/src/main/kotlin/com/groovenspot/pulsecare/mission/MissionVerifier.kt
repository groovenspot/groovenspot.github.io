package com.groovenspot.pulsecare.mission

import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import kotlin.math.abs

enum class ExerciseKind {
    /** 달리기·인터벌처럼 강한 운동. "강한 운동 쉬기"(C-01)를 깨뜨립니다. */
    VIGOROUS,
    CARDIO,
    STRENGTH,
    STRETCH,
    OTHER,
}

data class Exercise(val start: LocalDateTime, val end: LocalDateTime, val kind: ExerciseKind) {
    val minutes: Long get() = Duration.between(start, end).toMinutes()
}

/** 미션 날 하루의 워치 기록 (현지 시각). 아직 오지 않은 값은 비어 있습니다. */
data class DayActivity(
    val date: LocalDate,
    /** 시(0~23)별 걸음 수. */
    val stepsByHour: Map<Int, Long> = emptyMap(),
    val floors: Double? = null,
    val exercises: List<Exercise> = emptyList(),
    /** 낮 동안의 짧은 수면 블록. */
    val naps: List<Pair<LocalDateTime, LocalDateTime>> = emptyList(),
    /** 그날 밤 잠든 시각과 다음 날 일어난 시각. 다음 날 아침에야 채워집니다. */
    val nightBedtime: LocalDateTime? = null,
    val nextWake: LocalDateTime? = null,
    /** 그날 아침 일어난 시각 (주말 기상 미션용). */
    val morningWake: LocalDateTime? = null,
    /** 최근 28일 평소 취침·기상 시각 (중앙값). */
    val usualBedtime: LocalTime? = null,
    val usualWake: LocalTime? = null,
    /** 그날 밤 포함 최근 7일 취침 시각 (7일 연속 미션용). */
    val recentBedtimes: List<LocalTime> = emptyList(),
    /** 앱 호흡 가이드를 끝까지 한 시각들. */
    val breathing: List<LocalDateTime> = emptyList(),
    /** 앱에 기록한 물 잔 수. */
    val waterCups: Int = 0,
    /** 몸 상태 태그를 남겼는지 (태그 없음도 남긴 것). */
    val tagged: Boolean = false,
) {
    val totalSteps: Long get() = stepsByHour.values.sum()
}

enum class Check {
    /** 워치 기록으로 완료 확인. */
    DONE,

    /** 아직 판단할 수 없음 (시간이 남았거나 밤 기록이 아직 없음). */
    NOT_YET,

    /** 기회가 지났고 기록상 하지 않음. */
    MISSED,

    /** 워치로 확인할 수 없는 미션: 사용자가 직접 체크합니다. */
    MANUAL,
}

/**
 * 미션 자동 확인 (기획서 14번 "확인 방식"). 걸음·운동·수면 기록으로 판단하고,
 * 호흡 가이드·물·몸 상태 태그는 앱 기록으로, 가족 기능처럼 기록이 없는 미션은 [Check.MANUAL]로 둡니다.
 * 기준값(10분 걷기 = 1,000보 등)은 베타에서 조정할 초안입니다.
 */
object MissionVerifier {

    /** 그날 밤 취침 기록으로 다음 날 아침에 확인하는 미션. */
    val NIGHT_MISSIONS = setOf("S-01", "S-06", "S-08", "C-05")

    /** 물 마시기 미션(C-07)의 잔 수. */
    const val WATER_CUPS = 6

    /** 앱 호흡 가이드로 확인하는 미션 (홈 미션 카드에 "호흡 시작" 버튼). */
    val BREATHING_MISSIONS = setOf("R-01", "C-04", "S-04", "R-08", "R-05")

    private const val WALK_10_MIN_STEPS = 1_000L
    private const val WALK_15_MIN_STEPS = 1_500L

    fun check(missionId: String, a: DayActivity, now: LocalDateTime): Check {
        val dayOver = now >= a.date.plusDays(1).atStartOfDay()
        fun byEndOfDay(done: Boolean) = when {
            done -> Check.DONE
            dayOver -> Check.MISSED
            else -> Check.NOT_YET
        }
        fun inWindow(fromHour: Int, toHour: Int, steps: Long): Check {
            val walked = (fromHour until toHour).any { (a.stepsByHour[it] ?: 0) >= steps }
            return when {
                walked -> Check.DONE
                now >= a.date.atStartOfDay().plusHours(toHour.toLong()) -> Check.MISSED
                else -> Check.NOT_YET
            }
        }
        fun exerciseMinutes(vararg kinds: ExerciseKind, after: LocalTime = LocalTime.MIN) =
            a.exercises.filter { it.kind in kinds && it.start.toLocalTime() >= after }.sumOf { it.minutes }

        return when (missionId) {
            // 걸음
            "W-02" -> byEndOfDay(a.totalSteps >= 7_000)
            "W-05" -> byEndOfDay(a.totalSteps >= 10_000)
            "W-01" -> inWindow(12, 14, WALK_10_MIN_STEPS)
            "S-03" -> inWindow(6, 10, WALK_10_MIN_STEPS)
            "R-03" -> inWindow(11, 14, WALK_15_MIN_STEPS)
            "C-03" -> inWindow(0, 24, WALK_15_MIN_STEPS)
            "W-03" -> byEndOfDay((a.floors ?: 0.0) >= 3.0)

            // 운동 기록
            "W-06" -> byEndOfDay(exerciseMinutes(ExerciseKind.CARDIO, ExerciseKind.VIGOROUS) >= 20)
            "W-08" -> byEndOfDay(
                exerciseMinutes(ExerciseKind.CARDIO, ExerciseKind.VIGOROUS) >= 40 && exerciseMinutes(ExerciseKind.STRENGTH) >= 10,
            )
            "R-06" -> byEndOfDay(exerciseMinutes(ExerciseKind.STRETCH, after = LocalTime.of(17, 0)) >= 10)
            "C-06" -> byEndOfDay(exerciseMinutes(ExerciseKind.STRETCH) >= 5)
            // 강한 운동을 20분 넘게 했으면 놓친 것. 하루가 끝나야 완료로 봅니다.
            "C-01" -> when {
                a.exercises.any { it.kind == ExerciseKind.VIGOROUS && it.minutes >= 20 } -> Check.MISSED
                dayOver -> Check.DONE
                else -> Check.NOT_YET
            }

            // 낮잠: 오후 3시 전에 끝난 15분 이상 (20분 목표, 기기 오차 감안)
            "C-02" -> byEndOfDay(
                a.naps.any { (s, e) -> e.toLocalTime() <= LocalTime.of(15, 30) && Duration.between(s, e).toMinutes() >= 15 },
            )

            // 취침·기상: 다음 날 아침 수면 기록이 들어와야 판단
            "S-01" -> night(a, now) { bed, usual -> minutesAfter(bed, usual) <= 30 }
            "S-06", "C-05" -> night(a, now) { bed, usual -> minutesAfter(bed, usual) <= -30 }
            "S-08" -> night(a, now) { _, _ ->
                a.recentBedtimes.size >= 7 && a.recentBedtimes.all { abs(minutesAfter(it, median(a.recentBedtimes))) <= 30 }
            }
            "S-07" -> weekendWake(a, now)

            // 앱 기록: 호흡 가이드, 물, 몸 상태 태그
            "R-01" -> byEndOfDay(a.breathing.isNotEmpty())
            "C-04" -> byEndOfDay(a.breathing.size >= 2)
            "S-04" -> byEndOfDay(a.breathing.any { it.toLocalTime() >= LocalTime.of(20, 0) })
            "R-08" -> byEndOfDay(
                a.breathing.any { it.hour < 11 } && a.breathing.any { it.hour in 11..16 } && a.breathing.any { it.hour >= 17 },
            )
            "C-07" -> byEndOfDay(a.waterCups >= WATER_CUPS)
            "C-08" -> byEndOfDay(a.tagged)

            else -> Check.MANUAL
        }
    }

    private fun night(a: DayActivity, now: LocalDateTime, ok: (LocalTime, LocalTime) -> Boolean): Check {
        val usual = a.usualBedtime ?: return Check.MANUAL
        val bed = a.nightBedtime ?: return if (now >= a.date.plusDays(1).atTime(14, 0)) Check.MISSED else Check.NOT_YET
        return if (ok(bed.toLocalTime(), usual)) Check.DONE else Check.MISSED
    }

    private fun weekendWake(a: DayActivity, now: LocalDateTime): Check {
        if (a.date.dayOfWeek != DayOfWeek.SATURDAY && a.date.dayOfWeek != DayOfWeek.SUNDAY) return Check.MANUAL
        val usual = a.usualWake ?: return Check.MANUAL
        val wake = a.morningWake ?: return if (now >= a.date.atTime(14, 0)) Check.MISSED else Check.NOT_YET
        return if (abs(minutesAfter(wake.toLocalTime(), usual)) <= 30) Check.DONE else Check.MISSED
    }

    /** [t]가 [ref]보다 몇 분 늦은지 (자정을 넘나드는 취침도 연속으로, −12~+12시간). */
    internal fun minutesAfter(t: LocalTime, ref: LocalTime): Int {
        val d = (t.toSecondOfDay() - ref.toSecondOfDay()) / 60
        return ((d + 720) % 1440 + 1440) % 1440 - 720
    }

    /** 정오 기준으로 정렬한 취침 시각의 중앙값. */
    fun median(times: List<LocalTime>): LocalTime {
        val sorted = times.sortedBy { (it.toSecondOfDay() / 60 + 720) % 1440 }
        return sorted[sorted.size / 2]
    }
}
