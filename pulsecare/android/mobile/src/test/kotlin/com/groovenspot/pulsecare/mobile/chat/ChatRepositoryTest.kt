package com.groovenspot.pulsecare.mobile.chat

import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ScoreResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.LocalDate

class ChatRepositoryTest {
    @Test
    fun topicsWithoutSendingText() {
        assertEquals("sleep", ChatRepository.topic("잠이 잘 안 와요"))
        assertEquals("exercise", ChatRepository.topic("오늘 운동해도 될까요?"))
        assertEquals("score", ChatRepository.topic("오늘 점수가 왜 이래요"))
        assertEquals("other", ChatRepository.topic("안녕하세요"))
    }

    @Test
    fun contextHasScreenContentOnly() {
        val home = HomeState(
            date = LocalDate.of(2027, 6, 16),
            dayIndex = 30,
            score = ScoreResult(ScoreResult.Kind.FULL, 48, Band.LOW, "어젯밤 수면이 짧았어요"),
            mission = MissionLibrary["S-01"],
            missionDone = false,
            canSwap = true,
            alerts = emptyList(),
        )
        val c = ChatRepository.context(home)
        assertEquals(48, c.getInt("score"))
        assertEquals("낮음", c.getString("band"))
        assertEquals(setOf("score", "band", "reason", "mission", "goal"), c.keys().asSequence().toSet())
        assertFalse(ChatRepository.context(home.copy(score = ScoreResult(ScoreResult.Kind.NO_DATA, null, null, ""))).has("score"))
    }
}
