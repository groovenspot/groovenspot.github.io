package com.groovenspot.pulsecare.mobile.family

import android.content.Context
import android.util.Log
import com.groovenspot.pulsecare.mobile.BuildConfig
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.today.HomeState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/** 워치 SOS를 보낸 결과. 워치와 폰 알림이 이걸 보고 사실대로 말합니다. */
sealed interface SosResult {
    data class Sent(val emergencyId: String, val guardians: Int) : SosResult
    /** 서버 설정 전이거나 가족 계정이 없음. */
    data object NoAccount : SosResult
    data class Failed(val reason: String) : SosResult
}

/** 가족 서버와 이 폰의 계정을 잇습니다. 서버가 설정되지 않은 빌드에서는 아무것도 하지 않습니다. */
object FamilyRepository {

    val configured: Boolean get() = BuildConfig.SERVER_URL.isNotEmpty()

    private fun api(context: Context): ServerApi? {
        if (!configured) return null
        val token = AppStore.get(context).account?.second ?: return null
        return ServerApi(BuildConfig.SERVER_URL, token)
    }

    fun hasAccount(context: Context) = configured && AppStore.get(context).account != null

    fun myId(context: Context): String? = AppStore.get(context).account?.first

    /** 가족 탭에서 처음 시작: 계정을 만들고 이름·전화번호·푸시 토큰을 올립니다. */
    suspend fun start(context: Context, name: String, phone: String?): Person = io {
        val store = AppStore.get(context)
        val (id, token) = ServerApi(BuildConfig.SERVER_URL).signUp(name)
        store.account = id to token
        ServerApi(BuildConfig.SERVER_URL, token).updateMe(phone = phone?.takeIf { it.isNotBlank() }, pushToken = store.pushToken)
    }

    /** 옛 폰에서 새 폰으로 옮길 코드. */
    suspend fun transferCode(context: Context): Invite = io { api(context)!!.transferCode() }

    /** 새 폰에서 코드로 기존 가족 계정을 불러옵니다. 옛 폰은 바로 로그아웃돼요. */
    suspend fun restore(context: Context, code: String): Person = io {
        val store = AppStore.get(context)
        val (id, token) = ServerApi(BuildConfig.SERVER_URL).redeemTransfer(code)
        store.account = id to token
        ServerApi(BuildConfig.SERVER_URL, token).updateMe(pushToken = store.pushToken)
    }

    suspend fun me(context: Context): Person? = io { api(context)?.me() }

    suspend fun family(context: Context): Family? = io {
        api(context)?.family()?.also { AppStore.get(context).guardianCount = it.guardians.size }
    }

    suspend fun invite(context: Context, role: String): Invite = io { api(context)!!.invite(role) }

    suspend fun preview(context: Context, code: String): Pair<String, String> = io { api(context)!!.preview(code) }

    suspend fun accept(context: Context, code: String): Family = io {
        api(context)!!.accept(code).also { AppStore.get(context).guardianCount = it.guardians.size }
    }

    suspend fun unlink(context: Context, userId: String): Family = io {
        api(context)!!.unlink(userId).also { AppStore.get(context).guardianCount = it.guardians.size }
    }

    suspend fun order(context: Context, ids: List<String>): Family = io { api(context)!!.order(ids) }

    suspend fun ack(context: Context, id: String): EmergencyView = io { api(context)!!.ack(id) }

    suspend fun cancel(context: Context, id: String): EmergencyView = io { api(context)!!.cancel(id) }

    /** "기록 지우기": 서버의 계정·연결·요약을 지웁니다. 이 폰의 저장소는 부르는 쪽이 지웁니다. */
    suspend fun deleteAccount(token: String) = io {
        if (configured) runCatching { ServerApi(BuildConfig.SERVER_URL, token).deleteMe() }.onFailure { Log.w(TAG, "delete account", it) }
    }

    /** 새 FCM 토큰. 계정이 있으면 바로 올리고, 없으면 계정을 만들 때 올립니다. */
    fun registerPushToken(context: Context, token: String) {
        AppStore.get(context).pushToken = token
        runCatching { api(context)?.updateMe(pushToken = token) }.onFailure { Log.w(TAG, "push token upload", it) }
    }

    /**
     * 오늘 요약을 보호자에게 (보호자가 있을 때만). 수면 시간·심박 같은 원수치는 보내지 않고,
     * 점수·구간·미션과 주의 신호만 보냅니다. 문구는 서버가 보호자용으로 만듭니다.
     */
    suspend fun uploadSummary(context: Context, home: HomeState) {
        if (!hasAccount(context)) return
        val body = summaryJson(home)
        io {
            runCatching {
                val api = api(context) ?: return@runCatching
                val store = AppStore.get(context)
                // 내가 만든 초대를 보호자가 자기 폰에서 수락하면 이 폰의 보호자 수는 아직 0이라 서버에 한 번 더 묻습니다.
                if (store.guardianCount == 0) {
                    store.guardianCount = api.family().guardians.size
                    if (store.guardianCount == 0) return@runCatching
                }
                api.uploadSummary(body)
            }.onFailure { Log.w(TAG, "summary upload", it) }
        }
    }

    fun summaryJson(home: HomeState): JSONObject = JSONObject()
        .put("day", home.date.toString())
        .put("score", home.score.score ?: JSONObject.NULL)
        .put("band", home.score.band?.name ?: JSONObject.NULL)
        .put("missionTitle", home.mission.title)
        .put("missionDone", home.missionDone)
        .put(
            "signals",
            JSONArray(
                home.alertDetections.map { d ->
                    JSONObject().put("signal", d.signal.name).apply {
                        d.usual?.let { put("usual", it) }
                        d.current?.let { put("current", it) }
                        d.days?.let { put("days", it) }
                    }
                },
            ),
        )

    /** 워치 SOS (블로킹, 서비스 스레드에서). */
    fun sos(context: Context): SosResult {
        val api = api(context) ?: return SosResult.NoAccount
        return runCatching { api.emergency("SOS").let { (id, n) -> SosResult.Sent(id, n) } }
            .getOrElse { SosResult.Failed(it.message ?: "연결 오류") }
    }

    /** 워치·폰 SOS 화면 문구용 결과 코드 ([com.groovenspot.pulsecare.watch.WatchContract.sosText]). */
    fun sosCode(result: SosResult): String = when (result) {
        is SosResult.Sent -> com.groovenspot.pulsecare.watch.WatchContract.sosSent(result.guardians)
        SosResult.NoAccount -> com.groovenspot.pulsecare.watch.WatchContract.SOS_NO_ACCOUNT
        is SosResult.Failed -> com.groovenspot.pulsecare.watch.WatchContract.SOS_FAILED
    }

    /** 알림 버튼용 (블로킹). */
    fun ackBlocking(context: Context, id: String) = runCatching { api(context)?.ack(id) }.isSuccess
    fun cancelBlocking(context: Context, id: String) = runCatching { api(context)?.cancel(id) }.isSuccess

    private suspend fun <T> io(block: () -> T): T = withContext(Dispatchers.IO) { block() }

    private const val TAG = "FamilyRepository"
}
