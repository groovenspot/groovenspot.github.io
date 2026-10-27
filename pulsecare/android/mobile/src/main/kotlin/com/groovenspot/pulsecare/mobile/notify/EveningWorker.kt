package com.groovenspot.pulsecare.mobile.notify

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.NightMapper
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import com.groovenspot.pulsecare.report.EveningSummary
import com.groovenspot.pulsecare.report.WeeklyReport
import java.time.DayOfWeek
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * 매일 21:00: 오늘 미션을 못 했으면 "내일 다시 해볼까요?"를 묻고, 정보 알림을 모아 보냅니다.
 * 일요일에는 주간 리포트를 만들어 알리고, 홈에 카드로 띄웁니다.
 */
class EveningWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val store = AppStore.get(context)
        val zone = ZoneId.systemDefault()
        val now = LocalDateTime.now(zone)
        val today = now.toLocalDate()
        val force = inputData.getBoolean(DailyJob.FORCE, false)
        val forceWeekly = inputData.getBoolean(DailyJob.FORCE_WEEKLY, false)
        if (store.profile == null || (!force && store.eveningSentOn == today)) {
            if (!force) EveningSchedule.scheduleTomorrow(context, now)
            return Result.success()
        }

        val granted = runCatching { HealthConnectSource.granted(context) }.getOrDefault(emptySet())
        val background = HealthConnectSource.BACKGROUND in granted && granted.containsAll(HealthConnectSource.required)
        // 백그라운드로 읽을 수 있으면 오늘 걸음·운동으로 미션 완료를 한 번 더 확인합니다.
        val home = if (background) {
            runCatching { TodayRepository.refresh(context, now = now) }.onFailure { Log.w(TAG, "refresh", it) }.getOrNull()
        } else {
            null
        }

        val settings = store.settings
        store.today?.takeIf { it.date == today && (settings.eveningEnabled || force) && !forceWeekly }?.let { mission ->
            val info = home?.alertDetections.orEmpty().filter { it.signal.grade == Grade.INFO }.map { AlertText.forSelf(it).body }
            EveningSummary.of(MissionLibrary[mission.missionId], mission.completed, info)?.let {
                Notifications.evening(context, it.title, it.body, if (it.askRetry) mission.missionId else null)
            }
        }
        store.eveningSentOn = today

        if (forceWeekly || (today.dayOfWeek == DayOfWeek.SUNDAY && settings.weeklyEnabled)) weekly(context, store, today, zone, background)

        if (!force) EveningSchedule.scheduleTomorrow(context, now)
        return Result.success()
    }

    private suspend fun weekly(context: Context, store: AppStore, today: java.time.LocalDate, zone: ZoneId, background: Boolean) {
        val profile = store.profile ?: return
        // 4주 전과 비교하려면 5주 치 기록이 필요합니다. 권한이 없으면 미션 기록만으로 만듭니다.
        val from = today.minusDays(35)
        val records = if (background) {
            runCatching { NightMapper.map(HealthConnectSource.read(context, from, today, zone), from, today, zone) }.getOrDefault(emptyList())
        } else {
            emptyList()
        }
        val logs = store.missionLogs + listOfNotNull(store.today?.let { MissionLog(it.date, it.missionId, it.completed, it.auto) })
        val summary = WeeklyReport.build(today, profile.goal, profile.level, profile.goalSince, logs, records)
        store.weekly = summary
        // 레벨을 내리는 건 바로 적용하고, 올리는 건 홈에서 사용자가 수락할 때 적용합니다.
        if (summary.levelChange == com.groovenspot.pulsecare.mission.MissionProgress.LevelChange.DOWN) {
            store.profile = profile.copy(levels = profile.levels + (profile.goal to summary.nextLevel))
        }
        Notifications.weekly(context, summary.title, summary.lines.joinToString("\n"))
    }

    private companion object {
        const val TAG = "EveningWorker"
    }
}
