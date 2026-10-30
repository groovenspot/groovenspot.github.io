package com.groovenspot.pulsecare.mobile.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.watch.WatchContract
import kotlinx.coroutines.runBlocking

/** 워치에서 온 메시지: 미션 완료, SOS. */
class PhoneListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            WatchContract.PATH_MISSION_DONE -> {
                val missionId = String(event.data, Charsets.UTF_8)
                val store = AppStore.get(this)
                val today = store.today ?: return
                if (today.missionId != missionId) return
                if (!today.completed) {
                    Metrics.track(this, EventName.MISSION_COMPLETED, mapOf("mission_id" to missionId, "auto" to "false", "surface" to "watch"))
                }
                store.today = today.copy(completed = true)
                // 서비스 콜백은 백그라운드 스레드라 짧게 기다려도 됩니다.
                runBlocking { WearSync.markDone(this@PhoneListenerService, missionId) }
            }
            // 워치 앱·타일에서 점수를 봄 ("score_viewed|watch|FULL"). 처음 오면 워치가 연결된 것.
            WatchContract.PATH_EVENT -> {
                val parts = String(event.data, Charsets.UTF_8).split("|")
                Metrics.trackOnce(this, EventName.WATCH_LINKED, mapOf("platform" to "wear_os"))
                if (parts.firstOrNull() == EventName.SCORE_VIEWED.key) {
                    val surface = parts.getOrNull(1) ?: "watch"
                    Metrics.trackDaily(this, EventName.SCORE_VIEWED, surface, mapOf("surface" to surface, "kind" to parts.getOrElse(2) { "" }))
                }
            }
            WatchContract.PATH_SOS -> {
                // 서비스 콜백은 백그라운드 스레드라 서버 호출을 기다려도 됩니다.
                val result = FamilyRepository.sos(this)
                Metrics.track(this, EventName.ALERT_SENT, mapOf("signal" to "SOS", "recipient" to "guardian"))
                Notifications.sos(this, result)
                runBlocking { WearSync.sosResult(this@PhoneListenerService, event.sourceNodeId, result) }
            }
        }
    }
}
