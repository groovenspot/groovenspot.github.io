package com.groovenspot.pulsecare.mobile.today

import android.content.Context
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.metrics.EventRules
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.data.TodayMission
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.health.NightMapper
import com.groovenspot.pulsecare.mobile.health.RawHealth
import com.groovenspot.pulsecare.mobile.wear.WearSync
import java.time.LocalDateTime
import java.time.ZoneId

/** Health Connect를 읽어 오늘 계획을 만들고 저장합니다. 홈 화면과 아침 알림이 같이 씁니다. */
object TodayRepository {

    /** 이용 통계: 새 미션, 워치 기록으로 확인된 완료, 첫 워치 기록. */
    private fun trackPlan(
        context: Context,
        before: TodayMission?,
        logsBefore: List<MissionLog>,
        plan: Plan,
        profile: Profile,
        hasSleep: Boolean,
    ) {
        val today = plan.today
        if (before == null || before.date != today.date || before.missionId != today.missionId) {
            Metrics.track(context, EventName.MISSION_SHOWN, mapOf("mission_id" to today.missionId, "goal" to profile.goal.name, "level" to profile.level.toString()))
        }
        if (today.auto && today.completed && !(before?.date == today.date && before.completed)) {
            Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to today.missionId, "auto" to "true", "surface" to "watch_data"))
        }
        // 어젯밤 취침처럼 다음 날 아침에 확인된 미션.
        plan.logs.filter { log -> log.auto && logsBefore.none { it.date == log.date } }.forEach {
            Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to it.missionId, "auto" to "true", "surface" to "watch_data"))
        }
        if (hasSleep && !profile.guardianOnly) Metrics.trackOnce(context, EventName.DATA_FIRST_RECEIVED, mapOf("day" to EventRules.dayBucket(plan.home.dayIndex)))
    }

    suspend fun refresh(
        context: Context,
        feeling: Int? = null,
        zone: ZoneId = ZoneId.systemDefault(),
        now: LocalDateTime = LocalDateTime.now(zone),
    ): HomeState? {
        val store = AppStore.get(context)
        val profile = store.profile ?: return null
        val today = now.toLocalDate()
        // 점수 기준선 28일 + 미션용 평소 취침 시각 28일을 위해 하루 더 앞에서부터.
        val from = today.minusDays(29)
        // 보호자 전용: 워치 기록 없이 보호자 미션만 고릅니다 (점수 없음).
        val raw = if (profile.guardianOnly) RawHealth() else HealthConnectSource.read(context, from, today, zone)
        val granted = if (profile.guardianOnly) HealthConnectSource.all else HealthConnectSource.granted(context)
        val plan = TodayPlanner().plan(
            today = today,
            records = NightMapper.map(raw, from, today, zone),
            profile = profile,
            stored = store.today,
            logs = store.missionLogs,
            scores = store.scores,
            feeling = feeling,
            missingPermissions = !granted.containsAll(HealthConnectSource.all),
            activities = listOf(today.minusDays(1), today).associateWith { NightMapper.activity(raw, it, zone) },
            now = now,
            retryMissionId = store.retryFor(today),
        )
        trackPlan(context, store.today, store.missionLogs, plan, profile, raw.sleep.isNotEmpty())
        store.today = plan.today
        store.missionLogs = plan.logs
        store.scores = plan.scores
        // 사용자가 끈 신호는 홈 카드와 알림에서 뺍니다. 점수 상한(주의 신호)은 건강 판단이라 그대로 둡니다.
        val settings = store.settings
        val shown = plan.home.alertDetections.filter { settings.allows(it.signal) }
        return plan.home.copy(alerts = shown.map { AlertText.forSelf(it) }, alertDetections = shown)
            .also {
                WearSync.publish(context, it)
                FamilyRepository.uploadSummary(context, it)
            }
    }
}
