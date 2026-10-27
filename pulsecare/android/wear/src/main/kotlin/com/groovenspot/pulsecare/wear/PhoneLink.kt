package com.groovenspot.pulsecare.wear

import android.content.Context
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import kotlinx.coroutines.tasks.await

/** 폰과 주고받기. 연결된 폰이 없으면 false. */
object PhoneLink {

    suspend fun sendMissionDone(context: Context, missionId: String): Boolean =
        send(context, WatchContract.PATH_MISSION_DONE, missionId.toByteArray(Charsets.UTF_8))

    suspend fun sendSos(context: Context): Boolean = send(context, WatchContract.PATH_SOS, ByteArray(0))

    /** 점수를 봤다고 폰에 알립니다 (폰이 이용 통계 동의를 보고 모읍니다). */
    suspend fun scoreViewed(context: Context, surface: String, kind: String) {
        send(context, WatchContract.PATH_EVENT, "score_viewed|$surface|$kind".toByteArray(Charsets.UTF_8))
    }

    /** 앱을 열 때: 리스너가 놓친 최신 요약을 직접 가져옵니다. */
    suspend fun fetchToday(context: Context): WatchToday? = runCatching {
        Wearable.getDataClient(context).dataItems.await().use { items ->
            items.firstOrNull { it.uri.path == WatchContract.PATH_TODAY }?.let { item ->
                val map = DataMapItem.fromDataItem(item).dataMap
                WatchContract.decode(map.keySet().associateWith { map.getString(it) })
            }
        }
    }.getOrNull()

    private suspend fun send(context: Context, path: String, data: ByteArray): Boolean = runCatching {
        val nodes = Wearable.getNodeClient(context).connectedNodes.await()
        nodes.forEach { Wearable.getMessageClient(context).sendMessage(it.id, path, data).await() }
        nodes.isNotEmpty()
    }.getOrDefault(false)
}
