package com.groovenspot.pulsecare.alert

import kotlin.math.roundToInt

data class AlertMessage(
    /** 워치 제목, 15자 이내. */
    val title: String,
    val body: String,
    /** 행동 버튼 1개 + 필요하면 "괜찮아요" (최대 2개). */
    val buttons: List<String>,
)

/**
 * 알림 문구 (기획서 12번 "알림 문구 가이드"): 무엇이 달라졌는지 + 얼마나 + 무엇을 하면 되는지.
 * 병명·진단 표현 없이 "평소와 다른 패턴", 내 기준선과 함께 보여줍니다.
 */
object AlertText {

    /** 폰 잠금화면·미리보기에는 수치·병명·가족 이름 없이 급함만. */
    fun lockScreen(grade: Grade): String =
        if (grade == Grade.EMERGENCY) "[긴급] 확인이 필요한 알림이 있어요" else "확인할 알림이 있어요"

    fun forSelf(d: Detection): AlertMessage {
        val usual = d.usual?.roundToInt()
        val current = d.current?.roundToInt()
        return when (d.signal) {
            Signal.SOS -> AlertMessage("SOS 보냈어요", "보호자에게 도움 요청을 보냈어요.", listOf("취소하기"))
            Signal.FALL -> AlertMessage(
                "넘어지셨나요?",
                "넘어지신 것 같아요. 괜찮으세요? 60초 후 보호자에게 연락해요.",
                listOf("괜찮아요", "도움 요청"),
            )
            Signal.HIGH_HR_AT_REST -> AlertMessage(
                "쉬는 중 심박이 높아요",
                "쉬고 있는데 심박이 10분째 ${current} bpm이에요. 잠시 앉아 쉬고, 계속되면 전문가와 상담해 보세요.",
                listOf("호흡 시작", "괜찮아요"),
            )
            Signal.LOW_HR_AWAKE -> AlertMessage(
                "심박이 평소보다 낮아요",
                "깨어 있는데 심박이 10분째 ${current} bpm이에요. 어지러우면 앉아서 쉬고, 계속되면 전문가와 상담해 보세요.",
                listOf("자세히 보기", "괜찮아요"),
            )
            Signal.IRREGULAR_RHYTHM -> AlertMessage(
                "심장 리듬 확인",
                "워치가 평소와 다른 심장 리듬 패턴을 기록했어요. 전문가와 상담해 보세요.",
                listOf("자세히 보기", "괜찮아요"),
            )
            Signal.RESTING_HR_RISE -> AlertMessage(
                "안정시 심박 상승",
                "안정시 심박이 ${d.days}일째 평소보다 높아요(평소 $usual → $current). 충분히 쉬고, 계속되면 전문가와 상담해 보세요.",
                listOf("자세히 보기", "괜찮아요"),
            )
            Signal.ACTIVITY_DROP -> AlertMessage(
                "걸음 수가 줄었어요",
                "걸음 수가 ${d.days}일째 평소의 ${percent(d)}% 수준이에요. 가볍게 산책해 볼까요?",
                listOf("산책 미션 받기", "괜찮아요"),
            )
            Signal.LOW_SPO2 -> AlertMessage(
                "수면 중 산소포화도",
                "최근 7일 중 ${d.days}일, 잘 때 산소포화도가 평소와 다른 패턴을 보였어요. 계속되면 전문가와 상담해 보세요.",
                listOf("자세히 보기", "괜찮아요"),
            )
            Signal.SLEEP_DEBT -> AlertMessage(
                "수면이 부족해요",
                "이번 주 수면이 평소보다 하루 ${shortfall(d)}씩 짧아요. 오늘은 30분 일찍 누워 볼까요?",
                listOf("취침 알림 켜기"),
            )
            Signal.STRESS -> AlertMessage(
                "쉬어 갈 시간",
                "HRV가 ${d.days}일째 평소보다 낮아요(평소 $usual → ${current}ms). 1분 호흡으로 잠깐 쉬어 볼까요?",
                listOf("호흡 시작"),
            )
            Signal.MEDICATION_MISSED -> AlertMessage(
                "약 드셨나요?",
                "약 드실 시간이 지났어요. 드셨으면 체크해 주세요.",
                listOf("먹었어요"),
            )
            Signal.WATCH_NOT_WORN -> AlertMessage(
                "워치를 차 주세요",
                "워치 기록이 하루째 없어요. 착용과 충전을 확인해 주세요.",
                listOf("확인했어요"),
            )
        }
    }

    /** 보호자 문구는 본인 이름과 다음 행동(전화하기)을 먼저. */
    fun forGuardian(d: Detection, name: String, location: String? = null): AlertMessage {
        val where = location?.let { " 현재 위치: $it." } ?: ""
        return when (d.signal) {
            Signal.SOS -> AlertMessage(
                "[긴급] ${name} SOS",
                "[긴급] ${name}${subject(name)} 도움을 요청했어요.$where",
                listOf("전화하기", "119 연결"),
            )
            Signal.FALL -> AlertMessage(
                "[긴급] ${name} 낙상",
                "[긴급] ${name}${subject(name)} 넘어진 뒤 응답이 없어요.$where",
                listOf("전화하기", "119 연결"),
            )
            Signal.ACTIVITY_DROP -> AlertMessage(
                "${name} 걸음 수 감소",
                "${name}의 걸음 수가 ${d.days}일째 평소의 ${percent(d)}% 수준이에요. 안부 전화를 드려보세요.",
                listOf("전화하기"),
            )
            Signal.MEDICATION_MISSED -> AlertMessage(
                "${name} 약 체크 없음",
                "${name}의 약 체크가 3시간째 없어요. 안부를 물어보세요.",
                listOf("전화하기"),
            )
            Signal.WATCH_NOT_WORN -> AlertMessage(
                "${name} 워치 미착용",
                "${name}의 워치 기록이 24시간째 없어요. 착용과 충전을 확인해 주세요.",
                listOf("전화하기"),
            )
            else -> AlertMessage(
                "${name} 확인 필요",
                "${name}에게 며칠째 평소와 다른 패턴이 있어요. 안부를 물어보세요.",
                listOf("전화하기"),
            )
        }
    }

    private fun percent(d: Detection): Int {
        val usual = d.usual ?: return 0
        val current = d.current ?: return 0
        return if (usual <= 0) 0 else (current / usual * 100).roundToInt()
    }

    private fun shortfall(d: Detection): String {
        val minutes = ((d.usual ?: 0.0) - (d.current ?: 0.0)).roundToInt().coerceAtLeast(0)
        val rounded = ((minutes + 5) / 10) * 10
        val h = rounded / 60
        val m = rounded % 60
        return when {
            h == 0 -> "${m}분"
            m == 0 -> "${h}시간"
            else -> "${h}시간 ${m}분"
        }
    }

    /** 이름 끝 글자에 받침이 있으면 "이", 없으면 "가". */
    internal fun subject(name: String): String {
        val last = name.lastOrNull() ?: return "가"
        if (last !in '가'..'힣') return "이(가)"
        return if ((last - '가') % 28 != 0) "이" else "가"
    }
}
