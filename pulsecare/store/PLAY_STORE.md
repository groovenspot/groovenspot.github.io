# Play 스토어 베타(내부 테스트) 준비

Play Console에 입력할 값을 코드가 실제로 하는 그대로 적었습니다. `[ ]`로 표시한 곳은 운영자가 채워야 합니다.
법률 문서(처리방침·약관)는 초안이라 정식 출시 전 전문가 검토가 필요합니다.

## 0. 먼저 채울 것

| 항목 | 들어가는 곳 |
|---|---|
| [운영자명] (개인 또는 사업자) | `pulsecare/privacy`, `pulsecare/terms` |
| [개인정보 보호책임자] 이름 | `pulsecare/privacy` 10번 |
| [문의 이메일] | 처리방침, 약관, 계정 삭제 페이지, Play Console 연락처 |
| [시행일] | 처리방침, 약관 |
| GitHub Pages 공개 | 이 브랜치를 `main`에 합치면 아래 주소가 열립니다 |

- 처리방침: https://groovenspot.github.io/pulsecare/privacy/
- 이용약관: https://groovenspot.github.io/pulsecare/terms/
- 계정 삭제: https://groovenspot.github.io/pulsecare/delete-account/

## 1. 업로드 키와 빌드

```
keytool -genkeypair -keystore pulsecare-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

- 키 파일은 저장소에 넣지 말고 안전한 곳에 두 벌 보관합니다. Play App Signing을 켜면 이 키는 업로드용이고, 앱 서명 키는 Google이 보관합니다.
- 로컬 빌드: `~/.gradle/gradle.properties`에
  ```
  pulsecare.signing.storeFile=/절대/경로/pulsecare-upload.jks
  pulsecare.signing.storePassword=...
  pulsecare.signing.keyAlias=upload
  pulsecare.signing.keyPassword=...
  pulsecare.versionCode=2
  ```
  후 `cd pulsecare/android && ./gradlew :mobile:bundleRelease :wear:bundleRelease`
- CI 빌드: 저장소 Settings > Secrets에 `PULSECARE_UPLOAD_KEYSTORE_B64`(`base64 -w0 pulsecare-upload.jks`), `PULSECARE_KEYSTORE_PASSWORD`, `PULSECARE_KEY_ALIAS`, `PULSECARE_KEY_PASSWORD`, 서버·Firebase 값(`PULSECARE_SERVER_URL`, `PULSECARE_FIREBASE_APP_ID`, `_API_KEY`, `_PROJECT_ID`, `_SENDER_ID`)을 넣고 Actions > PulseCare > Run workflow. 실행 번호가 versionCode가 되고 `pulsecare-release-aab`로 AAB 두 개가 올라옵니다.
- 폰 앱과 워치 앱은 패키지 이름(`com.groovenspot.pulsecare`)이 같은 한 앱입니다. 워치 AAB는 Play Console > 테스트 > 내부 테스트에서 "Wear OS 전용" 트랙으로 올립니다 (폼 팩터에 Wear OS 추가 필요).

## 2. 기본 스토어 등록정보

- 앱 이름 (30자): `펄스케어 - 워치 컨디션 코치`
- 간단한 설명 (80자): `워치 기록으로 매일 아침 컨디션 점수와 오늘 할 일 하나. 멀리 있는 가족도 함께 챙겨요.`
- 자세한 설명:

```
매일 아침, 어젯밤 워치 기록으로 오늘의 컨디션을 알려 드려요.

· 컨디션 점수: 수면, 심박 변이(HRV), 안정시 심박, 활동량을 내 평소와 비교해 0~100점과 이유 한 줄로
· 오늘의 미션: 목표(수면·체중·스트레스·부모님)에 맞는 할 일 하나. 걸음·운동·취침 시각은 워치 기록으로 자동 확인
· 저녁 요약과 주간 리포트: 못 한 미션은 "내일 다시", 일요일엔 한 주 변화
· 기록: 주간·월간 점수, 수면, 회복 추이와 내 평소 범위
· 워치 앱: 점수 타일, 워치 페이스 점수, 미션 완료, SOS
· 가족: 부모님을 초대하면 하루 요약을 함께 보고, SOS를 누르면 보호자에게 순서대로 알려요

건강 수치는 휴대폰 안에서만 계산하고 서버로 보내지 않아요. 광고와 분석 도구가 없어요.
펄스케어는 진단·치료를 하지 않는 웰니스 앱이에요. 응급 상황에서는 119에 연락하세요.

