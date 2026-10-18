# Google Play 출시에 대해

## 지금 앱은 Google Play에 올릴 수 없습니다

Cardio Pacer는 **Apple Watch 전용 앱**(Swift / watchOS)입니다.
Google Play에는 Android 기기용 앱만 올릴 수 있으므로, 같은 기능을 **Wear OS 스마트워치용으로 새로 만들어야** 합니다
(삼성 갤럭시 워치, 픽셀 워치 등).

## Wear OS 버전을 만든다면

| watchOS (현재) | Wear OS (새로 만들 것) |
|---|---|
| Swift + SwiftUI | Kotlin + Compose for Wear OS |
| HealthKit `HKWorkoutSession` | Health Services `ExerciseClient` (운동 중 심박수) |
| `WKInterfaceDevice.play` 진동 | `Vibrator` / `VibrationEffect` |
| WidgetKit 컴플리케이션 | Wear OS Tiles + Complications |
| 건강 앱 저장 | Health Connect 저장 |

그대로 옮겨 쓸 수 있는 것:
- 존 계산·히스테리시스·달성률 로직 (`Shared/ZoneModels.swift` → Kotlin으로 옮기기 쉬움)
- 화면 설계, 색상, 문구, 아이콘
- 개인정보 처리방침 (`privacy.html`) — Android용 문구만 조금 추가

## Google Play 출시에 추가로 필요한 것

- Google Play Console 개발자 계정 (1회 US$25)
- **개인 계정은 비공개 테스트 필수**: 2023년 11월 이후 만든 개인 개발자 계정은 테스터 12명이 14일 이상 테스트해야 프로덕션 출시 가능 (작성 시점 기준, 출시 전 Play Console에서 확인)
- 데이터 보안(Data safety) 양식 — "데이터 수집 안 함"
- 건강 앱 신고(Health apps declaration) 양식
- Wear OS 스크린샷 (원형 384×384 이상), 기능 그래픽 1024×500
- 스토어 설명은 `APP_STORE.md` 문구를 거의 그대로 사용 가능 (Google Play 제한: 앱 이름 30자, 간단한 설명 80자, 자세한 설명 4000자)
