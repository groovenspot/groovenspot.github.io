package com.groovenspot.pulsecare.watch

import com.groovenspot.pulsecare.score.Band
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class WatchTest {
    private val today = LocalDate.of(2027, 6, 16)
    private val w = WatchToday(today, 74, Band.GOOD, "어젯밤 평소보다 잘 회복됐어요", "W-01", "점심 먹고 10분 걷기", missionDone = false)

    @Test
    fun roundTrip() {
        assertEquals(w, WatchContract.decode(WatchContract.encode(w)))
        val noScore = w.copy(score = null, band = null, learningDay = 3, missionDone = true)
        assertEquals(noScore, WatchContract.decode(WatchContract.encode(noScore)))
        assertFalse("score" in WatchContract.encode(noScore))
        assertNull(WatchContract.decode(mapOf("score" to "70")))
    }

    @Test
    fun display() {
        val d = WatchContract.display(w, today)
        assertEquals("74", d.score)
        assertEquals("좋음", d.label)
        assertFalse(d.stale)
        assertEquals("학습 중 3일째", WatchContract.display(w.copy(learningDay = 3), today).label)
        assertEquals("기록 없음", WatchContract.display(w.copy(score = null, band = null), today).label)
        assertEquals("-", WatchContract.display(w.copy(score = null, band = null), today).score)
    }

    @Test
    fun staleAndDisconnected() {
        val old = WatchContract.display(w, today.plusDays(1))
        assertTrue(old.stale)
        assertEquals("어제 기록", old.label)
        val none = WatchContract.display(null, today)
        assertTrue(none.stale)
        assertEquals("휴대폰에서 펄스케어를 열어 주세요", none.reason)
    }

    @Test
    fun sosTextSaysWhetherGuardiansGotIt() {
        assertEquals("보호자 2명에게 알렸어요", WatchContract.sosText(WatchContract.sosSent(2)).first)
        assertEquals("연결된 보호자가 없어요", WatchContract.sosText(WatchContract.sosSent(0)).first)
        assertEquals("보호자에게 보내지 못했어요", WatchContract.sosText(WatchContract.SOS_FAILED).first)
        assertTrue(WatchContract.sosText(WatchContract.SOS_NO_ACCOUNT).second.startsWith("보호자 연결 전이에요"))
        assertEquals("보호자에게 보내는 중이에요.", WatchContract.sosText(null).second)
    }
}
