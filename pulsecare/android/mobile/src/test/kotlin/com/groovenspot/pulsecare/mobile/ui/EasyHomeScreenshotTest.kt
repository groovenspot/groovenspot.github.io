package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate

/** 쉽게 보기 홈 (글자 1.25배). 예시 데이터. */
class EasyHomeScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(fontScale = 1.25f, screenHeight = 3400),
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    private val date = LocalDate.of(2027, 6, 16)
    private val rhr = Detection(Signal.RESTING_HR_RISE, usual = 62.0, current = 73.0, days = 3)

    @Test
    fun scoreMissionAndAlert() = paparazzi.snapshot {
        PulseTheme {
            EasyHomeContent(
                state = HomeState(
                    date = date,
                    dayIndex = 60,
                    score = ScoreResult(ScoreResult.Kind.FULL, 58, Band.FAIR, "어젯밤 회복이 평소보다 더뎌요"),
                    mission = MissionLibrary["C-03"],
                    missionDone = false,
                    missionCheck = Check.NOT_YET,
                    canSwap = false,
                    alerts = listOf(AlertText.forSelf(rhr)),
                    alertDetections = listOf(rhr),
                ),
                onCompleteMission = {}, onFeeling = {}, guardian = "민지" to "01011112222", onCall = {}, onSos = {},
            )
        }
    }

    @Test
    fun noWatchLastNight() = paparazzi.snapshot {
        PulseTheme {
            EasyHomeContent(
                state = HomeState(
                    date = date,
                    dayIndex = 60,
                    score = ScoreResult(ScoreResult.Kind.NO_DATA, null, null, "어젯밤 기록이 없어요"),
                    mission = MissionLibrary["C-03"],
                    missionDone = true,
                    canSwap = false,
                    alerts = emptyList(),
                ),
                onCompleteMission = {}, onFeeling = {}, guardian = null, onCall = {}, onSos = {},
            )
        }
    }

    @Test
    fun sosSent() = paparazzi.snapshot {
        PulseTheme {
            PhoneSosDialog(
                PhoneSos.Done("보호자 2명에게 알렸어요", "괜찮으면 휴대폰 알림에서 취소해 주세요.", "e1"),
                onSend = {}, onCancel = {}, onCancelSent = {}, onCall119 = {},
            )
        }
    }
}
