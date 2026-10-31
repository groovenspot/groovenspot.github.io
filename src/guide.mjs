// 외국인 대상 "부산 서면 클럽 가이드" 페이지 (guide/) — 4개 언어
// 사실관계는 i18n.mjs의 영업시간·입장 규칙과 맞춘다.
const BY = new Date(Date.now() + 9 * 3600e3).getUTCFullYear() - 19; // 연 나이 19세 기준 출생연도

export const GUIDE = {
  ko: {
    t: '부산 서면 클럽 가이드',
    s: '서면 클럽 처음 가는 사람을 위한 안내 — 가는 법, 입장 규칙, 신분증, 층별 음악, 테이블 예약까지.',
    h1: '부산 서면 클럽 가이드',
    lede: '서면에서 클럽이 처음이라면 이것만 읽고 오세요. 그루브앤스팟 기준으로 정리했습니다.',
    quick: [
      ['입장료', '무료 (입장료 없음)'],
      ['영업', '연중무휴 · 일–목 21:30–06:00 · 금·토·공휴일 전날 21:00–07:00'],
      ['위치', '서면역 3번 출구 도보 3분 (부산진구 중앙대로680번가길 52, 2–3층)'],
      ['나이', `만 나이 아닌 연 나이 19세 이상 — ${BY}년생까지 입장`],
      ['신분증', '실물 신분증 필수 · 외국인은 여권 원본'],
      ['음악', '2층 힙합·R&B · 3층 EDM'],
    ],
    secs: [
      ['가는 법', `<p>부산 지하철 1·2호선 <b>서면역 3번 출구</b>로 나와 3분이면 도착합니다.</p>
<ul><li>부산역에서: 지하철 1호선으로 약 15분</li><li>해운대에서: 지하철 2호선으로 약 35분, 택시 약 25분</li><li>김해공항에서: 경전철로 사상역 → 2호선 환승, 약 45분</li></ul>
<p>택시 기사님께는 "서면 그루브앤스팟, 중앙대로680번가길 52"라고 보여 주세요. 지하철은 자정 무렵 끊기니 귀가는 택시(카카오T)를 추천합니다.</p>`],
      ['입장 규칙', `<ul><li>입장료는 없습니다. 술은 바에서 주문하거나 테이블·보틀 세트를 이용하세요.</li><li>연 나이 19세 이상(${BY}년생까지)만 입장할 수 있습니다.</li><li>실물 신분증이 꼭 필요합니다. 사진이나 사본은 안 됩니다. 외국인은 여권 원본을 가져오세요.</li><li>복장은 캐주얼이면 충분합니다. 슬리퍼, 상하의 트레이닝복은 입장이 제한될 수 있습니다.</li></ul>`],
      ['층별 분위기', `<p><b>2층 GROOVE</b> — 힙합·R&B. 혼자 와도 편한 솔로바(H석), 스테이지석, 테이블이 있고 다트도 있습니다.</p>
<p><b>3층 SPOT</b> — 빅룸 EDM. 메인 스테이지를 보는 L석, 포토존, 흡연실이 있습니다.</p>
<p>매일 오후 그날 DJ 타임테이블이 인스타그램 @groovenspot 스토리와 이 사이트 이벤트 페이지에 올라옵니다.</p>`],
      ['술·테이블', `<p>가격은 원화, 부가세 포함입니다. 금·토요일이나 게스트 DJ 파티 날은 테이블 예약을 추천합니다. 예약 페이지, 인스타그램 DM, 전화(0507-1301-5970) 모두 가능합니다.</p>`],
      ['알아두면 좋은 것', `<ul><li>개인 주차장은 없습니다. 지하철이나 택시를 이용하세요.</li><li>흡연은 3층 흡연실에서만 가능합니다.</li><li>불편한 일이 생기면 바로 스태프에게 말해 주세요.</li></ul>`],
    ],
  },
  en: {
    t: 'Busan Nightlife Guide: Seomyeon Clubs',
    s: 'First time clubbing in Busan? How to get to Seomyeon, free entry, ID and passport rules, music by floor, hours and table booking.',
    h1: 'Busan nightlife guide: clubbing in Seomyeon',
    lede: 'Seomyeon is the center of Busan nightlife. Here is everything you need before your first night out, from the team at Groove & Spot.',
    quick: [
      ['Entry', 'Free — no cover charge'],
      ['Hours', 'Every night · Sun–Thu 9:30 PM – 6 AM · Fri, Sat & nights before holidays 9 PM – 7 AM'],
      ['Location', 'Seomyeon Station Exit 3, 3 min walk (52 Jungang-daero 680beon-ga-gil, 2F–3F)'],
      ['Age', `19+ by Korean year-age — anyone born in ${BY} or earlier`],
      ['ID', 'Physical ID required · foreigners: original passport'],
      ['Music', '2F hip-hop & R&B · 3F EDM'],
    ],
    secs: [
      ['Getting there', `<p>Take Busan Metro Line 1 or 2 to <b>Seomyeon Station</b> and leave by <b>Exit 3</b>. The club is a 3-minute walk.</p>
<ul><li>From Busan Station: about 15 min on Line 1</li><li>From Haeundae: about 35 min on Line 2, or about 25 min by taxi</li><li>From Gimhae Airport: light rail to Sasang, then Line 2 — about 45 min</li></ul>
<p>For taxis, show the driver the Korean address: <b>부산 부산진구 중앙대로680번가길 52</b>. The metro stops around midnight, so plan to take a taxi home.</p>`],
      ['Entry rules', `<ul><li>Entry is free. Order drinks at the bar or book a table / bottle set.</li><li>Korea counts age by calendar year: you can enter if you were born in ${BY} or earlier.</li><li>Bring your <b>physical passport</b>. Photos and copies are not accepted.</li><li>Casual dress is fine. Slippers and full training wear may be refused.</li></ul>`],
      ['Two floors, two vibes', `<p><b>2F GROOVE</b> — hip-hop and R&B. A solo bar (H seats) if you come alone, stage seats and tables for groups, plus darts.</p>
<p><b>3F SPOT</b> — big-room EDM with L seats facing the main stage, a photo zone and a smoking room.</p>
<p>Every afternoon the night's DJ timetable goes up on Instagram @groovenspot (stories) and on our events page.</p>`],
      ['Drinks and tables', `<p>Prices are in Korean won (₩) with VAT included. On Fridays, Saturdays and guest DJ nights we recommend booking a table — use the booking page, Instagram DM, or call +82-507-1301-5970.</p>`],
      ['Good to know', `<ul><li>No private parking — take the metro or a taxi.</li><li>Smoking only in the 3F smoking room.</li><li>If anything feels wrong, tell our staff right away.</li></ul>`],
    ],
  },
  ja: {
    t: '釜山ナイトライフガイド：西面のクラブ',
    s: '釜山で初めてのクラブ？西面への行き方、入場無料、パスポート・年齢ルール、フロア別の音楽、営業時間、テーブル予約まで。',
    h1: '釜山ナイトライフガイド：西面でクラブ',
    lede: '西面は釜山の夜遊びの中心地。初めての夜の前に知っておきたいことを、Groove & Spotがまとめました。',
    quick: [
      ['入場料', '無料'],
      ['営業', '年中無休・日〜木 21:30–翌6:00・金土・祝前日 21:00–翌7:00'],
      ['場所', '西面駅3番出口から徒歩3分（中央大路680番街キル52、2〜3階）'],
      ['年齢', `韓国の数え方で19歳以上 — ${BY}年生まれまで入場可`],
      ['身分証', '実物の身分証が必須・外国人はパスポート原本'],
      ['音楽', '2階 ヒップホップ・R&B／3階 EDM'],
    ],
    secs: [
      ['行き方', `<p>釜山地下鉄1号線・2号線の<b>西面駅3番出口</b>から徒歩3分です。</p>
<ul><li>釜山駅から：1号線で約15分</li><li>海雲台から：2号線で約35分、タクシーで約25分</li><li>金海空港から：軽電鉄で沙上へ→2号線乗り換え、約45分</li></ul>
<p>タクシーでは韓国語住所<b>「부산 부산진구 중앙대로680번가길 52」</b>を見せてください。地下鉄は深夜0時ごろ終わるので、帰りはタクシー（Kakao Tアプリ）がおすすめです。</p>`],
      ['入場ルール', `<ul><li>入場料はかかりません。ドリンクはバーで注文、またはテーブル・ボトルセットをご利用ください。</li><li>韓国は年単位で年齢を数えます。${BY}年以前に生まれた方が入場できます。</li><li><b>パスポート原本</b>を必ずお持ちください。写真やコピーは不可です。</li><li>服装はカジュアルでOK。サンダル・上下ジャージは入場をお断りする場合があります。</li></ul>`],
      ['フロアごとの雰囲気', `<p><b>2階 GROOVE</b> — ヒップホップとR&B。一人でも気軽なソロバー（H席）、ステージ席、テーブル席、ダーツもあります。</p>
<p><b>3階 SPOT</b> — ビッグルームEDM。メインステージ前のL席、フォトゾーン、喫煙室があります。</p>
<p>毎日午後、その日のDJタイムテーブルをInstagram @groovenspot（ストーリー）と当サイトのイベントページで公開しています。</p>`],
      ['ドリンク・テーブル', `<p>料金は韓国ウォン（₩）・税込です。金・土曜やゲストDJの日はテーブル予約がおすすめ。予約ページ、InstagramのDM、電話（+82-507-1301-5970）で受け付けています。</p>`],
      ['知っておきたいこと', `<ul><li>専用駐車場はありません。地下鉄かタクシーをご利用ください。</li><li>喫煙は3階の喫煙室のみです。</li><li>困ったことがあれば、すぐにスタッフへお知らせください。</li></ul>`],
    ],
  },
  zh: {
    t: '釜山夜生活指南：西面夜店',
    s: '第一次在釜山去夜店？西面怎么去、免费入场、护照和年龄规定、各楼层音乐、营业时间和订台。',
    h1: '釜山夜生活指南：西面夜店攻略',
    lede: '西面是釜山夜生活的中心。第一次来之前需要知道的事，Groove & Spot 帮你整理好了。',
    quick: [
      ['入场', '免费，无门票'],
      ['营业', '全年无休 · 周日至周四 21:30–次日6:00 · 周五、周六及节假日前夜 21:00–次日7:00'],
      ['位置', '西面站3号出口步行3分钟（中央大路680番街路52号 2–3楼）'],
      ['年龄', `按韩国年份计算满19岁 — ${BY}年及以前出生可入场`],
      ['证件', '必须携带实体证件 · 外国游客请带护照原件'],
      ['音乐', '2楼 嘻哈·R&B · 3楼 EDM'],
    ],
    secs: [
      ['怎么去', `<p>乘坐釜山地铁1号线或2号线到<b>西面站</b>，从<b>3号出口</b>出来步行3分钟。</p>
<ul><li>从釜山站：地铁1号线约15分钟</li><li>从海云台：地铁2号线约35分钟，出租车约25分钟</li><li>从金海机场：轻轨到沙上站换乘2号线，约45分钟</li></ul>
<p>打车时请给司机看韩文地址<b>「부산 부산진구 중앙대로680번가길 52」</b>。地铁大约午夜停运，回程建议打车（Kakao T）。</p>`],
      ['入场规定', `<ul><li>免费入场。酒水可在吧台点，也可以订台或点酒套餐。</li><li>韩国按出生年份计算年龄：${BY}年及以前出生的客人可以入场。</li><li>请务必携带<b>护照原件</b>，照片和复印件无效。</li><li>穿着休闲即可。拖鞋、整套运动服可能被拒绝入场。</li></ul>`],
      ['两层两种氛围', `<p><b>2楼 GROOVE</b> — 嘻哈和R&B。一个人来也舒服的单人吧台（H座）、舞台座位和卡座，还有飞镖。</p>
<p><b>3楼 SPOT</b> — 大场EDM，有正对主舞台的L座、拍照区和吸烟室。</p>
<p>每天下午，当晚的DJ时间表会发布在 Instagram @groovenspot（快拍）和本站活动页面。</p>`],
      ['酒水和订台', `<p>价格以韩元（₩）计，含增值税。周五、周六和客座DJ派对的晚上建议提前订台，可通过预约页面、Instagram私信或电话（+82-507-1301-5970）预约。</p>`],
      ['小贴士', `<ul><li>没有专用停车场，请乘地铁或打车。</li><li>只能在3楼吸烟室吸烟。</li><li>遇到任何不舒服的情况，请马上告诉工作人员。</li></ul>`],
    ],
  },
};

export const GUIDE_LINKS = {
  ko: ['오늘 밤 이벤트·타임테이블', '위치·영업시간·FAQ', '테이블 예약'],
  en: ["Tonight's events & timetable", 'Location, hours & FAQ', 'Book a table'],
  ja: ['今夜のイベント・タイムテーブル', 'アクセス・営業時間・FAQ', 'テーブル予約'],
  zh: ['今晚活动和DJ时间表', '位置、营业时间和常见问题', '预约订台'],
};
