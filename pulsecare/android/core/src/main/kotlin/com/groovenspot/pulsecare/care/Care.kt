package com.groovenspot.pulsecare.care

import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.DayTag
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/** 먹는 약 하나와 하루 복용 시각들. */
data class Medication(val id: String, val name: String, val times: List<LocalTime>)

/** "먹었어요"를 누른 기록. [time]은 예정 시각 (같은 약을 하루 여러 번 먹을 때 구분). */
data class DoseLog(val date: LocalDate, val medicationId: String, val time: LocalTime, val takenAt: LocalDateTime)

data class Dose(val medication: Medication, val time: LocalTime, val takenAt: LocalDateTime?, val missed: Boolean) {
    val taken: Boolean get() = takenAt != null
}

/**
 * 복약 체크 (기획서 12번 "복약 미체크", 미션 P-03). 예정 시각에서 3시간이 지나도 체크가 없으면 놓친 것으로 보고
 * 본인에게 한 번 묻고, 가족이 연결돼 있으면 보호자 하루 요약에도 실립니다. 약 이름은 서버로 보내지 않습니다.
 */
object Medications {
    const val MISSED_AFTER_HOURS = 3L

    fun today(plans: List<Medication>, logs: List<DoseLog>, now: LocalDateTime): List<Dose> {
        val date = now.toLocalDate()
        return plans.flatMap { m ->
            m.times.sorted().map { t ->
                val log = logs.firstOrNull { it.date == date && it.medicationId == m.id && it.time == t }
                Dose(m, t, log?.takenAt, missed = log == null && now >= date.atTime(t).plusHours(MISSED_AFTER_HOURS))
            }
        }.sortedBy { it.time }
    }

    /** 오늘 놓친 복용이 있으면 주의 대신 정보 등급 신호 하나 (문구는 AlertText). */
    fun missed(doses: List<Dose>): Detection? =
        doses.count { it.missed }.takeIf { it > 0 }?.let { Detection(Signal.MEDICATION_MISSED, days = it) }

    /** 다음에 알릴 일: 복용 시각 알림, 또는 3시간 뒤 놓침 확인. [after] 이후 가장 이른 것. */
    fun nextEvent(plans: List<Medication>, after: LocalDateTime): LocalDateTime? =
        (0L..1L).flatMap { d ->
            val day = after.toLocalDate().plusDays(d)
            plans.flatMap { m -> m.times.flatMap { t -> listOf(day.atTime(t), day.atTime(t).plusHours(MISSED_AFTER_HOURS)) } }
        }.filter { it > after }.minOrNull()
}

/** 취침 알림 (미션 S-01 "취침 알림 받고 30분 안에 눕기"). 평소 취침 시각 30분 전, 기록이 없으면 정한 시각. */
object Bedtime {
    const val LEAD_MINUTES = 30L
    val DEFAULT_BEDTIME: LocalTime = LocalTime.of(23, 0)

    fun reminderAt(usualBedtime: LocalTime?, fixed: LocalTime? = null): LocalTime =
        (fixed ?: usualBedtime ?: DEFAULT_BEDTIME).minusMinutes(LEAD_MINUTES)
}

/**
 * 몸 상태 태그 (아픔·음주·야근). 아침에 "어제"를 기록하면 그날 아침 기록(기상일)에 붙습니다.
 * 점수에는 반영하고 기준선에서는 빠집니다 (점수 엔진).
 */
object DayTags {
    fun apply(records: List<DailyRecord>, tags: Map<LocalDate, Set<DayTag>>): List<DailyRecord> =
        records.map { r -> tags[r.date]?.let { r.copy(tags = it) } ?: r }

    fun label(tag: DayTag): String = when (tag) {
        DayTag.SICK -> "몸이 안 좋아요"
        DayTag.ALCOHOL -> "술을 마셨어요"
        DayTag.OVERTIME -> "늦게까지 일했어요"
    }
}

/**
 * 1분 호흡 가이드: 4초 들이쉬고 6초 내쉬기 6번. 내쉬는 시간을 길게 해 부교감 신경을 돕습니다.
 * 화면과 워치가 같은 박자를 쓰도록 여기 둡니다.
 */
object Breathing {
    const val INHALE_SECONDS = 4
    const val EXHALE_SECONDS = 6
    const val CYCLES = 6
    const val TOTAL_SECONDS = (INHALE_SECONDS + EXHALE_SECONDS) * CYCLES

    enum class Phase(val label: String) { INHALE("들이쉬세요"), EXHALE("내쉬세요"), DONE("잘하셨어요") }

    /** [elapsed]초 시점의 단계와 그 단계 안에서의 진행(0~1). */
    fun at(elapsed: Double): Pair<Phase, Double> {
        if (elapsed >= TOTAL_SECONDS) return Phase.DONE to 1.0
        val inCycle = elapsed.coerceAtLeast(0.0) % (INHALE_SECONDS + EXHALE_SECONDS)
        return if (inCycle < INHALE_SECONDS) Phase.INHALE to inCycle / INHALE_SECONDS
        else Phase.EXHALE to (inCycle - INHALE_SECONDS) / EXHALE_SECONDS
    }
}
