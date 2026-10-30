package com.groovenspot.pulsecare.mobile.care

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.groovenspot.pulsecare.care.Bedtime
import com.groovenspot.pulsecare.care.Medications
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.CareStore
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

/**
 * 생활 도우미 알림: 복약 시각, 3시간 뒤 놓침 확인, 취침 30분 전. 다음 일 하나만 예약해 두고,
 * 실행되면 그 시각에 할 일을 하고 다음 것을 예약합니다. WorkManager라 몇 분 늦을 수 있습니다.
 */
object CareSchedule {
    private const val NAME = "care-reminders"

    /** 약이나 취침 알림 설정을 바꿨을 때, 앱을 열 때. */
    fun reschedule(context: Context, now: LocalDateTime = LocalDateTime.now(), fromWorker: Boolean = false) {
        val next = nextEvent(CareStore.get(context), now)
        val manager = WorkManager.getInstance(context)
        if (next == null) {
            if (!fromWorker) manager.cancelUniqueWork(NAME)
            return
        }
        val request = OneTimeWorkRequest.Builder(CareWorker::class.java)
            .setInitialDelay(Duration.between(now, next).toMillis().coerceAtLeast(0), TimeUnit.MILLISECONDS)
            .build()
        // 작업 안에서는 실행 중인 자신을 취소하지 않도록 뒤에 붙입니다.
        manager.enqueueUniqueWork(NAME, if (fromWorker) ExistingWorkPolicy.APPEND_OR_REPLACE else ExistingWorkPolicy.REPLACE, request)
    }

    fun cancel(context: Context) = WorkManager.getInstance(context).cancelUniqueWork(NAME)

    fun bedtimeReminder(care: CareStore): LocalTime = Bedtime.reminderAt(care.usualBedtime, care.bedtimeFixed)

    internal fun nextEvent(care: CareStore, now: LocalDateTime): LocalDateTime? {
        val bedtime = if (care.bedtimeEnabled) {
            val at = now.toLocalDate().atTime(bedtimeReminder(care))
            if (at.isAfter(now)) at else at.plusDays(1)
        } else {
            null
        }
        return listOfNotNull(Medications.nextEvent(care.medications, now), bedtime).minOrNull()
    }
}

class CareWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val now = LocalDateTime.now()
        if (AppStore.get(context).profile == null) return Result.success()
        val care = CareStore.get(context)
        val today = now.toLocalDate()
        val prefs = context.getSharedPreferences("pulsecare", Context.MODE_PRIVATE)
        val notified = prefs.getStringSet(KEY_NOTIFIED, emptySet())!!.filter { it.startsWith(today.toString()) }.toMutableSet()
        // 늦게 깨어나도 지난 15분 안의 일은 처리합니다.
        val window = now.minusMinutes(15)
        var missedNow = false

        Medications.today(care.medications, care.doseLogs, now).filter { !it.taken }.forEach { dose ->
            val due = today.atTime(dose.time)
            val dueKey = "$today|${dose.medication.id}|${dose.time}|due"
            if (!due.isAfter(now) && due.isAfter(window.minusMinutes(45)) && notified.add(dueKey)) {
                Notifications.medication(context, dose.medication.id, dose.medication.name, dose.time, missed = false)
            }
            val missedKey = "$today|${dose.medication.id}|${dose.time}|missed"
            if (dose.missed && notified.add(missedKey)) {
                Notifications.medication(context, dose.medication.id, dose.medication.name, dose.time, missed = true)
                missedNow = true
            }
        }

        if (care.bedtimeEnabled) {
            val at = today.atTime(CareSchedule.bedtimeReminder(care))
            val key = "$today|bedtime"
            if (!at.isAfter(now) && at.isAfter(window) && notified.add(key)) Notifications.bedtime(context)
        }
        prefs.edit().putStringSet(KEY_NOTIFIED, notified).apply()

        // 놓친 약은 보호자 하루 요약에도 실리도록 오늘 요약을 다시 올립니다.
        if (missedNow) runCatching { TodayRepository.refresh(context, now = now) }.onFailure { Log.w(TAG, "refresh", it) }

        CareSchedule.reschedule(context, now.plusSeconds(1), fromWorker = true)
        return Result.success()
    }

    companion object {
        private const val TAG = "CareWorker"
        private const val KEY_NOTIFIED = "care_notified"
    }
}

/** 복약 알림의 "먹었어요". 앱을 열지 않고 체크합니다. */
class CareActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TAKEN) return
        val med = intent.getStringExtra(EXTRA_MEDICATION) ?: return
        val time = intent.getStringExtra(EXTRA_TIME)?.let(LocalTime::parse) ?: return
        CareStore.get(context).markTaken(med, time, LocalDateTime.now())
        NotificationManagerCompat.from(context).cancel(intent.getIntExtra(EXTRA_NOTIFICATION, 0))
    }

    companion object {
        const val ACTION_TAKEN = "com.groovenspot.pulsecare.DOSE_TAKEN"
        const val EXTRA_MEDICATION = "medication"
        const val EXTRA_TIME = "time"
        const val EXTRA_NOTIFICATION = "notification"
    }
}
