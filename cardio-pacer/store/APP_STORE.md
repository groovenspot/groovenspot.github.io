# App Store Connect 입력값

App Store Connect → 나의 앱 → Cardio Pacer 에 아래 값을 그대로 붙여넣으세요.
글자 수 제한은 `python3 store/check_lengths.py` 로 확인할 수 있습니다.

## 앱 정보

| 항목 | 값 |
|---|---|
| 플랫폼 | watchOS (Apple Watch 전용 앱) |
| 번들 ID | `com.groovenspot.cardiopacer.watchkitapp` |
| SKU | `cardiopacer-watch-001` |
| 기본 언어 | 한국어 |
| 1차 카테고리 | 건강 및 피트니스 (Health & Fitness) |
| 2차 카테고리 | 스포츠 (Sports) |
| 가격 | 무료 (변경 가능) |
| 저작권 | `2026 groovenspot` |
| 지원 URL | `https://groovenspot.github.io/cardio-pacer/` |
| 개인정보 처리방침 URL | `https://groovenspot.github.io/cardio-pacer/privacy.html` |
| 마케팅 URL (선택) | `https://groovenspot.github.io/cardio-pacer/` |

> 이 URL들은 이 브랜치가 GitHub Pages 기본 브랜치(main)에 합쳐진 뒤에 열립니다.

---

## 한국어 (기본)

### 이름 (30자)
```
Cardio Pacer - 존2 심박 가이드
```
이미 쓰이는 이름이면 다음 후보를 쓰세요: `존2 페이서 - Cardio Pacer`, `Cardio Pacer: Zone 2`

### 부제 (30자)
```
화면 색으로 보는 유산소 존 2 심박수
```

### 프로모션 텍스트 (170자, 심사 없이 언제든 수정 가능)
```
달리면서 숫자를 읽지 마세요. 초록이면 유지, 빨강이면 속도를 줄이세요. 화면 색과 손목 진동만으로 Zone 2를 지키는 가장 단순한 Apple Watch 운동 앱.
```

### 설명 (4000자)
```
달리는 중에 페이스, 거리, 칼로리를 읽기는 어렵습니다.
Cardio Pacer는 딱 하나만 알려줍니다. "지금 Zone 2에 있나요?"

■ 화면 색 하나로 끝나는 심박 가이드
Apple Watch 화면 전체가 지금 심박 구간의 색으로 바뀝니다.
• 파란색 (Zone 1 이하): 페이스를 조금 올리세요
• 초록색 (Zone 2): 완벽합니다! 이대로 유지하세요
• 빨간색 (Zone 3 이상): 심박수가 너무 높아요. 속도를 줄이세요

■ 손목 진동 경고
Zone 2를 넘어 빨간색에 들어서는 순간 손목에 두 번 진동이 울립니다. 화면을 보지 않아도 됩니다.

■ 꼭 필요한 3가지만, 크게
현재 심박수(BPM), 현재 존, 운동 시간. 그래프도 작은 글씨도 없습니다.

■ 나에게 맞춘 Zone 2
나이와 안정 시 심박수로 Zone 2 범위를 자동 계산합니다(Karvonen 공식). 건강 앱에서 한 번에 불러올 수 있고, 원하는 범위를 직접 입력할 수도 있습니다.

■ 운동 후 Zone 2 달성률
운동을 마치면 "Zone 2 달성률 82%"처럼 목표 구간에 머문 비율과 존별 시간을 보여줍니다. 운동 기록은 건강 앱에 저장됩니다.

■ 워치페이스에서 바로 시작
컴플리케이션과 스마트 스택 위젯을 지원해 탭 한 번으로 실행할 수 있습니다.

러닝, 사이클, 빠르게 걷기(런데이) 모두 지원합니다.
다이어트와 체력 향상을 위해 저강도 유산소를 꾸준히 하고 싶은 분께 추천합니다.

■ 개인정보
모든 건강 데이터는 Apple Watch 안에서만 처리됩니다. 계정, 광고, 분석 도구가 없으며 어떤 데이터도 외부로 전송하지 않습니다.

※ Cardio Pacer는 의료기기가 아니며 질병의 진단이나 치료를 위한 것이 아닙니다. 계산된 심박 구간은 참고값입니다. 심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.
```

### 키워드 (100자, 쉼표로 구분, 띄어쓰기 없이)
```
존2,심박수,유산소,러닝,달리기,다이어트,사이클,걷기,런데이,심박존,워치,운동,페이스,zone2,heart rate,cardio
```

### 이 버전의 새로운 기능
```
Cardio Pacer 첫 출시! 화면 색과 손목 진동으로 Zone 2를 지켜보세요.
```

---

## English (추가 현지화: 영어(미국))

### Name (30)
```
Cardio Pacer: Zone 2 Guide
```

### Subtitle (30)
```
Heart rate zones at a glance
```

### Promotional Text (170)
```
Stop reading numbers mid-run. Green means hold, red means slow down. Stay in Zone 2 with nothing but screen color and a tap on your wrist.
```

