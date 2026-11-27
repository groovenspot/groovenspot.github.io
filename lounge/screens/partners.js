/* 그루브 라운지 · 제휴 가게 (2026-11-26) — #/partners 목록 · #/partner/<id> 상세 · #/partner/<id>/use 혜택 쓰기
   가게 정보·혜택·사진은 홈페이지 /partners/partners.json 을 그대로 읽는다(혜택 글은 지어내지 않음).
   서버: partner_mine · partner_use (라운지 서버 partners.js). 스위치 'partners' — 꺼져 있으면 직원 계정만 미리 봄. */
(() => {
  const L = window.Lounge;
  const words = {
    title: ['제휴 가게', 'Partner places', '提携店舗', '合作商家'],
    tonight: ['제휴 가게', 'Partner places', '提携店舗', '合作商家'],
    kicker: ['그루브 라운지 회원', 'Groove Lounge members', 'Groove Lounge会員', 'Groove Lounge 会员'],
    hero: ['그루브 가기 전 1차, 끝나고 2차', 'Before Groove, after Groove', 'Grooveの前にも、あとにも', '去 Groove 前后都能享用'],
    heroSub: ['제휴 가게에서 혜택 받을 때 라운지 화면을 보여 주면 +{n}P · 그날 그루브 체크인하면 +{m}P 더', 'Show this screen when you get a partner perk: +{n}P, and +{m}P more when you check in at Groove that night', '提携店舗で特典を利用するときにこの画面を見せると+{n}P。その夜Grooveでチェックインするとさらに+{m}P。', '在合作商家使用优惠时出示此页面可获得 +{n}P，当晚在 Groove 签到还可再获 +{m}P。'],
    all: ['전체', 'All', 'すべて', '全部'],
    count: ['제휴 가게 {n}곳', '{n} partner places', '提携店舗 {n}件', '{n} 家合作商家'],
    sort: ['그루브에서 가까운 순', 'Closest to Groove', 'Grooveに近い順', '按距离 Groove 从近到远排序'],
    walk: ['도보 {n}분', '{n} min walk', '徒歩{n}分', '步行 {n} 分钟'],
    usedToday: ['오늘 씀', 'Used today', '本日利用済み', '今天已使用'],
    checking: ['혜택 확인 중', 'Perk being confirmed', '特典を確認中', '优惠确认中'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '正在加载'],
    error: ['불러오지 못했어요. 다시 시도해 주세요.', 'Could not load. Please try again.', '読み込めませんでした。もう一度お試しください。', '加载失败，请重试。'],
    retry: ['다시 시도', 'Try again', 'もう一度試す', '重试'],
    empty: ['이 분류에는 아직 가게가 없어요', 'No places in this category yet', 'このカテゴリにはまだ店舗がありません', '此分类暂无商家'],
    notFound: ['가게를 찾지 못했어요', 'Place not found', '店舗が見つかりませんでした', '未找到商家'],
    atPlace: ['이 가게에서', 'At this place', 'この店舗で', '在这家商家'],
    atGroove: ['그루브에서', 'At Groove', 'Grooveで', '在 Groove'],
    perkTitle: ['제휴 혜택', 'Partner perks', '提携特典', '合作优惠'],
    address: ['주소', 'Address', '住所', '地址'], hours: ['영업시간', 'Hours', '営業時間', '营业时间'], phone: ['전화', 'Phone', '電話', '电话'], insta: ['인스타그램', 'Instagram', 'インスタグラム', 'Instagram 主页'],
    branches: ['지점', 'Branches', '支店', '分店'],
    map: ['네이버 지도에서 보기', 'Open in Naver Map', 'Naverマップで見る', '在 Naver 地图中查看'],
    usePts: ['혜택 쓰면', 'Use a perk', '特典を利用すると', '使用优惠可得'],
    groovePts: ['그날 그루브 체크인하면', 'Check in at Groove that night', 'その夜Grooveでチェックインすると', '当晚在 Groove 签到可得'],
    plus: ['+{n}P', '+{n}P', '+{n}P', '+{n}P'], plusMore: ['+{n}P 더', '+{n}P more', 'さらに+{n}P', '额外 +{n}P'],
    use: ['가게에서 혜택 쓰기', 'Use perk at this place', 'この店舗で特典を利用する', '在这家商家使用优惠'],
    useHint: ['가게 직원 앞에서 눌러 주세요 · 10분 동안 열려요', 'Open it in front of the staff · stays open for 10 minutes', '店舗スタッフの前で開いてください。有効時間は10分です。', '请在店员面前打开，有效期为 10 分钟。'],
    usedAt: ['오늘 이미 썼어요 · {t}', 'Already used today · {t}', '本日利用済み · {t}', '今天已使用 · {t}'],
    limitHint: ['오늘은 제휴 혜택을 {n}번까지 기록할 수 있어요', 'You can log up to {n} partner perks per day', '提携特典を記録できるのは1日{n}回までです', '每天最多可记录 {n} 次合作优惠'],
    login: ['로그인하고 혜택 쓰기', 'Log in to use perks', 'ログインして特典を利用する', '登录后使用优惠'],
    passTitle: ['혜택 쓰기', 'Use perk', '特典を利用する', '使用优惠'],
    show: ['이 화면을 가게 직원에게 보여 주세요', 'Show this screen to the staff', 'この画面を店舗スタッフに見せてください', '请向店员出示此页面'],
    member: ['확인된 회원', 'Verified member', '確認済み会員', '已验证会员'],
    clock: ['지금 시각 (캡처 화면이 아닌지 확인)', 'Current time (proves this isn’t a screenshot)', '現在時刻（スクリーンショットでないことを確認）', '当前时间（用于确认页面并非截图）'],
    left: ['남은 시간 {t}', 'Time left {t}', '残り時間 {t}', '剩余时间 {t}'],
    confirm: ['가게 직원 확인 · 사용 완료', 'Staff check · Mark as used', '店舗スタッフ確認 · 利用済みにする', '店员确认并标记为已使用'],
    confirmHint: ['이 버튼은 가게 직원이 눌러요. 누르면 오늘 이 가게에서는 다시 쓸 수 없어요.', 'Staff press this button. Once used, it can’t be used here again today.', '店舗スタッフがこのボタンを押してください。確認後は本日この店舗で再利用できません。', '请由店员点击此按钮，确认后今天无法在本店再次使用优惠。'],
    sure: ['가게 직원이신가요?', 'Are you the staff?', '店舗スタッフの方ですか？', '你是这家商家的店员吗？'],
    sureBody: ['혜택을 드린 뒤 눌러 주세요. 되돌릴 수 없어요.', 'Press after giving the perk. This can’t be undone.', '特典を提供してから押してください。操作は取り消せません。', '请在提供优惠后点击，此操作无法撤销。'],
    sureOk: ['사용 완료', 'Mark as used', '利用済みにする', '标记为已使用'],
    done: ['사용 완료 · {t}', 'Used · {t}', '利用済み · {t}', '已使用 · {t}'],
    gained: ['+{n}P 받았어요', 'You earned {n}P', '+{n}Pを獲得しました', '已获得 {n}P'],
    noGain: ['오늘 받을 수 있는 포인트는 다 받았어요', 'You’ve reached today’s point limit', '本日のポイント上限に達しました', '已达到今天的积分上限'],
    grooveNext: ['오늘 그루브 체크인하면 +{n}P 더', '+{n}P more when you check in at Groove tonight', '今夜Grooveでチェックインするとさらに+{n}P', '今晚在 Groove 签到还可获得 +{n}P'],
    back: ['가게 정보로', 'Back to place', '店舗情報に戻る', '返回商家详情'],
    expired: ['10분이 지나 닫혔어요. 다시 열어 주세요.', 'This closed after 10 minutes. Open it again.', '10分が経過して閉じました。もう一度開いてください。', '页面已在 10 分钟后关闭，请重新打开。'],
    'e.closed': ['아직 준비 중이에요', 'Not available yet', '現在は利用できません', '暂未开放'],
    'e.pid': ['이 가게는 지금 혜택을 기록할 수 없어요', 'This place can’t log perks right now', 'この店舗では現在特典の利用を記録できません', '这家商家目前无法记录优惠使用情况'],
    'e.dup': ['오늘 이 가게 혜택은 이미 썼어요', 'You already used a perk here today', '今日はこの店舗の特典をすでに利用しています', '你今天已使用过这家商家的优惠'],
    'e.limit': ['오늘 기록할 수 있는 횟수를 다 썼어요', 'You’ve reached today’s limit', '本日の記録上限に達しました', '已达到今天的记录次数上限'],
    'e.network': ['연결이 불안정해요. 다시 시도해 주세요.', 'Connection problem. Please try again.', '接続が不安定です。もう一度お試しください。', '连接不稳定，请重试。'],
    'e.other': ['처리하지 못했어요. 다시 시도해 주세요.', 'Could not complete. Please try again.', '処理できませんでした。もう一度お試しください。', '操作未完成，请重试。']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [
    lang, { ...Object.fromEntries(Object.entries(words).map(([key, variants]) => ['pt.' + key, variants[index]])),
      't5.partners': words.tonight[index] }
  ])));
  const t = (key, vars) => L.esc(L.t('pt.' + key, vars));

  const CATS = { '주점·식당': 'Bars & food', '노래·룸': 'Karaoke', '숙박': 'Stay', '파티': 'Party' };
  const catLabel = c => L.esc(L.lang === 'ko' || !CATS[c] ? c : CATS[c]);
  const PASS_MS = 10 * 60e3;
  const DEFAULT_PTS = { use: 50, groove: 50 };

  // ── 데이터 ──
  let dataPromise = null;
  function load() {
    if (!dataPromise) dataPromise = fetch('/partners/partners.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(build)
      .catch(e => { dataPromise = null; throw e; });
    return dataPromise;
  }
  function asset(path) {
    if (typeof path !== 'string') return '';
    const clean = path.replace(/^\.\//, '');
    return /^assets\/[A-Za-z0-9._\/-]+$/.test(clean) && !clean.includes('..') ? '/partners/' + clean : '';
  }
  function meters(a, b) {
    const R = 6371e3, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const text = v => typeof v === 'string' ? v.trim() : '';
  function build(json) {
    const dest = json?.courseMap?.destination;
    const groove = dest && Number.isFinite(dest.lat) && Number.isFinite(dest.lng) ? dest : { lat: 35.1557643, lng: 129.0610553 };
    const locs = Array.isArray(json?.courseMap?.locations) ? json.courseMap.locations : [];
    const list = (Array.isArray(json?.partners) ? json.partners : []).filter(p => /^partner-\d{2,3}$/.test(p?.id || '')).map(p => {
      const mine = locs.filter(l => l.partnerId === p.id && Number.isFinite(l.lat) && Number.isFinite(l.lng));
      const mins = mine.map(l => Math.max(1, Math.round(meters(groove, l) * 1.3 / 70)));
      const gallery = (Array.isArray(p.gallery) ? p.gallery : []).map(g => ({ src: asset(g.path), thumb: asset(g.thumbnail) || asset(g.path), alt: text(g.alt), credit: text(g.credit) })).filter(g => g.src);
      const poster = p.poster ? { src: asset(p.poster.path), thumb: asset(p.poster.thumbnail) || asset(p.poster.path) } : null;
      const map = mine.map(l => text(l.sourceUrl)).find(u => /^https:\/\/map\.naver\.com\//.test(u)) || '';
      return {
        id: p.id, name: text(p.name), cat: text(p.category), summary: text(p.summary),
        address: text(p.address), hours: text(p.hours), phone: text(p.phone),
        insta: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(text(p.instagram)) ? text(p.instagram) : '',
        perk: text(p.partnerBenefit), groove: text(p.grooveBenefit), notes: text(p.benefitNotes),
        walk: mins.length ? Math.min(...mins) : null,
        branches: mine.length > 1 ? mine.map(l => text(l.branchName || l.name)).filter(Boolean) : [],
        gallery, thumb: gallery[0]?.thumb || poster?.thumb || '', poster: poster?.src ? poster : null, map
      };
    }).filter(p => p.name);
    list.sort((a, b) => (a.walk ?? 999) - (b.walk ?? 999) || a.name.localeCompare(b.name, 'ko'));
    return list;
  }

  // 오늘 쓴 기록 (로그인했을 때만)
  async function mine() {
    if (!L.me) await L.refreshMe?.();
    if (!L.me) return { uses: [], pts: DEFAULT_PTS, cap: null, guest: true };
    const r = await L.api('partner_mine');
    if (!r || r.error) return { uses: [], pts: DEFAULT_PTS, cap: null, error: r?.error || 'network' };
    return { uses: Array.isArray(r.uses) ? r.uses : [], pts: { ...DEFAULT_PTS, ...(r.pts || {}) }, cap: Number.isFinite(r.cap) ? r.cap : null };
  }
  const usedOf = (state, id) => state.uses.find(u => u.pid === id);
  function hhmm(at) {
    const d = new Date(typeof at === 'number' ? at : Date.parse(at));
    if (!Number.isFinite(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(d);
  }
  const errText = code => t('e.' + (['closed', 'pid', 'dup', 'limit', 'network'].includes(code) ? code : 'other'));

  function loadingView(root, title, back) {
    root.innerHTML = '<div class="pt">' + L.bar({ title, back }) + '<div data-pt-body><p class="muted pt-state" role="status">' + t('loading') + '</p></div></div>';
    return root.querySelector('[data-pt-body]');
  }
  function failView(body, again) {
    body.innerHTML = '<div class="pt-state" role="status"><p>' + t('error') + '</p><button type="button" class="btn">' + t('retry') + '</button></div>';
    body.querySelector('button').onclick = again;
  }
  const chev = () => L.icon('chevron', { size: 20 });
  function thumb(p, cls) {
    return p.thumb ? '<img class="' + cls + '" src="' + L.esc(p.thumb) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="' + cls + ' pt-thumb-empty" aria-hidden="true">' + L.esc(p.name.slice(0, 1)) + '</span>';
  }

  // ── ① 목록 ──
  let pickedCat = '';
  async function renderList(root) {
    const body = loadingView(root, L.t('pt.title'), 'tonight');
    let list, state;
    try { [list, state] = await Promise.all([load(), mine()]); }
    catch { return failView(body, () => renderList(root)); }
    if (!body.isConnected) return;
    const cats = [...new Set(list.map(p => p.cat).filter(Boolean))];
    if (pickedCat && !cats.includes(pickedCat)) pickedCat = '';
    const paint = () => {
      const shown = list.filter(p => !pickedCat || p.cat === pickedCat);
      body.innerHTML = '<section class="pt-hero"><p class="pt-kicker">' + t('kicker') + '</p><h2>' + t('hero') + '</h2><p>' +
        t('heroSub', { n: state.pts.use, m: state.pts.groove }) + '</p></section>' +
        '<div class="pt-chips" role="group" aria-label="' + t('title') + '">' +
        [['', t('all'), list.length], ...cats.map(c => [c, catLabel(c), list.filter(p => p.cat === c).length])].map(([key, label, n]) =>
          '<button type="button" class="pt-chip" data-cat="' + L.esc(key) + '" aria-pressed="' + (key === pickedCat) + '">' + label + ' ' + n + '</button>').join('') +
        '</div><div class="pt-meta"><span>' + t('count', { n: shown.length }) + '</span><span>' + t('sort') + '</span></div>' +
        (shown.length ? '<ul class="pt-list">' + shown.map(p => {
          const used = usedOf(state, p.id);
          return '<li><a class="pt-card" href="#/partner/' + encodeURIComponent(p.id) + '">' + thumb(p, 'pt-thumb') +
            '<span class="pt-card-main"><span class="pt-card-top"><strong>' + L.esc(p.name) + '</strong><small>' + catLabel(p.cat) +
            (p.walk ? ' · ' + t('walk', { n: p.walk }) : '') + '</small>' + (used ? '<em class="pt-used">' + t('usedToday') + '</em>' : '') + '</span>' +
            '<span class="pt-card-perk' + (p.perk ? '' : ' is-wait') + '">' + (p.perk ? L.esc(p.perk) : t('checking')) + '</span>' +
            (p.hours ? '<span class="pt-card-hours">' + L.esc(p.hours) + '</span>' : '') + '</span>' + chev() + '</a></li>';
        }).join('') + '</ul>' : '<p class="muted pt-state">' + t('empty') + '</p>');
      body.querySelectorAll('[data-cat]').forEach(btn => btn.onclick = () => { pickedCat = btn.dataset.cat; paint(); });
    };
    paint();
    L.restoreScroll?.();
  }

  // ── ② 상세 ──
  async function renderDetail(root, id) {
    const body = loadingView(root, L.t('pt.title'), 'partners');
    let list, state;
    try { [list, state] = await Promise.all([load(), mine()]); }
    catch { return failView(body, () => renderDetail(root, id)); }
    if (!body.isConnected) return;
    const p = list.find(x => x.id === id);
    if (!p) { body.innerHTML = '<p class="muted pt-state">' + t('notFound') + '</p>'; return; }
    root.querySelector('.ui-bar-title h1').textContent = p.name;
    document.title = p.name;
    const used = usedOf(state, p.id);
    const photos = p.gallery.length ? p.gallery : p.poster ? [{ src: p.poster.src, thumb: p.poster.thumb, alt: p.name, credit: '' }] : [];
    const credit = [...new Set(photos.map(g => g.credit).filter(Boolean))].join(' · ');
    const row = (label, value) => value ? '<div class="pt-row"><dt>' + label + '</dt><dd>' + value + '</dd></div>' : '';
    const tel = p.phone.replace(/[^\d+]/g, '');
    body.innerHTML =
      (photos.length ? '<div class="pt-photos">' + photos.map(g => '<img src="' + L.esc(g.thumb || g.src) + '" alt="' + L.esc(g.alt || p.name) + '" loading="lazy" decoding="async">').join('') + '</div>' +
        (credit ? '<p class="pt-credit">' + L.esc(credit) + '</p>' : '') : '') +
      '<div class="pt-head"><div class="pt-tags"><span>' + catLabel(p.cat) + '</span>' + (p.walk ? '<span>' + t('walk', { n: p.walk }) + '</span>' : '') +
      (used ? '<span class="is-used">' + t('usedToday') + '</span>' : '') + '</div><h2>' + L.esc(p.name) + '</h2>' +
      (p.summary ? '<p class="muted">' + L.esc(p.summary) + '</p>' : '') + '</div>' +
      '<section class="pt-perks" aria-label="' + t('perkTitle') + '"><p class="pt-kicker">' + t('perkTitle') + '</p>' +
      '<div class="pt-perk"><span>' + t('atPlace') + '</span><strong>' + (p.perk ? L.esc(p.perk) : t('checking')) + '</strong></div>' +
      '<div class="pt-perk"><span>' + t('atGroove') + '</span><strong>' + (p.groove ? L.esc(p.groove) : t('checking')) + '</strong></div>' +
      (p.notes ? '<p class="pt-notes">' + L.esc(p.notes) + '</p>' : '') + '</section>' +
      '<div class="pt-pts"><div><span>' + t('usePts') + '</span><strong>' + t('plus', { n: state.pts.use }) + '</strong></div>' +
      '<div><span>' + t('groovePts') + '</span><strong class="is-s">' + t('plusMore', { n: state.pts.groove }) + '</strong></div></div>' +
      '<dl class="pt-info">' + row(t('address'), L.esc(p.address)) + row(t('hours'), L.esc(p.hours)) +
      row(t('phone'), tel ? '<a href="tel:' + L.esc(tel) + '">' + L.esc(p.phone) + '</a>' : '') +
      row(t('insta'), p.insta ? '<a href="' + L.esc(p.insta) + '" target="_blank" rel="noopener noreferrer">@' + L.esc(p.insta.replace(/\/$/, '').split('/').pop()) + '</a>' : '') +
      row(t('branches'), L.esc(p.branches.join(' · '))) + '</dl>' +
      (p.map ? '<a class="btn pt-map" href="' + L.esc(p.map) + '" target="_blank" rel="noopener noreferrer">' + t('map') + '</a>' : '') +
      '<div class="pt-foot">' +
      (used ? '<button type="button" class="btn pt-go" disabled>' + t('usedAt', { t: L.esc(hhmm(used.at)) }) + '</button>'
        : state.guest ? '<button type="button" class="btn btn-hot pt-go" data-login>' + t('login') + '</button>'
        : '<a class="btn btn-hot pt-go" href="#/partner/' + encodeURIComponent(p.id) + '/use">' + t('use') + '</a>') +
      '<p class="pt-foot-hint">' + (state.cap ? t('limitHint', { n: state.cap }) : t('useHint')) + '</p></div>';
    body.querySelector('[data-login]')?.addEventListener('click', () => L.needLogin());
  }

  // ── ③ 혜택 쓰기 ──
  let passTimer = null;
  function stopPass() { clearInterval(passTimer); passTimer = null; }
  async function renderPass(root, id) {
    stopPass();
    const body = loadingView(root, L.t('pt.passTitle'), 'partner/' + id);
    let list, state;
    try { [list, state] = await Promise.all([load(), mine()]); }
    catch { return failView(body, () => renderPass(root, id)); }
    if (!body.isConnected) return;
    const p = list.find(x => x.id === id);
    if (!p) { body.innerHTML = '<p class="muted pt-state">' + t('notFound') + '</p>'; return; }
    if (state.guest) { L.needLogin(); body.innerHTML = '<p class="muted pt-state">' + t('login') + '</p>'; return; }
    const me = L.me || {};
    const start = Date.now();
    const used = usedOf(state, p.id);
    body.innerHTML = '<p class="pt-show">' + t('show') + '</p>' +
      '<section class="pt-pass"><div class="pt-run" aria-hidden="true"><i></i></div><div class="pt-pass-in">' +
      '<div class="pt-pass-top"><span class="pt-brand">GROOVE LOUNGE</span><span class="pt-ok">● ' + t('member') + '</span></div>' +
      '<div class="pt-who">' + (L.avatar ? L.avatar(me, 52) : '') + '<div><strong>' + L.esc(me.nick || '') + '</strong>' + (L.tagChip ? L.tagChip(me.tag) : '') + '</div></div>' +
      '<div class="pt-pass-perk"><span>' + L.esc(p.name) + '</span><strong>' + (p.perk ? L.esc(p.perk) : t('checking')) + '</strong></div>' +
      '<div class="pt-clock-row"><div><span>' + t('clock') + '</span><strong data-pt-clock></strong></div></div>' +
      '<p class="pt-left" data-pt-left></p></div></section><div data-pt-action></div>';
    const clock = body.querySelector('[data-pt-clock]'), left = body.querySelector('[data-pt-left]'), action = body.querySelector('[data-pt-action]');
    let finished = Boolean(used);
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
    const tick = () => {
      if (!clock.isConnected) return stopPass();
      clock.textContent = fmt.format(new Date());
      if (finished) { left.textContent = ''; return; }
      const ms = Math.max(0, PASS_MS - (Date.now() - start));
      const s = Math.ceil(ms / 1000);
      left.textContent = L.t('pt.left', { t: String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') });
      if (ms <= 0) { stopPass(); L.toast(L.t('pt.expired')); L.go('partner/' + encodeURIComponent(p.id)); }
    };
    const doneView = (at, gained) => {
      finished = true;
      body.querySelector('.pt-pass').classList.add('is-done');
      action.innerHTML = '<div class="pt-done" role="status">' + L.icon('check', { size: 34, stroke: 2.4 }) + '<strong>' + t('done', { t: L.esc(hhmm(at)) }) + '</strong>' +
        (gained == null ? '' : '<p>' + (gained > 0 ? t('gained', { n: gained }) : t('noGain')) + '</p>') +
        '<p class="muted">' + t('grooveNext', { n: state.pts.groove }) + '</p></div>' +
        '<a class="btn pt-back" href="#/partner/' + encodeURIComponent(p.id) + '">' + t('back') + '</a>';
    };
    if (used) doneView(used.at, null);
    else {
      action.innerHTML = '<button type="button" class="btn pt-confirm" data-pt-confirm>' + t('confirm') + '</button><p class="pt-foot-hint">' + t('confirmHint') + '</p>';
      const btn = action.querySelector('[data-pt-confirm]');
      btn.onclick = async () => {
        if (btn.disabled) return;
        if (!(await L.confirm(L.t('pt.sure'), { ok: L.t('pt.sureOk'), body: L.t('pt.sureBody') }))) return;
        if (!btn.isConnected) return;
        btn.disabled = true;
        const r = await L.api('partner_use', { pid: p.id });
        if (!btn.isConnected) return;
        if (r?.ok) return doneView(r.at ?? Date.now(), Number.isFinite(r.gained) ? r.gained : null);
        btn.disabled = false;
        if (r?.error === 'auth') return L.needLogin();
        if (r?.error === 'dup') return doneView(Date.now(), null);
        L.toast(L.t('pt.e.' + (['closed', 'pid', 'limit', 'network'].includes(r?.error) ? r.error : 'other')));
      };
    }
    tick();
    passTimer = setInterval(tick, 1000);
  }

  // 오늘 밤 탭 한 줄 (tonight5 가 'partners' 칸을 그릴 때 부름). 스위치가 꺼져 있으면 숨김.
  (L.tonightParts ||= {}).partners = (el) => {
    if (!L.open('partners')) { el.hidden = true; return; }
    el.innerHTML = '<a class="pt-entry" href="#/partners"><span class="pt-entry-icon" aria-hidden="true">' + L.icon('home', { size: 22 }) + '</span>' +
      '<span class="pt-entry-main"><strong>' + t('hero') + '</strong><small data-pt-entry-sub>' + t('title') + '</small></span>' + chev() + '</a>';
    load().then(list => {
      const sub = el.querySelector('[data-pt-entry-sub]');
      if (sub) sub.textContent = L.t('pt.count', { n: list.length });
    }).catch(() => {});
  };

  L.screen('partners', { nav: 'tonight', title: 'pt.title', bar: 'own', keepScroll: true, render: root => renderList(root) });
  L.screen('partner', {
    nav: 'tonight', title: 'pt.title', bar: 'own',
    render(root, params) {
      const raw = String(params.id || '');
      const m = /^(partner-\d{2,3})(\/use)?$/.exec(raw);
      if (!m) { root.innerHTML = '<div class="pt">' + L.bar({ title: L.t('pt.title'), back: 'partners' }) + '<p class="muted pt-state">' + t('notFound') + '</p></div>'; return; }
      return m[2] ? renderPass(root, m[1]) : renderDetail(root, m[1]);
    },
    leave: stopPass
  });
})();
