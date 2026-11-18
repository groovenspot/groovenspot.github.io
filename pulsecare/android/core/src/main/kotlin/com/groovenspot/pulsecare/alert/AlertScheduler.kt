package com.groovenspot.pulsecare.alert

import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import kotlin.math.abs

enum class Recipient { SELF, GUARDIAN }

data class PendingAlert(val detection: Detection, val recipient: Recipient, val createdAt: LocalDateTime) {
    val signal: Signal get() = detection.signal
}

/** 이미 보낸 알림과 사용자 상태. */
data class DeliveryState(
    /** 오늘 보낸 알림 (받는 사람 포함). */
    val sentToday: List<PendingAlert> = emptyList(),
    /** 신호별 마지막 확인 시각과 그때 값. */
    val acknowledged: Map<Signal, Pair<LocalDateTime, Detection>> = emptyMap(),
    val asleep: Boolean = false,
)

sealed interface Decision {
    data object SendNow : Decision
    data class SendAt(val time: LocalDateTime, val why: String) : Decision
    data class Drop(val why: String) : Decision
}

/**
 * 빈도 제한과 방해 금지 (기획서 12번). 긴급은 어떤 제한도 받지 않습니다.
 * 시각은 사용자가 "내 정보 > 알림"에서 바꿀 수 있어 [Settings]로 받습니다.
 */
class AlertScheduler(private val settings: Settings = Settings()) {

    data class Settings(
        val quietStart: LocalTime = LocalTime.of(23, 0),
        val quietEnd: LocalTime = LocalTime.of(7, 0),
        val morningReport: LocalTime = LocalTime.of(7, 30),
        val eveningSummary: LocalTime = LocalTime.of(21, 0),
        val guardianSummary: LocalTime = LocalTime.of(20, 0),
        val dailyInfoLimit: Int = 3,
        val dailyCautionLimit: Int = 2,
    )

    fun decide(alert: PendingAlert, now: LocalDateTime, state: DeliveryState): Decision {
        val signal = alert.signal
        if (signal.grade == Grade.EMERGENCY) return Decision.SendNow

        // 확인한 주의 신호는 24시간 동안 다시 알리지 않습니다. 값이 더 나빠졌으면 예외.
        state.acknowledged[signal]?.let { (at, before) ->
            if (Duration.between(at, now) < Duration.ofHours(24) && !worse(alert.detection, before)) {
                return Decision.Drop("확인 후 24시간 안 같은 신호")
            }
        }

        // 보호자에게는 긴급·활동량 급감 외에는 하루 1회 요약으로만.
        if (alert.recipient == Recipient.GUARDIAN && signal != Signal.ACTIVITY_DROP) {
            return Decision.SendAt(next(now, settings.guardianSummary), "보호자 하루 요약")
        }

        val sentToSame = state.sentToday.filter { it.recipient == alert.recipient }
        if (sentToSame.any { it.signal == signal }) return Decision.Drop("오늘 이미 보낸 신호")
        when (signal.grade) {
            Grade.INFO -> if (sentToSame.count { it.signal.grade == Grade.INFO } >= settings.dailyInfoLimit) {
                return Decision.Drop("정보 알림 하루 상한")
            }
            Grade.CAUTION -> if (sentToSame.count { it.signal.grade == Grade.CAUTION } >= settings.dailyCautionLimit) {
                return Decision.Drop("주의 알림 하루 상한")
            }
            Grade.EMERGENCY -> Unit
        }

        if (quiet(now.toLocalTime()) || state.asleep) {
            val wake = next(now, settings.quietEnd)
            return if (signal.grade == Grade.INFO) {
                Decision.SendAt(next(wake, settings.morningReport), "방해 금지 후 아침 리포트")
            } else {
                Decision.SendAt(wake, "방해 금지 후 전달")
            }
        }

        // 정보 알림은 아침 리포트와 저녁 요약에 모아서.
        if (signal.grade == Grade.INFO) {
            val slot = listOf(next(now, settings.morningReport), next(now, settings.eveningSummary)).min()
            return Decision.SendAt(slot, "정보 알림 묶음 발송")
        }
        return Decision.SendNow
    }

    private fun quiet(t: LocalTime): Boolean =
        if (settings.quietStart > settings.quietEnd) t >= settings.quietStart || t < settings.quietEnd
        else t >= settings.quietStart && t < settings.quietEnd

    /** [from] 이후(같은 시각 포함) 처음 오는 [at]. */
    private fun next(from: LocalDateTime, at: LocalTime): LocalDateTime {
        val today = from.toLocalDate().atTime(at)
        return if (today >= from) today else today.plusDays(1)
    }

    /** 기준선에서 더 멀어졌으면 더 나빠진 것으로 봅니다. */
    private fun worse(now: Detection, before: Detection): Boolean {
        val nowGap = gap(now) ?: return false
        val beforeGap = gap(before) ?: return false
        return nowGap > beforeGap
    }

    private fun gap(d: Detection): Double? {
        val current = d.current ?: return null
        return abs(current - (d.usual ?: return current))
    }
}
