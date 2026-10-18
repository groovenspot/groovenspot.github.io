package com.groovenspot.cardiopacer.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.cardiopacer.sync.WorkoutRecord
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import org.junit.Rule
import org.junit.Test
import java.util.TimeZone

/** Phone screen with sample data, used as Google Play phone screenshots. */
class PhoneScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material.NoActionBar",
        useDeviceResolution = true,
    )

    private fun workout(daysAgo: Int, activity: String, minutes: Int, below: Int, target: Int, above: Int, avg: Double): WorkoutRecord {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"))
        val start = 1_792_000_000_000L - daysAgo * 86_400_000L // a fixed morning, so renders are stable
        return WorkoutRecord(
            startEpochMillis = start,
            endEpochMillis = start + minutes * 60_000L,
            activity = activity,
            summary = WorkoutSummary(
                durationMillis = minutes * 60_000L,
                zoneMillis = mapOf(
                    HeartRateZone.BELOW to below * 1_000L,
                    HeartRateZone.TARGET to target * 1_000L,
                    HeartRateZone.ABOVE to above * 1_000L,
                ),
                averageHeartRate = avg,
                range = ZoneRange(134, 147),
            ),
            savedToHealthConnect = true,
        )
    }

    @Test
    fun companion() = paparazzi.snapshot {
        PhoneTheme {
            CompanionContent(
                profile = ZoneProfile(age = 35, restingHeartRate = 60),
                history = listOf(
                    workout(0, "RUNNING", 45, 270, 2_224, 206, 138.0),
                    workout(2, "WALKING", 38, 610, 1_560, 110, 131.0),
                    workout(3, "CYCLING", 62, 300, 3_120, 300, 140.0),
                ),
                healthConnectAvailable = true,
                healthConnectGranted = true,
                onSaveProfile = {},
                onRequestHealthConnect = {},
            )
        }
    }
}
