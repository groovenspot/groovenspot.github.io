package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.groovenspot.pulsecare.alert.AlertFeedback
import com.groovenspot.pulsecare.alert.AlertScheduler
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Decision
import com.groovenspot.pulsecare.alert.DeliveryState
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.alert.PendingAlert
import com.groovenspot.pulsecare.alert.Recipient
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.family.GuardianText
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.today.MorningReport
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import com.groovenspot.pulsecare.score.ScoreResult
import java.time.LocalDateTime

/**
 * 매일 아침: 지난밤 기록으로 점수를 계산해 아침 리포트를 보내고, 주의 신호가 있으면 따로 알립니다.
 * 백그라운드 읽기 권한이 없으면 점수 없이 "확인해 보세요"만 보냅니다 (앱을 열면 계산).
 */
class MorningWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val store = AppStore.get(context)
        val now = LocalDateTime.now()
        val today = now.toLocalDate()
        // 테스트 도구의 "지금 보내기": 보낸 기록·재시도·다음 예약을 건너뜁니다.
        val force = inputData.getBoolean(DailyJob.FORCE, false)
        fun next() { if (!force) MorningSchedule.scheduleTomorrow(context, now) }
        if (!force && !store.settings.morningEnabled) return Result.success()
        if (store.profile == null || (!force && store.morningSentOn == today)) {
            next()
            return Result.success()
        }

        if (store.profile?.guardianOnly == true) {
            guardianMorning(context, store, now)
            store.morningSentOn = today
            next()
            return Result.success()
        }

        val granted = runCatching { HealthConnectSource.granted(context) }.getOrDefault(emptySet())
        if (!granted.containsAll(HealthConnectSource.required) || HealthConnectSource.BACKGROUND !in granted) {
            Notifications.morning(context, "오늘의 컨디션을 확인해 보세요", "앱을 열면 어젯밤 기록으로 점수를 계산해요", MorningReport.PUBLIC)
            store.morningSentOn = today
            next()
            return Result.success()
        }

        val home = try {
            TodayRepository.refresh(context, now = now)
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't compute today", e)
            null
        }
        if (home == null) {
            if (!force) MorningSchedule.retryLater(context)
            return Result.success()
        }
        // 워치가 아직 동기화 전일 수 있으니 10:30까지는 1시간마다 다시 봅니다.
        if (!force && home.score.kind == ScoreResult.Kind.NO_DATA && now.toLocalTime() < morningLastRetry(store.settings)) {
            MorningSchedule.retryLater(context)
            return Result.success()
        }

        val text = MorningReport.of(home)
        val info = home.alertDetections.filter { it.signal.grade == Grade.INFO }.map { AlertText.forSelf(it).body }
        Notifications.morning(context, text.title, MorningReport.infoLines(home, info), MorningReport.PUBLIC)
        store.morningSentOn = today

        CautionAlerts.deliver(context, home.alertDetections.filter { it.signal.grade == Grade.CAUTION }, now)
        next()
        return Result.success()
    }

    /** 보호자 전용: 오늘의 보호자 미션 + 부모님이 이미 올린 오늘 요약 (서버가 없거나 실패해도 미션은 보냄). */
    private suspend fun guardianMorning(context: Context, store: AppStore, now: LocalDateTime) {
        val home = runCatching { TodayRepository.refresh(context, now = now) }.getOrNull()
        val family = runCatching { FamilyRepository.family(context) }.getOrNull()
        val parents = family?.wearers.orEmpty().map { w ->
            w.person.name to w.today?.takeIf { it.day == now.toLocalDate().toString() }?.let { GuardianText.line(it) }
        }
        val mission = home?.mission?.title?.let { "오늘의 미션: $it" } ?: "앱에서 오늘의 미션을 확인해 보세요"
        val text = MorningReport.guardian(mission, parents)
        Notifications.morning(context, text.title, text.body, MorningReport.GUARDIAN_PUBLIC)
    }

    private companion object {
        const val TAG = "MorningWorker"
    }
}
