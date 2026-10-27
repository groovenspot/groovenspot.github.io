package com.groovenspot.pulsecare.mission

import com.groovenspot.pulsecare.score.Metric
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import kotlin.random.Random

class MissionPickerTest {

    private val wednesday = LocalDate.of(2027, 4, 28)
    private val saturday = LocalDate.of(2027, 5, 1)

    /** 새 미션 20% 규칙이 끼어들지 않게: nextDouble()이 항상 0.99. */
    private val noSurprise = MissionPicker(object : Random() {
        override fun nextBits(bitCount: Int): Int = Random.nextBits(bitCount)
        override fun nextDouble(): Double = 0.99
    })

    private fun input(score: Int?, reason: Metric? = null, goal: Goal = Goal.SLEEP, level: Int = 1, history: List<MissionLog> = emptyList()) =
        PickInput(wednesday, score, reason, goal, level, history)

    @Test
    fun libraryMatchesSpec() {
        assertEquals(40, MissionLibrary.all.size)
        assertEquals(11, MissionLibrary.all.count { it.verification == Verification.MANUAL })
        Goal.entries.forEach { assertEquals(8, MissionLibrary.of(it).size) }
        assertEquals(40, MissionLibrary.all.map { it.id }.toSet().size)
    }

    @Test
    fun lowScoreGivesLowDayMission() {
        val m = noSurprise.pick(input(score = 42, reason = Metric.SLEEP_DURATION))
        assertEquals(Goal.LOW_DAY, m.goal)
        assertTrue(Metric.SLEEP_DURATION in m.linked)
    }

    @Test
    fun reasonLinkedMissionWins() {
        val m = noSurprise.pick(input(score = 72, reason = Metric.SLEEP_QUALITY))
        assertEquals(Goal.SLEEP, m.goal)
        assertTrue(Metric.SLEEP_QUALITY in m.linked)
    }

    @Test
    fun fairDayDropsOneLevel() {
        repeat(20) {
            val m = MissionPicker(Random(it)).pick(input(score = 60, level = 2))
            assertEquals(1, m.level)
        }
    }

    @Test
    fun levelCapsTheChoice() {
        repeat(20) {
            val m = MissionPicker(Random(it)).pick(input(score = 80, level = 2))
            assertTrue(m.level <= 2)
        }
    }

    @Test
    fun recentMissionsAreNotRepeated() {
        val history = listOf(
            MissionLog(wednesday.minusDays(1), "S-02", true),
            MissionLog(wednesday.minusDays(2), "S-04", true),
        )
        val m = noSurprise.pick(input(score = 72, reason = Metric.SLEEP_QUALITY, history = history))
        assertFalse(m.id == "S-02" || m.id == "S-04")
    }

    @Test
    fun missedTwiceInARowIsSkipped() {
        val history = listOf(
            MissionLog(wednesday.minusDays(5), "S-02", false),
            MissionLog(wednesday.minusDays(4), "S-02", false),
            MissionLog(wednesday.minusDays(3), "S-01", true),
        )
        val m = noSurprise.pick(input(score = 72, reason = Metric.SLEEP_QUALITY, history = history))
        assertNotEquals("S-02", m.id)
    }

    @Test
    fun weekendOnlyMissionOnlyOnWeekends() {
        repeat(30) {
            val m = MissionPicker(Random(it)).pick(input(score = 80, level = 2, reason = Metric.REGULARITY))
            assertNotEquals("S-07", m.id)
        }
        val onSaturday = (0 until 30).map {
            MissionPicker(Random(it)).pick(input(score = 80, level = 2, reason = Metric.REGULARITY).copy(date = saturday)).id
        }
        assertTrue("S-07" in onSaturday)
    }

    @Test
    fun badWeatherSkipsOutdoorMissions() {
        repeat(30) {
            val m = MissionPicker(Random(it)).pick(input(score = 80, goal = Goal.WEIGHT).copy(badWeather = true))
            assertFalse(m.outdoor)
        }
    }

    @Test
    fun seniorModeOnlyGetsEasyWalkingAndSleep() {
        repeat(30) {
            val m = MissionPicker(Random(it)).pick(input(score = 80, goal = Goal.WEIGHT, level = 3).copy(seniorMode = true))
            assertTrue(m.id, m.seniorFriendly && m.level == 1)
        }
    }

    @Test
    fun swapExcludesCurrentMission() {
        val first = noSurprise.pick(input(score = 72, reason = Metric.SLEEP_QUALITY))
        val second = noSurprise.pick(input(score = 72, reason = Metric.SLEEP_QUALITY).copy(exclude = setOf(first.id)))
        assertNotEquals(first.id, second.id)
    }

    @Test
    fun threeMissedDaysInsertLevelOne() {
        val history = (1..3).map { MissionLog(wednesday.minusDays(it.toLong()), "S-0${it + 4}", false) }
        val m = noSurprise.pick(input(score = 80, level = 3, history = history))
        assertEquals(1, m.level)
    }

    @Test
    fun levelRules() {
        val five = List(2) { false } + List(5) { true }
        assertEquals(MissionProgress.LevelChange.SUGGEST_UP, MissionProgress.weeklyLevel(1, five, metricImproved = false))
        val eightOfFourteen = List(6) { false } + List(8) { true }
        assertEquals(MissionProgress.LevelChange.STAY, MissionProgress.weeklyLevel(2, eightOfFourteen, metricImproved = true))
        val tenOfFourteen = List(4) { false } + List(10) { true }
        assertEquals(MissionProgress.LevelChange.SUGGEST_UP, MissionProgress.weeklyLevel(2, tenOfFourteen, metricImproved = true))
        assertEquals(MissionProgress.LevelChange.STAY, MissionProgress.weeklyLevel(2, tenOfFourteen, metricImproved = false))
        val bad = List(14) { it % 3 == 0 }
        assertEquals(MissionProgress.LevelChange.DOWN, MissionProgress.weeklyLevel(3, bad, metricImproved = true))
        assertTrue(MissionProgress.weeklyBadge(listOf(true, true, false, true, true, true, false)))
        assertTrue(MissionProgress.suggestGoalChange(List(7) { false }))
    }

    @Test
    fun pointsByLevel() {
        assertEquals(10, MissionLibrary["S-01"].points)
        assertEquals(30, MissionLibrary["S-08"].points)
    }
}
