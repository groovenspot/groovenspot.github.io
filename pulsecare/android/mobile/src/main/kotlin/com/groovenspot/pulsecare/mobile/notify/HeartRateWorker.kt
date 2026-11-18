package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.groovenspot.pulsecare.alert.HeartRateWatch
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.LiveHeart
import com.groovenspot.pulsecare.mobile.health.StepSpan
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlin.reflect.KClass

/**
 * 실시간 고정 기준 심박 신호 (기획서 12번: 쉬는 중 120 bpm 이상 10분, 깨어 있을 때 40 bpm 미만 10분).
 * 워치가 Health Connect에 심박을 올리는 주기에 따라 늦을 수 있어 15분마다 지난 1시간을 봅니다.
 * 같은 신호는 하루 한 번, 방해 금지·끈 신호·쉬기는 [CautionAlerts]가 지킵니다.
 */
class HeartRateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val profile = AppStore.get(context).profile ?: return Result.success()
        if (profile.guardianOnly || !HealthConnectSource.isAvailable(context)) return Result.success()
        val client = HealthConnectClient.getOrCreate(context)
        val granted = runCatching { client.permissionController.getGrantedPermissions() }.getOrDefault(emptySet())
        if (PERMISSION !in granted || HealthConnectSource.BACKGROUND !in granted) return Result.success()

        val end = Instant.now()
        val range = TimeRangeFilter.between(end.minus(WINDOW), end)
        suspend fun <T : Record> read(type: KClass<T>): List<T> =
            if (HealthPermission.getReadPermission(type) !in granted) emptyList()
            else runCatching { client.readRecords(ReadRecordsRequest(type, range)).records }.onFailure { Log.w(TAG, "read", it) }.getOrDefault(emptyList())

        val samples = LiveHeart.samples(
            heartRate = read(HeartRateRecord::class).flatMap { r -> r.samples.map { it.time to it.beatsPerMinute } },
            steps = read(StepsRecord::class).map { StepSpan(it.startTime, it.endTime, it.count) },
            sleeps = read(SleepSessionRecord::class).map { it.startTime to it.endTime },
            workouts = read(ExerciseSessionRecord::class).map { it.startTime to it.endTime },
        )
        val detections = HeartRateWatch.evaluate(samples)
        if (detections.isNotEmpty()) CautionAlerts.deliver(context, detections)
        return Result.success()
    }

    companion object {
        private const val TAG = "HeartRateWorker"
        private val WINDOW = Duration.ofHours(1)
        val PERMISSION = HealthPermission.getReadPermission(HeartRateRecord::class)

        /** 앱을 열 때마다: 이미 있으면 그대로 둡니다. */
        fun ensure(context: Context) {
            val request = PeriodicWorkRequestBuilder<HeartRateWorker>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("heart-rate-watch", ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}
