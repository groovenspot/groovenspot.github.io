package com.groovenspot.pulsecare.mobile.data

import com.groovenspot.pulsecare.alert.Signal
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalTime

/**
 * "내 정보 > 알림" (기획서 12번): 모든 시간과 신호별 알림을 바꿀 수 있고, 긴급 알림만 끌 수 없습니다.
 */
data class NotificationSettings(
    val morningEnabled: Boolean = true,
    val morningTime: LocalTime = LocalTime.of(7, 30),
    val eveningEnabled: Boolean = true,
    val eveningTime: LocalTime = LocalTime.of(21, 0),
    val weeklyEnabled: Boolean = true,
    val quietStart: LocalTime = LocalTime.of(23, 0),
    val quietEnd: LocalTime = LocalTime.of(7, 0),
    /** 사용자가 끈 신호. 긴급 신호(SOS·낙상)는 넣어도 무시합니다. */
    val disabledSignals: Set<Signal> = emptySet(),
) {
    fun allows(signal: Signal): Boolean = signal !in disabledSignals || signal in ALWAYS_ON

    companion object {
        val ALWAYS_ON = setOf(Signal.SOS, Signal.FALL)

        /** 설정 화면에 보여주는 신호 (지금 폰 앱이 판정하는 것만). */
        val ADJUSTABLE = listOf(
            Signal.RESTING_HR_RISE,
            Signal.ACTIVITY_DROP,
            Signal.LOW_SPO2,
            Signal.SLEEP_DEBT,
            Signal.STRESS,
        )

        fun encode(s: NotificationSettings): String = JSONObject()
            .put("morningOn", s.morningEnabled)
            .put("morning", s.morningTime.toString())
            .put("eveningOn", s.eveningEnabled)
            .put("evening", s.eveningTime.toString())
            .put("weeklyOn", s.weeklyEnabled)
            .put("quietStart", s.quietStart.toString())
            .put("quietEnd", s.quietEnd.toString())
            .put("off", JSONArray(s.disabledSignals.map { it.name }))
            .toString()

        fun decode(s: String): NotificationSettings {
            val o = JSONObject(s)
            val d = NotificationSettings()
            val off = o.optJSONArray("off")
            return NotificationSettings(
                morningEnabled = o.optBoolean("morningOn", d.morningEnabled),
                morningTime = o.optString("morning").takeIf { it.isNotEmpty() }?.let(LocalTime::parse) ?: d.morningTime,
                eveningEnabled = o.optBoolean("eveningOn", d.eveningEnabled),
                eveningTime = o.optString("evening").takeIf { it.isNotEmpty() }?.let(LocalTime::parse) ?: d.eveningTime,
                weeklyEnabled = o.optBoolean("weeklyOn", d.weeklyEnabled),
                quietStart = o.optString("quietStart").takeIf { it.isNotEmpty() }?.let(LocalTime::parse) ?: d.quietStart,
                quietEnd = o.optString("quietEnd").takeIf { it.isNotEmpty() }?.let(LocalTime::parse) ?: d.quietEnd,
                disabledSignals = off?.let { a ->
                    (0 until a.length()).mapNotNull { runCatching { Signal.valueOf(a.getString(it)) }.getOrNull() }.toSet()
                } ?: emptySet(),
            )
        }
    }
}
