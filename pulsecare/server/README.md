# 펄스케어 가족 서버

보호자 초대·연결, 하루 요약 공유, 긴급(SOS·낙상) 연락, 보호자 푸시를 맡습니다 (기획서 12번, 17번).
앱과 같은 `:core`를 써서 보호자 알림 문구(`AlertText.forGuardian`)와 연락 순서(`EmergencyEscalation`)가 앱과 똑같습니다.

## 무엇을 저장하나

| 표 | 내용 | 건강 정보 |
|---|---|---|
| users | 이름, 전화번호(선택), 푸시 토큰, 토큰 해시 | 없음 |
| invites | 초대 코드 8자리, 7일 유효, 한 번만 | 없음 |
| links | 착용자 ↔ 보호자, 연락 순서 | 없음 |
| summaries | 날짜별 점수·구간·미션 완료·보호자용 주의 알림 문구 | 점수·주의 알림 (착용자 동의 후) |
| sent | 같은 날 같은 알림을 두 번 보내지 않기 위한 기록 | 없음 |
| emergencies | SOS·낙상, 연락 단계, 확인·취소 | 긴급 여부 |
| events, active_days, signups | 이용 통계 (선택 동의): 무작위 설치 ID, 이벤트 이름·시각·속성 (이벤트 사전 `core/metrics/Events.kt`에 있는 것만) | 없음 (점수·수치 제외) |
| forgotten | 날짜별 통계 삭제 건수 (ID 없음) | 없음 |

수면 시간·심박·HRV 같은 원수치는 서버로 오지 않습니다. "기록 지우기"(앱) 또는 `DELETE /v1/me`로 모든 행이 지워집니다.

## 동작

- **초대**: 보호자가 "부모님 초대"(role=GUARDIAN) 또는 착용자가 "보호자 초대"(role=WEARER)로 코드를 만들고, 받은 사람이 입력합니다. 받기 전에 `GET /v1/invites/{code}`로 누가 어떤 역할로 초대했는지 보여주고, 착용자가 되는 쪽은 공유 내용에 동의합니다. 보호자는 5명까지.
- **하루 요약**: 착용자 폰이 아침·저녁에 올립니다(보호자가 있을 때만). 걸음 수 감소는 보호자에게 바로, 나머지는 저녁 8시(KST) 요약 푸시 한 번.
- **긴급**: SOS는 1순위 보호자에게 바로, 그다음 1분 간격으로 순서대로, 3분 안에 아무도 확인하지 않으면 전원에게 다시. 낙상은 본인에게 60초를 준 뒤 시작. 보호자 한 명이 "확인했어요"를 누르거나 본인이 취소하면 멈추고 서로에게 알립니다. 10분 안에 다시 누른 SOS는 같은 건, 24시간 지나면 자동 종료. 119 자동 신고는 하지 않습니다(보호자 화면에 "119 연결" 버튼).
- **단계 진행**: 요청 때 한 번, 그 뒤로는 `POST /internal/tick`(Cloud Scheduler 1분마다)과 서버 안 15초 루프. 같은 단계가 두 번 나가지 않도록 행을 잠급니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /v1/users | 계정 만들기 `{name}` → `{userId, token}` (이후 `Authorization: Bearer <token>`) |
| GET·PUT·DELETE | /v1/me | 내 이름·전화번호·푸시 토큰, 탈퇴 |
| POST | /v1/me/transfer · /v1/transfer | 새 폰으로 옮기기: 옛 폰이 10자리 코드(10분, 한 번)를 만들고 새 폰이 로그인 없이 `{code}`로 같은 계정의 새 토큰을 받음. 옛 폰 토큰·푸시 토큰은 즉시 무효 |
| POST | /v1/invites | 초대 코드 `{role}` |
| GET | /v1/invites/{code} | 수락 전 미리보기 |
| POST | /v1/invites/accept | 수락 `{code}` |
| GET | /v1/family | 내 보호자들, 내가 챙기는 사람들(오늘 요약, 진행 중·30분 안에 끝난 긴급) |
| DELETE | /v1/family/{userId} | 연결 끊기 |
| PUT | /v1/family/order | 보호자 연락 순서 |
| POST | /v1/summaries | 오늘 요약 |
| POST | /v1/emergencies | 긴급 `{signal: SOS|FALL}` → `{id, guardians}` |
| GET | /v1/emergencies/{id} | 상태 |
| POST | /v1/emergencies/{id}/ack · /cancel | 보호자 확인 · 본인 취소 |
| POST | /v1/events | 이용 통계 묶음 `{installId, appVersion, events:[{name, at, props}]}` (로그인 없음, 사전에 없는 이벤트·속성은 버림) |
| POST | /v1/events/forget | 이 설치의 통계 삭제 |
| GET | /admin · /admin/metrics.json | 운영자 지표 (Basic 인증, `ADMIN_PASSWORD`) · `?day=YYYY-MM-DD` |
| POST | /v1/chat | AI 건강 상담 `{installId, messages:[{role, text}], context?}` → `{reply, crisis, remainingToday}` (하루 30번, 위기·응급 표현은 모델 없이 고정 안내) |
| POST | /internal/tick | 헤더 `X-Tick-Secret` |

## 지표 (기획서 22번)

`/admin`에서 브라우저로 봅니다 (KST 기준, 이용 통계에 동의한 설치만).

