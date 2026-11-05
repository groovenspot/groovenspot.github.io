package com.groovenspot.pulsecare.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.postgresql.ds.PGSimpleDataSource
import java.time.Instant
import java.util.UUID

/** AI 상담: 위기 표현 먼저, 하루 횟수, 오늘 정보, 실패 시 횟수 되돌림. 실제 Postgres, 가짜 모델. */
class ChatTest {
    private val dbUrl = System.getenv("PULSECARE_TEST_DB").orEmpty()
    private val clock = ServerTest.TestClock(Instant.parse("2027-06-16T01:00:00Z"))
    private lateinit var db: Db
    private val calls = mutableListOf<Pair<String, List<ChatTurn>>>()
    private var answer: String? = "오늘은 30분 일찍 누워 보세요."
    private val id = UUID.randomUUID().toString()

    private fun service(model: ChatModel? = ChatModel { system, turns -> calls += system to turns; answer }) = ChatService(db, model, clock)

    @Before
    fun setUp() {
        assumeTrue("PULSECARE_TEST_DB not set", dbUrl.isNotEmpty())
        db = Db(PGSimpleDataSource().apply { setURL(dbUrl) })
        db.tx { exec("drop table if exists chat_usage") }
        db.migrate()
    }

    private fun ask(text: String, context: ChatContext? = null, history: List<ChatTurn> = emptyList()) =
        service().chat(ChatRequest(id, history + ChatTurn("user", text), context))

    @Test
    fun answersWithTodayContextInSystemPrompt() {
        val r = ask("오늘 점수가 왜 낮아요?", ChatContext(goal = "수면", score = 48, band = "낮음", reason = "어젯밤 수면이 짧았어요", mission = "30분 일찍 눕기"))
        assertEquals("오늘은 30분 일찍 누워 보세요.", r.reply)
        assertEquals(ChatService.DAILY_LIMIT - 1, r.remainingToday)
        val (system, turns) = calls.single()
        assertTrue(system.startsWith("당신은 펄스케어 앱의 건강 생활 코치입니다"))
        assertTrue(system.contains("오늘 컨디션 점수: 48 (낮음)"))
        assertTrue(system.contains("진단, 병명 추정, 약 이름·용량"))
        assertEquals("user", turns.single().role)
    }

    @Test
    fun crisisAnsweredWithoutModelAndNotCounted() {
        val r = ask("요즘 너무 힘들어서 죽고 싶어요")
        assertTrue(r.crisis)
        assertTrue(r.reply.contains("109"))
        assertTrue(calls.isEmpty())
        val e = ask("갑자기 가슴이  아파요 식은땀이 나요")
        assertTrue(e.reply.contains("119"))
        assertTrue(calls.isEmpty())
        assertEquals(ChatService.DAILY_LIMIT, e.remainingToday)
        assertTrue(Safety.crisis("오늘 산책 몇 분이 좋아요?") == null)
    }

    @Test
    fun dailyLimitAndRefundOnFailure() {
        repeat(ChatService.DAILY_LIMIT) { ask("질문 $it") }
        val limited = runCatching { ask("한 번 더") }.exceptionOrNull() as ApiError
        assertEquals("CHAT_LIMIT", limited.code)
        // 다음 날은 다시.
        clock.advance(24 * 3600)
        answer = null
        val failed = runCatching { ask("내일 질문") }.exceptionOrNull() as ApiError
        assertEquals("CHAT_FAILED", failed.code)
        answer = "좋아요"
        assertEquals(ChatService.DAILY_LIMIT - 1, ask("다시").remainingToday)
    }

    @Test
    fun validationAndDisabled() {
        assertEquals("CHAT_OFF", (runCatching { service(null).chat(ChatRequest(id, listOf(ChatTurn("user", "안녕")))) }.exceptionOrNull() as ApiError).code)
        assertEquals("BAD_INSTALL", (runCatching { service().chat(ChatRequest("x", listOf(ChatTurn("user", "안녕")))) }.exceptionOrNull() as ApiError).code)
        assertEquals("EMPTY", (runCatching { service().chat(ChatRequest(id, listOf(ChatTurn("assistant", "안녕")))) }.exceptionOrNull() as ApiError).code)
        // 긴 대화는 최근 10개만(첫 턴은 user가 되도록 앞의 답은 버림), 긴 글은 잘라서.
        val history = (1..20).map { ChatTurn(if (it % 2 == 0) "assistant" else "user", "x".repeat(3000)) }
        ask("마지막", history = history)
        val turns = calls.single().second
        assertEquals(9, turns.size)
        assertTrue(turns.all { it.text.length <= 1000 })
        assertEquals("user", turns.first().role)
    }

    @Test
    fun consecutiveUserTurnsMergedAndCrisisOnlyOnLatest() {
        // 위기 안내(앱이 대화에서 뺌) 뒤의 평범한 질문은 다시 위기로 잡지 않고, 이어진 user 턴은 합칩니다.
        val r = ask("잠이 안 와요", history = listOf(ChatTurn("user", "죽고 싶어요")))
        assertFalse(r.crisis)
        val turns = calls.single().second
        assertEquals(listOf("user"), turns.map { it.role })
    }
}
