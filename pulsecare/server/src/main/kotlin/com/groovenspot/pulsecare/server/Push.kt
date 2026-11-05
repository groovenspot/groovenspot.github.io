package com.groovenspot.pulsecare.server

import com.google.auth.oauth2.GoogleCredentials
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/** 푸시 한 건. 앱이 [type]을 보고 알림 채널·버튼을 고릅니다. */
data class PushMessage(val type: String, val title: String, val body: String, val extra: Map<String, String> = emptyMap()) {
    companion object {
        const val EMERGENCY = "EMERGENCY"
        const val EMERGENCY_CLOSED = "EMERGENCY_CLOSED"
        const val EMERGENCY_ACK = "EMERGENCY_ACK"
        const val GUARDIAN_ALERT = "GUARDIAN_ALERT"
        const val DIGEST = "DIGEST"
        const val LINKED = "LINKED"
    }
}

fun interface Push {
    /** 보내지 못해도 예외를 던지지 않습니다 (긴급 흐름이 멈추지 않게). 성공 여부만 돌려줍니다. */
    fun send(token: String, message: PushMessage): Boolean
}

/**
 * FCM HTTP v1. 데이터 메시지만 보내고 문구·버튼은 앱이 그립니다 (잠금화면 문구를 앱이 정하도록).
 * 자격 증명은 실행 환경의 서비스 계정(Cloud Run 기본 계정 등)을 씁니다.
 */
class FcmPush(private val projectId: String) : Push {
    private val log = LoggerFactory.getLogger(FcmPush::class.java)
    private val http = HttpClient.newHttpClient()
    private val credentials = GoogleCredentials.getApplicationDefault()
        .createScoped(listOf("https://www.googleapis.com/auth/firebase.messaging"))

    override fun send(token: String, message: PushMessage): Boolean = runCatching {
        credentials.refreshIfExpired()
        val body = buildJsonObject {
            putJsonObject("message") {
                put("token", token)
                putJsonObject("data") {
                    put("type", message.type)
                    put("title", message.title)
                    put("body", message.body)
                    message.extra.forEach { (k, v) -> put(k, v) }
                }
                putJsonObject("android") { put("priority", "high") }
            }
        }
        val request = HttpRequest.newBuilder(URI("https://fcm.googleapis.com/v1/projects/$projectId/messages:send"))
            .header("Authorization", "Bearer ${credentials.accessToken.tokenValue}")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(Json.encodeToString(body)))
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() != 200) log.warn("FCM {}: {}", response.statusCode(), response.body().take(300))
        response.statusCode() == 200
    }.onFailure { log.warn("FCM send failed", it) }.getOrDefault(false)
}

/** FCM 설정이 없을 때 (로컬 실행): 보낸 것처럼 로그만 남깁니다. */
class LogPush : Push {
    private val log = LoggerFactory.getLogger(LogPush::class.java)
    override fun send(token: String, message: PushMessage): Boolean {
        log.info("push {} → {}: {}", message.type, token.take(8), message.title)
        return true
    }
}
