package com.groovenspot.pulsecare.mobile.family

import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Band
import com.groovenspot.pulsecare.score.ScoreResult
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** 서버가 실제로 돌려주는 모양 (null 필드는 빠짐)을 읽을 수 있는지. */
class ServerApiTest {

    @Test
    fun readsFamilyWithMissingOptionalFields() {
        val json = """{"guardians":[{"person":{"userId":"g1","name":"민지","phone":"01011112222"},"priority":1}],
            "wearers":[{"person":{"userId":"m1","name":"엄마"},
              "today":{"day":"2027-06-16","score":58,"band":"FAIR","missionTitle":"가벼운 산책 15분","missionDone":false,
                "alerts":[{"signal":"ACTIVITY_DROP","title":"엄마 걸음 수 감소","body":"…"}]},
              "emergencies":[{"id":"e1","wearerId":"m1","signal":"SOS","createdAt":1,"status":"ACTIVE","title":"[긴급] 엄마 SOS","body":"b"}]},
             {"person":{"userId":"d1","name":"아빠"},"emergencies":[]}]}"""
        val f = ServerApi.family(JSONObject(json))
        assertEquals("01011112222", f.guardians.single().person.phone)
        val mom = f.wearers[0]
        assertNull(mom.person.phone)
        assertEquals(58, mom.today!!.score)
        assertEquals("엄마 걸음 수 감소", mom.today!!.alerts.single().title)
        assertTrue(mom.emergencies.single().active)
        assertNull(mom.emergencies.single().closedBy)
        assertNull(f.wearers[1].today)

        val noScore = ServerApi.family(JSONObject("""{"guardians":[],"wearers":[{"person":{"userId":"m","name":"엄마"},"today":{"day":"d","missionTitle":"t","missionDone":true}}]}"""))
        assertNull(noScore.wearers.single().today!!.score)
        assertNull(noScore.wearers.single().today!!.band)
    }

    @Test
    fun summaryCarriesScoreMissionAndSignalsOnly() {
        val home = HomeState(
            date = LocalDate.of(2027, 6, 16),
            dayIndex = 30,
            score = ScoreResult(ScoreResult.Kind.FULL, 58, Band.FAIR, "수면이 평소보다 짧았어요"),
            mission = MissionLibrary["C-03"],
            missionDone = true,
            canSwap = false,
            alerts = emptyList(),
            alertDetections = listOf(Detection(Signal.ACTIVITY_DROP, usual = 8000.0, current = 3600.0, days = 3)),
        )
        val j = FamilyRepository.summaryJson(home)
        assertEquals("2027-06-16", j.getString("day"))
        assertEquals(58, j.getInt("score"))
        assertEquals("FAIR", j.getString("band"))
        assertTrue(j.getBoolean("missionDone"))
        assertEquals("ACTIVITY_DROP", j.getJSONArray("signals").getJSONObject(0).getString("signal"))
        // 이유 문장(수면 시간 등 건강 내용)은 보내지 않습니다.
        assertFalse(j.has("reason"))
        val noData = FamilyRepository.summaryJson(home.copy(score = ScoreResult(ScoreResult.Kind.NO_DATA, null, null, "")))
        assertTrue(noData.isNull("score"))
    }
}
