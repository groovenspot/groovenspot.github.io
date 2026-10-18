# Google Play Console 입력값 (Wear OS 앱 + Android 폰 앱)

소스: [`android/`](../android) — `wear` (Wear OS 앱), `mobile` (폰 컴패니언), `shared` (공용 로직)
두 앱은 같은 패키지 이름 `com.groovenspot.cardiopacer` 로 **하나의 Play 등록정보**에 함께 올라갑니다.
글자 수 제한은 `python3 store/check_lengths.py` 로 확인할 수 있습니다.

## 앱 정보

| 항목 | 값 |
|---|---|
| 패키지 이름 | `com.groovenspot.cardiopacer` |
| 앱 또는 게임 | 앱 |
| 무료/유료 | 무료 |
| 카테고리 | 건강/운동 (Health & Fitness) |
| 기기 | 휴대전화 + **Wear OS** (고급 설정 → 폼 팩터 → Wear OS 추가) |
| 지원 웹사이트 | `https://groovenspot.github.io/cardio-pacer/` |
| 개인정보 처리방침 | `https://groovenspot.github.io/cardio-pacer/privacy.html` |
| 이메일 | 문의 이메일 (공개됨) |

## 그래픽 (`store/google-play/`)

| 항목 | 파일 |
|---|---|
| 앱 아이콘 512×512 | `icon-512.png` |
| 기능 그래픽 1024×500 | `feature-graphic-1024x500.png` |
| Wear OS 스크린샷 (384×384, 1:1) | `screenshots/1-zone2.png` … `6-settings.png` |
| 휴대전화 스크린샷 (1080×2160) | `screenshots/phone-1-companion.png`, `phone-2-manualSetup.png` |

스크린샷은 실제 앱 화면 코드를 렌더링한 것입니다. 화면을 바꾼 뒤에는 다시 만드세요:
```bash
cd android && ./gradlew recordPaparazziDebug && cd .. && python3 Tools/make_play_assets.py <NotoSansCJK 폰트 경로>
```

---

## 한국어 (기본)

### 앱 이름 (30자)
```
Cardio Pacer - 존2 심박 가이드
```

### 간단한 설명 (80자)
```
화면 색과 손목 진동으로 유산소 Zone 2를 지키는 가장 단순한 Wear OS 운동 앱
```

### 자세한 설명 (4000자)
```
달리는 중에 페이스, 거리, 칼로리를 읽기는 어렵습니다.
Cardio Pacer는 딱 하나만 알려줍니다. "지금 Zone 2에 있나요?"

■ 화면 색 하나로 끝나는 심박 가이드
워치 화면 전체가 지금 심박 구간의 색으로 바뀝니다.
• 파란색 (Zone 1 이하): 페이스를 조금 올리세요
• 초록색 (Zone 2): 완벽합니다! 이대로 유지하세요
• 빨간색 (Zone 3 이상): 심박수가 너무 높아요. 속도를 줄이세요

■ 손목 진동 경고
Zone 2를 넘어 빨간색에 들어서는 순간 손목에 두 번 진동이 울립니다. 화면을 보지 않아도 됩니다.

■ 꼭 필요한 3가지만, 크게
현재 심박수(BPM), 현재 존, 운동 시간. 그래프도 작은 글씨도 없습니다.

■ 나에게 맞춘 Zone 2
나이와 안정 시 심박수로 Zone 2 범위를 자동 계산합니다(Karvonen 공식). 원하는 범위를 직접 입력할 수도 있습니다.

■ 운동 후 Zone 2 달성률
운동을 마치면 "Zone 2 달성률 82%"처럼 목표 구간에 머문 비율과 존별 시간을 보여줍니다.

■ 워치페이스에서 바로 시작
컴플리케이션을 지원해 탭 한 번으로 실행할 수 있습니다. 운동 중에는 화면을 꺼도 계속 측정하고 진동으로 알려줍니다.

■ 휴대폰 앱
큰 화면에서 Zone 2를 설정하면 워치로 바로 전송됩니다. 지난 운동의 Zone 2 달성률을 모아 보고, Health Connect에 운동 기록을 저장할 수도 있습니다.

러닝, 사이클, 빠르게 걷기(런데이) 모두 지원합니다.
휴대폰 없이 워치만으로도 동작합니다.

■ 개인정보
모든 건강 데이터는 워치 안에서만 처리됩니다. 계정, 광고, 분석 도구가 없으며 어떤 데이터도 외부로 전송하지 않습니다.

※ Cardio Pacer는 의료기기가 아니며 질병의 진단이나 치료를 위한 것이 아닙니다. 계산된 심박 구간은 참고값입니다. 심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.
```

