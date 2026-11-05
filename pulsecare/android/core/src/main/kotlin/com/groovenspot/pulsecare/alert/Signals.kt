package com.groovenspot.pulsecare.alert

/** 알림 등급 (기획서 12번). */
enum class Grade { INFO, CAUTION, EMERGENCY }

/**
 * 출시 알림 신호 12개. 기준값은 의료 자문단 검토 전 초안입니다.
 * [fixedThreshold] 신호는 기준선이 없는 가입 첫 7일에도 동작합니다.
 */
enum class Signal(val grade: Grade, val fixedThreshold: Boolean = false) {
    SOS(Grade.EMERGENCY, fixedThreshold = true),
    FALL(Grade.EMERGENCY, fixedThreshold = true),
    HIGH_HR_AT_REST(Grade.CAUTION, fixedThreshold = true),
    LOW_HR_AWAKE(Grade.CAUTION, fixedThreshold = true),
    /** 워치 제조사(인허가) 기능의 결과를 그대로 받습니다. */
    IRREGULAR_RHYTHM(Grade.CAUTION),
    RESTING_HR_RISE(Grade.CAUTION),
    ACTIVITY_DROP(Grade.CAUTION),
    LOW_SPO2(Grade.CAUTION),
    SLEEP_DEBT(Grade.INFO),
    STRESS(Grade.INFO),
    MEDICATION_MISSED(Grade.INFO),
    WATCH_NOT_WORN(Grade.INFO),
}

/** 감지된 신호와 문구에 넣을 값 ("평소 62 → 지금 84"). */
data class Detection(
    val signal: Signal,
    val usual: Double? = null,
    val current: Double? = null,
    /** 며칠째 이어지는지. */
    val days: Int? = null,
)
