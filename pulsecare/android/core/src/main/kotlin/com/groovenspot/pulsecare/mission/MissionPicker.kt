package com.groovenspot.pulsecare.mission

import com.groovenspot.pulsecare.score.Metric
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.random.Random

/** 지난 미션 기록 한 줄. [auto]는 직접 체크하지 않고 워치 기록으로 완료를 확인한 날. */
data class MissionLog(val date: LocalDate, val missionId: String, val completed: Boolean, val auto: Boolean = false)

data class PickInput(
    val date: LocalDate,
    /** 오늘 컨디션 점수. 점수를 못 낸 날(워치 미착용)은 null: 목표 미션을 레벨 그대로 줍니다. */
    val score: Int?,
    /** 오늘 점수를 가장 크게 끌어내린 요인 (이유 한 줄의 지표). */
    val reasonMetric: Metric?,
    val goal: Goal,
    /** 목표별로 따로 관리하는 현재 레벨, 1~3. */
    val level: Int,
    val history: List<MissionLog> = emptyList(),
    val badWeather: Boolean = false,
    val seniorMode: Boolean = false,
    /** "다른 미션"으로 바꿀 때 지금 미션을 뺍니다. */
    val exclude: Set<String> = emptySet(),
)

/**
 * 오늘의 미션 고르기 (기획서 14번):
 * 구간 필터 → 레벨 필터 → 이유 연결 가산 → 반복 방지 → 일정 확인 → 선택 (20%는 새 미션).
 */
class MissionPicker(private val random: Random = Random.Default) {

    fun pick(input: PickInput): Mission {
        val lowDay = input.score != null && input.score < 50
        val pool = if (lowDay) MissionLibrary.of(Goal.LOW_DAY) else MissionLibrary.of(input.goal)

        // 50~69점인 날은 한 레벨 낮춰서. 3일 연속 놓쳤으면 가장 쉬운 레벨 1을 하루 끼워 넣습니다.
        var maxLevel = input.level.coerceIn(1, 3)
        if (input.score != null && input.score in 50..69) maxLevel -= 1
        if (missedDaysInRow(input) >= 3) maxLevel = 1
        maxLevel = maxLevel.coerceAtLeast(1)

        val byLevel = pool.filter { it.level <= maxLevel }
            .filter { !input.seniorMode || it.seniorFriendly }
            .filter { it.id !in input.exclude }

        val recent = input.history
            .filter { ChronoUnit.DAYS.between(it.date, input.date) in 1..3 }
            .map { it.missionId }
            .toSet()
        val missedTwice = missedTwiceInARow(input.history)
        val weekend = input.date.dayOfWeek == DayOfWeek.SATURDAY || input.date.dayOfWeek == DayOfWeek.SUNDAY

        val fresh = byLevel
            .filter { it.id !in recent && it.id !in missedTwice }
            .filter { !it.weekendOnly || weekend }
            .filter { !it.outdoor || !input.badWeather }

        // 다 걸러지면 반복 방지부터 풀고, 그래도 없으면 레벨 1 공통 미션으로.
        val candidates = fresh.ifEmpty {
            byLevel.filter { (!it.weekendOnly || weekend) && (!it.outdoor || !input.badWeather) }
        }.ifEmpty {
            MissionLibrary.of(Goal.LOW_DAY).filter { it.id !in input.exclude && !(it.outdoor && input.badWeather) }
        }

        val neverShown = candidates.filter { c -> input.history.none { it.missionId == c.id } }
        if (neverShown.isNotEmpty() && random.nextDouble() < NEW_MISSION_RATE) {
            return neverShown[random.nextInt(neverShown.size)]
        }
        return candidates.maxWith(compareBy<Mission> { rank(it, input) }.thenBy { it.id.reversed() })
    }

    /** 이유 연결 가산점 + 과거 완료율 (기록이 없으면 0.5). */
    private fun rank(mission: Mission, input: PickInput): Double {
        val linkBonus = if (input.reasonMetric != null && input.reasonMetric in mission.linked) 1.0 else 0.0
        val logs = input.history.filter { it.missionId == mission.id }
        val completion = if (logs.isEmpty()) 0.5 else logs.count { it.completed }.toDouble() / logs.size
        return linkBonus + completion
    }

    private fun missedDaysInRow(input: PickInput): Int =
        input.history.sortedByDescending { it.date }.takeWhile { !it.completed }.size

    /** 최근 두 번 연달아 놓친 미션. */
    private fun missedTwiceInARow(history: List<MissionLog>): Set<String> =
        history.groupBy { it.missionId }
            .filterValues { logs -> logs.sortedByDescending { it.date }.take(2).let { it.size == 2 && it.none { l -> l.completed } } }
            .keys

    companion object {
        const val NEW_MISSION_RATE = 0.2
    }
}
