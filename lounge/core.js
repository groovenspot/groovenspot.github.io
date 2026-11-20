/* 그루브 라운지 core — ⑧ C-shell 담당. 다른 화면은 아래 Lounge.* 만 씀 (lounge/SPEC.md 6). 이 기본판은 최소 동작판 */
(function () {
  var API = window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  var screens = {}, dict = { ko: {}, en: {} }, cur = null;
  var lang = (function () { try { return localStorage.getItem('gl_lang') || ((navigator.language || 'ko').slice(0, 2) === 'ko' ? 'ko' : 'en'); } catch (e) { return 'ko'; } })();
  function token() { try { return localStorage.getItem('gl_token') || ''; } catch (e) { return ''; } }
  var L = window.Lounge = {
    me: null, lang: lang,
    setToken: function (t) { try { if (t) localStorage.setItem('gl_token', t); else localStorage.removeItem('gl_token'); } catch (e) {} },
    api: function (a, body) {
      var b = Object.assign({ a: a }, body || {}); var t = token(); if (t && !b.token) b.token = t;
      return fetch(API, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.error === 'auth' && t) { L.setToken(''); L.me = null; } return j; }).catch(function () { return { error: 'network' }; });
    },
    img: function (key) { return key ? API.replace(/\/$/, '') + '/img/' + encodeURIComponent(key).replace(/%2F/g, '/') : ''; },
    upload: function (file, kind) { return Promise.reject(new Error('⑧ 이 만듦')); },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    i18n: function (d) { Object.keys(d).forEach(function (l) { dict[l] = Object.assign(dict[l] || {}, d[l]); }); },
    t: function (k, v) { var s = (dict[L.lang] && dict[L.lang][k]) || dict.ko[k] || k; if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); }); return s; },
    screen: function (name, def) { screens[name] = def; },
    go: function (path) { location.hash = '#/' + String(path).replace(/^#?\/?/, ''); },
    toast: function (m) { var t = document.getElementById('toast'); t.textContent = m; t.hidden = false; clearTimeout(L._tt); L._tt = setTimeout(function () { t.hidden = true; }, 2600); },
    sheet: function (html) { var s = document.getElementById('sheet'); s.innerHTML = '<div class="in">' + html + '</div>'; s.hidden = false; s.onclick = function (e) { if (e.target === s) L.closeSheet(); }; return s.firstChild; },
    closeSheet: function () { var s = document.getElementById('sheet'); s.hidden = true; s.innerHTML = ''; },
    needLogin: function () { if (L.me) return false; L.sheet('<h2>' + L.esc(L.t('core.need')) + '</h2><p class="muted">' + L.esc(L.t('core.needBody')) + '</p><button class="btn" onclick="Lounge.closeSheet();Lounge.go(\'login\')">' + L.esc(L.t('core.login')) + '</button>'); return true; },
    refreshMe: function () { if (!token()) { L.me = null; return Promise.resolve(null); } return L.api('me').then(function (j) { L.me = j && j.me || null; return L.me; }); },
    route: function () {
      var h = location.hash.replace(/^#\/?/, '') || 'tonight', qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, params = {};
      if (qi >= 0) new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { params[k] = v; });
      var parts = path.split('/'), name = parts[0]; if (parts[1]) params.id = decodeURIComponent(parts.slice(1).join('/'));
      if (name === 'u') name = 'user';
      var def = screens[name] || screens.tonight; if (!def) return;
      if (cur && cur.leave) try { cur.leave(); } catch (e) {}
      cur = def; var root = document.getElementById('view'); root.innerHTML = '';
      L.paintNav(def.nav || name);
      if (def.auth && !L.me) { L.needLogin(); return; }
      def.render(root, params);
    },
    paintNav: function (on) {
      var items = [['tonight', 'nav.tonight'], ['feed', 'nav.feed'], ['play', 'nav.play'], ['rooms', 'nav.rooms'], ['me', 'nav.me']];
      document.getElementById('tabbar').innerHTML = items.map(function (x) { return '<a href="#/' + x[0] + '"' + (x[0] === on ? ' aria-current="page"' : '') + '>' + L.esc(L.t(x[1])) + '</a>'; }).join('');
    },
    boot: function () { window.addEventListener('hashchange', L.route); L.refreshMe().then(L.route); }
  };
  L.i18n({ ko: { 'nav.tonight': '오늘 밤', 'nav.feed': '피드', 'nav.play': '놀거리', 'nav.rooms': '대화방', 'nav.me': '나', 'core.need': '매장에서 가입하면 쓸 수 있어요', 'core.needBody': '직원에게 가입 QR을 보여 달라고 하세요. 이미 가입했다면 로그인하세요.', 'core.login': '로그인' },
           en: { 'nav.tonight': 'Tonight', 'nav.feed': 'Feed', 'nav.play': 'Play', 'nav.rooms': 'Rooms', 'nav.me': 'Me', 'core.need': 'Join at the club to use this', 'core.needBody': 'Ask a staff member for the sign-up QR. Already a member? Log in.', 'core.login': 'Log in' } });
  L.screen('rooms', { nav: 'rooms', render: function (root) { root.innerHTML = '<h1>' + L.esc(L.t('nav.rooms')) + '</h1><p class="muted">' + (L.lang === 'ko' ? '준비 중이에요' : 'Coming soon') + '</p>'; } });
})();
