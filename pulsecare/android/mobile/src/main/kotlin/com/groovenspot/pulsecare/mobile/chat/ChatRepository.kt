package com.groovenspot.pulsecare.mobile.chat

import android.content.Context
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.BuildConfig
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.family.ServerApi
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.today.HomeState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

data class ChatMessage(val fromUser: Boolean, val text: String, val crisis: Boolean = false)

/** AI 건강 상담. 대화는 이 화면을 여는 동안만 기억하고 휴대폰·서버 어디에도 저장하지 않습니다. */
object ChatRepository {

    val configured: Boolean get() = BuildConfig.SERVER_URL.isNotEmpty()

    /** 답과 남은 질문 수. 실패하면 [com.groovenspot.pulsecare.mobile.family.ServerError]나 IOException. */
    suspend fun send(context: Context, history: List<ChatMessage>, home: HomeState?): Pair<ChatMessage, Int> = withContext(Dispatchers.IO) {
        val turns = history.filterNot { it.crisis }.map { (if (it.fromUser) "user" else "assistant") to it.text }
        val (reply, crisis, remaining) = ServerApi(BuildConfig.SERVER_URL).chat(AppStore.get(context).installId, turns, home?.let(::context))
        Metrics.track(context, EventName.CHAT_MESSAGE_SENT, mapOf("topic" to topic(history.last().text)))
        if (crisis) Metrics.track(context, EventName.CHAT_CRISIS_ROUTED)
        ChatMessage(fromUser = false, text = reply, crisis = crisis) to remaining
    }

    /** 오늘 홈 화면 내용 (사용자가 상담 안내에 동의한 범위). */
    fun context(home: HomeState): JSONObject = JSONObject().apply {
        home.score.score?.let { put("score", it) }
        home.score.band?.let { put("band", it.label) }
        home.score.reason.takeIf { it.isNotBlank() }?.let { put("reason", it) }
        put("mission", home.mission.title)
        put("goal", home.mission.goal.label)
    }

    /** 이용 통계용 주제 (원문은 보내지 않음). */
    fun topic(text: String): String = when {
        listOf("잠", "수면", "졸", "깼", "불면").any { it in text } -> "sleep"
        listOf("운동", "걷", "산책", "걸음", "달리", "근력").any { it in text } -> "exercise"
        listOf("스트레스", "불안", "긴장", "호흡", "피곤", "지쳐").any { it in text } -> "stress"
        listOf("점수", "컨디션", "HRV", "심박").any { it in text } -> "score"
        else -> "other"
    }

    val SUGGESTIONS = listOf("오늘 점수가 왜 이렇게 나왔어요?", "잠이 잘 안 와요", "오늘 운동해도 될까요?", "HRV가 뭐예요?")
}
