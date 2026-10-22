# groove-auto — 그루브 운영 자동화 1단계

지금 Claude가 맥미니 크롬을 조작해서 하던 정기 작업 중 **공식 API로 옮길 수 있는 것**을 파이썬 프로그램으로 만든 것.
크롬 로그인이나 Claude 앱 없이 돌고, 맥미니가 잠자기 중이었으면 깨어난 직후 놓친 작업을 한 번 실행한다.

| 명령 | 하는 일 | 기본 시각 |
|---|---|---|
| `gmail-watch` | 메타 앱 심사·유튜브 API 감사 결과 메일. 새 메일 있을 때만 보고 | 매일 09:47 |
| `shorts-apply` | 대기열 숏츠를 규칙대로 15:00 예약 + DJ별 숏츠 재생목록 추가 (dj_pl.py 대체) | 매일 10:30 |
| `comments` | 유튜브 댓글: 긍정은 자동 답글, 불만·문의는 보고만 | 매일 13:47 |
| `yt-daily` | 조회·구독 증감, 최근 7일 상위 영상, 새 숏츠 첫 반응(72시간), 28일 수치 | 매일 16:10 |

숏츠 규칙: 하루 1개, 같은 DJ 연속 금지, 같은 곡 3일 안 금지. 규칙에 맞는 숏츠가 없는 날이 생기면 빈 날을 만들지 않고 멈춘 뒤 보고한다.
모든 작업은 시작할 때 **토큰의 채널명이 그루브 채널인지 확인**하고, 다르면(개인 채널 Suger7719 등) 아무것도 하지 않는다.
DJ 실명 등 `forbidden_words` 나 링크가 들어간 답글은 올리지 않고 보고로 돌린다.

아직 여기 없는 것 (API가 없거나 승인 대기): 인스타 DM·메타 릴스(메타 앱 심사 후 2단계), 구글 리뷰(Business Profile API 승인 후),
숏츠 고정 댓글·관련 동영상 연결·틱톡 댓글(API 없음, 계속 브라우저로).

## 맥미니 설치 (한 번)

```bash
cd ~/Downloads/groove_edit
git clone https://github.com/groovenspot/groovenspot.github.io.git
cd groovenspot.github.io/groove-auto
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp config.example.toml config.toml        # 채널명·DJ 재생목록 ID·금지어 채우기
```

비밀값은 `config.toml` 의 `data_dir` 안에 `secrets.env` 로 둔다 (launchd 가 셸 환경변수를 안 읽어서):

```
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC...
```

구글 인증 — 브라우저가 열리면 **그루브 채널 계정**을 고른다. 기존 `yt_upload/token.json` 은 건드리지 않고 새 토큰을 만든다.
구글 클라우드 콘솔에서 해당 프로젝트에 YouTube Analytics API 와 Gmail API 를 켜 둬야 한다.

```bash
.venv/bin/python -m groove_auto auth youtube
.venv/bin/python -m groove_auto auth gmail
```

먼저 읽기만 해 보고(답글·예약·기록 안 함), 괜찮으면 자동 실행 등록:

```bash
.venv/bin/python -m groove_auto --dry-run comments
.venv/bin/python -m groove_auto --dry-run yt-daily
.venv/bin/python -m groove_auto launchd
for f in ~/Library/LaunchAgents/com.groovenspot.auto.*.plist; do launchctl load -w "$f"; done
```

## 숏츠 대기열

```bash
# 편집이 끝나 비공개로 올라간 숏츠를 대기열에 넣는다
python -m groove_auto shorts add VIDEO_ID --dj ZET --song "곡명"
# 이미 유튜브에 예약돼 있는 숏츠는 규칙 계산을 위해 날짜와 함께 기록만
python -m groove_auto shorts record VIDEO_ID --dj KEYNA --song "곡명" --day 2026-11-20
python -m groove_auto shorts plan    # 배정 미리보기
python -m groove_auto shorts list
```

## 현황 페이지·보고

- 작업이 끝날 때마다 `data_dir/dashboard.html` 이 갱신된다 (마지막 실행·성공 여부, 숏츠 큐, 최근 댓글 처리, 일별 수치).
- 보고는 `config.toml` 의 `[telegram] chat_id` 와 `TELEGRAM_BOT_TOKEN` 이 있으면 텔레그램으로, 없으면 `data_dir/logs/` 에만 남는다.
- 실패한 작업도 보고된다.

## 참고

- 유튜브 API 할당량은 하루 10,000. 댓글 답글 50, 예약 50, 재생목록 추가 50, 결산 수십 단위라 정기 작업은 넉넉하다.
- 애널리틱스 수치는 2~3일 늦게 확정돼서 28일·7일 수치는 3일 전까지로 끊는다. 구독·누적 조회는 당일 값.
- 댓글 분류는 Claude API (`claude-opus-5-5`)를 쓰고, 거절되면 서버가 다른 모델로 자동 재시도한다(`fallbacks: "default"`).

```bash
python3 -m unittest discover -s tests   # 예약 규칙·금지어·DB·현황 페이지 테스트 (외부 의존성 없음)
```
