package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.groovenspot.pulsecare.alert.AlertFeedback
import com.groovenspot.pulsecare.alert.AlertScheduler
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Decision
import com.groovenspot.pulsecare.alert.DeliveryState
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.PendingAlert
import com.groovenspot.pulsecare.alert.Recipient
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.today.MorningReport
import java.time.Duration
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * 본인에게 가는 주의 알림 (아침 리포트와 실시간 심박이 함께 씀).
 * 빈도 제한·방해 금지는 [AlertScheduler]가 정하고, 방해 금지로 미뤄진 알림은 그 시각에 다시 판단해 보냅니다.
 * 사용자가 끈 신호와 쉬는 중인 신호는 보내지 않습니다.
 */
object CautionAlerts {

    fun deliver(context: Context, detections: List<Detection>, now: LocalDateTime = LocalDateTime.now()) {
        val store = AppStore.get(context)
        val today = now.toLocalDate()
        val settings = store.settings
        val scheduler = AlertScheduler(AlertScheduler.Settings(quietStart = settings.quietStart, quietEnd = settings.quietEnd))
        // 응답한 신호는 24시간 다시 알리지 않고(더 나빠지면 예외), 쉬는 중인 신호는 보내지 않습니다.
        val acknowledged = AlertFeedback.acknowledged(store.alertFeedback)
        val snoozed = store.snoozedSignals
        detections
            .filter { settings.allows(it.signal) }
            .filterNot { AlertFeedback.isSnoozed(it.signal, snoozed, today) }
            .forEach { d ->
                val sent = store.sentAlerts(today).map { PendingAlert(Detection(Signal.valueOf(it)), Recipient.SELF, now) }
                when (val decision = scheduler.decide(PendingAlert(d, Recipient.SELF, now), now, DeliveryState(sentToday = sent, acknowledged = acknowledged))) {
                    Decision.SendNow -> {
                        val message = AlertText.forSelf(d)
                        Notifications.caution(context, d.signal.ordinal, d, message.title, message.body, MorningReport.CAUTION_PUBLIC)
                        store.markAlertSent(today, d.signal.name)
                        Metrics.track(context, EventName.ALERT_SENT, mapOf("signal" to d.signal.name, "recipient" to "self"))
                    }
                    is Decision.SendAt -> later(context, d, Duration.between(now, decision.time))
                    is Decision.Drop -> Unit
                }
            }
    }

    /** 방해 금지가 끝나는 시각에 같은 신호를 다시 판단합니다 (같은 신호는 마지막 것 하나만). */
    private fun later(context: Context, d: Detection, delay: Duration) {
        val request = OneTimeWorkRequestBuilder<LaterWorker>()
            .setInitialDelay(delay.toMillis().coerceAtLeast(0), TimeUnit.MILLISECONDS)
            .setInputData(
                workDataOf(
                    KEY_SIGNAL to d.signal.name,
                    KEY_USUAL to (d.usual ?: Double.NaN),
                    KEY_CURRENT to (d.current ?: Double.NaN),
                    KEY_DAYS to (d.days ?: -1),
                ),
            )
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork("caution-${d.signal.name}", ExistingWorkPolicy.REPLACE, request)
    }

    class LaterWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
        override suspend fun doWork(): Result {
            val signal = inputData.getString(KEY_SIGNAL)?.let { runCatching { Signal.valueOf(it) }.getOrNull() } ?: return Result.success()
            val d = Detection(
                signal,
                inputData.getDouble(KEY_USUAL, Double.NaN).takeUnless { it.isNaN() },
                inputData.getDouble(KEY_CURRENT, Double.NaN).takeUnless { it.isNaN() },
                inputData.getInt(KEY_DAYS, -1).takeIf { it >= 0 },
            )
            deliver(applicationContext, listOf(d))
            return Result.success()
        }
    }

    private const val KEY_SIGNAL = "signal"
    private const val KEY_USUAL = "usual"
    private const val KEY_CURRENT = "current"
    private const val KEY_DAYS = "days"
}
