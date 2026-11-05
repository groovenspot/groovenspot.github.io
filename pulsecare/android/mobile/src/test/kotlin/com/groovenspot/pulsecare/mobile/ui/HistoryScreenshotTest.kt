package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.history.HistoryBuilder
import com.groovenspot.pulsecare.history.Period
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

/** 기록 탭을 예시 데이터로 그립니다 (화면 확인용). 수치는 예시입니다. */
class HistoryScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(screenHeight = 5200),
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    private val today = LocalDate.of(2027, 6, 20)

    /** 요일마다 조금씩 다른 예시 기록. 금요일 밤은 짧게 자고, 하루는 워치를 안 찼습니다. */
    private val records = (0 until 90).map { ago ->
        val date = today.minusDays(ago.toLong())
        val friday = date.dayOfWeek.value == 6
        if (ago == 3) {
            DailyRecord(date, sleep = null)
        } else {
            DailyRecord(
                date,
                SleepSummary(
                    if (friday) 330 else 400 + (ago * 37 % 70),
                    efficiency = 0.86 + (ago % 4) * 0.01,
                    bedtime = LocalTime.of(23, 0).plusMinutes((ago * 23 % 60).toLong() + if (friday) 70 else 0),
                ),
                hrvMs = 48.0 + (ago * 13 % 11) - if (friday) 8 else 0,
                restingHr = 57.0 + (ago * 7 % 4) + if (friday) 4 else 0,
                activityLoad = 380.0 + ago * 17 % 90,
            )
        }
    }

    private val logs = (0 until 30).map { ago ->
        MissionLog(today.minusDays(ago.toLong()), "W-02", completed = ago % 4 != 1, auto = ago % 3 == 0)
    }

    private fun render(period: Period) {
        val history = HistoryBuilder.build(period, today, records, today.minusDays(60), emptyMap(), logs)
        paparazzi.snapshot {
            PulseTheme {
                MainTabs(Tab.HISTORY, onTab = {}) {
                    HistoryContent(history, period, onPeriod = {}, selected = today.minusDays(1), onSelect = {})
                }
            }
        }
    }

    @Test
    fun week() = render(Period.WEEK)

    @Test
    fun month() = render(Period.MONTH)
}
