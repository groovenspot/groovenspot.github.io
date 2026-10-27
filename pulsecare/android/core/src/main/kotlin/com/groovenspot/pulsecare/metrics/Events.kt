package com.groovenspot.pulsecare.metrics

/**
 * 이벤트 사전 (기획서 22번). 여기 없는 이벤트·속성은 앱이 보내지 않고 서버도 받지 않습니다.
 * 담지 않는 것: 점수 값, 걸음·심박 등 수치, 체크인 응답 값, 이름·연락처, 대화 원문.
 * AI 챗·결제 이벤트는 그 기능이 생길 때 추가합니다.
 */
enum class EventName(val key: String, val props: Set<String>) {
    // 가입
    SIGNUP_COMPLETED("signup_completed", setOf("via", "goal")),
    CONSENT_UPDATED("consent_updated", setOf("item", "granted")),
    WATCH_LINK_ATTEMPTED("watch_link_attempted", setOf("result")),
    WATCH_LINKED("watch_linked", setOf("platform")),
    DATA_FIRST_RECEIVED("data_first_received", setOf("day")),

    // 점수
    SCORE_VIEWED("score_viewed", setOf("surface", "kind", "day")),
    WEEKLY_REPORT_VIEWED("weekly_report_viewed", setOf("surface", "badge")),
    CONDITION_CHECKIN_ANSWERED("condition_checkin_answered", setOf("answered")),

    // 미션
    MISSION_SHOWN("mission_shown", setOf("mission_id", "goal", "level")),
    MISSION_COMPLETED("mission_completed", setOf("mission_id", "auto", "surface")),
    MISSION_SKIPPED("mission_skipped", setOf("mission_id", "reason")),

    /** 진료용 요약 PDF를 만들어 공유 시트를 엶 (기간만). */
    REPORT_EXPORTED("report_exported", setOf("days")),

    // 가족
    FAMILY_INVITE_SENT("family_invite_sent", setOf("role")),
    FAMILY_INVITE_ACCEPTED("family_invite_accepted", setOf("role")),
    FAMILY_VIEW_OPENED("family_view_opened", setOf("wearers", "guardians")),
    FAMILY_MEMBER_REMOVED("family_member_removed", setOf("role")),

    // 알림
    ALERT_SENT("alert_sent", setOf("signal", "recipient")),
    ALERT_FEEDBACK("alert_feedback", setOf("signal", "response", "recipient")),

    // 앱
    APP_OPENED("app_opened", setOf("source")),
    PUSH_PERMISSION_CHANGED("push_permission_changed", setOf("granted")),
    ACCOUNT_DELETED("account_deleted", emptySet()),
    ;

    companion object {
        fun of(key: String): EventName? = entries.firstOrNull { it.key == key }
    }
}

/** 한 건. [props] 값은 짧은 문자열만 (숫자·참거짓도 문자열로). */
data class Event(val name: EventName, val at: Long, val props: Map<String, String> = emptyMap())

object EventRules {
    const val MAX_VALUE_LENGTH = 40
    const val MAX_BATCH = 500

    /**
     * 활성 사용자 (22번): 그 기간에 직접 한 행동이 하나라도 있는 사람.
     * 앱 열기, 점수 보기(앱·워치·타일·알림), 직접 한 미션 완료, 알림 응답, 가족 화면 보기.
     * 워치 기록으로 자동 확인된 미션은 직접 한 행동이 아니라 넣지 않습니다.
     */
    fun isActive(name: EventName, props: Map<String, String>): Boolean = when (name) {
        EventName.APP_OPENED, EventName.SCORE_VIEWED, EventName.ALERT_FEEDBACK, EventName.FAMILY_VIEW_OPENED -> true
        EventName.MISSION_COMPLETED -> props["auto"] != "true"
        else -> false
    }

    /** 사전에 맞지 않는 속성은 버리고, 값은 길이를 자릅니다. 숫자처럼 보이는 긴 값(수치 유출)도 막습니다. */
    fun clean(name: EventName, props: Map<String, String>): Map<String, String> =
        props.filterKeys { it in name.props }
            .mapValues { it.value.take(MAX_VALUE_LENGTH) }
            .filterValues { it.isNotEmpty() }

    /** "가입 후 며칠째"는 구간으로만 (정확한 날짜 조합으로 사람을 특정하기 어렵게). */
    fun dayBucket(dayIndex: Int): String = when {
        dayIndex <= 0 -> "0"
        dayIndex <= 7 -> dayIndex.toString()
        dayIndex <= 14 -> "8-14"
        dayIndex <= 30 -> "15-30"
        dayIndex <= 90 -> "31-90"
        else -> "90+"
    }
}
