package com.groovenspot.pulsecare.mobile.history

import android.content.Context
import com.groovenspot.pulsecare.history.History
import com.groovenspot.pulsecare.history.HistoryBuilder
import com.groovenspot.pulsecare.history.Period
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.NightMapper
import java.time.LocalDate
import java.time.ZoneId

/** 기록 탭: 건강 수치는 저장하지 않으므로 열 때마다 Health Connect에서 읽어 그립니다. */
object HistoryRepository {

    suspend fun load(
        context: Context,
        period: Period,
        zone: ZoneId = ZoneId.systemDefault(),
        today: LocalDate = LocalDate.now(zone),
    ): History? {
        val store = AppStore.get(context)
        val profile = store.profile ?: return null
        val from = today.minusDays(HistoryBuilder.readDays(period))
        val records = NightMapper.map(HealthConnectSource.read(context, from, today, zone), from, today, zone)
        val logs = store.missionLogs + listOfNotNull(store.today?.let { MissionLog(it.date, it.missionId, it.completed, it.auto) })
        return HistoryBuilder.build(period, today, records, profile.signupDate, store.scores, logs)
    }
}
