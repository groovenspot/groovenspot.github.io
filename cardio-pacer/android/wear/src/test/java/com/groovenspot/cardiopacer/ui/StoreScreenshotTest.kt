package com.groovenspot.cardiopacer.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalInspectionMode
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.cardiopacer.exercise.ActiveDurationCheckpoint
import com.groovenspot.cardiopacer.exercise.ExerciseUiState
import com.groovenspot.cardiopacer.exercise.Phase
import com.groovenspot.cardiopacer.exercise.WorkoutActivity
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import org.junit.Rule
import org.junit.Test

/**
 * Renders the real screens with sample data. Record with
 * `./gradlew recordPaparazziDebug`; images land in app/src/test/snapshots/images
 * and are used as Google Play screenshots.
 */
class StoreScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.WEAR_OS_SMALL_ROUND, theme = "android:Theme.DeviceDefault")

    private val range = ZoneRange(130, 145)

    private fun exercise(bpm: Double, zone: HeartRateZone) = ExerciseUiState(
        phase = Phase.RUNNING,
        range = range,
        heartRate = bpm,
        zone = zone,
        // Checkpoint taken "now", so the clock reads 12:45.
        checkpoint = ActiveDurationCheckpoint(activeMillis = 765_000, atEpochMillis = System.currentTimeMillis()),
    )

    // Inspection mode (as in IDE previews) makes ScalingLazyColumn show its items
    // on the first frame instead of waiting to scroll to its initial position.
    private fun shot(content: @Composable () -> Unit) = paparazzi.snapshot {
        CompositionLocalProvider(LocalInspectionMode provides true) { CardioPacerTheme(content) }
    }

    @Test
    fun zone2() = shot { MetricsPage(exercise(138.0, HeartRateZone.TARGET), onLongPress = {}) }

    @Test
    fun zone3() = shot { MetricsPage(exercise(158.0, HeartRateZone.ABOVE), onLongPress = {}) }

    @Test
    fun zone1() = shot { MetricsPage(exercise(118.0, HeartRateZone.BELOW), onLongPress = {}) }

    @Test
    fun summary() = shot {
        SummaryScreen(
            summary = WorkoutSummary(
                durationMillis = 2_712_000,
                zoneMillis = mapOf(
                    HeartRateZone.BELOW to 270_000L,
                    HeartRateZone.TARGET to 2_224_000L,
                    HeartRateZone.ABOVE to 218_000L,
                ),
                averageHeartRate = 138.0,
                range = range,
            ),
            onDone = {},
        )
    }

    @Test
    fun start() = shot {
        StartScreen(range = range, initialActivity = WorkoutActivity.RUNNING, error = null, onStart = {}, onOpenSettings = {})
    }

    @Test
    fun settings() = shot {
        SettingsScreen(initial = ZoneProfile(age = 35, restingHeartRate = 60), isOnboarding = true, onSave = {})
    }
}
