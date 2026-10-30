package com.groovenspot.pulsecare.server

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.KeyFactory
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Duration
import java.util.Base64

/**
 * 아이폰 푸시 (APNs, 토큰 인증 .p8 키). 아이폰 앱은 "apns:<기기 토큰>"을 푸시 토큰으로 올립니다.
 * FCM을 거치지 않아 아이폰 앱에 Firebase SDK가 필요 없습니다.
 * 잠금화면 미리보기는 앱의 알림 종류(category) 설정이 가립니다 (시스템 기본값: 잠금 중 미리보기 숨김).
 */
class ApnsPush(
    private val keyId: String,
    private val teamId: String,
    privateKeyPem: String,
    private val topic: String,
    sandbox: Boolean,
) : Push {
    private val log = LoggerFactory.getLogger(ApnsPush::class.java)
    private val http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_2).connectTimeout(Duration.ofSeconds(10)).build()
    private val host = if (sandbox) "https://api.sandbox.push.apple.com" else "https://api.push.apple.com"
    private val key: PrivateKey = parseKey(privateKeyPem)

    @Volatile private var cached: Pair<Long, String>? = null

    /** APNs는 같은 토큰을 20분~60분 사이 다시 쓰라고 합니다. 50분마다 새로 만듭니다. */
    private fun bearer(nowSeconds: Long = System.currentTimeMillis() / 1000): String {
        cached?.let { (at, jwt) -> if (nowSeconds - at < 50 * 60) return jwt }
        return jwt(keyId, teamId, key, nowSeconds).also { cached = nowSeconds to it }
    }

    override fun send(token: String, message: PushMessage): Boolean = runCatching {
        val request = HttpRequest.newBuilder(URI("$host/3/device/${token.filter { it.isLetterOrDigit() }}"))
            .header("authorization", "bearer ${bearer()}")
            .header("apns-topic", topic)
            .header("apns-push-type", "alert")
            .header("apns-priority", "10")
            .timeout(Duration.ofSeconds(15))
            .POST(HttpRequest.BodyPublishers.ofString(Json.encodeToString(JsonObject.serializer(), payload(message))))
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() != 200) log.warn("APNs {}: {}", response.statusCode(), response.body().take(300))
        response.statusCode() == 200
    }.onFailure { log.warn("APNs send failed", it) }.getOrDefault(false)

    companion object {
        /** 보이는 알림 + 앱이 버튼 처리에 쓰는 값 (type, emergencyId 등). */
        fun payload(message: PushMessage): JsonObject = buildJsonObject {
            putJsonObject("aps") {
                putJsonObject("alert") {
                    put("title", message.title)
                    put("body", message.body)
                }
                put("sound", "default")
                put("category", message.type)
                put("thread-id", message.type)
                put("interruption-level", if (message.type == PushMessage.EMERGENCY) "time-sensitive" else "active")
            }
            put("type", message.type)
            message.extra.forEach { (k, v) -> put(k, v) }
        }

        fun parseKey(pem: String): PrivateKey {
            val body = pem.replace("\\n", "\n").lines().filterNot { it.startsWith("-----") }.joinToString("").trim()
            return KeyFactory.getInstance("EC").generatePrivate(PKCS8EncodedKeySpec(Base64.getDecoder().decode(body)))
        }

        /** ES256 JWT. 자바 서명은 DER이라 JWS가 요구하는 r‖s 64바이트로 바꿉니다. */
        fun jwt(keyId: String, teamId: String, key: PrivateKey, nowSeconds: Long): String {
            val enc = Base64.getUrlEncoder().withoutPadding()
            val header = enc.encodeToString("""{"alg":"ES256","kid":"$keyId"}""".toByteArray())
            val claims = enc.encodeToString("""{"iss":"$teamId","iat":$nowSeconds}""".toByteArray())
            val signer = Signature.getInstance("SHA256withECDSA")
            signer.initSign(key)
            signer.update("$header.$claims".toByteArray())
            return "$header.$claims.${enc.encodeToString(derToRaw(signer.sign()))}"
        }

        /** DER SEQUENCE { INTEGER r, INTEGER s } → r, s 각각 32바이트. */
        fun derToRaw(der: ByteArray): ByteArray {
            var i = 2
            if (der[1].toInt() and 0x80 != 0) i += der[1].toInt() and 0x7f
            fun integer(): ByteArray {
                require(der[i].toInt() == 0x02) { "DER INTEGER가 아니에요" }
                val len = der[i + 1].toInt()
                val bytes = der.copyOfRange(i + 2, i + 2 + len)
                i += 2 + len
                val trimmed = bytes.dropWhile { it.toInt() == 0 }.toByteArray()
                return ByteArray(32 - trimmed.size) + trimmed
            }
            return integer() + integer()
        }
    }
}

/** 토큰 앞부분으로 FCM(안드로이드)과 APNs(아이폰)를 나눕니다. */
class RoutingPush(private val fcm: Push, private val apns: Push?) : Push {
    override fun send(token: String, message: PushMessage): Boolean =
        if (token.startsWith(APNS_PREFIX)) {
            apns?.send(token.removePrefix(APNS_PREFIX), message) ?: false
        } else {
            fcm.send(token, message)
        }

    companion object {
        const val APNS_PREFIX = "apns:"
    }
}
