package com.groovenspot.pulsecare.mobile.family

import com.groovenspot.pulsecare.score.Band

/** 보호자에게 보여 주는 부모님 하루 한 줄 (알림·보호자 홈 공통). */
object GuardianText {
    fun line(t: DaySummary): String {
        val band = t.band?.let { runCatching { Band.valueOf(it) }.getOrNull() }
        val score = t.score?.let { "컨디션 ${it}점" + (band?.let { b -> " (${b.label})" } ?: "") } ?: "워치 기록 없음"
        val mission = if (t.missionDone) "미션 완료" else "미션 아직"
        val alerts = t.alerts.takeIf { it.isNotEmpty() }?.let { " · 확인 필요 ${it.size}건" } ?: ""
        return "$score · $mission$alerts"
    }
}
