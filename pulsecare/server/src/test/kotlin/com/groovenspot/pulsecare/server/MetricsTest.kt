package com.groovenspot.pulsecare.server

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.basicAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.postgresql.ds.PGSimpleDataSource
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

/** 이용 통계와 지표 계산. 실제 Postgres로 돕니다. */
class MetricsTest {
    private val dbUrl = System.getenv("PULSECARE_TEST_DB").orEmpty()
    private val zone = ZoneId.of("Asia/Seoul")
    private val clock = ServerTest.TestClock(LocalDate.of(2027, 3, 1).atTime(9, 0).atZone(zone).toInstant())
    private lateinit var db: Db
    private lateinit var metrics: MetricsService
    private lateinit var services: Services

    @Before
    fun setUp() {
        assumeTrue("PULSECARE_TEST_DB not set", dbUrl.isNotEmpty())
        db = Db(PGSimpleDataSource().apply { setURL(dbUrl) })
        db.tx { exec("drop table if exists events, active_days, signups, forgotten, emergencies, sent, summaries, links, invites, users cascade") }
        db.migrate()
        metrics = MetricsService(db, clock)
        val push = Push { _, _ -> true }
        services = Services(FamilyService(db, push, clock), EmergencyService(db, push, clock), "secret", metrics, "pw")
    }

    private fun run(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) = testApplication {
        application { pulsecare(services) }
        block(createClient { install(ContentNegotiation) { json() } })
    }

    private fun at(day: LocalDate, hour: Int = 9) = day.atTime(LocalTime.of(hour, 0)).atZone(zone).toInstant().toEpochMilli()

    /** 그날로 시계를 옮기고 이벤트 하나를 받습니다 (기기가 그날 보낸 것처럼). */
    private fun send(install: String, day: LocalDate, name: String, props: Map<String, String> = emptyMap()) {
        clock.now = java.time.Instant.ofEpochMilli(at(day, 12))
        metrics.receive(EventBatch(install, "0.1.0", listOf(EventUpload(name, at(day), props))))
    }

    private fun count(table: String) = db.tx { query("select count(*) from $table") { it.getInt(1) }.first() }

    @Test
    fun filtersUnknownEventsPropsAndClockErrors() = run { c ->
        val id = UUID.randomUUID().toString()
        val now = clock.millis()
        val batch = EventBatch(
            id, "0.1.0",
            listOf(
                EventUpload("score_viewed", now, mapOf("surface" to "app", "kind" to "FULL", "score" to "72")),
                EventUpload("chat_message_sent", now),
                EventUpload("app_opened", now - 40L * 24 * 3600 * 1000),
                EventUpload("app_opened", now + 3L * 24 * 3600 * 1000),
            ),
        )
        val r = c.post("/v1/events") { contentType(ContentType.Application.Json); setBody(batch) }
        assertEquals(HttpStatusCode.NoContent, r.status)
        assertEquals(1, count("events"))
        val props = db.tx { query("select props::text from events") { it.getString(1) }.first() }
        assertFalse("점수 값은 저장하지 않습니다", props.contains("72"))
        assertEquals(1, count("active_days"))

        val bad = c.post("/v1/events") { contentType(ContentType.Application.Json); setBody(batch.copy(installId = "me@example.com")) }
        assertEquals(HttpStatusCode.BadRequest, bad.status)
    }

