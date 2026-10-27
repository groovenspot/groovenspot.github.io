package com.groovenspot.pulsecare.mobile.today

import com.groovenspot.pulsecare.alert.AlertMessage
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.DailySignals
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.DayActivity
import com.groovenspot.pulsecare.mission.Mission
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionPicker
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.mission.PickInput
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.data.TodayMission
import com.groovenspot.pulsecare.score.ConditionScoreEngine
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.ScoreContext
import com.groovenspot.pulsecare.score.ScoreResult
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

/** 홈 화면 한 장 (기획서 16번: 점수 → 미션 → 알림 순서). */
data class HomeState(
    val date: LocalDate,
    /** 가입일 = 1일차. */
    val dayIndex: Int,
    val score: ScoreResult,
    val mission: Mission,
    val missionDone: Boolean,
    /** 워치 기록으로 본 미션 상태. [Check.MANUAL]이면 직접 체크. */
    val missionCheck: Check = Check.MANUAL,
    val canSwap: Boolean,
    /** 본인에게 보여줄 알림 카드. 오늘 감지된 신호만. */
    val alerts: List<AlertMessage>,
    /** [alerts]의 원래 신호 (알림 발송 규칙에 씁니다). */
    val alertDetections: List<Detection> = emptyList(),
    /** 수면 외 권한 일부가 꺼져 있음 (SYS-03). */
    val missingPermissions: Boolean = false,
) {
    /** 첫 7일은 기준선 학습 중 (SYS-01). */
    val learning: Boolean get() = dayIndex <= 7
}

/** 저장할 것: 오늘 점수와 오늘 미션, 어제까지 미션 기록. */
data class Plan(
    val home: HomeState,
    val today: TodayMission,
    val logs: List<MissionLog>,
    val scores: Map<LocalDate, Int>,
)

/**
 * 하루 계획을 만듭니다. 화면과 저장소에서 분리해 기기 없이 테스트합니다.
 * 같은 날 다시 열면 같은 점수와 같은 미션이 나옵니다.
 */
class TodayPlanner(private val picker: MissionPicker = MissionPicker()) {

    /**
     * [records]는 기상일 기준 최근 29일 이상 (오늘 포함). [feeling]은 워치 기록이 없는 날의 자가 입력 1~5 (SYS-02).
     */
    fun plan(
        today: LocalDate,
        records: List<DailyRecord>,
        profile: Profile,
        stored: TodayMission?,
        logs: List<MissionLog>,
        scores: Map<LocalDate, Int>,
        feeling: Int? = null,
        missingPermissions: Boolean = false,
        /** 미션 날짜별 워치 활동 (어제·오늘). 없으면 자동 확인을 하지 않습니다. */
        activities: Map<LocalDate, DayActivity> = emptyMap(),
        now: LocalDateTime = today.atTime(12, 0),
    ): Plan {
        val dayIndex = (ChronoUnit.DAYS.between(profile.signupDate, today) + 1).toInt().coerceAtLeast(1)
        val withScores = records.map { it.copy(score = scores[it.date]) }
        val todayRecord = withScores.firstOrNull { it.date == today } ?: DailyRecord(today, sleep = null)
        val history = withScores.filter { it.date < today }

        val signals = DailySignals.evaluate(withScores.filter { it.date <= today }, dayIndex)
        val caution = signals.any { it.signal.grade == Grade.CAUTION }
        val score = ConditionScoreEngine.score(todayRecord, history, ScoreContext(dayIndex, cautionSignalActive = caution))

        // 어제까지의 오늘 미션을 기록으로 옮깁니다. 직접 체크하지 않았어도 워치 기록(어젯밤 취침 포함)으로 완료를 확인합니다.
        val allLogs = if (stored != null && stored.date < today && logs.none { it.date == stored.date }) {
            val verified = check(stored.missionId, activities[stored.date], now) == Check.DONE
            logs + MissionLog(stored.date, stored.missionId, stored.completed || verified)
        } else {
            logs
        }

        val picked = stored?.takeIf { it.date == today } ?: TodayMission(
            date = today,
            missionId = picker.pick(pickInput(today, score, feeling, profile, allLogs)).id,
        )
        val missionCheck = check(picked.missionId, activities[today], now)
        val todayMission = if (missionCheck == Check.DONE) picked.copy(completed = true) else picked

        val newScores = score.score?.let { scores + (today to it) } ?: scores
        return Plan(
            home = HomeState(
                date = today,
                dayIndex = dayIndex,
                score = score,
                mission = MissionLibrary[todayMission.missionId],
                missionDone = todayMission.completed,
                missionCheck = missionCheck,
                canSwap = !todayMission.swapped && !todayMission.completed,
                alerts = signals.map { AlertText.forSelf(it) },
                alertDetections = signals,
                missingPermissions = missingPermissions,
            ),
            today = todayMission,
            logs = allLogs.filter { it.date < today },
            scores = newScores,
        )
    }

    private fun check(missionId: String, activity: DayActivity?, now: LocalDateTime): Check =
        if (activity == null) Check.MANUAL else MissionVerifier.check(missionId, activity, now)

    /** "다른 미션": 하루 1번, 지금 미션을 빼고 다음 후보로. */
    fun swap(home: HomeState, today: TodayMission, profile: Profile, logs: List<MissionLog>): TodayMission {
        if (today.swapped || today.completed) return today
        val input = pickInput(home.date, home.score, null, profile, logs).copy(exclude = setOf(today.missionId))
        return today.copy(missionId = picker.pick(input).id, swapped = true)
    }

    private fun pickInput(today: LocalDate, score: ScoreResult, feeling: Int?, profile: Profile, logs: List<MissionLog>) =
        PickInput(
            date = today,
            score = score.score ?: feeling?.let { FEELING_TO_SCORE[it] },
            reasonMetric = score.reasonMetric,
            goal = profile.goal,
            level = profile.level,
            history = logs,
            seniorMode = profile.seniorMode,
        )

    companion object {
        /** 자가 입력 1~5를 미션 고르기용 점수 구간으로: 1·2는 컨디션 낮은 날, 3은 한 레벨 낮춤. */
        val FEELING_TO_SCORE = mapOf(1 to 20, 2 to 40, 3 to 60, 4 to 75, 5 to 90)
    }
}
