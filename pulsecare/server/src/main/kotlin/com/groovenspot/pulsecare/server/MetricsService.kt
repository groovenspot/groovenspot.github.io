package com.groovenspot.pulsecare.server

import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.metrics.EventRules
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.JsonObject
import java.time.Clock
import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import kotlin.math.roundToInt

@Serializable data class EventUpload(val name: String, val at: Long, val props: Map<String, String> = emptyMap())

@Serializable data class EventBatch(val installId: String, val appVersion: String? = null, val events: List<EventUpload>)

@Serializable data class ForgetRequest(val installId: String)

/** 비율 지표: 분자/분모와 목표(가설). 표본이 없으면 rate는 null. */
@Serializable data class Rate(val numerator: Int, val denominator: Int, val target: Double? = null) {
    val rate: Double? get() = if (denominator == 0) null else numerator.toDouble() / denominator
}

@Serializable data class DayCount(val day: String, val count: Int)

@Serializable data class Cohort(val week: String, val size: Int, val d1: Rate, val d7: Rate, val d30: Rate)

@Serializable data class MonthRetention(val month: String, val rate: Rate)

/** 신호별 알림과 응답 (최근 30일). [rate] = 본인이 "잘못된 알림"이라고 한 수 / 본인에게 보낸 수. */
@Serializable data class AlertStat(
    val signal: String,
    val sent: Int,
    val ok: Int,
    val falseAlarm: Int,
    val guardianContacted: Int,
    val guardianFalseAlarm: Int,
    val rate: Rate,
)

@Serializable data class MetricsReport(
    val day: String,
    val dau: Int,
    val wau: Int,
    val mau: Int,
    val dailyActive: List<DayCount>,
    /** 지난주(월~일) 미션 3번 이상 완료한 사람 / 월 활성. */
    val northStar: Rate,
    val watchLink: Rate,
    val firstScore: Rate,
    val familyLink: Rate,
    val inviteSignups: Rate,
    val missionCompletion: Rate,
    val notificationOpens: Rate,
    val signups30: Int,
    val deletions30: Int,
    val cohorts: List<Cohort>,
    /** 유료 전환 조건 (무료 출시 결정): MAU 10만 이상 또는 30일 리텐션 30% 이상이 3개월 연속. */
    val monthlyRetention: List<MonthRetention>,
    val paidSwitchReady: Boolean,
    /** 알림 오탐 신고율 (22번, 목표 10% 이하): 전체와 신호별. */
    val falseAlarm: Rate = Rate(0, 0, FALSE_ALARM_TARGET),
    val alertStats: List<AlertStat> = emptyList(),
)

const val FALSE_ALARM_TARGET = 0.1

/**
 * 이용 통계 받기와 지표 계산 (기획서 22번). 앱이 이벤트 사전에 맞춰 보내도 서버가 다시 거릅니다.
 * 활성 사용자 정의는 [EventRules.isActive] 하나만 씁니다.
 */
class MetricsService(private val db: Db, private val clock: Clock, private val zone: ZoneId = ZoneId.of("Asia/Seoul")) {

    fun receive(batch: EventBatch) {
        if (!INSTALL_ID.matches(batch.installId)) throw ApiError(400, "BAD_INSTALL", "설치 ID 형식이 맞지 않아요")
        if (batch.events.size > EventRules.MAX_BATCH) throw ApiError(413, "TOO_MANY", "한 번에 ${EventRules.MAX_BATCH}개까지 보낼 수 있어요")
        val now = clock.millis()
        val accepted = batch.events.mapNotNull { e ->
            val name = EventName.of(e.name) ?: return@mapNotNull null
            // 너무 오래됐거나 미래 시각은 버립니다 (기기 시계 오류).
            if (e.at < now - MAX_AGE.toMillis() || e.at > now + Duration.ofDays(1).toMillis()) return@mapNotNull null
            Triple(name, e.at, EventRules.clean(name, e.props))
        }
        if (accepted.isEmpty()) return
        db.tx {
            accepted.forEach { (name, at, props) ->
                val day = Instant.ofEpochMilli(at).atZone(zone).toLocalDate()
                val json = Json.encodeToString(JsonObject.serializer(), JsonObject(props.mapValues { JsonPrimitive(it.value) }))
                exec(
                    "insert into events (install_id, name, at, day, props, received_at) values (?, ?, ?, ?, ?::jsonb, ?)",
                    batch.installId, name.key, at, day, json, now,
                )
                if (EventRules.isActive(name, props)) {
                    exec("insert into active_days (install_id, day) values (?, ?) on conflict do nothing", batch.installId, day)
                }
                if (name == EventName.SIGNUP_COMPLETED) {
                    exec("insert into signups (install_id, day) values (?, ?) on conflict do nothing", batch.installId, day)
                }
            }
        }
    }

