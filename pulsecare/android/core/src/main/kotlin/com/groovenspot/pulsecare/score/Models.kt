package com.groovenspot.pulsecare.score

import java.time.LocalDate
import java.time.LocalTime

/** 컨디션 점수를 이루는 8개 지표와 가중치 (기획서 13번 "점수 구성"). */
enum class Metric(val weight: Double, val group: Group) {
    SLEEP_DURATION(0.15, Group.SLEEP),
    SLEEP_QUALITY(0.10, Group.SLEEP),
    REGULARITY(0.10, Group.SLEEP),
    HRV(0.25, Group.RECOVERY),
    RESTING_HR(0.15, Group.RECOVERY),
    ACTIVITY_LOAD(0.15, Group.LOAD),
    SKIN_TEMP(0.05, Group.AUXILIARY),
    RESPIRATORY_RATE(0.05, Group.AUXILIARY),
    ;

    enum class Group { SLEEP, RECOVERY, LOAD, AUXILIARY }
}

/** 사용자가 남기는 하루 태그. 그날 점수에는 반영하고 기준선 계산에서는 뺍니다. */
enum class DayTag { SICK, ALCOHOL, OVERTIME }

/** 지난밤 수면. 가장 긴 블록이 본 수면이고, 낮잠은 수면 시간에만 최대 1시간 더합니다. */
data class SleepSummary(
    val mainSleepMinutes: Int,
    val napMinutes: Int = 0,
    /** 침대에 있던 시간 중 실제로 잔 비율, 0~1. */
    val efficiency: Double? = null,
    /** 깊은 잠 비율, 0~1. */
    val deepRatio: Double? = null,
    val bedtime: LocalTime? = null,
)

/**
 * 하루치 기록. [date]는 아침(기상) 날짜이고, 수면·생체 신호는 그 전날 밤 값입니다.
 * 기기가 주지 않는 값은 null로 둡니다.
 */
data class DailyRecord(
    val date: LocalDate,
    /** null이면 밤에 워치를 차지 않은 날입니다. */
    val sleep: SleepSummary?,
    /** 수면 중 RMSSD, ms. */
    val hrvMs: Double? = null,
    /** 수면 중 최저 구간 심박, bpm. */
    val restingHr: Double? = null,
    val skinTempC: Double? = null,
    val respiratoryRate: Double? = null,
    /** 그날 하루 활동 부하 (기기별 단위, 같은 기기 안에서만 비교). */
    val activityLoad: Double? = null,
    /** 그날 걸음 수. 알림 신호 "활동량 급감"에 씁니다. */
    val steps: Int? = null,
    /** 지난밤 SpO2 90% 미만 구간이 반복됐는지. 측정하지 않는 기기는 null. */
    val lowSpo2Repeated: Boolean? = null,
    val tags: Set<DayTag> = emptySet(),
    /** 그날 아침 보여준 점수. 수면 필요량(컨디션 좋았던 날의 수면 중앙값)을 구할 때 씁니다. */
    val score: Int? = null,
)

/** 연령·성별 표준값. 가입 4~27일차에 개인 기준선이 덜 쌓였을 때 섞어 씁니다. */
data class PopulationNorms(
    val hrvMedian: Double,
    val hrvMad: Double,
    val restingHrMedian: Double,
    val restingHrMad: Double,
)

data class ScoreContext(
    /** 가입일이 1일차입니다. */
    val dayIndex: Int,
    /** 알림 정책(12번)의 주의 등급 신호가 켜져 있는지. */
    val cautionSignalActive: Boolean = false,
    /** 워치를 바꾼 지 며칠 됐는지 (바꾼 날 = 0). */
    val daysSinceDeviceChange: Int? = null,
    /** 시간대가 바뀐 지 며칠 됐는지 (바뀐 날 = 0). */
    val daysSinceTimezoneChange: Int? = null,
    val norms: PopulationNorms? = null,
)

enum class Band(val label: String, val meaning: String, val advice: String) {
    PEAK("최상", "평소보다 확실히 잘 회복됨", "강도 높은 운동에 좋은 날"),
    GOOD("좋음", "평소 수준 이상", "평소 계획대로"),
    FAIR("보통", "평소보다 조금 부족", "가벼운 활동, 30분 일찍 자기"),
    LOW("낮음", "회복이 더디거나 부담이 쌓임", "강한 운동 대신 휴식·산책"),
    VERY_LOW("매우 낮음", "크게 지친 상태", "휴식, 여러 날 이어지면 전문가 상담"),
    ;

    companion object {
        fun of(score: Int): Band = when {
            score >= 85 -> PEAK
            score >= 70 -> GOOD
            score >= 50 -> FAIR
            score >= 30 -> LOW
            else -> VERY_LOW
        }
    }
}

enum class Badge(val label: String) {
    LEARNING("학습 중"),
    ESTIMATED("추정"),
    RELEARNING("재학습 중"),
    JET_LAG("시차 적응 중"),
}

/** 상한 보정. 가중합이 높아도 명백한 문제가 있으면 점수를 누릅니다. */
enum class Cap(val max: Int) {
    SHORT_SLEEP(50),
    SICK(50),
    CAUTION_SIGNAL(60),
    NO_RECOVERY_DATA(80),
}

data class ScoreResult(
    val kind: Kind,
    /** [Kind.NO_DATA]면 null. */
    val score: Int?,
    val band: Band?,
    /** 이유 한 줄. */
    val reason: String,
    val badges: Set<Badge> = emptySet(),
    val subScores: Map<Metric, Double> = emptyMap(),
    /** 실제로 점수를 누른 상한. */
    val cap: Cap? = null,
    /** 이유 한 줄을 고른 지표. 상한이나 태그가 이유면 null. */
    val reasonMetric: Metric? = null,
) {
    enum class Kind {
        /** 8개 지표 중 측정된 것으로 계산한 컨디션 점수. */
        FULL,

        /** 가입 1~3일차: 기준선이 없어 수면 점수만. */
        SLEEP_ONLY,

        /** 밤에 워치를 차지 않아 점수를 내지 않음. 느낌 입력을 받습니다. */
        NO_DATA,
    }
}
