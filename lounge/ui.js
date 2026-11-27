/* 그루브 라운지 공통 부품 (4차 · lounge/SPEC4.md 2장) — 화면 파일들이 같이 쓰는 아이콘·아바타·시간·링크·위 막대·메뉴 시트.
   주인: 틀 작업창(A). 다른 화면은 여기 함수를 부르기만 하고 이 파일은 고치지 않는다. */
(function () {
  var L = window.Lounge;
  var ICONS = {
    heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>',
    comment: '<path d="M20.5 11.6a8.2 8.2 0 0 1-12 7.2L3.5 20l1.3-4.6a8.2 8.2 0 1 1 15.7-3.8z"/>',
    send: '<path d="M21 3 10.5 13.5M21 3l-6.6 18-3.9-7.5L3 9.6z"/>',
    bookmark: '<path d="M6 3.5h12v17l-6-4.6-6 4.6z"/>',
    more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
    back: '<path d="M15 4.5 7.5 12l7.5 7.5"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    plusBox: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9zM10 20a2.2 2.2 0 0 0 4 0"/>',
    chat: '<path d="M20 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3v3.5L11.5 17H20a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/>',
    grid: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
    tagged: '<path d="M4 20.5V8.5l3-4h10l3 4v12z"/><circle cx="12" cy="11.5" r="2.4"/><path d="M7.8 18.5a4.3 4.3 0 0 1 8.4 0"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    pin: '<path d="m14.5 3.5 6 6-3 1-3.2 3.2.4 4.3-1.2 1.2-8.7-8.7 1.2-1.2 4.3.4L13.5 6.5zM8.6 15.4 3.5 20.5"/>',
    camera: '<path d="M4 7.5h3l1.5-2.5h7L17 7.5h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.3" r="3.6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 5 4"/>',
    layers: '<rect x="8" y="3.5" width="12.5" height="12.5" rx="2.5"/><path d="M16 16v2a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18v-7.5A2.5 2.5 0 0 1 6 8h2"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    flag: '<path d="M5 21V4.5M5 5h12l-2.2 4L17 13H5"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3A4.5 4.5 0 0 0 13 4.6l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3A4.5 4.5 0 0 0 11 19.4l1.2-1.2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    settings: '<g transform="translate(1.56 1.56) scale(.87)"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>',
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    user: '<circle cx="12" cy="8.2" r="4"/><path d="M4.2 20.5a7.8 7.8 0 0 1 15.6 0"/>',
    userPlus: '<circle cx="10" cy="8.2" r="4"/><path d="M2.5 20.5a7.5 7.5 0 0 1 13.4-4.6M19 13.5v6M16 16.5h6"/>',
    reply: '<path d="M9.5 5.5 4 11l5.5 5.5M4.5 11H14a6 6 0 0 1 6 6v1.5"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17zM14.5 7.5l3 3"/>',
    crop: '<path d="M7 2.5V17h14.5M2.5 7H17v14.5"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
    mute: '<path d="M4 9.5h3l5-4v13l-5-4H4zM16 9.5l5 5M21 9.5l-5 5"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5.5v-5.5h-5V20H4z"/>'
  };
  // 아이콘: L.icon('heart') · 채운 모양은 L.icon('heart', { fill: true }) · 크기 size(기본 24)
  L.icon = function (name, opt) {
    opt = opt || {};
    var size = opt.size || 24;
    return '<svg class="ui-icon' + (opt.fill ? ' is-fill' : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (opt.fill ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="' + (opt.stroke || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="' + L.esc(name) + '">' + (ICONS[name] || '') + '</svg>';
  };
  L.icons = ICONS;

  // 사진 주소: 전체 주소면 그대로, 키면 L.img
  L.photoSrc = function (value) { return !value ? '' : /^(https?:)?\/\//.test(value) ? value : L.img(value); };

  // 아바타: L.avatar({nick, photo, story}, 44, { link: true, ring: true })
  //  · story: '' | 'new' | 'seen' (스토리 테두리 — ring 을 켰을 때만 그림) · link: 프로필로 가는 <a> 로 감쌈
  L.avatar = function (person, size, opt) {
    person = person || {}; opt = opt || {}; size = size || 40;
    var src = L.photoSrc(person.photo);
    var nick = person.nick || '';
    var inner = src ? '<img src="' + L.esc(src) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="ui-avatar-letter" aria-hidden="true">' + L.esc(Array.from(nick)[0] || '') + '</span>';
    var ring = opt.ring && person.story ? ' data-story="' + (person.story === 'seen' ? 'seen' : 'new') + '"' : '';
    var attrs = ' class="ui-avatar' + (opt.cls ? ' ' + opt.cls : '') + '" style="--s:' + size + 'px"' + ring;
    if (opt.link && nick) return '<a' + attrs + ' href="#/u/' + encodeURIComponent(nick) + '" aria-label="' + L.esc(nick) + '">' + inner + '</a>';
    return '<span' + attrs + '>' + inner + '</span>';
  };

  // DJ 로고: 이름(한글·영문·대소문자 무관) → /lounge/assets/dj-logos/<키>.png, 없으면 ''
  var DJ_LOGOS = { road: 'road', '로드': 'road', mumu: 'mumu', '무무': 'mumu', mute: 'mute', '뮤트': 'mute',
    bill: 'bill', '빌': 'bill', aeth: 'aeth', a_eth: 'aeth', 'a:eth': 'aeth', '에이스': 'aeth', n: 'n', '엔': 'n',
    uzi: 'uzi', 'u-zi': 'uzi', 'u·zi': 'uzi', 'dju-zi': 'uzi', '우지': 'uzi', wook2: 'wook2', wook: 'wook2', '욱이': 'wook2',
    ezzy: 'ezzy', '이지': 'ezzy', zet: 'zet', '제트': 'zet', kupa: 'kupa', '쿠파': 'kupa', dia: 'dia', '디아': 'dia' };
  L.djLogo = function (name) {
    var key = String(name || '').trim().toLowerCase().replace(/^dj[\s.]*/, '').replace(/[\s]/g, '');
    var hit = DJ_LOGOS[key] || DJ_LOGOS[key.replace(/[^a-z0-9가-힣]/g, '')];
    return hit ? '/lounge/assets/dj-logos/' + hit + '.png' : '';
  };
  // 로고가 있으면 <img class="l26-dj-logo">, 없으면 fallback(보통 이름 글자)
  L.djMark = function (name, fallback, cls) {
    var src = L.djLogo(name);
    return src ? '<img class="l26-dj-logo' + (cls ? ' ' + cls : '') + '" src="' + src + '" alt="' + L.esc(name) +
      '" loading="lazy" decoding="async">' : (fallback == null ? L.esc(name) : fallback);
  };

  L.l26Skeleton = function (label, compact = false, attrs = '') {
    return '<div class="l26-state l26-skeleton' + (compact ? ' is-compact' : '') + '" role="status"' + attrs +
      '><span class="sr-only">' + label + '</span><span class="l26-state-art" aria-hidden="true"></span>' +
      '<span class="l26-state-lines" aria-hidden="true"><i></i><i></i></span></div>';
  };

  L.l26Empty = function (label, icon, compact = false, attrs = '', actions = '') {
    return '<div class="l26-state l26-empty' + (compact ? ' is-compact' : '') + '" role="status"' + attrs +
      '><span class="l26-state-art" aria-hidden="true">' + L.icon(icon, { size: compact ? 18 : 30 }) +
      '</span><div>' + label + actions + '</div></div>';
  };

  let entryScript;
  L.loadEntryQr = function () {
    if (L.mountEntryQr) return Promise.resolve();
    entryScript ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/lounge/l26-entry-qr.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('entry')); };
      document.head.append(script);
    }).catch(error => { entryScript = null; throw error; });
    return entryScript;
  };

  // 지난 시간: 방금 · 5분 · 3시간 · 2일 · 1주 · (그 뒤는 날짜). L.ago(at, true) = '5분 전' 처럼 긴 모양
  var AGO = {
    ko: { now: '방금', m: '{n}분', h: '{n}시간', d: '{n}일', w: '{n}주', ago: '{t} 전' },
    en: { now: 'now', m: '{n}m', h: '{n}h', d: '{n}d', w: '{n}w', ago: '{t} ago' },
    ja: { now: 'たった今', m: '{n}分', h: '{n}時間', d: '{n}日', w: '{n}週間', ago: '{t}前' },
    zh: { now: '刚刚', m: '{n}分钟', h: '{n}小时', d: '{n}天', w: '{n}周', ago: '{t}前' }
  };
  L.ago = function (at, long) {
    var time = typeof at === 'number' ? at : Date.parse(at);
    if (!Number.isFinite(time)) return '';
    var words = AGO[L.lang] || AGO.en, s = Math.max(0, (Date.now() - time) / 1000), text;
    if (s < 60) return words.now;
    if (s < 3600) text = words.m.replace('{n}', Math.floor(s / 60));
    else if (s < 86400) text = words.h.replace('{n}', Math.floor(s / 3600));
    else if (s < 7 * 86400) text = words.d.replace('{n}', Math.floor(s / 86400));
    else if (s < 28 * 86400) text = words.w.replace('{n}', Math.floor(s / 604800));
    else {
      var date = new Date(time), same = date.getFullYear() === new Date().getFullYear();
      try { return new Intl.DateTimeFormat(L.lang, same ? { month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' }).format(date); }
      catch (e) { return date.toISOString().slice(0, 10); }
    }
    return long ? words.ago.replace('{t}', text) : text;
  };

  // 숫자: 1,234 · 1.2만(ko) / 1.2K(그 외)
  L.count = function (n) {
    n = Number(n) || 0;
    if (n < 10000) return n.toLocaleString(L.lang === 'ko' ? 'ko-KR' : 'en-US');
    var trim = function (v) { return String(Math.floor(v * 10) / 10).replace(/\.0$/, ''); };
    if (L.lang === 'ko') return trim(n / 10000) + '만';
    if (L.lang === 'ja' || L.lang === 'zh') return trim(n / 10000) + (L.lang === 'ja' ? '万' : '万');
    return n < 1e6 ? trim(n / 1000) + 'K' : trim(n / 1e6) + 'M';
  };

  // 글 속 @닉네임 · #해시태그 만 링크로 (웹 주소는 절대 링크로 만들지 않는다 — 운영 원칙). 줄바꿈은 그대로 두고 CSS white-space 로.
  var NICK = '[가-힣A-Za-z0-9._]{2,20}', TAG = '[가-힣A-Za-z0-9_]{1,30}';
  var LINKS = new RegExp('(^|[^가-힣A-Za-z0-9._@#&])(?:@(' + NICK + ')|#(' + TAG + '))', 'g');
  L.linkify = function (text) {
    return L.esc(text).replace(LINKS, function (all, lead, nick, tag) {
      if (nick) { nick = nick.replace(/[._]+$/, ''); if (nick.length < 2) return all; }
      var rest = nick ? all.slice(lead.length + 1 + nick.length) : '';
      return lead + (nick ? '<a class="ui-mention" href="#/u/' + encodeURIComponent(nick) + '">@' + nick + '</a>' + rest
        : '<a class="ui-hashtag" href="#/tag/' + encodeURIComponent(tag) + '">#' + tag + '</a>');
    });
  };
  L.hashtags = function (text) { var out = [], m, re = new RegExp('(?:^|[^가-힣A-Za-z0-9._@#&])#(' + TAG + ')', 'g'); while ((m = re.exec(String(text || '')))) out.push(m[1].toLowerCase()); return [...new Set(out)]; };

  // ── 뒤로 가기 기억 ── (core 보다 먼저 hashchange 를 받는다)
  //  방문 기록 칸마다 순번(history.state.gl)을 적어 둔다 → 순번이 이미 있는 칸으로 왔으면 '뒤로/앞으로 가기', 없으면 '새로 연 화면'.
  //  (예전엔 '바로 앞 주소와 같으면 뒤로'로 쳐서 피드→글→피드→글 처럼 오가면 뒤로 가기를 놓쳤다)
  var at = 0, back = false, stashes = Object.create(null);
  function mark() { try { history.replaceState(Object.assign({}, history.state, { gl: at }), ''); } catch (e) {} }
  try { if (history.state && typeof history.state.gl === 'number') at = history.state.gl; else mark(); } catch (e) {}
  window.addEventListener('hashchange', function () {
    var state = null;
    try { state = history.state; } catch (e) {}
    if (state && typeof state.gl === 'number') { back = state.gl < at; at = state.gl; }
    else { at += 1; mark(); back = false; }
  });
  L.wentBack = function () { return back; };                      // 지금 화면이 '뒤로 가기'로 열렸나
  L.canBack = function () { return at > 0; };
  L.back = function (fallback) { if (at > 0) history.back(); else L.go(fallback || 'tonight'); };
  // 화면 상태 맡기기: 떠날 때 L.stash('feed', {...}) → 뒤로 돌아왔을 때만 L.unstash('feed') 가 돌려줌 (앞으로 새로 열면 null)
  //  · 맡길 때 주소는 '지금 그려져 있는 화면'(L.shownHash) 기준 — leave() 안에서 불러도(이미 주소가 바뀐 뒤) 떠나는 화면 것으로 맡겨진다.
  L.stash = function (name, data) { stashes[name] = { hash: (L.shownHash && L.shownHash()) || location.hash || '#/tonight', data: data }; };
  L.unstash = function (name) { var s = stashes[name]; delete stashes[name]; return back && s && s.hash === (location.hash || '#/tonight') ? s.data : null; };
  L.forgetBack = function () { back = false; };                   // 같은 탭 다시 누르기 등 '새로 연 것'으로 칠 때 (core 가 부름)

  // ── 화면 자체 위 막대 ── L.screen(..., { bar: 'own' }) 이면 공통 헤더를 숨기고 화면이 직접 그린다.
  //  L.bar({ title, back: 'feed'(돌아갈 곳) | false, left: html, right: html, sub: html })
  L.bar = function (opt) {
    opt = opt || {};
    var left = opt.left || (opt.back === false ? '' : '<button class="ui-bar-btn" type="button" data-ui-back="' + L.esc(opt.back || '') + '" aria-label="' + L.esc(L.t('ui.back')) + '">' + L.icon('back') + '</button>');
    return '<header class="ui-bar">' + '<div class="ui-bar-side">' + left + '</div>' +
      '<div class="ui-bar-title">' + (opt.titleHtml || '<h1>' + L.esc(opt.title || '') + '</h1>') + (opt.sub ? '<p>' + opt.sub + '</p>' : '') + '</div>' +
      '<div class="ui-bar-side is-right">' + (opt.right || '') + '</div></header>';
  };
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ui-back]');
    if (btn) { e.preventDefault(); L.back(btn.getAttribute('data-ui-back') || 'tonight'); }
  });
  // 알림·메시지 아이콘 (화면 자체 막대에 넣을 때). 넣은 뒤 L.paintInbox() 를 부르면 배지 숫자가 붙는다.
  L.inboxIcons = function () {
    return '<a class="ui-bar-btn" href="#/alerts" data-lounge-inbox="alerts" aria-label="' + L.esc(L.t('core.alerts')) + '">' + L.icon('bell') + '<span aria-hidden="true" hidden></span></a>' +
      '<a class="ui-bar-btn" href="#/dm" data-lounge-inbox="dm" aria-label="' + L.esc(L.t('core.dm')) + '">' + L.icon('chat') + '<span aria-hidden="true" hidden></span></a>';
  };

  // ── 메뉴 시트 ── L.menu([{ label, icon, danger, on() }, ...], { title }) · 누르면 닫고 on() 실행. '취소'는 자동.
  L.menu = function (items, opt) {
    opt = opt || {};
    var list = items.filter(Boolean);
    var panel = L.sheet((opt.title ? '<h2 class="ui-menu-title">' + L.esc(opt.title) + '</h2>' : '') + '<div class="ui-menu" role="menu">' +
      list.map(function (item, i) {
        return '<button type="button" role="menuitem" class="ui-menu-item' + (item.danger ? ' is-danger' : '') + '" data-i="' + i + '">' +
          (item.icon ? L.icon(item.icon, { size: 22 }) : '') + '<span>' + L.esc(item.label) + '</span></button>';
      }).join('') + '<button type="button" class="ui-menu-item is-cancel" data-i="-1"><span>' + L.esc(L.t('ui.cancel')) + '</span></button></div>');
    panel.classList.add('ui-sheet-menu');
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-i]'); if (!btn) return;
      var item = list[Number(btn.dataset.i)];
      L.closeSheet();
      if (item && item.on) item.on();
    });
    return panel;
  };
  // 확인 시트: await L.confirm('삭제할까요?', { ok: '삭제', danger: true, body: '되돌릴 수 없어요' }) → true/false
  L.confirm = function (title, opt) {
    opt = opt || {};
    return new Promise(function (resolve) {
      var done = false, finish = function (value) { if (done) return; done = true; L.closeSheet(); resolve(value); };
      var panel = L.sheet('<h2>' + L.esc(title) + '</h2>' + (opt.body ? '<p class="muted">' + L.esc(opt.body) + '</p>' : '') +
        '<div class="ui-confirm"><button type="button" class="btn' + (opt.danger ? ' btn-danger' : ' btn-hot') + '" data-ok>' + L.esc(opt.ok || L.t('ui.ok')) +
        '</button><button type="button" class="btn" data-no>' + L.esc(L.t('ui.cancel')) + '</button></div>');
      panel.classList.add('ui-sheet-confirm');
      panel.querySelector('[data-ok]').onclick = function () { finish(true); };
      panel.querySelector('[data-no]').onclick = function () { finish(false); };
      var sheet = document.getElementById('sheet');
      var watch = new MutationObserver(function () { if (sheet.hidden || !sheet.contains(panel)) { watch.disconnect(); if (!done) { done = true; resolve(false); } } });
      watch.observe(sheet, { attributes: true, childList: true });
    });
  };

  // ── 당겨서 새로고침 ── L.pull(root, async () => {...}) : 맨 위에서 아래로 당기면 실행. 돌려주는 함수를 부르면 해제.
  L.pull = function (root, refresh) {
    var startY = null, pulled = 0, busy = false, bar = document.createElement('div');
    bar.className = 'ui-pull'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
    root.prepend(bar);
    function start(e) { if (busy || window.scrollY > 0 || document.body.classList.contains('sheet-open')) return; startY = e.touches[0].clientY; pulled = 0; }
    function move(e) {
      if (startY == null) return;
      pulled = Math.max(0, (e.touches[0].clientY - startY) * 0.5);
      if (window.scrollY > 0) { startY = null; pulled = 0; }
      bar.style.height = Math.min(pulled, 72) + 'px'; bar.classList.toggle('is-ready', pulled >= 56);
    }
    async function end() {
      if (startY == null) return; startY = null;
      if (pulled < 56) { bar.style.height = '0'; return; }
      busy = true; bar.classList.add('is-busy'); bar.style.height = '48px';
      try { await refresh(); } catch (e) { console.error(e); }
      busy = false; bar.classList.remove('is-busy', 'is-ready'); bar.style.height = '0';
    }
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: true });
    root.addEventListener('touchend', end); root.addEventListener('touchcancel', end);
    return function () { root.removeEventListener('touchstart', start); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', end); bar.remove(); };
  };

  // 아래 끝에 닿으면 더 불러오기: var stop = L.more(sentinelEl, async () => {...})
  L.more = function (el, load) {
    var busy = false, io = new IntersectionObserver(async function (entries) {
      if (busy || !entries.some(function (x) { return x.isIntersecting; })) return;
      busy = true; try { await load(); } catch (e) { console.error(e); } busy = false;
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return function () { io.disconnect(); };
  };

  L.i18n({
    ko: { 'ui.back': '뒤로', 'ui.cancel': '취소', 'ui.ok': '확인', 'ui.more': '더 보기', 'ui.retry': '다시 시도', 'ui.error': '불러오지 못했어요', 'ui.empty': '아직 없어요' },
    en: { 'ui.back': 'Back', 'ui.cancel': 'Cancel', 'ui.ok': 'OK', 'ui.more': 'More', 'ui.retry': 'Try again', 'ui.error': 'Couldn’t load', 'ui.empty': 'Nothing here yet' },
    ja: { 'ui.back': '戻る', 'ui.cancel': 'キャンセル', 'ui.ok': 'OK', 'ui.more': 'もっと見る', 'ui.retry': '再試行', 'ui.error': '読み込めませんでした', 'ui.empty': 'まだありません' },
    zh: { 'ui.back': '返回', 'ui.cancel': '取消', 'ui.ok': '确定', 'ui.more': '更多', 'ui.retry': '重试', 'ui.error': '加载失败', 'ui.empty': '暂无内容' }
  });
})();
