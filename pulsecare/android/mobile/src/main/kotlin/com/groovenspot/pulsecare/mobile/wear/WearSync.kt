package com.groovenspot.pulsecare.mobile.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.family.SosResult
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.ScoreResult
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import kotlinx.coroutines.tasks.await

/**
 * 오늘 요약을 워치로 보냅니다 (데이터 레이어). 홈을 열거나 아침·저녁 작업이 돌 때마다 같은 내용을 덮어씁니다.
 * 워치가 없거나 Play 서비스가 없으면 조용히 넘어갑니다.
 */
object WearSync {

    fun watchToday(home: HomeState): WatchToday = WatchToday(
        date = home.date,
        score = home.score.score.takeIf { home.score.kind != ScoreResult.Kind.NO_DATA },
        band = home.score.band,
        reason = home.score.reason,
        missionId = home.mission.id,
        missionTitle = home.mission.title,
        missionDone = home.missionDone,
        learningDay = home.dayIndex.takeIf { home.learning },
    )

    suspend fun publish(context: Context, home: HomeState) = put(context, watchToday(home))

    /** 워치에서 미션 완료를 누른 뒤: 저장된 요약의 완료 표시만 바꿔 다시 보냅니다. */
    suspend fun markDone(context: Context, missionId: String) {
        val current = runCatching {
            Wearable.getDataClient(context).dataItems.await().use { items ->
                items.firstOrNull { it.uri.path == WatchContract.PATH_TODAY }?.let { item ->
                    val map = com.google.android.gms.wearable.DataMapItem.fromDataItem(item).dataMap
                    WatchContract.decode(map.keySet().associateWith { map.getString(it) })
                }
            }
        }.getOrNull() ?: return
        if (current.missionId == missionId) put(context, current.copy(missionDone = true))
    }

    /** 워치 SOS 화면에 결과를 알려 줍니다 (보호자에게 갔는지 사실대로). */
    suspend fun sosResult(context: Context, nodeId: String, result: SosResult) {
        val text = FamilyRepository.sosCode(result)
        runCatching { Wearable.getMessageClient(context).sendMessage(nodeId, WatchContract.PATH_SOS_RESULT, text.toByteArray()).await() }
            .onFailure { Log.i(TAG, "SOS result not delivered: ${it.message}") }
    }

    private suspend fun put(context: Context, w: WatchToday) {
        runCatching {
            val request = PutDataMapRequest.create(WatchContract.PATH_TODAY).apply {
                WatchContract.encode(w).forEach { (k, v) -> dataMap.putString(k, v) }
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context).putDataItem(request).await()
        }.onFailure { Log.i(TAG, "No watch to sync: ${it.message}") }
    }

    private const val TAG = "WearSync"
}
