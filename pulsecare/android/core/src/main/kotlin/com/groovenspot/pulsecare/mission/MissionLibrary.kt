package com.groovenspot.pulsecare.mission

import com.groovenspot.pulsecare.score.Metric

/** 사용자가 고르는 목표 (1개만, 기획서 14번). [LOW_DAY]는 점수 50 미만인 날 공통 미션입니다. */
enum class Goal(val code: Char, val label: String) {
    SLEEP('S', "잠 잘 자기"),
    WEIGHT('W', "체중 관리"),
    STRESS('R', "스트레스 줄이기"),
    PARENT('P', "부모님 건강 챙기기"),
    LOW_DAY('C', "컨디션 낮은 날"),
}

enum class Verification { AUTO, MANUAL }

data class Mission(
    val id: String,
    /** 워치에 뜨는 문장 (15자 안팎). */
    val title: String,
    val goal: Goal,
    val level: Int,
    val verification: Verification,
    /** 이 미션과 짝이 되는 컨디션 점수 요인. 오늘 점수를 끌어내린 요인과 같으면 가산점. */
    val linked: Set<Metric> = emptySet(),
    /** 주말에만 맞는 미션. */
    val weekendOnly: Boolean = false,
    /** 날씨가 나쁜 날 빼는 실외 미션. */
    val outdoor: Boolean = false,
    /** 시니어 "쉽게 보기" 모드에서도 주는 미션 (레벨 1의 걸음·수면). */
    val seniorFriendly: Boolean = false,
) {
    val points: Int get() = level * 10
}

/** 출시 라이브러리 40개 (목표별 8개 × 4 + 컨디션 낮은 날 8개). 수동 확인 11개. */
object MissionLibrary {
    private val A = Verification.AUTO
    private val M = Verification.MANUAL

