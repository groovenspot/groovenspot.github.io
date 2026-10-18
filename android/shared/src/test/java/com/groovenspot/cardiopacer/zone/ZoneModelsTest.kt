package com.groovenspot.cardiopacer.zone

import org.junit.Assert.assertEquals
import org.junit.Test

// Mirrors CardioPacerTests/ZoneModelsTests.swift so both platforms agree.
class ZoneModelsTest {
    @Test
    fun maxHeartRatePercentageWithoutRestingHeartRate() {
        val profile = ZoneProfile(age = 35)
        assertEquals(184, profile.estimatedMaxHeartRate) // 208 - 0.7 * 35 = 183.5
        assertEquals(ZoneRange(110, 129), profile.zone2Range)
    }

    @Test
    fun karvonenWithRestingHeartRate() {
        assertEquals(ZoneRange(134, 147), ZoneProfile(age = 35, restingHeartRate = 60).zone2Range)
    }

    @Test
    fun maxHeartRateOverride() {
        val profile = ZoneProfile(age = 35, restingHeartRate = 50, maxHeartRateOverride = 200)
        assertEquals(ZoneRange(140, 155), profile.zone2Range)
    }

    @Test
    fun manualRangeWins() {
        val profile = ZoneProfile(
            age = 35, restingHeartRate = 60,
            method = ZoneProfile.Method.MANUAL, manualRange = ZoneRange(130, 145),
        )
        assertEquals(ZoneRange(130, 145), profile.zone2Range)
    }

    @Test
    fun rangeNormalisesOrder() {
        assertEquals(ZoneRange(120, 150), ZoneRange.of(150, 120))
    }

    @Test
    fun rangeBoundariesAreInclusive() {
        val range = ZoneRange(130, 145)
        assertEquals(HeartRateZone.BELOW, range.zoneFor(129.0))
        assertEquals(HeartRateZone.TARGET, range.zoneFor(130.0))
        assertEquals(HeartRateZone.TARGET, range.zoneFor(145.0))
        assertEquals(HeartRateZone.ABOVE, range.zoneFor(146.0))
    }

    @Test
    fun trackerLeavesZone2Immediately() {
        val tracker = ZoneTracker(ZoneRange(130, 145))
        assertEquals(HeartRateZone.TARGET, tracker.update(140.0))
        assertEquals(HeartRateZone.ABOVE, tracker.update(146.0))
    }

    @Test
    fun trackerHysteresisWhenComingDown() {
        val tracker = ZoneTracker(ZoneRange(130, 145))
        tracker.update(150.0)
        assertEquals(HeartRateZone.ABOVE, tracker.update(145.0))
        assertEquals(HeartRateZone.ABOVE, tracker.update(144.0))
        assertEquals(HeartRateZone.TARGET, tracker.update(143.0))
    }

    @Test
    fun trackerHysteresisWhenComingUp() {
        val tracker = ZoneTracker(ZoneRange(130, 145))
        tracker.update(120.0)
        assertEquals(HeartRateZone.BELOW, tracker.update(131.0))
        assertEquals(HeartRateZone.TARGET, tracker.update(132.0))
        assertEquals(HeartRateZone.BELOW, tracker.update(129.0))
    }

    @Test
    fun ledgerCreditsTimeToPreviousZone() {
        val ledger = ZoneTimeLedger()
        ledger.mark(HeartRateZone.TARGET, 0)
        ledger.mark(HeartRateZone.TARGET, 10_000)
        ledger.mark(HeartRateZone.ABOVE, 20_000)
        ledger.mark(null, 30_000)
        assertEquals(20_000L, ledger.millis[HeartRateZone.TARGET])
        assertEquals(10_000L, ledger.millis[HeartRateZone.ABOVE])
        assertEquals(30_000L, ledger.total)
        assertEquals(2.0 / 3.0, ledger.fraction(HeartRateZone.TARGET), 0.0001)
    }

    @Test
    fun ledgerIgnoresTimeWhileClockIsStopped() {
        val ledger = ZoneTimeLedger()
        ledger.mark(HeartRateZone.TARGET, 0)
        ledger.mark(HeartRateZone.TARGET, 60_000)
        ledger.mark(HeartRateZone.TARGET, 60_000)
        ledger.mark(null, 90_000)
        assertEquals(90_000L, ledger.millis[HeartRateZone.TARGET])
    }

    @Test
    fun summaryPercent() {
        val summary = WorkoutSummary(
            durationMillis = 600_000,
            zoneMillis = mapOf(
                HeartRateZone.BELOW to 60_000L,
                HeartRateZone.TARGET to 492_000L,
                HeartRateZone.ABOVE to 48_000L,
            ),
            averageHeartRate = 138.0,
            range = ZoneRange(130, 145),
        )
        assertEquals(82, summary.zone2Percent)
    }

    @Test
    fun summaryPercentWithNoData() {
        assertEquals(0, WorkoutSummary(0, emptyMap(), null, ZoneRange(130, 145)).zone2Percent)
    }

    @Test
    fun clockFormatting() {
        assertEquals("12:45", DurationFormatter.clock(765_000))
        assertEquals("1:02:09", DurationFormatter.clock(3_729_000))
        assertEquals("00:00", DurationFormatter.clock(-5_000))
    }
}