| 지표 | 정의 | 목표(가설) |
|---|---|---|
| DAU · WAU · MAU | 그 기간에 활성인 설치 수. 활성 = 앱 열기, 점수 보기(앱·워치·타일), 직접 한 미션 완료, 알림 응답, 가족 화면 보기 (`EventRules.isActive`) | MAU 10만 (2028년 2분기) |
| 북극성: 주간 코칭 실천 | 지난주(월~일) 미션을 3번 이상 완료한 설치 / MAU | 30% |
| 워치 연동률 | 가입 7일 안에 첫 워치 기록 / 가입 (7~36일 전 가입자) | 80% |
| 첫 점수 도달률 | 가입 10일 안에 정식 점수를 봄 / 가입 | 60% |
| 30일 리텐션 | 가입 주 코호트 중 29~35일째 활성 (1·7일째도 표시) | 30% |
| 가족 연결률 | MAU 중 가족 연결이 있는 설치 | 25% |
| 초대로 들어온 신규 | 가입 7일 안에 초대 수락 / 가입 | 50% |
| 미션 완료율 · 알림으로 연 비율 | 최근 7일 | - |
| 알림 오탐 신고율 | 최근 30일 본인이 "잘못된 알림이에요"라고 한 수 / 본인에게 보낸 주의 알림 (신호별 표, 보호자 "연락했어요"·"잘못된 알림" 수 함께) | 10% 이하 |
| 유료 전환 조건 | MAU 10만 이상 또는 월별 30일 리텐션 30% 이상 3개월 연속 | - |

통계 원본은 13개월 뒤 자동 삭제합니다.

## AI 건강 상담

`ANTHROPIC_API_KEY`가 있으면 켜지고, 모델은 `CHAT_MODEL`(기본 `claude-opus-5-5`)입니다. 고정 지침은 캐시(cache_control)하고 오늘 화면 정보만 뒤에 붙입니다.
Opus·Fable·Sonnet 5.5 모델은 거절 시 서버가 다른 모델로 다시 시도합니다(`fallbacks: "default"`).

- 기획서 비용 가정(질문 1건 약 0.7원)은 `CHAT_MODEL=claude-haiku-5-5` 기준입니다. 기본값 Opus 5.5는 답이 더 낫지만 1건당 수십 원이 들 수 있어, 운영 전에 실제 질문으로 비교해 정하세요.
- 자해·자살·응급 증상 표현은 모델에 보내기 전에 서버가 109·1577-0199·119 안내로 답합니다 (`Safety`).
- 대화 내용은 저장하지 않고, 설치 ID별 하루 질문 수만 7일 보관합니다.

## 로컬 실행과 테스트

```
cd ../android
PULSECARE_TEST_DB="jdbc:postgresql://localhost:5432/pulsecare_test?user=postgres" ./gradlew :server:test
./gradlew :server:installDist
DATABASE_URL="jdbc:postgresql://localhost:5432/pulsecare?user=postgres" TICK_SECRET=dev ../server/build/install/server/bin/server
```

`FCM_PROJECT_ID`가 없으면 푸시는 로그로만 남습니다.

## 배포 (서울 리전, 쓴 만큼 내는 구성)

1. **Firebase 프로젝트** 만들기 → Android 앱 추가(패키지 `com.groovenspot.pulsecare`) → 앱 ID·API 키·프로젝트 ID·발신자 ID를 확인합니다.
2. **DB**: Cloud SQL for PostgreSQL(asia-northeast3, 가장 작은 인스턴스) 또는 서울 리전 관리형 Postgres. 빈 DB만 만들면 표는 서버가 시작할 때 만듭니다.
3. **Cloud Run** (asia-northeast3):
   ```
   cd pulsecare/android && ./gradlew :server:installDist
   cd ../server && gcloud run deploy pulsecare-server --source . --region asia-northeast3 \
     --set-env-vars DATABASE_URL=...,DATABASE_USER=...,FCM_PROJECT_ID=<firebase 프로젝트 ID>,TICK_SECRET=<임의 문자열> \
     --set-secrets ADMIN_PASSWORD=pulsecare-admin:latest \
     --allow-unauthenticated --min-instances 0
   ```
   DB 비밀번호는 `--set-secrets DATABASE_PASSWORD=...:latest`로 Secret Manager에서. Cloud Run 서비스 계정에 "Firebase Cloud Messaging API 관리자" 역할을 줍니다.
4. **Cloud Scheduler**: 1분마다 `POST https://<서비스 주소>/internal/tick`, 헤더 `X-Tick-Secret: <위 값>`.
5. **앱 빌드 값** (`~/.gradle/gradle.properties` 또는 CI 비밀값):
   ```
   pulsecare.serverUrl=https://<서비스 주소>
   pulsecare.firebase.appId=...
   pulsecare.firebase.apiKey=...
   pulsecare.firebase.projectId=...
   pulsecare.firebase.senderId=...
   ```

예상 비용(가정, 운영 전): Cloud Run·Scheduler·FCM은 초기 사용량이면 거의 무료 구간이고, 고정비는 DB(가장 작은 Cloud SQL 월 1~2만 원대)입니다.

## 아직 없는 것

- 전화번호·카카오 로그인 (지금은 기기별 토큰 계정. 폰을 바꿀 때는 옮기기 코드, 옛 폰을 잃어버리면 다시 초대)
- 긴급 알림의 위치 (위치 권한·동의 화면과 함께)
- 초대 코드 입력 시도 제한
- AI 챗·결제 이벤트 (기능이 생길 때)
