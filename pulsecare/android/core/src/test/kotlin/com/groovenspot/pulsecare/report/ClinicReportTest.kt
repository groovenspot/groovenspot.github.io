package com.groovenspot.pulsecare.report

import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class ClinicReportTest {
    private val to = LocalDate.of(2027, 6, 30)
    private val from = to.minusDays(29)

    /** 60일: 마지막 5일 안정시 심박 +12, 하루는 워치 미착용. */
    private fun records() = (0..60).map { ago ->
        val date = to.plusDays(1).minusDays(ago.toLong())
        if (date == to.minusDays(10)) {
            DailyRecord(date, sleep = null)
        } else {
            DailyRecord(
                date,
                SleepSummary(if (ago % 7 == 0) 330 else 420, bedtime = if (ago % 2 == 0) LocalTime.of(23, 40) else LocalTime.of(0, 10)),
                hrvMs = 50.0,
                restingHr = if (ago in 1..5) 72.0 else 60.0,
                steps = 8000,
                respiratoryRate = 14.0,
                lowSpo2Repeated = ago == 3,
            )
        }
    }

    private fun build(logs: List<MissionLog> = emptyList(), scores: Map<LocalDate, Int> = emptyMap()) =
        ClinicReport.build(from, to, records(), logs, scores) { 60 }

    @Test
    fun keyNumbers() {
        val r = build()
        assertEquals(30, r.days)
        assertEquals(29, r.sleep.days)
        assertEquals(330.0, r.sleep.min!!, 0.0)
        assertTrue(r.shortNights >= 4)
        assertEquals(LocalTime.of(23, 40), r.bedtime)
        assertEquals(72.0, r.restingHr.max!!, 0.0)
        assertTrue("뒤 절반이 더 높아요", r.restingHr.secondHalf!! > r.restingHr.firstHalf!!)
        assertEquals(1, r.lowSpo2Nights)
        assertEquals(29, r.spo2Nights)
        assertEquals(8000.0, r.steps.mean!!, 0.0)
        assertEquals(30, r.dailySleep.size)
        assertNull(r.dailySleep[19])
    }

    @Test
    fun signalsListedOnFirstDayOnly() {
        val r = build()
        val rhr = r.signals.filter { it.detection.signal == Signal.RESTING_HR_RISE }
        assertEquals(1, rhr.size)
        assertEquals(to.minusDays(2), rhr.single().date)
        assertEquals("안정시 심박 상승 3일 연속 (평소 60 → 72 bpm)", ClinicReport.label(rhr.single().detection))
    }

    @Test
    fun missionsScoresAndWeeks() {
        val logs = (0..9).map { MissionLog(to.minusDays(it.toLong()), "P-08", completed = it % 2 == 0) } +
            MissionLog(from.minusDays(3), "S-01", true)
        val r = build(logs, mapOf(to to 70, to.minusDays(1) to 60, from.minusDays(1) to 10))
        assertEquals(5, r.missionDays)
        assertEquals(10, r.missionLogged)
        assertEquals(65, r.scoreMean)
        assertEquals(LocalDate.of(2027, 5, 31), r.weeks.first().monday)
        assertEquals(LocalDate.of(2027, 6, 28), r.weeks.last().monday)
        assertEquals("7시간 5분", ClinicReport.hours(425.0))
    }
}
