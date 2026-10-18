package com.groovenspot.cardiopacer.sync

import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import org.json.JSONArray
import org.json.JSONObject

/** Wearable Data Layer paths shared by the watch and phone apps. */
object DataPaths {
    /** Single shared item: the current zone profile (last writer wins). */
    const val PROFILE = "/zone_profile"

    /** One item per finished workout: `/workout/<startEpochMillis>`. */
    const val WORKOUT_PREFIX = "/workout/"

    const val KEY_JSON = "json"
}

fun ZoneProfile.toJson(): JSONObject = JSONObject().apply {
    put("age", age)
    restingHeartRate?.let { put("restingHeartRate", it) }
    maxHeartRateOverride?.let { put("maxHeartRateOverride", it) }
    put("method", method.name)
    manualRange?.let {
        put("manualLower", it.lower)
        put("manualUpper", it.upper)
    }
}

fun zoneProfileFromJson(json: JSONObject) = ZoneProfile(
    age = json.getInt("age"),
    restingHeartRate = json.optIntOrNull("restingHeartRate"),
    maxHeartRateOverride = json.optIntOrNull("maxHeartRateOverride"),
    method = runCatching { ZoneProfile.Method.valueOf(json.getString("method")) }
        .getOrDefault(ZoneProfile.Method.AUTOMATIC),
    manualRange = if (json.has("manualLower") && json.has("manualUpper")) {
        ZoneRange.of(json.getInt("manualLower"), json.getInt("manualUpper"))
    } else {
        null
    },
)

/** A finished workout, sent from the watch to the phone for history and Health Connect. */
data class WorkoutRecord(
    val startEpochMillis: Long,
    val endEpochMillis: Long,
    /** `WorkoutActivity` name on the watch: RUNNING, CYCLING or WALKING. */
    val activity: String,
    val summary: WorkoutSummary,
    val savedToHealthConnect: Boolean = false,
) {
    val id: String get() = "cardiopacer-$startEpochMillis"

    fun toJson(): JSONObject = JSONObject().apply {
        put("start", startEpochMillis)
        put("end", endEpochMillis)
        put("activity", activity)
        put("duration", summary.durationMillis)
        put("lower", summary.range.lower)
        put("upper", summary.range.upper)
        summary.averageHeartRate?.let { put("avgHr", it) }
        put("zones", JSONObject().apply {
            summary.zoneMillis.forEach { (zone, millis) -> put(zone.name, millis) }
        })
        put("savedToHealthConnect", savedToHealthConnect)
    }

    companion object {
        fun fromJson(json: JSONObject): WorkoutRecord {
            val zones = json.getJSONObject("zones")
            return WorkoutRecord(
                startEpochMillis = json.getLong("start"),
                endEpochMillis = json.getLong("end"),
                activity = json.getString("activity"),
                summary = WorkoutSummary(
                    durationMillis = json.getLong("duration"),
                    zoneMillis = HeartRateZone.entries
                        .filter { zones.has(it.name) }
                        .associateWith { zones.getLong(it.name) },
                    averageHeartRate = if (json.has("avgHr")) json.getDouble("avgHr") else null,
                    range = ZoneRange(json.getInt("lower"), json.getInt("upper")),
                ),
                savedToHealthConnect = json.optBoolean("savedToHealthConnect", false),
            )
        }

        fun listToJson(records: List<WorkoutRecord>): String =
            JSONArray().apply { records.forEach { put(it.toJson()) } }.toString()

        fun listFromJson(text: String): List<WorkoutRecord> {
            val array = JSONArray(text)
            return (0 until array.length()).mapNotNull { runCatching { fromJson(array.getJSONObject(it)) }.getOrNull() }
        }
    }
}

private fun JSONObject.optIntOrNull(name: String): Int? = if (has(name)) getInt(name) else null
