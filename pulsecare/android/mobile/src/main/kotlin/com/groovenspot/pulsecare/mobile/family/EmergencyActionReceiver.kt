package com.groovenspot.pulsecare.mobile.family

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mobile.notify.AlertFeedbackReceiver
import com.groovenspot.pulsecare.mobile.notify.Notifications
import kotlin.concurrent.thread

/** 긴급 알림의 "확인했어요"(보호자) / "취소하기"(본인). 앱을 열지 않고 서버에 알립니다. */
class EmergencyActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ID) ?: return
        val pending = goAsync()
        thread {
            try {
                when (intent.action) {
                    ACTION_ACK -> if (FamilyRepository.ackBlocking(context, id)) {
                        intent.getStringExtra(EXTRA_SIGNAL)?.let { s -> runCatching { Signal.valueOf(s) }.getOrNull() }?.let {
                            AlertFeedbackReceiver.record(context, Detection(it), FeedbackResponse.CONTACTED, guardian = true)
                        }
                        Notifications.emergencyClosed(context, id, "확인했다고 알렸어요", "다른 보호자에게 가는 연락은 멈췄어요. 전화로 상태를 확인해 주세요.")
                    } else {
                        Notifications.family(context, "확인을 보내지 못했어요", "인터넷 연결을 확인하고 앱의 가족 탭에서 다시 눌러 주세요.")
                    }
                    ACTION_CANCEL -> if (FamilyRepository.cancelBlocking(context, id)) {
                        Notifications.cancelSos(context)
                        Notifications.family(context, "도움 요청을 취소했어요", "이미 알림을 받은 보호자에게 괜찮다고 알렸어요.")
                    } else {
                        Notifications.family(context, "취소하지 못했어요", "인터넷 연결을 확인해 주세요. 보호자에게 직접 연락해 주세요.")
                    }
                }
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_ACK = "com.groovenspot.pulsecare.EMERGENCY_ACK"
        const val ACTION_CANCEL = "com.groovenspot.pulsecare.EMERGENCY_CANCEL"
        const val EXTRA_ID = "emergency_id"
        const val EXTRA_SIGNAL = "signal"
    }
}
