package com.groovenspot.pulsecare.mobile.data

import android.content.Context
import android.content.SharedPreferences
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLog
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

/** 사용자가 정한 것. */
data class Profile(
    val goal: Goal,
    val signupDate: LocalDate,
    /** 목표별 레벨 (기획서 14번: 레벨은 목표별로 따로). */
    val levels: Map<Goal, Int> = emptyMap(),
    val seniorMode: Boolean = false,
) {
    val level: Int get() = levels[goal] ?: 1
}

/** 오늘 고른 미션. 하루 동안 바뀌지 않고, "다른 미션"은 하루 1번. */
data class TodayMission(val date: LocalDate, val missionId: String, val swapped: Boolean = false, val completed: Boolean = false)

/** 기기 안에만 저장합니다. 건강 수치는 저장하지 않고 Health Connect에서 매번 읽습니다 (점수 숫자와 미션 기록만). */
class AppStore(private val prefs: SharedPreferences) {

    var profile: Profile?
        get() = prefs.getString(KEY_PROFILE, null)?.let(::decodeProfile)
        set(value) = prefs.edit().putString(KEY_PROFILE, value?.let(::encodeProfile)).apply()

    var today: TodayMission?
        get() = prefs.getString(KEY_TODAY, null)?.let { JSONObject(it) }?.let {
            TodayMission(LocalDate.parse(it.getString("date")), it.getString("id"), it.optBoolean("swapped"), it.optBoolean("done"))
        }
        set(value) = prefs.edit().putString(
            KEY_TODAY,
            value?.let {
                JSONObject().put("date", it.date.toString()).put("id", it.missionId)
                    .put("swapped", it.swapped).put("done", it.completed).toString()
            },
        ).apply()

    /** 지난 미션 기록 (오늘 제외). 최근 60일만 둡니다. */
    var missionLogs: List<MissionLog>
        get() = prefs.getString(KEY_LOGS, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).map { a.getJSONObject(it) }
                .map { MissionLog(LocalDate.parse(it.getString("date")), it.getString("id"), it.getBoolean("done")) }
        } ?: emptyList()
        set(value) {
            val a = JSONArray()
            value.sortedBy { it.date }.takeLast(60).forEach {
                a.put(JSONObject().put("date", it.date.toString()).put("id", it.missionId).put("done", it.completed))
            }
            prefs.edit().putString(KEY_LOGS, a.toString()).apply()
        }

    /** 날짜별로 보여준 점수. 수면 필요량(컨디션 좋았던 날의 수면)을 구할 때 씁니다. */
    var scores: Map<LocalDate, Int>
        get() = prefs.getString(KEY_SCORES, null)?.let { s ->
            val o = JSONObject(s)
            o.keys().asSequence().associate { LocalDate.parse(it) to o.getInt(it) }
        } ?: emptyMap()
        set(value) {
            val o = JSONObject()
            value.entries.sortedBy { it.key }.takeLast(60).forEach { o.put(it.key.toString(), it.value) }
            prefs.edit().putString(KEY_SCORES, o.toString()).apply()
        }

    /** 아침 리포트를 보낸 날. 같은 날 두 번 보내지 않습니다. */
    var morningSentOn: LocalDate?
        get() = prefs.getString(KEY_MORNING, null)?.let(LocalDate::parse)
        set(value) = prefs.edit().putString(KEY_MORNING, value?.toString()).apply()

    /** 오늘 보낸 알림 신호 이름. 날짜가 바뀌면 비웁니다. */
    fun sentAlerts(today: LocalDate): Set<String> =
        if (prefs.getString(KEY_ALERT_DAY, null) == today.toString()) prefs.getStringSet(KEY_ALERTS, emptySet())!! else emptySet()

    fun markAlertSent(today: LocalDate, signal: String) {
        prefs.edit().putString(KEY_ALERT_DAY, today.toString()).putStringSet(KEY_ALERTS, sentAlerts(today) + signal).apply()
    }

    companion object {
        private const val KEY_MORNING = "morning_sent_on"
        private const val KEY_ALERT_DAY = "alerts_day"
        private const val KEY_ALERTS = "alerts_sent"
        private const val KEY_PROFILE = "profile"
        private const val KEY_TODAY = "today_mission"
        private const val KEY_LOGS = "mission_logs"
        private const val KEY_SCORES = "scores"

        fun get(context: Context) = AppStore(context.getSharedPreferences("pulsecare", Context.MODE_PRIVATE))

        internal fun encodeProfile(p: Profile): String = JSONObject()
            .put("goal", p.goal.name)
            .put("signup", p.signupDate.toString())
            .put("senior", p.seniorMode)
            .put("levels", JSONObject().apply { p.levels.forEach { (g, l) -> put(g.name, l) } })
            .toString()

        internal fun decodeProfile(s: String): Profile {
            val o = JSONObject(s)
            val levels = o.optJSONObject("levels")?.let { l -> l.keys().asSequence().associate { Goal.valueOf(it) to l.getInt(it) } }
            return Profile(
                goal = Goal.valueOf(o.getString("goal")),
                signupDate = LocalDate.parse(o.getString("signup")),
                levels = levels ?: emptyMap(),
                seniorMode = o.optBoolean("senior"),
            )
        }
    }
}