### Description (4000)
```
Reading pace, distance and calories while running is hard.
Cardio Pacer tells you just one thing: are you in Zone 2 right now?

■ ONE COLOR, ONE ANSWER
Your whole Apple Watch screen turns the color of your current heart rate zone.
• Blue (Zone 1 or lower): pick up the pace a little
• Green (Zone 2): perfect, hold it right there
• Red (Zone 3 or higher): heart rate too high, slow down

■ HAPTIC WARNING
The moment you climb above Zone 2 into red, your wrist taps twice. No need to look.

■ ONLY WHAT MATTERS, BIG
Current heart rate, current zone, and workout time. No graphs, no tiny text.

■ YOUR ZONE 2
Your Zone 2 range is calculated from age and resting heart rate (Karvonen method). Import both from the Health app in one tap, or enter your own range.

■ ZONE 2 SCORE
When you finish, see how much of your workout you spent in Zone 2, plus time in each zone. Workouts are saved to the Health app.

■ START FROM YOUR WATCH FACE
Complications and a Smart Stack widget launch the app in one tap.

Supports running, cycling and brisk walking.

■ PRIVACY
All health data stays on your Apple Watch. No accounts, no ads, no analytics, nothing is ever sent off your device.

Cardio Pacer is not a medical device and is not intended to diagnose or treat any condition. Zones are estimates. If you have a heart condition or take medication, consult a doctor before exercising.
```

### Keywords (100)
```
zone 2,heart rate,cardio,running,run,aerobic,fat burn,cycling,walking,hr zone,pace,fitness,training
```

### What's New
```
First release! Stay in Zone 2 with screen color and haptics.
```

---

## 앱 개인정보 보호 (App Privacy, "개인정보 영양 성분표")

App Store Connect → 앱 개인정보 보호 → 시작하기

- **데이터를 수집합니까?** → **아니요, 이 앱에서 데이터를 수집하지 않습니다**

근거: 건강 데이터는 기기 안에서만 처리되고 개발자 서버로 전송되지 않습니다.
Apple 기준에서 "수집"은 기기 밖으로 전송되어 개발자나 제3자가 접근할 수 있는 경우를 말하므로 해당하지 않습니다.
(코드의 `PrivacyInfo.xcprivacy`도 같은 내용으로 신고되어 있습니다.)

## 연령 등급

모든 질문에 **없음 / 아니요** → **4+**
- 의료/치료 정보: **없음** (참고용 심박 구간만 표시, 진단 기능 없음)
- 무제한 웹 접근, 사용자 생성 콘텐츠, 도박, 광고: 없음

## 수출 규정 준수 (암호화)

`ITSAppUsesNonExemptEncryption = NO` 가 Info.plist에 들어 있어 업로드할 때 따로 묻지 않습니다.
(앱은 네트워크 통신을 하지 않으며 표준 OS 암호화 외 암호화를 쓰지 않습니다.)

## 콘텐츠 권한

제3자 콘텐츠: **아니요**

## 심사 정보 (App Review Information)

- 로그인 필요: **아니요** (데모 계정 없음)
- 연락처: 이름 / 전화번호 / 이메일 직접 입력
- 메모 (그대로 복사):

```
Cardio Pacer is a watch-only app. It shows the user's live heart rate zone as a full-screen color (blue / green / red) during a workout and plays a double haptic when the heart rate goes above Zone 2.

How to test:
1. Launch the app on Apple Watch and allow Health access.
2. On first launch, set age (and optionally resting heart rate) or tap "건강 앱에서 불러오기" (Import from Health), then tap "시작하기".
3. Choose an activity and tap "시작" (Start). Heart rate appears within a few seconds while wearing the watch.
4. Swipe right (or long-press) on the workout screen to pause or end. The summary shows the percentage of time in Zone 2.

HealthKit usage: reads heart rate, resting heart rate and date of birth to compute and display heart rate zones; writes the workout to Health. All processing is on-device; no data leaves the device, and there are no accounts, ads or analytics.

The app is not a medical device; a disclaimer is shown on the settings screen and in the description.
In the Simulator (no heart rate sensor), a simulated heart rate sweeps through all three zones so every screen can be reviewed.
```

## 스크린샷

watchOS 앱은 **Apple Watch 스크린샷만** 필요합니다(iPhone 스크린샷 불필요). 아래 크기 중 하나로 1~10장, 모두 같은 크기여야 합니다.

| 기기 | 픽셀 |
|---|---|
| Apple Watch Ultra 3 | 422 × 514 |
| Apple Watch Ultra / Ultra 2 | 410 × 502 |
| Apple Watch Series 10 / 11 (46mm) | 416 × 496 |
| Apple Watch Series 7–9 (45mm) | 396 × 484 |
| Apple Watch Series 4–6, SE (44mm) | 368 × 448 |

> 위 크기는 작성 시점 기준입니다. 업로드 전에 App Store Connect의 스크린샷 화면에서 요구 크기를 한 번 확인하세요.

**찍는 방법 (Mac):** Xcode에서 해당 워치 시뮬레이터로 실행 → 시뮬레이터 메뉴 File → Save Screen (⌘S).
시뮬레이터에서는 가짜 심박수가 약 1분 주기로 세 가지 존을 오가므로 모든 색을 찍을 수 있습니다.

추천 순서 (5장):
1. 초록 화면 (Zone 2, 예: 138 BPM) — "초록이면 유지"
2. 빨간 화면 (Zone 3+) — "빨강이면 속도를 줄이세요 + 진동"
3. 파란 화면 (Zone 1) — "파랑이면 페이스 업"
4. 요약 화면 (Zone 2 달성률) — "운동 후 달성률 확인"
5. 시작 화면 (목표 범위) — "나에게 맞춘 Zone 2"
