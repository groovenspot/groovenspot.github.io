package com.groovenspot.pulsecare.alert

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime

class AlertFeedbackTest {
    private val today = LocalDate.of(2027, 6, 16)
    private fun at(daysAgo: Long) = today.minusDays(daysAgo).atTime(8, 0)
    private val rhr = Detection(Signal.RESTING_HR_RISE, usual = 62.0, current = 70.0, days = 3)

    @Test
    fun twoFalseAlarmsInTwoWeeksSuggestSnooze() {
        val one = listOf(FeedbackEntry(at(3), rhr, FeedbackResponse.FALSE_ALARM))
        assertTrue(AlertFeedback.suggestSnooze(one, today, emptyMap()).isEmpty())
        val two = one + FeedbackEntry(at(1), rhr, FeedbackResponse.FALSE_ALARM)
        assertEquals(setOf(Signal.RESTING_HR_RISE), AlertFeedback.suggestSnooze(two, today, emptyMap()))
        // 14일보다 오래된 것은 세지 않습니다.
        val old = listOf(FeedbackEntry(at(20), rhr, FeedbackResponse.FALSE_ALARM), FeedbackEntry(at(1), rhr, FeedbackResponse.FALSE_ALARM))
        assertTrue(AlertFeedback.suggestSnooze(old, today, emptyMap()).isEmpty())
        // "괜찮아요"는 오탐이 아닙니다.
        val ok = listOf(FeedbackEntry(at(2), rhr, FeedbackResponse.OK), FeedbackEntry(at(1), rhr, FeedbackResponse.OK))
        assertTrue(AlertFeedback.suggestSnooze(ok, today, emptyMap()).isEmpty())
    }

    @Test
    fun noSuggestionWhileSnoozedOrAfterDeclineWithoutNewFalseAlarm() {
        val two = listOf(FeedbackEntry(at(3), rhr, FeedbackResponse.FALSE_ALARM), FeedbackEntry(at(2), rhr, FeedbackResponse.FALSE_ALARM))
        assertTrue(AlertFeedback.suggestSnooze(two, today, mapOf(Signal.RESTING_HR_RISE to today.plusDays(3))).isEmpty())
        val declined = mapOf(Signal.RESTING_HR_RISE to at(1))
        assertTrue(AlertFeedback.suggestSnooze(two, today, emptyMap(), declined).isEmpty())
        val again = two + FeedbackEntry(at(0), rhr, FeedbackResponse.FALSE_ALARM)
        assertEquals(setOf(Signal.RESTING_HR_RISE), AlertFeedback.suggestSnooze(again, today, emptyMap(), declined))
    }

    @Test
    fun emergencyNeverSnoozes() {
        val sos = Detection(Signal.SOS)
        val two = listOf(FeedbackEntry(at(2), sos, FeedbackResponse.FALSE_ALARM), FeedbackEntry(at(1), sos, FeedbackResponse.FALSE_ALARM))
        assertTrue(AlertFeedback.suggestSnooze(two, today, emptyMap()).isEmpty())
        assertFalse(AlertFeedback.isSnoozed(Signal.SOS, mapOf(Signal.SOS to today), today))
        assertTrue(AlertFeedback.isSnoozed(Signal.RESTING_HR_RISE, mapOf(Signal.RESTING_HR_RISE to today), today))
        assertFalse(AlertFeedback.isSnoozed(Signal.RESTING_HR_RISE, mapOf(Signal.RESTING_HR_RISE to today.minusDays(1)), today))
    }

    @Test
    fun acknowledgedFeedsSchedulerAndSuppresses24hUnlessWorse() {
        val now = LocalDateTime.of(2027, 6, 16, 12, 0)
        val acked = AlertFeedback.acknowledged(listOf(FeedbackEntry(now.minusHours(3), rhr, FeedbackResponse.OK)))
        val scheduler = AlertScheduler()
        val same = scheduler.decide(PendingAlert(rhr, Recipient.SELF, now), now, DeliveryState(acknowledged = acked))
        assertTrue(same is Decision.Drop)
        val worse = rhr.copy(current = 78.0)
        assertEquals(Decision.SendNow, scheduler.decide(PendingAlert(worse, Recipient.SELF, now), now, DeliveryState(acknowledged = acked)))
    }
}
