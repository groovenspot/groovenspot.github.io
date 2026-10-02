# 와인루트 · 와인 직구 최적경로 플랫폼

와인을 고르면 **와이너리 직배송 · 현지 수출 리테일러 · 현지 배송대행지 · 홍콩 경유** 네 경로의 운임과 관세·주세·교육세·부가세를 모두 더한 **한국 도착가**를 계산해 가장 싼 경로를 추천하고, 해당 판매처로 연결하는 비교 플랫폼입니다.

> 플랫폼은 와인을 팔지 않고 비교·연결만 합니다. 결제와 주문은 소비자가 해외 판매처에서 직접 하고, 플랫폼은 제휴 링크 수수료를 받습니다. (기획안 「법규 검토」)

## 기능

기획안 「화면별 기능 명세」의 P0 10개와 P1 4개를 모두 구현했습니다.

| 화면 | 기능 | 우선순위 | 위치 |
| --- | --- | --- | --- |
| 홈 | 와인 검색 (한글 표기 보정: 샤블리 = Chablis) | P0 | `src/app/page.tsx`, `src/lib/search.ts` |
| 홈 | 면세구간·국가·종류·가격 필터 | P0 | `src/app/page.tsx` |
| 홈 | 이번 주 절감 TOP 10 | P1 | `src/app/page.tsx` |
| 와인 상세 | 4개 경로 도착가 비교, 최저 경로 강조, 배송 기간 | P0 | `src/app/wines/[id]/page.tsx`, `src/lib/engine.ts` |
| 와인 상세 | 세금 단계별 내역, 면세구간 표시 | P0 | `src/components/TaxBreakdown.tsx`, `src/lib/tax.ts` |
| 와인 상세 | 국내가 대비 절감액 | P0 | `src/lib/engine.ts` |
| 와인 상세 | 평점·한국어 테이스팅 노트 | P1 | `Wine.rating`, `Wine.notesKo` |
| 구매 연결 | 제휴 링크 이동 + 클릭 로그 | P0 | `src/app/go/[offerId]/route.ts` |
| 구매 연결 | 주문 체크리스트, 통관 가이드 | P0 | 와인 상세, `src/app/guide` |
| 구매 연결 | 주문서 정보 저장·복사, 장바구니 담기·미리 채우기, 주문 진행 추적 | 추가 | `src/app/order`, `src/lib/checkout.ts`, `src/server/orders.ts` |
| 마이페이지 | 가격 알림 (이메일 / 카카오 알림톡) | P0 | `src/jobs/alerts.ts`, `src/server/alimtalk.ts` |
| 마이페이지 | 구매 기록 + 실제 세금 vs 예상 세금 | P1 | `src/app/me` |
| 마이페이지 | 셀러 후기 → 셀러 신뢰 점수 | P1 | `src/app/sellers/[id]` |
| 관리자 | 셀러 등록, 국가별 운임표, 배송대행지, 가격 수집 상태 | P0 | `src/app/admin/sellers`, `src/app/admin/crawl` |
| 관리자 | 세율을 설정값으로 관리, 환율 1시간마다 자동 반영 (investing.com) | P0 | `src/app/admin/settings`, `src/jobs/fx.ts`, `src/lib/investing.ts` |

그 밖에:

- **직접 계산기** (`/calculator`): 목록에 없는 와인도 가격·운임만으로 도착가 계산. 1단계 공개 계산기를 이어받았습니다. (원본 프로토타입: `docs/prototype-calculator.html`)
- **대기자 등록**: 홈 하단. 관리자 화면에서 1,000명 목표 대비 현황을 봅니다.
- **핵심 지표 대시보드** (`/admin`): 월 구매 연결 건수(북극성), 판매처 이동률, 알림 등록자, 대기자, 도착가 오차, 재구매율, 수수료.
- **제휴 전환 포스트백** (`/api/postback`): 제휴 링크에 `{clickId}`를 넘겨 실제 주문을 집계합니다.
- **프리미엄 회원 구분**: 무료 회원 알림 개수 제한(기본 3개), 관리자가 등급 변경. 결제 연동은 아직 없습니다.

## 주문 흐름

와인루트는 결제·주문을 대신하지 않습니다(구매대행 구조 회피). 대신 손님이 판매처에서 결제만 하면 되도록 준비합니다.