---

## English (번역 추가: 영어(미국) en-US)

### App name (30)
```
Cardio Pacer: Zone 2 Guide
```

### Short description (80)
```
Stay in Zone 2 with screen color and wrist haptics. Simple cardio for your watch
```

### Full description (4000)
```
Reading pace, distance and calories while running is hard.
Cardio Pacer tells you just one thing: are you in Zone 2 right now?

■ ONE COLOR, ONE ANSWER
Your whole watch screen turns the color of your current heart rate zone.
• Blue (Zone 1 or lower): pick up the pace a little
• Green (Zone 2): perfect, hold it right there
• Red (Zone 3 or higher): heart rate too high, slow down

■ HAPTIC WARNING
The moment you climb above Zone 2 into red, your wrist buzzes twice. No need to look.

■ ONLY WHAT MATTERS, BIG
Current heart rate, current zone, and workout time. No graphs, no tiny text.

■ YOUR ZONE 2
Your Zone 2 range is calculated from age and resting heart rate (Karvonen method), or enter your own range.

■ ZONE 2 SCORE
When you finish, see how much of your workout you spent in Zone 2, plus time in each zone.

■ START FROM YOUR WATCH FACE
A complication launches the app in one tap. Tracking and haptic alerts keep running with the screen off.

■ PHONE APP
Set up Zone 2 on the big screen and send it to your watch. Review the Zone 2 score of past workouts and save them to Health Connect.

Supports running, cycling and brisk walking. The watch app also works on its own.

■ PRIVACY
All health data stays on your watch. No accounts, no ads, no analytics, nothing is ever sent off your device.

Cardio Pacer is not a medical device and is not intended to diagnose or treat any condition. Zones are estimates. If you have a heart condition or take medication, consult a doctor before exercising.
```

---

## 앱 콘텐츠 (Play Console → 정책 → 앱 콘텐츠)

| 항목 | 답변 |
|---|---|
| 개인정보처리방침 | 위 URL |
| 광고 | 광고 없음 |
| 앱 액세스 권한 | 모든 기능을 제한 없이 사용 가능 (로그인 없음) |
| 콘텐츠 등급 (IARC 설문) | 카테고리 "기타 앱", 모든 질문 "아니요" → 전체이용가 |
| 타겟층 | 18세 이상 (아동 대상 아님) |
| 뉴스 앱 | 아니요 |
| 정부 앱 / 금융 기능 | 아니요 |
| **건강 앱** | "피트니스 및 운동" 선택. 의료 기능 없음 |
| **Health Connect 권한 신고** | 폰 앱이 `WRITE_EXERCISE` 를 씁니다. 용도: "워치에서 측정한 운동 세션(시간, 종류, Zone 2 달성률)을 Health Connect에 저장". 읽기 권한 없음 |

### 데이터 보안 (Data safety)

- 앱이 필수 사용자 데이터 유형을 수집하거나 공유합니까? → **아니요**

근거: 심박수와 운동 기록은 사용자의 워치·폰 안에서만 처리되고(워치↔폰 직접 연결, Health Connect는 기기 내 저장소) 개발자 서버로 전송되지 않습니다. Google 기준에서 "수집"은 기기 밖(개발자·제3자)으로 전송하는 경우를 말합니다.

### 포그라운드 서비스 권한 (필수)

