package com.groovenspot.pulsecare.report

import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionProgress
import com.groovenspot.pulsecare.mission.MissionProgress.LevelChange
import com.groovenspot.pulsecare.score.ConditionScoreEngine
import com.groovenspot.pulsecare.score.DailyRecord
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

data class WeeklySummary(
    /** 이번 주 마지막 날 (일요일). */
    val weekEnd: LocalDate,
    val goal: Goal,
    /** 이번 주 미션을 완료한 날 수 (0~7). */
    val daysDone: Int,
    /** 한 주 5일 이상 완료하면 주간 배지 (연속이 아니라 "주 5일"). */
    val badge: Boolean,
    val points: Int,
    val levelChange: LevelChange,
    /** 레벨을 올릴 때 다음 레벨 (사용자가 수락해야 적용). */
    val nextLevel: Int,
    /** 같은 목표 4주 이상이면 실제 변화 한 줄. "평균 수면이 22분 늘었어요". */
    val change: String?,
    /** 7일 연속 놓쳤으면 목표를 바꿀지 묻습니다. */
    val suggestGoalChange: Boolean,
) {
    val title: String get() = if (badge) "이번 주 ${daysDone}일 완료 · 주간 배지" else "이번 주 ${daysDone}일 완료"

    /** 리포트 본문. 놓친 주에도 탓하지 않습니다 (기획서 14번 "놓쳤을 때와 보상"). */
    val lines: List<String>
        get() = listOfNotNull(
            change,
            "이번 주 포인트 ${points}점",
            MissionProgress.levelMessage(levelChange),
            if (suggestGoalChange) "일주일 동안 미션이 잘 맞지 않았어요. 목표를 바꿔 볼까요?" else null,
        )
}

/**
 * 일요일 저녁 주간 리포트 (기획서 14번 "난이도 레벨", "보상").
 * 레벨은 여기서만 바꿔 매일 흔들리지 않게 합니다.
 */
object WeeklyReport {

    private const val CHANGE_REPORT_DAYS = 28L

    fun build(
        weekEnd: LocalDate,
        goal: Goal,
        level: Int,
        /** 이 목표를 고른 날. 4주가 지나야 변화 리포트를 보여줍니다. */
        goalSince: LocalDate,
        logs: List<MissionLog>,
        records: List<DailyRecord>,
    ): WeeklySummary {
        val last14 = (13 downTo 0).map { ago -> logs.any { it.date == weekEnd.minusDays(ago.toLong()) && it.completed } }
        val thisWeek = logs.filter { ChronoUnit.DAYS.between(it.date, weekEnd) in 0..6 && it.completed }
        val daysDone = thisWeek.map { it.date }.distinct().size

        val now = average(goal, records, weekEnd, 0)
        val lastWeek = average(goal, records, weekEnd, 7)
        val improved = now != null && lastWeek != null && better(goal, now, lastWeek)
        val change = MissionProgress.weeklyLevel(level, last14, improved)

        val heldFourWeeks = ChronoUnit.DAYS.between(goalSince, weekEnd) >= CHANGE_REPORT_DAYS
        val fourWeeksAgo = average(goal, records, weekEnd, CHANGE_REPORT_DAYS)

        return WeeklySummary(
            weekEnd = weekEnd,
            goal = goal,
            daysDone = daysDone,
            badge = MissionProgress.weeklyBadge(last14.takeLast(7)),
            points = thisWeek.sumOf { MissionLibrary[it.missionId].points },
            levelChange = change,
            nextLevel = when (change) {
                LevelChange.SUGGEST_UP -> (level + 1).coerceAtMost(3)
                LevelChange.DOWN -> (level - 1).coerceAtLeast(1)
                LevelChange.STAY -> level
            },
            change = if (heldFourWeeks && now != null && fourWeeksAgo != null) changeLine(goal, now, fourWeeksAgo) else null,
            suggestGoalChange = MissionProgress.suggestGoalChange(last14),
        )
    }

    /** 목표와 연결된 지표의 7일 평균. [offset]일 앞으로 당긴 7일. 4일 이상 기록이 있어야 계산합니다. */
    internal fun average(goal: Goal, records: List<DailyRecord>, weekEnd: LocalDate, offset: Long): Double? {
        val end = weekEnd.minusDays(offset)
        val week = records.filter { ChronoUnit.DAYS.between(it.date, end) in 0..6 }
        val values = when (goal) {
            Goal.SLEEP -> week.mapNotNull { r -> r.sleep?.let { ConditionScoreEngine.totalSleepMinutes(it).toDouble() } }
            // 기록의 걸음은 전날 하루 값이라 하루 뒤 기록을 봅니다.
            Goal.WEIGHT -> records.filter { ChronoUnit.DAYS.between(it.date, end.plusDays(1)) in 0..6 }.mapNotNull { it.steps?.toDouble() }
            Goal.STRESS -> week.mapNotNull { it.hrvMs }
            Goal.PARENT, Goal.LOW_DAY -> emptyList()
        }
        return if (values.size >= 4) values.average() else null
    }

    private fun better(goal: Goal, now: Double, before: Double): Boolean = when (goal) {
        Goal.SLEEP -> now - before >= 10 // 10분 이상
        Goal.WEIGHT -> now - before >= 500 // 500보 이상
        Goal.STRESS -> now - before >= 2 // 2ms 이상
        Goal.PARENT, Goal.LOW_DAY -> false
    }

    internal fun changeLine(goal: Goal, now: Double, before: Double): String? {
        val diff = now - before
        return when (goal) {
            Goal.SLEEP -> {
                val m = abs(diff).roundToInt()
                when {
                    m < 5 -> "4주 전과 비슷하게 잘 자고 있어요"
                    diff > 0 -> "4주 전보다 평균 수면이 ${m}분 늘었어요"
                    else -> "4주 전보다 평균 수면이 ${m}분 줄었어요. 이번 주는 조금 일찍 누워 봐요"
                }
            }
            Goal.WEIGHT -> {
                val steps = (abs(diff) / 100).roundToInt() * 100
                when {
                    steps < 300 -> "4주 전과 비슷하게 걷고 있어요"
                    diff > 0 -> "4주 전보다 하루 걸음이 평균 ${String.format(Locale.ROOT, "%,d", steps)}보 늘었어요"
                    else -> "4주 전보다 하루 걸음이 평균 ${String.format(Locale.ROOT, "%,d", steps)}보 줄었어요"
                }
            }
            Goal.STRESS -> {
                val ms = abs(diff).roundToInt()
                when {
                    ms < 2 -> "4주 전과 비슷하게 회복하고 있어요"
                    diff > 0 -> "4주 전보다 HRV가 평균 ${ms}ms 높아졌어요. 회복이 좋아지고 있어요"
                    else -> "4주 전보다 HRV가 평균 ${ms}ms 낮아졌어요. 쉬는 시간을 조금 늘려 봐요"
                }
            }
            Goal.PARENT, Goal.LOW_DAY -> null
        }
    }
}
