// 개인정보처리방침 (ko/en/ja/zh). 사이트가 실제로 다루는 정보만 적는다.
// 내용을 바꾸면 EFFECTIVE 날짜도 같이 바꾼다.
// 2026-11-21: 처리자 = 더스팟앤그루브(매장명 CLUB GROOVE N SPOT) · 킵(맡긴 술)·내 페이지·매장 손님 관리(스태프 서버 groove-staff-api: Cloudflare + 구글 시트 사본·드라이브 백업) · 서버 1년 → 국내 분리 보관 3년 → 파기 · 광고성 정보(혜택 안내·야간) 별도 동의 · 문의 전화
export const EFFECTIVE = '2026-11-21';

const IG = '<a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a>';
const TEL = '<a href="tel:050713015970">0507-1301-5970</a>';
const CF_PP = 'https://www.cloudflare.com/privacypolicy/';
const G_PP = 'https://policies.google.com/privacy';

export const PRIVACY = {
  ko: {
    t: '개인정보처리방침',
    s: '더스팟앤그루브(CLUB GROOVE N SPOT)가 웹사이트와 킵(맡긴 술) 서비스에서 어떤 정보를 어떻게 다루는지 안내합니다.',
    link: '개인정보처리방침',
    eff: '시행일',
    lede: '더스팟앤그루브(매장명 CLUB GROOVE N SPOT, 이하 "클럽")는 이 웹사이트(그루브.site)를 이용하는 분과 매장 손님의 개인정보를 소중히 다룹니다. 이 사이트는 회원가입이나 결제 기능이 없으며, 아래 기능과 매장의 킵(맡긴 술)·손님 관리에 필요한 최소한의 정보만 다룹니다.',
    secs: [
      ['1. 다루는 정보와 목적', `<table class="pp-t"><thead><tr><th>기능</th><th>정보</th><th>목적</th><th>보관</th></tr></thead><tbody>
<tr><td>방문 통계 (Google Analytics 4)</td><td>방문 페이지, 기기·브라우저 종류, 대략적인 지역, 쿠키 식별자, 버튼 클릭 기록</td><td>사이트 이용 현황 파악·개선</td><td>Google 설정에 따라 최대 14개월</td></tr>
<tr><td>신청곡</td><td>곡 제목, 아티스트, 층, 닉네임·메모(선택)</td><td>DJ에게 신청곡 전달</td><td>전달용 서비스(ntfy.sh)에서 12시간 뒤 자동 삭제</td></tr>
<tr><td>가상 클럽 채팅·접속</td><td>닉네임, 캐릭터 모양, 위치, 채팅 내용</td><td>같은 시간 접속한 손님끼리 실시간 표시</td><td>저장하지 않음 (접속 중에만 전달)</td></tr>
<tr><td>예약 신청 (동의한 경우)</td><td>이름, 연락처, 방문 날짜·인원·층·종류, 요청 사항, 예약코드, 연락 채널(인스타그램·WhatsApp), 생일·혜택 수신 여부(선택)</td><td>예약 확인·응대, 재방문 손님 관리, 생일·이벤트 혜택 안내(혜택 수신에 동의한 경우만)</td><td>클럽 구글 계정의 비공개 시트에 저장, 방문일로부터 1년 뒤 자동 삭제</td></tr>
<tr><td>킵 (맡긴 술 보관)</td><td>손님 이름 또는 닉네임, 담당 직원, 연락처(선택), 맡긴 술·병 수(딴 병은 남은 양), 맡긴 날·보관 기한, 맡기기·꺼내기 기록(시각·처리 직원·자리·메모), 맡기기 사진(찍은 경우), 손님용 링크 키 — 매장에서 담당 직원이 입력</td><td>맡긴 술 보관·반환, 보관 기한 안내, 손님이 링크로 자기 킵 확인</td><td>클럽 스태프 서버(Cloudflare)에 보관이 끝난 날(모두 꺼내거나 보관 기한이 지난 날)부터 1년 동안 저장 → 그 뒤 운영자 내부 컴퓨터(국내)에 분리 보관 3년 후 파기</td></tr>
<tr><td>내 페이지 (킵 링크로 여는 손님 페이지)</td><td>본인 확인용 전화번호 뒤 4자리(등록된 연락처와 맞춰 보는 데만 씀), 생일(연·월·일, 선택), 혜택·이벤트 안내 받기(광고성 정보 수신 동의, 선택)와 동의한 날, 밤 9시~아침 8시에도 받기(야간 수신 별도 동의, 선택)와 동의한 날, 수신 동의를 다시 확인한 날, 정보 삭제 요청 기록</td><td>본인 확인, 생일·이벤트 혜택 안내(동의한 경우만, 웹 알림·문자·카카오톡 중 손님이 받는 방법으로), 수신 동의 확인, 삭제 요청 처리</td><td>킵과 같음 (스태프 서버(Cloudflare)에 보관 종료 후 1년 → 국내 분리 보관 3년 후 파기). 생일·혜택 동의는 지우거나 동의를 거두면 분리 보관분까지 바로 삭제</td></tr>
<tr><td>매장 손님 관리 (테이블·손님 기록)</td><td>손님 이름 또는 닉네임, 담당 직원, 방문 날짜·층·자리·인원·성별 구성, 주문한 술, 직원 메모, 생일·기념일(월·일, 손님이 알려 준 경우), 연락한 날 — 매장에서 담당 직원이 입력</td><td>테이블 배정·응대, 재방문 손님 관리, 생일·기념일 챙기기</td><td>클럽 스태프 서버(Cloudflare)에 마지막 방문일부터 1년 동안 저장(맡긴 술이 남아 있으면 킵 기준을 따름) → 그 뒤 운영자 내부 컴퓨터(국내)에 분리 보관 3년 후 파기. 생일·기념일은 삭제를 요청하면 분리 보관분까지 바로 삭제</td></tr>
</tbody></table>
<p>연령 확인, 언어 선택, 꾸민 캐릭터, 고른 BGM 같은 설정은 이용자 기기(브라우저 저장소)에만 저장되며 클럽으로 전송되지 않습니다.</p>`],
      ['2. 외부 서비스 (처리 위탁·국외 이전)', `<ul>
<li><b>Google LLC (미국)</b> — 예약 신청 저장(Google 스프레드시트·Apps Script). 클럽 운영자·담당 MD만 볼 수 있고 방문일 1년 뒤 자동 삭제.</li>
<li><b>Google LLC (미국)</b> — Google Analytics 4 방문 통계. <a href="${G_PP}" target="_blank" rel="noopener">Google 개인정보처리방침</a>. <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">차단 부가기능</a>으로 수집을 거부할 수 있습니다.</li>
<li><b>Cloudflare, Inc. (미국)</b> — 스태프 서버 운영(킵·내 페이지·매장 손님 관리 정보 저장). 이전 항목: 위 표의 킵·내 페이지·매장 손님 관리 정보, 접속 기록(IP 등) · 저장 위치: 동북아시아(한국·일본) 데이터센터로 지정 · 이전 시기·방법: 직원이 입력하거나 손님이 링크를 열 때마다 암호화된 통신(HTTPS)으로 전송 · 보유 기간: 위 표의 스태프 서버 저장 기간(보관 종료 또는 마지막 방문 후 1년)까지. <a href="${CF_PP}" target="_blank" rel="noopener">Cloudflare 개인정보처리방침</a>.</li>
<li><b>Google LLC (미국)</b> — 스태프 서버의 구글 스프레드시트 사본(보기용)과 구글 드라이브 매일 백업. 이전 항목: 바로 위와 같음(사진 파일 제외) · 이전 시기·방법: 정보가 바뀌면 몇 분 안에 시트 사본으로, 매일 아침 백업 파일로 HTTPS 전송 · 보유 기간: 시트 사본은 스태프 서버와 같이 1년(서버에서 뺄 때 함께 지움), 백업 파일은 만든 날부터 30일 뒤 자동 삭제.</li>
<li><b>ntfy.sh (독일)</b> — 신청곡을 DJ 화면으로 전달. 12시간 뒤 자동 삭제.</li>
<li><b>EMQX·HiveMQ 공개 중계 서버</b> — 가상 클럽 실시간 접속·채팅 전달. 저장하지 않으며, 공개 서버이므로 채팅에 개인정보를 쓰지 마세요.</li>
<li><b>GitHub Pages (미국)</b> — 웹사이트 호스팅. 접속 시 서버 기록(IP 등)이 남을 수 있습니다.</li>
<li><b>Instagram·YouTube·Google 지도</b> — 사진·영상·지도 표시. 해당 서비스의 정책이 적용됩니다.</li>
</ul>
<p>스태프 서버 저장 기간이 끝난 뒤 분리 보관하는 정보는 국내(운영자 내부 컴퓨터)에만 두며 국외로 이전하지 않습니다. 킵·내 페이지·매장 손님 관리 정보의 국외 이전(Cloudflare·Google)을 원하지 않으면 담당 직원이나 아래 문의처로 알려 주세요. 이 경우 킵 링크와 내 페이지는 이용할 수 없습니다.</p>`],
      ['3. 쿠키', '<p>방문 통계를 위해 Google Analytics 쿠키를 씁니다. 브라우저 설정에서 쿠키를 거부하거나 지울 수 있으며, 거부해도 사이트 이용에는 지장이 없습니다.</p>'],
      ['4. 사진첩 사진', `<p>사진첩에는 파티 현장 사진이 올라갑니다. 본인이 나온 사진의 삭제를 원하면 인스타그램 ${IG} DM으로 사진 위치(앨범 날짜)를 알려 주세요. 확인 후 지체 없이 삭제합니다.</p>`],
      ['5. 정보 삭제(파기)', '<p>킵·내 페이지·매장 손님 관리 정보는 스태프 서버 저장 기간(보관 종료 또는 마지막 방문 후 1년)이 끝나면 스태프 서버와 구글 시트 사본에서 지우고, 운영자 내부 컴퓨터(국내, 매장 운영용 PC)로 옮겨 다른 정보와 분리해 3년 동안 보관한 뒤 지체 없이 파기합니다. 분리 보관 중인 정보는 운영자만 볼 수 있고 다른 목적으로 쓰지 않습니다. 생일·기념일과 혜택·이벤트 안내 동의는 동의를 거두거나 삭제를 요청하면 분리 보관분까지 바로 지웁니다. 그 밖에 보관 기간이 끝났거나 삭제를 요청한 정보는 지체 없이 지우며, 백업 파일에 남아 있던 정보는 백업 보관 기간(30일)이 지나면 자동으로 지워집니다.</p>'],
      ['6. 이용자의 권리', `<p>이용자는 클럽이 다루는 자신의 정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 아래 연락처로 요청하면 지체 없이 처리합니다. 킵·내 페이지 정보는 내 페이지의 '정보 삭제 요청', 담당 직원, 아래 문의처 어느 쪽으로든 요청할 수 있고, 혜택·이벤트 안내 동의는 아래 7번처럼 언제든 거둘 수 있습니다. 맡긴 술이 남아 있는 동안에는 보관·반환에 필요한 최소한의 정보(이름 또는 닉네임·술·병 수)가 남을 수 있습니다. 만 19세 미만은 이 사이트와 클럽을 이용할 수 없습니다.</p>`],
      ['7. 혜택·이벤트 안내 (광고성 정보) 수신 동의와 거부', '<p>혜택·이벤트 안내는 광고성 정보이므로 수신에 따로 동의한 분(예약 신청서의 혜택 수신 체크, 내 페이지의 \'혜택·이벤트 안내 받기\')에게만 보냅니다. 밤 9시부터 다음 날 아침 8시 사이에는 내 페이지에서 \'밤 9시~아침 8시에도 받기\'에 따로 동의한 분에게만 보냅니다. 보내는 방법은 웹 알림·문자·카카오톡 중 손님이 받는 방법이며, 보낼 때마다 맨 앞에 \'(광고)\'를 표시하고 수신 거부 방법을 함께 안내합니다. 동의한 날을 기록하고, 동의한 날부터 2년마다 수신 동의 여부를 다시 확인합니다. 동의는 내 페이지나 아래 문의처에서 언제든 거둘 수 있으며, 거두면 그때부터 보내지 않습니다.</p>'],
      ['8. 안전성 확보', '<p>사이트는 HTTPS로만 접속됩니다. 예약 신청 정보는 클럽 구글 계정의 비공개 시트에만 저장되며 운영자·담당 MD만 열람합니다. 관리자 기능은 별도 인증 키가 있어야 쓸 수 있습니다. 킵·내 페이지·매장 손님 관리 정보는 승인된 직원이 로그인해야 볼 수 있고, 담당 직원은 자기 손님만, 전체는 대표와 지정된 관리자만 봅니다. 손님용 링크는 추측하기 어려운 긴 키로 만들며, 링크가 다른 사람에게 갔다면 새 링크로 바꿀 수 있습니다(예전 링크는 바로 막힘). 내 페이지는 링크와 전화번호 뒤 4자리가 모두 맞아야 열립니다.</p>'],
      ['9. 문의처', `<p>개인정보 관련 문의: 더스팟앤그루브 (CLUB GROOVE N SPOT) · 전화 ${TEL} · 인스타그램 ${IG} DM</p><p>개인정보 침해 신고·상담: 개인정보침해신고센터 (국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회 (1833-6972, kopico.go.kr)</p>`],
      ['10. 변경', '<p>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p>'],
    ],
    galleryNote: `본인이 나온 사진의 삭제를 원하면 인스타그램 ${IG} DM으로 앨범 날짜와 사진을 알려 주세요. 확인 후 바로 지워 드려요.`,
  },
  en: {
    t: 'Privacy policy',
    s: 'How The Spot and Groove (더스팟앤그루브), operator of CLUB GROOVE N SPOT, handles your information on this website and in the bottle keep service.',
    link: 'Privacy',
    eff: 'Effective',
    lede: 'The Spot and Groove (더스팟앤그루브), which runs CLUB GROOVE N SPOT ("the club"), respects the privacy of everyone using this website and our guests at the club. There are no accounts or payments here; we only handle the minimum information the features below and our bottle keep and guest service need.',
    secs: [
      ['1. What we handle and why', `<table class="pp-t"><thead><tr><th>Feature</th><th>Information</th><th>Purpose</th><th>Retention</th></tr></thead><tbody>
<tr><td>Visit statistics (Google Analytics 4)</td><td>Pages viewed, device and browser type, approximate region, cookie ID, button clicks</td><td>Understand and improve site use</td><td>Up to 14 months under Google settings</td></tr>
<tr><td>Song requests</td><td>Song, artist, floor, optional nickname and note</td><td>Deliver the request to the DJ</td><td>Auto-deleted by the relay (ntfy.sh) after 12 hours</td></tr>
<tr><td>Virtual club presence and chat</td><td>Nickname, avatar look, position, chat text</td><td>Show visitors online at the same time</td><td>Not stored (relayed only while connected)</td></tr>
<tr><td>Booking request (with your consent)</td><td>Name, phone, visit date, party size, floor, type, requests, booking code, contact channel (Instagram / WhatsApp), optional birthday and offer opt-in</td><td>Confirm and manage your booking, recognise returning guests, send birthday and event offers (only if you opted in)</td><td>Kept in the club's private Google Sheet; auto-deleted 1 year after the visit date</td></tr>
<tr><td>Bottle keep</td><td>Your name or nickname, assigned staff member, phone (optional), drinks and bottle count (amount left for opened bottles), date left and keep-until date, history of bottles left and taken out (time, staff, table, notes), photo taken when you leave a bottle (if any), your personal link key — entered by staff at the club</td><td>Store and return your bottles, remind you of the keep period, let you check your keep with your link</td><td>Kept on the club's staff server (Cloudflare) for 1 year after the keep ends (all bottles taken out or keep period over) → then stored separately on the operator's in-house computer (in Korea) for 3 years and destroyed</td></tr>
<tr><td>My page (opened from your keep link)</td><td>Last 4 digits of your phone for identity check (only matched against the number on file), birthday (year-month-day, optional), consent to receive offers and event news (advertising information, optional) and its date, consent to also receive them between 9 pm and 8 am (separate night-time consent, optional) and its date, date your consent was last re-confirmed, deletion requests</td><td>Check it is you, send birthday and event offers (only if you agreed, by web notification, text message or KakaoTalk — whichever you receive them with), re-confirm consent, handle deletion requests</td><td>Same as bottle keep (1 year on the staff server (Cloudflare) after the keep ends → 3 years stored separately in Korea, then destroyed). Birthday and offer consent are deleted at once, including the separately stored copy, if you delete them or withdraw consent</td></tr>
<tr><td>Guest service (tables and guest notes)</td><td>Name or nickname, assigned staff, visit date, floor, table, party size and gender mix, drinks ordered, staff notes, birthday and anniversaries (month-day, if you tell us), last contact date — entered by staff at the club</td><td>Seat and serve you, recognise returning guests, remember birthdays and anniversaries</td><td>Kept on the staff server (Cloudflare) for 1 year after your last visit (bottle keep rules apply while bottles remain) → then stored separately on the operator's in-house computer (in Korea) for 3 years and destroyed. Birthday and anniversaries are deleted at once, including the separately stored copy, if you ask</td></tr>
</tbody></table>
<p>Settings such as age check, language, your avatar and chosen music stay in your own browser storage and are never sent to the club.</p>`],
      ['2. Third-party services and overseas transfer', `<ul>
<li><b>Google LLC (USA)</b> — stores booking requests (Google Sheets / Apps Script). Only the club owner and assigned staff can see them; auto-deleted 1 year after the visit date.</li>
<li><b>Google LLC (USA)</b> — Google Analytics 4. <a href="${G_PP}" target="_blank" rel="noopener">Google privacy policy</a>. Opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">browser add-on</a>.</li>
<li><b>Cloudflare, Inc. (USA)</b> — runs the staff server (stores bottle keep, My page and guest service data). Data transferred: the bottle keep, My page and guest service items above, plus access logs (e.g. IP) · Location: set to Cloudflare's Northeast Asia (Korea / Japan) data centres · When and how: sent over encrypted HTTPS each time staff enter data or you open your link · Kept: for the staff server period in the table above (1 year after the keep ends or your last visit). <a href="${CF_PP}" target="_blank" rel="noopener">Cloudflare privacy policy</a>.</li>
<li><b>Google LLC (USA)</b> — Google Sheets view copy and daily Google Drive backup of the staff server. Data transferred: same as above (no photo files) · When and how: over HTTPS within minutes of a change (sheet copy) and every morning (backup file) · Kept: the sheet copy for the same 1 year as the staff server (removed together with it); backup files are deleted automatically 30 days after they are made.</li>
<li><b>ntfy.sh (Germany)</b> — relays song requests to the DJ screen; deleted after 12 hours.</li>
<li><b>EMQX / HiveMQ public relays</b> — virtual club presence and chat; nothing stored. These are public servers, so never post personal information in chat.</li>
<li><b>GitHub Pages (USA)</b> — hosting; server logs (e.g. IP) may be kept.</li>
<li><b>Instagram, YouTube, Google Maps</b> — embedded photos, videos and maps under their own policies.</li>
</ul>
<p>Data stored separately after the staff server period stays in Korea (on the operator's in-house computer) and is not transferred abroad. If you do not want your bottle keep, My page or guest service data transferred abroad (Cloudflare, Google), tell your staff member or contact us below. In that case the keep link and My page cannot be used.</p>`],
      ['3. Cookies', '<p>We use Google Analytics cookies for statistics. You can block or delete cookies in your browser; the site still works.</p>'],
      ['4. Gallery photos', `<p>The gallery shows photos from our parties. To have a photo of you removed, DM ${IG} on Instagram with the album date. We remove it promptly.</p>`],
      ['5. Deletion', '<p>When the staff server period for bottle keep, My page and guest service data ends (1 year after the keep ends or your last visit), we remove it from the staff server and the Google Sheets copy, move it to the operator\'s in-house computer (in Korea, the club\'s operations PC), keep it there separately from other data for 3 years and then destroy it without delay. Separately stored data can be seen only by the operator and is not used for any other purpose. Birthday, anniversaries and offer consent are deleted at once, including the separately stored copy, when you withdraw consent or ask us to delete them. Other data is deleted without delay when its retention period ends or you ask us to delete it; anything left in backup files is deleted automatically once the 30-day backup period passes.</p>'],
      ['6. Your rights', `<p>You can ask to see, correct, delete or stop the processing of your information via the contact below. For bottle keep and My page data, use 'Request deletion' on My page, ask your staff member or contact us below; you can withdraw offer consent at any time as described in section 7. While bottles remain in your keep, the minimum needed to store and return them (name or nickname, drinks, bottle count) may be kept. People under 19 may not use this site or the club.</p>`],
      ['7. Offers and event news (advertising information)', '<p>Offers and event news are advertising information, so we send them only to people who separately agreed to receive them (the offers box on the booking form, or \'Receive offers and event news\' on My page). Between 9 pm and 8 am we send them only to people who also agreed to \'Also receive between 9 pm and 8 am\' on My page. They are sent by web notification, text message or KakaoTalk — whichever you receive them with — and every message starts with \'(광고)\' (advertisement) and tells you how to opt out. We record the date you agreed and re-confirm your consent every 2 years from that date. You can withdraw consent at any time on My page or via the contact below, and we stop sending from then on.</p>'],
      ['8. Security', '<p>The site is HTTPS-only. Booking requests are stored only in the club\'s private Google Sheet, visible to the owner and assigned staff. Admin features require a separate key. Bottle keep, My page and guest service data can only be seen by approved staff after logging in; each staff member sees only their own guests, and only the owner and designated managers see everything. Your link uses a long, hard-to-guess key; if it reaches someone else we can issue a new link and the old one stops working at once. My page opens only when both the link and the last 4 digits of your phone match.</p>'],
      ['9. Contact', `<p>The Spot and Groove (더스팟앤그루브), CLUB GROOVE N SPOT · Phone ${TEL} · Instagram DM ${IG}</p><p>Korea privacy reports: KISA Privacy Center (118, privacy.kisa.or.kr)</p>`],
      ['10. Changes', '<p>Any change will be posted on this page with a new effective date.</p>'],
    ],
    galleryNote: `Want a photo of you removed? DM ${IG} on Instagram with the album date and we will take it down.`,
  },
  ja: {
    t: 'プライバシーポリシー',
    s: 'The Spot and Groove（더스팟앤그루브、店舗名 CLUB GROOVE N SPOT）のウェブサイトとボトルキープでの情報の取り扱いについて。',
    link: 'プライバシー',
    eff: '施行日',
    lede: 'The Spot and Groove（더스팟앤그루브、店舗名 CLUB GROOVE N SPOT、以下「クラブ」）は、本サイトをご利用の方と店舗のお客様の個人情報を大切に扱います。会員登録や決済はなく、以下の機能と店舗のボトルキープ・お客様管理に必要な最小限の情報のみを扱います。',
    secs: [
      ['1. 取り扱う情報と目的', `<table class="pp-t"><thead><tr><th>機能</th><th>情報</th><th>目的</th><th>保管</th></tr></thead><tbody>
<tr><td>アクセス解析（Google Analytics 4）</td><td>閲覧ページ、端末・ブラウザ、おおよその地域、Cookie ID、クリック</td><td>利用状況の把握と改善</td><td>Google の設定により最長14か月</td></tr>
<tr><td>リクエスト</td><td>曲名、アーティスト、フロア、ニックネーム・メモ（任意）</td><td>DJ への伝達</td><td>中継サービス（ntfy.sh）で12時間後に自動削除</td></tr>
<tr><td>バーチャルクラブのチャット・接続</td><td>ニックネーム、キャラクター、位置、チャット内容</td><td>同時接続者の表示</td><td>保存しません</td></tr>
<tr><td>予約リクエスト（同意した場合）</td><td>名前、連絡先、来店日・人数・フロア・種類、リクエスト、予約コード、連絡手段（Instagram・WhatsApp）、誕生日・特典案内の希望（任意）</td><td>予約の確認・対応、再来店のお客様管理、誕生日・イベント特典の案内（希望した場合のみ）</td><td>クラブの非公開 Google スプレッドシートに保存、来店日から1年後に自動削除</td></tr>
<tr><td>ボトルキープ</td><td>お名前またはニックネーム、担当スタッフ、連絡先（任意）、キープしたお酒・本数（開封済みは残量）、預けた日・保管期限、預け入れ・取り出しの記録（時刻・担当スタッフ・席・メモ）、預け入れ時の写真（撮影した場合）、お客様用リンクのキー — 店内で担当スタッフが入力</td><td>お酒の保管・返却、保管期限のご案内、リンクでご自身のキープを確認</td><td>クラブのスタッフ用サーバー（Cloudflare）に保管終了（すべて取り出し、または期限切れ）から1年間保存 → その後、運営者の社内コンピューター（韓国内）で3年間分離保管し破棄</td></tr>
<tr><td>マイページ（キープのリンクから開くページ）</td><td>本人確認用の電話番号下4桁（登録済みの連絡先との照合のみに使用）、誕生日（年月日・任意）、特典・イベント案内の受信同意（広告性情報・任意）と同意日、夜9時〜朝8時の受信同意（夜間の別途同意・任意）と同意日、受信同意を再確認した日、削除リクエストの記録</td><td>本人確認、誕生日・イベント特典の案内（同意した場合のみ、Web通知・SMS・カカオトークのうちお客様が受け取る方法で）、受信同意の確認、削除リクエストへの対応</td><td>キープと同じ（スタッフ用サーバー（Cloudflare）に保管終了から1年 → 韓国内で3年間分離保管し破棄）。誕生日・特典の同意は、削除または同意撤回の時点で分離保管分も含めて直ちに削除</td></tr>
<tr><td>店舗でのお客様管理（テーブル・お客様記録）</td><td>お名前またはニックネーム、担当スタッフ、来店日・フロア・席・人数・男女構成、注文したお酒、スタッフのメモ、誕生日・記念日（月日、教えていただいた場合）、連絡した日 — 店内で担当スタッフが入力</td><td>テーブル案内・接客、再来店のお客様管理、誕生日・記念日のお祝い</td><td>スタッフ用サーバー（Cloudflare）に最終来店日から1年間保存（キープが残っている場合はキープの基準に従う） → その後、運営者の社内コンピューター（韓国内）で3年間分離保管し破棄。誕生日・記念日はご依頼があれば分離保管分も含めて直ちに削除</td></tr>
</tbody></table>
<p>年齢確認、言語、キャラクター、BGM などの設定はお使いの端末にのみ保存されます。</p>`],
      ['2. 外部サービス（海外移転を含む）', `<ul><li><b>Google LLC（米国）</b> — 予約リクエストの保存（Google スプレッドシート・Apps Script）。運営者と担当スタッフのみ閲覧、来店日1年後に自動削除。</li><li><b>Google LLC（米国）</b> — Google Analytics 4。<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">無効化アドオン</a>で拒否できます。</li><li><b>Cloudflare, Inc.（米国）</b> — スタッフ用サーバーの運営（ボトルキープ・マイページ・お客様管理の情報を保存）。移転する項目：上表のボトルキープ・マイページ・お客様管理の情報、アクセス記録（IP など）・保存場所：北東アジア（韓国・日本）のデータセンターを指定・時期と方法：スタッフの入力時やお客様がリンクを開くたびに暗号化通信（HTTPS）で送信・保有期間：上表のスタッフ用サーバーでの保存期間（保管終了または最終来店から1年）まで。<a href="${CF_PP}" target="_blank" rel="noopener">Cloudflare のプライバシーポリシー</a>。</li><li><b>Google LLC（米国）</b> — スタッフ用サーバーの Google スプレッドシート閲覧用コピーと Google ドライブの毎日のバックアップ。項目：同上（写真ファイルを除く）・時期と方法：変更から数分以内（コピー）と毎朝（バックアップ）に HTTPS で送信・保有期間：コピーはサーバーと同じ1年（サーバーから外す際に一緒に削除）、バックアップは作成から30日後に自動削除。</li><li><b>ntfy.sh（ドイツ）</b> — リクエストの伝達、12時間後に削除。</li><li><b>EMQX・HiveMQ 公開サーバー</b> — バーチャルクラブの中継。保存しません。チャットに個人情報を書かないでください。</li><li><b>GitHub Pages（米国）</b> — ホスティング。</li><li><b>Instagram・YouTube・Google マップ</b> — 各社のポリシーが適用されます。</li></ul>
<p>スタッフ用サーバーでの保存期間の後に分離保管する情報は韓国内（運営者の社内コンピューター）にのみ置き、海外へは移転しません。ボトルキープ・マイページ・お客様管理の情報の海外移転（Cloudflare・Google）を望まない場合は、担当スタッフまたは下記までお知らせください。その場合、キープのリンクとマイページはご利用いただけません。</p>`],
      ['3. Cookie', '<p>アクセス解析に Google Analytics の Cookie を使います。ブラウザで拒否・削除できます。</p>'],
      ['4. ギャラリー写真', `<p>ご自身が写った写真の削除をご希望の場合は、Instagram ${IG} へアルバムの日付をDMしてください。</p>`],
      ['5. 情報の削除（破棄）', '<p>ボトルキープ・マイページ・お客様管理の情報は、スタッフ用サーバーでの保存期間（保管終了または最終来店から1年）が終わるとスタッフ用サーバーと Google スプレッドシートのコピーから削除し、運営者の社内コンピューター（韓国内、店舗運営用PC）に移して他の情報と分離して3年間保管した後、遅滞なく破棄します。分離保管中の情報は運営者のみが閲覧でき、他の目的には使いません。誕生日・記念日と特典・イベント案内の同意は、同意の撤回や削除のご依頼があれば分離保管分も含めて直ちに削除します。その他の情報は保管期間の終了または削除のご依頼により遅滞なく削除し、バックアップファイルに残った情報はバックアップの保管期間（30日）が過ぎると自動で削除されます。</p>'],
      ['6. 利用者の権利', '<p>ご自身の情報の閲覧・訂正・削除・停止を求めることができます。ボトルキープ・マイページの情報は、マイページの「削除リクエスト」、担当スタッフ、または下記の連絡先から求めることができ、特典・イベント案内の同意は7のとおりいつでも取り消せます。キープが残っている間は、保管・返却に必要な最小限の情報（お名前またはニックネーム・お酒・本数）が残る場合があります。19歳未満の方はご利用いただけません。</p>'],
      ['7. 特典・イベント案内（広告性情報）の受信同意と拒否', '<p>特典・イベント案内は広告性情報のため、受信に別途同意した方（予約フォームの特典受信のチェック、マイページの「特典・イベント案内を受け取る」）にのみ送ります。夜9時から翌朝8時までは、マイページで「夜9時〜朝8時も受け取る」に別途同意した方にのみ送ります。送信方法はWeb通知・SMS・カカオトークのうちお客様が受け取る方法で、毎回冒頭に「(광고)」（広告）と表示し、受信拒否の方法をご案内します。同意日を記録し、同意日から2年ごとに受信同意の有無を再確認します。同意はマイページまたは下記の連絡先からいつでも取り消せ、取り消した時点から送信しません。</p>'],
      ['8. 安全管理', '<p>HTTPS のみで接続します。予約リクエストはクラブの非公開 Google スプレッドシートにのみ保存され、運営者と担当スタッフだけが閲覧します。ボトルキープ・マイページ・お客様管理の情報は承認されたスタッフがログインした場合のみ閲覧でき、担当スタッフは自分のお客様のみ、全体は代表と指定の管理者のみが見られます。お客様用リンクは推測しにくい長いキーで作り、他人に渡った場合は新しいリンクに変更できます（古いリンクはすぐ無効）。マイページはリンクと電話番号下4桁の両方が一致した場合のみ開きます。</p>'],
      ['9. お問い合わせ', `<p>The Spot and Groove（더스팟앤그루브）、CLUB GROOVE N SPOT · 電話 ${TEL} · Instagram DM ${IG}</p>`],
      ['10. 変更', '<p>変更時はこのページで施行日とともにお知らせします。</p>'],
    ],
    galleryNote: `ご自身が写った写真の削除は、Instagram ${IG} へアルバムの日付をDMしてください。`,
  },
  zh: {
    t: '隐私政策',
    s: 'The Spot and Groove（더스팟앤그루브，店名 CLUB GROOVE N SPOT）的网站与存酒服务如何处理您的信息。',
    link: '隐私政策',
    eff: '生效日期',
    lede: 'The Spot and Groove（더스팟앤그루브，店名 CLUB GROOVE N SPOT，以下简称"俱乐部"）重视本网站用户及店内顾客的个人信息。本站没有注册或支付功能，只处理以下功能以及店内存酒、顾客管理所需的最少信息。',
    secs: [
      ['1. 处理的信息与目的', `<table class="pp-t"><thead><tr><th>功能</th><th>信息</th><th>目的</th><th>保存</th></tr></thead><tbody>
<tr><td>访问统计（Google Analytics 4）</td><td>浏览页面、设备与浏览器、大致地区、Cookie ID、点击</td><td>了解并改进网站使用</td><td>按 Google 设置最长14个月</td></tr>
<tr><td>点歌</td><td>歌名、歌手、楼层、昵称与留言（可选）</td><td>转达给 DJ</td><td>中转服务（ntfy.sh）12小时后自动删除</td></tr>
<tr><td>虚拟俱乐部聊天与在线</td><td>昵称、角色外观、位置、聊天内容</td><td>显示同时在线的访客</td><td>不保存</td></tr>
<tr><td>预订申请（经您同意）</td><td>姓名、电话、到店日期、人数、楼层、类型、备注、预订编号、联系方式（Instagram、WhatsApp）、生日及是否接收优惠（可选）</td><td>确认与处理预订、管理回头客、发送生日与活动优惠（仅限同意者）</td><td>保存在俱乐部的非公开 Google 表格，到店日期1年后自动删除</td></tr>
<tr><td>存酒（寄存酒）</td><td>姓名或昵称、负责员工、电话（可选）、寄存的酒与瓶数（已开瓶为剩余量）、寄存日期与保管期限、寄存与取酒记录（时间、经办员工、座位、备注）、寄存时拍摄的照片（如有）、顾客专属链接密钥——由负责员工在店内录入</td><td>保管与归还寄存酒、提醒保管期限、让您通过链接查看自己的存酒</td><td>在俱乐部员工服务器（Cloudflare）保存至保管结束（全部取出或期限届满）后1年 → 之后在运营者内部电脑（韩国境内）分开保存3年后销毁</td></tr>
<tr><td>我的页面（通过存酒链接打开）</td><td>用于本人确认的手机号后4位（仅用于与登记的电话核对）、生日（年月日，可选）、接收优惠与活动通知的同意（广告性信息，可选）及同意日期、晚9点至早8点也接收的同意（夜间另行同意，可选）及同意日期、重新确认接收同意的日期、删除请求记录</td><td>本人确认、发送生日与活动优惠（仅限同意者，通过网页通知、短信、KakaoTalk 中您接收的方式）、确认接收同意、处理删除请求</td><td>与存酒相同（在员工服务器（Cloudflare）保存至保管结束后1年 → 在韩国境内分开保存3年后销毁）。生日与优惠同意在您删除或撤回同意时立即删除（含分开保存部分）</td></tr>
<tr><td>店内顾客管理（卡座与顾客记录）</td><td>姓名或昵称、负责员工、到店日期、楼层、座位、人数与性别构成、所点酒水、员工备注、生日与纪念日（月日，您告知时）、联系日期——由负责员工在店内录入</td><td>安排卡座与接待、管理回头客、生日与纪念日问候</td><td>在员工服务器（Cloudflare）保存至最后到店日起1年（仍有存酒时按存酒标准） → 之后在运营者内部电脑（韩国境内）分开保存3年后销毁。生日与纪念日经您要求立即删除（含分开保存部分）</td></tr>
</tbody></table>
<p>年龄确认、语言、角色、背景音乐等设置只保存在您的浏览器中。</p>`],
      ['2. 第三方服务（含境外传输）', `<ul><li><b>Google LLC（美国）</b> — 保存预订申请（Google 表格、Apps Script），仅运营者与负责员工可查看，到店日期1年后自动删除。</li><li><b>Google LLC（美国）</b> — Google Analytics 4，可用<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">停用插件</a>拒绝。</li><li><b>Cloudflare, Inc.（美国）</b> — 运营员工服务器（保存存酒、我的页面、顾客管理信息）。传输项目：上表中的存酒、我的页面、顾客管理信息及访问记录（IP等）·存储位置：指定为东北亚（韩国、日本）数据中心·时间与方式：员工录入或您打开链接时通过加密连接（HTTPS）传输·保存期限：上表所列员工服务器保存期限（保管结束或最后到店后1年）。<a href="${CF_PP}" target="_blank" rel="noopener">Cloudflare 隐私政策</a>。</li><li><b>Google LLC（美国）</b> — 员工服务器的 Google 表格查看副本及 Google 云端硬盘每日备份。项目：同上（不含照片文件）·时间与方式：变更后数分钟内（副本）及每天早上（备份）通过 HTTPS 传输·保存期限：副本与服务器相同为1年（从服务器移出时一并删除），备份文件生成30天后自动删除。</li><li><b>ntfy.sh（德国）</b> — 点歌转达，12小时后删除。</li><li><b>EMQX、HiveMQ 公共服务器</b> — 虚拟俱乐部实时中转，不保存。请勿在聊天中填写个人信息。</li><li><b>GitHub Pages（美国）</b> — 网站托管。</li><li><b>Instagram、YouTube、Google 地图</b> — 适用各自的政策。</li></ul>
<p>员工服务器保存期限结束后分开保存的信息只存放在韩国境内（运营者内部电脑），不会传输至境外。如不希望存酒、我的页面、顾客管理信息传输至境外（Cloudflare、Google），请告知负责员工或通过下方联系方式告知。此时将无法使用存酒链接和我的页面。</p>`],
      ['3. Cookie', '<p>我们使用 Google Analytics Cookie 进行统计，您可在浏览器中拒绝或删除。</p>'],
      ['4. 相册照片', `<p>如需删除有您本人的照片，请通过 Instagram ${IG} 私信告知相册日期。</p>`],
      ['5. 信息删除（销毁）', '<p>存酒、我的页面、顾客管理信息在员工服务器保存期限（保管结束或最后到店后1年）届满后，将从员工服务器和 Google 表格副本中删除，移至运营者内部电脑（韩国境内，店铺运营用电脑），与其他信息分开保存3年后及时销毁。分开保存的信息仅运营者可查看，不用于其他目的。生日、纪念日及优惠与活动通知的同意，在您撤回同意或要求删除时立即删除（含分开保存部分）。其他信息在保存期限届满或经您要求时及时删除，备份文件中的信息会在备份保存期（30天）过后自动删除。</p>'],
      ['6. 用户权利', '<p>您可以要求查阅、更正、删除或停止处理您的信息。存酒与我的页面的信息可通过我的页面的"删除请求"、负责员工或下方联系方式提出，优惠与活动通知的同意可按第7条随时撤回。存酒尚未取完期间，保管与归还所需的最少信息（姓名或昵称、酒、瓶数）可能会保留。未满19岁者不得使用本站及俱乐部。</p>'],
      ['7. 优惠与活动通知（广告性信息）的接收同意与拒绝', '<p>优惠与活动通知属于广告性信息，只发送给另行同意接收的人（预订申请表中勾选接收优惠，或我的页面的"接收优惠与活动通知"）。晚9点至次日早8点之间，只发送给在我的页面另行同意"晚9点至早8点也接收"的人。发送方式为网页通知、短信、KakaoTalk 中您接收的方式，每次开头标注"(광고)"（广告）并告知拒绝接收的方法。我们记录同意日期，并自同意之日起每2年重新确认是否继续接收。您可随时通过我的页面或下方联系方式撤回同意，撤回后即停止发送。</p>'],
      ['8. 安全', '<p>本站仅支持 HTTPS。预订申请只保存在俱乐部的非公开 Google 表格中，仅运营者与负责员工可查看。存酒、我的页面、顾客管理信息仅限经批准的员工登录后查看，负责员工只能看到自己的顾客，全部信息仅代表与指定管理者可见。顾客链接使用难以猜测的长密钥，如被他人获得可更换新链接（旧链接立即失效）。我的页面需链接与手机号后4位同时一致才能打开。</p>'],
      ['9. 联系方式', `<p>The Spot and Groove（더스팟앤그루브），CLUB GROOVE N SPOT · 电话 ${TEL} · Instagram 私信 ${IG}</p>`],
      ['10. 变更', '<p>如有变更，将在本页公布并注明生效日期。</p>'],
    ],
    galleryNote: `如需删除有您本人的照片，请通过 Instagram ${IG} 私信告知相册日期。`,
  },
};
