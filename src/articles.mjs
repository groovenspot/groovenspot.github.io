// 검색 유입용 안내 글 (guide/<slug>/) — 4개 언어
// 사실관계는 guide.mjs·i18n.mjs·menu.json·timetable.json 과 맞춘다. 확인 안 된 내용(다른 매장, 추정 혼잡 시간 등)은 쓰지 않는다.
// 링크는 %%events%% 같은 자리표시자로 쓰고, 빌드 때 언어별 주소로 바뀐다:
//   %%events%% %%info%% %%reserve%% %%guide%% %%floors%% %%menu%% %%a:<slug>%%
const BY = new Date(Date.now() + 9 * 3600e3).getUTCFullYear() - 19; // 연 나이 19세 기준 출생연도

export const ART_UI = {
  more: { ko: '더 읽어보기', en: 'More guides', ja: 'もっと読む', zh: '更多攻略' },
  updated: { ko: '업데이트', en: 'Updated', ja: '更新', zh: '更新' },
  related: { ko: ['오늘 밤 라인업', '위치·영업시간·FAQ', '테이블 예약', '서면 클럽 가이드'], en: ["Tonight's lineup", 'Location, hours & FAQ', 'Book a table', 'Seomyeon club guide'], ja: ['今夜のラインナップ', 'アクセス・営業時間・FAQ', 'テーブル予約', '西面クラブガイド'], zh: ['今晚阵容', '位置、营业时间和常见问题', '预约订台', '西面夜店指南'] },
};

