/* 그루브 라운지 core — ⑧ C-shell 담당 (lounge/SPEC.md 6) */
(function () {
  var API = window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  var screens = Object.create(null), dict = { ko: {}, en: {}, ja: {}, zh: {} }, cur = null;
  var session = read('gl_token'), sheetFocus, routeVersion = 0;
  var features = Object.create(null), configPending;
  var shown = '', scrolls = Object.create(null), scrollPending = null;   // 보던 자리 기억 (keepScroll 화면)
  var gates = { rooms: 'rooms', dm: 'dm', challenge: 'challenge', compose: 'posts',
    rewards: 'rewards', rank: 'rewards', shop: 'shop', table: 'sales', split: 'split', songs: 'songs', safety: 'safety', shorts: 'play1' };
  var STAFF_API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
  var staffTeamLabels = {
    'GROOVE 영업팀': { ko: '영업팀', en: 'Sales', ja: '営業チーム', zh: '销售团队' },
    'GROOVE 운영팀': { ko: '운영팀', en: 'Operations', ja: '運営チーム', zh: '运营团队' },
    'GROOVE DJ팀': { ko: 'DJ팀', en: 'DJ Team', ja: 'DJチーム', zh: 'DJ 团队' },
    'GROOVE 경호팀': { ko: '경호팀', en: 'Security', ja: '警備チーム', zh: '安保团队' }
  };
  function read(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } }
  function save(key, value) {
    try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch (e) {}
  }
  function language(value) { return Object.hasOwn(dict, value) ? value : 'en'; }
  var lang = language(read('gl_lang') || (navigator.language || 'ko').slice(0, 2));
  var paths = [
    '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    '<rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>',
    '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2zM18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  ];

  async function resize(file) {
    var url = URL.createObjectURL(file);
    try {
      var image = new Image();
      image.src = url;
      try { await image.decode(); } catch (e) { throw new Error('photo'); }
      var canvas = document.createElement('canvas');
      var scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
      var type = 'image/webp';
      while (true) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        var ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        var blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.82));
        if (type === 'image/webp' && blob?.type !== type) { type = 'image/jpeg'; continue; }
        if (!blob || blob.type !== type) throw new Error('photo');
        if (blob.size <= 1500000) return blob;
        if (canvas.width === 1 && canvas.height === 1) throw new Error('photo');
        scale *= 0.75;
      }
    } finally { URL.revokeObjectURL(url); }
  }
  // 시트를 아래로 끌어 닫기: 맨 위까지 올라와 있을 때 아래로 끌면 따라 내려오고, 충분히 끌거나 빠르게 튕기면 닫힌다.
  function dragToClose(panel) {
    var x0 = 0, y0 = null, dy = 0, at = 0, dragging = false;
    panel.addEventListener('touchstart', function (e) {
      y0 = null;
      if (e.touches.length !== 1 || panel.scrollTop > 0) return;
      for (var el = e.target; el && el !== panel; el = el.parentElement) {
        if (el.scrollTop > 0 || el.matches('textarea, canvas, input[type=range], [data-no-drag]')) return;   // 안쪽을 스크롤하는 중
      }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dy = 0; at = Date.now(); dragging = false;
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      var dx = e.touches[0].clientX - x0;
      dy = e.touches[0].clientY - y0;
      if (!dragging) {
        if (dy < -6 || Math.abs(dx) > Math.abs(dy)) { y0 = null; return; }   // 위로·옆으로 움직이면 평소 스크롤
        if (dy < 10) return;
        dragging = true;
        panel.style.transition = 'none';
      }
      if (e.cancelable) e.preventDefault();
      panel.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
    }, { passive: false });
    function end() {
      if (y0 == null) return;
      y0 = null;
      if (!dragging) return;
      dragging = false;
      var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (dy > Math.min(140, panel.offsetHeight * .3) || (dy > 40 && Date.now() - at < 260)) {
        panel.style.transition = still ? 'none' : 'transform .16s ease-in';
        panel.style.transform = 'translateY(100%)';
        setTimeout(function () { if (panel.isConnected) L.closeSheet(); }, still ? 0 : 150);
      } else {
        panel.style.transition = still ? 'none' : 'transform .18s ease-out';
        panel.style.transform = '';
      }
    }
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
  }
  var L = window.Lounge = {
    me: null, lang: lang,
    setToken: function (t) { session = t || ''; save('gl_token', session); if (!session) paintBadges(); },
    setLang: function (value, explicit) {
      if (!explicit && ['ja', 'zh'].includes(read('gl_lang')) && ['ko', 'en'].includes(value)) return;
      L.lang = language(value);
      save('gl_lang', L.lang);
      paintStatus();
    },
    api: function (a, body) {
      var b = Object.assign({}, body, { a: a }); var t = session; if (t && !b.token && !b.admin) b.token = t;
      return fetch(API, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.error === 'auth' && !b.admin && t && b.token === t && session === t) { L.setToken(''); L.me = null; } return j && typeof j === 'object' ? j : { error: 'server' }; }).catch(function () { return { error: 'network' }; });
    },
    // The profile menu can use an already signed-in Staff app session on this origin.
    staffAdmin: async function () {
      try {
        const saved = read('gs_staff');
        const staff = JSON.parse(saved);
        if (staff?.admin !== true || typeof staff.token !== 'string' || !staff.token || !Number.isFinite(staff.exp) || staff.exp <= Date.now()) return '';
        const response = await fetch(STAFF_API, {
          method: 'POST', headers: { 'content-type': 'text/plain' },
          body: JSON.stringify({ a: 'lounge_admin_token', token: staff.token })
        });
        if (!response.ok) return '';
        const result = await response.json();
        return read('gs_staff') === saved && result.r === 'admin' && typeof result.a === 'string' ? result.a : '';
      } catch { return ''; }
    },
    tagLabel: function (tag, locale = L.lang) {
      if (tag?.kind === 'vip') return 'VIP';
      if (tag?.kind !== 'staff') return '';
      const team = Object.hasOwn(staffTeamLabels, tag.label) ? staffTeamLabels[tag.label][locale] : '';
      return team ? 'GROOVE ' + team : 'GROOVE';
    },
    whoTag: function (person, locale = L.lang) {
      const nick = L.esc(person?.nick);
      const label = L.tagLabel(person?.tag, locale);
      return label ? nick + ' <span class="lounge-who-tag" data-kind="' + person.tag.kind + '">' + L.esc(label) + '</span>' : nick;
    },
    img: function (key) { return key ? API.replace(/\/$/, '') + '/img/' + encodeURIComponent(key).replace(/%2F/g, '/') : ''; },
    upload: async function (file, kind) {
      var t = session;
      if (!t) throw new Error('auth');
      var blob = await resize(file);
      if (session !== t) throw new Error('auth');
      var url = new URL('up', new URL(API.replace(/\/$/, '') + '/', location.href));
      url.searchParams.set('token', t);
      var result;
      try {
        var response = await fetch(url, { method: 'POST', headers: { 'content-type': blob.type }, body: blob });
        result = await response.json();
      } catch (e) { throw new Error('network'); }
      if (!response.ok || !result?.key) throw new Error(result?.error || 'photo');
      return result.key;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    i18n: function (d) { Object.keys(d).forEach(function (l) { dict[l] = Object.assign(dict[l] || {}, d[l]); }); },
    t: function (k, v) { var s = dict[L.lang]?.[k] || dict.en[k] || dict.ko[k] || k; if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); }); return s; },
    open: function (feature) { return Object.hasOwn(features, feature) && features[feature] === true; },
    screen: function (name, def) { screens[name] = def; },
    hasScreen: function (name) { return Boolean(screens[name]); },
    go: function (path) { location.hash = '#/' + String(path).replace(/^#?\/?/, ''); },
    toast: function (m) { var t = document.getElementById('toast'); t.textContent = m; t.hidden = false; clearTimeout(L._tt); L._tt = setTimeout(function () { t.hidden = true; }, 2600); },
    // L.sheet(html, { close: true(오른쪽 위 ✕) , bare: true(손잡이·끌어 닫기 없음 — 전체 화면 뷰어용), cls: '클래스' })
    sheet: function (html, opt) {
      opt = opt || {};
      var s = document.getElementById('sheet');
      if (s.hidden) sheetFocus = document.activeElement;
      s.innerHTML = '<div class="in' + (opt.bare ? ' sheet-bare' : '') + (opt.cls ? ' ' + L.esc(opt.cls) : '') + '" role="dialog" aria-modal="true" tabindex="-1">' +
        (opt.close ? '<button type="button" class="sheet-x" data-sheet-x aria-label="' + L.esc(L.t('core.close')) + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' : '') +
        html + '</div>';
      var panel = s.firstElementChild;
      var heading = panel.querySelector('h1, h2, h3');
      if (heading) { heading.id ||= 'sheet-title'; panel.setAttribute('aria-labelledby', heading.id); }
      s.hidden = false;
      document.body.classList.add('sheet-open');
      document.getElementById('app').inert = true;
      s.onclick = function (e) { if (e.target === s) L.closeSheet(); };
      var x = panel.querySelector(':scope > [data-sheet-x]');
      if (x) x.onclick = L.closeSheet;
      if (!opt.bare) dragToClose(panel);
      panel.focus();
      return panel;
    },
    closeSheet: function () {
      var s = document.getElementById('sheet');
      if (s.hidden) return;
      s.hidden = true;
      s.replaceChildren();
      document.body.classList.remove('sheet-open');
      document.getElementById('app').inert = false;
      sheetFocus?.focus();
    },
    needLogin: function () {
      if (L.me) return false;
      var target = location.hash;
      var panel = L.sheet('<h2>' + L.esc(L.t('core.need')) + '</h2><p class="muted">' + L.esc(L.t('core.needBody')) +
        '</p><div class="shell-actions"><button class="btn btn-hot" type="button" data-login>' + L.esc(L.t('core.login')) +
        '</button><button class="btn" type="button" data-close>' + L.esc(L.t('core.close')) + '</button></div>');
      panel.querySelector('[data-login]').onclick = function () {
        L.closeSheet();
        L.go('login?next=' + encodeURIComponent(target));
      };
      panel.querySelector('[data-close]').onclick = L.closeSheet;
      return true;
    },
    refreshMe: async function () {
      var t = session;
      if (!t) { L.me = null; return null; }
      var result = await L.api('me');
      if (t === session && result.me) L.me = result.me;
      return L.me;
    },
    canInstall: function () {
      return (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
        !navigator.standalone && !matchMedia('(display-mode: standalone)').matches;
    },
    showInstall: function (once) {
      if (!L.canInstall() || (once && read('gl_install_hint'))) return;
      save('gl_install_hint', '1');
      var panel = L.sheet('<h2>' + L.esc(L.t('core.install')) + '</h2><p>' + L.esc(L.t('core.installBody')) +
        '</p><button class="btn" type="button">' + L.esc(L.t('core.close')) + '</button>');
      panel.querySelector('button').onclick = L.closeSheet;
    },
    route: async function () {
      var version = ++routeVersion;
      var h = location.hash.replace(/^#\/?/, '') || 'tonight';
      var qi = h.indexOf('?');
      var path = qi < 0 ? h : h.slice(0, qi);
      var params = Object.create(null);
      if (qi >= 0) new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { params[k] = v; });
      var [name, ...rest] = path.split('/');
      if (rest.length) {
        try { params.id = decodeURIComponent(rest.join('/')); } catch (e) { params.id = rest.join('/'); }
      }
      if (name === 'u') name = 'user';
      var def = screens[name];
      var view = document.getElementById('view');
      var here = location.hash || '#/tonight';
      // 떠나는 화면이 keepScroll 이면 보던 자리를 기억 (뒤로 돌아왔을 때 L.restoreScroll 이 되돌림)
      if (cur?.keepScroll && shown) scrolls[shown] = window.scrollY;
      if (cur?.leave) {
        try { cur.leave(); } catch (e) { console.error(e); }
      }
      L.closeSheet();
      cur = def;
      shown = here;
      scrollPending = def?.keepScroll && L.wentBack?.() && Object.hasOwn(scrolls, here) ? scrolls[here] : null;
      delete scrolls[here];
      document.getElementById('app').classList.toggle('own-bar', def?.bar === 'own');   // 화면이 위 막대를 직접 그림 (SPEC4 2장)
      document.getElementById('app').classList.toggle('no-tabs', def?.tabs === false);  // 화면 정의에 tabs: false → 아래 탭 숨김 (글쓰기·스토리 뷰어처럼 화면을 넓게 쓰는 곳)
      var root = document.createElement('div');
      view.replaceChildren(root);
      L.paintNav(def?.nav || name);
      paintStatus();
      var titleKey = def?.title || 'nav.' + name;
      var title = L.t(titleKey);
      document.title = title === titleKey && !def?.title ? 'GROOVE LOUNGE' : title;
      window.scrollTo(0, 0);
      view.focus({ preventScroll: true });
      var gate = Object.hasOwn(gates, name) && gates[name];
      var config = refreshConfig();
      if (gate || ['play', 'tonight', 'me', 'user'].includes(name)) await config;
      if (version !== routeVersion) return;
      refreshBadges(version, config);
      if (gate && !L.open(gate) && !def?.selfGate) {   // 꺼진 기능: 화면 제목 + 준비 중 (selfGate 화면은 스스로 처리 — 통합 때 Claude)
        root.innerHTML = (def?.title && title !== titleKey ? '<h1>' + L.esc(title) + '</h1>' : '') + '<p class="muted">' + L.esc(L.t('core.soon')) + '</p>';
        return;
      }
      if (def?.auth && !L.me) {
        var login = document.createElement('button');
        login.className = 'btn btn-hot';
        login.textContent = L.t('core.login');
        login.onclick = L.needLogin;
        root.append(login);
        L.needLogin();
        return;
      }
      if (!def) {
        root.textContent = L.t('core.soon');
        return;
      }
      try { await def.render(root, params); } catch (e) {
        if (version === routeVersion) root.textContent = L.t('core.unavailable');
        console.error(e);
      }
      if (version === routeVersion) L.restoreScroll(true);   // render 가 끝났을 때 내용이 충분하면 바로 복원 (아니면 화면이 직접 부를 때까지 기다림)
    },
    // 뒤로 돌아온 화면의 보던 자리 복원. 화면 정의에 keepScroll: true 를 주고, 내용을 다 그린 뒤 L.restoreScroll() 을 부른다.
    //  · 돌려주는 값: 복원했으면 true. 앞으로 새로 연 화면·기억이 없는 화면에서는 아무 일도 안 하고 false.
    restoreScroll: function (soft) {
      if (scrollPending == null) return false;
      var y = scrollPending;
      if (soft && document.documentElement.scrollHeight - window.innerHeight < y - 4) return false;
      scrollPending = null;
      window.scrollTo(0, y);
      return true;
    },
    shownHash: function () { return shown; },   // 지금 그려져 있는 화면의 주소 (leave() 안에서는 떠나는 화면 주소)
    // 지금 탭을 다시 눌렀을 때: 맨 위로 부드럽게 올린 뒤 화면 새로고침 (화면 정의에 refresh() 가 있으면 그걸, 없으면 다시 그림)
    retap: function () {
      var def = cur, version = routeVersion;
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var run = function () {
        if (version !== routeVersion) return;
        L.forgetBack?.();
        if (typeof def?.refresh === 'function') { try { def.refresh(); } catch (e) { console.error(e); } }
        else L.route();
      };
      if (window.scrollY < 2) return run();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      if (reduce) return run();
      var started = Date.now();
      (function wait() {
        if (window.scrollY < 2 || Date.now() - started > 800) return run();
        requestAnimationFrame(wait);
      })();
    },
    paintNav: function (on) {
      var items = [['tonight', 'nav.tonight'], ['feed', 'nav.feed'], ['play', 'nav.play'], ['rooms', 'nav.rooms'], ['me', 'nav.me']];
      var photo = L.me?.photo ? (L.photoSrc ? L.photoSrc(L.me.photo) : L.img(L.me.photo)) : '';
      document.getElementById('tabbar').innerHTML = items.map(function (x, i) {
        var icon = x[0] === 'me' && photo
          ? '<img class="tab-me" src="' + L.esc(photo) + '" alt="" width="24" height="24" decoding="async">'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (x[0] === on ? 2.3 : 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[i] + '</svg>';
        return '<a href="#/' + x[0] + '" data-tab="' + x[0] + '"' + (x[0] === on ? ' aria-current="page"' : '') + '>' + icon + '<span>' + L.esc(L.t(x[1])) + '</span></a>';
      }).join('');
    },
    boot: async function () {
      paintStatus();
      window.addEventListener('online', paintStatus);
      window.addEventListener('offline', paintStatus);
      document.addEventListener('keydown', function (e) {
        var sheet = document.getElementById('sheet');
        if (sheet.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); L.closeSheet(); }
        if (e.key !== 'Tab') return;
        var controls = [...sheet.querySelectorAll('a[href], button, input, textarea, select, [tabindex="0"]')]
          .filter(el => !el.disabled && el.getClientRects().length);
        var first = controls[0], last = controls.at(-1);
        if (!first || (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.firstElementChild)) ||
            (!e.shiftKey && document.activeElement === last)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      });
      try { history.scrollRestoration = 'manual'; } catch (e) {}   // 보던 자리는 keepScroll 화면이 직접 되돌린다
      document.getElementById('tabbar').addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (link.getAttribute('href') !== (location.hash || '#/tonight')) return;   // 다른 화면이면 평소대로 이동
        e.preventDefault();
        L.retap();
      });
      navigator.serviceWorker?.register('/lounge/sw.js').catch(() => {});
      await L.refreshMe();
      window.addEventListener('hashchange', L.route);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshBadges(routeVersion, refreshConfig());
      });
      setInterval(() => {
        if (!document.hidden && L.me) refreshBadges(routeVersion, refreshConfig());
      }, 60_000);
      await L.route();
    }
  };
  L.i18n({ ko: { 'nav.tonight': '오늘 밤', 'nav.feed': '피드', 'nav.play': '놀거리', 'nav.rooms': '오픈 대화방', 'nav.me': '나', 'core.need': '매장에서 가입하면 쓸 수 있어요', 'core.needBody': '직원에게 가입 QR을 보여 달라고 하세요. 이미 가입했다면 로그인하세요.', 'core.login': '로그인' },
           en: { 'nav.tonight': 'Tonight', 'nav.feed': 'Feed', 'nav.play': 'Play', 'nav.rooms': 'Open Chat', 'nav.me': 'Me', 'core.need': 'Join at the club to use this', 'core.needBody': 'Ask a staff member for the sign-up QR. Already a member? Log in.', 'core.login': 'Log in' } });
  function paintStatus() {
    document.documentElement.lang = L.lang;
    document.getElementById('tabbar').setAttribute('aria-label', L.t('core.nav'));
    var status = document.getElementById('offline');
    status.textContent = L.t('core.offline');
    status.hidden = navigator.onLine;
    document.querySelectorAll('[data-lounge-inbox]').forEach(link => {
      link.setAttribute('aria-label', L.t('core.' + link.dataset.loungeInbox));
    });
  }

  function refreshConfig() {
    if (!configPending) configPending = L.api('config').then(result => {
      features = !result.error && result.open || Object.create(null);
    }).finally(() => { configPending = null; });
    return configPending;
  }

  var lastBadges = {};
  L.paintInbox = function () { paintBadges(lastBadges); };
  L.setInbox = function (key, count) { paintBadges(Object.assign({}, lastBadges, { [key]: count })); };   // 한 종류의 배지 숫자만 바꿈 (알림 화면이 부름)   // 화면이 알림·메시지 아이콘을 직접 그린 뒤 부름 (SPEC4 2장)
  function paintBadges(counts = {}) {
    lastBadges = counts;
    document.querySelectorAll('[data-lounge-inbox]').forEach(link => {
      var key = link.dataset.loungeInbox;
      var count = counts[key];
      var badge = link.querySelector('span');
      var label = L.t('core.' + key);
      badge.hidden = !count;
      badge.textContent = count > 99 ? '99+' : count || '';
      link.setAttribute('aria-label', count ? L.t('core.unread', { label, count }) : label);
    });
  }

  async function refreshBadges(version, config) {
    var token = session;
    if (!L.me || !token) { paintBadges(); return; }
    await config;
    if (token !== session || version !== routeVersion) return;
    var [alerts, dm] = await Promise.all([
      L.api('notices'), L.open('dm') ? L.api('dm_threads') : {}
    ]);
    if (token !== session || version !== routeVersion) return;
    var unread = result => Number.isSafeInteger(result.unread) && result.unread > 0 ? result.unread : 0;
    paintBadges({ alerts: unread(alerts), dm: unread(dm) });
  }

  L.i18n({
    ko: { 'core.nav': '아래 메뉴', 'core.close': '닫기', 'core.soon': '준비 중이에요',
      'core.unavailable': '화면을 열 수 없어요. 다시 시도해 주세요.', 'core.offline': '오프라인이에요',
      'core.install': '홈 화면에 추가', 'core.installBody': 'Safari에서 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 고르세요.',
      'core.alerts': '알림', 'core.dm': '메시지', 'core.unread': '{label}, 읽지 않은 항목 {count}개' },
    en: { 'core.nav': 'Main navigation', 'core.close': 'Close', 'core.soon': 'Coming soon',
      'core.unavailable': 'Could not open this screen. Please try again.', 'core.offline': 'You’re offline',
      'core.install': 'Add to Home Screen', 'core.installBody': 'In Safari, tap Share, then choose Add to Home Screen.',
      'core.alerts': 'Notifications', 'core.dm': 'Messages', 'core.unread': '{label}, {count} unread' }
  });
  L.screen('rooms', { nav: 'rooms', render: function (root) { root.innerHTML = '<h1>' + L.esc(L.t('nav.rooms')) + '</h1><p class="muted">' + L.esc(L.t('core.soon')) + '</p>'; } });
})();
