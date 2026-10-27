package com.groovenspot.pulsecare.mobile.health

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

class NightMapperTest {
    private val zone = ZoneId.of("Asia/Seoul")
    private val date = LocalDate.of(2027, 4, 30)
    private fun at(day: LocalDate, h: Int, m: Int = 0) = day.atTime(h, m).atZone(zone).toInstant()
    private val yesterday = date.minusDays(1)

    @Test
    fun mainSleepWithStages() {
        val night = RawSleep(
            at(yesterday, 23, 30),
            at(date, 7, 0),
            listOf(
                RawStage(at(yesterday, 23, 30), at(yesterday, 23, 50), StageType.AWAKE),
                RawStage(at(yesterday, 23, 50), at(date, 1, 20), StageType.DEEP),
                RawStage(at(date, 1, 20), at(date, 5, 0), StageType.LIGHT),
                RawStage(at(date, 5, 0), at(date, 7, 0), StageType.REM),
            ),
        )
        val raw = RawHealth(
            sleep = listOf(night),
            hrv = listOf(Sample(at(date, 3), 48.0), Sample(at(date, 4), 52.0), Sample(at(date, 12), 20.0)),
            restingHr = listOf(Sample(at(date, 8), 58.0)),
            steps = mapOf(yesterday to 8123L, date to 400L),
        )
        val r = NightMapper.day(raw, date, zone)
        val sleep = r.sleep!!
        assertEquals(430, sleep.mainSleepMinutes) // 450분 중 깨어 있던 20분 제외
        assertEquals(430.0 / 450.0, sleep.efficiency!!, 1e-9)
        assertEquals(90.0 / 430.0, sleep.deepRatio!!, 1e-9)
        assertEquals(LocalTime.of(23, 30), sleep.bedtime)
        assertEquals(50.0, r.hrvMs!!, 1e-9) // 낮 12시 값은 수면 밖이라 제외
        assertEquals(58.0, r.restingHr!!, 1e-9)
        assertEquals(8123, r.steps) // 전날 하루 걸음
    }

    @Test
    fun longestBlockIsMainSleepAndNapsAreSeparate() {
        val raw = RawHealth(
            sleep = listOf(
                RawSleep(at(yesterday, 14), at(yesterday, 14, 40)), // 낮잠 40분
                RawSleep(at(date, 1), at(date, 3)), // 깼다가
                RawSleep(at(date, 3, 30), at(date, 8)), // 본 수면 4시간 30분
            ),
        )
        val sleep = NightMapper.day(raw, date, zone).sleep!!
        assertEquals(270, sleep.mainSleepMinutes)
        assertEquals(40, sleep.napMinutes)
        assertNull(sleep.efficiency) // 단계 기록이 없으면 효율을 모릅니다
    }

    @Test
    fun noSleepMeansWatchNotWorn() {
        assertNull(NightMapper.day(RawHealth(), date, zone).sleep)
    }

    @Test
    fun repeatedLowSpo2() {
        val night = RawSleep(at(yesterday, 23), at(date, 7))
        val twice = listOf(Sample(at(date, 2), 88.0), Sample(at(date, 2, 2), 87.0), Sample(at(date, 4), 89.0), Sample(at(date, 5), 96.0))
        val once = listOf(Sample(at(date, 2), 88.0), Sample(at(date, 5), 96.0))
        assertTrue(NightMapper.day(RawHealth(sleep = listOf(night), spo2 = twice), date, zone).lowSpo2Repeated!!)
        assertEquals(false, NightMapper.day(RawHealth(sleep = listOf(night), spo2 = once), date, zone).lowSpo2Repeated)
    }

    @Test
    fun mapsEveryDay() {
        assertEquals(30, NightMapper.map(RawHealth(), date.minusDays(29), date, zone).size)
    }
}
