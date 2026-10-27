package com.groovenspot.pulsecare.mobile.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.groovenspot.pulsecare.mobile.data.AppStore
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
                store.today = today.copy(completed = true)
                // 서비스 콜백은 백그라운드 스레드라 짧게 기다려도 됩니다.
                runBlocking { WearSync.markDone(this@PhoneListenerService, missionId) }
            }
            WatchContract.PATH_SOS -> {
                // 서비스 콜백은 백그라운드 스레드라 서버 호출을 기다려도 됩니다.
                val result = FamilyRepository.sos(this)
                Notifications.sos(this, result)
                runBlocking { WearSync.sosResult(this@PhoneListenerService, event.sourceNodeId, result) }
            }
        }
    }
}
