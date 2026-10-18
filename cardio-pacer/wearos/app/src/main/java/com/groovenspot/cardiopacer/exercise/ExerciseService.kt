package com.groovenspot.cardiopacer.exercise

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.health.services.client.ExerciseClient
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseState
import androidx.health.services.client.data.ExerciseUpdate
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.groovenspot.cardiopacer.R
import com.groovenspot.cardiopacer.ui.MainActivity
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneRange
import com.groovenspot.cardiopacer.zone.ZoneTimeLedger
import com.groovenspot.cardiopacer.zone.ZoneTracker
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch

/**
 * Foreground service that owns the Health Services exercise, so heart rate keeps
 * streaming (and the haptic alert keeps firing) with the screen off or the app
 * in the background. Publishes everything through [ExerciseRepository].
 */
class ExerciseService : LifecycleService() {

    private val client: ExerciseClient by lazy { HealthServices.getClient(this).exerciseClient }

    private var tracker = ZoneTracker(ZoneRange(130, 145))
    private var ledger = ZoneTimeLedger()
    private var lastAlertAt = 0L
    private var heartRateSum = 0.0
    private var heartRateCount = 0
    private var finished = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        when (intent?.action) {
            ACTION_START -> {
                val activity = WorkoutActivity.valueOf(intent.getStringExtra(EXTRA_ACTIVITY)!!)
                val range = ZoneRange(
                    intent.getIntExtra(EXTRA_LOWER, 130),
                    intent.getIntExtra(EXTRA_UPPER, 145),
                )
                startInForeground()
                lifecycleScope.launch { startExercise(activity, range) }
            }
            ACTION_PAUSE -> lifecycleScope.launch { runCatching { client.pauseExerciseAsync().await() } }
            ACTION_RESUME -> lifecycleScope.launch { runCatching { client.resumeExerciseAsync().await() } }
            ACTION_END -> {
                ExerciseRepository.update { it.copy(phase = Phase.ENDING) }
                lifecycleScope.launch {
                    runCatching { client.endExerciseAsync().await() }
                        .onFailure { finish(ExerciseRepository.state.value.elapsedMillis()) }
                }
            }
        }
        return START_NOT_STICKY
    }

    private suspend fun startExercise(activity: WorkoutActivity, range: ZoneRange) {
        tracker = ZoneTracker(range)
        ledger = ZoneTimeLedger()
        heartRateSum = 0.0
        heartRateCount = 0
        finished = false
        ExerciseRepository.update {
            ExerciseUiState(
                phase = Phase.STARTING,
                activity = activity,
                range = range,
                checkpoint = ActiveDurationCheckpoint(0, System.currentTimeMillis()),
            )
        }

        val config = ExerciseConfig.builder(activity.exerciseType)
            .setDataTypes(setOf(DataType.HEART_RATE_BPM))
            .setIsAutoPauseAndResumeEnabled(false)
            .setIsGpsEnabled(false)
            .build()

        try {
            client.setUpdateCallback(callback)
            client.startExerciseAsync(config).await()
            Haptics.tick(this)
        } catch (e: Exception) {
            ExerciseRepository.update {
                ExerciseUiState(activity = activity, range = range, error = "운동을 시작할 수 없습니다.\n${e.message}")
            }
            stopEverything()
        }
    }

    private val callback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            update.activeDurationCheckpoint?.let { cp ->
                ExerciseRepository.update {
                    it.copy(checkpoint = ActiveDurationCheckpoint(cp.activeDuration.toMillis(), cp.time.toEpochMilli()))
                }
            }

            val state = update.exerciseStateInfo.state
            when {
                state.isEnded -> {
                    finish(ExerciseRepository.state.value.elapsedMillis())
                    return
                }
                state.isPaused -> setPhase(Phase.PAUSED)
                state == ExerciseState.ACTIVE -> setPhase(Phase.RUNNING)
            }

            update.latestMetrics.getData(DataType.HEART_RATE_BPM).lastOrNull()?.let { sample ->
                handleHeartRate(sample.value)
            }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit
        override fun onRegistered() = Unit

        override fun onRegistrationFailed(throwable: Throwable) {
            ExerciseRepository.update { it.copy(error = throwable.message) }
        }

        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) = Unit
    }

    private fun setPhase(phase: Phase) {
        val current = ExerciseRepository.state.value
        if (current.phase == phase || current.phase == Phase.ENDING) return
        // Close (or reopen) the current zone's time slice at the pause/resume point.
        ledger.mark(current.zone, current.elapsedMillis())
        ExerciseRepository.update { it.copy(phase = phase) }
    }

    private fun handleHeartRate(bpm: Double) {
        val state = ExerciseRepository.state.value
        if (state.phase != Phase.RUNNING) {
            ExerciseRepository.update { it.copy(heartRate = bpm) }
            return
        }

        heartRateSum += bpm
        heartRateCount += 1

        val previous = state.zone
        val zone = tracker.update(bpm)
        ledger.mark(zone, state.elapsedMillis())
        ExerciseRepository.update { it.copy(heartRate = bpm, zone = zone) }

        val now = System.currentTimeMillis()
        if (zone == HeartRateZone.ABOVE && previous != HeartRateZone.ABOVE && now - lastAlertAt >= ALERT_COOLDOWN_MS) {
            lastAlertAt = now
            Haptics.zoneExceeded(this)
        }
    }

    private fun finish(finalElapsedMillis: Long) {
        if (finished) return
        finished = true
        ledger.mark(null, finalElapsedMillis)
        val state = ExerciseRepository.state.value
        val summary = WorkoutSummary(
            durationMillis = finalElapsedMillis,
            zoneMillis = ledger.millis.toMap(),
            averageHeartRate = if (heartRateCount > 0) heartRateSum / heartRateCount else null,
            range = state.range,
        )
        ExerciseRepository.update { it.copy(phase = Phase.ENDED, summary = summary) }
        Haptics.tick(this)
        stopEverything()
    }

    private fun stopEverything() {
        lifecycleScope.launch {
            runCatching { client.clearUpdateCallbackAsync(callback).await() }
            ServiceCompat.stopForeground(this@ExerciseService, ServiceCompat.STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun startInForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "운동 중", NotificationManager.IMPORTANCE_DEFAULT),
        )

        val openApp = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_heart)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("Zone 2 운동 중")
            .setContentIntent(openApp)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOngoing(true)
            .setSilent(true)

        // Shows the app's icon on the watch face so the user can jump back in.
        OngoingActivity.Builder(applicationContext, NOTIFICATION_ID, builder)
            .setStaticIcon(R.drawable.ic_heart)
            .setTouchIntent(openApp)
            .setStatus(Status.Builder().addTemplate("Zone 2 운동 중").build())
            .build()
            .apply(applicationContext)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
        } else {
            0
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, builder.build(), type)
    }

    companion object {
        private const val ACTION_START = "com.groovenspot.cardiopacer.START"
        private const val ACTION_PAUSE = "com.groovenspot.cardiopacer.PAUSE"
        private const val ACTION_RESUME = "com.groovenspot.cardiopacer.RESUME"
        private const val ACTION_END = "com.groovenspot.cardiopacer.END"
        private const val EXTRA_ACTIVITY = "activity"
        private const val EXTRA_LOWER = "lower"
        private const val EXTRA_UPPER = "upper"

        private const val CHANNEL_ID = "exercise"
        private const val NOTIFICATION_ID = 1

        /** Minimum gap between two "zone exceeded" alerts. */
        private const val ALERT_COOLDOWN_MS = 5_000L

        fun start(context: Context, activity: WorkoutActivity, range: ZoneRange) {
            ExerciseRepository.update { it.copy(phase = Phase.STARTING, activity = activity, range = range, error = null) }
            val intent = Intent(context, ExerciseService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_ACTIVITY, activity.name)
                .putExtra(EXTRA_LOWER, range.lower)
                .putExtra(EXTRA_UPPER, range.upper)
            ContextCompat.startForegroundService(context, intent)
        }

        fun pause(context: Context) = send(context, ACTION_PAUSE)
        fun resume(context: Context) = send(context, ACTION_RESUME)
        fun end(context: Context) = send(context, ACTION_END)

        private fun send(context: Context, action: String) {
            context.startService(Intent(context, ExerciseService::class.java).setAction(action))
        }
    }
}
