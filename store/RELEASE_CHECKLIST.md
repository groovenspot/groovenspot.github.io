# App Store 출시 체크리스트

✅ = 코드/문서에 이미 반영됨 · ☐ = 직접 해야 함

## 0. 코드에 반영된 심사 필수 항목

- ✅ 앱 아이콘 1024×1024 (`AppIcon.png`)
- ✅ HealthKit 권한 안내 문구 (`NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription`)
- ✅ 운동 백그라운드 모드 (`WKBackgroundModes: workout-processing`)
- ✅ 개인정보 매니페스트 `PrivacyInfo.xcprivacy` (앱 + 컴플리케이션, UserDefaults 사용 사유 신고)
- ✅ 암호화 신고 `ITSAppUsesNonExemptEncryption = NO`
- ✅ 의료 면책 문구 (설정 화면 하단, 설명, 개인정보 처리방침)
- ✅ 지원 페이지 `cardio-pacer/index.html`, 개인정보 처리방침 `cardio-pacer/privacy.html`
- ✅ 시뮬레이터 가짜 심박수 (스크린샷·심사용)

## 1. 계정 준비

- ☐ [Apple Developer Program](https://developer.apple.com/programs/) 가입 (연 US$99, 원화 결제 시 약 13만 원)
- ☐ App Store Connect → 비즈니스 → 계약·세금·은행 정보 (무료 앱이면 무료 앱 계약만으로 충분)

## 2. 웹페이지 공개

- ☐ `index.html`, `privacy.html` 의 `CONTACT_EMAIL` 을 실제 문의 이메일로 교체
- ☐ 이 브랜치를 main 에 합치기 (PR) → 아래 주소가 열리는지 확인
  - https://groovenspot.github.io/cardio-pacer/
  - https://groovenspot.github.io/cardio-pacer/privacy.html

## 3. 식별자 등록 (developer.apple.com → Certificates, IDs & Profiles)

Xcode의 자동 서명이 대부분 만들어 주지만, 안 되면 직접 등록하세요.
- ☐ App Group: `group.com.groovenspot.cardiopacer`
- ☐ App ID `com.groovenspot.cardiopacer.watchkitapp` — HealthKit, App Groups 켜기
- ☐ App ID `com.groovenspot.cardiopacer.watchkitapp.complications` — App Groups 켜기

## 4. 빌드 (Mac)

```bash
brew install xcodegen
cd cardio-pacer
xcodegen generate
open CardioPacer.xcodeproj
```
- ☐ 타깃 2개(CardioPacer, CardioPacerComplications) → Signing & Capabilities → Team 선택
- ☐ ⌘U 로 단위 테스트 통과 확인
- ☐ 실제 Apple Watch에서 운동 1회 (색 전환, 진동, 일시정지/종료, 요약, 건강 앱 저장 확인)
- ☐ 워치페이스에 컴플리케이션 추가해서 탭으로 실행되는지 확인

## 5. 업로드

- ☐ App Store Connect → 앱 → **+ 신규 앱** → 플랫폼 **watchOS**, 번들 ID `com.groovenspot.cardiopacer.watchkitapp`
- ☐ Xcode → 대상 기기 "Any watchOS Device" → Product → **Archive** → Distribute App → App Store Connect
- ☐ TestFlight 로 본인 워치에 설치해서 최종 확인

## 6. 스토어 정보 입력

- ☐ `store/APP_STORE.md` 의 값을 복사해 붙여넣기 (한국어 + 영어)
- ☐ 스크린샷 5장 (APP_STORE.md 의 "스크린샷" 참고)
- ☐ 앱 개인정보 보호 → "데이터를 수집하지 않음"
- ☐ 연령 등급 → 4+
- ☐ 심사 정보 메모 붙여넣기

## 7. 심사 제출

- ☐ 빌드 선택 → **심사에 제출**
- 보통 1~3일 걸립니다. 자주 나오는 반려 사유와 대응:
  - **4.2 최소 기능** — "기능이 너무 단순하다": 메모에 실시간 존 색 전환, 햅틱 경고, 존 계산, 달성률 요약, 컴플리케이션을 강조 (이미 메모에 포함)
  - **5.1.3 건강 데이터** — 권한 문구가 불명확하다: 이미 용도를 구체적으로 적었음
  - **1.4.1 의료** — 정확도 주장: 설명에 "참고값", "의료기기 아님" 명시 (이미 포함)
  - **2.1 앱 완성도** — 심사자가 심박수를 못 봄: 메모에 "착용 후 몇 초 안에 표시" 안내 (이미 포함)
