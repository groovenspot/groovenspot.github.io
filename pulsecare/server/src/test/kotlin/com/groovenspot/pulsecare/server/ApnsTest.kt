package com.groovenspot.pulsecare.server

import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

class ApnsTest {

    @Test
    fun jwtIsSignedWithRawEs256Signature() {
        val gen = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }
        val pair = gen.generateKeyPair()
        val pem = "-----BEGIN PRIVATE KEY-----\n" + Base64.getEncoder().encodeToString(pair.private.encoded) + "\n-----END PRIVATE KEY-----"
        val key = ApnsPush.parseKey(pem)
        val jwt = ApnsPush.jwt("KEY123", "TEAM456", key, 1_800_000_000)
        val (header, claims, sig) = jwt.split(".")
        val dec = Base64.getUrlDecoder()
        assertEquals("""{"alg":"ES256","kid":"KEY123"}""", String(dec.decode(header)))
        assertEquals("""{"iss":"TEAM456","iat":1800000000}""", String(dec.decode(claims)))
        val raw = dec.decode(sig)
        assertEquals(64, raw.size)

        // r‖s를 다시 DER로 바꿔 공개키로 확인합니다.
        fun derInt(b: ByteArray): ByteArray = BigInteger(1, b).toByteArray().let { byteArrayOf(0x02, it.size.toByte()) + it }
        val body = derInt(raw.copyOfRange(0, 32)) + derInt(raw.copyOfRange(32, 64))
        val der = byteArrayOf(0x30, body.size.toByte()) + body
        val verifier = Signature.getInstance("SHA256withECDSA").apply { initVerify(pair.public) }
        verifier.update("$header.$claims".toByteArray())
        assertTrue(verifier.verify(der))
    }

    @Test
    fun payloadIsVisibleAlertWithButtonsCategory() {
        val p = ApnsPush.payload(PushMessage(PushMessage.EMERGENCY, "[긴급] 엄마 SOS", "도움을 요청했어요", mapOf("emergencyId" to "e1")))
        val aps = p["aps"]!!.jsonObject
        assertEquals("EMERGENCY", aps["category"]!!.jsonPrimitive.content)
        assertEquals("time-sensitive", aps["interruption-level"]!!.jsonPrimitive.content)
        assertEquals("[긴급] 엄마 SOS", aps["alert"]!!.jsonObject["title"]!!.jsonPrimitive.content)
        assertEquals("e1", p["emergencyId"]!!.jsonPrimitive.content)
        val digest = ApnsPush.payload(PushMessage(PushMessage.DIGEST, "t", "b"))
        assertEquals("active", digest["aps"]!!.jsonObject["interruption-level"]!!.jsonPrimitive.content)
    }

    @Test
    fun tokensAreRoutedByPrefix() {
        val fcm = mutableListOf<String>()
        val apns = mutableListOf<String>()
        val push = RoutingPush({ t, _ -> fcm += t; true }, { t, _ -> apns += t; true })
        val m = PushMessage(PushMessage.DIGEST, "t", "b")
        push.send("fcm-token", m)
        push.send("apns:abcd1234", m)
        assertEquals(listOf("fcm-token"), fcm)
        assertEquals(listOf("abcd1234"), apns)
        // APNs 설정이 없으면 아이폰 토큰은 실패로 (FCM으로 잘못 보내지 않음).
        assertFalse(RoutingPush({ _, _ -> true }, null).send("apns:abcd", m))
    }
}
