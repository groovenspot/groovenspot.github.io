package com.groovenspot.pulsecare.server

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.postgresql.ds.PGSimpleDataSource
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** 실제 Postgres로 돕니다. PULSECARE_TEST_DB가 없으면 건너뜁니다. */
class ServerTest {

    class TestClock(var now: Instant) : Clock() {
        override fun getZone(): ZoneId = ZoneOffset.UTC
        override fun withZone(zone: ZoneId?) = this
        override fun instant() = now
        fun advance(seconds: Long) {
            now = now.plusSeconds(seconds)
        }
    }

    class Sent(val token: String, val message: PushMessage)

    private val dbUrl = System.getenv("PULSECARE_TEST_DB").orEmpty()
    // 2027-06-16 10:00 KST
    private val clock = TestClock(Instant.parse("2027-06-16T01:00:00Z"))
    private val pushes = mutableListOf<Sent>()
    private lateinit var services: Services

    @Before
    fun setUp() {
        assumeTrue("PULSECARE_TEST_DB not set", dbUrl.isNotEmpty())
        val ds = PGSimpleDataSource().apply { setURL(dbUrl) }
        val db = Db(ds)
        db.tx { exec("drop table if exists emergencies, sent, summaries, links, invites, users cascade") }
        db.migrate()
        val push = Push { token, m -> pushes += Sent(token, m); true }
        services = Services(FamilyService(db, push, clock), EmergencyService(db, push, clock), "secret")
    }

    private fun run(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) = testApplication {
        application { pulsecare(services) }
        val client = createClient { install(ContentNegotiation) { json() } }
        block(client)
    }

    private class User(val id: String, val token: String)

    private suspend fun HttpClient.signUp(name: String, push: String? = "push-$name"): User {
        val r: SignUpResponse = post("/v1/users") { json(SignUpRequest(name)) }.body()
        if (push != null) put("/v1/me") { auth(r.token); json(UpdateMe(pushToken = push, phone = "010-1234-5678")) }
        return User(r.userId, r.token)
    }

    private fun io.ktor.client.request.HttpRequestBuilder.auth(token: String) = header("Authorization", "Bearer $token")

    private inline fun <reified T> io.ktor.client.request.HttpRequestBuilder.json(body: T) {
        contentType(ContentType.Application.Json)
        setBody(body)
    }

    /** 보호자(딸)가 부모님(엄마)을 초대하고 엄마가 수락. */
    private suspend fun HttpClient.linked(vararg guardianNames: String): Pair<User, List<User>> {
        val mom = signUp("엄마")
        val guardians = guardianNames.map { name ->
            val g = signUp(name)
            val invite: InviteResponse = post("/v1/invites") { auth(g.token); json(InviteRequest(Role.GUARDIAN)) }.body()
            val r = post("/v1/invites/accept") { auth(mom.token); json(AcceptRequest(invite.code.lowercase())) }
            assertEquals(HttpStatusCode.OK, r.status)
            g
        }
        pushes.clear()
        return mom to guardians
    }

    private suspend fun HttpClient.family(u: User): Family = get("/v1/family") { auth(u.token) }.body()

    private suspend fun HttpResponse.error(): String = body<ErrorBody>().error

    @Test
    fun needsToken() = run { c ->
        assertEquals(HttpStatusCode.Unauthorized, c.get("/v1/me").status)
        assertEquals(HttpStatusCode.Unauthorized, c.get("/v1/me") { auth("nope") }.status)
        val u = c.signUp("민지")
        val me: Me = c.get("/v1/me") { auth(u.token) }.body()
        assertEquals("민지", me.name)
        assertEquals("01012345678", me.phone)
    }

    @Test
    fun inviteLinksAndNotifiesInviter() = run { c ->
        val daughter = c.signUp("민지")
        val mom = c.signUp("엄마")
        val invite: InviteResponse = c.post("/v1/invites") { auth(daughter.token); json(InviteRequest(Role.GUARDIAN)) }.body()
        assertEquals(8, invite.code.length)
        val preview: InvitePreview = c.get("/v1/invites/${invite.code.lowercase()}") { auth(mom.token) }.body()
        assertEquals(InvitePreview("민지", Role.GUARDIAN), preview)

        val f: Family = c.post("/v1/invites/accept") { auth(mom.token); json(AcceptRequest(invite.code)) }.body()
        assertEquals(listOf("민지"), f.guardians.map { it.person.name })
        assertEquals("엄마님과 연결됐어요", pushes.single { it.token == "push-민지" }.message.title)
        assertEquals(listOf("엄마"), c.family(daughter).wearers.map { it.person.name })

        // 한 번만, 내 코드는 못 씀, 기한 7일.
        assertEquals("INVITE_INVALID", c.post("/v1/invites/accept") { auth(mom.token); json(AcceptRequest(invite.code)) }.error())
        val own: InviteResponse = c.post("/v1/invites") { auth(mom.token); json(InviteRequest(Role.WEARER)) }.body()
        assertEquals("INVITE_SELF", c.post("/v1/invites/accept") { auth(mom.token); json(AcceptRequest(own.code)) }.error())
        clock.advance(8 * 24 * 3600)
        val son = c.signUp("민수")
        assertEquals("INVITE_INVALID", c.post("/v1/invites/accept") { auth(son.token); json(AcceptRequest(own.code)) }.error())
    }

