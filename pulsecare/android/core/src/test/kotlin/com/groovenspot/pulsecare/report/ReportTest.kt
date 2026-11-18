package com.groovenspot.pulsecare.report

import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionProgress.LevelChange
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class ReportTest {
    private val sunday = LocalDate.of(2027, 7, 25)

    private fun logs(doneDaysAgo: Set<Int>, id: String = "S-01", days: Int = 14) =
        (0 until days).map { MissionLog(sunday.minusDays(it.toLong()), id, it in doneDaysAgo) }

    /** 최근 7일은 [recentSleep]분, 그 전은 [olderSleep]분. */
    private fun records(recentSleep: Int, olderSleep: Int) = (0..40).map { ago ->
        DailyRecord(sunday.minusDays(ago.toLong()), SleepSummary(if (ago < 7) recentSleep else olderSleep), hrvMs = 50.0, steps = 8000)
    }

    @Test
    fun fiveDaysEarnsBadgeAndSuggestsLevelUp() {
        val s = WeeklyReport.build(sunday, Goal.SLEEP, 1, sunday.minusDays(10), logs(setOf(0, 1, 2, 4, 6)), records(450, 450))
        assertEquals(5, s.daysDone)
        assertTrue(s.badge)
        assertEquals(50, s.points)
        assertEquals(LevelChange.SUGGEST_UP, s.levelChange)
        assertEquals(2, s.nextLevel)
        assertEquals("이번 주 5일 완료 · 주간 배지", s.title)
        assertTrue("다음 주부터 조금 더 도전해 볼까요?" in s.lines)
    }

    @Test
    fun hardWeekStepsDownGently() {
        val s = WeeklyReport.build(sunday, Goal.SLEEP, 2, sunday.minusDays(10), logs(setOf(3), id = "S-06"), records(450, 450))
        assertEquals(LevelChange.DOWN, s.levelChange)
        assertEquals(1, s.nextLevel)
        assertTrue("이번 주는 가벼운 미션으로 리듬을 되찾아요" in s.lines)
        assertFalse(s.badge)
    }

    @Test
    fun level2UpNeedsImprovement() {
        val tenOfFourteen = setOf(0, 1, 2, 3, 4, 6, 8, 9, 11, 13)
        val flat = WeeklyReport.build(sunday, Goal.SLEEP, 2, sunday.minusDays(10), logs(tenOfFourteen, "S-06"), records(450, 450))
        assertEquals(LevelChange.STAY, flat.levelChange)
        val better = WeeklyReport.build(sunday, Goal.SLEEP, 2, sunday.minusDays(10), logs(tenOfFourteen, "S-06"), records(470, 450))
        assertEquals(LevelChange.SUGGEST_UP, better.levelChange)
    }

    @Test
    fun changeReportAfterFourWeeks() {
        val s = WeeklyReport.build(sunday, Goal.SLEEP, 1, sunday.minusDays(30), logs(setOf(0, 1)), records(472, 450))
        assertEquals("4주 전보다 평균 수면이 22분 늘었어요", s.change)
        val young = WeeklyReport.build(sunday, Goal.SLEEP, 1, sunday.minusDays(14), logs(setOf(0, 1)), records(472, 450))
        assertNull(young.change)
    }

    @Test
    fun stepsChangeLine() {
        assertEquals("4주 전보다 하루 걸음이 평균 1,200보 늘었어요", WeeklyReport.changeLine(Goal.WEIGHT, 9_230.0, 8_010.0))
    }

    @Test
    fun sevenMissedDaysSuggestGoalChange() {
        val s = WeeklyReport.build(sunday, Goal.SLEEP, 1, sunday.minusDays(10), logs(setOf(9, 10)), records(450, 450))
        assertTrue(s.suggestGoalChange)
        assertTrue(s.lines.last().contains("목표를 바꿔 볼까요?"))
    }

    @Test
    fun eveningAsksToRetryOnlyWhenMissed() {
        val walk = MissionLibrary["W-01"]
        val missed = EveningSummary.of(walk, done = false, infoBodies = emptyList())!!
        assertTrue(missed.askRetry)
        assertEquals("오늘 미션, 내일 다시 해볼까요?", missed.title)
        assertNull(EveningSummary.of(walk, done = true, infoBodies = emptyList()))
        val withInfo = EveningSummary.of(walk, done = true, infoBodies = listOf("이번 주 수면이 평소보다 짧아요"))!!
        assertFalse(withInfo.askRetry)
        val bedtime = EveningSummary.of(MissionLibrary["S-06"], done = false, infoBodies = emptyList())!!
        assertFalse(bedtime.askRetry)
        assertEquals("오늘 밤 미션을 잊지 마세요", bedtime.title)
    }
}
