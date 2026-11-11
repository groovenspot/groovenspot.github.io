package com.groovenspot.pulsecare.mobile.family

import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** 가족 서버 화면용 모델 (서버 Api.kt와 같은 모양). */
data class Person(val userId: String, val name: String, val phone: String?)

data class GuardianView(val person: Person, val priority: Int)

data class AlertView(val signal: String, val title: String, val body: String)

data class DaySummary(
    val day: String,
    val score: Int?,
    val band: String?,
    val missionTitle: String,
    val missionDone: Boolean,
    val alerts: List<AlertView>,
)

data class EmergencyView(
    val id: String,
    val wearerId: String,
    val signal: String,
    val createdAt: Long,
    val status: String,
    val title: String,
    val body: String,
    val closedBy: String?,
) {
    val active: Boolean get() = status == "ACTIVE"
}

data class WearerView(val person: Person, val today: DaySummary?, val emergencies: List<EmergencyView>)

data class Family(val guardians: List<GuardianView>, val wearers: List<WearerView>)

data class Invite(val code: String, val expiresAt: Long)

/** 서버가 준 오류. [message]는 그대로 보여줄 수 있는 한국어 문장. */
class ServerError(val status: Int, val code: String, override val message: String) : IOException(message)

/**
 * 가족 서버 호출. 의존성을 늘리지 않으려고 HttpURLConnection과 org.json을 씁니다.
 * 모두 블로킹이라 IO 스레드에서 부릅니다.
 */
class ServerApi(private val baseUrl: String, private val token: String? = null) {

    fun signUp(name: String): Pair<String, String> =
        call("POST", "/v1/users", JSONObject().put("name", name))!!.let { it.getString("userId") to it.getString("token") }

    fun me(): Person = person(call("GET", "/v1/me")!!)

    fun updateMe(name: String? = null, phone: String? = null, pushToken: String? = null): Person = person(
        call("PUT", "/v1/me", JSONObject().apply {
            name?.let { put("name", it) }
            phone?.let { put("phone", it) }
            pushToken?.let { put("pushToken", it) }
        })!!,
    )

    fun deleteMe() {
        call("DELETE", "/v1/me")
    }

    /** 옛 폰: 새 폰에 입력할 코드 (10분). */
    fun transferCode(): Invite = call("POST", "/v1/me/transfer")!!.let { Invite(it.getString("code"), it.getLong("expiresAt")) }

    /** 새 폰: 코드로 같은 계정을 받습니다 (사용자 ID, 새 토큰). */
    fun redeemTransfer(code: String): Pair<String, String> =
        call("POST", "/v1/transfer", JSONObject().put("code", code))!!.let { it.getString("userId") to it.getString("token") }

    /** [role]: 내가 맡을 역할. "GUARDIAN"(부모님 초대) 또는 "WEARER"(보호자 초대). */
    fun invite(role: String): Invite =
        call("POST", "/v1/invites", JSONObject().put("role", role))!!.let { Invite(it.getString("code"), it.getLong("expiresAt")) }

    /** (초대한 사람 이름, 그 사람이 맡을 역할). */
    fun preview(code: String): Pair<String, String> =
        call("GET", "/v1/invites/${code.filter { it.isLetterOrDigit() }}")!!.let { it.getString("inviterName") to it.getString("inviterRole") }

    fun accept(code: String): Family = family(call("POST", "/v1/invites/accept", JSONObject().put("code", code))!!)

    fun family(): Family = family(call("GET", "/v1/family")!!)

    fun unlink(userId: String): Family = family(call("DELETE", "/v1/family/$userId")!!)

    fun order(guardianIds: List<String>): Family =
        family(call("PUT", "/v1/family/order", JSONObject().put("guardianIds", JSONArray(guardianIds)))!!)

    fun uploadSummary(body: JSONObject) {
        call("POST", "/v1/summaries", body)
    }

    /** 긴급 요청. 돌려주는 값: (긴급 ID, 알릴 보호자 수). */
    fun emergency(signal: String): Pair<String, Int> =
        call("POST", "/v1/emergencies", JSONObject().put("signal", signal))!!.let { it.getString("id") to it.getInt("guardians") }

    fun ack(id: String): EmergencyView = emergency(call("POST", "/v1/emergencies/$id/ack")!!)

    fun cancel(id: String): EmergencyView = emergency(call("POST", "/v1/emergencies/$id/cancel")!!)

    /** AI 건강 상담. 돌려주는 값: (답, 위기 안내인지, 오늘 남은 질문 수). */
    fun chat(installId: String, turns: List<Pair<String, String>>, context: JSONObject?): Triple<String, Boolean, Int> =
        call(
            "POST",
            "/v1/chat",
            JSONObject()
                .put("installId", installId)
                .put("messages", JSONArray(turns.map { (role, text) -> JSONObject().put("role", role).put("text", text) }))
                .apply { context?.let { put("context", it) } },
        )!!.let { Triple(it.getString("reply"), it.optBoolean("crisis"), it.optInt("remainingToday", -1)) }

    /** 이용 통계 (로그인 없이 설치 ID로). */
    fun sendEvents(body: JSONObject) {
        call("POST", "/v1/events", body)
    }

    fun forgetEvents(installId: String) {
        call("POST", "/v1/events/forget", JSONObject().put("installId", installId))
    }

    private fun call(method: String, path: String, body: JSONObject? = null): JSONObject? {
        val c = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 10_000
            c.readTimeout = 15_000
            c.setRequestProperty("Accept", "application/json")
            token?.let { c.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                c.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = c.responseCode
            val text = (if (status < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status >= 400) {
                val err = runCatching { JSONObject(text) }.getOrNull()
                throw ServerError(status, err?.optString("error") ?: "HTTP_$status", err?.optString("message") ?: "잠시 후 다시 시도해 주세요")
            }
            return text.takeIf { it.isNotBlank() }?.let(::JSONObject)
        } finally {
            c.disconnect()
        }
    }

    companion object {
        fun person(o: JSONObject) = Person(o.getString("userId"), o.getString("name"), o.optString("phone").takeIf { it.isNotEmpty() })

        fun family(o: JSONObject): Family = Family(
            guardians = o.getJSONArray("guardians").objects().map { GuardianView(person(it.getJSONObject("person")), it.getInt("priority")) },
            wearers = o.getJSONArray("wearers").objects().map { w ->
                WearerView(
                    person = person(w.getJSONObject("person")),
                    today = w.optJSONObject("today")?.let { t ->
                        DaySummary(
                            day = t.getString("day"),
                            score = if (t.isNull("score") || !t.has("score")) null else t.getInt("score"),
                            band = t.optString("band").takeIf { it.isNotEmpty() },
                            missionTitle = t.getString("missionTitle"),
                            missionDone = t.getBoolean("missionDone"),
                            alerts = t.optJSONArray("alerts")?.objects()?.map { AlertView(it.getString("signal"), it.getString("title"), it.getString("body")) }.orEmpty(),
                        )
                    },
                    emergencies = w.optJSONArray("emergencies")?.objects()?.map(::emergency).orEmpty(),
                )
            },
        )

        fun emergency(o: JSONObject) = EmergencyView(
            id = o.getString("id"),
            wearerId = o.getString("wearerId"),
            signal = o.getString("signal"),
            createdAt = o.getLong("createdAt"),
            status = o.getString("status"),
            title = o.getString("title"),
            body = o.getString("body"),
            closedBy = o.optString("closedBy").takeIf { it.isNotEmpty() },
        )

        private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
    }
}