    @Test
    fun wearerInvitesGuardianAndOrdersThem() = run { c ->
            val (mom, gs) = c.linked("민지", "민수")
            assertEquals(listOf("민지", "민수"), c.family(mom).guardians.map { it.person.name })
            val reordered: Family = c.put("/v1/family/order") { auth(mom.token); json(OrderRequest(listOf(gs[1].id, gs[0].id))) }.body()
            assertEquals(listOf("민수", "민지"), reordered.guardians.map { it.person.name })

            // 착용자가 만든 초대: 받은 사람이 보호자가 됩니다.
            val invite: InviteResponse = c.post("/v1/invites") { auth(mom.token); json(InviteRequest(Role.WEARER)) }.body()
            val aunt = c.signUp("이모")
            c.post("/v1/invites/accept") { auth(aunt.token); json(AcceptRequest(invite.code)) }
            assertEquals(listOf("민수", "민지", "이모"), c.family(mom).guardians.map { it.person.name })

            // 연결 끊기 후 순서 다시 매김.
            val after: Family = c.delete("/v1/family/${gs[1].id}") { auth(mom.token) }.body()
            assertEquals(listOf(1, 2), after.guardians.map { it.priority })
            assertEquals("ALREADY_LINKED", c.post("/v1/invites/accept") {
                auth(mom.token)
                json(AcceptRequest(c.post("/v1/invites") { auth(gs[0].token); json(InviteRequest(Role.GUARDIAN)) }.body<InviteResponse>().code))
            }.error())
    }

    @Test
    fun summaryForGuardianActivityDropNowOthersInEveningDigest() = run { c ->
        val (mom, gs) = c.linked("민지")
        val upload = SummaryUpload(
            day = "2027-06-16",
            score = 58,
            band = "FAIR",
            missionTitle = "점심 먹고 10분 걷기",
            missionDone = false,
            signals = listOf(
                SignalUpload("ACTIVITY_DROP", usual = 8000.0, current = 3600.0, days = 3),
                SignalUpload("RESTING_HR_RISE", usual = 62.0, current = 70.0, days = 3),
                SignalUpload("STRESS", usual = 50.0, current = 40.0, days = 3),
                SignalUpload("SOS"),
                SignalUpload("NOT_A_SIGNAL"),
            ),
        )
        assertEquals(HttpStatusCode.NoContent, c.post("/v1/summaries") { auth(mom.token); json(upload) }.status)

        val today = c.family(gs[0]).wearers.single().today!!
        assertEquals(58, today.score)
        // 정보 등급(스트레스)과 긴급은 요약에 넣지 않습니다.
        assertEquals(listOf("ACTIVITY_DROP", "RESTING_HR_RISE"), today.alerts.map { it.signal })
        assertEquals("엄마의 걸음 수가 3일째 평소의 45% 수준이에요. 안부 전화를 드려보세요.", today.alerts[0].body)

        // 걸음 급감만 바로, 같은 날 다시 올려도 한 번.
        assertEquals(listOf(PushMessage.GUARDIAN_ALERT), pushes.map { it.message.type })
        c.post("/v1/summaries") { auth(mom.token); json(upload.copy(missionDone = true)) }
        assertEquals(1, pushes.size)
        assertTrue(c.family(gs[0]).wearers.single().today!!.missionDone)

        // 저녁 8시 전에는 요약 없음, 8시 이후 한 번.
        services.family.digest()
        assertEquals(1, pushes.size)
        clock.now = Instant.parse("2027-06-16T11:05:00Z") // 20:05 KST
        services.family.digest()
        services.family.digest()
        val digest = pushes.single { it.message.type == PushMessage.DIGEST }.message
        assertEquals("엄마 오늘 하루", digest.title)
        assertEquals("컨디션 58점 (보통) · 미션 완료\n확인 필요: 걸음 수 감소, 확인 필요", digest.body)
        // 본인 화면에는 보호자 목록만, 내 요약은 안 보입니다.
        assertTrue(c.family(mom).wearers.isEmpty())
    }

