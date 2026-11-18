package com.groovenspot.pulsecare.mobile.data

import android.content.Context
import android.content.SharedPreferences
import com.groovenspot.pulsecare.care.DoseLog
import com.groovenspot.pulsecare.care.Medication
import com.groovenspot.pulsecare.score.DayTag
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/**
 * 생활 도우미 기록: 몸 상태 태그, 호흡 가이드, 물, 복약, 취침 알림. 앱 저장소와 같은 파일이라
 * "기록 지우기"를 하면 함께 지워집니다. 기기 밖으로는 나가지 않습니다 (약 이름 포함).
 */
class CareStore(private val prefs: SharedPreferences) {

    /** 기상일별 몸 상태 태그. 빈 집합 = "특별한 일 없었어요"로 남긴 날. 최근 60일. */
    var tags: Map<LocalDate, Set<DayTag>>
        get() = prefs.getString(KEY_TAGS, null)?.let { s ->
            val o = JSONObject(s)
            o.keys().asSequence().mapNotNull { k ->
                runCatching {
                    val a = o.getJSONArray(k)
                    LocalDate.parse(k) to (0 until a.length()).mapNotNull { i -> runCatching { DayTag.valueOf(a.getString(i)) }.getOrNull() }.toSet()
                }.getOrNull()
            }.toMap()
        } ?: emptyMap()
        set(value) {
            val o = JSONObject()
            value.entries.sortedBy { it.key }.takeLast(60).forEach { (d, t) -> o.put(d.toString(), JSONArray(t.map { it.name })) }
            prefs.edit().putString(KEY_TAGS, o.toString()).apply()
        }

    fun setTags(date: LocalDate, value: Set<DayTag>) {
        tags = tags + (date to value)
    }

    /** 호흡 가이드를 끝까지 한 시각. 최근 7일. */
    var breathing: List<LocalDateTime>
        get() = prefs.getString(KEY_BREATHING, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).mapNotNull { runCatching { LocalDateTime.parse(a.getString(it)) }.getOrNull() }
        } ?: emptyList()
        set(value) {
            val cutoff = LocalDate.now().minusDays(7)
            prefs.edit().putString(KEY_BREATHING, JSONArray(value.filter { !it.toLocalDate().isBefore(cutoff) }.map { it.toString() }).toString()).apply()
        }

    fun breathingOn(date: LocalDate) = breathing.filter { it.toLocalDate() == date }

    /** 날짜별 물 잔 수. 최근 7일. */
    var water: Map<LocalDate, Int>
        get() = prefs.getString(KEY_WATER, null)?.let { s ->
            val o = JSONObject(s)
            o.keys().asSequence().mapNotNull { k -> runCatching { LocalDate.parse(k) to o.getInt(k) }.getOrNull() }.toMap()
        } ?: emptyMap()
        set(value) {
            val o = JSONObject()
            value.entries.sortedBy { it.key }.takeLast(7).forEach { (d, n) -> o.put(d.toString(), n) }
            prefs.edit().putString(KEY_WATER, o.toString()).apply()
        }

    var medications: List<Medication>
        get() = prefs.getString(KEY_MEDS, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).mapNotNull { i ->
                runCatching {
                    val o = a.getJSONObject(i)
                    val t = o.getJSONArray("times")
                    Medication(o.getString("id"), o.getString("name"), (0 until t.length()).map { LocalTime.parse(t.getString(it)) })
                }.getOrNull()
            }
        } ?: emptyList()
        set(value) {
            val a = JSONArray()
            value.forEach { m -> a.put(JSONObject().put("id", m.id).put("name", m.name).put("times", JSONArray(m.times.map { it.toString() }))) }
            prefs.edit().putString(KEY_MEDS, a.toString()).apply()
        }

    /** "먹었어요" 기록. 최근 30일. */
    var doseLogs: List<DoseLog>
        get() = prefs.getString(KEY_DOSES, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).mapNotNull { i ->
                runCatching {
                    val o = a.getJSONObject(i)
                    DoseLog(LocalDate.parse(o.getString("date")), o.getString("med"), LocalTime.parse(o.getString("time")), LocalDateTime.parse(o.getString("at")))
                }.getOrNull()
            }
        } ?: emptyList()
        set(value) {
            val cutoff = LocalDate.now().minusDays(30)
            val a = JSONArray()
            value.filter { !it.date.isBefore(cutoff) }.forEach {
                a.put(JSONObject().put("date", it.date.toString()).put("med", it.medicationId).put("time", it.time.toString()).put("at", it.takenAt.toString()))
            }
            prefs.edit().putString(KEY_DOSES, a.toString()).apply()
        }

    fun markTaken(medicationId: String, time: LocalTime, now: LocalDateTime) {
        if (doseLogs.any { it.date == now.toLocalDate() && it.medicationId == medicationId && it.time == time }) return
        doseLogs = doseLogs + DoseLog(now.toLocalDate(), medicationId, time, now)
    }

    /** 취침 알림 (미션 S-01). 기본은 꺼짐: 수면 목표를 고르면 켜자고 권합니다. */
    var bedtimeEnabled: Boolean
        get() = prefs.getBoolean(KEY_BEDTIME_ON, false)
        set(value) = prefs.edit().putBoolean(KEY_BEDTIME_ON, value).apply()

    /** 직접 정한 취침 시각. 없으면 평소 취침 시각(최근 기록)에 맞춥니다. */
    var bedtimeFixed: LocalTime?
        get() = prefs.getString(KEY_BEDTIME_FIXED, null)?.let(LocalTime::parse)
        set(value) = prefs.edit().putString(KEY_BEDTIME_FIXED, value?.toString()).apply()

    /** 마지막으로 계산한 평소 취침 시각 (취침 알림 예약용). */
    var usualBedtime: LocalTime?
        get() = prefs.getString(KEY_USUAL_BEDTIME, null)?.let(LocalTime::parse)
        set(value) = prefs.edit().putString(KEY_USUAL_BEDTIME, value?.toString()).apply()

    companion object {
        private const val KEY_TAGS = "care_tags"
        private const val KEY_BREATHING = "care_breathing"
        private const val KEY_WATER = "care_water"
        private const val KEY_MEDS = "care_medications"
        private const val KEY_DOSES = "care_doses"
        private const val KEY_BEDTIME_ON = "care_bedtime_on"
        private const val KEY_BEDTIME_FIXED = "care_bedtime_fixed"
        private const val KEY_USUAL_BEDTIME = "care_usual_bedtime"

        /** AppStore와 같은 파일 ("기록 지우기"가 함께 지움). */
        fun get(context: Context) = CareStore(context.getSharedPreferences("pulsecare", Context.MODE_PRIVATE))
    }
}