export const ARTICLES = [
  {
    slug: 'seomyeon-club-dress-code-id',
    date: '2026-11-09',
    ko: {
      t: '서면 클럽 드레스코드·신분증 총정리 (외국인 여권 포함)',
      s: '부산 서면 클럽 입구에서 막히지 않으려면? 연 나이 19세 기준, 실물 신분증·여권 원본, 드레스코드까지 그루브앤스팟 기준으로 정리했어요.',
      h1: '서면 클럽 드레스코드와 신분증, 입구에서 막히지 않는 법',
      lede: '입장료가 없는 클럽에서도 입구에서 돌아가는 경우는 대부분 두 가지예요. 신분증이 없거나, 옷차림이 드레스코드에 걸리거나. 부산 서면 그루브앤스팟 기준으로 정리했습니다.',
      secs: [
        ['한눈에 보기', `<ul><li>입장료: 무료</li><li>나이: 연 나이 19세 이상 — ${BY}년생까지 입장</li><li>신분증: 실물 신분증 필수, 사진·사본은 안 됨</li><li>외국인: 여권 원본</li><li>제한될 수 있는 옷차림: 과도한 캐주얼, 트레이닝복, 슬리퍼, 스포츠 샌들</li></ul>`],
        ['나이는 생일이 아니라 태어난 해로', `<p>클럽 입장 나이는 연 나이로 따집니다. 올해 기준 <b>${BY}년생</b>이면 생일이 아직 지나지 않았어도 입장할 수 있어요. 반대로 ${BY + 1}년생은 생일이 지났어도 올해는 입장할 수 없습니다.</p>`],
        ['신분증은 실물만', `<p>주민등록증, 운전면허증, 여권 같은 <b>실물 신분증</b>을 꼭 가져오세요. 휴대폰에 저장한 사진이나 복사본은 인정되지 않습니다. 외국인 손님은 <b>여권 원본</b>이 필요해요.</p>
<p>일행 중 한 명이라도 신분증이 없으면 그분은 입장할 수 없으니, 출발 전에 모두 챙겼는지 확인하세요.</p>`],
        ['드레스코드: 이런 옷은 피하세요', `<ul><li>트레이닝복(운동복 세트)</li><li>슬리퍼, 스포츠 샌들</li><li>지나치게 가벼운 차림(과도한 캐주얼)</li></ul>
<p>애매하다면 슬리퍼 대신 신발을, 트레이닝복 대신 평소 외출복을 고르면 됩니다. 2층(힙합)과 3층(EDM) 모두 같은 기준이에요.</p>`],
        ['입구에서 빨리 들어가는 법', `<ul><li>줄을 서기 전에 신분증을 미리 꺼내 두세요.</li><li>금·토요일은 21:00, 일–목요일은 21:30에 문을 엽니다.</li><li>금·토요일이나 게스트 DJ 날은 <a href="%%reserve%%">테이블·게스트리스트 예약</a>을 추천해요.</li><li>오늘 어떤 DJ가 나오는지는 <a href="%%events%%">이벤트 페이지</a>에서 매일 오후 확인할 수 있어요.</li></ul>`],
      ],
    },
    en: {
      t: 'Seomyeon Club Dress Code & ID Rules (Passport Guide)',
      s: 'How to get into a club in Busan without trouble: the 19+ year-age rule, physical ID and original passport, and the dress code at Groove & Spot, Seomyeon.',
      h1: 'Dress code and ID rules for clubs in Seomyeon, Busan',
      lede: 'Even at a club with free entry, people get turned away at the door for two reasons: no valid ID, or clothes that break the dress code. Here is how it works at Groove & Spot in Seomyeon.',
      secs: [
        ['Quick answers', `<ul><li>Cover charge: none — entry is free</li><li>Age: 19+ by Korean year-age — anyone born in ${BY} or earlier</li><li>ID: physical ID only, no photos or copies</li><li>Foreigners: bring your original passport</li><li>May be refused: overly casual wear, tracksuits, slippers, sports sandals</li></ul>`],
        ['Age is counted by birth year', `<p>Korean clubs count age by calendar year, not by your birthday. This year, anyone born in <b>${BY}</b> or earlier can enter — even if their birthday hasn't come yet. If you were born in ${BY + 1}, you can't enter this year.</p>`],
        ['Bring a physical ID — foreigners need a passport', `<p>Foreign guests must show their <b>original passport</b>. Photos on your phone and photocopies are not accepted.</p>
<p>If one person in your group has no valid ID, that person can't come in — so check everyone has their passport before you leave the hotel.</p>`],
        ['What not to wear', `<ul><li>Tracksuits and training wear</li><li>Slippers and sports sandals (flip-flops, slides)</li><li>Overly casual outfits</li></ul>
<p>If you're unsure, wear proper shoes instead of slippers and normal going-out clothes instead of gym wear. The same rule applies on both floors — 2F hip-hop and 3F EDM.</p>`],
        ['Getting in fast', `<ul><li>Have your passport in your hand before you reach the door.</li><li>Doors open at 9 PM on Fridays and Saturdays, 9:30 PM Sunday to Thursday.</li><li>On weekends and guest DJ nights, <a href="%%reserve%%">book a table or guest list</a> in advance.</li><li>Check who is playing tonight on our <a href="%%events%%">events page</a> — it's updated every afternoon.</li></ul>`],
      ],
    },
    ja: {
      t: '西面クラブのドレスコード・身分証まとめ（パスポート）',
      s: '釜山・西面のクラブで入口で止められないために。19歳ルール（年単位）、実物の身分証・パスポート原本、ドレスコードをGroove & Spot基準でまとめました。',
      h1: '西面クラブのドレスコードと身分証：入口で止められないコツ',
      lede: '入場無料のクラブでも、入口で断られる理由はほとんど二つ。身分証がないか、服装がドレスコードに合わないかです。釜山・西面のGroove & Spotの基準でまとめました。',
      secs: [
        ['ひと目でわかるポイント', `<ul><li>入場料：無料</li><li>年齢：韓国の数え方で19歳以上 — ${BY}年生まれまで入場可</li><li>身分証：実物のみ、写真・コピー不可</li><li>外国人：パスポート原本</li><li>お断りする場合がある服装：カジュアルすぎる服、ジャージ、スリッパ、スポーツサンダル</li></ul>`],
        ['年齢は誕生日ではなく生まれ年で数えます', `<p>韓国のクラブは年単位で年齢を数えます。今年は<b>${BY}年</b>以前に生まれた方なら、誕生日前でも入場できます。${BY + 1}年生まれの方は、今年は入場できません。</p>`],
        ['身分証は実物だけ：外国人はパスポート原本', `<p>外国人のお客様は<b>パスポート原本</b>が必要です。スマホの写真やコピーは使えません。</p>
<p>グループの中で一人でも身分証がないと、その方は入場できません。ホテルを出る前に全員がパスポートを持っているか確認しましょう。</p>`],
        ['避けたい服装', `<ul><li>ジャージ・トレーニングウェア</li><li>スリッパ、スポーツサンダル</li><li>カジュアルすぎる服装</li></ul>
<p>迷ったら、スリッパではなく靴を、ジャージではなく普段のお出かけ服を選べば大丈夫。2階（ヒップホップ）も3階（EDM）も同じ基準です。</p>`],
        ['スムーズに入るコツ', `<ul><li>列に並ぶ前にパスポートを手元に出しておきましょう。</li><li>金・土曜は21:00、日〜木曜は21:30にオープンします。</li><li>週末やゲストDJの日は<a href="%%reserve%%">テーブル・ゲストリストの予約</a>がおすすめです。</li><li>今夜のDJは毎日午後に<a href="%%events%%">イベントページ</a>で確認できます。</li></ul>`],
      ],
    },
    zh: {
      t: '西面夜店着装要求与证件规定（护照攻略）',
      s: '在釜山西面去夜店怎样不被拦在门口？按年份计算19岁、实体证件和护照原件、着装要求，以Groove & Spot为准整理。',
      h1: '西面夜店着装要求和证件：怎样顺利入场',
      lede: '就算是免费入场的夜店，在门口被拒绝通常只有两个原因：没带证件，或者穿着不符合着装要求。以下以釜山西面Groove & Spot为准整理。',
      secs: [
        ['重点一览', `<ul><li>门票：免费</li><li>年龄：按韩国年份计算19岁以上 — ${BY}年及以前出生可入场</li><li>证件：只认实体证件，照片和复印件无效</li><li>外国游客：护照原件</li><li>可能被拒绝的穿着：过于随意、运动服、拖鞋、运动凉鞋</li></ul>`],
        ['年龄按出生年份计算', `<p>韩国夜店按出生年份计算年龄，而不是按生日。今年<b>${BY}年</b>及以前出生的客人，即使还没过生日也可以入场；${BY + 1}年出生的客人今年不能入场。</p>`],
        ['只认实体证件：外国游客请带护照原件', `<p>外国游客需要出示<b>护照原件</b>，手机里的照片和复印件都不行。</p>
<p>一行人中只要有一位没带证件，那位就不能入场。出门前请确认每个人都带了护照。</p>`],
        ['这些穿着要避免', `<ul><li>运动服、运动套装</li><li>拖鞋、运动凉鞋</li><li>过于随意的穿着</li></ul>
<p>拿不准的话，穿正常的鞋子代替拖鞋，穿平时出门的衣服代替运动服就可以。2楼（嘻哈）和3楼（EDM）标准相同。</p>`],
        ['快速入场小贴士', `<ul><li>排队前先把护照拿在手上。</li><li>周五、周六21:00开门，周日至周四21:30开门。</li><li>周末和客座DJ之夜建议提前<a href="%%reserve%%">预约卡座或宾客名单</a>。</li><li>今晚的DJ阵容每天下午更新在<a href="%%events%%">活动页面</a>。</li></ul>`],
      ],
    },
  },
  {
    slug: 'busan-club-foreigners-faq',
    date: '2026-11-09',
    ko: {
      t: '외국인 친구와 부산 클럽 가기 FAQ — 여권·나이·결제·혼자 가기',
      s: '외국인도 부산 클럽에 들어갈 수 있을까? 여권, 연 나이 19세, 입장료, 카드 결제, 혼자 가기, DJ 시작 시간, 귀가 방법까지 서면 그루브앤스팟 기준 FAQ.',
      h1: '외국인과 부산 서면 클럽 가기: 자주 묻는 질문 10가지',
      lede: '외국인 친구를 데려오거나 여행 중에 처음 클럽에 가는 분들이 가장 많이 묻는 질문을 모았습니다. 부산 서면 그루브앤스팟 기준이에요.',
      secs: [
        ['1. 외국인도 들어갈 수 있나요?', `<p>네. 외국인 손님도 환영합니다. <b>여권 원본</b>만 꼭 챙겨 오세요. 사진이나 사본은 안 됩니다.</p>`],
        ['2. 몇 살부터 들어갈 수 있나요?', `<p>연 나이 19세 이상입니다. 올해는 ${BY}년생까지 입장할 수 있어요. 자세한 기준은 <a href="%%a:seomyeon-club-dress-code-id%%">드레스코드·신분증 정리</a>를 보세요.</p>`],
        ['3. 입장료가 있나요?', `<p>없습니다. 입장은 무료이고, 술은 바에서 주문하거나 테이블·바틀 세트를 이용하면 됩니다. 가격은 <a href="%%menu%%">메뉴 페이지</a>에 있어요.</p>`],
        ['4. 카드로 결제할 수 있나요?', `<p>네. 신용카드·체크카드와 NFC 모바일 결제를 받습니다. 가격은 원화, 부가세 포함입니다.</p>`],
        ['5. 어떤 음악이 나오나요?', `<p>한 건물 두 층이에요. <b>2층 GROOVE</b>는 힙합·R&B, <b>3층 SPOT</b>은 EDM입니다. 두 층은 건물 안 계단으로 이어져 있어요. <a href="%%floors%%">플로어 안내</a></p>`],
        ['6. 몇 시에 가면 되나요?', `<p>일–목 21:30, 금·토와 공휴일 전날은 21:00에 문을 엽니다. 2층 DJ는 보통 21:00–22:00, 3층 DJ는 23:00부터 시작해 새벽 4–7시까지 이어집니다. 그날 타임테이블은 매일 오후 <a href="%%events%%">이벤트 페이지</a>와 인스타그램 @groovenspot 스토리에 올라와요.</p>`],
        ['7. 혼자 가도 되나요?', `<p>네. 2층에는 혼자 와도 편한 혼술바 H석이 있습니다.</p>`],
        ['8. 예약해야 하나요?', `<p>예약 없이 가도 됩니다. 다만 금·토요일이나 게스트 DJ 날은 게스트리스트나 테이블 예약을 추천해요. <a href="%%reserve%%">예약 페이지</a>, WhatsApp, 인스타그램 DM, 전화(0507-1301-5970) 모두 가능합니다.</p>`],
        ['9. 담배는 어디서 피우나요?', `<p>3층 흡연실에서만 가능합니다.</p>`],
        ['10. 끝나고 어떻게 가나요?', `<p>부산 지하철은 자정 무렵 끊기니 택시(카카오T)를 추천합니다. 클럽은 서면역 3번 출구에서 도보 3분, 주소는 부산 부산진구 중앙대로680번가길 52입니다. 전용 주차장은 없어요.</p>`],
      ],
    },
    en: {
      t: 'Clubbing in Busan as a Foreigner: 10 Questions Answered',
      s: 'Can foreigners go clubbing in Busan? Passport rules, age, free entry, card payment, going solo, what time DJs start and how to get home from Seomyeon.',
      h1: 'Clubbing in Busan as a foreigner: 10 questions answered',
      lede: 'Visiting Busan and want a night out in Seomyeon? These are the questions travelers ask us most, answered by the team at Groove & Spot.',
      secs: [
        ['1. Can foreigners get in?', `<p>Yes — foreign guests are welcome. Just bring your <b>original passport</b>. Photos and photocopies are not accepted.</p>`],
        ['2. How old do I need to be?', `<p>19+ by Korean year-age: this year, anyone born in ${BY} or earlier can enter. More detail in our <a href="%%a:seomyeon-club-dress-code-id%%">dress code & ID guide</a>.</p>`],
        ['3. Is there a cover charge?', `<p>No. Entry is free. Order drinks at the bar or book a table / bottle set — prices are on our <a href="%%menu%%">menu page</a>.</p>`],
        ['4. Can I pay by card?', `<p>Yes. Credit and debit cards and contactless (NFC) mobile payments are accepted. Prices are in Korean won with VAT included.</p>`],
        ['5. What music do you play?', `<p>Two floors in one building, connected by stairs inside: <b>2F GROOVE</b> plays hip-hop and R&B, <b>3F SPOT</b> plays EDM. <a href="%%floors%%">See the floors</a>.</p>`],
        ['6. What time should I go?', `<p>Doors open at 9:30 PM Sunday to Thursday and 9 PM on Fridays, Saturdays and nights before holidays. DJs usually start around 9–10 PM on 2F and at 11 PM on 3F, and play until 4–7 AM. Tonight's timetable goes up every afternoon on our <a href="%%events%%">events page</a> and Instagram stories (@groovenspot).</p>`],
        ['7. Can I go alone?', `<p>Yes. 2F has a solo bar (H seats) made for people who come on their own.</p>`],
        ['8. Do I need a reservation?', `<p>Walk-ins are fine. On Fridays, Saturdays and guest DJ nights we recommend a guest list or table booking — via our <a href="%%reserve%%">booking page</a>, WhatsApp, Instagram DM or phone (+82-507-1301-5970).</p>`],
        ['9. Where can I smoke?', `<p>Only in the 3F smoking room.</p>`],
        ['10. How do I get home?', `<p>The Busan metro stops running around midnight, so plan on a taxi (the Kakao T app works well). The club is a 3-minute walk from Seomyeon Station Exit 3 — show drivers the Korean address <b>부산 부산진구 중앙대로680번가길 52</b>. There is no private parking.</p>`],
      ],
    },
    ja: {
      t: '外国人の釜山クラブ入門：よくある質問10',
      s: '外国人も釜山のクラブに入れる？パスポート、年齢、入場料、カード払い、一人で行けるか、DJの開始時間、西面からの帰り方まで。',
      h1: '外国人のための釜山・西面クラブ よくある質問10',
      lede: '釜山旅行中に西面で夜遊びしたい方から、よくいただく質問をGroove & Spotのスタッフがまとめました。',
      secs: [
        ['1. 外国人も入れますか？', `<p>はい、外国人のお客様も歓迎です。<b>パスポート原本</b>を必ずお持ちください。写真やコピーは使えません。</p>`],
        ['2. 何歳から入れますか？', `<p>韓国の数え方で19歳以上です。今年は${BY}年以前に生まれた方が入場できます。詳しくは<a href="%%a:seomyeon-club-dress-code-id%%">ドレスコード・身分証まとめ</a>をご覧ください。</p>`],
        ['3. 入場料はかかりますか？', `<p>かかりません。入場は無料で、ドリンクはバーで注文するか、テーブル・ボトルセットをご利用ください。料金は<a href="%%menu%%">メニューページ</a>にあります。</p>`],
        ['4. カードで払えますか？', `<p>はい。クレジットカード・デビットカード、NFCのモバイル決済が使えます。料金は韓国ウォン・税込です。</p>`],
        ['5. どんな音楽がかかりますか？', `<p>一つのビルに二つのフロアがあり、館内の階段でつながっています。<b>2階GROOVE</b>はヒップホップ・R&B、<b>3階SPOT</b>はEDMです。<a href="%%floors%%">フロア案内</a></p>`],
        ['6. 何時に行けばいいですか？', `<p>日〜木曜は21:30、金・土曜と祝前日は21:00オープン。DJは2階が21〜22時ごろ、3階が23時から始まり、明け方4〜7時まで続きます。その日のタイムテーブルは毎日午後に<a href="%%events%%">イベントページ</a>とInstagram（@groovenspot）のストーリーで公開します。</p>`],
        ['7. 一人でも大丈夫？', `<p>はい。2階には一人でも気軽なソロバー（H席）があります。</p>`],
        ['8. 予約は必要？', `<p>予約なしでも入れます。金・土曜やゲストDJの日はゲストリストやテーブル予約がおすすめです。<a href="%%reserve%%">予約ページ</a>、WhatsApp、InstagramのDM、電話（+82-507-1301-5970）で受け付けています。</p>`],
        ['9. タバコはどこで吸えますか？', `<p>3階の喫煙室のみです。</p>`],
        ['10. 帰りはどうすれば？', `<p>釜山の地下鉄は深夜0時ごろ終わるので、タクシー（Kakao Tアプリ）がおすすめです。クラブは西面駅3番出口から徒歩3分。運転手には韓国語住所<b>「부산 부산진구 중앙대로680번가길 52」</b>を見せてください。専用駐車場はありません。</p>`],
      ],
    },
    zh: {
      t: '外国游客釜山夜店攻略：10个常见问题',
      s: '外国人能去釜山夜店吗？护照、年龄、门票、刷卡、一个人去、DJ几点开始、从西面怎么回酒店，一次说清楚。',
      h1: '外国游客去釜山西面夜店：10个常见问题',
      lede: '来釜山旅行想在西面玩一晚？我们把游客最常问的问题整理在这里，由Groove & Spot团队解答。',
      secs: [
        ['1. 外国人可以进吗？', `<p>可以，欢迎外国游客。请务必携带<b>护照原件</b>，照片和复印件都不行。</p>`],
        ['2. 几岁可以入场？', `<p>按韩国年份计算19岁以上：今年${BY}年及以前出生的客人可以入场。详细规定请看<a href="%%a:seomyeon-club-dress-code-id%%">着装与证件攻略</a>。</p>`],
        ['3. 要门票吗？', `<p>不要，免费入场。酒水在吧台点，或者预订卡座、酒套餐。价格见<a href="%%menu%%">酒水单页面</a>。</p>`],
        ['4. 可以刷卡吗？', `<p>可以。接受信用卡、借记卡和NFC手机支付。价格以韩元计，含增值税。</p>`],
        ['5. 放什么音乐？', `<p>一栋楼两层，楼内楼梯相通：<b>2楼GROOVE</b>是嘻哈和R&B，<b>3楼SPOT</b>是EDM。<a href="%%floors%%">楼层介绍</a></p>`],
        ['6. 几点去比较好？', `<p>周日至周四21:30开门，周五、周六及节假日前夜21:00开门。2楼DJ一般21–22点开始，3楼DJ 23点开始，一直到凌晨4–7点。当晚的DJ时间表每天下午发布在<a href="%%events%%">活动页面</a>和Instagram（@groovenspot）快拍。</p>`],
        ['7. 一个人可以去吗？', `<p>可以。2楼有一个人来也很自在的单人吧台（H座）。</p>`],
        ['8. 需要预约吗？', `<p>不预约也可以直接来。周五、周六和客座DJ之夜建议预约宾客名单或卡座，可通过<a href="%%reserve%%">预约页面</a>、WhatsApp、Instagram私信或电话（+82-507-1301-5970）。</p>`],
        ['9. 哪里可以抽烟？', `<p>只能在3楼吸烟室。</p>`],
        ['10. 结束后怎么回去？', `<p>釜山地铁大约午夜停运，建议打车（Kakao T）。夜店在西面站3号出口步行3分钟，给司机看韩文地址<b>「부산 부산진구 중앙대로680번가길 52」</b>即可。没有专用停车场。</p>`],
      ],
    },
  },
  {
    slug: 'busan-club-hiphop-vs-edm-floor',
    date: '2026-11-10',
    ko: {
      t: '서면 클럽 2층 힙합 vs 3층 EDM — 나한테 맞는 층 고르기',
      s: '그루브앤스팟은 한 건물 두 층. 2층 GROOVE(힙합·R&B, 혼술바 H1–H32, 다트)와 3층 SPOT(EDM, L석, 포토존, 흡연실)의 차이와 층별 가격 차이를 정리했어요.',
      h1: '2층 힙합 vs 3층 EDM, 어느 층이 나에게 맞을까',
      lede: '서면 그루브앤스팟은 입장 한 번으로 두 층을 만날 수 있는 클럽이에요. 2층과 3층은 음악도, 자리도, 가격도 다릅니다. 오늘 밤 어디서 놀지 고르는 데 필요한 것만 모았어요.',
      secs: [
        ['한눈에 비교', `<ul><li><b>2층 GROOVE</b>: 힙합·R&B · 혼술바 H석(H1–H32) · 스테이지석 · 테이블 · 다트</li><li><b>3층 SPOT</b>: EDM · 대형 사운드 시스템 · 메인 스테이지 앞 L석 · 포토존 · 흡연실</li><li>입장료: 두 층 모두 무료</li><li>두 층은 건물 안 계단으로 이어져 있어요.</li></ul>`],
        ['2층 GROOVE가 맞는 사람', `<ul><li>힙합·R&B를 좋아한다</li><li>혼자 왔다 — 혼술바 H석이 32석 있어요</li><li>무대 앞 스테이지석이나 일행과 테이블에 앉고 싶다</li><li>음악 사이사이 다트도 즐기고 싶다</li></ul>`],
        ['3층 SPOT이 맞는 사람', `<ul><li>EDM과 큰 사운드를 좋아한다</li><li>메인 스테이지를 바로 앞에서 보고 싶다(L석)</li><li>포토존에서 사진을 남기고 싶다</li><li>흡연자다 — 흡연은 3층 흡연실에서만 가능해요</li></ul>`],
        ['DJ는 언제 시작하나요', `<p>문은 일–목 21:30, 금·토·공휴일 전날 21:00에 엽니다. 2층 DJ는 보통 21:00–22:00, 3층 DJ는 23:00부터 시작해 새벽 4–7시까지 이어져요. 그날 층별 타임테이블은 매일 오후 <a href="%%events%%">이벤트 페이지</a>와 <a href="%%floors%%">플로어 안내</a>에서 볼 수 있어요.</p>`],
        ['층마다 가격이 달라요', `<p>같은 술이라도 층마다 가격이 다릅니다. 예를 들어(원, 부가세 포함):</p><ul><li>예거마이스터: 2층 140,000 · 3층 200,000</li><li>잭다니엘스: 2층 170,000 · 3층 200,000</li><li>모엣 샹동: 2층 200,000 · 3층 250,000</li></ul><p>전체 가격은 <a href="%%menu%%">메뉴 페이지</a>, 세트 구성은 <a href="%%a:busan-club-table-bottle-price%%">테이블·바틀 세트 가격 가이드</a>를 보세요.</p>`],
        ['입장 규칙은 두 층 같아요', `<ul><li>연 나이 19세 이상 — ${BY}년생까지</li><li>실물 신분증 필수, 외국인은 여권 원본</li><li>트레이닝복·슬리퍼·과도한 캐주얼은 제한될 수 있어요</li></ul><p>자세한 내용은 <a href="%%a:seomyeon-club-dress-code-id%%">드레스코드·신분증 정리</a>에 있어요.</p>`],
        ['자리 맡고 싶다면', `<p>금·토요일이나 게스트 DJ 날은 <a href="%%reserve%%">예약 페이지</a>에서 층과 자리(테이블·혼술 H존 등)를 골라 남겨 주세요. 전화 0507-1301-5970도 가능합니다.</p>`],
      ],
    },
    en: {
      t: 'Busan Club Guide: Hip-Hop (2F) or EDM (3F)? Pick Your Floor',
      s: 'Groove & Spot in Seomyeon has two floors: 2F GROOVE for hip-hop & R&B with a 32-seat solo bar and darts, 3F SPOT for big-room EDM with stage seats and a photo zone. Here is how they differ.',
      h1: 'Hip-hop or EDM? Choosing your floor at a Seomyeon club',
      lede: 'One free entry, two very different nights. At Groove & Spot in Seomyeon, Busan, the 2nd and 3rd floors have different music, seats and prices. Here is what you need to pick the right one.',
      secs: [
        ['The short version', `<ul><li><b>2F GROOVE</b>: hip-hop & R&B · solo bar (seats H1–H32) · stage seats · tables · darts</li><li><b>3F SPOT</b>: EDM on a big-room sound system · L seats facing the main stage · photo zone · smoking room</li><li>Entry: free for both floors</li><li>The floors are connected by stairs inside the building.</li></ul>`],
        ['Go to 2F GROOVE if…', `<ul><li>you want hip-hop and R&B</li><li>you came solo — there are 32 solo-bar seats (H seats)</li><li>you want stage seats or a table with your group</li><li>you like a game of darts between songs</li></ul>`],
        ['Go to 3F SPOT if…', `<ul><li>you want EDM and a big sound</li><li>you want to be right in front of the main stage (L seats)</li><li>you want photos at the photo zone</li><li>you smoke — smoking is only allowed in the 3F smoking room</li></ul>`],
        ['When do the DJs start?', `<p>Doors open at 9:30 PM Sunday–Thursday and 9 PM on Fridays, Saturdays and nights before holidays. DJs usually start around 9–10 PM on 2F and at 11 PM on 3F, playing until 4–7 AM. Each floor's timetable goes up every afternoon on our <a href="%%events%%">events page</a> and <a href="%%floors%%">floors page</a>.</p>`],
        ['Prices differ by floor', `<p>The same bottle costs a different amount on each floor. A few examples (Korean won, VAT included):</p><ul><li>Jägermeister: 2F ₩140,000 · 3F ₩200,000</li><li>Jack Daniel's: 2F ₩170,000 · 3F ₩200,000</li><li>Moët & Chandon: 2F ₩200,000 · 3F ₩250,000</li></ul><p>See the full list on our <a href="%%menu%%">menu page</a>, or read our <a href="%%a:busan-club-table-bottle-price%%">table & bottle price guide</a>.</p>`],
        ['Same entry rules on both floors', `<ul><li>19+ by Korean year-age — born in ${BY} or earlier</li><li>Physical ID required; foreigners need an original passport</li><li>Tracksuits, slippers and overly casual outfits may be refused</li></ul><p>Details in our <a href="%%a:seomyeon-club-dress-code-id%%">dress code & ID guide</a>.</p>`],
        ['Want a seat saved?', `<p>On Fridays, Saturdays and guest DJ nights, use our <a href="%%reserve%%">booking page</a> to request a floor and seat type (table, solo bar and more). You can also call +82-507-1301-5970.</p>`],
      ],
    },
    ja: {
      t: '西面クラブ 2階ヒップホップ vs 3階EDM：自分に合うフロアは？',
      s: '釜山・西面のGroove & Spotは一つのビルに2フロア。2階GROOVE（ヒップホップ・R&B、一人飲みH1–H32、ダーツ）と3階SPOT（EDM、L席、フォトゾーン、喫煙室）の違いと料金差をまとめました。',
      h1: '2階ヒップホップと3階EDM、どっちのフロアが合う？',
      lede: '入場は一度、楽しみ方は二通り。釜山・西面のGroove & Spotは、2階と3階で音楽も席も料金も違います。今夜どちらで遊ぶか決めるためのポイントをまとめました。',
      secs: [
        ['ひと目で比較', `<ul><li><b>2階 GROOVE</b>：ヒップホップ・R&B／一人飲みバーH席（H1–H32）／ステージ席／テーブル／ダーツ</li><li><b>3階 SPOT</b>：大型サウンドシステムのEDM／メインステージ前のL席／フォトゾーン／喫煙室</li><li>入場料：どちらのフロアも無料</li><li>2つのフロアは館内の階段でつながっています。</li></ul>`],
        ['2階GROOVEがおすすめの人', `<ul><li>ヒップホップやR&Bが好き</li><li>一人で来た — 一人飲みのH席が32席あります</li><li>ステージ前の席や、仲間とテーブルで楽しみたい</li><li>曲の合間にダーツもしたい</li></ul>`],
        ['3階SPOTがおすすめの人', `<ul><li>EDMと大音量が好き</li><li>メインステージを目の前で見たい（L席）</li><li>フォトゾーンで写真を残したい</li><li>タバコを吸う — 喫煙は3階の喫煙室のみです</li></ul>`],
        ['DJは何時から？', `<p>日〜木曜は21:30、金・土曜と祝前日は21:00オープン。DJは2階が21〜22時ごろ、3階が23時から始まり、明け方4〜7時まで続きます。フロア別のタイムテーブルは毎日午後に<a href="%%events%%">イベントページ</a>と<a href="%%floors%%">フロア案内</a>で公開しています。</p>`],
        ['フロアによって料金が違います', `<p>同じお酒でもフロアごとに料金が異なります。例（韓国ウォン・税込）：</p><ul><li>イエーガーマイスター：2階 140,000／3階 200,000</li><li>ジャックダニエル：2階 170,000／3階 200,000</li><li>モエ・エ・シャンドン：2階 200,000／3階 250,000</li></ul><p>全料金は<a href="%%menu%%">メニューページ</a>、セット内容は<a href="%%a:busan-club-table-bottle-price%%">テーブル・ボトルセット料金ガイド</a>をご覧ください。</p>`],
        ['入場ルールはどちらも同じ', `<ul><li>韓国の数え方で19歳以上 — ${BY}年生まれまで</li><li>実物の身分証が必須、外国人はパスポート原本</li><li>ジャージ・スリッパ・カジュアルすぎる服装はお断りする場合があります</li></ul><p>詳しくは<a href="%%a:seomyeon-club-dress-code-id%%">ドレスコード・身分証まとめ</a>へ。</p>`],
        ['席を確保したいなら', `<p>金・土曜やゲストDJの日は、<a href="%%reserve%%">予約ページ</a>でフロアと席の種類（テーブル・一人飲みHゾーンなど）を選んでリクエストしてください。電話（+82-507-1301-5970）でも受け付けています。</p>`],
      ],
    },
    zh: {
      t: '釜山西面夜店：2楼嘻哈还是3楼EDM？选对楼层',
      s: '西面Groove & Spot一栋楼两层：2楼GROOVE是嘻哈和R&B，有32个单人吧台座位和飞镖；3楼SPOT是EDM，有主舞台L座、拍照区和吸烟室。楼层和价格差异一次看懂。',
      h1: '嘻哈还是EDM？西面夜店楼层怎么选',
      lede: '免费入场一次，两种完全不同的夜晚。釜山西面Groove & Spot的2楼和3楼，音乐、座位和价格都不一样。想好今晚去哪层，看这篇就够了。',
      secs: [
        ['一眼看懂', `<ul><li><b>2楼 GROOVE</b>：嘻哈、R&B · 单人吧台H座（H1–H32）· 舞台座 · 卡座 · 飞镖</li><li><b>3楼 SPOT</b>：大型音响的EDM · 主舞台前L座 · 拍照区 · 吸烟室</li><li>门票：两层都免费</li><li>两层之间有楼内楼梯相通。</li></ul>`],
        ['适合去2楼GROOVE的人', `<ul><li>喜欢嘻哈和R&B</li><li>一个人来 —— 有32个单人吧台座位（H座）</li><li>想坐舞台前，或和朋友订卡座</li><li>想在歌与歌之间玩两把飞镖</li></ul>`],
        ['适合去3楼SPOT的人', `<ul><li>喜欢EDM和震撼音响</li><li>想在主舞台正前方（L座）</li><li>想在拍照区留影</li><li>抽烟 —— 只能在3楼吸烟室吸烟</li></ul>`],
        ['DJ几点开始？', `<p>周日至周四21:30开门，周五、周六及节假日前夜21:00开门。2楼DJ一般21–22点开始，3楼DJ 23点开始，一直到凌晨4–7点。每层当晚的时间表每天下午发布在<a href="%%events%%">活动页面</a>和<a href="%%floors%%">楼层介绍</a>。</p>`],
        ['每层价格不同', `<p>同一款酒在不同楼层价格不一样。举例（韩元，含增值税）：</p><ul><li>野格：2楼 140,000 · 3楼 200,000</li><li>杰克丹尼：2楼 170,000 · 3楼 200,000</li><li>酩悦香槟：2楼 200,000 · 3楼 250,000</li></ul><p>完整价格见<a href="%%menu%%">酒水单页面</a>，套餐内容见<a href="%%a:busan-club-table-bottle-price%%">卡座与酒套餐价格攻略</a>。</p>`],
        ['两层入场规定相同', `<ul><li>按韩国年份计算19岁以上 —— ${BY}年及以前出生</li><li>必须携带实体证件，外国人请带护照原件</li><li>运动服、拖鞋和过于随意的穿着可能被拒绝入场</li></ul><p>详情见<a href="%%a:seomyeon-club-dress-code-id%%">着装与证件攻略</a>。</p>`],
        ['想提前留位？', `<p>周五、周六和客座DJ之夜，可以在<a href="%%reserve%%">预约页面</a>选择楼层和座位类型（卡座、单人H区等）提交申请，也可以打电话 +82-507-1301-5970。</p>`],
      ],
    },
  },
  {
    slug: 'busan-club-table-bottle-price',
    date: '2026-11-10',
    ko: {
      t: '서면 클럽 테이블·바틀 세트 가격 가이드 (2층·3층·바 메뉴)',
      s: '부산 서면 그루브앤스팟 실제 가격표. 칵테일 6,000원부터, 2층 바틀 140,000원부터, 2층 세트 200,000·500,000원, 3층 세트 600,000원부터. 원화·부가세 포함.',
      h1: '서면 클럽 술값, 얼마면 될까? 테이블·바틀 세트 가격 가이드',
      lede: '입장료는 없고, 술값은 어디서 무엇을 마시느냐에 따라 달라집니다. 그루브앤스팟 매장 메뉴판 기준 가격을 바 메뉴 → 2층 → 3층 순서로 정리했어요. 모든 가격은 원화, 부가세 포함입니다.',
      secs: [
        ['한눈에 보기', `<ul><li>입장료: 무료</li><li>칵테일: 6,000–10,000원</li><li>샷·밤: 6,000원부터</li><li>병맥주: 8,000–10,000원</li><li>2층 바틀: 80,000원부터(샴페인) · 140,000원부터(보드카·위스키 등)</li><li>2층 세트: 200,000원 · 280,000원 · 500,000원</li><li>3층 세트: 600,000원부터</li></ul>`],
        ['가볍게 마신다면: 바 메뉴', `<ul><li>칵테일: 보드카토닉·진토닉·럼콕 6,000원, 잭콕·제임슨 진저에일 8,000원, 롱아일랜드 아이스티 10,000원</li><li>샷: 예거샷·보드카샷 6,000원, 잭샷 7,000원, 헤네시샷 13,000원</li><li>병맥주: 호가든 8,000원, 버드와이저·코로나 9,000원, 스텔라·기네스 10,000원</li><li>무알콜: 자몽주스 7,000원, 카스 제로 9,000원</li><li>바 전용 바틀 세트: 80,000원(POTION ENERGY · KAMA TEQUILA · OPERA PRIMA)</li></ul><p>메뉴에 없는 칵테일·샷은 직원에게 물어보세요.</p>`],
        ['2층 바틀 가격', `<ul><li>샴페인: 오페라 프리마 브뤼 80,000원 · 딥 루미너스/킹/퀸/오로라 150,000원 · 모엣 샹동 200,000원</li><li>보드카: 앱솔루트·스미노프 140,000원 · 그레이구스 190,000원</li><li>위스키: 제임슨 140,000원 · 잭다니엘스·조니워커 블랙 170,000원</li><li>리큐르: 예거마이스터·말리부 140,000원 · 파이어볼 170,000원</li><li>코냑: 헤네시 VSOP 280,000원</li></ul>`],
        ['2층 세트 구성', `<ul><li><b>200,000원</b> — 잭다니엘스(오리지널·허니·애플 중 1병) + 오페라 프리마 브뤼 1병(서비스) + 안주</li><li><b>280,000원</b> — 헤네시 VSOP + 오페라 프리마 브뤼 1병(서비스)</li><li><b>500,000원</b> — 딥 루미너스·오로라·퀸·킹 중 3병 + 같은 샴페인 1병(서비스) + 안주</li></ul>`],
        ['3층 바틀 가격', `<ul><li>위스키: 제임슨 170,000원 · 잭다니엘스·조니워커 블랙 200,000원</li><li>보드카·리큐르·데킬라: 대부분 200,000원 · 그레이구스·아그와·힙노틱 250,000원</li><li>샴페인: 딥 루미너스/킹/퀸/오로라 200,000원 · 모엣 샹동 250,000원</li><li>코냑: 헤네시 VSOP 350,000원</li></ul>`],
        ['3층 샴페인 세트', `<p>메뉴판 표기(3+1 / 3B · 6+2 / 5B · 10B) 기준입니다.</p><ul><li>딥 루미너스·킹·퀸·오로라: 600,000원 · 1,200,000원 · 1,550,000원</li><li>모엣 샹동: 700,000원 · 1,200,000원 · 2,300,000원</li><li>모엣 N.I.R: 1,000,000원 · 1,650,000원 · 3,250,000원</li></ul><p>더 높은 등급(페리에주에·돔페리뇽·아르망디) 세트는 <a href="%%menu%%">메뉴 페이지</a>에 있어요.</p>`],
        ['같은 술, 층별 차이', `<ul><li>예거마이스터: 2층 140,000원 · 3층 200,000원</li><li>그레이구스: 2층 190,000원 · 3층 250,000원</li><li>모엣 샹동: 2층 200,000원 · 3층 250,000원</li></ul><p>층마다 분위기도 달라요. <a href="%%a:busan-club-hiphop-vs-edm-floor%%">2층 힙합 vs 3층 EDM 비교</a>를 참고하세요.</p>`],
        ['결제와 예약', `<ul><li>신용카드·체크카드, NFC 모바일 결제 가능</li><li>금·토요일과 게스트 DJ 날은 테이블 예약 추천 — <a href="%%reserve%%">예약 페이지</a>에서 날짜·인원·바틀 세트를 남겨 주세요</li><li>전화: 0507-1301-5970</li></ul>`],
      ],
    },
    en: {
      t: 'Busan Club Prices: Table & Bottle Service at a Seomyeon Club',
      s: 'Real prices at Groove & Spot, Seomyeon: cocktails from ₩6,000, beer from ₩8,000, 2F bottles from ₩140,000, 2F sets ₩200,000–₩500,000, 3F sets from ₩600,000. Korean won, VAT included.',
      h1: 'How much does a night out cost? Table and bottle prices in Seomyeon, Busan',
      lede: "There's no cover charge — what you spend depends on where you sit and what you drink. Here are the prices from our in-store menu, from the bar to 2F and 3F bottle service. All prices are in Korean won (₩) with VAT included.",
      secs: [
        ['Price overview', `<ul><li>Entry: free</li><li>Cocktails: ₩6,000–₩10,000</li><li>Shots & bombs: from ₩6,000</li><li>Bottled beer: ₩8,000–₩10,000</li><li>2F bottles: champagne from ₩80,000, spirits from ₩140,000</li><li>2F sets: ₩200,000 · ₩280,000 · ₩500,000</li><li>3F sets: from ₩600,000</li></ul>`],
        ['Just a few drinks: the bar menu', `<ul><li>Cocktails: vodka tonic, gin tonic, rum & coke ₩6,000 · Jack & coke, Jameson ginger ale ₩8,000 · Long Island iced tea ₩10,000</li><li>Shots: Jäger or vodka ₩6,000 · Jack ₩7,000 · Hennessy ₩13,000</li><li>Bottled beer: Hoegaarden ₩8,000 · Budweiser, Corona ₩9,000 · Stella, Guinness ₩10,000</li><li>Non-alcoholic: grapefruit juice ₩7,000 · Cass Zero ₩9,000</li><li>Bar-only bottle sets: ₩80,000 (Potion Energy · Kama Tequila · Opera Prima)</li></ul><p>Want something not on the menu? Just ask the staff.</p>`],
        ['2F bottle prices', `<ul><li>Champagne: Opera Prima Brut ₩80,000 · Deep / King / Queen / Aurora ₩150,000 · Moët & Chandon ₩200,000</li><li>Vodka: Absolut, Smirnoff ₩140,000 · Grey Goose ₩190,000</li><li>Whisky: Jameson ₩140,000 · Jack Daniel's, Johnnie Walker Black ₩170,000</li><li>Liqueur: Jägermeister, Malibu ₩140,000 · Fireball ₩170,000</li><li>Cognac: Hennessy VSOP ₩280,000</li></ul>`],
        ['2F bottle sets', `<ul><li><b>₩200,000</b> — one Jack Daniel's (original, Honey or Apple) + one free Opera Prima Brut + snacks</li><li><b>₩280,000</b> — Hennessy VSOP + one free Opera Prima Brut</li><li><b>₩500,000</b> — three bottles of Deep, Aurora, Queen or King + one more free + snacks</li></ul>`],
        ['3F bottle prices', `<ul><li>Whisky: Jameson ₩170,000 · Jack Daniel's, Johnnie Walker Black ₩200,000</li><li>Vodka, liqueur, tequila: mostly ₩200,000 · Grey Goose, Agwa, Hpnotiq ₩250,000</li><li>Champagne: Deep / King / Queen / Aurora ₩200,000 · Moët & Chandon ₩250,000</li><li>Cognac: Hennessy VSOP ₩350,000</li></ul>`],
        ['3F champagne sets', `<p>Three sizes, as listed on our menu (3+1 / 3B · 6+2 / 5B · 10B):</p><ul><li>Deep, King, Queen, Aurora: ₩600,000 · ₩1,200,000 · ₩1,550,000</li><li>Moët & Chandon: ₩700,000 · ₩1,200,000 · ₩2,300,000</li><li>Moët N.I.R: ₩1,000,000 · ₩1,650,000 · ₩3,250,000</li></ul><p>Premium sets (Perrier-Jouët, Dom Pérignon, Armand de Brignac) are on the <a href="%%menu%%">menu page</a>.</p>`],
        ['Same bottle, different floor', `<ul><li>Jägermeister: 2F ₩140,000 · 3F ₩200,000</li><li>Grey Goose: 2F ₩190,000 · 3F ₩250,000</li><li>Moët & Chandon: 2F ₩200,000 · 3F ₩250,000</li></ul><p>The vibe is different too — see <a href="%%a:busan-club-hiphop-vs-edm-floor%%">hip-hop (2F) vs EDM (3F)</a>.</p>`],
        ['Paying and booking', `<ul><li>Credit and debit cards and contactless (NFC) mobile payments accepted</li><li>On Fridays, Saturdays and guest DJ nights, book a table on our <a href="%%reserve%%">booking page</a> with your date, group size and bottle set</li><li>Phone: +82-507-1301-5970</li></ul>`],
      ],
    },
    ja: {
      t: '西面クラブのテーブル・ボトルセット料金ガイド（2階・3階・バー）',
      s: '釜山・西面Groove & Spotの実際の料金。カクテル6,000ウォン〜、2階ボトル140,000ウォン〜、2階セット200,000・500,000ウォン、3階セット600,000ウォン〜。韓国ウォン・税込。',
      h1: '西面クラブ、いくらあれば遊べる？テーブル・ボトルセット料金ガイド',
      lede: '入場料はなく、お酒代はどこで何を飲むかで変わります。Groove & Spotの店内メニュー表をもとに、バー → 2階 → 3階の順に料金をまとめました。料金はすべて韓国ウォン・税込です。',
      secs: [
        ['ひと目でわかる料金', `<ul><li>入場料：無料</li><li>カクテル：6,000〜10,000ウォン</li><li>ショット・ボム：6,000ウォン〜</li><li>瓶ビール：8,000〜10,000ウォン</li><li>2階ボトル：シャンパン80,000ウォン〜、スピリッツ140,000ウォン〜</li><li>2階セット：200,000／280,000／500,000ウォン</li><li>3階セット：600,000ウォン〜</li></ul>`],
        ['軽く飲むならバーメニュー', `<ul><li>カクテル：ウォッカトニック・ジントニック・ラムコーク6,000ウォン、ジャックコーク・ジェムソンジンジャーエール8,000ウォン、ロングアイランドアイスティー10,000ウォン</li><li>ショット：イエーガー・ウォッカ6,000ウォン、ジャック7,000ウォン、ヘネシー13,000ウォン</li><li>瓶ビール：ヒューガルデン8,000ウォン、バドワイザー・コロナ9,000ウォン、ステラ・ギネス10,000ウォン</li><li>ノンアルコール：グレープフルーツジュース7,000ウォン、カスゼロ9,000ウォン</li><li>バー専用ボトルセット：80,000ウォン（POTION ENERGY・KAMA TEQUILA・OPERA PRIMA）</li></ul><p>メニューにないカクテルやショットはスタッフにお尋ねください。</p>`],
        ['2階のボトル料金', `<ul><li>シャンパン：オペラ・プリマ・ブリュット80,000ウォン、ディープ／キング／クイーン／オーロラ150,000ウォン、モエ・エ・シャンドン200,000ウォン</li><li>ウォッカ：アブソルート・スミノフ140,000ウォン、グレイグース190,000ウォン</li><li>ウイスキー：ジェムソン140,000ウォン、ジャックダニエル・ジョニーウォーカー黒170,000ウォン</li><li>リキュール：イエーガーマイスター・マリブ140,000ウォン、ファイアボール170,000ウォン</li><li>コニャック：ヘネシーVSOP 280,000ウォン</li></ul>`],
        ['2階のセット内容', `<ul><li><b>200,000ウォン</b> — ジャックダニエル（オリジナル・ハニー・アップルから1本）＋オペラ・プリマ・ブリュット1本（サービス）＋おつまみ</li><li><b>280,000ウォン</b> — ヘネシーVSOP＋オペラ・プリマ・ブリュット1本（サービス）</li><li><b>500,000ウォン</b> — ディープ・オーロラ・クイーン・キングから3本＋同じシャンパン1本（サービス）＋おつまみ</li></ul>`],
        ['3階のボトル料金', `<ul><li>ウイスキー：ジェムソン170,000ウォン、ジャックダニエル・ジョニーウォーカー黒200,000ウォン</li><li>ウォッカ・リキュール・テキーラ：ほとんど200,000ウォン、グレイグース・アグワ・ヒプノティック250,000ウォン</li><li>シャンパン：ディープ／キング／クイーン／オーロラ200,000ウォン、モエ・エ・シャンドン250,000ウォン</li><li>コニャック：ヘネシーVSOP 350,000ウォン</li></ul>`],
        ['3階のシャンパンセット', `<p>メニュー表の表記（3+1 / 3B・6+2 / 5B・10B）の3サイズです。</p><ul><li>ディープ・キング・クイーン・オーロラ：600,000／1,200,000／1,550,000ウォン</li><li>モエ・エ・シャンドン：700,000／1,200,000／2,300,000ウォン</li><li>モエN.I.R：1,000,000／1,650,000／3,250,000ウォン</li></ul><p>さらに上のセット（ペリエ・ジュエ、ドンペリニヨン、アルマン・ド・ブリニャック）は<a href="%%menu%%">メニューページ</a>にあります。</p>`],
        ['同じお酒でもフロアで違う', `<ul><li>イエーガーマイスター：2階140,000／3階200,000ウォン</li><li>グレイグース：2階190,000／3階250,000ウォン</li><li>モエ・エ・シャンドン：2階200,000／3階250,000ウォン</li></ul><p>雰囲気も違います。<a href="%%a:busan-club-hiphop-vs-edm-floor%%">2階ヒップホップ vs 3階EDM</a>もどうぞ。</p>`],
        ['お支払いと予約', `<ul><li>クレジットカード・デビットカード、NFCのモバイル決済が使えます</li><li>金・土曜やゲストDJの日はテーブル予約がおすすめ — <a href="%%reserve%%">予約ページ</a>で日付・人数・ボトルセットをお知らせください</li><li>電話：+82-507-1301-5970</li></ul>`],
      ],
    },
    zh: {
      t: '釜山西面夜店卡座与酒套餐价格攻略（2楼·3楼·吧台）',
      s: '釜山西面Groove & Spot真实价格：鸡尾酒6,000韩元起，2楼整瓶140,000韩元起，2楼套餐200,000–500,000韩元，3楼套餐600,000韩元起。韩元计价，含增值税。',
      h1: '西面夜店要花多少钱？卡座与酒套餐价格一览',
      lede: '不收门票，花多少取决于你坐哪、喝什么。以下是Groove & Spot店内酒水单的价格，按吧台 → 2楼 → 3楼整理。所有价格以韩元计，含增值税。',
      secs: [
        ['价格速览', `<ul><li>门票：免费</li><li>鸡尾酒：6,000–10,000韩元</li><li>子弹杯·炸弹酒：6,000韩元起</li><li>瓶装啤酒：8,000–10,000韩元</li><li>2楼整瓶：香槟80,000韩元起，烈酒140,000韩元起</li><li>2楼套餐：200,000 · 280,000 · 500,000韩元</li><li>3楼套餐：600,000韩元起</li></ul>`],
        ['小酌一下：吧台酒水', `<ul><li>鸡尾酒：伏特加汤力、金汤力、朗姆可乐6,000韩元；杰克可乐、尊美醇姜汁汽水8,000韩元；长岛冰茶10,000韩元</li><li>子弹杯：野格、伏特加6,000韩元；杰克丹尼7,000韩元；轩尼诗13,000韩元</li><li>瓶装啤酒：福佳白8,000韩元；百威、科罗娜9,000韩元；时代、健力士10,000韩元</li><li>无酒精：西柚汁7,000韩元；Cass Zero 9,000韩元</li><li>吧台专属酒套餐：80,000韩元（POTION ENERGY · KAMA TEQUILA · OPERA PRIMA）</li></ul><p>想喝菜单上没有的鸡尾酒或子弹杯，可以问工作人员。</p>`],
        ['2楼整瓶价格', `<ul><li>香槟：Opera Prima Brut 80,000韩元；Deep / King / Queen / Aurora 150,000韩元；酩悦香槟200,000韩元</li><li>伏特加：绝对伏特加、斯米诺140,000韩元；灰雁190,000韩元</li><li>威士忌：尊美醇140,000韩元；杰克丹尼、尊尼获加黑牌170,000韩元</li><li>利口酒：野格、马利宝140,000韩元；火龙肉桂威士忌170,000韩元</li><li>干邑：轩尼诗VSOP 280,000韩元</li></ul>`],
        ['2楼套餐内容', `<ul><li><b>200,000韩元</b> —— 杰克丹尼（原味、蜂蜜、苹果任选1瓶）+ 赠送Opera Prima Brut 1瓶 + 小食</li><li><b>280,000韩元</b> —— 轩尼诗VSOP + 赠送Opera Prima Brut 1瓶</li><li><b>500,000韩元</b> —— Deep、Aurora、Queen、King任选3瓶 + 同款再送1瓶 + 小食</li></ul>`],
        ['3楼整瓶价格', `<ul><li>威士忌：尊美醇170,000韩元；杰克丹尼、尊尼获加黑牌200,000韩元</li><li>伏特加、利口酒、龙舌兰：大多200,000韩元；灰雁、Agwa、Hpnotiq 250,000韩元</li><li>香槟：Deep / King / Queen / Aurora 200,000韩元；酩悦香槟250,000韩元</li><li>干邑：轩尼诗VSOP 350,000韩元</li></ul>`],
        ['3楼香槟套餐', `<p>按酒水单标注分三档（3+1 / 3B · 6+2 / 5B · 10B）：</p><ul><li>Deep、King、Queen、Aurora：600,000 · 1,200,000 · 1,550,000韩元</li><li>酩悦香槟：700,000 · 1,200,000 · 2,300,000韩元</li><li>酩悦N.I.R：1,000,000 · 1,650,000 · 3,250,000韩元</li></ul><p>更高档的套餐（巴黎之花、唐培里侬、黑桃A）见<a href="%%menu%%">酒水单页面</a>。</p>`],
        ['同一款酒，楼层不同价格不同', `<ul><li>野格：2楼140,000 · 3楼200,000韩元</li><li>灰雁：2楼190,000 · 3楼250,000韩元</li><li>酩悦香槟：2楼200,000 · 3楼250,000韩元</li></ul><p>两层氛围也不同，可以看看<a href="%%a:busan-club-hiphop-vs-edm-floor%%">2楼嘻哈 vs 3楼EDM</a>。</p>`],
        ['付款与预约', `<ul><li>接受信用卡、借记卡和NFC手机支付</li><li>周五、周六和客座DJ之夜建议预订卡座 —— 在<a href="%%reserve%%">预约页面</a>留下日期、人数和想要的酒套餐</li><li>电话：+82-507-1301-5970</li></ul>`],
      ],
    },
  },
  {
    slug: 'how-to-get-to-seomyeon-club',
    date: '2026-11-19',
    ko: {
      t: '부산역·해운대·김해공항에서 서면 클럽 가는 법 (지하철·택시)',
      s: '부산역에서 지하철 1호선 약 15분, 해운대에서 2호선 약 35분·택시 약 25분, 김해공항에서 경전철+2호선 약 45분. 서면역 3번 출구 도보 3분, 그루브앤스팟 가는 길과 귀가 팁.',
      h1: '부산역·해운대·김해공항에서 서면 클럽 가는 법',
      lede: '그루브앤스팟은 서면역 3번 출구에서 걸어서 3분이에요. 부산 어디에서 출발하든 서면역까지만 오면 됩니다. 출발지별로 가장 간단한 방법과 택시 타는 법, 집에 가는 방법까지 정리했어요.',
      secs: [
        ['한눈에 보기', `<ul><li><b>부산역에서</b>: 지하철 1호선 약 15분</li><li><b>해운대에서</b>: 지하철 2호선 약 35분 · 택시 약 25분</li><li><b>김해공항에서</b>: 경전철로 사상역 → 2호선 환승, 약 45분</li><li><b>내리는 곳</b>: 서면역 3번 출구, 걸어서 3분</li><li><b>주소</b>: 부산 부산진구 중앙대로680번가길 52 (2·3층)</li></ul>`],
        ['목적지는 서면역 3번 출구', `<p>서면역은 부산 지하철 <b>1호선과 2호선</b>이 함께 서는 역이에요. 어느 노선으로 왔든 <b>3번 출구</b>로 나오면 3분이면 도착합니다.</p>
<p>그루브앤스팟은 한 건물의 2층과 3층이에요. <b>2층 GROOVE</b>는 힙합·R&B, <b>3층 SPOT</b>은 EDM입니다. 지도 앱으로 바로 찾고 싶다면 <a href="%%info%%">안내 페이지</a>의 카카오맵·네이버지도·구글맵 버튼을 누르세요.</p>`],
        ['부산역에서: 1호선 한 번에', `<p>부산역에서 지하철 <b>1호선</b>을 타면 갈아타지 않고 서면역까지 약 15분이에요. 서면역에서 내려 3번 출구로 나오면 됩니다.</p>`],
        ['해운대에서: 2호선 또는 택시', `<ul><li><b>지하철</b>: 2호선으로 약 35분. 서면역에서 내려 3번 출구로 나오세요.</li><li><b>택시</b>: 약 25분.</li></ul>
<p>시간은 대략적인 기준이라 도로 사정 등에 따라 달라질 수 있어요.</p>`],
        ['김해공항에서: 경전철 → 사상역 → 2호선', `<ol><li>김해공항에서 <b>경전철</b>을 타고 <b>사상역</b>까지 가요.</li><li>사상역에서 지하철 <b>2호선</b>으로 갈아타요.</li><li><b>서면역</b>에서 내려 3번 출구로 나오면 끝.</li></ol>
<p>전체 약 45분이에요. 비행기에서 내려 바로 온다면, 입구에서 확인하는 <b>실물 신분증</b>(외국인은 여권 원본)을 바로 꺼낼 수 있게 챙겨 두세요.</p>`],
        ['택시 탈 때 보여 줄 주소', `<p>기사님께 아래 주소를 보여 주면 됩니다.</p>
<p><b>서면 그루브앤스팟, 부산 부산진구 중앙대로680번가길 52</b></p>
<p>택시는 카카오T 앱으로 부르면 편해요.</p>`],
        ['차를 가져온다면', `<p>그루브앤스팟 전용 주차장은 없어요. 서면역 근처 공영·민영 주차장을 이용해야 하고, 술을 마실 계획이라면 차는 두고 지하철이나 택시로 오세요.</p>`],
        ['집에 갈 때는 택시', `<p>부산 지하철은 자정 무렵 끊겨요. 클럽은 일–목 06:00, 금·토·공휴일 전날 07:00까지 영업하니, 늦게까지 놀 계획이라면 귀가는 택시(카카오T)로 생각해 두세요.</p>`],
        ['출발 전 체크리스트', `<ul><li>입장료 무료, 연 나이 19세 이상 — ${BY}년생까지</li><li>실물 신분증 필수, 사진·사본은 안 돼요. 외국인은 여권 원본</li><li>트레이닝복·슬리퍼·과도한 캐주얼은 제한될 수 있어요 → <a href="%%a:seomyeon-club-dress-code-id%%">드레스코드·신분증 정리</a></li><li>문 여는 시간: 일–목 21:30, 금·토·공휴일 전날 21:00</li><li>오늘 밤 DJ는 매일 오후 <a href="%%events%%">이벤트 페이지</a>에 올라와요</li><li>외국인 친구와 함께라면 <a href="%%a:busan-club-foreigners-faq%%">외국인 FAQ</a>도 확인하세요</li></ul>`],
      ],
    },
    en: {
      t: 'How to Get to Seomyeon from Busan Station, Haeundae & Gimhae Airport',
      s: 'Getting to a Seomyeon club in Busan: Line 1 from Busan Station (about 15 min), Line 2 or a taxi from Haeundae, light rail + Line 2 from Gimhae Airport (about 45 min). Then 3 min from Exit 3.',
      h1: 'How to get to Seomyeon from Busan Station, Haeundae and Gimhae Airport',
      lede: 'Groove & Spot is a 3-minute walk from Seomyeon Station Exit 3, so wherever you start in Busan, all you have to do is reach Seomyeon Station. Here is the simplest route from each starting point, plus taxi tips and how to get back to your hotel.',
      secs: [
        ['Quick routes', `<ul><li><b>From Busan Station</b>: Metro Line 1, about 15 min</li><li><b>From Haeundae</b>: Metro Line 2, about 35 min — or about 25 min by taxi</li><li><b>From Gimhae Airport</b>: light rail to Sasang, then Line 2 — about 45 min</li><li><b>Get off at</b>: Seomyeon Station, Exit 3, then a 3-minute walk</li><li><b>Address</b>: 52 Jungang-daero 680beon-ga-gil, Busanjin-gu, Busan (2F–3F)</li></ul>`],
        ['Your target: Seomyeon Station Exit 3', `<p>Seomyeon Station is served by both Busan Metro <b>Line 1 and Line 2</b>. Whichever line you arrive on, leave by <b>Exit 3</b> and you'll be at the club in about 3 minutes.</p>
<p>The club takes up the 2nd and 3rd floors of one building: <b>2F GROOVE</b> for hip-hop and R&B, <b>3F SPOT</b> for EDM. To open it in a map app, use the KakaoMap, Naver Map or Google Maps buttons on our <a href="%%info%%">info page</a>.</p>`],
        ['Busan Station to Seomyeon: one ride on Line 1', `<p>From Busan Station, take Metro <b>Line 1</b> straight to Seomyeon — no transfer, about 15 minutes. Get off at Seomyeon and head for Exit 3.</p>`],
        ['Haeundae to Seomyeon: Line 2 or a taxi', `<ul><li><b>Metro</b>: Line 2, about 35 minutes. Get off at Seomyeon and take Exit 3.</li><li><b>Taxi</b>: about 25 minutes.</li></ul>
<p>Times are rough guides and can change with traffic.</p>`],
        ['Gimhae Airport to Seomyeon: light rail, then Line 2', `<ol><li>At Gimhae Airport, take the <b>light rail</b> to <b>Sasang</b>.</li><li>At Sasang, change to Metro <b>Line 2</b>.</li><li>Get off at <b>Seomyeon</b> and take Exit 3.</li></ol>
<p>About 45 minutes in total. Coming straight from your flight? Keep your <b>original passport</b> where you can reach it — it's checked at the door.</p>`],
        ['Taking a taxi: show this address', `<p>Show your driver the Korean address:</p>
<p><b>서면 그루브앤스팟, 부산 부산진구 중앙대로680번가길 52</b></p>
<p>The Kakao T app is the easiest way to call a taxi.</p>`],
        ['Driving?', `<p>There's no private parking at the club, so you'd need a public or private lot near Seomyeon Station. If you plan to drink, leave the car behind and take the metro or a taxi.</p>`],
        ['Getting back to your hotel', `<p>The Busan metro stops running around midnight, while the club stays open until 6 AM Sunday to Thursday and 7 AM on Fridays, Saturdays and nights before holidays. If you're staying late, plan on a taxi home — Kakao T makes it easy.</p>`],
        ['Before you leave', `<ul><li>Entry is free; 19+ by Korean year-age — born in ${BY} or earlier</li><li>Bring your original passport — photos and copies are not accepted</li><li>Tracksuits, slippers and overly casual outfits may be refused → <a href="%%a:seomyeon-club-dress-code-id%%">dress code & ID guide</a></li><li>Doors open at 9:30 PM Sunday to Thursday, 9 PM on Fridays, Saturdays and nights before holidays</li><li>Tonight's DJs go up every afternoon on our <a href="%%events%%">events page</a></li><li>More answers for travelers in our <a href="%%a:busan-club-foreigners-faq%%">clubbing in Busan as a foreigner FAQ</a></li></ul>`],
      ],
    },
    ja: {
      t: '釜山駅・海雲台・金海空港から西面のクラブへの行き方（地下鉄・タクシー）',
      s: '釜山駅から地下鉄1号線で約15分、海雲台から2号線で約35分・タクシーで約25分、金海空港から軽電鉄＋2号線で約45分。西面駅3番出口から徒歩3分のGroove & Spotへの行き方と帰り方。',
      h1: '釜山駅・海雲台・金海空港から西面のクラブへの行き方',
      lede: 'Groove & Spotは西面駅3番出口から徒歩3分。釜山のどこから出発しても、西面駅まで来ればほぼ到着です。出発地ごとのいちばん簡単なルートと、タクシーの乗り方、ホテルへの帰り方をまとめました。',
      secs: [
        ['ルートまとめ', `<ul><li><b>釜山駅から</b>：地下鉄1号線で約15分</li><li><b>海雲台から</b>：地下鉄2号線で約35分／タクシーで約25分</li><li><b>金海空港から</b>：軽電鉄で沙上へ→2号線に乗り換え、約45分</li><li><b>降りる駅</b>：西面駅3番出口から徒歩3分</li><li><b>住所</b>：釜山広域市 釜山鎮区 中央大路680番街キル52（2・3階）</li></ul>`],
        ['目指すのは西面駅3番出口', `<p>西面駅には釜山地下鉄の<b>1号線と2号線</b>が乗り入れています。どちらの路線で来ても、<b>3番出口</b>を出れば3分ほどで着きます。</p>
<p>クラブは一つのビルの2階と3階。<b>2階GROOVE</b>はヒップホップ・R&B、<b>3階SPOT</b>はEDMです。地図アプリで開くなら、<a href="%%info%%">アクセスページ</a>のKakaoMap・NAVER地図・Googleマップのボタンが便利です。</p>`],
        ['釜山駅から：1号線で乗り換えなし', `<p>釜山駅から地下鉄<b>1号線</b>に乗れば、乗り換えなしで西面駅まで約15分。西面駅で降りたら3番出口へ向かってください。</p>`],
        ['海雲台から：2号線かタクシー', `<ul><li><b>地下鉄</b>：2号線で約35分。西面駅で降りて3番出口へ。</li><li><b>タクシー</b>：約25分。</li></ul>
<p>所要時間は目安です。道路状況などによって変わります。</p>`],
        ['金海空港から：軽電鉄→沙上→2号線', `<ol><li>金海空港から<b>軽電鉄</b>で<b>沙上（ササン）</b>へ。</li><li>沙上で地下鉄<b>2号線</b>に乗り換え。</li><li><b>西面</b>で降りて3番出口へ。</li></ol>
<p>全体で約45分です。飛行機を降りてそのまま来るなら、入口で確認する<b>パスポート原本</b>をすぐ出せるところに入れておきましょう。</p>`],
        ['タクシーではこの住所を見せて', `<p>運転手さんには韓国語の住所を見せてください。</p>
<p><b>서면 그루브앤스팟, 부산 부산진구 중앙대로680번가길 52</b></p>
<p>タクシーはKakao Tアプリで呼ぶと便利です。</p>`],
        ['車で来る場合', `<p>専用駐車場はありません。西面駅周辺の駐車場を利用することになります。お酒を飲むなら車は置いて、地下鉄かタクシーで来てください。</p>`],
        ['帰りはタクシーで', `<p>釜山の地下鉄は深夜0時ごろに終わります。クラブは日〜木曜は翌6:00、金・土曜と祝前日は翌7:00まで営業しているので、遅くまで遊ぶならホテルへはタクシー（Kakao T）で帰るつもりでいましょう。</p>`],
        ['出発前のチェックリスト', `<ul><li>入場無料、韓国の数え方で19歳以上 — ${BY}年生まれまで</li><li>パスポート原本が必須。写真・コピーは不可</li><li>ジャージ・スリッパ・カジュアルすぎる服装はお断りする場合があります → <a href="%%a:seomyeon-club-dress-code-id%%">ドレスコード・身分証まとめ</a></li><li>オープン：日〜木曜21:30、金・土曜と祝前日21:00</li><li>今夜のDJは毎日午後に<a href="%%events%%">イベントページ</a>で公開</li><li>そのほかの疑問は<a href="%%a:busan-club-foreigners-faq%%">外国人向けよくある質問</a>へ</li></ul>`],
      ],
    },
    zh: {
      t: '从釜山站、海云台、金海机场去西面夜店怎么走（地铁·打车）',
      s: '釜山站坐地铁1号线约15分钟，海云台坐2号线约35分钟或打车约25分钟，金海机场坐轻轨换乘2号线约45分钟。西面站3号出口步行3分钟到Groove & Spot，附回程建议。',
      h1: '从釜山站、海云台、金海机场去西面夜店：交通攻略',
      lede: 'Groove & Spot在西面站3号出口步行3分钟。不管你从釜山哪里出发，只要到了西面站就差不多到了。下面按出发地整理了最简单的路线，还有打车和回酒店的小贴士。',
      secs: [
        ['路线速览', `<ul><li><b>从釜山站</b>：地铁1号线约15分钟</li><li><b>从海云台</b>：地铁2号线约35分钟／打车约25分钟</li><li><b>从金海机场</b>：轻轨到沙上站，换乘2号线，约45分钟</li><li><b>下车站</b>：西面站3号出口，步行3分钟</li><li><b>地址</b>：釜山 釜山镇区 中央大路680番街路52号（2–3楼）</li></ul>`],
        ['目的地：西面站3号出口', `<p>西面站是釜山地铁<b>1号线和2号线</b>都经过的车站。不管坐哪条线来，从<b>3号出口</b>出来走3分钟左右就到。</p>
<p>夜店在同一栋楼的2楼和3楼：<b>2楼GROOVE</b>是嘻哈和R&B，<b>3楼SPOT</b>是EDM。想用地图App导航，可以点<a href="%%info%%">须知页面</a>上的KakaoMap、NAVER地图、谷歌地图按钮。</p>`],
        ['从釜山站：1号线直达', `<p>在釜山站坐地铁<b>1号线</b>，不用换乘，约15分钟到西面站。下车后走3号出口。</p>`],
        ['从海云台：2号线或打车', `<ul><li><b>地铁</b>：2号线约35分钟，在西面站下车走3号出口。</li><li><b>打车</b>：约25分钟。</li></ul>
<p>时间仅供参考，会因路况等有所变化。</p>`],
        ['从金海机场：轻轨→沙上→2号线', `<ol><li>在金海机场坐<b>轻轨</b>到<b>沙上站</b>。</li><li>在沙上站换乘地铁<b>2号线</b>。</li><li>在<b>西面站</b>下车，走3号出口。</li></ol>
<p>全程约45分钟。如果下了飞机直接过来，请把<b>护照原件</b>放在随手能拿到的地方，入场时要查验。</p>`],
        ['打车时给司机看这个地址', `<p>请给司机看韩文地址：</p>
<p><b>서면 그루브앤스팟, 부산 부산진구 중앙대로680번가길 52</b></p>
<p>用Kakao T App叫车最方便。</p>`],
        ['开车来的话', `<p>夜店没有专用停车场，需要使用西面站附近的停车场。如果要喝酒，请把车留下，坐地铁或打车过来。</p>`],
        ['回酒店建议打车', `<p>釜山地铁大约午夜停运，而夜店周日至周四营业到次日6:00，周五、周六及节假日前夜营业到次日7:00。玩到很晚的话，回程请打算打车（Kakao T）。</p>`],
        ['出发前确认清单', `<ul><li>免费入场，按韩国年份计算19岁以上 —— ${BY}年及以前出生</li><li>必须携带护照原件，照片和复印件无效</li><li>运动服、拖鞋和过于随意的穿着可能被拒绝入场 → <a href="%%a:seomyeon-club-dress-code-id%%">着装与证件攻略</a></li><li>开门时间：周日至周四21:30，周五、周六及节假日前夜21:00</li><li>今晚的DJ阵容每天下午更新在<a href="%%events%%">活动页面</a></li><li>更多问题见<a href="%%a:busan-club-foreigners-faq%%">外国游客常见问题</a></li></ul>`],
      ],
    },
  },
  {
    slug: 'busan-club-alone-solo-bar',
    date: '2026-11-19',
    ko: {
      t: '부산 클럽 혼자 가도 될까? 서면 혼술바 H석 혼자 놀기 가이드',
      s: '혼자 클럽 가도 괜찮을까? 서면 그루브앤스팟 2층 혼술바존 H석(H1–H32), 입장 무료·연 나이 19세·실물 신분증, 칵테일 6,000원부터 바 메뉴 가격, 층 이동과 귀가 팁까지.',
      h1: '부산 서면 클럽, 혼자 가도 괜찮아요',
      lede: '"혼자 클럽 가면 이상하지 않을까?" 걱정하지 않아도 돼요. 그루브앤스팟 2층에는 혼자 와도 편하게 앉을 수 있는 혼술바존이 있습니다. 혼자 가는 날 알아 두면 좋은 것만 모았어요.',
      secs: [
        ['한눈에 보기', `<ul><li>혼자 와도 OK — 2층 혼술바존 H석(H1–H32, 32석)</li><li>입장료 무료, 예약 없이도 입장 가능 (금·토는 게스트리스트 추천)</li><li>연 나이 19세 이상(${BY}년생까지), 실물 신분증 필수 · 외국인은 여권 원본</li><li>바 메뉴: 칵테일 6,000–10,000원 · 샷 6,000원부터 · 병맥주 8,000–10,000원</li><li>영업: 일–목 21:30–06:00 · 금·토·공휴일 전날 21:00–07:00</li></ul>`],
        ['혼자라면 2층 혼술바존 H석', `<p>2층 GROOVE에는 혼자 와도 편한 <b>혼술바존</b>이 있어요. 자리 번호는 <b>H1부터 H32까지, 모두 32석</b>이에요. 힙합·R&B를 들으며 한 잔 하기 좋은 자리입니다.</p>
<p>2층에는 다트도 있어서 음악 사이사이 즐길 거리가 있어요. 층 전체 배치는 <a href="%%floors%%">플로어 안내</a>의 테이블 배치도에서 볼 수 있어요.</p>`],
        ['H존 자리를 미리 말해 두려면', `<p>예약 없이 와도 됩니다. 다만 금·토요일이나 게스트 DJ 날은 미리 예약하는 걸 추천해요. <a href="%%reserve%%">예약 페이지</a>에서 예약 종류를 <b>'혼술 H존'</b>으로 골라 남기면 되고, WhatsApp·인스타그램 DM(@groovenspot)이나 전화 0507-1301-5970으로도 문의할 수 있어요.</p>`],
        ['입구에서: 신분증 하나면 돼요', `<ul><li>입장료는 없어요.</li><li>연 나이 19세 이상 — 올해는 ${BY}년생까지 들어올 수 있어요.</li><li>주민등록증·운전면허증·여권 같은 실물 신분증이 꼭 필요해요. 휴대폰 사진이나 사본은 안 되고, 외국인은 여권 원본이에요.</li><li>트레이닝복, 슬리퍼·스포츠 샌들, 과도한 캐주얼은 입장이 제한될 수 있어요.</li></ul>
<p>자세한 기준은 <a href="%%a:seomyeon-club-dress-code-id%%">드레스코드·신분증 정리</a>를 보세요.</p>`],
        ['바에서 한 잔씩 주문하기', `<p>혼자라면 바틀보다 바 메뉴로 한 잔씩 마시는 게 부담이 적어요. 가격은 원화, 부가세 포함이고 현장 사정에 따라 바뀔 수 있어요.</p>
<ul><li>칵테일: 보드카토닉·진토닉·럼콕 6,000원, 잭콕·제임슨 진저엘 8,000원, 롱아일랜드 아이스티 10,000원</li><li>샷·밤: 예거샷·예거밤·보드카샷 6,000원, 잭샷 7,000원</li><li>병맥주: 호가든 8,000원, 버드와이저·코로나 9,000원, 스텔라·기네스 10,000원</li><li>무알콜: 자몽주스 7,000원, 신데렐라 8,000원, 카스 제로 9,000원</li></ul>
<p>메뉴에 없는 칵테일·슈터·밤은 직원에게 물어보고, 주문지는 바텐더에게 주면 돼요. 전체 가격은 <a href="%%menu%%">메뉴 페이지</a>에 있어요.</p>`],
        ['혼자서 두 층 다 즐기기', `<p>입장료 없이 두 층을 모두 오갈 수 있어요. 두 층은 건물 안 계단으로 이어져 있습니다.</p>
<ul><li><b>2층 GROOVE</b>: 힙합·R&B · 혼술바존 H석 · 다트</li><li><b>3층 SPOT</b>: 대형 사운드의 EDM · 메인 스테이지 앞 L석 · 포토존 · 흡연실</li></ul>
<p>흡연은 3층 흡연실에서만 가능해요. 어느 층이 맞을지 고민된다면 <a href="%%a:busan-club-hiphop-vs-edm-floor%%">2층 힙합 vs 3층 EDM 비교</a>를 참고하세요.</p>`],
        ['몇 시에 갈까', `<p>문은 일–목 21:30, 금·토·공휴일 전날 21:00에 열어요. 그날 어떤 DJ가 몇 시에 나오는지는 매일 오후 <a href="%%events%%">이벤트 페이지</a>와 인스타그램 @groovenspot 스토리에 올라와요. 좋아하는 DJ 시간에 맞춰 오면 혼자서도 지루할 틈이 없어요.</p>`],
        ['혼자여도 안심하고 놀려면', `<ul><li>서로 존중하는 플로어예요. 불쾌한 일이 생기면 바로 직원에게 알려 주세요.</li><li>물건을 잃어버렸다면 홈페이지 분실물 페이지를 확인하세요. 클럽에서 찾은 물건을 날짜별로 사진과 함께 올려요. 본인 물건이 보이면 전화나 인스타그램 DM으로 날짜와 사진을 알려 주세요. 본인 확인 후 매장에서 돌려드려요.</li><li>부산 지하철은 자정 무렵 끊기니, 늦게까지 논다면 귀가는 택시(카카오T)로 생각해 두세요. 오는 길은 <a href="%%a:how-to-get-to-seomyeon-club%%">부산역·해운대·김해공항에서 서면 가는 법</a>에 정리했어요.</li></ul>`],
      ],
    },
    en: {
      t: 'Going Clubbing Alone in Busan: Solo Night Out Guide (Seomyeon)',
      s: 'Solo in Busan and want a night out? Groove & Spot in Seomyeon has a 32-seat solo bar (H seats) on 2F, free entry, cocktails from ₩6,000 and two floors of hip-hop and EDM. What to know before you go alone.',
      h1: 'Going clubbing alone in Busan: a solo night out in Seomyeon',
      lede: "Traveling solo, or just nobody free tonight? Going to a club alone in Busan is no big deal — Groove & Spot has a solo bar on 2F that's easy to settle into when you come on your own. Here's what to know before you go.",
      secs: [
        ['Quick answers', `<ul><li>Yes, you can go alone — 2F has a solo bar with 32 seats (H1–H32)</li><li>Entry is free and walk-ins are welcome (guest list recommended on Fridays and Saturdays)</li><li>19+ by Korean year-age (born in ${BY} or earlier); foreigners need an original passport</li><li>Bar menu: cocktails ₩6,000–₩10,000 · shots from ₩6,000 · bottled beer ₩8,000–₩10,000</li><li>Hours: Sun–Thu 9:30 PM – 6 AM · Fri, Sat & nights before holidays 9 PM – 7 AM</li></ul>`],
        ['The solo bar on 2F (H seats)', `<p>On 2F GROOVE there's a <b>solo bar</b> that's easy if you come alone — seats <b>H1 to H32</b>, 32 in total. It's a good spot to sit with a drink while the hip-hop and R&B plays.</p>
<p>2F also has darts, so there's something to do between songs. You can see where everything is on the table layout on our <a href="%%floors%%">floors page</a>.</p>`],
        ['Want an H seat held for you?', `<p>Walk-ins are fine. On Fridays, Saturdays and guest DJ nights, though, we recommend booking ahead: choose <b>"Solo bar H"</b> as the booking type on our <a href="%%reserve%%">booking page</a>, message us on WhatsApp or Instagram (@groovenspot), or call +82-507-1301-5970.</p>`],
        ['At the door: just bring your ID', `<ul><li>No cover charge.</li><li>19+ by Korean year-age — this year, anyone born in ${BY} or earlier.</li><li>Physical ID only: foreigners need their original passport. Photos on your phone and copies are not accepted.</li><li>Tracksuits, slippers, sports sandals and overly casual outfits may be refused.</li></ul>
<p>Details in our <a href="%%a:seomyeon-club-dress-code-id%%">dress code & ID guide</a>.</p>`],
        ['Ordering at the bar', `<p>On your own, ordering one drink at a time from the bar menu is the easy way to go. Prices are in Korean won with VAT included and may change on site.</p>
<ul><li>Cocktails: vodka tonic, gin tonic, rum & coke ₩6,000 · Jack & coke, Jameson ginger ale ₩8,000 · Long Island iced tea ₩10,000</li><li>Shots & bombs: Jäger shot, Jäger bomb, vodka shot ₩6,000 · Jack shot ₩7,000</li><li>Bottled beer: Hoegaarden ₩8,000 · Budweiser, Corona ₩9,000 · Stella, Guinness ₩10,000</li><li>Non-alcoholic: grapefruit juice ₩7,000 · Cinderella ₩8,000 · Cass Zero ₩9,000</li></ul>
<p>Want a cocktail, shooter or bomb that isn't listed? Ask the staff, and hand your order slip to the bartender. Full prices are on our <a href="%%menu%%">menu page</a>.</p>`],
        ['Two floors, one free entry', `<p>You can move between both floors at no extra cost — they're connected by stairs inside the building.</p>
<ul><li><b>2F GROOVE</b>: hip-hop & R&B · solo bar (H seats) · darts</li><li><b>3F SPOT</b>: EDM on a big-room sound system · L seats facing the main stage · photo zone · smoking room</li></ul>
<p>Smoking is only allowed in the 3F smoking room. Not sure which floor is for you? Read <a href="%%a:busan-club-hiphop-vs-edm-floor%%">hip-hop (2F) vs EDM (3F)</a>.</p>`],
        ['When to go', `<p>Doors open at 9:30 PM Sunday to Thursday and 9 PM on Fridays, Saturdays and nights before holidays. Every afternoon, the night's DJ timetable goes up on our <a href="%%events%%">events page</a> and Instagram stories (@groovenspot) — pick a DJ you like and time your arrival to their set.</p>`],
        ['Feeling at ease on your own', `<ul><li>Respect each other on the floor. If anything feels wrong, tell our staff right away.</li><li>Lost something? Items found at the club are posted by date, with photos, on our Lost & Found page. If you see yours, send us the date and the photo by phone or Instagram DM — we return it at the club after checking your ID.</li><li>The metro stops around midnight, so if you're out late, plan on a taxi (Kakao T) back to your hotel. Getting here: <a href="%%a:how-to-get-to-seomyeon-club%%">how to get to Seomyeon from Busan Station, Haeundae and Gimhae Airport</a>.</li></ul>`],
      ],
    },
    ja: {
      t: '釜山のクラブに一人で行っても大丈夫？西面の一人飲みH席ガイド',
      s: '一人でクラブに行っても大丈夫？釜山・西面Groove & Spotの2階には一人飲みバー（H1–H32、全32席）。入場無料、19歳ルール、パスポート、カクテル6,000ウォン〜のバーメニュー、フロア移動と帰り方まで。',
      h1: '釜山・西面のクラブは一人でも楽しめます',
      lede: '「一人でクラブって浮かない？」と心配しなくて大丈夫。Groove & Spotの2階には、一人でも気軽に座れる一人飲みバーがあります。一人で行く日に知っておきたいことをまとめました。',
      secs: [
        ['ひと目でわかるポイント', `<ul><li>一人でもOK — 2階に一人飲みバー（H1–H32、全32席）</li><li>入場無料、予約なしでも入場可（金・土曜はゲストリストがおすすめ）</li><li>韓国の数え方で19歳以上（${BY}年生まれまで）、外国人はパスポート原本</li><li>バーメニュー：カクテル6,000〜10,000ウォン・ショット6,000ウォン〜・瓶ビール8,000〜10,000ウォン</li><li>営業：日〜木 21:30–翌6:00・金土・祝前日 21:00–翌7:00</li></ul>`],
        ['一人なら2階の一人飲みバー（H席）へ', `<p>2階GROOVEには、一人でも気軽な<b>一人飲みバー</b>があります。席番号は<b>H1〜H32の全32席</b>。ヒップホップやR&Bを聴きながら一杯やるのにぴったりです。</p>
<p>2階にはダーツもあるので、曲の合間の楽しみもあります。フロア全体の配置は<a href="%%floors%%">フロア案内</a>のテーブル配置図で確認できます。</p>`],
        ['H席をお願いしておきたいなら', `<p>予約なしでも入れます。ただ、金・土曜やゲストDJの日は事前の予約がおすすめです。<a href="%%reserve%%">予約ページ</a>で予約の種類を<b>「一人飲みH席」</b>にしてリクエストするか、WhatsApp・InstagramのDM（@groovenspot）、電話（+82-507-1301-5970）でお問い合わせください。</p>`],
        ['入口では身分証だけ', `<ul><li>入場料はかかりません。</li><li>韓国の数え方で19歳以上 — 今年は${BY}年生まれまで入場できます。</li><li>実物の身分証が必須です。外国人はパスポート原本で、スマホの写真やコピーは使えません。</li><li>ジャージ、スリッパ・スポーツサンダル、カジュアルすぎる服装はお断りする場合があります。</li></ul>
<p>詳しくは<a href="%%a:seomyeon-club-dress-code-id%%">ドレスコード・身分証まとめ</a>へ。</p>`],
        ['バーで一杯ずつ注文', `<p>一人なら、ボトルよりバーメニューで一杯ずつ頼むのが気軽です。料金は韓国ウォン・税込で、現場の事情により変わる場合があります。</p>
<ul><li>カクテル：ウォッカトニック・ジントニック・ラムコーク6,000ウォン、ジャックコーク・ジェムソンジンジャーエール8,000ウォン、ロングアイランドアイスティー10,000ウォン</li><li>ショット・ボム：イエーガーショット・イエーガーボム・ウォッカショット6,000ウォン、ジャックショット7,000ウォン</li><li>瓶ビール：ヒューガルデン8,000ウォン、バドワイザー・コロナ9,000ウォン、ステラ・ギネス10,000ウォン</li><li>ノンアルコール：グレープフルーツジュース7,000ウォン、シンデレラ8,000ウォン、カスゼロ9,000ウォン</li></ul>
<p>メニューにないカクテル・ショット・ボムはスタッフにお尋ねください。注文用紙はバーテンダーに渡します。全料金は<a href="%%menu%%">メニューページ</a>にあります。</p>`],
        ['一人で2フロアを楽しむ', `<p>入場料なしで2つのフロアを行き来できます。フロアは館内の階段でつながっています。</p>
<ul><li><b>2階 GROOVE</b>：ヒップホップ・R&B／一人飲みバー（H席）／ダーツ</li><li><b>3階 SPOT</b>：大型サウンドのEDM／メインステージ前のL席／フォトゾーン／喫煙室</li></ul>
<p>喫煙は3階の喫煙室のみです。どちらのフロアが合うか迷ったら<a href="%%a:busan-club-hiphop-vs-edm-floor%%">2階ヒップホップ vs 3階EDM</a>もどうぞ。</p>`],
        ['何時に行く？', `<p>日〜木曜は21:30、金・土曜と祝前日は21:00オープン。その日のDJと出演時間は毎日午後に<a href="%%events%%">イベントページ</a>とInstagram（@groovenspot）のストーリーで公開します。好きなDJの時間に合わせて行けば、一人でも退屈しません。</p>`],
        ['一人でも安心して遊ぶために', `<ul><li>お互いを尊重するフロアです。何かあればすぐスタッフへ。</li><li>忘れ物をしたら、サイトの忘れ物ページを確認してください。クラブで見つかった物を日付ごとに写真で掲載しています。ご自身の物があれば、電話またはInstagramのDMで日付と写真をお知らせください。本人確認のうえ店舗でお返しします。</li><li>釜山の地下鉄は深夜0時ごろ終わるので、遅くなったら帰りはタクシー（Kakao T）で。来るときのルートは<a href="%%a:how-to-get-to-seomyeon-club%%">釜山駅・海雲台・金海空港から西面への行き方</a>にまとめています。</li></ul>`],
      ],
    },
    zh: {
      t: '一个人去釜山夜店可以吗？西面单人吧台H座独自玩攻略',
      s: '一个人去夜店也没问题。釜山西面Groove & Spot的2楼有单人吧台（H1–H32，共32座）。免费入场、19岁规定、护照、鸡尾酒6,000韩元起的吧台酒水、换楼层和回酒店，一篇看懂。',
      h1: '一个人也能玩：釜山西面夜店独自攻略',
      lede: '"一个人去夜店会不会很尴尬？"完全不用担心。Groove & Spot的2楼有一个人来也能轻松坐的单人吧台。一个人去之前需要知道的事，都整理在这里。',
      secs: [
        ['重点一览', `<ul><li>一个人来没问题 —— 2楼有单人吧台（H1–H32，共32座）</li><li>免费入场，不预约也可以直接来（周五、周六建议登记宾客名单）</li><li>按韩国年份计算19岁以上（${BY}年及以前出生），外国游客请带护照原件</li><li>吧台酒水：鸡尾酒6,000–10,000韩元 · 子弹杯6,000韩元起 · 瓶装啤酒8,000–10,000韩元</li><li>营业：周日至周四 21:30–次日6:00 · 周五、周六及节假日前夜 21:00–次日7:00</li></ul>`],
        ['一个人就去2楼单人吧台（H座）', `<p>2楼GROOVE有一个人来也能轻松坐的<b>单人吧台</b>，座位号<b>H1到H32，共32个</b>。边听嘻哈和R&B边喝一杯，正合适。</p>
<p>2楼还有飞镖，歌与歌之间也有得玩。整层的布局可以在<a href="%%floors%%">楼层介绍</a>的桌位分布图里查看。</p>`],
        ['想提前留H座？', `<p>不预约也可以直接来。不过周五、周六和客座DJ之夜建议提前预约：在<a href="%%reserve%%">预约页面</a>把预约类型选为<b>"单人吧台H"</b>提交，或者通过WhatsApp、Instagram私信（@groovenspot）、电话（+82-507-1301-5970）联系我们。</p>`],
        ['入口：带好证件就行', `<ul><li>不收门票。</li><li>按韩国年份计算19岁以上 —— 今年${BY}年及以前出生可以入场。</li><li>只认实体证件，外国游客请带护照原件，手机照片和复印件都不行。</li><li>运动服、拖鞋和运动凉鞋、过于随意的穿着可能被拒绝入场。</li></ul>
<p>详情见<a href="%%a:seomyeon-club-dress-code-id%%">着装与证件攻略</a>。</p>`],
        ['在吧台一杯一杯点', `<p>一个人的话，比起整瓶，在吧台一杯一杯点更轻松。价格以韩元计，含增值税，以现场为准。</p>
<ul><li>鸡尾酒：伏特加汤力、金汤力、朗姆可乐6,000韩元；杰克可乐、尊美醇姜汁汽水8,000韩元；长岛冰茶10,000韩元</li><li>子弹杯·炸弹酒：野格子弹杯、野格炸弹、伏特加子弹杯6,000韩元；杰克丹尼子弹杯7,000韩元</li><li>瓶装啤酒：福佳白8,000韩元；百威、科罗娜9,000韩元；时代、健力士10,000韩元</li><li>无酒精：西柚汁7,000韩元；灰姑娘（Cinderella）8,000韩元；Cass Zero 9,000韩元</li></ul>
<p>菜单上没有的鸡尾酒、子弹杯、炸弹酒可以问工作人员，点单纸请交给调酒师。完整价格见<a href="%%menu%%">酒水单页面</a>。</p>`],
        ['一个人玩转两层', `<p>不用另付门票，两层都可以随意去，楼内有楼梯相通。</p>
<ul><li><b>2楼 GROOVE</b>：嘻哈、R&B · 单人吧台（H座）· 飞镖</li><li><b>3楼 SPOT</b>：大型音响的EDM · 主舞台前L座 · 拍照区 · 吸烟室</li></ul>
<p>只能在3楼吸烟室吸烟。不知道哪层适合自己？看看<a href="%%a:busan-club-hiphop-vs-edm-floor%%">2楼嘻哈 vs 3楼EDM</a>。</p>`],
        ['几点去？', `<p>周日至周四21:30开门，周五、周六及节假日前夜21:00开门。当晚哪位DJ几点上场，每天下午会发布在<a href="%%events%%">活动页面</a>和Instagram（@groovenspot）快拍。挑一位喜欢的DJ按时间过来，一个人也不会无聊。</p>`],
        ['一个人也玩得安心', `<ul><li>请彼此尊重。遇到任何不舒服的情况，请马上告诉工作人员。</li><li>丢了东西，请看网站的失物招领页面：在店里捡到的失物会按日期附照片公布。看到自己的东西，请通过电话或Instagram私信告诉我们日期和照片，核实身份后在店内归还。</li><li>釜山地铁大约午夜停运，玩到很晚的话回程请打车（Kakao T）。怎么过来请看<a href="%%a:how-to-get-to-seomyeon-club%%">从釜山站、海云台、金海机场去西面的交通攻略</a>。</li></ul>`],
      ],
    },
  },
];
