package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mobile.data.NotificationSettings
import com.groovenspot.pulsecare.mobile.data.Profile
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class SettingsTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(screenHeight = 4200),
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    @Test
    fun settingsScreen() = paparazzi.snapshot {
        PulseTheme {
            SettingsContent(
                profile = Profile(Goal.SLEEP, LocalDate.of(2027, 6, 1), levels = mapOf(Goal.SLEEP to 2)),
                settings = NotificationSettings(morningTime = LocalTime.of(6, 45), disabledSignals = setOf(Signal.LOW_SPO2)),
                onSettings = {},
                onSeniorMode = {},
                onChangeGoal = {},
                onPermissions = {},
                onClearData = {},
                onBack = {},
            )
        }
    }

    @Test
    fun settingsRoundTrip() {
        val s = NotificationSettings(
            morningEnabled = false,
            morningTime = LocalTime.of(6, 45),
            eveningTime = LocalTime.of(22, 15),
            quietStart = LocalTime.of(22, 30),
            disabledSignals = setOf(Signal.STRESS, Signal.SLEEP_DEBT),
        )
        assertEquals(s, NotificationSettings.decode(NotificationSettings.encode(s)))
        assertEquals(NotificationSettings(), NotificationSettings.decode("{}"))
    }

    @Test
    fun emergencyCannotBeTurnedOff() {
        val s = NotificationSettings(disabledSignals = setOf(Signal.FALL, Signal.STRESS))
        assertTrue(s.allows(Signal.FALL))
        assertFalse(s.allows(Signal.STRESS))
    }

    @Test
    fun koreanTimeLabels() {
        assertEquals("오전 7:30", timeLabel(LocalTime.of(7, 30)))
        assertEquals("오후 9:00", timeLabel(LocalTime.of(21, 0)))
        assertEquals("오전 12:05", timeLabel(LocalTime.of(0, 5)))
        assertEquals("오후 12:00", timeLabel(LocalTime.NOON))
    }
}
