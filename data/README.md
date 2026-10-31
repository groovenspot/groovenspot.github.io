# 사이트 데이터 수정 가이드

> 가장 쉬운 방법은 관리자 페이지 **그루브.site/admin/** (groovenspot.github.io/admin/ 도 같은 곳으로 연결) 예요. 신청곡 확인, DJ 타임테이블, 이벤트(플라이어 포함)를 폼으로 고치면 아래 파일에 자동으로 저장됩니다.
> 처음 한 번 GitHub 관리자 키(public_repo 권한)를 넣어야 하고, 키는 그 기기에만 저장됩니다.
> 손님 신청곡은 무료 알림 서비스 ntfy.sh 를 거쳐 전달되고 12시간 뒤 자동으로 지워집니다.

이벤트·타임테이블·아티스트·영상·메뉴는 이 폴더의 JSON 파일에서 읽습니다.
GitHub 웹에서 파일을 열고 연필 아이콘으로 고친 뒤 **Commit changes**를 누르면 1~2분 안에 사이트에 반영됩니다. 빌드는 필요 없습니다.

쉼표·따옴표가 하나라도 틀리면 해당 목록이 비어 보입니다. 저장 전에 https://jsonlint.com 에 붙여넣어 확인하면 안전합니다.

## events.json — 이벤트

```json
[
  {
    "date": "2026-11-07",
    "title": "SATURDAY GUEST NIGHT",
    "floor": "3F",
    "genre": "EDM",
    "open": "22:00",
    "lineup": { "3F": ["ASH", "BIXXB"] },
    "flyer": "/assets/flyers/2026-11-07.webp",
    "desc": { "ko": "게스트 DJ와 함께하는 토요일", "en": "Saturday with guest DJs" },
    "entry": "입장료 20,000원 (1드링크 포함)"
  }
]
```

| 항목 | 필수 | 설명 |
| --- | --- | --- |
| date | 예 | 영업일 날짜 `YYYY-MM-DD`. 새벽 시간도 전날 날짜로 씁니다 |
| title | 예 | 이벤트 이름 |
| floor | | `2F`, `3F`, `2F+3F` 중 하나. 생략하면 `2F+3F` |
| genre, desc, entry | | 문자열, 또는 언어별 `{"ko": "...", "en": "...", "ja": "...", "zh": "..."}` |
| open | | 오픈 시간 `21:30` |
| lineup | | 층별 DJ 이름 목록 |
| flyer | | 플라이어 이미지 경로. 없으면 날짜·제목으로 자동 디자인 |
| id | | 이벤트 주소에 쓰이는 값. 생략하면 날짜+제목으로 자동 생성 |

날짜가 지나면 자동으로 "지난 이벤트"로 옮겨집니다. 지우지 말고 남겨 두면 아카이브가 됩니다.

플라이어는 `assets/flyers/` 폴더에 올립니다(세로 4:5, 1080×1350, WebP 또는 JPG 권장).

## timetable.json — 타임테이블

영업일 날짜별, 층별로 씁니다. 자정 이후 시간은 그대로 `01:20`처럼 쓰면 됩니다(정오 이전 시각은 새벽으로 계산).

```json
{
  "2026-11-07": {
    "2F": [ { "t": "22:00", "n": "GROOVE DJ" }, { "t": "00:00", "n": "ZINO" } ],
    "3F": [ { "t": "23:00", "n": "N" }, { "t": "01:20", "n": "DIA" } ]
  }
}
```

영업 중에는 홈 상단 "지금 플레이 중"과 플로어 페이지에 자동으로 표시됩니다. 같은 날짜의 이벤트 상세에도 붙습니다.

## artists.json — 아티스트

```json
[
  {
    "name": "DJ SORA",
    "role": { "ko": "2F 레지던트", "en": "2F Resident" },
    "bio": "한 줄 소개",
    "photo": "/assets/artists/sora.webp",
    "instagram": "https://www.instagram.com/...",
    "soundcloud": "https://soundcloud.com/..."
  }
]
```

## videos.json — 라이브셋 영상 (유튜브)

`youtube`에는 영상 주소의 `v=` 뒤 11자리 ID를 씁니다. 최신 영상을 맨 위에 둡니다. 홈에는 위에서 3개만 나옵니다.

```json
[
  { "youtube": "dQw4w9WgXcQ", "title": "GROOVE 2F · DJ ZINO LIVE SET" }
]
```

## instagram.json — 인스타그램 게시물

홈 화면에 보여줄 @groovenspot 게시물·릴스 주소를 최대 6개 넣습니다. 인스타그램 앱에서 게시물 → ⋯ → 링크 복사.
인스타그램 공식 임베드로 보이므로 사진 파일을 따로 올릴 필요가 없습니다.

```json
[
  "https://www.instagram.com/p/XXXXXXXXXXX/",
  "https://www.instagram.com/reel/YYYYYYYYYYY/"
]
```

## menu.json — 메뉴·바틀 세트 가격

층(`2F`, `3F`)별 `menu`(분류별 주류)와 `sets`(바틀 세트)가 있습니다. 가격은 숫자만 씁니다(`150000`).

## 문구·페이지 구조 수정

메뉴 이름, 소개 문구, 영업시간 같은 고정 문구는 `src/i18n.mjs`(4개 언어)와 `src/build.mjs`에 있습니다. 고친 뒤 `node src/build.mjs`를 실행해 HTML을 다시 만들어야 합니다.
