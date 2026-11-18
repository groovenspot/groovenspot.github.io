package com.groovenspot.pulsecare.alert

/**
 * 긴급 알림 연락 흐름 (기획서 12번):
 * - 낙상: 본인에게 60초를 먼저 주고, 응답이 없으면 보호자에게
 * - 수동 SOS: 본인 확인 없이 바로 보호자에게
 * - 보호자는 우선순위 순서로 1분 간격, 첫 보호자 알림 후 3분 안에 아무도 확인하지 않으면 전원에게 다시
 * 앱은 119에 자동 신고하지 않습니다. 긴급 전화는 워치 제조사 기능이 맡고, 보호자 화면에 "119 연결" 버튼을 둡니다.
 */
object EmergencyEscalation {

    enum class Action { ASK_SELF, NOTIFY, NOTIFY_ALL_AGAIN }

    data class Step(val afterSeconds: Int, val action: Action, val guardians: List<String> = emptyList())

    private const val SELF_WINDOW = 60
    private const val GUARDIAN_INTERVAL = 60
    private const val REPEAT_AFTER = 180

    /** [guardians]는 우선순위 순서의 보호자 ID. 누군가 확인하면 남은 단계는 취소합니다. */
    fun plan(signal: Signal, guardians: List<String>): List<Step> {
        require(signal == Signal.FALL || signal == Signal.SOS) { "긴급 연락 흐름은 낙상과 SOS만" }
        val steps = mutableListOf<Step>()
        val first = if (signal == Signal.FALL) {
            steps += Step(0, Action.ASK_SELF)
            SELF_WINDOW
        } else {
            0
        }
        guardians.forEachIndexed { i, g -> steps += Step(first + i * GUARDIAN_INTERVAL, Action.NOTIFY, listOf(g)) }
        if (guardians.isNotEmpty()) steps += Step(first + REPEAT_AFTER, Action.NOTIFY_ALL_AGAIN, guardians)
        return steps.sortedBy { it.afterSeconds }
    }

    /** 확인이 [ackAfterSeconds]초에 들어왔을 때 실제로 나간 단계. */
    fun stepsBefore(plan: List<Step>, ackAfterSeconds: Int): List<Step> = plan.filter { it.afterSeconds < ackAfterSeconds }
}
