package com.groovenspot.pulsecare.alert

import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.DayTag
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

class AlertTest {

    private val today = LocalDate.of(2027, 4, 30)

    private fun days(change: (Int, DailyRecord) -> DailyRecord = { _, r -> r }): List<DailyRecord> =
        (0..28).map { ago ->
            change(
                ago,
                DailyRecord(
                    date = today.minusDays(ago.toLong()),
                    sleep = SleepSummary(mainSleepMinutes = 450 + (ago % 3 - 1) * 10),
                    hrvMs = 50.0 + (ago % 3 - 1) * 2,
                    restingHr = 62.0 + (ago % 3 - 1),
                    steps = 8000 + (ago % 3 - 1) * 500,
                    score = 75,
                ),
            )
        }

    private fun signals(records: List<DailyRecord>, dayIndex: Int = 60) =
        DailySignals.evaluate(records, dayIndex).map { it.signal }.toSet()

    @Test
    fun usualDaysRaiseNothing() {
        assertTrue(signals(days()).isEmpty())
    }

    @Test
    fun restingHrRiseNeedsThreeDays() {
        val two = days { ago, r -> if (ago < 2) r.copy(restingHr = 84.0) else r }
        val three = days { ago, r -> if (ago < 3) r.copy(restingHr = 84.0) else r }
        assertTrue(Signal.RESTING_HR_RISE !in signals(two))
        val d = DailySignals.evaluate(three, 60).single { it.signal == Signal.RESTING_HR_RISE }
        assertEquals(62.0, d.usual!!, 0.5)
        assertEquals("안정시 심박이 3일째 평소보다 높아요(평소 62 → 84). 충분히 쉬고, 계속되면 전문가와 상담해 보세요.", AlertText.forSelf(d).body)
    }

    @Test
    fun activityDropToGuardian() {
        val records = days { ago, r -> if (ago < 3) r.copy(steps = 3000) else r }
        val d = DailySignals.evaluate(records, 60).single { it.signal == Signal.ACTIVITY_DROP }
        assertEquals("엄마의 걸음 수가 3일째 평소의 38% 수준이에요. 안부 전화를 드려보세요.", AlertText.forGuardian(d, "엄마").body)
    }

    @Test
    fun sleepDebtFourOfFive() {
        val records = days { ago, r -> if (ago in listOf(0, 1, 3, 4)) r.copy(sleep = SleepSummary(370)) else r }
        assertTrue(Signal.SLEEP_DEBT in signals(records))
    }

    @Test
    fun stressThreeDaysTwentyPercentLower() {
        val records = days { ago, r -> if (ago < 3) r.copy(hrvMs = 38.0) else r }
        assertTrue(Signal.STRESS in signals(records))
    }

    @Test
    fun lowSpo2ThreeOfSeven() {
        val records = days { ago, r -> if (ago in listOf(0, 2, 5)) r.copy(lowSpo2Repeated = true) else r }
        assertTrue(Signal.LOW_SPO2 in signals(records))
    }

    @Test
    fun noBaselineSignalsInFirstWeek() {
        val records = days { ago, r -> if (ago < 3) r.copy(restingHr = 90.0) else r }
        assertTrue(signals(records, dayIndex = 5).isEmpty())
    }

    @Test
    fun taggedDaysStayOutOfTheBaseline() {
        // 술 마신 날 심박이 높았어도 기준선을 끌어올리지 않습니다.
        val records = days { ago, r ->
            when {
                ago < 3 -> r.copy(restingHr = 73.0)
                ago % 2 == 0 -> r.copy(restingHr = 80.0, tags = setOf(DayTag.ALCOHOL))
                else -> r
            }
        }
        assertTrue(Signal.RESTING_HR_RISE in signals(records))
    }

    private val t0 = Instant.parse("2027-04-30T05:00:00Z")
    private fun hr(min: Int, bpm: Int, moving: Boolean = false, workout: Boolean = false) =
        HrSample(t0.plus(min.toLong(), ChronoUnit.MINUTES), bpm, moving = moving, inWorkout = workout)

    @Test
    fun highHeartRateAtRestForTenMinutes() {
        val nine = (0..9).map { hr(it, 125) }
        val eleven = (0..11).map { hr(it, 125) }
        assertTrue(HeartRateWatch.evaluate(nine).isEmpty())
        assertEquals(Signal.HIGH_HR_AT_REST, HeartRateWatch.evaluate(eleven).single().signal)
    }

    @Test
    fun movingOrWorkoutDoesNotCount() {
        assertTrue(HeartRateWatch.evaluate((0..15).map { hr(it, 140, moving = true) }).isEmpty())
        // 운동 끝나고 10분 안의 높은 심박은 회복 중으로 봅니다.
        val workout = (0..20).map { hr(it, 150, workout = true) } + (21..30).map { hr(it, 125) }
        assertTrue(HeartRateWatch.evaluate(workout).isEmpty())
    }