갤럭시 워치는 삼성 헬스 > 설정 > Health Connect 동기화를 켜야 기록이 들어와요.
```

- 카테고리: 건강/운동 · 태그: 수면, 스마트워치, 건강 관리
- 스크린샷: `android/mobile/src/test/snapshots/images`의 홈·기록·가족 화면(예시 데이터), 워치는 `android/wear/src/test/snapshots/images`. 정식 출시 전에는 실기기 캡처로 바꾸는 걸 권장합니다.

## 3. 앱 콘텐츠

| 항목 | 답 |
|---|---|
| 개인정보처리방침 | https://groovenspot.github.io/pulsecare/privacy/ |
| 앱 액세스 | 모든 기능을 별도 로그인 없이 쓸 수 있음. 점수는 Health Connect 기록이 있어야 나옴 (심사용 안내: 기록이 없으면 "학습 중"·느낌 입력 화면) |
| 광고 | 없음 |
| 콘텐츠 등급 | 폭력·성적 내용·도박 없음. 사용자 간 상호작용: 초대한 가족끼리만 이름·요약 공유 |
| 타겟층 | 18세 이상 (앱 자체는 만 14세 이상 이용 가능, 아동 대상 아님) |
| 뉴스 앱 / 정부 앱 / 금융 기능 | 아니요 |
| 건강 앱 신고 | 건강 및 피트니스 > 활동·수면 추적, 웰니스·습관. 의료기기 아님, 진단·치료 기능 없음 |
| 계정 삭제 | 앱 내: 내 정보 > 기록 지우기 · 동의 철회 · 탈퇴 / 웹: https://groovenspot.github.io/pulsecare/delete-account/ |

## 4. 데이터 보안 양식

"수집" = 기기 밖(운영자 서버)으로 나가는 것. Health Connect 기록은 기기 안에서만 처리되어 수집에 해당하지 않습니다.

| 데이터 유형 | 수집 | 공유 | 선택/필수 | 목적 |
|---|---|---|---|---|
| 개인 정보 > 이름 | 예 (가족 기능을 쓸 때) | 아니요* | 선택 | 앱 기능 |
| 개인 정보 > 전화번호 | 예 (입력한 경우) | 아니요* | 선택 | 앱 기능 |
| 건강 및 피트니스 > 건강 정보 (컨디션 점수, 주의 알림 문구, 긴급 여부) | 예 (가족 기능을 쓸 때) | 아니요* | 선택 | 앱 기능 |
| 기기 또는 기타 ID (FCM 토큰, Firebase 설치 ID) | 예 | 아니요 | 선택 | 앱 기능 (알림) |

\* 이용자가 직접 연결한 가족에게 보이는 것은 사용자가 시작한 전송이라 "공유"에서 제외됩니다 (Play 정책 예외).

- 전송 중 암호화: 예 (HTTPS)
- 데이터 삭제 요청: 예 (앱 내 즉시 삭제, 웹 요청)
- 위치, 연락처, 사진, 메시지, 앱 활동 기록, 웹 기록, 금융 정보: 수집 안 함
- 독립 보안 검토(MASA): 아니요

## 5. Health Connect 권한 선언

Play Console > 앱 콘텐츠 > Health Connect에서 권한마다 이유를 적습니다.

| 권한 | 사용 이유 |
|---|---|
| READ_SLEEP | 지난밤 수면 시간·효율·깊은 잠·취침 시각으로 컨디션 점수(수면 35%)를 계산하고 취침 미션을 확인 |
| READ_HEART_RATE_VARIABILITY | 수면 중 HRV를 내 평소와 비교해 회복 점수(25%) 계산 |
| READ_RESTING_HEART_RATE | 안정시 심박을 평소와 비교해 회복 점수(15%)와 "안정시 심박 상승" 알림 |
| READ_STEPS | 걸음 미션 자동 확인, "활동량 급감" 알림 |
| READ_ACTIVE_CALORIES_BURNED | 7일/28일 활동 부하 비율로 과부하 판단 (점수 15%) |
| READ_RESPIRATORY_RATE | 수면 중 호흡수 보조 지표 (5%) |
| READ_OXYGEN_SATURATION | 수면 중 산소포화도 90% 미만 반복 시 상담 권유 알림 |
| READ_FLOORS_CLIMBED | 계단 오르기 미션 자동 확인 |
| READ_EXERCISE | 운동 미션(걷기·자전거 등 20분) 자동 확인 |
| READ_HEALTH_DATA_IN_BACKGROUND | 앱을 열지 않아도 아침 7:30에 점수를 계산해 리포트를 보내고, 저녁 9시에 미션 완료를 확인 |

공통: 읽기만 하며 쓰기 권한 없음, 기기 안에서만 계산, 광고·판매·보험 심사에 쓰지 않음. 권한 안내 화면(`PermissionsRationaleActivity`)에 같은 내용과 처리방침 링크가 있습니다.

## 6. 그 밖의 권한

| 권한 | 이유 |
|---|---|
| POST_NOTIFICATIONS | 아침·저녁·주간 리포트, 가족 긴급 알림 |
| INTERNET | 가족 서버 (가족 기능을 쓸 때만) |
| 워치: WAKE_LOCK, VIBRATE | 타일·SOS 화면 |

정확한 알람, 전체 화면 알림, 위치, 포그라운드 서비스는 쓰지 않습니다.

## 7. 내부 테스트 순서

1. Play Console에서 앱 만들기 (기본 언어 한국어, 앱, 무료)
2. 0번 항목 채우고 `main`에 합쳐 문서 주소 열기
3. 3~6번 입력
4. 내부 테스트 트랙에 폰 AAB, Wear OS 트랙에 워치 AAB 업로드
5. 테스터 이메일 목록 추가 → 참여 링크 공유
6. 베타 동안 `TESTING.md` 순서로 확인