target API 34 이상이고 `FOREGROUND_SERVICE_HEALTH` 를 쓰므로 신고가 필요합니다.
- 유형: **건강(Health)**
- 설명 (그대로 복사):
  ```
  운동 중 화면이 꺼지거나 앱이 백그라운드에 있어도 Health Services로 심박수를 계속 받아, 사용자가 Zone 2를 벗어나면 즉시 손목 진동으로 알려야 합니다. 사용자가 운동을 시작할 때만 실행되고, 운동을 종료하면 바로 중지됩니다.
  ```
- 동영상 링크: 워치에서 운동 시작 → 화면 끔 → 심박 상승 시 진동 → 종료하는 장면을 짧게 찍어 YouTube(일부 공개)에 올린 링크

### 권한 (참고)

| 권한 | 용도 |
|---|---|
| `health.READ_HEART_RATE` (Wear OS 6+) / `BODY_SENSORS` (Wear OS 5 이하) | 운동 중 심박수 |
| `FOREGROUND_SERVICE_HEALTH` | 화면이 꺼져도 운동 추적 |
| `POST_NOTIFICATIONS` | 운동 중 진행 표시(Ongoing Activity) |
| `VIBRATE` | Zone 2 이탈 진동 |
| `health.WRITE_EXERCISE` (폰) | 운동 기록을 Health Connect에 저장 (선택) |

---

## 출시 순서

1. **개발자 계정**: [Google Play Console](https://play.google.com/console) 가입 (1회 US$25), 본인 인증
2. **업로드 키**: 이미 만들어 드린 `cardiopacer-upload.jks` 를 쓰세요 (분실 주의, 저장소에 올리지 마세요).
   `android/keystore.properties` 를 만들고 (`.gitignore` 처리됨)
   ```
   storeFile=../cardiopacer-upload.jks   # android/ 폴더 기준 경로
   storePassword=비밀번호
   keyAlias=upload
   keyPassword=비밀번호
   ```
3. **서명된 번들 빌드**: `cd android && ./gradlew bundleRelease`
   - 폰: `mobile/build/outputs/bundle/release/mobile-release.aab`
   - 워치: `wear/build/outputs/bundle/release/wear-release.aab`
   - 두 번들의 versionCode 가 겹치면 안 됩니다 (폰 1, 2, … / 워치 1000001, 1000002, …)
4. **앱 만들기** → 위 앱 정보·설명·그래픽·앱 콘텐츠 입력
5. **고급 설정 → 폼 팩터 → Wear OS 추가** 후 Wear OS 스크린샷 업로드.
   폰 번들은 기본(휴대전화) 트랙에, 워치 번들은 **Wear OS 전용 트랙**에 올립니다
6. **비공개 테스트**: 개인 계정이면 테스터 12명이 14일 이상 테스트해야 프로덕션 신청 가능
   (작성 시점 기준 정책. 출시 전 Play Console 안내를 확인하세요)
7. **프로덕션 출시 신청** → Wear OS 품질 검토 포함, 보통 며칠 걸림

### Wear OS 품질 검토에서 자주 걸리는 것

- 원형 화면에서 글자 잘림 → 스크린샷 렌더링으로 확인하고 수정함
- 오른쪽 스와이프로 앱 닫기 동작 유지 → 유지됨 (운동 화면에서 오른쪽 스와이프하면 워치페이스로, 운동은 계속)
- 운동 중 Ongoing Activity 표시 → 구현됨
- 휴대폰 없이 단독 실행 → `com.google.android.wearable.standalone = true`

## 에뮬레이터에서 테스트

Wear OS 에뮬레이터는 Health Services 가짜 운동 데이터를 지원합니다.
```bash
adb shell am broadcast -a "whs.USE_SYNTHETIC_PROVIDERS" com.google.android.wearable.healthservices
adb shell am broadcast -a "whs.synthetic.user.START_RUNNING" com.google.android.wearable.healthservices
# 끝낼 때
adb shell am broadcast -a "whs.USE_SENSOR_PROVIDERS" com.google.android.wearable.healthservices
```
