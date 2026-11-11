package com.groovenspot.pulsecare.mobile.data

import android.content.Context
import android.content.SharedPreferences
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackEntry
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionProgress
import com.groovenspot.pulsecare.report.WeeklySummary
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime

/** 사용자가 정한 것. */
data class Profile(
    val goal: Goal,
    val signupDate: LocalDate,
    /** 목표별 레벨 (기획서 14번: 레벨은 목표별로 따로). */
    val levels: Map<Goal, Int> = emptyMap(),
    val seniorMode: Boolean = false,
    /** 지금 목표를 고른 날. 4주가 지나면 주간 리포트에 변화 한 줄이 붙습니다. */
    val goalSince: LocalDate = signupDate,
    /** 워치 없이 보호자로만 쓰는 사람: Health Connect를 읽지 않고, 홈은 부모님 카드입니다. */
    val guardianOnly: Boolean = false,
) {
    val level: Int get() = levels[goal] ?: 1
}

/** 오늘 고른 미션. 하루 동안 바뀌지 않고, "다른 미션"은 하루 1번. */
data class TodayMission(
    val date: LocalDate,
    val missionId: String,
    val swapped: Boolean = false,
    val completed: Boolean = false,
    /** 직접 체크하지 않고 워치 기록으로 완료를 확인함. */
    val auto: Boolean = false,
)

/** 기기 안에만 저장합니다. 건강 수치는 저장하지 않고 Health Connect에서 매번 읽습니다 (점수 숫자와 미션 기록만). */
class AppStore(private val prefs: SharedPreferences) {

    var profile: Profile?
        get() = prefs.getString(KEY_PROFILE, null)?.let(::decodeProfile)
        set(value) = prefs.edit().putString(KEY_PROFILE, value?.let(::encodeProfile)).apply()

    var today: TodayMission?
        get() = prefs.getString(KEY_TODAY, null)?.let { JSONObject(it) }?.let {
            TodayMission(
                LocalDate.parse(it.getString("date")),
                it.getString("id"),
                it.optBoolean("swapped"),
                it.optBoolean("done"),
                it.optBoolean("auto"),
            )
        }
        set(value) = prefs.edit().putString(
            KEY_TODAY,
            value?.let {
                JSONObject().put("date", it.date.toString()).put("id", it.missionId)
                    .put("swapped", it.swapped).put("done", it.completed).put("auto", it.auto).toString()
            },
        ).apply()