1. **주문서 정보 한 번 저장** (`/me#profile`): 영문 이름·주소, 휴대폰, 개인통관고유부호. 통관부호는 AES-256-GCM으로 암호화 저장(`ORDER_DATA_KEY`).
2. **이 경로로 주문하기** (`/order/[offerId]`): 예상 도착가, 주의사항, 판매처 주문서 칸 순서대로 정리한 값과 복사 버튼.
3. **결제 화면 열기** (`/go/[offerId]`): 클릭 기록 → 로그인 손님은 주문 추적 시작 → 판매처 방식에 따라 이동
   - `SHOPIFY_CART`: `/cart/{variant}:{수량}`로 장바구니에 담고 이메일·영문 배송지·전화·주문 메모(통관부호)를 미리 채움. 판매 정보에 variant ID 필요.
   - `CART_TEMPLATE`: 판매처별 URL 템플릿 (`{url} {ref} {qty} {clickId} {email} {note}`)
   - `PRODUCT_PAGE`: 상품 페이지(제휴 링크)
   - 배송대행지 경로는 배대지 주소로 받아야 하므로 한국 주소를 채우지 않습니다.
4. **주문 진행 추적** (`/me#orders`, `/admin/orders`): 판매처로 이동 → 주문 확정 → 발송 → 통관 중 → 도착
   - 판매처 포스트백 `status=confirmed|shipped|delivered|cancelled` (+ `order`, `carrier`, `tracking`)으로 자동 변경, 손님에게 알림톡(`SOLAPI_TEMPLATE_ORDER_STATUS`, 변수 `#{와인} #{상태} #{판매처} #{링크}`) 또는 이메일
   - 상태는 앞으로만 진행 (늦게 온 포스트백이 되돌리지 않음)
   - 포스트백 없는 판매처: 손님이 "결제 완료했어요 / 통관 중 / 받았어요"를 누르거나 관리자가 변경
   - "받았어요"에 실제 세금을 넣으면 구매 기록이 자동으로 생겨 도착가 오차 지표에 반영

## 계산 규칙

`src/lib/tax.ts` · 세율 값은 관리자 화면에서 바꿉니다.

| 조건 | 관세 | 주세 | 교육세 | 부가세 | 합계 (과세가격 대비) |
| --- | --- | --- | --- | --- | --- |
| 1병 · 1L 이하 · 물품가 150달러 이하 | 면제 | 30% | 주세의 10% | 면제 | 33.0% |
| 그 외 + FTA 원산지 국가에서 구매 | 0% | 30% | 주세의 10% | 10% | 46.3% |
| 그 외 + 제3국(홍콩 등)에서 구매 | 15% | (가격+관세)의 30% | 주세의 10% | 10% | 68.2% |

- 과세가격 = 물품가 + 한국까지 국제운임. 세액은 원 미만 절사, 합계 1만원 미만은 징수 면제.
- FTA는 **원산지 국가 판매처에서 산 경우에만** 적용합니다. 홍콩 경유는 항상 제외, 아르헨티나처럼 FTA가 없는 원산지는 모든 경로에 관세가 붙습니다.
- 배송대행지 경로 = 원산지 국가 판매처 가격 + 판매처→배대지 운임 + 배대지→한국 운임. 주류를 받지 않는 배대지(미국·칠레 등)는 이유와 함께 제외됩니다.
- 운임은 셀러별 `기본료 + 병당 요금 × 750ml 환산 병 수`입니다.

## 실행

필요: Node 22, PostgreSQL 16

```bash
cp .env.example .env          # DATABASE_URL, ADMIN_EMAILS 등 수정
npm install
npx prisma migrate deploy
npm run db:seed               # 예시 데이터 (와인 16종, 셀러 22곳, 배송대행지 6곳)
npm run dev                   # http://localhost:3000
```

Docker: `docker compose up --build` 후 `docker compose exec web npm run db:seed`

로그인은 이메일 6자리 코드입니다. `RESEND_API_KEY`가 없으면 코드가 서버 로그에 찍힙니다. `ADMIN_EMAILS`에 넣은 이메일로 로그인하면 `/admin`이 열립니다.

```bash
npm test        # 세금·경로 엔진·환율·크롤러·검색 단위 테스트
npm run lint    # 타입 검사
```

## 정기 작업

| 작업 | 주기 | 내용 | 수동 실행 |
| --- | --- | --- | --- |
| `fx` | 1시간마다 | investing.com 통화쌍 시세(USD/KRW, EUR/KRW …)를 받아 즉시 반영. 못 받은 통화는 수출입은행으로 보충하거나 직전 값 유지 | `npm run job:fx` |
| `alerts` | 매일 | 알림별 최저 도착가 계산 → 목표가 이하이고 지난 알림보다 더 내려갔으면 발송 | `npm run job:alerts` |
| `crawl` | 주 1회 | 수집 방식이 JSON-LD인 셀러의 상품 페이지에서 가격·재고 갱신 | `npm run job:crawl` |

운영에서는 스케줄러가 `GET /api/cron/{fx|alerts|crawl}`을 `Authorization: Bearer $CRON_SECRET`로 호출합니다. `.github/workflows/jobs.yml`이 이 역할을 하며, 저장소 Secrets에 `APP_URL`·`CRON_SECRET`, Variables에 `JOBS_ENABLED=true`를 넣으면 켜집니다. 관리자 화면에서도 바로 실행할 수 있습니다.

