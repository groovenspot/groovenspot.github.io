package com.groovenspot.pulsecare.wear

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate

/** 워치 화면을 예시 데이터로 그립니다 (화면 확인용). 수치는 예시입니다. */
class WatchScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.WEAR_OS_SMALL_ROUND,
        theme = "android:Theme.DeviceDefault",
    )

    private val date = LocalDate.of(2027, 6, 16)
    private val today = WatchToday(date, 74, Band.GOOD, "어젯밤 평소보다 잘 회복됐어요", "W-01", "점심 먹고 10분 걷기", missionDone = false)

    private fun home(w: WatchToday?, on: LocalDate = date) = paparazzi.snapshot {
        WatchHomeContent(w, WatchContract.display(w, on), onDone = {}, onSos = {})
    }

    @Test
    fun score() = home(today)

    @Test
    fun learningDone() = home(today.copy(score = 63, band = Band.FAIR, learningDay = 3, missionDone = true, reason = "수면이 평소보다 짧았어요"))

    @Test
    fun notConnected() = home(null)

    /** 스크롤 아래: 미션 완료, SOS. */
    @Test
    fun missionAndSos() = paparazzi.snapshot {
        WatchHomeContent(today, WatchContract.display(today, date), onDone = {}, onSos = {}, initialScroll = 600)
    }

    @Test
    fun sosCountdown() = paparazzi.snapshot { SosContent(SosState.COUNTDOWN, 4, onCancel = {}, onClose = {}) }

    @Test
    fun sosSent() = paparazzi.snapshot { SosContent(SosState.SENT, 0, onCancel = {}, onClose = {}, result = WatchContract.sosSent(2)) }

    @Test
    fun sosNoGuardian() = paparazzi.snapshot { SosContent(SosState.SENT, 0, onCancel = {}, onClose = {}, result = WatchContract.sosSent(0)) }
}
