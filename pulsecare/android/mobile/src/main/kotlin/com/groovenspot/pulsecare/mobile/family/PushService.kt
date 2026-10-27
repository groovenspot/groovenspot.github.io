package com.groovenspot.pulsecare.mobile.family

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.groovenspot.pulsecare.mobile.notify.Notifications

/** 가족 서버가 보내는 데이터 푸시. 문구는 서버가, 채널·버튼·잠금화면 문구는 앱이 정합니다. */
class PushService : FirebaseMessagingService() {

    override fun onNewToken(token: String) = FamilyRepository.registerPushToken(this, token)

    override fun onMessageReceived(message: RemoteMessage) {
        val d = message.data
        val title = d["title"] ?: return
        val body = d["body"].orEmpty()
        when (d["type"]) {
            "EMERGENCY" -> Notifications.familyEmergency(this, d["emergencyId"] ?: return, title, body, d["phone"])
            "EMERGENCY_CLOSED" -> Notifications.emergencyClosed(this, d["emergencyId"] ?: return, title, body)
            "EMERGENCY_ACK" -> {
                Notifications.cancelSos(this)
                Notifications.family(this, title, body)
            }
            else -> Notifications.family(this, title, body)
        }
    }
}
