package com.groovenspot.pulsecare.report

import com.groovenspot.pulsecare.mission.Mission
import com.groovenspot.pulsecare.mission.MissionVerifier

/**
 * 저녁 21:00 요약 (기획서 12번 "묶음 발송", 14번 "놓친 날 처리").
 * 미션을 못 했으면 "내일 다시 해볼까요?"를 묻고, 정보 알림은 여기에 모아 보냅니다.
 * 미션을 끝냈고 전할 정보도 없으면 보내지 않습니다 (알림을 줄이는 쪽이 끄지 않게 만드는 길).
 */
object EveningSummary {

    data class Text(val title: String, val body: String, val askRetry: Boolean)

    const val RETRY = "내일 다시"
    const val OTHER = "다른 미션으로"

    fun of(mission: Mission, done: Boolean, infoBodies: List<String>): Text? {
        // 취침 미션은 오늘 밤에 하는 것이라 아직 "놓쳤다"고 묻지 않습니다.
        val tonight = mission.id in MissionVerifier.NIGHT_MISSIONS
        return when {
            !done && tonight -> Text(
                "오늘 밤 미션을 잊지 마세요",
                (listOf("${mission.title}. 내일 아침 수면 기록으로 확인해요") + infoBodies).joinToString("\n"),
                askRetry = false,
            )
            !done -> Text(
                "오늘 미션, 내일 다시 해볼까요?",
                (listOf("\"${mission.title}\"를 오늘은 못 했어요. 괜찮아요, 내일 다시 하거나 다른 미션을 받을 수 있어요") + infoBodies)
                    .joinToString("\n"),
                askRetry = true,
            )
            infoBodies.isNotEmpty() -> Text("오늘 저녁 요약", (listOf("오늘 미션을 완료했어요") + infoBodies).joinToString("\n"), askRetry = false)
            else -> null
        }
    }
}