    @Test
    fun activeUsersExcludeAutoMissionsAndNorthStarCountsWeeks() {
        val today = LocalDate.of(2027, 3, 17) // 수요일
        val a = UUID.randomUUID().toString()
        val b = UUID.randomUUID().toString()
        val c = UUID.randomUUID().toString()
        // 지난주(3/8~3/14)에 a는 미션 3번(자동 1번 포함), b는 2번.
        listOf(8, 10, 12).forEachIndexed { i, d ->
            send(a, LocalDate.of(2027, 3, d), "mission_completed", mapOf("mission_id" to "W-01", "auto" to (i == 0).toString()))
        }
        listOf(9, 11).forEach { d -> send(b, LocalDate.of(2027, 3, d), "mission_completed", mapOf("mission_id" to "S-01", "auto" to "false")) }
        // c는 자동 확인만: 활성 아님.
        send(c, today, "mission_completed", mapOf("mission_id" to "W-02", "auto" to "true"))
        send(a, today, "app_opened", mapOf("source" to "notification_morning"))
        send(b, today.minusDays(3), "score_viewed", mapOf("surface" to "tile", "kind" to "FULL"))

        val r = metrics.report(today)
        assertEquals(1, r.dau)
        assertEquals(2, r.wau)
        assertEquals(2, r.mau)
        assertEquals(Rate(1, 2, 0.3), r.northStar)
        assertEquals(Rate(1, 1), r.notificationOpens)
    }

    @Test
    fun cohortsRetentionAndPaidSwitch() {
        val signupDay = LocalDate.of(2027, 3, 1) // 월요일
        val users = List(4) { UUID.randomUUID().toString() }
        users.forEach { send(it, signupDay, "signup_completed", mapOf("via" to "organic")) }
        // 워치 기록: 0, 1은 7일 안, 2는 9일째.
        send(users[0], signupDay.plusDays(1), "data_first_received")
        send(users[1], signupDay.plusDays(6), "data_first_received")
        send(users[2], signupDay.plusDays(9), "data_first_received")
        // 리텐션: 0은 1·7·30일째, 1은 1일째만, 2는 30일째만.
        listOf(1L, 7L, 30L).forEach { send(users[0], signupDay.plusDays(it), "app_opened", mapOf("source" to "icon")) }
        send(users[1], signupDay.plusDays(1), "app_opened", mapOf("source" to "icon"))
        send(users[2], signupDay.plusDays(33), "score_viewed", mapOf("surface" to "app", "kind" to "FULL"))
        // 정식 점수: 0만 10일 안.
        send(users[0], signupDay.plusDays(8), "score_viewed", mapOf("surface" to "app", "kind" to "FULL"))
        // 가족: 3은 가입 3일째 초대 수락.
        send(users[3], signupDay.plusDays(3), "family_invite_accepted", mapOf("role" to "WEARER"))

        // 워치 없는 보호자는 워치 연동률 분모에서 뺍니다.
        val guardian = UUID.randomUUID().toString()
        send(guardian, signupDay, "signup_completed", mapOf("via" to "organic", "mode" to "guardian"))

        // 가입 10일 뒤: 7일 안 워치 연동, 10일 안 첫 점수, 7일 안 초대 수락.
        val early = metrics.report(signupDay.plusDays(10))
        assertEquals(Rate(2, 4, 0.8), early.watchLink)
        assertEquals(1, metrics.report(signupDay.plusDays(1)).guardianSignups30)
        assertEquals(Rate(1, 4, 0.6), early.firstScore)
        assertEquals(Rate(1, 5, 0.5), early.inviteSignups)

        // 주간 코호트는 가입 주 일요일 + 35일이 지나야 30일 리텐션을 냅니다.
        val notYet = metrics.report(signupDay.plusDays(40)).cohorts.single { it.week == signupDay.toString() }
        assertNull(notYet.d30.rate)
        val cohort = metrics.report(signupDay.plusDays(42)).cohorts.single { it.week == signupDay.toString() }
        assertEquals(5, cohort.size)
        assertEquals(Rate(2, 5), cohort.d1)
        assertEquals(Rate(1, 5), cohort.d7)
        assertEquals(Rate(2, 5, 0.3), cohort.d30)

        // 월별: 3월 가입자는 5월 5일 이후에 익습니다. 3개월이 차지 않아 유료 전환 조건은 아직 아님.
        val later = metrics.report(LocalDate.of(2027, 5, 10))
        // 최근 다 익은 3개월. 가입자가 없던 달은 비율 없이 보여 줍니다.
        assertEquals(listOf("2027-01", "2027-02", "2027-03"), later.monthlyRetention.map { it.month })
        assertNull(later.monthlyRetention[0].rate.rate)
        assertEquals(0.4, later.monthlyRetention.last().rate.rate!!, 0.001)
        assertFalse(later.paidSwitchReady)
    }

