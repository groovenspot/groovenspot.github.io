package com.groovenspot.pulsecare.history

import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class HistoryTest {
    /** 일요일. */
    private val today = LocalDate.of(2027, 7, 25)

    private fun records(days: Int = 60, bedtime: (Int) -> LocalTime = { LocalTime.of(23, 30) }) = (0 until days).map { ago ->
        DailyRecord(
            today.minusDays(ago.toLong()),
            SleepSummary(420 + (ago % 3) * 10, efficiency = 0.88, bedtime = bedtime(ago)),
            hrvMs = 50.0 + ago % 5,
            restingHr = 58.0 + ago % 3,
            activityLoad = 400.0,
        )
    }

    private fun build(
        period: Period = Period.WEEK,
        records: List<DailyRecord> = records(),
        signup: LocalDate = today.minusDays(40),
        scores: Map<LocalDate, Int> = emptyMap(),
        logs: List<MissionLog> = emptyList(),
    ) = HistoryBuilder.build(period, today, records, signup, scores, logs)

    @Test
    fun weekHasSevenDaysEndingToday() {
        val h = build()
        assertEquals(7, h.days.size)
        assertEquals(today, h.days.last().date)
        assertEquals(today.minusDays(6), h.days.first().date)
        assertEquals(30, build(Period.MONTH).days.size)
        assertEquals(42L, HistoryBuilder.readDays(Period.WEEK))
    }

    @Test
    fun storedScoreWinsAndMissingDaysAreRecomputed() {
        val h = build(scores = mapOf(today to 91))
        assertEquals(91, h.days.last().score)
        // 앱을 열지 않은 날도 같은 엔진으로 다시 계산합니다.
        assertTrue(h.days.dropLast(1).all { it.score != null && it.reason != null })
        assertTrue(h.days.all { it.subScores.isNotEmpty() })
    }

    @Test
    fun beforeSignupHasNoScoreButKeepsSleep() {
        val h = build(signup = today.minusDays(2))
        val before = h.days.first()
        assertTrue(before.dayIndex < 1)
        assertNull(before.score)
        assertNotNull(before.sleepMinutes)
        assertTrue(h.days.last().learning)
        assertEquals(3, h.days.last().dayIndex)
    }

    @Test
    fun nightWithoutWatchHasNoScore() {
        val missing = records().map { if (it.date == today.minusDays(1)) DailyRecord(it.date, sleep = null) else it }
        val day = build(records = missing).days.first { it.date == today.minusDays(1) }
        assertNull(day.score)
        assertNull(day.reason)
        assertNull(day.sleepMinutes)
    }

    @Test
    fun noHrvMarksEstimated() {
        val noHrv = records().map { if (it.date == today) it.copy(hrvMs = null) else it }
        assertTrue(build(records = noHrv).days.last().estimated)
        assertFalse(build().days.last().estimated)
    }

    @Test
    fun usualRangeNeedsSevenNights() {
        assertNull(build(records = records(days = 6)).hrv)
        val h = build()
        val hrv = h.hrv!!
        assertTrue(hrv.low < hrv.mid && hrv.mid < hrv.high)
        assertEquals(52.0, hrv.mid, 0.01)
        // 편차가 작아도 띠가 보이도록 반폭 하한.
        assertTrue(h.sleep!!.high - h.sleep!!.mid >= 20.0)
    }

    @Test
    fun missionsAutoAndWeeklyBadge() {
        val logs = (0..6).map { MissionLog(today.minusDays(it.toLong()), "W-02", completed = it != 3, auto = it < 2) }
        val h = build(logs = logs)
        assertEquals(6, h.missionsDone)
        assertEquals(2, h.missionsAuto)
        assertEquals(listOf(today), h.weeklyBadges)
        assertTrue("미션 6일 완료 (워치로 확인 2일)" in h.lines)
        assertTrue(build(logs = logs.take(4)).weeklyBadges.isEmpty())
    }

    @Test
    fun comparesWithPreviousPeriod() {
        val scores = (0..13).associate { today.minusDays(it.toLong()) to if (it < 7) 80 else 70 }
        val h = build(scores = scores)
        assertEquals(80, h.averageScore)
        assertEquals(70, h.previousAverage)
        assertEquals("평균 컨디션 80점 · 지난주보다 10점 올랐어요", h.lines.first())
        val flat = build(Period.MONTH, scores = (0..59).associate { today.minusDays(it.toLong()) to 75 })
        assertEquals("평균 컨디션 75점 · 지난달과 비슷해요", flat.lines.first())
    }

    @Test
    fun laterBedtimeThanUsual() {
        // 이번 주는 00:10, 그 전은 23:30: 자정을 넘어도 40분 늦은 것으로 셉니다.
        val h = build(records = records { ago -> if (ago < 7) LocalTime.of(0, 10) else LocalTime.of(23, 30) })
        assertTrue("평균 취침 00:10 · 평소보다 40분 늦어요" in h.lines)
        assertEquals(40, History.minutesBetween(LocalTime.of(23, 30), LocalTime.of(0, 10)))
        assertEquals(-40, History.minutesBetween(LocalTime.of(0, 10), LocalTime.of(23, 30)))
        assertEquals("7시간 5분", History.duration(425))
    }
}
