package com.groovenspot.pulsecare.server

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.errors.AnthropicServiceException
import com.anthropic.models.messages.CacheControlEphemeral
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.StopReason
import com.anthropic.models.messages.TextBlockParam
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory
import java.time.Clock
import java.time.ZoneId

@Serializable data class ChatTurn(val role: String, val text: String)

/** 오늘 홈 화면에 있는 것 (점수 값 없이 구간만 보내도 됨). 사용자가 상담 시작 때 전송에 동의합니다. */
@Serializable data class ChatContext(
    val goal: String? = null,
    val score: Int? = null,
    val band: String? = null,
    val reason: String? = null,
    val mission: String? = null,
)

@Serializable data class ChatRequest(val installId: String, val messages: List<ChatTurn>, val context: ChatContext? = null)

@Serializable data class ChatReply(val reply: String, val crisis: Boolean = false, val remainingToday: Int)

/** 모델 호출 한 번. 테스트에서는 가짜로 바꿉니다. 실패하면 null. */
fun interface ChatModel {
    fun reply(system: String, turns: List<ChatTurn>): String?
}

/**
 * AI 건강 상담 (기획서의 헬스 챗). 생활 습관 코칭만 하고 진단·처방은 하지 않습니다.
 * - 자해·자살 표현과 응급 증상은 모델에 보내기 전에 서버가 고정 안내로 답합니다 (109, 1577-0199, 119)
 * - 설치 ID별 하루 [DAILY_LIMIT]번까지, 대화 내용은 저장하지 않고 사용량만 셉니다
 */
class ChatService(
    private val db: Db,
    private val model: ChatModel?,
    private val clock: Clock,
    private val zone: ZoneId = ZoneId.of("Asia/Seoul"),
) {
    fun chat(req: ChatRequest): ChatReply {
        if (model == null) throw ApiError(503, "CHAT_OFF", "AI 상담이 아직 켜지지 않았어요")
        if (!INSTALL_ID.matches(req.installId)) throw ApiError(400, "BAD_INSTALL", "설치 ID 형식이 맞지 않아요")
        val turns = req.messages.takeLast(MAX_TURNS).map { ChatTurn(if (it.role == "assistant") "assistant" else "user", it.text.take(MAX_CHARS)) }
        val last = turns.lastOrNull()?.takeIf { it.role == "user" && it.text.isNotBlank() }
            ?: throw ApiError(400, "EMPTY", "질문을 적어 주세요")

        // 위기·응급은 횟수와 상관없이, 모델보다 먼저.
        Safety.crisis(last.text)?.let { return ChatReply(it, crisis = true, remainingToday = DAILY_LIMIT - usedToday(req.installId)) }

        val used = db.tx {
            val day = today()
            if (exec("update chat_usage set count = count + 1 where install_id = ? and day = ? and count < ?", req.installId, day, DAILY_LIMIT) == 0) {
                val existing = query("select count from chat_usage where install_id = ? and day = ?", req.installId, day) { it.getInt(1) }.firstOrNull()
                if (existing != null) throw ApiError(429, "CHAT_LIMIT", "오늘 질문은 ${DAILY_LIMIT}번까지예요. 내일 다시 물어봐 주세요")
                exec("insert into chat_usage (install_id, day, count) values (?, ?, 1)", req.installId, day)
            }
            query("select count from chat_usage where install_id = ? and day = ?", req.installId, day) { it.getInt(1) }.first()
        }
        val answer = model.reply(Prompt.system(req.context), turns)
        if (answer == null) {
            // 답을 못 만들었으면 횟수를 돌려줍니다.
            db.tx { exec("update chat_usage set count = count - 1 where install_id = ? and day = ? and count > 0", req.installId, today()) }
            throw ApiError(502, "CHAT_FAILED", "답을 만들지 못했어요. 잠시 후 다시 물어봐 주세요")
        }
        return ChatReply(answer, remainingToday = DAILY_LIMIT - used)
    }

    private fun usedToday(installId: String): Int =
        db.tx { query("select count from chat_usage where install_id = ? and day = ?", installId, today()) { it.getInt(1) }.firstOrNull() } ?: 0

    private fun today() = clock.instant().atZone(zone).toLocalDate()

    /** 하루 사용량 기록은 7일만 둡니다. */
    fun cleanup() = db.tx { exec("delete from chat_usage where day < ?", today().minusDays(7)) }

    companion object {
        const val DAILY_LIMIT = 30
        private const val MAX_TURNS = 10
        private const val MAX_CHARS = 1000
        private val INSTALL_ID = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
    }
}

/** 모델에 보내기 전에 거르는 표현. 놓치는 것보다 지나치게 잡는 쪽이 낫습니다. */
object Safety {
    private val SELF_HARM = listOf("죽고 싶", "자살", "자해", "죽어버리", "살기 싫", "목숨을 끊", "극단적 선택", "사라지고 싶")
    private val EMERGENCY = listOf("가슴이 아파", "가슴 통증", "가슴이 조여", "숨을 못 쉬", "숨이 안 쉬", "숨쉬기 힘들", "쓰러졌", "의식이 없", "마비", "말이 어눌", "피를 토", "경련")

