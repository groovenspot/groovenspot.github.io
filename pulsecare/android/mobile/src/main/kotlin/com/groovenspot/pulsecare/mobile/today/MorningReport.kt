package com.groovenspot.pulsecare.mobile.today

import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.score.ScoreResult

/**
 * 아침 리포트 알림 문구 (기획서 12번: 정보 알림은 아침 리포트에 모아서).
 * 잠금화면에는 점수·이유 없이 [PUBLIC]만 보이고, 잠금을 풀면 [Text] 전체가 보입니다.
 */
object MorningReport {

    data class Text(val title: String, val body: String)

    const val PUBLIC = "오늘의 컨디션이 준비됐어요"

    fun of(home: HomeState): Text {
        val score = home.score
        val mission = "오늘의 미션: ${home.mission.title}"
        return when (score.kind) {
            ScoreResult.Kind.NO_DATA -> Text("어젯밤 기록이 없어요", "오늘 컨디션을 알려주시면 맞는 미션을 골라 드려요")
            ScoreResult.Kind.SLEEP_ONLY -> Text("수면 점수 ${score.score}점", "${score.reason}\n$mission")
            ScoreResult.Kind.FULL -> Text("오늘 컨디션 ${score.score}점 · ${score.band!!.label}", "${score.reason}\n$mission")
        }
    }

    /** 아침 리포트에 함께 싣는 정보 등급 알림 (수면 부족 누적, 스트레스 지속 등). */
    fun infoLines(home: HomeState, infoBodies: List<String>): String =
        (listOf(of(home).body) + infoBodies).joinToString("\n")

    /** 잠금화면용 주의 알림 문구. */
    val CAUTION_PUBLIC: String = AlertText.lockScreen(Grade.CAUTION)
}
