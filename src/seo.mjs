// 검색 결과용 <title>·<meta description>. 페이지 안 제목(h1)은 i18n.mjs 의 page.*.t 를 그대로 쓴다.
// layout() 이 제목 뒤에 " · Groove & Spot" 을 붙인다.

export const SEO = {
  ko: {
    'events/': { t: '부산 서면 클럽 이벤트 일정 · 오늘 밤 DJ 라인업', s: '부산 서면 클럽 그루브앤스팟의 파티 일정과 오늘 밤 DJ 타임테이블. 2층 힙합·3층 EDM, 입장 무료, 서면역 3번 출구 도보 3분.' },
    'floors/': { t: '2층 힙합 · 3층 EDM 플로어 안내 | 부산 서면 클럽', s: '한 건물에 두 개의 무대. 2층 GROOVE는 힙합·R&B와 혼술바 H석, 3층 SPOT은 대형 사운드 EDM과 포토존·흡연실.' },
    'menu/': { t: '부산 서면 클럽 메뉴 · 바틀 가격표 (2층·3층)', s: '그루브앤스팟 2층·3층 바틀 세트와 샴페인·양주 가격, 칵테일·슈터·맥주 바 메뉴. 원화·부가세 포함 가격.' },
    'gallery/': { t: '부산 서면 클럽 파티 사진첩', s: '부산 서면 클럽 그루브앤스팟의 파티 사진을 날짜별로 모았어요. 할로윈·테마 파티·게스트 DJ 나이트.' },
    'artists/': { t: '부산 클럽 DJ 라인업 · 레지던트 & 게스트 DJ', s: '부산 서면 클럽 그루브앤스팟 무대에 서는 레지던트 DJ와 게스트 DJ. 2층 힙합, 3층 EDM 라이브셋.' },
    'reserve/': { t: '부산 서면 클럽 테이블 예약 · 게스트리스트', s: '부산 서면 클럽 그루브앤스팟 테이블·바틀 세트·게스트리스트 예약. 남겨 주시면 담당 매니저가 확인 후 연락드려요.' },
    'info/': { t: '부산 서면 클럽 위치 · 영업시간 · 입장 안내 FAQ', s: '서면역 3번 출구 도보 3분. 일–목 21:30–06:00, 금·토 21:00–07:00, 입장 무료, 연 나이 19세 이상, 드레스코드와 자주 묻는 질문.' },
    'request/': { t: 'DJ 신청곡 보내기 | 부산 서면 클럽', s: '오늘 밤 그루브앤스팟 DJ에게 듣고 싶은 곡을 보내 주세요. 2층 힙합·3층 EDM 어느 층이든 신청할 수 있어요.' },
  },
  en: {
    'events/': { t: "Busan Club Events & Tonight's DJ Lineup", s: "Party calendar and tonight's DJ timetable at Groove & Spot, Seomyeon, Busan. 2F hip-hop, 3F EDM, free entry, 3 min from Seomyeon Station Exit 3." },
    'floors/': { t: 'Hip-hop & EDM Club Floors in Seomyeon, Busan', s: 'One building, two stages. 2F GROOVE: hip-hop & R&B with a solo bar. 3F SPOT: big-room EDM with a photo zone and smoking room.' },
    'menu/': { t: 'Busan Club Drink Menu & Bottle Prices', s: 'Bottle sets, champagne and spirits prices for 2F and 3F, plus cocktails, shooters and beer at Groove & Spot. Prices in KRW, VAT included.' },
    'gallery/': { t: 'Busan Nightclub Party Photos', s: 'Photos from parties at Groove & Spot, a two-floor club in Seomyeon, Busan — Halloween, theme nights and guest DJ nights.' },
    'artists/': { t: 'Busan Club DJs: Residents & Guest DJs', s: 'Resident and guest DJs playing Groove & Spot in Seomyeon, Busan. Hip-hop on 2F, EDM on 3F, with full live sets on YouTube.' },
    'reserve/': { t: 'Book a Table or Guest List at a Busan Nightclub', s: 'Book a table, bottle set or guest list at Groove & Spot, Seomyeon, Busan. Send your details and our manager will get back to you.' },
    'info/': { t: 'Busan Nightclub Location, Hours & FAQ (Seomyeon)', s: '3 min from Seomyeon Station Exit 3. Sun–Thu 9:30 PM–6 AM, Fri–Sat 9 PM–7 AM. Free entry, 19+ with passport, dress code and FAQ.' },
    'request/': { t: 'Send a Song Request to the DJ | Busan Club', s: "Tell tonight's DJ at Groove & Spot what you want to hear — hip-hop on 2F or EDM on 3F." },
  },
  ja: {
    'events/': { t: '釜山・西面クラブのイベント・今夜のDJラインナップ', s: '釜山・西面のクラブGroove & Spotのパーティー日程と今夜のDJタイムテーブル。2階ヒップホップ・3階EDM、入場無料、西面駅3番出口から徒歩3分。' },
    'floors/': { t: '2階ヒップホップ・3階EDM｜釜山・西面のクラブ', s: '一つのビルに二つのステージ。2階GROOVEはヒップホップ・R&Bとソロバー、3階SPOTはビッグルームEDMとフォトゾーン・喫煙室。' },
    'menu/': { t: '釜山クラブのドリンクメニュー・ボトル料金', s: 'Groove & Spot 2階・3階のボトルセット、シャンパン・洋酒の料金と、カクテル・シューター・ビールのバーメニュー。ウォン・税込。' },
    'gallery/': { t: '釜山・西面クラブのパーティー写真', s: '釜山・西面の2フロアクラブGroove & Spotのパーティー写真。ハロウィン、テーマパーティー、ゲストDJナイト。' },
    'artists/': { t: '釜山クラブのDJ：レジデント・ゲストDJ', s: '釜山・西面のGroove & Spotでプレイするレジデント・ゲストDJ。2階ヒップホップ、3階EDM。ライブセットはYouTubeで。' },
    'reserve/': { t: '釜山クラブのテーブル予約・ゲストリスト', s: '釜山・西面のGroove & Spotでテーブル、ボトルセット、ゲストリストを予約。情報を送ると担当マネージャーから連絡します。' },
    'info/': { t: '釜山・西面クラブのアクセス・営業時間・FAQ', s: '西面駅3番出口から徒歩3分。日〜木21:30–6:00、金・土21:00–7:00。入場無料、19歳以上・パスポート必須、ドレスコードとよくある質問。' },
    'request/': { t: 'DJにリクエスト曲を送る｜釜山のクラブ', s: '今夜のGroove & SpotのDJに聴きたい曲を送ってください。2階ヒップホップ、3階EDMどちらでもOK。' },
  },
  zh: {
    'events/': { t: '釜山西面夜店活动与今晚DJ阵容', s: '釜山西面夜店Groove & Spot的派对日程和今晚DJ时间表。2楼嘻哈、3楼EDM，免费入场，西面站3号出口步行3分钟。' },
    'floors/': { t: '2楼嘻哈·3楼EDM｜釜山西面夜店', s: '一栋楼两个舞台。2楼GROOVE是嘻哈·R&B和单人吧台，3楼SPOT是大场EDM，有拍照区和吸烟室。' },
    'menu/': { t: '釜山夜店酒水单与酒套餐价格', s: 'Groove & Spot 2楼·3楼的酒套餐、香槟和洋酒价格，以及鸡尾酒、Shot和啤酒吧台菜单。韩元计价，含税。' },
    'gallery/': { t: '釜山西面夜店派对照片', s: '釜山西面两层夜店Groove & Spot的派对照片：万圣节、主题派对和客座DJ之夜。' },
    'artists/': { t: '釜山夜店DJ：驻场与客座DJ', s: '在釜山西面Groove & Spot演出的驻场DJ和客座DJ。2楼嘻哈，3楼EDM，完整现场DJ Set可在YouTube观看。' },
    'reserve/': { t: '釜山夜店订台与宾客名单预约', s: '在釜山西面Groove & Spot预订卡座、酒套餐或宾客名单。留下信息后，负责经理会联系你。' },
    'info/': { t: '釜山西面夜店位置、营业时间与常见问题', s: '西面站3号出口步行3分钟。周日至周四21:30–6:00，周五、周六21:00–7:00。免费入场，19岁以上需带护照，着装要求和常见问题。' },
    'request/': { t: '给DJ点歌｜釜山夜店', s: '把你想听的歌发给今晚Groove & Spot的DJ，2楼嘻哈或3楼EDM都可以。' },
  },
};

