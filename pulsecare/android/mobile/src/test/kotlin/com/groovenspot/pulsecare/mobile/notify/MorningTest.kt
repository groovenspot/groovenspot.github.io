package com.groovenspot.pulsecare.mobile.notify

import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.today.MorningReport
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

class MorningTest {
    private val date = LocalDate.of(2027, 6, 16)

    private fun home(score: ScoreResult) = HomeState(
        date = date,
        dayIndex = 40,
        score = score,
        mission = MissionLibrary["W-01"],
        missionDone = false,
        canSwap = true,
        alerts = emptyList(),
    )

    @Test
    fun reportText() {
        val text = MorningReport.of(
            home(ScoreResult(ScoreResult.Kind.FULL, 78, Band.GOOD, "자율신경이 평소보다 잘 회복됐어요")),
        )
        assertEquals("오늘 컨디션 78점 · 좋음", text.title)
        assertEquals("자율신경이 평소보다 잘 회복됐어요\n오늘의 미션: 점심 먹고 10분 걷기", text.body)
    }

    @Test
    fun noDataAsksForFeeling() {
        val text = MorningReport.of(home(ScoreResult(ScoreResult.Kind.NO_DATA, null, null, "")))
        assertEquals("어젯밤 기록이 없어요", text.title)
    }

    @Test
    fun lockScreenShowsNoNumbers() {
        assertFalse(MorningReport.PUBLIC.any { it.isDigit() })
        assertEquals("확인할 알림이 있어요", MorningReport.CAUTION_PUBLIC)
    }

    @Test
    fun nextSevenThirty() {
        val at = LocalTime.of(7, 30)
        assertEquals(Duration.ofMinutes(30), DailyJob.delayUntilNext(LocalDateTime.of(2027, 6, 16, 7, 0), at))
        assertEquals(Duration.ofHours(24), DailyJob.delayUntilNext(LocalDateTime.of(2027, 6, 16, 7, 30), at))
        assertEquals(Duration.ofHours(23), DailyJob.delayUntilNext(LocalDateTime.of(2027, 6, 16, 8, 30), at))
    }
}