    const val SELF_HARM_REPLY =
        "많이 힘드셨겠어요. 지금 이 마음을 혼자 견디지 않으셔도 돼요.\n" +
            "· 자살예방상담전화 109 (24시간)\n· 정신건강위기상담 1577-0199\n· 위급하면 119\n" +
            "가까운 가족이나 보호자에게도 지금 연락해 보세요. 저는 의료진이 아니라 이런 상황을 도와드리기 어려워요."

    const val EMERGENCY_REPLY =
        "응급 상황일 수 있어요. 지금 바로 119에 전화하세요.\n" +
            "혼자 있다면 앱의 도움 요청(SOS)으로 보호자에게도 알려 주세요. 증상이 지나가더라도 꼭 진료를 받아 보세요."

    fun crisis(text: String): String? {
        val t = text.replace(" ", "")
        return when {
            SELF_HARM.any { t.contains(it.replace(" ", "")) } -> SELF_HARM_REPLY
            EMERGENCY.any { t.contains(it.replace(" ", "")) } -> EMERGENCY_REPLY
            else -> null
        }
    }
}

object Prompt {
    /** 앞부분은 고정(캐시), 오늘 정보는 맨 뒤에 붙입니다. */
    private const val BASE = """당신은 펄스케어 앱의 건강 생활 코치입니다. 스마트워치 기록으로 수면, 회복, 활동 습관을 돕습니다.

지켜야 할 것:
- 한국어 존댓말로, 3~5문장 안에 짧게 답합니다. 목록은 3개까지만.
- 진단, 병명 추정, 약 이름·용량, 검사 해석은 하지 않습니다. 그런 질문에는 의사·약사와 상담하라고 정중히 안내합니다.
- 증상이 심하거나 오래가면 진료를 권하고, 응급 징후(가슴 통증, 호흡 곤란, 마비, 의식 저하)에는 119를 먼저 안내합니다.
- 점수는 본인의 평소 대비 지표이지 의학적 기준이 아니라는 점을 필요하면 알려 줍니다.
- 수면, 가벼운 운동, 호흡, 수분, 규칙적인 생활처럼 오늘 바로 할 수 있는 것 하나를 제안합니다.
- 모르는 것은 모른다고 하고, 앱에 없는 기능을 지어내지 않습니다.
- 사용자의 이름, 연락처 같은 개인정보를 묻지 않습니다."""

    fun system(c: ChatContext?): String {
        if (c == null) return BASE
        val lines = listOfNotNull(
            c.goal?.let { "목표: $it" },
            c.score?.let { "오늘 컨디션 점수: $it" + (c.band?.let { b -> " ($b)" } ?: "") },
            c.reason?.let { "점수 이유: $it" },
            c.mission?.let { "오늘의 미션: $it" },
        ).map { it.take(200) }
        return if (lines.isEmpty()) BASE else BASE + "\n\n오늘 사용자 정보 (앱 화면 내용):\n" + lines.joinToString("\n")
    }
}

/**
 * Claude API로 답을 만듭니다. 고정된 지침은 캐시하고(cache_control), 오늘 정보만 바뀝니다.
 * 모델은 CHAT_MODEL로 바꿀 수 있습니다 (기본 claude-opus-5-5).
 */
class ClaudeChat(private val modelId: String, private val client: AnthropicClient = AnthropicOkHttpClient.fromEnv()) : ChatModel {
    private val log = LoggerFactory.getLogger(ClaudeChat::class.java)

    override fun reply(system: String, turns: List<ChatTurn>): String? {
        val split = system.indexOf("\n\n오늘 사용자 정보")
        val fixed = if (split < 0) system else system.substring(0, split)
        val today = if (split < 0) null else system.substring(split).trim()
        val builder = MessageCreateParams.builder()
            .model(modelId)
            .maxTokens(1024L)
            .systemOfTextBlockParams(
                listOfNotNull(
                    TextBlockParam.builder().text(fixed).cacheControl(CacheControlEphemeral.builder().build()).build(),
                    today?.let { TextBlockParam.builder().text(it).build() },
                ),
            )
        turns.forEach { if (it.role == "assistant") builder.addAssistantMessage(it.text) else builder.addUserMessage(it.text) }
        // 거절(refusal) 시 서버가 다른 모델로 다시 시도하도록 (Opus·Fable·Sonnet 5.5만 지원).
        if (FALLBACK_MODELS.any { modelId.startsWith(it) }) {
            builder.putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
            builder.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
        }
        return try {
            val response = client.messages().create(builder.build())
            if (response.stopReason().orElse(null) == StopReason.REFUSAL) {
                return "이 질문에는 답하기 어려워요. 건강이 걱정되시면 의사와 상담해 보세요."
            }
            response.content().mapNotNull { it.text().orElse(null)?.text() }.joinToString("\n").trim().ifEmpty { null }
        } catch (e: AnthropicServiceException) {
            log.warn("Claude API {}: {}", e.statusCode(), e.message)
            null
        } catch (e: Exception) {
            log.warn("Claude API call failed", e)
            null
        }
    }

    companion object {
        private val FALLBACK_MODELS = listOf("claude-opus-5", "claude-fable-5", "claude-sonnet-5-5")
    }
}