    /** 지난 미션 기록 (오늘 제외). 최근 60일만 둡니다. */
    var missionLogs: List<MissionLog>
        get() = prefs.getString(KEY_LOGS, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).map { a.getJSONObject(it) }
                .map { MissionLog(LocalDate.parse(it.getString("date")), it.getString("id"), it.getBoolean("done"), it.optBoolean("auto")) }
        } ?: emptyList()
        set(value) {
            val a = JSONArray()
            value.sortedBy { it.date }.takeLast(60).forEach {
                a.put(JSONObject().put("date", it.date.toString()).put("id", it.missionId).put("done", it.completed).put("auto", it.auto))
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

    var settings: NotificationSettings
        get() = prefs.getString(KEY_SETTINGS, null)?.let(NotificationSettings::decode) ?: NotificationSettings()
        set(value) = prefs.edit().putString(KEY_SETTINGS, NotificationSettings.encode(value)).apply()

    /** "기록 지우기": 이 휴대폰에 저장한 펄스케어 기록을 모두 지웁니다 (Health Connect 데이터는 그대로). */
    fun clear() = prefs.edit().clear().apply()

    var eveningSentOn: LocalDate?
        get() = prefs.getString(KEY_EVENING, null)?.let(LocalDate::parse)
        set(value) = prefs.edit().putString(KEY_EVENING, value?.toString()).apply()

    /** 저녁 요약에서 "내일 다시"를 고르면 다음 날 같은 미션을 줍니다. */
    var retry: Pair<LocalDate, String>?
        get() = prefs.getString(KEY_RETRY, null)?.split("|")?.let { LocalDate.parse(it[0]) to it[1] }
        set(value) = prefs.edit().putString(KEY_RETRY, value?.let { "${it.first}|${it.second}" }).apply()

    fun retryFor(date: LocalDate): String? = retry?.takeIf { it.first == date }?.second

    /** 아직 홈에서 확인하지 않은 주간 리포트. */
    var weekly: WeeklySummary?
        get() = prefs.getString(KEY_WEEKLY, null)?.let(::decodeWeekly)
        set(value) = prefs.edit().putString(KEY_WEEKLY, value?.let(::encodeWeekly)).apply()

    /** 가족 서버 계정 (사용자 ID, 토큰). 가족 탭에서 처음 시작할 때 만듭니다. */
    var account: Pair<String, String>?
        get() = prefs.getString(KEY_ACCOUNT, null)?.split("|")?.let { it[0] to it[1] }
        set(value) = prefs.edit().putString(KEY_ACCOUNT, value?.let { "${it.first}|${it.second}" }).apply()

    /** 마지막으로 본 내 보호자 수. 0이면 하루 요약을 올리지 않습니다. */
    var guardianCount: Int
        get() = prefs.getInt(KEY_GUARDIANS, 0)
        set(value) = prefs.edit().putInt(KEY_GUARDIANS, value).apply()

    /** 보호자 수를 서버에 마지막으로 확인한 날 (보호자가 0명일 때 하루 한 번). */
    var guardianCheckedOn: LocalDate?
        get() = prefs.getString("guardian_checked_on", null)?.let(LocalDate::parse)
        set(value) = prefs.edit().putString("guardian_checked_on", value?.toString()).apply()

    /** FCM 토큰. 계정을 만들기 전에 받으면 여기 두었다가 올립니다. */
    var pushToken: String?
        get() = prefs.getString(KEY_PUSH, null)
        set(value) = prefs.edit().putString(KEY_PUSH, value).apply()

    /** 동의한 약관 버전과 시각 (동의 기록). 0이면 아직 동의하지 않음. */
    var consentVersion: Int
        get() = prefs.getInt(KEY_CONSENT_VERSION, 0)
        set(value) = prefs.edit().putInt(KEY_CONSENT_VERSION, value).putLong(KEY_CONSENT_AT, System.currentTimeMillis()).apply()

    val consentAt: Long get() = prefs.getLong(KEY_CONSENT_AT, 0)

    /** AI 상담 안내(국외 전송)에 동의함. */
    var chatConsent: Boolean
        get() = prefs.getBoolean("chat_consent", false)
        set(value) = prefs.edit().putBoolean("chat_consent", value).apply()

    /** 이용 통계 선택 동의. */
    var analyticsConsent: Boolean
        get() = prefs.getBoolean(KEY_ANALYTICS, false)
        set(value) = prefs.edit().putBoolean(KEY_ANALYTICS, value).apply()

    /** 계정과 분리된 무작위 설치 ID. "기록 지우기" 후에는 새로 만듭니다. */
    val installId: String
        get() = prefs.getString(KEY_INSTALL, null) ?: java.util.UUID.randomUUID().toString().also {
            prefs.edit().putString(KEY_INSTALL, it).apply()
        }

    fun lastDailyEvent(name: String, key: String): String? = prefs.getString("ev_daily_${name}_$key", null)
    fun setLastDailyEvent(name: String, key: String, mark: String) = prefs.edit().putString("ev_daily_${name}_$key", mark).apply()
    fun onceSent(name: String): Boolean = prefs.getBoolean("ev_once_$name", false)
    fun markOnce(name: String) = prefs.edit().putBoolean("ev_once_$name", true).apply()

    /** 내가 한 알림 응답 (최근 30일). 같은 신호를 24시간 다시 알리지 않기, 7일 쉬기 제안에 씁니다. */
    var alertFeedback: List<FeedbackEntry>
        get() = prefs.getString(KEY_FEEDBACK, null)?.let { s ->
            val a = JSONArray(s)
            (0 until a.length()).mapNotNull { i ->
                runCatching {
                    val o = a.getJSONObject(i)
                    FeedbackEntry(
                        LocalDateTime.parse(o.getString("at")),
                        Detection(
                            Signal.valueOf(o.getString("signal")),
                            o.optDouble("usual").takeUnless { it.isNaN() },
                            o.optDouble("current").takeUnless { it.isNaN() },
                            o.optInt("days", -1).takeIf { it >= 0 },
                        ),
                        FeedbackResponse.valueOf(o.getString("response")),
                    )
                }.getOrNull()
            }
        } ?: emptyList()
        set(value) {
            val cutoff = LocalDateTime.now().minusDays(30)
            val a = JSONArray()
            value.filter { it.at.isAfter(cutoff) }.forEach { e ->
                a.put(
                    JSONObject().put("at", e.at.toString()).put("signal", e.detection.signal.name).put("response", e.response.name).apply {
                        e.detection.usual?.let { put("usual", it) }
                        e.detection.current?.let { put("current", it) }
                        e.detection.days?.let { put("days", it) }
                    },
                )
            }
            prefs.edit().putString(KEY_FEEDBACK, a.toString()).apply()
        }

    /** 쉬는 중인 신호와 끝나는 날. */
    var snoozedSignals: Map<Signal, LocalDate>
        get() = signalMap(KEY_SNOOZED, LocalDate::parse)
        set(value) = putSignalMap(KEY_SNOOZED, value)

    /** "계속 받기"를 고른 시각 (그 뒤 새 오탐이 없으면 다시 묻지 않음). */
    var snoozeDeclined: Map<Signal, LocalDateTime>
        get() = signalMap(KEY_DECLINED, LocalDateTime::parse)
        set(value) = putSignalMap(KEY_DECLINED, value)

    private fun <T> signalMap(key: String, parse: (String) -> T): Map<Signal, T> = prefs.getString(key, null)?.let { s ->
        val o = JSONObject(s)
        o.keys().asSequence().mapNotNull { k -> runCatching { Signal.valueOf(k) to parse(o.getString(k)) }.getOrNull() }.toMap()
    } ?: emptyMap()

    private fun putSignalMap(key: String, value: Map<Signal, Any>) =
        prefs.edit().putString(key, JSONObject().apply { value.forEach { (k, v) -> put(k.name, v.toString()) } }.toString()).apply()

    companion object {
        private const val KEY_FEEDBACK = "alert_feedback"
        private const val KEY_SNOOZED = "alert_snoozed"
        private const val KEY_DECLINED = "alert_snooze_declined"
        private const val KEY_ANALYTICS = "analytics_consent"
        private const val KEY_INSTALL = "install_id"
        private const val KEY_CONSENT_VERSION = "consent_version"
        private const val KEY_CONSENT_AT = "consent_at"
        private const val KEY_ACCOUNT = "family_account"
        private const val KEY_GUARDIANS = "family_guardians"
        private const val KEY_PUSH = "push_token"
        private const val KEY_SETTINGS = "notification_settings"
        private const val KEY_EVENING = "evening_sent_on"
        private const val KEY_RETRY = "retry_mission"
        private const val KEY_WEEKLY = "weekly_summary"
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
            .put("goalSince", p.goalSince.toString())
            .put("guardianOnly", p.guardianOnly)
            .put("levels", JSONObject().apply { p.levels.forEach { (g, l) -> put(g.name, l) } })
            .toString()

        internal fun encodeWeekly(w: WeeklySummary): String = JSONObject()
            .put("weekEnd", w.weekEnd.toString())
            .put("goal", w.goal.name)
            .put("daysDone", w.daysDone)
            .put("badge", w.badge)
            .put("points", w.points)
            .put("level", w.levelChange.name)
            .put("nextLevel", w.nextLevel)
            .put("change", w.change ?: "")
            .put("goalChange", w.suggestGoalChange)
            .toString()

        internal fun decodeWeekly(s: String): WeeklySummary {
            val o = JSONObject(s)
            return WeeklySummary(
                weekEnd = LocalDate.parse(o.getString("weekEnd")),
                goal = Goal.valueOf(o.getString("goal")),
                daysDone = o.getInt("daysDone"),
                badge = o.getBoolean("badge"),
                points = o.getInt("points"),
                levelChange = MissionProgress.LevelChange.valueOf(o.getString("level")),
                nextLevel = o.getInt("nextLevel"),
                change = o.optString("change").takeIf { it.isNotEmpty() },
                suggestGoalChange = o.getBoolean("goalChange"),
            )
        }

        internal fun decodeProfile(s: String): Profile {
            val o = JSONObject(s)
            val levels = o.optJSONObject("levels")?.let { l -> l.keys().asSequence().associate { Goal.valueOf(it) to l.getInt(it) } }
            val signup = LocalDate.parse(o.getString("signup"))
            return Profile(
                goal = Goal.valueOf(o.getString("goal")),
                signupDate = signup,
                goalSince = o.optString("goalSince").takeIf { it.isNotEmpty() }?.let(LocalDate::parse) ?: signup,
                levels = levels ?: emptyMap(),
                seniorMode = o.optBoolean("senior"),
                guardianOnly = o.optBoolean("guardianOnly"),
            )
        }
    }
}
