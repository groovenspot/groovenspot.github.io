package com.groovenspot.pulsecare.care

import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.DayActivity
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.DayTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class CareTest {
    private val day = LocalDate.of(2027, 6, 16)
    private val pill = Medication("m1", "혈압약", listOf(LocalTime.of(20, 0), LocalTime.of(8, 0)))

    @Test
    fun dosesAreMissedThreeHoursLater() {
        val logs = listOf(DoseLog(day, "m1", LocalTime.of(8, 0), day.atTime(8, 10)))
        val noon = Medications.today(listOf(pill), logs, day.atTime(12, 0))
        assertEquals(listOf(LocalTime.of(8, 0), LocalTime.of(20, 0)), noon.map { it.time })
        assertTrue(noon[0].taken)
        assertFalse(noon[1].missed)
        assertNull(Medications.missed(noon))
        val late = Medications.today(listOf(pill), logs, day.atTime(23, 0))
        assertTrue(late[1].missed)
        assertEquals(Signal.MEDICATION_MISSED, Medications.missed(late)!!.signal)
    }

    @Test
    fun nextMedicationEvent() {
        assertEquals(day.atTime(11, 0), Medications.nextEvent(listOf(pill), day.atTime(8, 0)))
        assertEquals(day.plusDays(1).atTime(8, 0), Medications.nextEvent(listOf(pill), day.atTime(23, 0)))
        assertNull(Medications.nextEvent(emptyList(), day.atTime(8, 0)))
    }

    @Test
    fun bedtimeReminderIsHalfAnHourBeforeUsual() {
        assertEquals(LocalTime.of(23, 10), Bedtime.reminderAt(LocalTime.of(23, 40)))
        assertEquals(LocalTime.of(23, 40), Bedtime.reminderAt(LocalTime.of(0, 10)))
        assertEquals(LocalTime.of(22, 30), Bedtime.reminderAt(null))
        assertEquals(LocalTime.of(21, 30), Bedtime.reminderAt(LocalTime.of(23, 40), fixed = LocalTime.of(22, 0)))
    }

    @Test
    fun tagsAttachToMorningRecord() {
        val r = DayTags.apply(listOf(DailyRecord(day, sleep = null), DailyRecord(day.minusDays(1), sleep = null)), mapOf(day to setOf(DayTag.ALCOHOL)))
        assertEquals(setOf(DayTag.ALCOHOL), r[0].tags)
        assertTrue(r[1].tags.isEmpty())
    }

    @Test
    fun breathingRhythm() {
        assertEquals(Breathing.Phase.INHALE, Breathing.at(0.0).first)
        assertEquals(Breathing.Phase.EXHALE, Breathing.at(5.0).first)
        assertEquals(0.5, Breathing.at(7.0).second, 1e-9)
        assertEquals(Breathing.Phase.INHALE, Breathing.at(10.0).first)
        assertEquals(Breathing.Phase.DONE, Breathing.at(60.0).first)
    }

    @Test
    fun appRecordsCompleteMissions() {
        val now = day.atTime(21, 0)
        val a = DayActivity(day, breathing = listOf(day.atTime(7, 30), day.atTime(12, 10), day.atTime(20, 30)), waterCups = 6, tagged = true)
        listOf("R-01", "C-04", "S-04", "R-08", "C-07", "C-08").forEach { assertEquals(it, Check.DONE, MissionVerifier.check(it, a, now)) }
        val none = DayActivity(day)
        assertEquals(Check.NOT_YET, MissionVerifier.check("R-01", none, now))
        assertEquals(Check.MISSED, MissionVerifier.check("C-07", none, day.plusDays(1).atTime(8, 0)))
        assertEquals(Check.NOT_YET, MissionVerifier.check("S-04", DayActivity(day, breathing = listOf(day.atTime(9, 0))), now))
    }
}
