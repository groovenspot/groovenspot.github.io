# Cardio Pacer — 존 2 심박수 심플 가이드 (watchOS)

달리는 중에도 한눈에: 화면 전체 색으로 지금 Zone 2에 있는지 알려주는 Apple Watch 앱.

| 색 | 구간 | 안내 |
|---|---|---|
| 🔵 파랑 | Zone 1 이하 | 페이스를 조금 올리세요 |
| 🟢 초록 | Zone 2 (목표) | 완벽합니다! 이대로 유지 |
| 🔴 빨강 | Zone 3 이상 | 속도를 줄이세요 + 손목 진동 "징-징" |

## 빌드

1. `brew install xcodegen`
2. `cd cardio-pacer && xcodegen generate`
3. `CardioPacer.xcodeproj`를 열고 Signing & Capabilities에서 팀 선택
   (번들 ID `com.groovenspot.cardiopacer.*`, App Group `group.com.groovenspot.cardiopacer`는 필요하면 변경)
4. 실제 Apple Watch에서 실행 (시뮬레이터는 심박수 데이터가 없음)

요구사항: Xcode 15+, watchOS 10+

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
```

## 존 2 계산

- 최대 심박수: Tanaka 공식 `208 − 0.7 × 나이` (직접 지정값이 있으면 그 값)
- 안정 시 심박수가 있으면 Karvonen: `안정 + (0.60 ~ 0.70) × (최대 − 안정)`
- 없으면 `최대 심박수 × 60 ~ 70%`
- "직접 입력"을 고르면 입력한 범위를 그대로 사용

경계에서 화면이 깜빡이지 않도록, Zone 2를 벗어날 때는 즉시 전환하고 돌아올 때는 범위 안쪽으로
2 BPM 들어와야 초록으로 바뀝니다. 진동 경고는 최소 5초 간격.

달성률은 일시정지 시간을 제외하고, 첫 심박수 측정 이후 추적된 시간 중 Zone 2 비율입니다.

## 다음 단계 (미구현)

- iPhone 컴패니언 앱에서 존 설정 (WatchConnectivity) — 현재는 워치에서 직접 설정
