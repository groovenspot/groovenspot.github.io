package com.groovenspot.pulsecare.mobile.data

/**
 * 약관·처리방침 주소와 동의 버전. 문서 내용이 바뀌어 다시 동의가 필요하면 [CONSENT_VERSION]을 올립니다.
 * 문서는 이 저장소의 GitHub Pages(pulsecare/privacy, terms, delete-account)에 있습니다.
 */
object Legal {
    const val CONSENT_VERSION = 1
    private const val BASE = "https://groovenspot.github.io/pulsecare"
    const val PRIVACY_URL = "$BASE/privacy/"
    const val TERMS_URL = "$BASE/terms/"
    const val DELETE_URL = "$BASE/delete-account/"

    /** 첫 실행 동의 항목 (모두 필수). 개인정보 보호법 제22조: 항목별로 구분해 동의, 민감정보(제23조)는 따로. */
    enum class Item(val label: String, val url: String?) {
        AGE("만 14세 이상이에요", null),
        TERMS("서비스 이용약관 동의", TERMS_URL),
        PRIVACY("개인정보 수집·이용 동의", PRIVACY_URL),
        HEALTH("건강정보(민감정보) 처리 동의", PRIVACY_URL),
    }

    /** 건강정보 동의 화면에 그대로 보여주는 요약 (처리방침 3번과 같은 내용). */
    const val HEALTH_SUMMARY =
        "Health Connect의 수면·심박·HRV·걸음 등 기록을 이 휴대폰 안에서 읽어 컨디션 점수와 미션을 계산해요. " +
            "수치 자체는 서버로 보내지 않아요. 가족 연결을 켜면 점수·미션·주의 알림만 내가 연결한 보호자에게 전달돼요."
}
