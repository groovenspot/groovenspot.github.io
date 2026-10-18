# Cardio Pacer — 존 2 심박수 심플 가이드 (watchOS · Wear OS)

달리는 중에도 한눈에: 화면 전체 색으로 지금 Zone 2에 있는지 알려주는 스마트워치 앱.
Apple Watch 버전(이 폴더, Swift)과 Wear OS 버전([`wearos/`](wearos), Kotlin)이 같은 존 계산 로직과 화면 설계를 공유합니다.

| 색 | 구간 | 안내 |
|---|---|---|
| 🔵 파랑 | Zone 1 이하 | 페이스를 조금 올리세요 |
| 🟢 초록 | Zone 2 (목표) | 완벽합니다! 이대로 유지 |
| 🔴 빨강 | Zone 3 이상 | 속도를 줄이세요 + 손목 진동 "징-징" |

## 빌드 — Apple Watch

1. `brew install xcodegen`
2. `cd cardio-pacer && xcodegen generate`
3. `CardioPacer.xcodeproj`를 열고 Signing & Capabilities에서 팀 선택
   (번들 ID `com.groovenspot.cardiopacer.*`, App Group `group.com.groovenspot.cardiopacer`는 필요하면 변경)
4. 실제 Apple Watch에서 실행 (시뮬레이터는 심박수 데이터가 없음)

요구사항: Xcode 15+, watchOS 10+

## 빌드 — Wear OS

1. Android Studio로 `wearos/` 폴더 열기 (또는 `cd wearos && ./gradlew assembleDebug`)
2. Wear OS 에뮬레이터나 워치에 실행. 에뮬레이터 가짜 심박 데이터는 `store/GOOGLE_PLAY.md` 참고
3. 테스트: `./gradlew testDebugUnitTest` (존 로직 14개 + 화면 렌더링 6개)

요구사항: JDK 17+, Android SDK 36, Wear OS 3 이상 (API 30+)

Wear OS 버전은 플랫폼 관례를 따릅니다.
- 운동 화면에서 **왼쪽** 스와이프(또는 길게 누르기)로 정지/종료. 오른쪽 스와이프는 워치페이스로 나가며 운동은 계속됩니다
- 안정 시 심박수 자동 불러오기 없음 (직접 입력)
- 운동 기록을 Health Connect에 저장하지 않음

## 구조

```
Shared/                     앱 + 컴플리케이션 공용
  ZoneModels.swift          존 계산(Karvonen / 최대심박 %), 히스테리시스, 존별 시간 집계, 요약
  ZoneStyle.swift           존 색상·문구
  ZoneSettingsStore.swift   App Group UserDefaults 저장 → 컴플리케이션 갱신
CardioPacer/                워치 앱
  Workout/WorkoutManager    HKWorkoutSession + HKLiveWorkoutBuilder, 실시간 심박 → 존 → 햅틱
  Views/StartView           [1단계] 목표 범위 확인 · 운동 종류 선택 · 시작
  Views/ActiveWorkoutView   [2단계] 전체 화면 색 + BPM + 존 + 운동 시간
  Views/ControlsView        오른쪽 스와이프(또는 길게 누르기) → 정지/재개 · 종료
  Views/SummaryView         [3단계] "Zone 2 달성률: 82%" + 존별 시간
  Views/ZoneSettingsView    온보딩/설정: 나이·안정 시 심박수(건강 앱에서 불러오기) 또는 직접 입력
CardioPacerComplications/   워치페이스 컴플리케이션 & 스마트 스택 위젯 (탭 → 앱 실행)
CardioPacerTests/           존 계산 로직 단위 테스트
wearos/                     Wear OS 앱 (Kotlin, Compose for Wear OS, Health Services)
  zone/ZoneModels.kt        Shared/ZoneModels.swift 를 옮긴 것 (같은 테스트)
  exercise/ExerciseService  포그라운드 서비스: ExerciseClient 심박 → 존 → 진동, Ongoing Activity
  ui/                       시작 · 운동(색 화면/컨트롤) · 요약 · 설정 화면
  complication/             워치페이스 컴플리케이션 (탭 → 앱 실행)
store/                      App Store / Google Play 등록 문구, 체크리스트, Play 그래픽
Tools/                      아이콘·Play 그래픽 생성 스크립트
```

## 존 2 계산

- 최대 심박수: Tanaka 공식 `208 − 0.7 × 나이` (직접 지정값이 있으면 그 값)
- 안정 시 심박수가 있으면 Karvonen: `안정 + (0.60 ~ 0.70) × (최대 − 안정)`
- 없으면 `최대 심박수 × 60 ~ 70%`
- "직접 입력"을 고르면 입력한 범위를 그대로 사용

경계에서 화면이 깜빡이지 않도록, Zone 2를 벗어날 때는 즉시 전환하고 돌아올 때는 범위 안쪽으로
2 BPM 들어와야 초록으로 바뀝니다. 진동 경고는 최소 5초 간격.

달성률은 일시정지 시간을 제외하고, 첫 심박수 측정 이후 추적된 시간 중 Zone 2 비율입니다.

## 출시

- App Store 등록 정보·심사 메모: [`store/APP_STORE.md`](store/APP_STORE.md)
- 출시 체크리스트: [`store/RELEASE_CHECKLIST.md`](store/RELEASE_CHECKLIST.md)
- Google Play 등록 정보·앱 콘텐츠 답변·출시 순서: [`store/GOOGLE_PLAY.md`](store/GOOGLE_PLAY.md)
- 지원 페이지 `index.html`, 개인정보 처리방침 `privacy.html` (GitHub Pages)
- 시뮬레이터에서는 가짜 심박수가 세 존을 오가므로 스크린샷을 찍을 수 있습니다

## 다음 단계 (미구현)

- iPhone 컴패니언 앱에서 존 설정 (WatchConnectivity) — 현재는 워치에서 직접 설정
