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
    const val PATH_SOS_RESULT = "/pulsecare/sos-result"
    /** 워치에서 일어난 일을 폰의 이용 통계로 ("score_viewed|tile|FULL"). 폰이 동의 여부를 보고 버리거나 모읍니다. */
    const val PATH_EVENT = "/pulsecare/event"

    /** 폰이 워치에 돌려주는 SOS 결과: "SENT:2", "NO_ACCOUNT", "FAILED". */
    const val SOS_NO_ACCOUNT = "NO_ACCOUNT"
    const val SOS_FAILED = "FAILED"
    fun sosSent(guardians: Int) = "SENT:$guardians"

    /** 워치 SOS 화면 문구 (제목, 설명). 보호자에게 가지 않았으면 그렇게 말합니다. */
    fun sosText(result: String?): Pair<String, String> {
        val sent = result?.removePrefix("SENT:")?.takeIf { result.startsWith("SENT:") }?.toIntOrNull()
        return when {
            result == null -> "휴대폰에 알렸어요" to "보호자에게 보내는 중이에요."
            sent != null && sent > 0 -> "보호자 ${sent}명에게 알렸어요" to "괜찮으면 휴대폰 알림에서 취소해 주세요."
            sent == 0 -> "연결된 보호자가 없어요" to "위급하면 워치 긴급 SOS(홈 버튼 5번)나 119를 쓰세요."
            result == SOS_FAILED -> "보호자에게 보내지 못했어요" to "위급하면 워치 긴급 SOS(홈 버튼 5번)나 119를 쓰세요."
            else -> "휴대폰에 알렸어요" to "보호자 연결 전이에요. 위급하면 워치 긴급 SOS나 119를 쓰세요."
        }
    }

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
