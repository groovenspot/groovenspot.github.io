package com.groovenspot.pulsecare.mobile.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackEntry
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import java.time.LocalDate
import java.time.LocalDateTime

/** 알림의 "괜찮아요" / "잘못된 알림이에요" / "연락했어요" 버튼. 앱을 열지 않고 답합니다. */
class AlertFeedbackReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val signal = intent.getStringExtra(EXTRA_SIGNAL)?.let { runCatching { Signal.valueOf(it) }.getOrNull() } ?: return
        val response = intent.getStringExtra(EXTRA_RESPONSE)?.let { runCatching { FeedbackResponse.valueOf(it) }.getOrNull() } ?: return
        val detection = Detection(
            signal,
            intent.getDoubleExtra(EXTRA_USUAL, Double.NaN).takeUnless { it.isNaN() },
            intent.getDoubleExtra(EXTRA_CURRENT, Double.NaN).takeUnless { it.isNaN() },
            intent.getIntExtra(EXTRA_DAYS, -1).takeIf { it >= 0 },
        )
        record(context, detection, response, guardian = intent.getBooleanExtra(EXTRA_GUARDIAN, false))
        NotificationManagerCompat.from(context).cancel(intent.getIntExtra(EXTRA_NOTIFICATION, 0))
    }

    companion object {
        const val ACTION = "com.groovenspot.pulsecare.ALERT_FEEDBACK"
        const val EXTRA_SIGNAL = "signal"
        const val EXTRA_RESPONSE = "response"
        const val EXTRA_USUAL = "usual"
        const val EXTRA_CURRENT = "current"
        const val EXTRA_DAYS = "days"
        const val EXTRA_GUARDIAN = "guardian"
        const val EXTRA_NOTIFICATION = "notification_id"

        /**
         * 응답 하나를 남깁니다. 본인 알림이면 다음 알림 규칙(24시간, 7일 쉬기 제안)에 쓰고,
         * 보호자 응답은 이용 통계로만 셉니다 (착용자의 알림 규칙을 보호자가 바꾸지 않음).
         */
        fun record(context: Context, detection: Detection, response: FeedbackResponse, guardian: Boolean) {
            if (!guardian) {
                val store = AppStore.get(context)
                store.alertFeedback = store.alertFeedback + FeedbackEntry(LocalDateTime.now(), detection, response)
            }
            Metrics.track(
                context,
                EventName.ALERT_FEEDBACK,
                mapOf("signal" to detection.signal.name, "response" to response.key, "recipient" to if (guardian) "guardian" else "self"),
            )
        }

        /** 7일 쉬기 / 계속 받기. */
        fun snooze(context: Context, signal: Signal, accept: Boolean) {
            val store = AppStore.get(context)
            if (accept) {
                store.snoozedSignals = store.snoozedSignals + (signal to LocalDate.now().plusDays(com.groovenspot.pulsecare.alert.AlertFeedback.SNOOZE_DAYS))
            } else {
                store.snoozeDeclined = store.snoozeDeclined + (signal to LocalDateTime.now())
            }
        }

        fun unsnooze(context: Context, signal: Signal) {
            val store = AppStore.get(context)
            store.snoozedSignals = store.snoozedSignals - signal
        }
    }
}
