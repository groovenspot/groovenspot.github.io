package com.groovenspot.pulsecare.mobile.metrics

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.BuildConfig
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.family.ServerApi
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * 이용 통계 (기획서 22번, 선택 동의). 동의하지 않았으면 아무것도 모으지 않습니다.
 * 계정과 분리된 무작위 설치 ID만 붙이고, 점수·수치·이름은 이벤트 사전([EventName])에 없어 보낼 수 없습니다.
 */
object Metrics {

    // 리시버·작업·화면이 서로 다른 스레드에서 쓰므로 한 인스턴스를 같이 써야 @Synchronized가 의미가 있습니다.
    @Volatile private var sharedQueue: EventQueue? = null

    private fun queue(context: Context): EventQueue =
        sharedQueue ?: synchronized(this) {
            sharedQueue ?: EventQueue(File(context.applicationContext.filesDir, "events.jsonl")).also { sharedQueue = it }
        }

    /** "기록 지우기": 아직 보내지 않은 이벤트도 버립니다. */
    fun clearQueue(context: Context) = queue(context).clear()

    val configured: Boolean get() = BuildConfig.SERVER_URL.isNotEmpty()

    fun enabled(context: Context) = AppStore.get(context).analyticsConsent

    fun track(context: Context, name: EventName, props: Map<String, String> = emptyMap()) {
        if (!enabled(context)) return
        runCatching { queue(context).add(EventQueue.event(name, props)) }.onFailure { Log.w(TAG, "queue", it) }
    }

    /** 하루에 한 번만 (같은 화면에서 점수를 여러 번 봐도 한 번). [key]로 구분합니다. */
    fun trackDaily(context: Context, name: EventName, key: String, props: Map<String, String> = emptyMap()) {
        if (!enabled(context)) return
        val store = AppStore.get(context)
        val mark = "${LocalDate.now()}|${name.key}|$key"
        if (store.lastDailyEvent(name.key, key) == mark) return
        store.setLastDailyEvent(name.key, key, mark)
        track(context, name, props)
    }

    /** 처음 한 번만 (워치 연결, 첫 기록). */
    fun trackOnce(context: Context, name: EventName, props: Map<String, String> = emptyMap()) {
        if (!enabled(context)) return
        val store = AppStore.get(context)
        if (store.onceSent(name.key)) return
        store.markOnce(name.key)
        track(context, name, props)
    }

    /** 내 정보·동의 화면에서 켜고 끄기. 끄면 모아 둔 것을 버리고 서버에서도 지웁니다. */
    fun setConsent(context: Context, on: Boolean) {
        val store = AppStore.get(context)
        if (on) {
            store.analyticsConsent = true
            track(context, EventName.CONSENT_UPDATED, mapOf("item" to "analytics", "granted" to "true"))
            schedule(context)
        } else {
            val id = store.installId
            store.analyticsConsent = false
            queue(context).clear()
            forgetAsync(id)
        }
    }

    /** "기록 지우기": 서버의 통계를 지웁니다 (설치 ID는 이 뒤에 새로 만들어집니다). */
    fun forgetAsync(installId: String) {
        if (!configured) return
        thread { runCatching { ServerApi(BuildConfig.SERVER_URL).forgetEvents(installId) }.onFailure { Log.w(TAG, "forget", it) } }
    }

    fun queued(context: Context) = queue(context).size()

    /** 모아 둔 것을 보냅니다 (블로킹). 보낸 개수, 실패하면 -1. */
    fun flush(context: Context): Int {
        if (!configured || !enabled(context)) return 0
        val q = queue(context)
        var sent = 0
        while (true) {
            val batch = q.peek()
            if (batch.isEmpty()) return sent
            val body = JSONObject()
                .put("installId", AppStore.get(context).installId)
                .put("appVersion", BuildConfig.VERSION_NAME)
                .put("events", JSONArray(batch))
            val ok = runCatching { ServerApi(BuildConfig.SERVER_URL).sendEvents(body) }.onFailure { Log.w(TAG, "flush", it) }.isSuccess
            if (!ok) return -1
            q.drop(batch.size)
            sent += batch.size
        }
    }

    /** 하루 한 번, 인터넷이 될 때. */
    fun schedule(context: Context) {
        if (!configured || !enabled(context)) return
        val request = PeriodicWorkRequestBuilder<UploadWorker>(1, TimeUnit.DAYS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("metrics-upload", ExistingPeriodicWorkPolicy.KEEP, request)
    }

    class UploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
        override suspend fun doWork(): Result = if (flush(applicationContext) >= 0) Result.success() else Result.retry()
    }

    private const val TAG = "Metrics"
}
