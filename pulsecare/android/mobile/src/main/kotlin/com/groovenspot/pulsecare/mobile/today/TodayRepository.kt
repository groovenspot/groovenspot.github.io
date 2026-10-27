package com.groovenspot.pulsecare.mobile.today

import android.content.Context
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.NightMapper
import java.time.LocalDateTime
import java.time.ZoneId

/** Health Connect를 읽어 오늘 계획을 만들고 저장합니다. 홈 화면과 아침 알림이 같이 씁니다. */
object TodayRepository {

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
        val raw = HealthConnectSource.read(context, from, today, zone)
        val granted = HealthConnectSource.granted(context)
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
        store.today = plan.today
        store.missionLogs = plan.logs
        store.scores = plan.scores
        // 사용자가 끈 신호는 홈 카드와 알림에서 뺍니다. 점수 상한(주의 신호)은 건강 판단이라 그대로 둡니다.
        val settings = store.settings
        val shown = plan.home.alertDetections.filter { settings.allows(it.signal) }
        return plan.home.copy(alerts = shown.map { AlertText.forSelf(it) }, alertDetections = shown)
    }
}