## 외부 연동 설정

| 항목 | 환경 변수 | 비고 |
| --- | --- | --- |
| 환율 | (없음) / `KOREAEXIM_API_KEY` | 기본 출처는 investing.com (키 불필요). 관리자 화면에서 수출입은행으로 바꾸거나 보충용으로 쓸 수 있습니다. |
| 이메일 | `RESEND_API_KEY`, `MAIL_FROM` | 없으면 서버 로그로 출력 |
| 카카오 알림톡 | `SOLAPI_*` | 카카오 비즈니스 채널과 알림톡 템플릿 승인이 필요합니다. 템플릿 변수: `#{와인}`, `#{도착가}`, `#{목표가}`, `#{링크}`. 없으면 이메일로 대신 보냅니다. |
| 제휴 전환 | `POSTBACK_SECRET` | 제휴사에 `/api/postback?secret=…&click={sub}&order=…&amount=…&currency=…&commission=…` 등록 |

## 환율 (investing.com)

- 관리자 › 세율·환율에서 출처(investing.com / 수출입은행), 보충 여부, 급변 차단 기준(기본 10%)을 정합니다.
- investing.com은 공식 API가 없어 통화쌍 페이지(`/currencies/usd-krw` 등)의 현재가를 읽습니다. 파서는 세 가지 표기를 순서대로 시도합니다 (`src/lib/investing.ts`).
- 받은 시각과 출처가 와인 상세·계산기 화면에 표시됩니다.
- **주의**: investing.com 이용약관은 자동 수집을 제한하고, 서버에서 보내는 요청은 봇 차단(HTTP 403)될 수 있습니다. 운영 전에 배포 서버에서 `npm run job:fx`로 실제 수신 여부를 확인하고, 상업적 이용 허가나 유료 시세 API 전환을 검토하세요. 수신이 안 되면 수출입은행 보충이 자동으로 동작합니다.
- 실제 세금은 관세청 주간 과세환율로 매겨지므로, 시세 기준 도착가와 약간 차이가 날 수 있습니다.

## 데이터 넣기

- **셀러 등록**: `/admin/sellers` — 경로, 통화, 운임표, 배송 기간, 제휴 링크 템플릿(`{url}?aff=ID&sub={clickId}`), 수집 방식
- **판매 정보**: 와인 편집 화면에서 직접 입력하거나, `/admin/import`에 CSV 붙여넣기
  ```
  wine_id,seller_id,url,price,bottle_ml,in_stock
  ```
- **자동 수집**: 셀러 수집 방식을 JSON-LD로 두면 상품 페이지의 schema.org `Offer`에서 가격·재고를 읽습니다. 사이트 이용약관과 robots.txt를 확인한 셀러에만 켜세요. 요청 간격은 1.5초입니다.

## 출시 전에 할 일

- [ ] 주류·관세 전문 변호사 검토, 국세청 질의 (제휴 수수료 구조가 통신판매 중개로 해석될 여지)
- [ ] 세율·면세 기준을 관세청 예상세액 조회로 재검증
- [ ] 예시 데이터(`prisma/seed.ts`)를 실제 셀러·가격으로 교체: 판매처 이름, 가격, 운임, 국내가는 모두 예시입니다
- [ ] 유럽 수출 리테일러 20곳 제휴 계약, 제휴 링크·포스트백 등록
- [ ] 개인정보 처리방침·이용약관 페이지 (이메일·휴대폰 번호 수집)
- [ ] 자가사용 수량 안내 기준 확정 (현재 6병 이상에서 경고, 관리자 설정값)
- [ ] 프리미엄 회원 결제 연동
- [ ] 제휴 판매처별 결제 화면 방식 확인 (Shopify 장바구니 링크의 미리 채우기 지원 범위는 판매처 설정에 따라 다름), 포스트백에 status 전달 요청
- [ ] 개인정보 처리방침에 영문 주소·통관부호 수집과 판매처 전달 명시, `ORDER_DATA_KEY` 별도 보관
- [ ] investing.com 환율 수신을 배포 서버에서 확인하고, 이용약관 검토 (차단되면 유료 시세 API 검토)

## 구조

```
prisma/schema.prisma     데이터 모델 (와인, 셀러, 판매 정보, 배송대행지, 환율, 알림, 클릭, 전환, 구매 기록, 후기 …)
prisma/seed.ts           예시 데이터
src/lib/                 DB와 무관한 순수 로직 (세금, 경로 엔진, 검색, 환율·크롤러 파서)
src/server/              DB·인증·메일·알림톡
src/jobs/                정기 작업 (환율, 가격 수집, 가격 알림)
src/app/                 Next.js App Router 화면과 API
tests/                   단위 테스트
```
