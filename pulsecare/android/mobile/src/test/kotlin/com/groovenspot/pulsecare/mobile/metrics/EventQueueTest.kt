package com.groovenspot.pulsecare.mobile.metrics

import com.groovenspot.pulsecare.metrics.EventName
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class EventQueueTest {
    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun addPeekDropKeepsNewOnesAndCleansProps() {
        val q = EventQueue(tmp.root.resolve("events.jsonl"))
        q.add(EventQueue.event(EventName.SCORE_VIEWED, mapOf("surface" to "app", "score" to "72"), at = 1))
        q.add(EventQueue.event(EventName.APP_OPENED, mapOf("source" to "icon"), at = 2))
        val first = q.peek(1).single()
        assertEquals("score_viewed", first.getString("name"))
        assertFalse(first.getJSONObject("props").has("score"))
        q.drop(1)
        q.add(EventQueue.event(EventName.APP_OPENED, mapOf("source" to "notification_morning_report"), at = 3))
        assertEquals(listOf(2L, 3L), q.peek().map { it.getLong("at") })
        q.clear()
        assertEquals(0, q.size())
    }

    @Test
    fun capsAtMaxDroppingOldest() {
        val q = EventQueue(tmp.root.resolve("cap.jsonl"))
        repeat(EventQueue.MAX + 5) { q.add(EventQueue.event(EventName.APP_OPENED, emptyMap(), at = it.toLong())) }
        assertEquals(EventQueue.MAX, q.size())
        assertEquals(5L, q.peek(1).single().getLong("at"))
    }
}
