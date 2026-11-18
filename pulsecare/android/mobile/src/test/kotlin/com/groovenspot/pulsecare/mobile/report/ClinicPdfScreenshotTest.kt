package com.groovenspot.pulsecare.mobile.report

import android.content.Context
import android.graphics.Canvas
import android.view.View
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.report.ClinicReport
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

/** 진료용 요약 PDF 두 장을 같은 그리기 코드로 이미지로 그립니다 (예시 데이터). */
class ClinicPdfScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(screenWidth = ClinicPdf.WIDTH * 2, screenHeight = ClinicPdf.HEIGHT * 2, xdpi = 320, ydpi = 320),
        theme = "android:Theme.Material.Light.NoActionBar",
    )

    private val to = LocalDate.of(2027, 6, 30)

    /** 예시: 마지막 며칠 안정시 심박 상승, 금요일마다 짧은 수면, 하루 미착용. */
    private val summary by lazy {
        val records = (0..65).map { ago ->
            val date = to.plusDays(1).minusDays(ago.toLong())
            val friday = date.dayOfWeek.value == 6
            if (ago == 12) {
                DailyRecord(date, sleep = null)
            } else {
                DailyRecord(
                    date,
                    SleepSummary(if (friday) 320 else 400 + (ago * 37 % 70), bedtime = LocalTime.of(23, 10).plusMinutes((ago * 23 % 50).toLong())),
                    hrvMs = 46.0 + (ago * 13 % 9) - if (ago in 1..4) 6 else 0,
                    restingHr = 59.0 + (ago * 7 % 4) + if (ago in 1..4) 12 else 0,
                    steps = 6500 + (ago * 911 % 4200),
                    respiratoryRate = 14.0 + (ago % 3) * 0.3,
                    lowSpo2Repeated = ago == 9,
                )
            }
        }
        val logs = (0..29).map { MissionLog(to.minusDays(it.toLong()), "C-03", completed = it % 3 != 0) }
        ClinicReport.build(to.minusDays(29), to, records, logs, mapOf(to to 58, to.minusDays(1) to 66)) { 120 }
    }

    private fun page(index: Int) = paparazzi.snapshot(
        object : View(paparazzi.context as Context) {
            override fun onDraw(canvas: Canvas) {
                canvas.scale(2f, 2f)
                ClinicPdf.drawPage(canvas, index, summary, ClinicMeta("김영희", to.plusDays(1), listOf("삼성 헬스")))
            }
        },
    )

    @Test
    fun page1() = page(0)

    @Test
    fun page2() = page(1)
}