    /** 앱의 "기록 지우기": 이 설치의 통계를 모두 지우고, 지운 수만 날짜별로 셉니다. */
    fun forget(installId: String) {
        if (!INSTALL_ID.matches(installId)) throw ApiError(400, "BAD_INSTALL", "설치 ID 형식이 맞지 않아요")
        val today = today()
        db.tx {
            exec("delete from events where install_id = ?", installId)
            exec("delete from active_days where install_id = ?", installId)
            exec("delete from signups where install_id = ?", installId)
            if (exec("update forgotten set count = count + 1 where day = ?", today) == 0) {
                exec("insert into forgotten (day, count) values (?, 1)", today)
            }
        }
    }

    /** 13개월 지난 통계는 지웁니다 (처리방침 6번). */
    fun cleanup() {
        val cutoff = today().minusMonths(RETENTION_MONTHS)
        db.tx {
            exec("delete from events where day < ?", cutoff)
            exec("delete from active_days where day < ?", cutoff)
            exec("delete from signups where day < ?", cutoff)
            exec("delete from forgotten where day < ?", cutoff)
        }
    }

    fun report(day: LocalDate = today()): MetricsReport = db.tx {
        fun count(sql: String, vararg args: Any?) = query(sql, *args) { it.getInt(1) }.first()
        fun active(from: LocalDate, to: LocalDate) =
            count("select count(distinct install_id) from active_days where day between ? and ?", from, to)

        val mauFrom = day.minusDays(29)
        val mau = active(mauFrom, day)
        val lastSunday = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY)).let { if (it == day) it.minusDays(7) else it }
        val lastMonday = lastSunday.minusDays(6)

        val northStar = count(
            "select count(*) from (select install_id from events where name = 'mission_completed' and day between ? and ? group by install_id having count(*) >= 3) t",
            lastMonday, lastSunday,
        )

        // 코호트 비율: 가입 [from, to]인 사람 중 조건을 만족한 사람.
        fun cohortRate(from: LocalDate, to: LocalDate, condition: String, target: Double?): Rate {
            val size = count("select count(*) from signups where day between ? and ?", from, to)
            val hit = count("select count(*) from signups s where s.day between ? and ? and $condition", from, to)
            return Rate(hit, size, target)
        }
        val activeBetween = { a: Int, b: Int ->
            "exists (select 1 from active_days a where a.install_id = s.install_id and a.day between s.day + $a and s.day + $b)"
        }

        val watchLink = cohortRate(
            day.minusDays(36), day.minusDays(7),
            "exists (select 1 from events e where e.install_id = s.install_id and e.name = 'data_first_received' and e.day <= s.day + 7)", 0.8,
        )
        val firstScore = cohortRate(
            day.minusDays(39), day.minusDays(10),
            "exists (select 1 from events e where e.install_id = s.install_id and e.name = 'score_viewed' and e.props->>'kind' = 'FULL' and e.day <= s.day + 10)", 0.6,
        )
        val inviteSignups = cohortRate(
            day.minusDays(36), day.minusDays(7),
            "exists (select 1 from events e where e.install_id = s.install_id and e.name = 'family_invite_accepted' and e.day <= s.day + 7)", 0.5,
        )

        val familyLinked = count(
            """select count(distinct a.install_id) from active_days a where a.day between ? and ? and exists (
                 select 1 from events e where e.install_id = a.install_id and (
                   e.name = 'family_invite_accepted' or
                   (e.name = 'family_view_opened' and e.day between ? and ? and
                    (coalesce((e.props->>'wearers')::int, 0) > 0 or coalesce((e.props->>'guardians')::int, 0) > 0))))""",
            mauFrom, day, mauFrom, day,
        )

        val weekFrom = day.minusDays(6)
        val shown = count("select count(*) from events where name = 'mission_shown' and day between ? and ?", weekFrom, day)
        val completed = count("select count(*) from events where name = 'mission_completed' and day between ? and ?", weekFrom, day)
        val opens = count("select count(*) from events where name = 'app_opened' and day between ? and ?", weekFrom, day)
        val fromNotification = count(
            "select count(*) from events where name = 'app_opened' and props->>'source' like 'notification%' and day between ? and ?",
            weekFrom, day,
        )

        // 주간 코호트 (월요일 시작) 최근 8주.
        val thisMonday = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val cohorts = (8 downTo 1).map { w ->
            val monday = thisMonday.minusWeeks(w.toLong())
            val sunday = monday.plusDays(6)
            fun matured(lastDay: Int) = !sunday.plusDays(lastDay.toLong()).isAfter(day)
            val size = count("select count(*) from signups where day between ? and ?", monday, sunday)
            fun r(a: Int, b: Int, target: Double?) =
                if (matured(b)) cohortRate(monday, sunday, activeBetween(a, b), target) else Rate(0, 0, target)
            Cohort(monday.toString(), size, r(1, 1, null), r(7, 7, null), r(29, 35, 0.3))
        }

        // 월별 30일 리텐션: 그 달 가입자 중 29~35일째 활성. 다 익은 달만 (가입 마지막 날 + 35일 <= 오늘).
        val months = generateSequence(day.withDayOfMonth(1).minusMonths(1)) { it.minusMonths(1) }
            .filter { !it.plusMonths(1).minusDays(1).plusDays(35).isAfter(day) }
            .take(3).toList().reversed()
        val monthly = months.map { m ->
            MonthRetention(m.toString().take(7), cohortRate(m, m.plusMonths(1).minusDays(1), activeBetween(29, 35), 0.3))
        }
        val retentionReady = monthly.size == 3 && monthly.all { (it.rate.rate ?: 0.0) >= 0.3 }

        val alertStats = query(
            """select props->>'signal' as signal,
                 count(*) filter (where name = 'alert_sent' and props->>'recipient' = 'self') as sent,
                 count(*) filter (where name = 'alert_feedback' and props->>'recipient' = 'self' and props->>'response' = 'ok') as ok,
                 count(*) filter (where name = 'alert_feedback' and props->>'recipient' = 'self' and props->>'response' = 'false_alarm') as fa,
                 count(*) filter (where name = 'alert_feedback' and props->>'recipient' = 'guardian' and props->>'response' = 'contacted') as gc,
                 count(*) filter (where name = 'alert_feedback' and props->>'recipient' = 'guardian' and props->>'response' = 'false_alarm') as gfa
               from events where name in ('alert_sent', 'alert_feedback') and day between ? and ? and props->>'signal' is not null
               group by 1 order by 1""",
            mauFrom, day,
        ) {
            val sent = it.getInt("sent")
            val fa = it.getInt("fa")
            AlertStat(it.getString("signal"), sent, it.getInt("ok"), fa, it.getInt("gc"), it.getInt("gfa"), Rate(fa, sent, FALSE_ALARM_TARGET))
        }

        MetricsReport(
            day = day.toString(),
            dau = active(day, day),
            wau = active(day.minusDays(6), day),
            mau = mau,
            dailyActive = (29 downTo 0).map { day.minusDays(it.toLong()) }.map { d -> DayCount(d.toString(), active(d, d)) },
            northStar = Rate(northStar, mau, 0.3),
            watchLink = watchLink,
            firstScore = firstScore,
            familyLink = Rate(familyLinked, mau, 0.25),
            inviteSignups = inviteSignups,
            missionCompletion = Rate(completed, shown),
            notificationOpens = Rate(fromNotification, opens),
            signups30 = count("select count(*) from signups where day between ? and ?", mauFrom, day),
            deletions30 = count("select coalesce(sum(count), 0) from forgotten where day between ? and ?", mauFrom, day),
            cohorts = cohorts,
            monthlyRetention = monthly,
            paidSwitchReady = mau >= PAID_MAU || retentionReady,
            falseAlarm = Rate(alertStats.sumOf { it.falseAlarm }, alertStats.sumOf { it.sent }, FALSE_ALARM_TARGET),
            alertStats = alertStats,
        )
    }

    private fun today() = clock.instant().atZone(zone).toLocalDate()

    companion object {
        const val PAID_MAU = 100_000
        const val RETENTION_MONTHS = 13L
        private val MAX_AGE = Duration.ofDays(30)
        private val INSTALL_ID = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")

        fun percent(r: Rate): String = r.rate?.let { "${(it * 100).roundToInt()}%" } ?: "-"
    }
}
