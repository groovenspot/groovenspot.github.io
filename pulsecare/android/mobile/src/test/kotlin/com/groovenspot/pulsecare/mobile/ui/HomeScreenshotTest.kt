package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionProgress
import com.groovenspot.pulsecare.report.WeeklySummary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Badge
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.Cap
import com.groovenspot.pulsecare.score.Metric
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate

/** 홈 화면을 예시 데이터로 그립니다 (화면 확인용, 스토어 스크린샷 후보). 수치는 예시입니다. */
class HomeScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    private val date = LocalDate.of(2027, 6, 16)

    private fun render(state: HomeState, weekly: WeeklySummary? = null) = paparazzi.snapshot {
        PulseTheme { HomeContent(state, onCompleteMission = {}, onSwapMission = {}, onFeeling = {}, onOpenPermissions = {}, weekly = weekly) }
    }

    @Test
    fun sundayWeeklyReport() = render(
        HomeState(
            date = date,
            dayIndex = 40,
            score = ScoreResult(kind = ScoreResult.Kind.FULL, score = 74, band = Band.GOOD, reason = "요즘 일정한 시간에 잠들고 있어요"),
            mission = MissionLibrary["S-05"],
            missionDone = true,
            canSwap = false,
            alerts = emptyList(),
        ),
        weekly = WeeklySummary(
            weekEnd = date,
            goal = Goal.SLEEP,
            daysDone = 5,
            badge = true,
            points = 70,
            levelChange = MissionProgress.LevelChange.SUGGEST_UP,
            nextLevel = 2,
            change = "4주 전보다 평균 수면이 22분 늘었어요",
            suggestGoalChange = false,
        ),
    )

    @Test
    fun goodMorning() = render(
        HomeState(
            date = date,
            dayIndex = 40,
            score = ScoreResult(
                kind = ScoreResult.Kind.FULL,
                score = 78,
                band = Band.GOOD,
                reason = "자율신경이 평소보다 잘 회복됐어요",
                reasonMetric = Metric.HRV,
            ),
            mission = MissionLibrary["S-03"],
            missionDone = false,
            missionCheck = Check.NOT_YET,
            canSwap = true,
            alerts = emptyList(),
        ),
    )

    @Test
    fun shortSleepWithAlert() = render(
        HomeState(
            date = date,
            dayIndex = 40,
            score = ScoreResult(
                kind = ScoreResult.Kind.FULL,
                score = 48,
                band = Band.LOW,
                reason = "어젯밤 수면이 필요량보다 1시간 10분 짧았어요",
                badges = setOf(Badge.ESTIMATED),
                reasonMetric = Metric.SLEEP_DURATION,
            ),
            mission = MissionLibrary["C-05"],
            missionDone = false,
            missionCheck = Check.NOT_YET,
            canSwap = false,
            alerts = listOf(AlertText.forSelf(Detection(Signal.SLEEP_DEBT, usual = 450.0, current = 385.0, days = 4))),
            missingPermissions = true,
        ),
    )

    /** 주의 알림 두 개: 하나는 응답 버튼, 하나는 두 번 틀렸다고 해서 7일 쉬기 제안. */
    @Test
    fun cautionAlertsWithFeedback() {
        val rhr = Detection(Signal.RESTING_HR_RISE, usual = 62.0, current = 70.0, days = 3)
        val steps = Detection(Signal.ACTIVITY_DROP, usual = 8000.0, current = 3600.0, days = 3)
        val state = HomeState(
            date = date,
            dayIndex = 40,
            score = ScoreResult(ScoreResult.Kind.FULL, 58, Band.FAIR, "자율신경 회복이 평소보다 더뎌요", cap = Cap.CAUTION_SIGNAL),
            mission = MissionLibrary["C-03"],
            missionDone = false,
            missionCheck = Check.NOT_YET,
            canSwap = true,
            alerts = listOf(AlertText.forSelf(rhr), AlertText.forSelf(steps)),
            alertDetections = listOf(rhr, steps),
        )
        paparazzi.snapshot {
            PulseTheme {
                HomeContent(
                    state, onCompleteMission = {}, onSwapMission = {}, onFeeling = {}, onOpenPermissions = {},
                    snoozeSuggestions = setOf(Signal.ACTIVITY_DROP),
                )
            }
        }
    }

    @Test
    fun learningDayTwo() = render(
        HomeState(
            date = date,
            dayIndex = 2,
            score = ScoreResult(
                kind = ScoreResult.Kind.SLEEP_ONLY,
                score = 70,
                band = Band.GOOD,
                reason = "어젯밤 필요한 만큼 잤어요",
                badges = setOf(Badge.LEARNING),
            ),
            mission = MissionLibrary["S-01"],
            missionDone = true,
            canSwap = false,
            alerts = emptyList(),
        ),
    )

    @Test
    fun noWatchLastNight() = render(
        HomeState(
            date = date,
            dayIndex = 40,
            score = ScoreResult(kind = ScoreResult.Kind.NO_DATA, score = null, band = null, reason = "어젯밤 기록이 없어요. 오늘 컨디션은 어떤가요?"),
            mission = MissionLibrary["S-04"],
            missionDone = false,
            canSwap = true,
            alerts = emptyList(),
        ),
    )
}
