package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

/**
 * 아침 리포트 예약 (기획서 12번: 아침 리포트 기본 07:30). 정확한 시각 알람 대신 WorkManager로 예약해
 * 배터리 최적화를 따르고, 몇 분 늦을 수 있습니다. 워치 기록이 아직 안 들어왔으면 1시간 뒤 다시 봅니다.
 */
object MorningSchedule {

    private const val NAME = "morning-report"
    val TIME: LocalTime = LocalTime.of(7, 30)

    /** 기록이 안 들어온 날 마지막으로 다시 보는 시각. 이후에는 "어젯밤 기록이 없어요"로 보냅니다. */
    val LAST_RETRY: LocalTime = LocalTime.of(10, 30)

    /** 앱을 열 때마다 호출: 예약이 없을 때만 다음 07:30에 겁니다. */
    fun ensure(context: Context) = enqueue(context, delayUntilNext(LocalDateTime.now(), TIME), ExistingWorkPolicy.KEEP)

    /** 작업 안에서 다음 날 예약. 실행 중인 작업을 취소하지 않도록 뒤에 붙입니다. */
    fun scheduleTomorrow(context: Context, now: LocalDateTime) =
        enqueue(context, delayUntilNext(now, TIME), ExistingWorkPolicy.APPEND_OR_REPLACE)

    fun retryLater(context: Context) = enqueue(context, Duration.ofHours(1), ExistingWorkPolicy.APPEND_OR_REPLACE)

    private fun enqueue(context: Context, delay: Duration, policy: ExistingWorkPolicy) {
        val request = OneTimeWorkRequestBuilder<MorningWorker>()
            .setInitialDelay(delay.toMillis(), TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(NAME, policy, request)
    }

    /** [now] 이후 처음 오는 [at]까지 (지금이 정확히 그 시각이면 내일). */
    fun delayUntilNext(now: LocalDateTime, at: LocalTime): Duration {
        var next = now.toLocalDate().atTime(at)
        if (!next.isAfter(now)) next = next.plusDays(1)
        return Duration.between(now, next)
    }
}
