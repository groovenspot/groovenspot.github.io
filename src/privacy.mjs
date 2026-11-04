// 개인정보처리방침 (ko/en/ja/zh). 사이트가 실제로 다루는 정보만 적는다.
// 내용을 바꾸면 EFFECTIVE 날짜도 같이 바꾼다.
export const EFFECTIVE = '2026-11-04';

export const PRIVACY = {
  ko: {
    t: '개인정보처리방침',
    s: 'Groove & Spot 웹사이트가 어떤 정보를 어떻게 다루는지 안내합니다.',
    link: '개인정보처리방침',
    eff: '시행일',
    lede: 'Groove & Spot(이하 "클럽")은 이 웹사이트(그루브.site)를 이용하는 분의 개인정보를 소중히 다룹니다. 이 사이트는 회원가입이나 결제 기능이 없으며, 아래 기능에 필요한 최소한의 정보만 다룹니다.',
    secs: [
      ['1. 다루는 정보와 목적', `<table class="pp-t"><thead><tr><th>기능</th><th>정보</th><th>목적</th><th>보관</th></tr></thead><tbody>
<tr><td>방문 통계 (Google Analytics 4)</td><td>방문 페이지, 기기·브라우저 종류, 대략적인 지역, 쿠키 식별자, 버튼 클릭 기록</td><td>사이트 이용 현황 파악·개선</td><td>Google 설정에 따라 최대 14개월</td></tr>
<tr><td>신청곡</td><td>곡 제목, 아티스트, 층, 닉네임·메모(선택)</td><td>DJ에게 신청곡 전달</td><td>전달용 서비스(ntfy.sh)에서 12시간 뒤 자동 삭제</td></tr>
<tr><td>가상 클럽 채팅·접속</td><td>닉네임, 캐릭터 모양, 위치, 채팅 내용</td><td>같은 시간 접속한 손님끼리 실시간 표시</td><td>저장하지 않음 (접속 중에만 전달)</td></tr>
<tr><td>예약 문의</td><td>이름, 연락처, 날짜, 인원 등 입력 내용</td><td>인스타그램 DM으로 보낼 문장을 만들어 줌</td><td>사이트에 저장·전송하지 않음. 이용자가 직접 DM으로 보냄</td></tr>
</tbody></table>
<p>연령 확인, 언어 선택, 꾸민 캐릭터, 고른 BGM 같은 설정은 이용자 기기(브라우저 저장소)에만 저장되며 클럽으로 전송되지 않습니다.</p>`],
      ['2. 외부 서비스 (처리 위탁·국외 이전)', `<ul>
<li><b>Google LLC (미국)</b> — Google Analytics 4 방문 통계. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google 개인정보처리방침</a>. <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">차단 부가기능</a>으로 수집을 거부할 수 있습니다.</li>
<li><b>ntfy.sh (독일)</b> — 신청곡을 DJ 화면으로 전달. 12시간 뒤 자동 삭제.</li>
<li><b>EMQX·HiveMQ 공개 중계 서버</b> — 가상 클럽 실시간 접속·채팅 전달. 저장하지 않으며, 공개 서버이므로 채팅에 개인정보를 쓰지 마세요.</li>
<li><b>GitHub Pages (미국)</b> — 웹사이트 호스팅. 접속 시 서버 기록(IP 등)이 남을 수 있습니다.</li>
<li><b>Instagram·YouTube·Google 지도</b> — 사진·영상·지도 표시. 해당 서비스의 정책이 적용됩니다.</li>
</ul>`],
      ['3. 쿠키', '<p>방문 통계를 위해 Google Analytics 쿠키를 씁니다. 브라우저 설정에서 쿠키를 거부하거나 지울 수 있으며, 거부해도 사이트 이용에는 지장이 없습니다.</p>'],
      ['4. 사진첩 사진', '<p>사진첩에는 파티 현장 사진이 올라갑니다. 본인이 나온 사진의 삭제를 원하면 인스타그램 <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> DM으로 사진 위치(앨범 날짜)를 알려 주세요. 확인 후 지체 없이 삭제합니다.</p>'],
      ['5. 이용자의 권리', '<p>이용자는 클럽이 다루는 자신의 정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 아래 연락처로 요청하면 지체 없이 처리합니다. 만 19세 미만은 이 사이트와 클럽을 이용할 수 없습니다.</p>'],
      ['6. 안전성 확보', '<p>사이트는 HTTPS로만 접속되며, 이름·연락처 같은 정보를 서버에 저장하지 않습니다. 관리자 기능은 별도 인증 키가 있어야 쓸 수 있습니다.</p>'],
      ['7. 문의처', '<p>개인정보 관련 문의: Groove &amp; Spot 운영자 · 인스타그램 <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> DM</p><p>개인정보 침해 신고·상담: 개인정보침해신고센터 (국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회 (1833-6972, kopico.go.kr)</p>'],
      ['8. 변경', '<p>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p>'],
    ],
    galleryNote: '본인이 나온 사진의 삭제를 원하면 인스타그램 <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> DM으로 앨범 날짜와 사진을 알려 주세요. 확인 후 바로 지워 드려요.',
  },
  en: {
    t: 'Privacy policy',
    s: 'How the Groove & Spot website handles your information.',
    link: 'Privacy',
    eff: 'Effective',
    lede: 'Groove & Spot ("the club") respects the privacy of everyone using this website. There are no accounts or payments here; we only handle the minimum information the features below need.',
    secs: [
      ['1. What we handle and why', `<table class="pp-t"><thead><tr><th>Feature</th><th>Information</th><th>Purpose</th><th>Retention</th></tr></thead><tbody>
<tr><td>Visit statistics (Google Analytics 4)</td><td>Pages viewed, device and browser type, approximate region, cookie ID, button clicks</td><td>Understand and improve site use</td><td>Up to 14 months under Google settings</td></tr>
<tr><td>Song requests</td><td>Song, artist, floor, optional nickname and note</td><td>Deliver the request to the DJ</td><td>Auto-deleted by the relay (ntfy.sh) after 12 hours</td></tr>
<tr><td>Virtual club presence and chat</td><td>Nickname, avatar look, position, chat text</td><td>Show visitors online at the same time</td><td>Not stored (relayed only while connected)</td></tr>
<tr><td>Reservation enquiry</td><td>Name, phone, date, party size you type</td><td>Builds a message for you to send via Instagram DM</td><td>Not stored or sent by the site; you send the DM yourself</td></tr>
</tbody></table>
<p>Settings such as age check, language, your avatar and chosen music stay in your own browser storage and are never sent to the club.</p>`],
      ['2. Third-party services and overseas transfer', `<ul>
<li><b>Google LLC (USA)</b> — Google Analytics 4. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google privacy policy</a>. Opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">browser add-on</a>.</li>
<li><b>ntfy.sh (Germany)</b> — relays song requests to the DJ screen; deleted after 12 hours.</li>
<li><b>EMQX / HiveMQ public relays</b> — virtual club presence and chat; nothing stored. These are public servers, so never post personal information in chat.</li>
<li><b>GitHub Pages (USA)</b> — hosting; server logs (e.g. IP) may be kept.</li>
<li><b>Instagram, YouTube, Google Maps</b> — embedded photos, videos and maps under their own policies.</li>
</ul>`],
      ['3. Cookies', '<p>We use Google Analytics cookies for statistics. You can block or delete cookies in your browser; the site still works.</p>'],
      ['4. Gallery photos', '<p>The gallery shows photos from our parties. To have a photo of you removed, DM <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> on Instagram with the album date. We remove it promptly.</p>'],
      ['5. Your rights', '<p>You can ask to see, correct, delete or stop the processing of your information via the contact below. People under 19 may not use this site or the club.</p>'],
      ['6. Security', '<p>The site is HTTPS-only and does not store names or phone numbers. Admin features require a separate key.</p>'],
      ['7. Contact', '<p>Groove &amp; Spot · Instagram DM <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a></p><p>Korea privacy reports: KISA Privacy Center (118, privacy.kisa.or.kr)</p>'],
      ['8. Changes', '<p>Any change will be posted on this page with a new effective date.</p>'],
    ],
    galleryNote: 'Want a photo of you removed? DM <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> on Instagram with the album date and we will take it down.',
  },
  ja: {
    t: 'プライバシーポリシー',
    s: 'Groove & Spot ウェブサイトでの情報の取り扱いについて。',
    link: 'プライバシー',
    eff: '施行日',
    lede: 'Groove & Spot（以下「クラブ」）は、本サイトをご利用の方の個人情報を大切に扱います。会員登録や決済はなく、以下の機能に必要な最小限の情報のみを扱います。',
    secs: [
      ['1. 取り扱う情報と目的', `<table class="pp-t"><thead><tr><th>機能</th><th>情報</th><th>目的</th><th>保管</th></tr></thead><tbody>
<tr><td>アクセス解析（Google Analytics 4）</td><td>閲覧ページ、端末・ブラウザ、おおよその地域、Cookie ID、クリック</td><td>利用状況の把握と改善</td><td>Google の設定により最長14か月</td></tr>
<tr><td>リクエスト</td><td>曲名、アーティスト、フロア、ニックネーム・メモ（任意）</td><td>DJ への伝達</td><td>中継サービス（ntfy.sh）で12時間後に自動削除</td></tr>
<tr><td>バーチャルクラブのチャット・接続</td><td>ニックネーム、キャラクター、位置、チャット内容</td><td>同時接続者の表示</td><td>保存しません</td></tr>
<tr><td>予約の問い合わせ</td><td>名前、連絡先、日付、人数など</td><td>Instagram DM 用の文章を作成</td><td>サイトに保存・送信しません</td></tr>
</tbody></table>
<p>年齢確認、言語、キャラクター、BGM などの設定はお使いの端末にのみ保存されます。</p>`],
      ['2. 外部サービス（海外移転を含む）', '<ul><li><b>Google LLC（米国）</b> — Google Analytics 4。<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">無効化アドオン</a>で拒否できます。</li><li><b>ntfy.sh（ドイツ）</b> — リクエストの伝達、12時間後に削除。</li><li><b>EMQX・HiveMQ 公開サーバー</b> — バーチャルクラブの中継。保存しません。チャットに個人情報を書かないでください。</li><li><b>GitHub Pages（米国）</b> — ホスティング。</li><li><b>Instagram・YouTube・Google マップ</b> — 各社のポリシーが適用されます。</li></ul>'],
      ['3. Cookie', '<p>アクセス解析に Google Analytics の Cookie を使います。ブラウザで拒否・削除できます。</p>'],
      ['4. ギャラリー写真', '<p>ご自身が写った写真の削除をご希望の場合は、Instagram <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> へアルバムの日付をDMしてください。</p>'],
      ['5. 利用者の権利', '<p>ご自身の情報の閲覧・訂正・削除・停止を求めることができます。19歳未満の方はご利用いただけません。</p>'],
      ['6. 安全管理', '<p>HTTPS のみで接続し、名前や連絡先はサーバーに保存しません。</p>'],
      ['7. お問い合わせ', '<p>Instagram DM <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a></p>'],
      ['8. 変更', '<p>変更時はこのページで施行日とともにお知らせします。</p>'],
    ],
    galleryNote: 'ご自身が写った写真の削除は、Instagram <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> へアルバムの日付をDMしてください。',
  },
  zh: {
    t: '隐私政策',
    s: 'Groove & Spot 网站如何处理您的信息。',
    link: '隐私政策',
    eff: '生效日期',
    lede: 'Groove & Spot（以下简称"俱乐部"）重视本网站用户的个人信息。本站没有注册或支付功能，只处理以下功能所需的最少信息。',
    secs: [
      ['1. 处理的信息与目的', `<table class="pp-t"><thead><tr><th>功能</th><th>信息</th><th>目的</th><th>保存</th></tr></thead><tbody>
<tr><td>访问统计（Google Analytics 4）</td><td>浏览页面、设备与浏览器、大致地区、Cookie ID、点击</td><td>了解并改进网站使用</td><td>按 Google 设置最长14个月</td></tr>
<tr><td>点歌</td><td>歌名、歌手、楼层、昵称与留言（可选）</td><td>转达给 DJ</td><td>中转服务（ntfy.sh）12小时后自动删除</td></tr>
<tr><td>虚拟俱乐部聊天与在线</td><td>昵称、角色外观、位置、聊天内容</td><td>显示同时在线的访客</td><td>不保存</td></tr>
<tr><td>预订咨询</td><td>姓名、电话、日期、人数等</td><td>生成通过 Instagram 私信发送的文字</td><td>本站不保存也不发送</td></tr>
</tbody></table>
<p>年龄确认、语言、角色、背景音乐等设置只保存在您的浏览器中。</p>`],
      ['2. 第三方服务（含境外传输）', '<ul><li><b>Google LLC（美国）</b> — Google Analytics 4，可用<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">停用插件</a>拒绝。</li><li><b>ntfy.sh（德国）</b> — 点歌转达，12小时后删除。</li><li><b>EMQX、HiveMQ 公共服务器</b> — 虚拟俱乐部实时中转，不保存。请勿在聊天中填写个人信息。</li><li><b>GitHub Pages（美国）</b> — 网站托管。</li><li><b>Instagram、YouTube、Google 地图</b> — 适用各自的政策。</li></ul>'],
      ['3. Cookie', '<p>我们使用 Google Analytics Cookie 进行统计，您可在浏览器中拒绝或删除。</p>'],
      ['4. 相册照片', '<p>如需删除有您本人的照片，请通过 Instagram <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> 私信告知相册日期。</p>'],
      ['5. 用户权利', '<p>您可以要求查阅、更正、删除或停止处理您的信息。未满19岁者不得使用本站及俱乐部。</p>'],
      ['6. 安全', '<p>本站仅支持 HTTPS，不在服务器保存姓名或电话。</p>'],
      ['7. 联系方式', '<p>Instagram 私信 <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a></p>'],
      ['8. 变更', '<p>如有变更，将在本页公布并注明生效日期。</p>'],
    ],
    galleryNote: '如需删除有您本人的照片，请通过 Instagram <a href="https://www.instagram.com/groovenspot/" target="_blank" rel="noopener">@groovenspot</a> 私信告知相册日期。',
  },
};
