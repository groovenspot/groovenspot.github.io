package com.groovenspot.pulsecare.watch

import com.groovenspot.pulsecare.score.Band
import java.time.LocalDate

/**
 * 폰이 워치로 보내는 오늘 요약 (기획서 15번 워치 화면: 점수 타일, 미션). 워치는 계산하지 않고 받은 것만 보여줍니다.
 */
data class WatchToday(
    val date: LocalDate,
    /** 워치를 안 차서 점수가 없는 날은 null. */
    val score: Int?,
    val band: Band?,
    /** 이유 한 줄. */
    val reason: String,
    val missionId: String,
    val missionTitle: String,
    val missionDone: Boolean,
    /** 첫 7일 학습 중이면 며칠째인지. */
    val learningDay: Int? = null,
)

/** 워치 화면·타일·컴플리케이션에 그대로 쓰는 글자. */
data class WatchDisplay(
    val score: String,
    val label: String,
    val reason: String,
    val mission: String,
    val missionDone: Boolean,
    /** 오늘 것이 아니면 미션 완료 버튼을 숨깁니다. */
    val stale: Boolean,
)

object WatchContract {
    const val PATH_TODAY = "/pulsecare/today"
    const val PATH_MISSION_DONE = "/pulsecare/mission-done"
    const val PATH_SOS = "/pulsecare/sos"

    /** 데이터 레이어 DataMap에 문자열로 넣습니다. 없는 값은 키를 빼 둡니다. */
    fun encode(w: WatchToday): Map<String, String> = buildMap {
        put("date", w.date.toString())
        w.score?.let { put("score", it.toString()) }
        w.band?.let { put("band", it.name) }
        put("reason", w.reason)
        put("missionId", w.missionId)
        put("missionTitle", w.missionTitle)
        put("missionDone", w.missionDone.toString())
        w.learningDay?.let { put("learningDay", it.toString()) }
    }

    fun decode(m: Map<String, String?>): WatchToday? = runCatching {
        WatchToday(
            date = LocalDate.parse(m["date"]!!),
            score = m["score"]?.toInt(),
            band = m["band"]?.let { Band.valueOf(it) },
            reason = m["reason"].orEmpty(),
            missionId = m["missionId"]!!,
            missionTitle = m["missionTitle"].orEmpty(),
            missionDone = m["missionDone"].toBoolean(),
            learningDay = m["learningDay"]?.toInt(),
        )
    }.getOrNull()

    fun display(w: WatchToday?, today: LocalDate): WatchDisplay {
        if (w == null) {
            return WatchDisplay("-", "연결 전", "휴대폰에서 펄스케어를 열어 주세요", "", missionDone = false, stale = true)
        }
        val stale = w.date != today
        val label = when {
            stale -> "어제 기록"
            w.score == null -> "기록 없음"
            w.learningDay != null -> "학습 중 ${w.learningDay}일째"
            else -> w.band?.label.orEmpty()
        }
        return WatchDisplay(
            score = w.score?.toString() ?: "-",
            label = label,
            reason = if (stale) "아침 리포트가 오면 바뀌어요" else w.reason,
            mission = w.missionTitle,
            missionDone = w.missionDone,
            stale = stale,
        )
    }
}
