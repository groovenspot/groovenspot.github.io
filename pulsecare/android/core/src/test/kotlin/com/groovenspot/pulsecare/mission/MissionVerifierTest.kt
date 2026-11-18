package com.groovenspot.pulsecare.mission

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class MissionVerifierTest {
    private val wed = LocalDate.of(2027, 4, 28)
    private val sat = LocalDate.of(2027, 5, 1)
    private fun at(h: Int, m: Int = 0) = wed.atTime(h, m)
    private val nextMorning = wed.plusDays(1).atTime(8, 0)

    @Test
    fun dailySteps() {
        val a = DayActivity(wed, stepsByHour = mapOf(9 to 3_000L, 13 to 4_500L))
        assertEquals(Check.DONE, MissionVerifier.check("W-02", a, at(14)))
        assertEquals(Check.NOT_YET, MissionVerifier.check("W-05", a, at(14)))
        assertEquals(Check.MISSED, MissionVerifier.check("W-05", a, nextMorning))
    }

    @Test
    fun walkInTheRightWindow() {
        val lunch = DayActivity(wed, stepsByHour = mapOf(12 to 1_200L))
        assertEquals(Check.DONE, MissionVerifier.check("W-01", lunch, at(13)))
        val morningOnly = DayActivity(wed, stepsByHour = mapOf(8 to 1_200L))
        assertEquals(Check.NOT_YET, MissionVerifier.check("W-01", morningOnly, at(12, 30)))
        assertEquals(Check.MISSED, MissionVerifier.check("W-01", morningOnly, at(15)))
        assertEquals(Check.DONE, MissionVerifier.check("S-03", morningOnly, at(15)))
    }

    @Test
    fun allDayWalkWaitsUntilMidnight() {
        val quiet = DayActivity(wed, stepsByHour = mapOf(9 to 800L))
        assertEquals(Check.NOT_YET, MissionVerifier.check("C-03", quiet, at(23, 59)))
        assertEquals(Check.MISSED, MissionVerifier.check("C-03", quiet, nextMorning))
    }

    @Test
    fun exercises() {
        val run = Exercise(at(18), at(18, 25), ExerciseKind.VIGOROUS)
        val stretch = Exercise(at(21), at(21, 12), ExerciseKind.STRETCH)
        val a = DayActivity(wed, exercises = listOf(run, stretch))
        assertEquals(Check.DONE, MissionVerifier.check("W-06", a, at(22)))
        assertEquals(Check.DONE, MissionVerifier.check("R-06", a, at(22)))
        assertEquals(Check.DONE, MissionVerifier.check("C-06", a, at(22)))
        assertEquals(Check.NOT_YET, MissionVerifier.check("W-08", a, at(22)))
        assertEquals(Check.MISSED, MissionVerifier.check("C-01", a, at(19)))
        assertEquals(Check.DONE, MissionVerifier.check("C-01", DayActivity(wed), nextMorning))
    }

    @Test
    fun bedtimeMissionsWaitForTheNight() {
        val usual = LocalTime.of(23, 30)
        val pending = DayActivity(wed, usualBedtime = usual)
        assertEquals(Check.NOT_YET, MissionVerifier.check("S-06", pending, at(21)))
        val early = pending.copy(nightBedtime = at(22, 50))
        assertEquals(Check.DONE, MissionVerifier.check("S-06", early, nextMorning))
        assertEquals(Check.DONE, MissionVerifier.check("C-05", early, nextMorning))
        val afterMidnight = pending.copy(nightBedtime = wed.plusDays(1).atTime(0, 20))
        assertEquals(Check.MISSED, MissionVerifier.check("S-01", afterMidnight, nextMorning))
        val onTime = pending.copy(nightBedtime = wed.plusDays(1).atTime(0, 0))
        assertEquals(Check.DONE, MissionVerifier.check("S-01", onTime, nextMorning))
    }

    @Test
    fun sevenNightsInARow() {
        val steady = List(7) { LocalTime.of(23, 40).plusMinutes(it * 5L) }
        val a = DayActivity(wed, usualBedtime = LocalTime.of(23, 40), nightBedtime = at(23, 50), recentBedtimes = steady)
        assertEquals(Check.DONE, MissionVerifier.check("S-08", a, nextMorning))
        val oneLate = a.copy(recentBedtimes = steady.dropLast(1) + LocalTime.of(1, 30))
        assertEquals(Check.MISSED, MissionVerifier.check("S-08", oneLate, nextMorning))
    }

    @Test
    fun weekendWake() {
        val a = DayActivity(sat, usualWake = LocalTime.of(7, 0), morningWake = sat.atTime(7, 20))
        assertEquals(Check.DONE, MissionVerifier.check("S-07", a, sat.atTime(9, 0)))
        assertEquals(Check.MISSED, MissionVerifier.check("S-07", a.copy(morningWake = sat.atTime(9, 30)), sat.atTime(10, 0)))
    }

    @Test
    fun napBeforeThree() {
        val a = DayActivity(wed, naps = listOf(at(13, 30) to at(13, 52)))
        assertEquals(Check.DONE, MissionVerifier.check("C-02", a, at(16)))
    }

    @Test
    fun manualMissions() {
        listOf("S-02", "R-04", "R-05", "P-02", "W-04").forEach {
            assertEquals(it, Check.MANUAL, MissionVerifier.check(it, DayActivity(wed), at(12)))
        }
    }

    @Test
    fun minutesAcrossMidnight() {
        assertEquals(50, MissionVerifier.minutesAfter(LocalTime.of(0, 20), LocalTime.of(23, 30)))
        assertEquals(-40, MissionVerifier.minutesAfter(LocalTime.of(22, 50), LocalTime.of(23, 30)))
    }
}
