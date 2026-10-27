package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import androidx.work.workDataOf
import kotlinx.coroutines.flow.first
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.NotificationSettings
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit
import kotlin.reflect.KClass

/**
 * 하루 한 번 정해진 시각에 도는 작업. 정확한 시각 알람 대신 WorkManager로 예약해
 * 배터리 최적화를 따르고, 몇 분 늦을 수 있습니다.
 */
class DailyJob(
    private val name: String,
    private val timeOf: (NotificationSettings) -> LocalTime,
    private val enabledOf: (NotificationSettings) -> Boolean,
    private val worker: KClass<out CoroutineWorker>,
) {
    private fun settings(context: Context) = AppStore.get(context).settings

    /** 앱을 열 때마다 호출: 켜져 있고 예약이 없을 때만 다음 시각에 겁니다. */
    fun ensure(context: Context) {
        val s = settings(context)
        if (!enabledOf(s)) return cancel(context)
        enqueue(context, delayUntilNext(LocalDateTime.now(), timeOf(s)), ExistingWorkPolicy.KEEP)
    }

    /** 설정에서 시각이나 켜고 끄기를 바꿨을 때: 지금 예약을 바꿉니다. */
    fun reschedule(context: Context) {
        val s = settings(context)
        if (!enabledOf(s)) return cancel(context)
        enqueue(context, delayUntilNext(LocalDateTime.now(), timeOf(s)), ExistingWorkPolicy.REPLACE)
    }

    /** 작업 안에서 다음 날 예약. 실행 중인 작업을 취소하지 않도록 뒤에 붙입니다. */
    fun scheduleTomorrow(context: Context, now: LocalDateTime) {
        val s = settings(context)
        if (!enabledOf(s)) return
        enqueue(context, delayUntilNext(now, timeOf(s)), ExistingWorkPolicy.APPEND_OR_REPLACE)
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(name)
    }

    fun retryLater(context: Context) = enqueue(context, Duration.ofHours(1), ExistingWorkPolicy.APPEND_OR_REPLACE)

    /** 테스트 도구: 정해진 시각을 기다리지 않고 지금 한 번 실행합니다. 정기 예약은 그대로 둡니다. */
    fun runNow(context: Context, weekly: Boolean = false) {
        val request = OneTimeWorkRequest.Builder(worker.java)
            .setInputData(workDataOf(FORCE to true, FORCE_WEEKLY to weekly))
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork("$name-now", ExistingWorkPolicy.REPLACE, request)
    }

    /** 다음 정기 실행 예정 시각 (테스트 도구 표시용). 없으면 null. */
    suspend fun nextRunMillis(context: Context): Long? =
        WorkManager.getInstance(context).getWorkInfosForUniqueWorkFlow(name).first()
            .firstOrNull { !it.state.isFinished }?.nextScheduleTimeMillis?.takeIf { it != Long.MAX_VALUE }

    private fun enqueue(context: Context, delay: Duration, policy: ExistingWorkPolicy) {
        val request = OneTimeWorkRequest.Builder(worker.java)
            .setInitialDelay(delay.toMillis(), TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(name, policy, request)
    }

    companion object {
        const val FORCE = "force"
        const val FORCE_WEEKLY = "force_weekly"

        /** [now] 이후 처음 오는 [at]까지 (지금이 정확히 그 시각이면 내일). */
        fun delayUntilNext(now: LocalDateTime, at: LocalTime): Duration {
            var next = now.toLocalDate().atTime(at)
            if (!next.isAfter(now)) next = next.plusDays(1)
            return Duration.between(now, next)
        }
    }
}

/** 아침 리포트 (기획서 12번: 기본 07:30). 워치 기록이 아직 없으면 10:30까지 1시간마다 다시 봅니다. */
val MorningSchedule = DailyJob("morning-report", { it.morningTime }, { it.morningEnabled }, MorningWorker::class)

/** 아침 리포트를 다시 보는 시간: 설정 시각부터 3시간. 이후에는 "어젯밤 기록이 없어요"로 보냅니다. */
fun morningLastRetry(settings: NotificationSettings): LocalTime = settings.morningTime.plusHours(3)

/** 저녁 요약 (기획서 12번: 21:00). 일요일에는 주간 리포트도 함께. */
val EveningSchedule = DailyJob("evening-summary", { it.eveningTime }, { it.eveningEnabled || it.weeklyEnabled }, EveningWorker::class)
