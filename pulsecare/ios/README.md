# 펄스케어 아이폰·애플워치

맥 없이 GitHub Actions의 macOS 러너에서 빌드·테스트합니다 (`.github/workflows/pulsecare.yml`의 `ios` 잡).

| 폴더 | 내용 |
|---|---|
| `PulseCore/` | 안드로이드 `core`(Kotlin)를 옮긴 Swift 패키지: 점수, 미션, 알림 신호, 리포트, 하루 계획, 건강 기록 정리, 서버 호출 |
| `PulseCare/` | 아이폰 앱 (SwiftUI, HealthKit) |
| `PulseCareWatch/` | 애플워치 앱 (SwiftUI, WatchConnectivity) |
| `project.yml` | XcodeGen 설정. Xcode 프로젝트 파일은 커밋하지 않고 여기서 만듭니다 |
| `screenshots.sh` | 시뮬레이터에서 데모 기록(`-demo`)으로 화면을 찍습니다 |

## 안드로이드와 같은 결과

`PulseCore`는 안드로이드와 같은 입력이면 같은 점수·이유·알림 문구를 냅니다.
`android/core`의 `ParityFixturesTest`가 정해진 씨앗으로 만든 사례(70일 × 8명 점수, 미션 선택 400건, 미션 확인 150일 등)를
`PulseCore/Tests/PulseCoreTests/Fixtures/`에 적고, Swift 테스트가 같은 입력으로 다시 계산해 비교합니다.
Kotlin 로직을 바꾸면 안드로이드 테스트가 먼저 실패하니, 사례를 다시 만들고 Swift도 맞추세요:

```
cd pulsecare/android && PULSECARE_UPDATE_FIXTURES=1 ./gradlew :core:test --tests '*ParityFixturesTest*'
cd ../ios/PulseCore && swift test        # 리눅스에서도 돌아갑니다
```

## 빌드 (CI가 하는 일)

```
brew install xcodegen
cd pulsecare/ios && xcodegen generate
xcodebuild -project PulseCare.xcodeproj -scheme PulseCare -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
./screenshots.sh build shots
```

화면은 Actions 실행 결과의 `pulsecare-ios-screenshots` 아티팩트에서 볼 수 있습니다.

## 안드로이드와 다른 점

- **건강 기록**: Health Connect 대신 HealthKit에서 읽기만 합니다. HRV는 애플워치가 주는 SDNN이라 RMSSD와 단위가 다르지만,
  점수는 내 기준선과만 비교해 영향이 없습니다. 여러 기기가 같은 밤을 기록하면 수면 단계가 가장 많은 출처 하나만 씁니다.
- **아침 리포트**: iOS는 앱을 정해진 시각에 깨우는 걸 보장하지 않아, 숫자 없는 기본 알림을 7일치 예약해 두고
  앱이 계산할 때(앱 열기, 백그라운드 새로고침, 새 수면 기록 도착)마다 오늘 것을 실제 점수로 바꿉니다.
- **잠금화면**: 알림 종류마다 가림 문구를 둬서 잠금 중에는 "확인할 알림이 있어요"만 보입니다 (iOS 기본 설정 "잠금 해제 시 미리보기").
- **푸시**: Firebase 없이 APNs로 바로 받습니다. 앱은 `apns:<기기 토큰>`을 올리고 서버가 접두어로 나눕니다 (`server/README.md`).
- **실시간 심박 알림·넘어짐**: 애플워치 자체 기능(높은/낮은 심박 알림, 넘어짐 감지, 긴급 SOS)을 켜도록 안내합니다.

## 실기기·TestFlight에 필요한 것 (사람이 할 일)

1. **Apple Developer Program** 가입 (연 $99). 팀 ID를 확인합니다.
2. App Store Connect에서 앱 등록: 번들 ID `com.groovenspot.pulsecare`, 워치 `com.groovenspot.pulsecare.watchkitapp`.
   Capabilities: HealthKit(백그라운드 전달 포함), Push Notifications.
3. **APNs 키(.p8)** 만들기 → 서버 환경변수 `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY`.
4. **App Store Connect API 키** 만들기 → 저장소 비밀값으로 넣으면 CI에서 서명·TestFlight 업로드 잡을 붙일 수 있습니다.
5. 서버 주소: `project.yml`의 `PULSECARE_SERVER_URL`(또는 빌드 인자)로 넣습니다. 비우면 가족·AI 상담 화면이 "준비 중"으로 보입니다.
