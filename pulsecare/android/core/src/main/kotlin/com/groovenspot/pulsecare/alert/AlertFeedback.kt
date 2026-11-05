package com.groovenspot.pulsecare.alert

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

/** 알림에 대한 응답 (기획서 12번 "알림 응답", 22번 "알림 오탐 신고율"). */
enum class FeedbackResponse(val key: String, val label: String) {
    /** 본인: 알림은 맞지만 괜찮음. */
    OK("ok", "괜찮아요"),
    /** 본인·보호자: 실제와 다른 알림. 오탐 신고율에 들어갑니다. */
    FALSE_ALARM("false_alarm", "잘못된 알림이에요"),
    /** 보호자: 연락해 봤음. */
    CONTACTED("contacted", "연락했어요"),
}

data class FeedbackEntry(val at: LocalDateTime, val detection: Detection, val response: FeedbackResponse)

/**
 * 응답을 알림 규칙에 연결합니다.
 * - 응답한 신호는 24시간 동안 다시 알리지 않음 (값이 더 나빠지면 예외): [AlertScheduler]의 확인 규칙
 * - 같은 신호를 14일 안에 2번 "잘못된 알림"이라고 하면 그 신호 알림을 7일 쉬자고 제안
 * 긴급(SOS·낙상)은 쉬게 할 수 없습니다.
 */
object AlertFeedback {

    const val SNOOZE_DAYS = 7L
    private const val WINDOW_DAYS = 14L
    private const val FALSE_ALARMS_TO_SUGGEST = 2

    /** 스케줄러의 "확인한 신호" 상태: 신호별 마지막 응답 시각과 그때 값. */
    fun acknowledged(entries: List<FeedbackEntry>): Map<Signal, Pair<LocalDateTime, Detection>> =
        entries.groupBy { it.detection.signal }.mapValues { (_, list) -> list.maxBy { it.at }.let { it.at to it.detection } }

    /** 쉬자고 제안할 신호. 이미 쉬는 중이거나 제안을 거절한 뒤 새 오탐이 없으면 제외. */
    fun suggestSnooze(
        entries: List<FeedbackEntry>,
        today: LocalDate,
        snoozed: Map<Signal, LocalDate>,
        declinedAt: Map<Signal, LocalDateTime> = emptyMap(),
    ): Set<Signal> = entries
        .filter { it.response == FeedbackResponse.FALSE_ALARM && ChronoUnit.DAYS.between(it.at.toLocalDate(), today) < WINDOW_DAYS }
        .groupBy { it.detection.signal }
        .filter { (signal, list) ->
            signal.grade != Grade.EMERGENCY &&
                list.size >= FALSE_ALARMS_TO_SUGGEST &&
                snoozed[signal]?.let { !today.isAfter(it) } != true &&
                declinedAt[signal]?.let { declined -> list.none { it.at.isAfter(declined) } } != true
        }.keys

    /** 쉬는 중인 신호 (끝나는 날까지 포함). */
    fun isSnoozed(signal: Signal, snoozed: Map<Signal, LocalDate>, today: LocalDate): Boolean =
        signal.grade != Grade.EMERGENCY && snoozed[signal]?.let { !today.isAfter(it) } == true
}
