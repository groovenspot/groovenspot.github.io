/* 그루브 라운지 core — ⑧ C-shell 담당 (lounge/SPEC.md 6) */
(function () {
  var API = window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  var screens = Object.create(null), dict = { ko: {}, en: {}, ja: {}, zh: {} }, cur = null;
  var session = read('gl_token'), sheetFocus, routeVersion = 0;
  var features = Object.create(null), configPending, routeShell, routePreview, routeFollowCounts, routeDjFeedback;
  var routePublic, viewerMedia = '';
  var guestAuth = new Set(['login', 'join', 'reset', 'staff-login', 'terms', 'privacy']);
  var preview = false, previewEligible = false, previewRequested = false, nextConfigCheck = 0;
  var activeTimer, activeAttempt, activeRecorded;
  var activityDayMs = 86_400_000, activityDayShift = 3_600_000; // 08:00 KST is 23:00 UTC.
  var legacyRoutes = {
    l26_home: 'tonight', l26_live: 'tonight', l26_lounge: 'feed', l26_my: 'me', l26_play: 'play'
  };
  var followerScreens = ['l26_my', 'l26_lounge', 'dj', 'user', 'followers', 'following'];
  var shellTabs = { tonight: 'l26_live', l26_lounge: 'feed', rooms: 'feed', me: 'l26_my' };
  // 오픈채팅이 켜진 회원에게만 탭 이름이 '오픈채팅'. 지난번 값을 기억해 첫 화면부터 맞는 이름을 그린다.
  var ocNav = read('gl_oc') === '1', navOn;
  var shown = '', scrolls = Object.create(null), scrollPending = null;   // 보던 자리 기억 (keepScroll 화면)
  var gates = { rooms: 'rooms', dm: 'dm', challenge: 'challenge', compose: 'posts',
    rewards: 'rewards', rank: 'rewards', shop: 'shop', table: 'sales', split: 'split', songs: 'songs', safety: 'safety', shorts: 'play1', partners: 'partners', partner: 'partners' };
  var STAFF_API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
  var staffTeamLabels = {
    'GROOVE 영업팀': { ko: '영업팀', en: 'Sales', ja: '営業チーム', zh: '销售团队' },
    'GROOVE 운영팀': { ko: '운영팀', en: 'Operations', ja: '運営チーム', zh: '运营团队' },
    'GROOVE DJ팀': { ko: 'DJ팀', en: 'DJ Team', ja: 'DJチーム', zh: 'DJ 团队' },
    'GROOVE 경호팀': { ko: '경호팀', en: 'Security', ja: '警備チーム', zh: '安保团队' }
  };
  // 6차(SPEC6 3장) 직원 팀별 표식: 서버는 팀 key 만 주고, 글자·모양은 여기서 정한다. 글자 순서 [ko, en, ja, zh].
  // 색은 app.css 의 .lounge-who-tag[data-team=…]. 색만으로 구분하지 않게 팀마다 모양(아이콘)이 다르다.
  var staffLangs = ['ko', 'en', 'ja', 'zh'];
  var staffStar = '<path d="M12 3l2.6 5.6 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.7z"/>';
  var staffTeams = {
    ops: { label: ['운영', 'Ops', '運営', '运营'], icon: staffStar, fill: true },
    clover: { label: ['MD 클로버', 'Host Clover', 'MD クローバー', 'MD Clover'], fill: true,
      icon: '<circle cx="8.5" cy="9" r="3.6"/><circle cx="15.5" cy="9" r="3.6"/><circle cx="12" cy="14.5" r="3.6"/><path d="M12 17v4"/>' },
    arun: { label: ['MD 아룬', 'Host Arun', 'MD アルン', 'MD Arun'], icon: '<path d="M12 3l8 9-8 9-8-9z"/>', fill: true },
    goat: { label: ['MD 고트', 'Host Goat', 'MD ゴート', 'MD Goat'], icon: '<path d="M5 20L12 5l7 15z"/>', fill: true },
    dj: { label: ['DJ', 'DJ', 'DJ', 'DJ'], fill: false,
      icon: '<path d="M5 14v-2a7 7 0 0 1 14 0v2"/><rect x="3.5" y="13" width="4" height="7" rx="1.5"/><rect x="16.5" y="13" width="4" height="7" rx="1.5"/>' },
    guard: { label: ['안전', 'Security', 'セキュリティ', '安全'], icon: '<path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z"/>', fill: false },
    admin: { label: ['GROOVE', 'GROOVE', 'GROOVE', 'GROOVE'], icon: staffStar, fill: true },
    groove: { label: ['GROOVE', 'GROOVE', 'GROOVE', 'GROOVE'], icon: staffStar, fill: true }
  };
  var staffRoles = { lead: ['팀장', 'Lead', 'リーダー', '队长'], sub: ['부팀장', 'Sub-lead', 'サブリーダー', '副队长'] };
  // 새 서버의 직원 표식(team 칸이 있음)만 풀어 준다. team 칸이 없으면(예전 서버) null → 예전 글자 그대로.
  function staffBadge(tag, locale) {
    if (!tag || tag.kind !== 'staff' || typeof tag.team !== 'string') return null;
    var team = tag.admin === true ? 'admin' : tag.team && Object.hasOwn(staffTeams, tag.team) && tag.team !== 'admin' ? tag.team : 'groove';
    var role = team !== 'admin' && Object.hasOwn(staffRoles, tag.role) ? tag.role : '';
    var at = staffLangs.indexOf(locale); if (at < 0) at = 1;
    return { team: team, role: role, label: staffTeams[team].label[at], roleLabel: role ? staffRoles[role][at] : '', icon: staffTeams[team].icon, fill: staffTeams[team].fill };
  }
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
    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    '<path d="M3 10l9-7 9 7v10H3zM9 20v-6h6v6"/>',
    '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4m8.4-8.4a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>'
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
    setToken: function (t) {
      if (!t || session !== t) save('gl_preview', '');
      updateSession(t);
      save('gl_token', session);
    },
    previewMode: function () { return previewRequested ? 'preview' : ''; },
    previewEligible: function () { return previewEligible; },
    isPreview: function () { return preview; },
    refreshConfig: refreshConfig,
    togglePreview: async function () {
      if (!previewEligible || !L.me) return;
      setPreviewRequest(!previewRequested);
      var token = session;
      await refreshConfig();
      if (token !== session) return;
      if (location.hash === '#/' + defaultRoute()) await L.route(null, true);
      else L.go(defaultRoute());
    },
    setLang: function (value, explicit) {
      if (!explicit && ['ja', 'zh'].includes(read('gl_lang')) && ['ko', 'en'].includes(value)) return;
      L.lang = language(value);
      save('gl_lang', L.lang);
      paintStatus();
    },
    // 화면 모드: 'dark'(인스타식 블랙, 기본) | 'light'(화이트). 이 기기에만 저장 — index.html 머리 스크립트가 첫 화면 전에 먼저 붙임
    theme: function () { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; },
    setTheme: function (value) {
      var v = value === 'light' ? 'light' : 'dark';
      save('gl_theme', v === 'light' ? 'light' : '');
      document.documentElement.dataset.theme = v;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = v === 'light' ? '#ffffff' : '#000000';
    },
    api: function (a, body) {
      var b = Object.assign({}, body, { a: a }); var t = session; if (t && !b.token && !b.admin) b.token = t;
      var mode = L.previewMode();
      if (t && b.token === t && mode) b.preview_mode = mode;
      var options = { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(b) };
      var timeout;
      if (a === 'config' || a === 'l26_active') {
        var controller = new AbortController();
        if (a === 'config') options.cache = 'no-store';
        options.signal = controller.signal;
        timeout = setTimeout(() => controller.abort(), 5000);
      }
      return fetch(API, options).then(function (r) {
        if ((a === 'config' || a === 'l26_active') && !r.ok) return { error: 'server' };
        return r.json();
      })
        .then(function (j) {
          if (t && b.token === t && session === t) {
            if (j?.error === 'auth' && !b.admin) {
              var wasPreview = preview;
              L.setToken('');
              if (wasPreview) refreshVisible();
            }
            if (j?.preview_ended && mode === 'preview' && L.previewMode() === mode) {
              setPreviewRequest(false);
              clearPreview();
              refreshVisible();
            }
          }
          return j && typeof j === 'object' ? j : { error: 'server' };
        }).catch(function () { return { error: 'network' }; })
        .finally(() => { if (timeout !== undefined) clearTimeout(timeout); });
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
    // 표식 글자만 (aria-label·그림 카드 등 글자만 쓰는 곳): 'VIP' · 'MD 클로버 팀장' · (예전 서버) 'GROOVE 영업팀'
    tagLabel: function (tag, locale = L.lang) {
      if (tag?.kind === 'vip') return 'VIP';
      if (tag?.kind !== 'staff') return '';
      const badge = staffBadge(tag, locale);
      if (badge) return badge.label + (badge.role ? ' ' + badge.roleLabel : '');
      const team = Object.hasOwn(staffTeamLabels, tag.label) ? staffTeamLabels[tag.label][locale] : '';
      return team ? 'GROOVE ' + team : 'GROOVE';
    },
    // 표식 칩 하나 (닉네임 없이). 직원 팀별 칩 = 아이콘 + 글자 + 직책 <i>. 표식이 없으면 ''.
    tagChip: function (tag, locale = L.lang) {
      const badge = staffBadge(tag, locale);
      if (badge) return '<span class="lounge-who-tag" data-kind="staff" data-team="' + badge.team + '"' + (badge.role ? ' data-role="' + badge.role + '"' : '') + '>' +
        '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="' + (badge.fill ? 'currentColor' : 'none') +
        '" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + badge.icon + '</svg>' +
        L.esc(badge.label) + (badge.role ? ' <i>' + L.esc(badge.roleLabel) + '</i>' : '') + '</span>';
      const label = L.tagLabel(tag, locale);
      return label ? '<span class="lounge-who-tag" data-kind="' + tag.kind + '">' + L.esc(label) + '</span>' : '';
    },
    // 닉네임 + 표식. 직원 팀별 칩이 붙을 때는 닉네임을 따로 감싸서, 자리가 좁으면 닉네임이 먼저 줄어들고(말줄임) 칩은 한 줄로 남는다.
    whoTag: function (person, locale = L.lang) {
      const nick = L.esc(person?.nick);
      const chip = L.tagChip(person?.tag, locale);
      if (!chip) return nick;
      return staffBadge(person.tag, locale) ? '<span class="lounge-who"><span class="lounge-who-nick">' + nick + '</span> ' + chip + '</span>' : nick + ' ' + chip;
    },
    mediaSrc: function (value) {
      if (!viewerMedia || !L.me) return value;
      var url = URL.parse(value, location.href);
      if (url?.origin === new URL(API, location.href).origin && /^\/img\/p\/[\w:-]+\/[\w-]+\.(?:jpg|webp)$/.test(url.pathname) &&
          !url.searchParams.has('media') && !url.searchParams.has('admin') && !url.searchParams.has('token')) {
        url.searchParams.set('viewer_media', viewerMedia);
        return url.href;
      }
      return value;
    },
    img: function (key) { return key ? L.mediaSrc(L.apiUrl('img/' + encodeURIComponent(key).replace(/%2F/g, '/'))) : ''; },
    publicGuest: function () { return !L.me && L.open('l26_public_view'); },
    // 라운지 서버 주소로 만든 전체 주소: L.apiUrl('p/<글id>') → 'https://…workers.dev/p/<글id>' (밖으로 보내는 공유 링크 — 서버가 미리보기(og)를 주고 앱으로 넘긴다)
    apiUrl: function (path) { return new URL(String(path || '').replace(/^\/+/, ''), new URL(API.replace(/\/$/, '') + '/', location.href)).href; },
    upload: async function (file, kind) {
      var t = session;
      if (!t) throw new Error('auth');
      var blob = await resize(file);
      if (session !== t) throw new Error('auth');
      var url = new URL('up', new URL(API.replace(/\/$/, '') + '/', location.href));
      url.searchParams.set('token', t);
      if (L.previewMode()) url.searchParams.set('preview_mode', L.previewMode());
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
    route: async function (event, configReady = false) {
      var version = ++routeVersion;
      var hash = location.hash;
      var route = hash.replace(/^#\/?/, '');
      var config = configReady ? undefined : refreshConfig();
      const requestedScreen = route.split(/[/?]/, 1)[0];
      if ((!L.me && !guestAuth.has(requestedScreen)) || !shown || !route || requestedScreen === 'l26_public' ||
          route === 'me/settings' || route === 'l26_benefits' ||
          route === 'l26_dj_feedback' || route === 'alerts/settings' ||
          Object.hasOwn(legacyRoutes, requestedScreen)) {
        await config;
        if (version !== routeVersion || hash !== location.hash) return;
      }
      var h = route || defaultRoute();
      var qi = h.indexOf('?');
      var path = qi < 0 ? h : h.slice(0, qi);
      var params = Object.create(null);
      if (qi >= 0) new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { params[k] = v; });
      var [name, ...rest] = path.split('/');
      if (rest.length) {
        try { params.id = decodeURIComponent(rest.join('/')); } catch (e) { params.id = rest.join('/'); }
      }
      if (name === 'u') name = 'user';
      const publicGuest = L.publicGuest();
      const authRoute = guestAuth.has(name) || (name === 'signup' && L.hasScreen('signup'));
      if (publicGuest && !authRoute) {
        params.live = name === 'l26_live' || (name === 'l26_public' && params.live === '1');
        name = 'l26_public';
      } else if (name === 'l26_public' && !L.open('l26_public_view')) {
        name = defaultRoute();
      }
      if (Object.hasOwn(legacyRoutes, name) && !L.open('l26_shell')) name = legacyRoutes[name];
      var def = screens[name];
      var view = document.getElementById('view');
      var here = hash || '#/' + defaultRoute();
      // 떠나는 화면이 keepScroll 이면 보던 자리를 기억 (뒤로 돌아왔을 때 L.restoreScroll 이 되돌림)
      if (cur?.keepScroll && shown) scrolls[shown] = window.scrollY;
      if (cur?.leave) {
        try { cur.leave(); } catch (e) { console.error(e); }
      }
      L.closeSheet();
      cur = def;
      routePublic = L.open('l26_public_view');
      document.getElementById('app').classList.toggle('public-view', publicGuest || name === 'l26_public');
      routeShell = L.open('l26_shell');
      routePreview = preview;
      routeDjFeedback = L.open('l26_dj_feedback');
      shown = here;
      scrollPending = def?.keepScroll && L.wentBack?.() && Object.hasOwn(scrolls, here) ? scrolls[here] : null;
      delete scrolls[here];
      document.getElementById('app').classList.toggle('own-bar', def?.bar === 'own');   // 화면이 위 막대를 직접 그림 (SPEC4 2장)
      document.getElementById('app').classList.toggle('no-tabs', publicGuest || def?.tabs === false);  // 화면 정의에 tabs: false → 아래 탭 숨김 (글쓰기·스토리 뷰어처럼 화면을 넓게 쓰는 곳)
      var root = document.createElement('div');
      view.replaceChildren(root);
      L.paintNav(name === 'l26_play' ? name : def?.nav || name);
      paintStatus();
      var titleKey = def?.title || 'nav.' + name;
      var title = L.t(titleKey);
      document.title = title === titleKey && !def?.title ? 'GROOVE LOUNGE' : title;
      window.scrollTo(0, 0);
      view.focus({ preventScroll: true });
      var gate = Object.hasOwn(gates, name) && gates[name];
      if (gate || ['play', 'tonight', 'me'].includes(name) || followerScreens.includes(name)) await config;
      if (version !== routeVersion) return;
      routeFollowCounts = L.open('l26_follow_counts');
      if (name !== 'l26_public' && !publicGuest) refreshBadges(version, config);
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
      navOn = on;
      var shell = L.open('l26_shell') || document.getElementById('app').classList.contains('public-view');
      var playTab = L.open('l26_play') ? 'l26_play' : 'play';
      var app = document.getElementById('app');
      app.classList.toggle('l26-shell', shell);
      document.querySelector('.shell-brand').href = '#/' + defaultRoute();
      if (app.classList.contains('public-view')) {
        app.querySelector('.l26-feed-shortcuts')?.remove();
        document.getElementById('tabbar').replaceChildren();
        return;
      }
      if (shell) {
        if (on === 'play' || on === 'l26_play') on = playTab;
        else if (Object.hasOwn(shellTabs, on)) on = shellTabs[on];
      }
      var items = shell
        ? [['l26_home', 'nav.tonight', 5], ['l26_live', 'nav.l26_live', 6], ['feed', 'nav.feed', 1], [playTab, 'nav.l26_play', 2], ['l26_my', 'nav.l26_my', 4]]
        : [['tonight', 'nav.tonight'], ['feed', 'nav.feed'], ['play', 'nav.play'], ['rooms', ocNav ? 'nav.openchat' : 'nav.rooms'], ['me', 'nav.me']];
      var photo = L.me?.photo ? (L.photoSrc ? L.photoSrc(L.me.photo) : L.img(L.me.photo)) : '';
      document.getElementById('tabbar').innerHTML = items.map(function (x, i) {
        var icon = (x[0] === 'me' || x[0] === 'l26_my') && photo
          ? '<img class="tab-me" src="' + L.esc(photo) + '" alt="" width="24" height="24" decoding="async">'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (x[0] === on ? 2.3 : 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[x[2] ?? i] + '</svg>';
        return '<a href="#/' + x[0] + '" data-tab="' + x[0] + '"' + (x[0] === on ? ' aria-current="page"' : '') + '>' + icon + '<span>' + L.esc(L.t(x[1])) + '</span></a>';
      }).join('');
      // The Feed tab opens the feed directly. Keep the community and chat entry points in this shell.
      var shortcuts = app.querySelector(':scope > .l26-feed-shortcuts');
      if (!shell || shown.replace(/^#\/?/, '').split('?', 1)[0] !== 'feed') {
        shortcuts?.remove();
      } else {
        if (!shortcuts) {
          shortcuts = document.createElement('nav');
          shortcuts.className = 'l26-feed-shortcuts';
          app.insertBefore(shortcuts, document.getElementById('view'));
        }
        shortcuts.setAttribute('aria-label', L.t('nav.feed'));
        shortcuts.innerHTML = '<a href="#/l26_lounge">' + L.esc(L.t('nav.l26_lounge')) + '</a><a href="#/rooms">' +
          L.esc(L.t(ocNav ? 'nav.openchat' : 'nav.rooms')) + '</a>';
      }
    },
    boot: async function () {
      paintStatus();
      window.addEventListener('online', function () {
        paintStatus();
        if (!document.hidden) refreshVisible();
      });
      window.addEventListener('offline', function () {
        paintStatus();
        resetActivity();
        if (preview) clearPreview();
        if (!document.hidden) refreshVisible();
      });
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
        if (link.getAttribute('href') !== (location.hash || '#/' + defaultRoute())) return;   // 다른 화면이면 평소대로 이동
        e.preventDefault();
        L.retap();
      });
      navigator.serviceWorker?.register('/lounge/sw.js').catch(() => {});
      await L.refreshMe();
      previewRequested = storedPreviewRequest();
      window.addEventListener('hashchange', L.route);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) scheduleActivity();
        else refreshVisible();
      });
      window.addEventListener('pagehide', () => {
        resetActivity();
        if (preview) clearPreview();
      });
      window.addEventListener('pageshow', event => { if (event.persisted && !document.hidden) refreshVisible(); });
      window.addEventListener('storage', async event => {
        if (event.key === 'gl_preview') {
          var requested = storedPreviewRequest();
          if (requested !== previewRequested) {
            previewRequested = requested;
            configPending = null;
            resetActivity();
            await refreshVisible();
          }
          return;
        }
        if (event.key !== 'gl_token' && event.key !== null) return;
        var token = read('gl_token');
        if (token === session) return;
        updateSession(token);
        await L.refreshMe();
        if (token === session) {
          previewRequested = storedPreviewRequest();
          await L.route();
        }
      });
      setInterval(() => {
        if (!document.hidden && (previewRequested || Date.now() >= nextConfigCheck)) refreshVisible();
      }, 5000);
      await L.route();
    }
  };
  L.i18n({ ko: { 'nav.tonight': '오늘 밤', 'nav.feed': '피드', 'nav.play': '놀거리', 'nav.rooms': '오픈 대화방', 'nav.openchat': '오픈채팅', 'nav.me': '나', 'core.need': '매장에서 가입하면 쓸 수 있어요', 'core.needBody': '직원에게 가입 QR을 보여 달라고 하세요. 이미 가입했다면 로그인하세요.', 'core.login': '로그인' },
           en: { 'nav.tonight': 'Tonight', 'nav.feed': 'Feed', 'nav.play': 'Play', 'nav.rooms': 'Open Chat', 'nav.openchat': 'Open Chat', 'nav.me': 'Me', 'core.need': 'Join at the club to use this', 'core.needBody': 'Ask a staff member for the sign-up QR. Already a member? Log in.', 'core.login': 'Log in' } });
  function paintStatus() {
    document.documentElement.lang = L.lang;
    paintPreview();
    document.getElementById('tabbar').setAttribute('aria-label', L.t('core.nav'));
    var status = document.getElementById('offline');
    status.textContent = L.t('core.offline');
    status.hidden = navigator.onLine;
    document.querySelectorAll('[data-lounge-inbox]').forEach(link => {
      link.setAttribute('aria-label', L.t('core.' + link.dataset.loungeInbox));
    });
  }

  function defaultRoute() {
    return L.publicGuest() ? 'l26_public' : L.open('l26_shell') ? 'l26_home' : 'tonight';
  }

  function resetActivity() {
    clearTimeout(activeTimer);
    activeTimer = undefined;
    activeAttempt = undefined;
  }

  function canRecordActivity() {
    return document.visibilityState === 'visible' && navigator.onLine && session && L.me &&
      !previewRequested && !preview && L.open('l26_metrics');
  }

  function activityDay(now) {
    return new Date(now + activityDayShift).toISOString().slice(0, 10);
  }

  function activityAlarm(delay, callback) {
    activeTimer = setTimeout(function () {
      activeTimer = undefined;
      callback();
    }, delay);
  }

  function scheduleActivity() {
    if (!canRecordActivity()) {
      resetActivity();
      return;
    }
    var now = Date.now();
    var day = activityDay(now);
    var dayEndsIn = activityDayMs - (now + activityDayShift) % activityDayMs;
    if (activeAttempt?.token === session && activeAttempt.day === day) return;
    resetActivity();
    var attempt = activeAttempt = { token: session, day: day, readyAt: performance.now() + 5000, retry: 5000 };
    if (activeRecorded?.token === session && activeRecorded.day === day) {
      activityAlarm(dayEndsIn, function () {
        activeAttempt = undefined;
        scheduleActivity();
      });
    } else {
      activityAlarm(Math.min(5000, dayEndsIn), () => recordActivity(attempt));
    }
  }

  async function recordActivity(attempt) {
    if (activeAttempt !== attempt) return;
    if (!canRecordActivity() || activityDay(Date.now()) !== attempt.day) {
      scheduleActivity();
      return;
    }
    var remaining = attempt.readyAt - performance.now();
    if (remaining > 0) {
      activityAlarm(Math.ceil(remaining), () => recordActivity(attempt));
      return;
    }
    var result = await L.api('l26_active', { biz_day: attempt.day, event_id: 'active:' + L.me.id + ':' + attempt.day });
    if (activeAttempt !== attempt) return;
    if (result.ok === true && (!result.biz_day || result.biz_day === attempt.day)) {
      activeRecorded = attempt;
      activeAttempt = undefined;
      scheduleActivity();
    } else {
      var dayEndsIn = activityDayMs - (Date.now() + activityDayShift) % activityDayMs;
      if (!canRecordActivity() || activityDay(Date.now()) !== attempt.day) {
        scheduleActivity();
        return;
      }
      activityAlarm(Math.min(attempt.retry, dayEndsIn), () => recordActivity(attempt));
      attempt.retry = Math.min(attempt.retry * 2, 60_000);
    }
  }

  function paintPreview() {
    var badge = document.getElementById('lounge-preview');
    if (badge) {
      badge.hidden = !preview;
      var label = preview ? L.t('core.preview') : '';
      if (badge.textContent !== label) badge.textContent = label;
    }
    document.querySelectorAll('[data-lounge-preview-toggle]').forEach(button => {
      button.hidden = !previewEligible;
      button.textContent = L.t(preview ? 'core.previewLegacy' : 'core.previewNew');
    });
  }

  function clearPreview() {
    if (!preview && !previewEligible) return;
    preview = previewEligible = false;
    features = Object.create(null);
    configPending = null;
    paintPreview();
    L.paintNav(navOn);
  }

  function storedPreviewRequest() {
    return Boolean(session && L.me && read('gl_preview') === L.me.id);
  }

  function setPreviewRequest(requested) {
    previewRequested = requested;
    save('gl_preview', requested ? L.me.id : '');
    configPending = null;
    resetActivity();
  }

  function updateSession(token) {
    if (session === (token || '')) return;
    session = token || '';
    viewerMedia = '';
    L.me = null;
    configPending = null;
    previewRequested = false;
    clearPreview();
    if (!session) paintBadges();
    resetActivity();
  }

  function refreshConfig() {
    if (configPending) return configPending;
    var token = session, requested = previewRequested;
    var request = L.api('config').then(result => {
      if (configPending !== request || session !== token || previewRequested !== requested) return;
      var wasShell = L.open('l26_shell'), wasPlay = L.open('l26_play');
      features = !result.error && result.open || Object.create(null);
      viewerMedia = typeof result.viewer_media === 'string' ? result.viewer_media : '';
      previewEligible = Boolean(token && result.preview_eligible === true);
      if (requested && !previewEligible) setPreviewRequest(false);
      var nextPreview = requested && previewEligible;
      if (preview !== nextPreview) resetActivity();
      preview = nextPreview;
      nextConfigCheck = Date.now() + (wasShell && result.error ? 5000 : 60_000);
      var ocChanged = !result.error && L.open('openchat') !== ocNav;
      if (ocChanged) {
        ocNav = !ocNav;
        save('gl_oc', ocNav ? '1' : '');
      }
      paintPreview();
      if (ocChanged || wasShell !== L.open('l26_shell') || (wasShell && wasPlay !== L.open('l26_play'))) L.paintNav(navOn);
      scheduleActivity();
    }).finally(() => { if (configPending === request) configPending = null; });
    configPending = request;
    return request;
  }

  async function refreshVisible() {
    var version = routeVersion;
    await refreshConfig();
    if (!shown || version !== routeVersion || document.hidden) return;
    if (routePublic !== L.open('l26_public_view')) return L.route(null, true);
    if (document.getElementById('app').classList.contains('public-view')) return;
    var name = location.hash.replace(/^#\/?/, '').split(/[/?]/, 1)[0];
    if (name === 'u') name = 'user';
    const followerScreenChanged = followerScreens.includes(name) && routeFollowCounts !== L.open('l26_follow_counts');
    if (followerScreenChanged || ((routeShell !== L.open('l26_shell') || routePreview !== preview) &&
        (!name || Object.hasOwn(legacyRoutes, name) || name === 'l26_benefits'))) {
      return L.route(null, true);
    }
    if (routeDjFeedback !== L.open('l26_dj_feedback') &&
        ['l26_dj_feedback', 'l26_my', 'alerts'].includes(name)) {
      return L.route(null, true);
    }
    refreshBadges(version);
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
  L.i18n({
    ko: { 'nav.l26_home': 'HOME', 'nav.l26_live': 'LIVE', 'nav.l26_lounge': '라운지', 'nav.l26_my': 'MY', 'nav.l26_play': '놀거리' },
    en: { 'nav.l26_home': 'HOME', 'nav.l26_live': 'LIVE', 'nav.l26_lounge': 'Lounge', 'nav.l26_my': 'MY', 'nav.l26_play': 'Play' },
    ja: { 'nav.l26_home': 'ホーム', 'nav.l26_live': 'ライブ', 'nav.l26_lounge': 'ラウンジ', 'nav.l26_my': 'マイページ', 'nav.l26_play': '遊び' },
    zh: { 'nav.l26_home': '首页', 'nav.l26_live': '现场', 'nav.l26_lounge': '休息室', 'nav.l26_my': '我的', 'nav.l26_play': '娱乐' }
  });

  L.i18n({
    ko: { 'core.preview': '미리보기', 'core.previewNew': '2.0 미리보기', 'core.previewLegacy': '기존 화면', 'core.previewReadOnly': '미리보기에서는 이 작업을 할 수 없어요.', 'core.previewBenefit': '혜택 신청을 시험했어요. 실제 혜택은 지급되지 않아요.' },
    en: { 'core.preview': 'Preview', 'core.previewNew': 'Preview 2.0', 'core.previewLegacy': 'Classic view', 'core.previewReadOnly': 'This action is unavailable in preview.', 'core.previewBenefit': 'Benefit request tested. No benefit was issued.' },
    ja: { 'core.preview': 'プレビュー', 'core.previewNew': '2.0 プレビュー', 'core.previewLegacy': '従来の画面', 'core.previewReadOnly': 'プレビューではこの操作を利用できません。', 'core.previewBenefit': '特典申請をテストしました。特典は発行されません。' },
    zh: { 'core.preview': '预览', 'core.previewNew': '预览 2.0', 'core.previewLegacy': '经典界面', 'core.previewReadOnly': '预览模式下无法进行此操作。', 'core.previewBenefit': '已测试福利申请。未发放福利。' }
  });
  // Stub screens keep the current destinations reachable until their lanes supply content.
  L.renderL26Shell = function (root, title, links) {
    root.className = 'l26-screen';
    root.innerHTML = '<h1>' + L.esc(L.t(title)) + '</h1><div class="l26-links">' +
      links.map(([path, label]) => '<a class="btn" href="#/' + path + '">' + L.esc(L.t(label)) + '</a>').join('') +
      '</div>';
  };
  L.screen('rooms', { nav: 'rooms', render: function (root) { root.innerHTML = '<h1>' + L.esc(L.t('nav.rooms')) + '</h1><p class="muted">' + L.esc(L.t('core.soon')) + '</p>'; } });
})();