    @Test
    fun forgetAndRetention() = run { c ->
        val id = UUID.randomUUID().toString()
        send(id, LocalDate.of(2027, 3, 1), "signup_completed")
        send(id, LocalDate.of(2027, 3, 2), "app_opened", mapOf("source" to "icon"))
        assertEquals(HttpStatusCode.NoContent, c.post("/v1/events/forget") { contentType(ContentType.Application.Json); setBody(ForgetRequest(id)) }.status)
        assertEquals(0, count("events"))
        assertEquals(0, count("signups"))
        assertEquals(1, metrics.report(LocalDate.of(2027, 3, 2)).deletions30)

        val old = UUID.randomUUID().toString()
        send(old, LocalDate.of(2027, 3, 3), "app_opened", mapOf("source" to "icon"))
        clock.now = LocalDate.of(2028, 4, 4).atStartOfDay(zone).toInstant()
        metrics.cleanup()
        assertEquals(0, count("events"))
        assertEquals(0, count("active_days"))
    }

    @Test
    fun falseAlarmRatePerSignal() {
        val today = LocalDate.of(2027, 3, 17)
        val a = UUID.randomUUID().toString()
        val g = UUID.randomUUID().toString()
        repeat(4) { send(a, today.minusDays(it.toLong()), "alert_sent", mapOf("signal" to "RESTING_HR_RISE", "recipient" to "self")) }
        send(a, today.minusDays(3), "alert_feedback", mapOf("signal" to "RESTING_HR_RISE", "response" to "false_alarm", "recipient" to "self"))
        send(a, today.minusDays(2), "alert_feedback", mapOf("signal" to "RESTING_HR_RISE", "response" to "ok", "recipient" to "self"))
        send(a, today.minusDays(1), "alert_sent", mapOf("signal" to "LOW_SPO2", "recipient" to "self"))
        send(g, today, "alert_feedback", mapOf("signal" to "ACTIVITY_DROP", "response" to "contacted", "recipient" to "guardian"))
        // 30일보다 오래된 것은 빠집니다.
        send(a, today.minusDays(40), "alert_feedback", mapOf("signal" to "LOW_SPO2", "response" to "false_alarm", "recipient" to "self"))

        val r = metrics.report(today)
        assertEquals(Rate(1, 5, 0.1), r.falseAlarm)
        val rhr = r.alertStats.single { it.signal == "RESTING_HR_RISE" }
        assertEquals(4, rhr.sent)
        assertEquals(1, rhr.ok)
        assertEquals(Rate(1, 4, 0.1), rhr.rate)
        assertEquals(1, r.alertStats.single { it.signal == "ACTIVITY_DROP" }.guardianContacted)
        assertEquals(0, r.alertStats.single { it.signal == "LOW_SPO2" }.falseAlarm)
    }

    @Test
    fun dashboardNeedsPassword() = run { c ->
        assertEquals(HttpStatusCode.Unauthorized, c.get("/admin").status)
        assertEquals(HttpStatusCode.Unauthorized, c.get("/admin") { basicAuth("admin", "nope") }.status)
        val page = c.get("/admin") { basicAuth("admin", "pw") }
        assertEquals(HttpStatusCode.OK, page.status)
        assertTrue(page.bodyAsText().contains("펄스케어 지표"))
        val json: MetricsReport = c.get("/admin/metrics.json?day=2027-03-01") { basicAuth("admin", "pw") }.body()
        assertEquals("2027-03-01", json.day)
    }
}