    private val scheduler = AlertScheduler()
    private fun at(h: Int, m: Int = 0) = LocalDateTime.of(2027, 4, 30, h, m)
    private fun alert(signal: Signal, to: Recipient = Recipient.SELF, usual: Double? = 62.0, current: Double? = 84.0) =
        PendingAlert(Detection(signal, usual, current, days = 3), to, at(10))

    @Test
    fun emergencyIgnoresEverything() {
        val state = DeliveryState(asleep = true)
        assertEquals(Decision.SendNow, scheduler.decide(alert(Signal.FALL), at(3), state))
    }

    @Test
    fun cautionWaitsOutQuietHours() {
        val d = scheduler.decide(alert(Signal.RESTING_HR_RISE), at(23, 30), DeliveryState())
        assertEquals(Decision.SendAt(LocalDateTime.of(2027, 5, 1, 7, 0), "방해 금지 후 전달"), d)
        assertEquals(Decision.SendNow, scheduler.decide(alert(Signal.RESTING_HR_RISE), at(10), DeliveryState()))
    }

    @Test
    fun infoIsBundled() {
        val d = scheduler.decide(alert(Signal.SLEEP_DEBT), at(10), DeliveryState()) as Decision.SendAt
        assertEquals(at(21), d.time)
    }

    @Test
    fun dailyCaps() {
        val sent = listOf(Signal.STRESS, Signal.SLEEP_DEBT, Signal.WATCH_NOT_WORN).map { alert(it) }
        assertTrue(scheduler.decide(alert(Signal.MEDICATION_MISSED), at(10), DeliveryState(sentToday = sent)) is Decision.Drop)
        val cautions = listOf(Signal.LOW_SPO2, Signal.ACTIVITY_DROP).map { alert(it) }
        assertTrue(scheduler.decide(alert(Signal.RESTING_HR_RISE), at(10), DeliveryState(sentToday = cautions)) is Decision.Drop)
    }

    @Test
    fun acknowledgedSignalWaitsADayUnlessWorse() {
        val ack = mapOf(Signal.RESTING_HR_RISE to (at(8) to Detection(Signal.RESTING_HR_RISE, 62.0, 84.0)))
        assertTrue(scheduler.decide(alert(Signal.RESTING_HR_RISE), at(10), DeliveryState(acknowledged = ack)) is Decision.Drop)
        val worse = alert(Signal.RESTING_HR_RISE, current = 90.0)
        assertEquals(Decision.SendNow, scheduler.decide(worse, at(10), DeliveryState(acknowledged = ack)))
    }

    @Test
    fun guardianGetsEveningSummaryExceptActivityDrop() {
        val summary = scheduler.decide(alert(Signal.RESTING_HR_RISE, Recipient.GUARDIAN), at(10), DeliveryState()) as Decision.SendAt
        assertEquals(at(20), summary.time)
        assertEquals(Decision.SendNow, scheduler.decide(alert(Signal.ACTIVITY_DROP, Recipient.GUARDIAN), at(10), DeliveryState()))
    }

    @Test
    fun fallGivesSelfSixtySecondsThenGuardiansOneMinuteApart() {
        val plan = EmergencyEscalation.plan(Signal.FALL, listOf("son", "daughter"))
        assertEquals(
            listOf(0 to EmergencyEscalation.Action.ASK_SELF, 60 to EmergencyEscalation.Action.NOTIFY,
                120 to EmergencyEscalation.Action.NOTIFY, 240 to EmergencyEscalation.Action.NOTIFY_ALL_AGAIN),
            plan.map { it.afterSeconds to it.action },
        )
        // 본인이 30초에 "괜찮아요"를 누르면 보호자에게는 아무것도 가지 않습니다.
        assertEquals(1, EmergencyEscalation.stepsBefore(plan, 30).size)
    }

    @Test
    fun sosGoesStraightToGuardians() {
        val plan = EmergencyEscalation.plan(Signal.SOS, listOf("son"))
        assertEquals(listOf(0, 180), plan.map { it.afterSeconds })
        assertTrue(plan.none { it.action == EmergencyEscalation.Action.ASK_SELF })
    }

    @Test
    fun lockScreenHidesDetails() {
        assertEquals("확인할 알림이 있어요", AlertText.lockScreen(Grade.CAUTION))
        assertEquals("[긴급] 확인이 필요한 알림이 있어요", AlertText.lockScreen(Grade.EMERGENCY))
    }

    @Test
    fun koreanSubjectParticle() {
        assertEquals("가", AlertText.subject("엄마"))
        assertEquals("이", AlertText.subject("아버님"))
        val d = Detection(Signal.FALL)
        assertEquals("[긴급] 엄마가 넘어진 뒤 응답이 없어요. 현재 위치: 서구 ○○동.", AlertText.forGuardian(d, "엄마", "서구 ○○동").body)
    }
}
