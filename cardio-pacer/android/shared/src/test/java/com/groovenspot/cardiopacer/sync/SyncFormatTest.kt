package com.groovenspot.cardiopacer.sync

import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class SyncFormatTest {
    @Test
    fun profileRoundTrip() {
        val profiles = listOf(
            ZoneProfile(age = 35),
            ZoneProfile(age = 42, restingHeartRate = 55, maxHeartRateOverride = 185),
            ZoneProfile(age = 30, method = ZoneProfile.Method.MANUAL, manualRange = ZoneRange(128, 142)),
        )
        for (profile in profiles) {
            assertEquals(profile, zoneProfileFromJson(JSONObject(profile.toJson().toString())))
        }
    }

    @Test
    fun unknownMethodFallsBackToAutomatic() {
        val json = JSONObject().put("age", 40).put("method", "SOMETHING_NEW")
        assertEquals(ZoneProfile.Method.AUTOMATIC, zoneProfileFromJson(json).method)
    }

    @Test
    fun workoutRoundTrip() {
        val record = WorkoutRecord(
            startEpochMillis = 1_760_000_000_000,
            endEpochMillis = 1_760_002_712_000,
            activity = "RUNNING",
            summary = WorkoutSummary(
                durationMillis = 2_712_000,
                zoneMillis = mapOf(HeartRateZone.BELOW to 270_000L, HeartRateZone.TARGET to 2_224_000L),
                averageHeartRate = 138.4,
                range = ZoneRange(130, 145),
            ),
        )
        val list = WorkoutRecord.listFromJson(WorkoutRecord.listToJson(listOf(record, record.copy(savedToHealthConnect = true))))
        assertEquals(listOf(record, record.copy(savedToHealthConnect = true)), list)
        assertEquals("cardiopacer-1760000000000", record.id)
    }

    @Test
    fun corruptHistoryEntriesAreSkipped() {
        assertEquals(0, WorkoutRecord.listFromJson("""[{"start": 1}]""").size)
    }
}
