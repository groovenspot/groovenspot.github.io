package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource.DiagnosticRow
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.Metric
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Rule
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** 테스트 도구 화면 (예시 데이터). */
class DiagnosticsScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(screenHeight = 3600),
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    @Test
    fun testTools() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"))
        val t = Instant.parse("2027-06-15T22:10:00Z")
        val shealth = setOf("삼성 헬스")
        paparazzi.snapshot {
            PulseTheme {
                DiagnosticsContent(
                    d = Diagnostics(
                        healthConnectAvailable = true,
                        backgroundSupported = true,
                        backgroundGranted = false,
                        notificationsAllowed = true,
                        rows = listOf(
                            DiagnosticRow("수면", true, 30, t, shealth),
                            DiagnosticRow("HRV", true, 412, t, shealth),
                            DiagnosticRow("안정시 심박", true, 0, null, emptySet()),
                            DiagnosticRow("걸음", true, 960, t, shealth),
                            DiagnosticRow("산소포화도", false, 0, null, emptySet()),
                        ),
                        home = HomeState(
                            date = LocalDate.of(2027, 6, 16),
                            dayIndex = 12,
                            score = ScoreResult(
                                ScoreResult.Kind.FULL, 72, Band.GOOD, "자율신경이 평소보다 잘 회복됐어요",
                                subScores = mapOf(Metric.SLEEP_DURATION to 68.9, Metric.HRV to 81.2, Metric.REGULARITY to 70.4),
                            ),
                            mission = MissionLibrary["W-01"],
                            missionDone = false,
                            missionCheck = Check.NOT_YET,
                            canSwap = true,
                            alerts = emptyList(),
                        ),
                        nextMorning = Instant.parse("2027-06-16T22:30:00Z").toEpochMilli(),
                        nextEvening = null,
                    ),
                    onRunMorning = {}, onRunEvening = {}, onRunWeekly = {}, onReload = {}, onBack = {},
                )
            }
        }
    }
}
