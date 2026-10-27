package com.groovenspot.pulsecare.mobile.today

import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.DayActivity
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.data.TodayMission
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.ScoreResult
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class TodayPlannerTest {
    private val today = LocalDate.of(2027, 4, 30)
    private val profile = Profile(Goal.SLEEP, signupDate = today.minusDays(40))
    private val planner = TodayPlanner()

    private fun records(todaySleep: Int? = 450) = (0..29).map { ago ->
        val w = ago % 3 - 1
        DailyRecord(
            date = today.minusDays(ago.toLong()),
            sleep = if (ago == 0 && todaySleep == null) null else SleepSummary(
                mainSleepMinutes = if (ago == 0) todaySleep!! else 450 + w * 10,
                efficiency = 0.9,
                bedtime = LocalTime.of(23, 30).plusMinutes(w * 10L),
            ),
            hrvMs = 50.0 + w * 2,
            restingHr = 58.0 + w,
            steps = 8000 + w * 400,
        )
    }

    @Test
    fun ordinaryMorning() {
        val plan = planner.plan(today, records(), profile, stored = null, logs = emptyList(), scores = emptyMap())
        val home = plan.home
        assertEquals(ScoreResult.Kind.FULL, home.score.kind)
        assertTrue(home.score.score!! in 60..80)
        assertEquals(41, home.dayIndex)
        assertFalse(home.learning)
        assertTrue(home.canSwap)
        assertEquals(home.score.score, plan.scores[today])
        assertTrue(home.alerts.isEmpty())
    }

    @Test
    fun sameDaySameMission() {
        val first = planner.plan(today, records(), profile, null, emptyList(), emptyMap())
        val again = planner.plan(today, records(), profile, first.today, emptyList(), first.scores)
        assertEquals(first.today.missionId, again.home.mission.id)
    }

    @Test
    fun yesterdaysMissionMovesToHistory() {
        val yesterday = TodayMission(today.minusDays(1), "S-02", completed = true)
        val plan = planner.plan(today, records(), profile, yesterday, emptyList(), emptyMap())
        assertEquals(listOf(MissionLog(today.minusDays(1), "S-02", true)), plan.logs)
        assertEquals(today, plan.today.date)
    }

    @Test
    fun swapOnlyOnce() {
        val plan = planner.plan(today, records(), profile, null, emptyList(), emptyMap())
        val swapped = planner.swap(plan.home, plan.today, profile, plan.logs)
        assertNotEquals(plan.today.missionId, swapped.missionId)
        assertTrue(swapped.swapped)
        assertEquals(swapped, planner.swap(plan.home, swapped, profile, plan.logs))
    }

    @Test
    fun noWatchUsesFeeling() {
        val plan = planner.plan(today, records(todaySleep = null), profile, null, emptyList(), emptyMap(), feeling = 1)
        assertEquals(ScoreResult.Kind.NO_DATA, plan.home.score.kind)
        assertEquals(Goal.LOW_DAY, plan.home.mission.goal)
        assertFalse(plan.scores.containsKey(today))
    }

    @Test
    fun firstDaysAreLearning() {
        val newcomer = profile.copy(signupDate = today.minusDays(1))
        val home = planner.plan(today, records().take(2), newcomer, null, emptyList(), emptyMap()).home
        assertEquals(2, home.dayIndex)
        assertTrue(home.learning)
        assertEquals(ScoreResult.Kind.SLEEP_ONLY, home.score.kind)
    }

    @Test
    fun raisedRestingHeartRateShowsAlertAndCapsScore() {
        val raised = records().map { if (it.date >= today.minusDays(2)) it.copy(restingHr = 72.0) else it }
        val home = planner.plan(today, raised, profile, null, emptyList(), emptyMap()).home
        assertEquals("안정시 심박 상승", home.alerts.single().title)
        assertTrue(home.score.score!! <= 60)
    }

    @Test
    fun stepMissionCompletesFromWatchData() {
        val weight = profile.copy(goal = Goal.WEIGHT)
        val stored = TodayMission(today, "W-02")
        val walked = DayActivity(today, stepsByHour = mapOf(9 to 4_000L, 13 to 3_500L))
        val plan = planner.plan(
            today, records(), weight, stored, emptyList(), emptyMap(),
            activities = mapOf(today to walked), now = today.atTime(15, 0),
        )
        assertTrue(plan.today.completed)
        assertEquals(Check.DONE, plan.home.missionCheck)
    }

    @Test
    fun lastNightFinishesYesterdaysBedtimeMission() {
        val yesterday = today.minusDays(1)
        val stored = TodayMission(yesterday, "S-06")
        val early = DayActivity(
            yesterday,
            usualBedtime = LocalTime.of(23, 30),
            nightBedtime = yesterday.atTime(22, 45),
        )
        val plan = planner.plan(
            today, records(), profile, stored, emptyList(), emptyMap(),
            activities = mapOf(yesterday to early), now = today.atTime(7, 30),
        )
        assertEquals(listOf(MissionLog(yesterday, "S-06", true)), plan.logs)
    }

    @Test
    fun retryTomorrowKeepsTheSameMission() {
        val plan = planner.plan(today, records(), profile, null, emptyList(), emptyMap(), retryMissionId = "S-05")
        assertEquals("S-05", plan.today.missionId)
    }

    @Test
    fun lowDayOverridesRetry() {
        val plan = planner.plan(today, records(todaySleep = null), profile, null, emptyList(), emptyMap(), feeling = 1, retryMissionId = "S-05")
        assertEquals(Goal.LOW_DAY, plan.home.mission.goal)
    }

    @Test
    fun weeklyRoundTrip() {
        val w = com.groovenspot.pulsecare.report.WeeklySummary(
            today, Goal.SLEEP, 5, true, 60, com.groovenspot.pulsecare.mission.MissionProgress.LevelChange.SUGGEST_UP, 2,
            "4주 전보다 평균 수면이 22분 늘었어요", false,
        )
        assertEquals(w, AppStore.decodeWeekly(AppStore.encodeWeekly(w)))
        assertEquals(null, AppStore.decodeWeekly(AppStore.encodeWeekly(w.copy(change = null))).change)
    }

    @Test
    fun profileRoundTrip() {
        val p = Profile(Goal.STRESS, today, levels = mapOf(Goal.STRESS to 2, Goal.SLEEP to 3), seniorMode = true, goalSince = today.plusDays(3))
        assertEquals(p, AppStore.decodeProfile(AppStore.encodeProfile(p)))
        assertNotNull(p.level)
    }
}
