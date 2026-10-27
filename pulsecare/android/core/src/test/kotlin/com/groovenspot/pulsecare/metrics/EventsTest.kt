package com.groovenspot.pulsecare.metrics

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EventsTest {
    @Test
    fun dictionaryKeysAreUniqueSnakeCase() {
        val keys = EventName.entries.map { it.key }
        assertEquals(keys.size, keys.toSet().size)
        assertTrue(keys.all { Regex("[a-z_]+").matches(it) })
        assertEquals(EventName.MISSION_COMPLETED, EventName.of("mission_completed"))
        assertNull(EventName.of("chat_message_sent"))
    }

    @Test
    fun cleanDropsUnknownPropsAndLongValues() {
        val cleaned = EventRules.clean(
            EventName.SCORE_VIEWED,
            mapOf("surface" to "app", "kind" to "FULL", "score" to "72", "day" to "x".repeat(100), "empty" to ""),
        )
        assertEquals(setOf("surface", "kind", "day"), cleaned.keys)
        assertEquals(EventRules.MAX_VALUE_LENGTH, cleaned.getValue("day").length)
        // 이벤트 사전에 점수·수치 속성은 없습니다.
        assertTrue(EventName.entries.none { e -> e.props.any { it in setOf("score", "steps", "hrv", "heart_rate", "name", "phone") } })
    }

    @Test
    fun activeMeansDirectAction() {
        assertTrue(EventRules.isActive(EventName.APP_OPENED, emptyMap()))
        assertTrue(EventRules.isActive(EventName.MISSION_COMPLETED, mapOf("auto" to "false")))
        assertFalse(EventRules.isActive(EventName.MISSION_COMPLETED, mapOf("auto" to "true")))
        assertFalse(EventRules.isActive(EventName.MISSION_SHOWN, emptyMap()))
        assertFalse(EventRules.isActive(EventName.ALERT_SENT, emptyMap()))
    }

    @Test
    fun dayBuckets() {
        assertEquals("3", EventRules.dayBucket(3))
        assertEquals("8-14", EventRules.dayBucket(10))
        assertEquals("90+", EventRules.dayBucket(200))
    }
}