    @Test
    fun sosEscalatesInOrderUntilSomeoneAcks() = run { c ->
        val (mom, gs) = c.linked("민지", "민수", "이모")
        val created: EmergencyCreated = c.post("/v1/emergencies") { auth(mom.token); json(EmergencyRequest("SOS")) }.body()
        assertEquals(3, created.guardians)
        // SOS: 첫 보호자에게 바로.
        assertEquals(listOf("push-민지"), pushes.map { it.token })
        assertEquals("[긴급] 엄마 SOS", pushes[0].message.title)
        assertEquals("01012345678", pushes[0].message.extra["phone"])

        // 연달아 누르면 같은 건.
        val again: EmergencyCreated = c.post("/v1/emergencies") { auth(mom.token); json(EmergencyRequest("SOS")) }.body()
        assertEquals(created.id, again.id)
        assertEquals(1, pushes.size)

        clock.advance(30); services.emergencies.tick()
        assertEquals(1, pushes.size)
        clock.advance(30); services.emergencies.tick()
        assertEquals(listOf("push-민지", "push-민수"), pushes.map { it.token })
        clock.advance(60); services.emergencies.tick()
        services.emergencies.tick()
        assertEquals(3, pushes.size)
        // 3분: 아무도 확인하지 않으면 전원 다시.
        clock.advance(60); services.emergencies.tick()
        assertEquals(6, pushes.size)
        assertTrue(pushes.drop(3).all { it.message.body.startsWith("아직 아무도 확인하지 않았어요.") })

        pushes.clear()
        val acked: EmergencyView = c.post("/v1/emergencies/${created.id}/ack") { auth(gs[1].token) }.body()
        assertEquals("ACKED", acked.status)
        assertEquals(gs[1].id, acked.closedBy)
        assertEquals("민수님이 확인했어요", pushes.single { it.token == "push-엄마" }.message.title)
        assertEquals(setOf("push-민지", "push-이모"), pushes.filter { it.message.type == PushMessage.EMERGENCY_CLOSED }.map { it.token }.toSet())
        pushes.clear()
        clock.advance(600); services.emergencies.tick()
        assertTrue(pushes.isEmpty())
        // 가족 탭에 30분 동안 "확인됨"으로 보입니다.
        assertEquals("ACKED", c.family(gs[0]).wearers.single().emergencies.single().status)
    }

    @Test
    fun fallWaitsSixtySecondsAndWearerCanCancel() = run { c ->
        val (mom, gs) = c.linked("민지")
        val created: EmergencyCreated = c.post("/v1/emergencies") { auth(mom.token); json(EmergencyRequest("FALL")) }.body()
        assertTrue(pushes.isEmpty())
        clock.advance(60); services.emergencies.tick()
        assertEquals("[긴급] 엄마 낙상", pushes.single().message.title)

        assertEquals("NOT_WEARER", c.post("/v1/emergencies/${created.id}/cancel") { auth(gs[0].token) }.error())
        val stranger = c.signUp("남")
        assertEquals("NOT_GUARDIAN", c.post("/v1/emergencies/${created.id}/ack") { auth(stranger.token) }.error())
        assertEquals("NOT_FAMILY", c.get("/v1/emergencies/${created.id}") { auth(stranger.token) }.error())

        pushes.clear()
        val cancelled: EmergencyView = c.post("/v1/emergencies/${created.id}/cancel") { auth(mom.token) }.body()
        assertEquals("CANCELLED", cancelled.status)
        assertEquals("엄마님이 괜찮다고 했어요", pushes.single { it.token == "push-민지" }.message.title)
        assertEquals("BAD_SIGNAL", c.post("/v1/emergencies") { auth(mom.token); json(EmergencyRequest("STRESS")) }.error())
    }

    @Test
    fun sosWithoutGuardiansSaysSo() = run { c ->
        val alone = c.signUp("혼자")
        val created: EmergencyCreated = c.post("/v1/emergencies") { auth(alone.token); json(EmergencyRequest("SOS")) }.body()
        assertEquals(0, created.guardians)
        assertTrue(pushes.isEmpty())
    }

    @Test
    fun tickNeedsSecretAndDeleteRemovesEverything() = run { c ->
        assertEquals(HttpStatusCode.NotFound, c.post("/internal/tick").status)
        assertEquals(HttpStatusCode.NoContent, c.post("/internal/tick") { header("X-Tick-Secret", "secret") }.status)
        val (mom, gs) = c.linked("민지")
        assertEquals(HttpStatusCode.NoContent, c.delete("/v1/me") { auth(mom.token) }.status)
        assertTrue(c.family(gs[0]).wearers.isEmpty())
        assertEquals(HttpStatusCode.Unauthorized, c.get("/v1/me") { auth(mom.token) }.status)
    }
}
