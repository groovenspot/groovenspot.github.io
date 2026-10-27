package com.groovenspot.pulsecare.score

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class ConditionScoreEngineTest {

    private val today = LocalDate.of(2027, 4, 30)

    /** 평범한 28일: 7시간 30분 수면, 효율 90%, HRV 50ms 안팎, 안정시 심박 55 안팎, 활동 부하 100 안팎. */
    private fun history(days: Int = 28, change: (Int, DailyRecord) -> DailyRecord = { _, r -> r }): List<DailyRecord> =
        (1..days).map { ago ->
            val wiggle = (ago % 3) - 1 // −1, 0, +1
            val r = DailyRecord(
                date = today.minusDays(ago.toLong()),
                sleep = SleepSummary(
                    mainSleepMinutes = 450 + wiggle * 10,
                    efficiency = 0.90,
                    deepRatio = 0.20 + wiggle * 0.01,
                    bedtime = LocalTime.of(23, 30).plusMinutes(wiggle * 10L),
                ),
                hrvMs = 50.0 + wiggle * 2,
                restingHr = 55.0 + wiggle,
                skinTempC = 34.0 + wiggle * 0.1,
                respiratoryRate = 14.0 + wiggle * 0.2,
                activityLoad = 100.0 + wiggle * 10,
                score = 75,
            )
            change(ago, r)
        }

    private fun usualNight(change: (DailyRecord) -> DailyRecord = { it }): DailyRecord = change(
        DailyRecord(
            date = today,
            sleep = SleepSummary(mainSleepMinutes = 450, efficiency = 0.90, deepRatio = 0.20, bedtime = LocalTime.of(23, 30)),
            hrvMs = 50.0,
            restingHr = 55.0,
            skinTempC = 34.0,
            respiratoryRate = 14.0,
        ),
    )

    private val settled = ScoreContext(dayIndex = 60)

    @Test
    fun logisticCurveMatchesSpec() {
        // 기획서 13번: z 0 → 70, +1 → 89, −1 → 41, −2 → 18
        assertEquals(70, Stats.logisticScore(0.0).toInt())
        assertEquals(89, Math.round(Stats.logisticScore(1.0)).toInt())
        assertEquals(41, Math.round(Stats.logisticScore(-1.0)).toInt())
        assertEquals(18, Math.round(Stats.logisticScore(-2.0)).toInt())
    }

    @Test
    fun interpolationBetweenBands() {
        val points = listOf(0.60 to 10.0, 0.70 to 40.0, 0.85 to 70.0, 1.00 to 100.0)
        assertEquals(10.0, Stats.interpolate(0.4, points), 1e-9)
        assertEquals(55.0, Stats.interpolate(0.775, points), 1e-9)
        assertEquals(100.0, Stats.interpolate(1.2, points), 1e-9)
    }

    @Test
    fun usualDayScoresAroundSeventy() {
        val result = ConditionScoreEngine.score(usualNight(), history(), settled)
        assertEquals(ScoreResult.Kind.FULL, result.kind)
        assertTrue("got ${result.score}", result.score!! in 65..85)
        assertEquals(8, result.subScores.size)
        assertTrue(result.badges.isEmpty())
    }

    @Test
    fun noWatchAtNightGivesNoScore() {
        val result = ConditionScoreEngine.score(DailyRecord(today, sleep = null), history(), settled)
        assertEquals(ScoreResult.Kind.NO_DATA, result.kind)
        assertNull(result.score)
    }

    @Test
    fun highRestingHeartRateIsTheReason() {
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(restingHr = 61.0, hrvMs = 46.0) },
            history(),
            settled,
        )
        assertTrue("got ${result.score}", result.score!! < 70)
        assertEquals(Metric.RESTING_HR, result.reasonMetric)
        assertEquals("안정시 심박이 평소보다 6 bpm 높아요", result.reason)
    }

    @Test
    fun shortSleepNamesTheShortfall() {
        // 활동 부하·취침 시각 기록이 없는 사람: 수면 부족이 가장 큰 마이너스 요인이 됩니다.
        val plain = history { _, r -> r.copy(activityLoad = null, sleep = r.sleep!!.copy(bedtime = null)) }
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(sleep = it.sleep!!.copy(mainSleepMinutes = 360, efficiency = 0.85, bedtime = null)) },
            plain,
            settled,
        )
        assertTrue("got ${result.score}", result.score!! < 70)
        assertEquals(Metric.SLEEP_DURATION, result.reasonMetric)
        // 필요량 = 좋았던 날 수면 중앙값 450분, 360분이면 90분 부족
        assertEquals("어젯밤 수면이 필요량보다 1시간 30분 짧았어요", result.reason)
    }

    @Test
    fun underFourHoursCapsAtFifty() {
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(sleep = it.sleep!!.copy(mainSleepMinutes = 220), hrvMs = 70.0, restingHr = 50.0) },
            history(),
            settled,
        )
        assertEquals(Cap.SHORT_SLEEP, result.cap)
        assertTrue(result.score!! <= 50)
        assertTrue(result.reason.startsWith("어젯밤 수면이 4시간이 안 됐어요"))
    }

    @Test
    fun cautionSignalCapsAtSixty() {
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(hrvMs = 60.0) },
            history(),
            settled.copy(cautionSignalActive = true),
        )
        assertEquals(60, result.score)
        assertEquals(Cap.CAUTION_SIGNAL, result.cap)
    }

    @Test
    fun sickTagCapsAtFifty() {
        val result = ConditionScoreEngine.score(usualNight { it.copy(tags = setOf(DayTag.SICK)) }, history(), settled)
        assertEquals(50, result.score)
        assertEquals(Cap.SICK, result.cap)
    }

    @Test
    fun missingHrvRedistributesWeightAndShowsEstimated() {
        val result = ConditionScoreEngine.score(usualNight { it.copy(hrvMs = null) }, history(), settled)
        assertTrue(Metric.HRV !in result.subScores)
        assertTrue(Badge.ESTIMATED in result.badges)
        assertTrue("got ${result.score}", result.score!! in 60..90)
    }

    @Test
    fun noRecoveryDataCapsAtEighty() {
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(hrvMs = null, restingHr = null, sleep = it.sleep!!.copy(mainSleepMinutes = 540)) },
            history { _, r -> r.copy(activityLoad = 100.0) },
            settled,
        )
        assertTrue(result.score!! <= 80)
    }

    @Test
    fun firstThreeDaysGiveSleepOnlyScore() {
        val result = ConditionScoreEngine.score(usualNight(), emptyList(), ScoreContext(dayIndex = 2))
        assertEquals(ScoreResult.Kind.SLEEP_ONLY, result.kind)
        assertEquals(setOf(Metric.SLEEP_DURATION, Metric.SLEEP_QUALITY), result.subScores.keys)
        assertTrue(Badge.LEARNING in result.badges)
    }

    @Test
    fun learningBadgeDisappearsOnDayEight() {
        val day7 = ConditionScoreEngine.score(usualNight(), history(6), ScoreContext(dayIndex = 7))
        val day8 = ConditionScoreEngine.score(usualNight(), history(7), ScoreContext(dayIndex = 8))
        assertTrue(Badge.LEARNING in day7.badges)
        assertTrue(Badge.LEARNING !in day8.badges)
    }

    @Test
    fun taggedDaysAreLeftOutOfTheBaseline() {
        // 술 마신 날 HRV가 크게 낮아도 기준선은 그대로라 평범한 오늘은 평범하게 나옵니다.
        val withBadDays = history { ago, r -> if (ago % 4 == 0) r.copy(hrvMs = 20.0, tags = setOf(DayTag.ALCOHOL)) else r }
        val a = ConditionScoreEngine.score(usualNight(), withBadDays, settled)
        val b = ConditionScoreEngine.score(usualNight(), history(), settled)
        assertEquals(b.subScores[Metric.HRV]!!, a.subScores[Metric.HRV]!!, 3.0)
    }

    @Test
    fun alcoholTagIsMentioned() {
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(tags = setOf(DayTag.ALCOHOL), restingHr = 62.0) },
            history(),
            settled,
        )
        assertTrue(result.reason.startsWith("어제 술을 마셨다고 기록하셨어요."))
    }

    @Test
    fun heavyWeekLowersLoadScore() {
        // 최근 7일 220 vs 28일 평균 130 → 1.7배
        val heavy = history { ago, r -> if (ago <= 7) r.copy(activityLoad = 220.0) else r }
        val result = ConditionScoreEngine.score(usualNight(), heavy, settled)
        assertTrue(result.subScores[Metric.ACTIVITY_LOAD]!! < 70)
    }

    @Test
    fun timezoneChangeSkipsRegularity() {
        val result = ConditionScoreEngine.score(usualNight(), history(), settled.copy(daysSinceTimezoneChange = 1))
        assertTrue(Metric.REGULARITY !in result.subScores)
        assertTrue(Badge.JET_LAG in result.badges)
    }

    @Test
    fun deviceChangeRelearnsRecoveryBaseline() {
        // 새 기기는 HRV를 다르게 재서 값이 크게 다릅니다. 바꾼 지 2일이면 회복 지표는 빼고 계산합니다.
        val result = ConditionScoreEngine.score(
            usualNight { it.copy(hrvMs = 80.0) },
            history(),
            settled.copy(daysSinceDeviceChange = 2),
        )
        assertTrue(Badge.RELEARNING in result.badges)
        assertTrue(Metric.HRV !in result.subScores)
    }

    @Test
    fun napsCountUpToOneHour() {
        assertEquals(510, ConditionScoreEngine.totalSleepMinutes(SleepSummary(mainSleepMinutes = 450, napMinutes = 90)))
    }

    @Test
    fun sleepNeedNeverBelowSevenHours() {
        val shortSleeper = history { _, r -> r.copy(sleep = r.sleep!!.copy(mainSleepMinutes = 360)) }
        assertEquals(420.0, ConditionScoreEngine.sleepNeedMinutes(shortSleeper), 1e-9)
    }

    @Test
    fun bandsFollowSpec() {
        assertEquals(Band.PEAK, Band.of(85))
        assertEquals(Band.GOOD, Band.of(70))
        assertEquals(Band.FAIR, Band.of(69))
        assertEquals(Band.LOW, Band.of(30))
        assertEquals(Band.VERY_LOW, Band.of(29))
    }

    @Test
    fun durationText() {
        assertEquals("45분", ReasonText.duration(45))
        assertEquals("2시간", ReasonText.duration(120))
        assertEquals("1시간 10분", ReasonText.duration(70))
    }
}
