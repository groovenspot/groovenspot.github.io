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
];
