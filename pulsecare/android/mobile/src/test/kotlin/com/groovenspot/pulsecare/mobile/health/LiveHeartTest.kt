package com.groovenspot.pulsecare.mobile.health

import com.groovenspot.pulsecare.alert.HeartRateWatch
import com.groovenspot.pulsecare.alert.Signal
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class LiveHeartTest {
    private val t0 = Instant.parse("2027-06-16T05:00:00Z")
    private fun min(m: Long) = t0.plusSeconds(m * 60)

    @Test
    fun restingHighHeartRateIsDetectedButNotWhileWalking() {
        val hr = (0L..12L).map { min(it) to 128L }
        val still = LiveHeart.samples(hr, emptyList(), emptyList(), emptyList())
        assertEquals(Signal.HIGH_HR_AT_REST, HeartRateWatch.evaluate(still).single().signal)

        // 같은 시간에 분당 100보 걸음 → 움직임이라 알리지 않습니다.
        val walking = LiveHeart.samples(hr, listOf(StepSpan(min(0), min(13), 1300)), emptyList(), emptyList())
        assertTrue(walking.all { it.moving })
        assertTrue(HeartRateWatch.evaluate(walking).isEmpty())

        // 가끔 몇 걸음은 움직임이 아님.
        val fidget = LiveHeart.samples(hr, listOf(StepSpan(min(3), min(8), 30)), emptyList(), emptyList())
        assertFalse(fidget.any { it.moving })
    }

    @Test
    fun lowHeartRateWhileAsleepIsNormalAndWorkoutIsExcluded() {
        val low = (0L..12L).map { min(it) to 38L }
        val asleep = LiveHeart.samples(low, emptyList(), listOf(min(-60) to min(60)), emptyList())
        assertTrue(HeartRateWatch.evaluate(asleep).isEmpty())
        val awake = LiveHeart.samples(low, emptyList(), emptyList(), emptyList())
        assertEquals(Signal.LOW_HR_AWAKE, HeartRateWatch.evaluate(awake).single().signal)

        val high = (0L..12L).map { min(it) to 150L }
        val workout = LiveHeart.samples(high, emptyList(), emptyList(), listOf(min(-5) to min(20)))
        assertTrue(HeartRateWatch.evaluate(workout).isEmpty())
    }
}