    val all: List<Mission> = listOf(
        Mission("S-01", "취침 알림 받고 30분 안에 눕기", Goal.SLEEP, 1, A, setOf(Metric.REGULARITY), seniorFriendly = true),
        Mission("S-02", "오후 2시 이후 카페인 쉬기", Goal.SLEEP, 1, M, setOf(Metric.SLEEP_QUALITY)),
        Mission("S-03", "아침 햇빛 받으며 10분 걷기", Goal.SLEEP, 1, A, setOf(Metric.REGULARITY), outdoor = true, seniorFriendly = true),
        Mission("S-04", "잠들기 전 호흡 가이드 1회", Goal.SLEEP, 1, A, setOf(Metric.SLEEP_QUALITY), seniorFriendly = true),
        Mission("S-05", "취침 1시간 전 화면 끄기", Goal.SLEEP, 2, M, setOf(Metric.SLEEP_QUALITY)),
        Mission("S-06", "평소보다 30분 일찍 눕기", Goal.SLEEP, 2, A, setOf(Metric.SLEEP_DURATION)),
        Mission("S-07", "주말에도 기상 시각 ±30분 지키기", Goal.SLEEP, 2, A, setOf(Metric.REGULARITY), weekendOnly = true),
        Mission("S-08", "7일 연속 같은 시각(±30분) 취침", Goal.SLEEP, 3, A, setOf(Metric.REGULARITY)),

        Mission("W-01", "점심 먹고 10분 걷기", Goal.WEIGHT, 1, A, setOf(Metric.ACTIVITY_LOAD), outdoor = true, seniorFriendly = true),
        Mission("W-02", "오늘 7,000보", Goal.WEIGHT, 1, A, setOf(Metric.ACTIVITY_LOAD), seniorFriendly = true),
        Mission("W-03", "엘리베이터 대신 계단 3층", Goal.WEIGHT, 1, A, setOf(Metric.ACTIVITY_LOAD)),
        Mission("W-04", "세 끼 식사 사진 기록", Goal.WEIGHT, 1, M),
        Mission("W-05", "오늘 10,000보", Goal.WEIGHT, 2, A, setOf(Metric.ACTIVITY_LOAD)),
        Mission("W-06", "심박 존 2에서 20분 운동", Goal.WEIGHT, 2, A, setOf(Metric.ACTIVITY_LOAD)),
        Mission("W-07", "저녁 8시 이후 간식 쉬기", Goal.WEIGHT, 2, M, setOf(Metric.SLEEP_QUALITY)),
        Mission("W-08", "존 2 운동 40분 + 근력 10분", Goal.WEIGHT, 3, A, setOf(Metric.ACTIVITY_LOAD)),

        Mission("R-01", "1분 호흡 가이드 1회", Goal.STRESS, 1, A, setOf(Metric.HRV)),
        Mission("R-02", "일하는 동안 50분마다 일어나기", Goal.STRESS, 1, A, setOf(Metric.HRV)),
        Mission("R-03", "점심시간 15분 산책", Goal.STRESS, 1, A, setOf(Metric.HRV), outdoor = true),
        Mission("R-04", "오늘 감사한 일 한 줄 적기", Goal.STRESS, 1, M),
        Mission("R-05", "스트레스 알림이 오면 바로 호흡하기", Goal.STRESS, 2, A, setOf(Metric.HRV)),
        Mission("R-06", "저녁 스트레칭 10분", Goal.STRESS, 2, A, setOf(Metric.RESTING_HR)),
        Mission("R-07", "퇴근 후 1시간 업무 알림 끄기", Goal.STRESS, 2, M, setOf(Metric.HRV)),
        Mission("R-08", "아침·점심·저녁 호흡 3회", Goal.STRESS, 3, A, setOf(Metric.HRV)),

        Mission("P-01", "부모님 오늘 요약 확인하기", Goal.PARENT, 1, A),
        Mission("P-02", "앱에서 부모님께 안부 전화", Goal.PARENT, 1, A),
        Mission("P-03", "부모님 복약 체크 확인하기", Goal.PARENT, 1, A),
        Mission("P-04", "부모님 워치 착용·충전 확인", Goal.PARENT, 1, A),
        Mission("P-05", "부모님과 걸음 챌린지 함께하기", Goal.PARENT, 2, A, setOf(Metric.ACTIVITY_LOAD)),
        Mission("P-06", "통화하며 주간 리포트 같이 보기", Goal.PARENT, 2, M),
        Mission("P-07", "다음 병원 일정 등록하기", Goal.PARENT, 2, M),
        Mission("P-08", "한 달 건강 요약을 진료 때 공유", Goal.PARENT, 3, M),

        Mission("C-01", "오늘은 강한 운동 쉬기", Goal.LOW_DAY, 1, A, setOf(Metric.ACTIVITY_LOAD)),
        Mission("C-02", "오후 3시 전 20분 낮잠", Goal.LOW_DAY, 1, A, setOf(Metric.SLEEP_DURATION)),
        Mission("C-03", "가벼운 산책 15분", Goal.LOW_DAY, 1, A, setOf(Metric.RESTING_HR), outdoor = true, seniorFriendly = true),
        Mission("C-04", "1분 호흡 2회", Goal.LOW_DAY, 1, A, setOf(Metric.HRV)),
        Mission("C-05", "오늘 밤 평소보다 30분 일찍 자기", Goal.LOW_DAY, 1, A, setOf(Metric.SLEEP_DURATION), seniorFriendly = true),
        Mission("C-06", "저녁 스트레칭 5분", Goal.LOW_DAY, 1, A, setOf(Metric.HRV)),
        Mission("C-07", "물 6잔 마시기", Goal.LOW_DAY, 1, M),
        Mission("C-08", "몸 상태 태그 남기기", Goal.LOW_DAY, 1, M),
    )

    private val byId = all.associateBy { it.id }

    operator fun get(id: String): Mission = byId.getValue(id)

    fun of(goal: Goal): List<Mission> = all.filter { it.goal == goal }
}
