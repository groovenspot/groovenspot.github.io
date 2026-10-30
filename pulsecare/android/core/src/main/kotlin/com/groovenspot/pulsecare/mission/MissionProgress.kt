package com.groovenspot.pulsecare.mission

/** 레벨은 일요일 주간 리포트에서만 바꿉니다 (기획서 14번 "난이도 레벨"). */
object MissionProgress {

    enum class LevelChange { SUGGEST_UP, DOWN, STAY }

    /**
     * [daily]는 최근 14일 완료 여부, 오래된 날부터. [metricImproved]는 이 목표와 연결된 지표가 좋아졌는지.
     * 올리기는 사용자에게 묻고(거절 가능), 내리기는 실패가 아니라 "리듬 되찾기"로 안내합니다.
     */
    fun weeklyLevel(level: Int, daily: List<Boolean>, metricImproved: Boolean): LevelChange {
        val last7 = daily.takeLast(7).count { it }
        val last14 = daily.takeLast(14).count { it }
        return when (level) {
            1 -> if (last7 >= 5) LevelChange.SUGGEST_UP else LevelChange.STAY
            2 -> when {
                last7 <= 3 -> LevelChange.DOWN
                last14 >= 10 && metricImproved -> LevelChange.SUGGEST_UP
                else -> LevelChange.STAY
            }
            else -> if (last7 <= 3) LevelChange.DOWN else LevelChange.STAY
        }
    }

    fun levelMessage(change: LevelChange): String? = when (change) {
        LevelChange.SUGGEST_UP -> "다음 주부터 조금 더 도전해 볼까요?"
        LevelChange.DOWN -> "이번 주는 가벼운 미션으로 리듬을 되찾아요"
        LevelChange.STAY -> null
    }

    /** 연속 일수가 아니라 한 주에 5일 이상 완료하면 주간 배지. */
    fun weeklyBadge(weekCompletions: List<Boolean>): Boolean = weekCompletions.count { it } >= 5

    /** 7일 연속 놓치면 목표를 바꿀지 묻는 카드를 홈에 띄웁니다. */
    fun suggestGoalChange(daily: List<Boolean>): Boolean = daily.size >= 7 && daily.takeLast(7).none { it }
}