// 이벤트 상세 페이지: 제목 뒤 꼬리표와 설명 꼬리말
export const SEO_EV = { ko: '부산 서면 클럽', en: 'Busan Club', ja: '釜山・西面クラブ', zh: '釜山西面夜店' };
export const EV_DESC = {
  ko: '부산 서면 클럽 그루브앤스팟 · 2층 힙합 · 3층 EDM · 입장 무료 · 서면역 3번 출구 3분',
  en: 'Groove & Spot, Seomyeon, Busan · 2F hip-hop · 3F EDM · free entry · 3 min from Seomyeon Stn Exit 3',
  ja: '釜山・西面のクラブGroove & Spot・2階ヒップホップ・3階EDM・入場無料・西面駅3番出口から3分',
  zh: '釜山西面夜店Groove & Spot · 2楼嘻哈 · 3楼EDM · 免费入场 · 西面站3号出口3分钟',
};

// 이벤트 상세 페이지 아래 "오시기 전에" 안내 (사실은 guide.mjs·i18n.mjs 와 같게)
export const EV_INFO = {
  ko: { h: '오시기 전에', rows: [['입장', '무료 · 연 나이 19세 이상 · 실물 신분증 필수 (외국인은 여권 원본)'], ['영업', '일–목 21:30–06:00 · 금·토·공휴일 전날 21:00–07:00'], ['위치', '서면역 3번 출구 도보 3분 · 2층 힙합 · 3층 EDM'], ['드레스코드', '과도한 캐주얼·트레이닝복·슬리퍼·스포츠 샌들은 입장이 제한될 수 있어요']], more: '처음이라면 읽어 보세요' },
  en: { h: 'Before you come', rows: [['Entry', 'Free · 19+ by Korean year-age · physical ID required (foreigners: original passport)'], ['Hours', 'Sun–Thu 9:30 PM – 6 AM · Fri, Sat & nights before holidays 9 PM – 7 AM'], ['Location', '3 min walk from Seomyeon Station Exit 3 · 2F hip-hop · 3F EDM'], ['Dress code', 'Overly casual wear, tracksuits, slippers and sports sandals may be refused']], more: 'First time? Read this' },
  ja: { h: '来店前に', rows: [['入場', '無料・韓国の数え方で19歳以上・実物の身分証が必須（外国人はパスポート原本）'], ['営業', '日〜木 21:30–翌6:00・金土・祝前日 21:00–翌7:00'], ['場所', '西面駅3番出口から徒歩3分・2階ヒップホップ・3階EDM'], ['ドレスコード', 'カジュアルすぎる服装、ジャージ、スリッパ・スポーツサンダルは入場をお断りする場合があります']], more: '初めての方はこちら' },
  zh: { h: '来之前', rows: [['入场', '免费 · 按韩国年份计算19岁以上 · 必须携带实体证件（外国游客请带护照原件）'], ['营业', '周日至周四 21:30–次日6:00 · 周五、周六及节假日前夜 21:00–次日7:00'], ['位置', '西面站3号出口步行3分钟 · 2楼嘻哈 · 3楼EDM'], ['着装', '过于随意的穿着、运动服、拖鞋和运动凉鞋可能会被拒绝入场']], more: '第一次来？先看这里' },
};
