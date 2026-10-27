package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Badge
import com.groovenspot.pulsecare.score.Band
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

    private fun render(state: HomeState) = paparazzi.snapshot {
        PulseTheme { HomeContent(state, onCompleteMission = {}, onSwapMission = {}, onFeeling = {}, onOpenPermissions = {}) }
    }

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
