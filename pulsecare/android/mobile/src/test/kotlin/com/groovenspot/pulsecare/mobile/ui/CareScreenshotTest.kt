package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.care.Medication
import com.groovenspot.pulsecare.care.Medications
import com.groovenspot.pulsecare.care.DoseLog
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

/** 생활 도우미 화면: 호흡 가이드, 홈의 물·약·몸 상태 카드, 약 관리. 수치는 예시입니다. */
class CareScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    private val date = LocalDate.of(2027, 6, 16)
    private val meds = listOf(
        Medication("m1", "혈압약", listOf(LocalTime.of(8, 0), LocalTime.of(20, 0))),
        Medication("m2", "비타민", listOf(LocalTime.of(13, 0))),
    )

    @Test
    fun breathingExhale() = paparazzi.snapshot {
        PulseTheme { BreathingContent(elapsed = 17.0, running = true, finished = false, todayCount = 0, onStart = {}, onClose = {}) }
    }

    @Test
    fun breathingDone() = paparazzi.snapshot {
        PulseTheme { BreathingContent(elapsed = 60.0, running = false, finished = true, todayCount = 2, onStart = {}, onClose = {}) }
    }

    @Test
    fun homeWithCareCards() {
        val now = date.atTime(14, 0)
        val doses = Medications.today(meds, listOf(DoseLog(date, "m1", LocalTime.of(8, 0), date.atTime(8, 5))), now)
        paparazzi.snapshot {
            PulseTheme {
                HomeContent(
                    HomeState(
                        date = date,
                        dayIndex = 40,
                        score = ScoreResult(kind = ScoreResult.Kind.FULL, score = 63, band = Band.FAIR, reason = "어제 술을 마셨다고 기록하셨어요. 자율신경 회복이 평소보다 더뎌요"),
                        mission = MissionLibrary["C-07"],
                        missionDone = false,
                        canSwap = true,
                        alerts = emptyList(),
                    ),
                    onCompleteMission = {}, onSwapMission = {}, onFeeling = {}, onOpenPermissions = {},
                    care = HomeCare(tags = null, water = 3, doses = doses, now = now.toLocalTime()),
                    onBreathing = {},
                )
            }
        }
    }

    @Test
    fun breathingMission() = paparazzi.snapshot {
        PulseTheme {
            HomeContent(
                HomeState(
                    date = date,
                    dayIndex = 40,
                    score = ScoreResult(kind = ScoreResult.Kind.FULL, score = 72, band = Band.GOOD, reason = "자율신경이 평소보다 잘 회복됐어요"),
                    mission = MissionLibrary["R-01"],
                    missionDone = false,
                    canSwap = true,
                    alerts = emptyList(),
                ),
                onCompleteMission = {}, onSwapMission = {}, onFeeling = {}, onOpenPermissions = {},
                care = HomeCare(tags = emptySet(), water = 0, doses = emptyList(), now = LocalTime.of(9, 0)),
                onBreathing = {},
            )
        }
    }

    @Test
    fun medications() = paparazzi.snapshot {
        PulseTheme { MedicationsScreen(meds, onSave = {}, onBack = {}) }
    }
}
