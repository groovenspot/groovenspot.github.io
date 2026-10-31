/* Groove & Spot 관리자: 신청곡 확인(ntfy), DJ 타임테이블·이벤트 편집(GitHub API로 data/*.json 커밋) */
(function () {
  'use strict';
  var CFG = window.GSA;
  var API = 'https://api.github.com/repos/' + CFG.owner + '/' + CFG.repo + '/contents/';
  var TOKEN_KEY = 'gs_admin_token';

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function toast(msg) { var el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 3200); }

  /* ---------- 한국 시간 / 영업일 ---------- */
  function kst() { return new Date(Date.now() + 9 * 3600e3); }
  function bizDate() { var d = kst(); if (d.getUTCHours() < 8) d = new Date(d.getTime() - 864e5); return d.toISOString().slice(0, 10); }
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function dateLabel(iso) { var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + ' (' + DOW[new Date(iso + 'T00:00:00Z').getUTCDay()] + ')'; }
  function nightMins(hhmm) { var p = hhmm.split(':'), m = (+p[0]) * 60 + (+p[1] || 0); return m < 720 ? m + 1440 : m; }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- 탭 ---------- */
  function showTab(name) {
    $$('.adm-tabs [data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    store('gs_admin_tab', name);
    if (name !== 'requests') ensureLogin();
  }
  $$('.adm-tabs [data-tab]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });

  /* =========================================================
     신청곡: 손님 페이지가 ntfy 토픽으로 보낸 메시지를 12시간치 읽는다
     ========================================================= */
  var played = {};
  try { played = JSON.parse(store('gs_played') || '{}'); } catch (e) { played = {}; }
  var rqFilter = 'all', lastIds = null, requests = [];

  function parseRequest(m) {
    var lines = String(m.message || '').split('\n');
    var head = lines[0].split(' — ');
    var o = { id: m.id, time: m.time, song: head[0], artist: head.slice(1).join(' — '), floor: (m.tags || []).filter(function (x) { return x === '2F' || x === '3F'; })[0] || '' };
    lines.slice(1).forEach(function (l) {
      if (l.indexOf('👤 ') === 0) o.nick = l.slice(2).trim();
      else if (l.indexOf('💬 ') === 0) o.memo = l.slice(2).trim();
    });
    return o;
  }

  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .18);
    } catch (e) {}
  }

  function renderRequests() {
    var hide = $('#rq-hide').checked;
    var list = requests.filter(function (r) { return (rqFilter === 'all' || r.floor === rqFilter) && !(hide && played[r.id]); });
    var waiting = requests.filter(function (r) { return !played[r.id]; }).length;
    $('#rq-count').textContent = waiting ? waiting : '';
    $('#rq-list').innerHTML = list.length ? list.map(function (r) {
      var d = new Date((r.time + 9 * 3600) * 1000);
      return '<li class="rq' + (played[r.id] ? ' done' : '') + '"><span class="rq-t">' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + '</span>' +
        '<span class="chip ' + (r.floor === '3F' ? 's' : 'g') + '">' + esc(r.floor || '?') + '</span>' +
        '<span class="rq-main"><b>' + esc(r.song) + '</b>' + (r.artist ? ' <span class="muted">— ' + esc(r.artist) + '</span>' : '') +
        ((r.nick || r.memo) ? '<small>' + esc([r.nick && '👤 ' + r.nick, r.memo && '💬 ' + r.memo].filter(Boolean).join('  ')) + '</small>' : '') + '</span>' +
        '<button class="btn rq-play" type="button" data-id="' + esc(r.id) + '">' + (played[r.id] ? '되돌리기' : '틀었음') + '</button></li>';
    }).join('') : '<li class="empty">아직 들어온 신청곡이 없어요.</li>';
  }

  var REFRESH_MS = 3 * 60 * 1000, nextAt = 0, polling = false, lastOk = '';
  function pollRequests() {
    if (polling) return;
    polling = true; nextAt = Date.now() + REFRESH_MS;
    var btn = $('#rq-refresh'); if (btn) { btn.disabled = true; btn.textContent = '불러오는 중…'; }
    fetch('https://ntfy.sh/' + CFG.topic + '/json?poll=1&since=12h', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        requests = txt.split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } })
          .filter(function (m) { return m && m.event === 'message'; }).map(parseRequest).reverse();
        var ids = requests.map(function (r) { return r.id; });
        if (lastIds && $('#rq-sound').checked && ids.some(function (id) { return lastIds.indexOf(id) < 0; })) beep();
        lastIds = ids;
        var d = kst();
        lastOk = '최근 12시간 · ' + requests.length + '곡 · ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' 확인';
        renderRequests();
      })
      .catch(function () { lastOk = '⚠️ 신청곡을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침을 눌러 주세요.'; })
      .then(function () { polling = false; if (btn) { btn.disabled = false; btn.textContent = '🔄 새로고침'; } tickStatus(); });
  }
  // 상태 줄: 마지막 확인 시각 + 다음 자동 새로고침까지 남은 시간
  function tickStatus() {
    var left = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
    $('#rq-status').textContent = (lastOk || '불러오는 중…') + (nextAt ? ' · 자동 새로고침 ' + Math.floor(left / 60) + ':' + pad(left % 60) + ' 후' : '');
  }

  $('#rq-list').addEventListener('click', function (e) {
    var b = e.target.closest('.rq-play'); if (!b) return;
    if (played[b.dataset.id]) delete played[b.dataset.id]; else played[b.dataset.id] = Date.now();
    // 하루 지난 기록은 정리
    Object.keys(played).forEach(function (k) { if (Date.now() - played[k] > 864e5) delete played[k]; });
    store('gs_played', JSON.stringify(played));
    renderRequests();
  });
  $$('#rq-filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      rqFilter = b.dataset.f;
      $$('#rq-filter button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      renderRequests();
    });
  });
  $('#rq-hide').addEventListener('change', renderRequests);
  $('#rq-refresh').addEventListener('click', pollRequests);
  pollRequests();
  setInterval(function () { if (Date.now() >= nextAt) pollRequests(); else tickStatus(); }, 1000);
  // 화면을 다시 켰을 때 3분이 지났으면 바로 새로고침
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() >= nextAt) pollRequests(); });

  /* =========================================================
     GitHub 로그인 + 파일 읽기/쓰기
     ========================================================= */
  var token = store(TOKEN_KEY);
  var loggedIn = false;

  function gh(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {});
    return fetch(path.indexOf('https://') === 0 ? path : API + path, opts).then(function (r) {
      if (r.status === 401) { logout(); throw new Error('관리자 키가 만료됐거나 틀렸어요. 다시 로그인해 주세요.'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || r.status); return j; });
    });
  }
  function b64encode(str) { var bytes = new TextEncoder().encode(str), bin = ''; for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
  function b64decode(b64) { var bin = atob(b64.replace(/\n/g, '')), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }

  function readJSON(file, fallback) {
    return gh(file + '?ref=' + CFG.branch + '&t=' + Date.now()).then(function (j) {
      var data; try { data = JSON.parse(b64decode(j.content)); } catch (e) { data = fallback; }
      return { data: data, sha: j.sha };
    }).catch(function (e) { if (/Not Found/.test(e.message)) return { data: fallback, sha: null }; throw e; });
  }
  // 저장 직전에 최신본을 다시 읽고 바꿀 부분만 적용 → 다른 기기에서 고친 내용을 덮어쓰지 않는다
  function updateJSON(file, fallback, mutate, message) {
    return readJSON(file, fallback).then(function (cur) {
      var next = mutate(cur.data);
      var body = { message: message, content: b64encode(JSON.stringify(next, null, 2) + '\n'), branch: CFG.branch };
      if (cur.sha) body.sha = cur.sha;
      return gh(file, { method: 'PUT', body: JSON.stringify(body) }).then(function () { return next; });
    });
  }
  function putBinary(path, base64, message) {
    return gh(path + '?ref=' + CFG.branch).then(function (j) { return j.sha; }).catch(function () { return null; }).then(function (sha) {
      var body = { message: message, content: base64, branch: CFG.branch }; if (sha) body.sha = sha;
      return gh(path, { method: 'PUT', body: JSON.stringify(body) });
    });
  }

  function renderLoginState() {
    $$('[data-need-login]').forEach(function (el) { el.hidden = loggedIn; if (!loggedIn && !el.firstChild) el.appendChild($('#login-tpl').content.cloneNode(true)); });
    $$('[data-when-login]').forEach(function (el) { el.hidden = !loggedIn; });
    $('#adm-user').innerHTML = loggedIn ? '<button class="btn" type="button" id="logout">로그아웃</button>' : '';
    var lo = $('#logout'); if (lo) lo.addEventListener('click', function () { logout(); toast('로그아웃했어요.'); });
  }
  function logout() { token = null; loggedIn = false; store(TOKEN_KEY, null); renderLoginState(); }

  function verify(t) {
    token = t;
    return gh('https://api.github.com/repos/' + CFG.owner + '/' + CFG.repo).then(function (j) {
      if (!j.permissions || !j.permissions.push) throw new Error('이 키에는 저장 권한이 없어요. groovenspot 계정에서 public_repo 권한으로 만들어 주세요.');
      store(TOKEN_KEY, t); loggedIn = true; renderLoginState(); loadTimetable(); loadEvents(); loadGallery();
    });
  }
  var loginStarted = false;
  function ensureLogin() {
    if (loginStarted) return; loginStarted = true;
    renderLoginState();
    if (token) verify(token).catch(function (e) { logout(); toast(e.message); });
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-login]'); if (!f) return;
    e.preventDefault();
    var t = f.token.value.trim(); if (!t) return;
    f.querySelector('button').disabled = true;
    verify(t).then(function () { toast('로그인했어요.'); }).catch(function (err) { token = null; toast(err.message); }).then(function () { f.querySelector('button').disabled = false; });
  });

  function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn._t = btn.textContent; btn.textContent = '저장 중…'; } else if (btn._t) btn.textContent = btn._t; }
  var LIVE_NOTE = ' · 사이트에는 1~2분 안에 반영돼요.';

  /* =========================================================
     DJ 타임테이블  data/timetable.json  { "YYYY-MM-DD": { "2F": [{t, n}], "3F": [...] } }
     ========================================================= */
  var TT = {}, ttFloor = '2F';
  var ttDate = $('#tt-date');
  ttDate.value = bizDate();

  function sortSlots(list) { return list.slice().sort(function (a, b) { return nightMins(a.t) - nightMins(b.t); }); }
  function curSlots() { var d = TT[ttDate.value] || {}; return d[ttFloor] || []; }
  function setSlots(list) { TT[ttDate.value] = TT[ttDate.value] || {}; TT[ttDate.value][ttFloor] = sortSlots(list); }

  function renderTT() {
    var list = curSlots();
    $('#tt-rows').innerHTML = list.length ? list.map(function (s, i) {
      return '<li><input type="time" value="' + esc(s.t) + '" data-i="' + i + '" data-k="t" aria-label="시간"><input value="' + esc(s.n) + '" data-i="' + i + '" data-k="n" aria-label="DJ 이름"><button class="btn" type="button" data-del="' + i + '" aria-label="삭제">✕</button></li>';
    }).join('') : '<li class="empty">' + dateLabel(ttDate.value) + ' ' + ttFloor + ' 라인업이 비어 있어요.</li>';
  }
  function loadTimetable() {
    return readJSON('data/timetable.json', {}).then(function (r) { TT = r.data || {}; renderTT(); }).catch(function (e) { toast(e.message); });
  }
  ttDate.addEventListener('change', renderTT);
  $$('#tt-floor button').forEach(function (b) {
    b.addEventListener('click', function () {
      ttFloor = b.dataset.f;
      $$('#tt-floor button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      renderTT();
    });
  });
  $('#tt-rows').addEventListener('change', function (e) {
    var el = e.target; if (el.dataset.i == null) return;
    var list = curSlots().slice(); list[+el.dataset.i] = Object.assign({}, list[+el.dataset.i]); list[+el.dataset.i][el.dataset.k] = el.value.trim();
    setSlots(list); renderTT();
  });
  $('#tt-rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var list = curSlots().slice(); list.splice(+b.dataset.del, 1); setSlots(list); renderTT();
  });
  $('#tt-add').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, t = f.t.value, n = f.n.value.trim(); if (!t || !n) return;
    setSlots(curSlots().concat([{ t: t, n: n }])); f.n.value = ''; f.n.focus(); renderTT();
  });
  $('#tt-clear').addEventListener('click', function () { setSlots([]); renderTT(); });

  function cleanDay(day) {
    var out = {};
    ['2F', '3F'].forEach(function (f) { var l = (day && day[f] || []).filter(function (s) { return s.t && s.n; }).map(function (s) { return { t: s.t, n: s.n }; }); if (l.length) out[f] = sortSlots(l); });
    return out;
  }
  function saveDays(days, btn) {
    busy(btn, true);
    var dates = Object.keys(days).sort();
    return updateJSON('data/timetable.json', {}, function (cur) {
      cur = cur || {};
      dates.forEach(function (d) { var c = cleanDay(days[d]); if (Object.keys(c).length) cur[d] = c; else delete cur[d]; });
      // 90일 넘게 지난 날짜는 정리
      var cutoff = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      Object.keys(cur).forEach(function (d) { if (d < cutoff) delete cur[d]; });
      var sorted = {}; Object.keys(cur).sort().forEach(function (d) { sorted[d] = cur[d]; });
      return sorted;
    }, '타임테이블 수정: ' + dates.join(', ')).then(function (next) {
      TT = next; renderTT(); toast(dates.length + '일치 타임테이블을 저장했어요' + LIVE_NOTE);
    }).catch(function (e) { toast('저장 실패: ' + e.message); }).then(function () { busy(btn, false); });
  }
  $('#tt-save').addEventListener('click', function (e) { var d = {}; d[ttDate.value] = TT[ttDate.value] || {}; saveDays(d, e.target); });

  // 예전 관리자 "주간 일정 붙여넣기" 형식: 층 줄 / "11월7일 금요일" 줄 / "11:00 N" 줄. 시간은 12시간제로 적혀 있다.
  function to24(hhmm) {
    var p = hhmm.split(':'), h = +p[0], m = p[1];
    if (h >= 7 && h <= 11) h += 12;      // 7:00~11:59 → 밤
    else if (h === 12) h = 0;             // 12:xx → 자정 이후
    return pad(h % 24) + ':' + m;
  }
  function parseWeek(txt) {
    var now = kst(), year = now.getUTCFullYear(), res = {}, curD = null, curF = null, cnt = 0;
    txt.split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim(); if (!line) return;
      var mF = line.match(/([23])\s*(층|F\b)/i);
      if (mF) curF = mF[1] === '3' ? '3F' : '2F';
      else if (/spot/i.test(line) && !/\d{1,2}:\d{2}/.test(line)) curF = '3F';
      else if (/groove/i.test(line) && !/\d{1,2}:\d{2}/.test(line)) curF = '2F';
      var mD = line.match(/(\d{1,2})\s*[월\/.]\s*(\d{1,2})\s*일?/);
      if (mD && !/^\d{1,2}:\d{2}/.test(line)) {
        var mo = +mD[1], y = year;
        if (mo < now.getUTCMonth() + 1 - 6) y++;   // 12월에 1월 일정을 넣는 경우
        curD = y + '-' + pad(mo) + '-' + pad(+mD[2]); return;
      }
      var mS = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
      if (mS && curD && curF) {
        var name = mS[2].replace(/[✅☑✔]️?/g, '').trim();
        res[curD] = res[curD] || {}; res[curD][curF] = res[curD][curF] || [];
        res[curD][curF].push({ t: to24(mS[1]), n: name }); cnt++;
      }
    });
    return { days: res, count: cnt };
  }
  var parsed = null;
  $('#tt-parse').addEventListener('click', function () {
    var r = parseWeek($('#tt-bulk').value || '');
    parsed = r.count ? r.days : null;
    $('#tt-bulk-save').disabled = !parsed;
    $('#tt-preview').innerHTML = parsed ? Object.keys(parsed).sort().map(function (d) {
      return '<div class="panel tt-prev"><b>' + dateLabel(d) + '</b>' + ['2F', '3F'].map(function (f) {
        var l = parsed[d][f]; if (!l) return '';
        return '<p><span class="chip ' + (f === '2F' ? 'g' : 's') + '">' + f + '</span> ' + sortSlots(l).map(function (s) { return esc(s.t + ' ' + s.n); }).join(' · ') + '</p>';
      }).join('') + '</div>';
    }).join('') + '<p class="muted small">' + r.count + '개 슬롯을 읽었어요. 확인 후 저장을 누르세요. 같은 날짜·층의 기존 라인업은 이걸로 바뀌어요.</p>' : '<p class="muted">인식된 라인업이 없어요. 층 줄, 날짜 줄(예: 11월7일), 시간+이름 줄 형식인지 확인해 주세요.</p>';
  });
  $('#tt-bulk-save').addEventListener('click', function (e) {
    if (!parsed) return;
    var days = {};
    Object.keys(parsed).forEach(function (d) { days[d] = Object.assign({}, TT[d] || {}, parsed[d]); });
    saveDays(days, e.target).then(function () { parsed = null; $('#tt-bulk').value = ''; $('#tt-preview').innerHTML = ''; e.target.disabled = true; });
  });

  /* =========================================================
     이벤트  data/events.json
     ========================================================= */
  var EVENTS = [], pendingFlyer = null;
  var form = $('#ev-form');
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, ''); }
  function evId(e) { return e.id || e.date + '-' + slug(e.title); }

  function renderEvents() {
    var today = bizDate();
    var list = EVENTS.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $('#ev-list').innerHTML = list.length ? list.map(function (e) {
      var past = e.date < today, id = evId(e);
      var lineup = e.lineup ? Object.keys(e.lineup).map(function (f) { return f + ' ' + (e.lineup[f] || []).join(', '); }).join(' / ') : '';
      return '<li class="panel' + (past ? ' past' : '') + '"><div><b>' + esc(dateLabel(e.date)) + ' · ' + esc(e.title) + '</b>' + (past ? ' <span class="chip">지남</span>' : '') +
        '<p class="muted small">' + esc([e.floor || '2F+3F', e.open && 'OPEN ' + e.open, e.genre, lineup].filter(Boolean).join(' · ')) + '</p></div>' +
        '<div class="adm-act"><a class="btn" href="/event/?id=' + encodeURIComponent(id) + '" target="_blank">보기</a><button class="btn" type="button" data-edit="' + esc(id) + '">수정</button><button class="btn" type="button" data-remove="' + esc(id) + '">삭제</button></div></li>';
    }).join('') : '<li class="empty">등록된 이벤트가 없어요.</li>';
  }
  function loadEvents() {
    return readJSON('data/events.json', []).then(function (r) { EVENTS = Array.isArray(r.data) ? r.data : []; renderEvents(); }).catch(function (e) { toast(e.message); });
  }
  function resetForm() {
    form.reset(); form.id.value = ''; form.dataset.flyer = ''; form.date.value = bizDate(); pendingFlyer = null; $('#ev-flyer').innerHTML = '';
    $('#ev-save').textContent = '이벤트 저장';
  }
  resetForm();
  $('#ev-reset').addEventListener('click', resetForm);

  $('#ev-list').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-remove]');
    if (ed) {
      var ev = EVENTS.filter(function (x) { return evId(x) === ed.dataset.edit; })[0]; if (!ev) return;
      resetForm();
      form.id.value = evId(ev); form.date.value = ev.date; form.title.value = ev.title; form.floor.value = ev.floor || '2F+3F';
      form.open.value = ev.open || ''; form.genre.value = typeof ev.genre === 'string' ? ev.genre : (ev.genre && ev.genre.ko) || '';
      form.entry.value = typeof ev.entry === 'string' ? ev.entry : (ev.entry && ev.entry.ko) || '';
      form.desc.value = typeof ev.desc === 'string' ? ev.desc : (ev.desc && ev.desc.ko) || '';
      form.l2.value = ((ev.lineup && ev.lineup['2F']) || []).join(', '); form.l3.value = ((ev.lineup && ev.lineup['3F']) || []).join(', ');
      if (ev.flyer) $('#ev-flyer').innerHTML = '<img src="' + esc(ev.flyer) + '" alt=""><span class="muted small">현재 플라이어 (새 이미지를 고르면 바뀌어요)</span>';
      form.dataset.flyer = ev.flyer || '';
      $('#ev-save').textContent = '수정 내용 저장';
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (rm) {
      var id = rm.dataset.remove;
      if (rm.dataset.confirm !== '1') { rm.dataset.confirm = '1'; rm.textContent = '정말 삭제?'; setTimeout(function () { rm.dataset.confirm = ''; rm.textContent = '삭제'; }, 4000); return; }
      busy(rm, true);
      updateJSON('data/events.json', [], function (cur) { return (Array.isArray(cur) ? cur : []).filter(function (x) { return evId(x) !== id; }); }, '이벤트 삭제: ' + id)
        .then(function (next) { EVENTS = next; renderEvents(); toast('이벤트를 삭제했어요' + LIVE_NOTE); })
        .catch(function (err) { toast('삭제 실패: ' + err.message); busy(rm, false); });
    }
  });

  // 플라이어: 브라우저에서 가로 1080px JPEG로 줄인 뒤 assets/flyers/ 에 올린다
  form.flyerFile.addEventListener('change', function () {
    var file = form.flyerFile.files[0]; if (!file) return;
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var w = Math.min(1080, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
      var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      var data = c.toDataURL('image/jpeg', .85);
      pendingFlyer = data.split(',')[1];
      $('#ev-flyer').innerHTML = '<img src="' + data + '" alt=""><span class="muted small">' + w + '×' + h + ' · 저장할 때 함께 올라가요</span>';
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { toast('이미지를 읽지 못했어요.'); };
    img.src = url;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var date = form.date.value, title = form.title.value.trim();
    if (!date || !title) { toast('날짜와 이벤트 이름은 꼭 넣어 주세요.'); return; }
    var oldId = form.id.value;
    var ev = { date: date, title: title, floor: form.floor.value };
    var newId = date + '-' + slug(title);
    ev.id = oldId || newId;
    if (form.open.value) ev.open = form.open.value;
    if (form.genre.value.trim()) ev.genre = form.genre.value.trim();
    if (form.entry.value.trim()) ev.entry = form.entry.value.trim();
    if (form.desc.value.trim()) ev.desc = form.desc.value.trim();
    var lineup = {};
    [['2F', form.l2.value], ['3F', form.l3.value]].forEach(function (p) { var l = p[1].split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean); if (l.length) lineup[p[0]] = l; });
    if (Object.keys(lineup).length) ev.lineup = lineup;
    if (form.dataset.flyer) ev.flyer = form.dataset.flyer;

    var btn = $('#ev-save'); busy(btn, true);
    var step = Promise.resolve();
    if (pendingFlyer) {
      var path = 'assets/flyers/' + ev.id + '-' + Date.now().toString(36) + '.jpg';
      step = putBinary(path, pendingFlyer, '플라이어 업로드: ' + ev.id).then(function () { ev.flyer = '/' + path; });
    }
    step.then(function () {
      return updateJSON('data/events.json', [], function (cur) {
        cur = (Array.isArray(cur) ? cur : []).filter(function (x) { return evId(x) !== ev.id; });
        cur.push(ev);
        return cur.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      }, (oldId ? '이벤트 수정: ' : '이벤트 추가: ') + ev.date + ' ' + ev.title);
    }).then(function (next) {
      EVENTS = next; renderEvents(); resetForm(); form.dataset.flyer = '';
      toast('이벤트를 저장했어요' + LIVE_NOTE);
    }).catch(function (err) { toast('저장 실패: ' + err.message); }).then(function () { busy(btn, false); });
  });

  /* =========================================================
     사진첩  data/gallery.json + assets/gallery/<앨범id>/
     여러 파일을 Git Data API로 한 번에 커밋한다 (사진 + 썸네일 + gallery.json)
     ========================================================= */
  var GAL = [];
  var GAPI = 'https://api.github.com/repos/' + CFG.owner + '/' + CFG.repo + '/git/';

  // changes: [{ path, base64 } | { path, text } | { path, remove: true }], jsonMutators: { 'data/x.json': fn(cur) }
  function commitFiles(changes, jsonMutators, message, attempt) {
    attempt = attempt || 1;
    var headSha, baseTree, jsonOut = {};
    return gh(GAPI + 'ref/heads/' + CFG.branch).then(function (ref) {
      headSha = ref.object.sha;
      return gh(GAPI + 'commits/' + headSha);
    }).then(function (c) {
      baseTree = c.tree.sha;
      var paths = Object.keys(jsonMutators || {});
      return Promise.all(paths.map(function (p) {
        return gh(p + '?ref=' + headSha).then(function (j) { return JSON.parse(b64decode(j.content)); }).catch(function () { return null; })
          .then(function (cur) { jsonOut[p] = jsonMutators[p](cur); });
      }));
    }).then(function () {
      var all = changes.concat(Object.keys(jsonOut).map(function (p) { return { path: p, text: JSON.stringify(jsonOut[p], null, 2) + '\n' }; }));
      // 큰 파일은 blob으로 먼저 올린다 (동시에 4개씩)
      var entries = [], i = 0;
      function next() {
        if (i >= all.length) return Promise.resolve();
        var batch = all.slice(i, i + 4); i += 4;
        return Promise.all(batch.map(function (ch) {
          if (ch.remove) { entries.push({ path: ch.path, mode: '100644', type: 'blob', sha: null }); return null; }
          if (ch.text != null) { entries.push({ path: ch.path, mode: '100644', type: 'blob', content: ch.text }); return null; }
          return gh(GAPI + 'blobs', { method: 'POST', body: JSON.stringify({ content: ch.base64, encoding: 'base64' }) })
            .then(function (b) { entries.push({ path: ch.path, mode: '100644', type: 'blob', sha: b.sha }); if (ch.onDone) ch.onDone(); });
        })).then(next);
      }
      return next().then(function () { return gh(GAPI + 'trees', { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree: entries }) }); });
    }).then(function (tree) {
      return gh(GAPI + 'commits', { method: 'POST', body: JSON.stringify({ message: message, tree: tree.sha, parents: [headSha] }) });
    }).then(function (commit) {
      return gh(GAPI + 'refs/heads/' + CFG.branch, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    }).then(function () { return jsonOut; }).catch(function (e) {
      // 그 사이 다른 저장이 있었으면 최신 상태에서 한 번 더
      if (attempt < 3 && /fast forward|Update is not a fast/i.test(e.message)) return commitFiles(changes, jsonMutators, message, attempt + 1);
      throw e;
    });
  }

  function resizeTo(file, maxSide, quality) {
    var make = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); }) : Promise.reject();
    return make.catch(function () {
      return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = URL.createObjectURL(file); });
    }).then(function (img) {
      var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { base64: c.toDataURL('image/jpeg', quality).split(',')[1], w: c.width, h: c.height };
    });
  }

  var alPick = $('#al-pick'), alDate = $('#al-date'), alTitle = $('#al-title'), alEvent = $('#al-event'), alFiles = $('#al-files');
  alDate.value = bizDate();

  function renderAlbums() {
    var sorted = GAL.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    alPick.innerHTML = '<option value="">+ 새 앨범 만들기</option>' + sorted.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(dateLabel(a.date) + ' · ' + a.title + ' (' + a.photos.length + '장)') + '</option>'; }).join('');
    $('#al-list').innerHTML = sorted.length ? sorted.map(function (a) {
      return '<div class="panel al-card"><div class="al-top"><b>' + esc(dateLabel(a.date) + ' · ' + a.title) + '</b> <span class="muted small">' + a.photos.length + '장</span>' +
        '<span class="adm-act"><a class="btn" href="/gallery/#' + encodeURIComponent(a.id) + '" target="_blank">보기</a><button class="btn" type="button" data-al-del="' + esc(a.id) + '">앨범 삭제</button></span></div>' +
        '<div class="al-thumbs">' + a.photos.map(function (p, i) { return '<span class="al-t"><img src="' + esc(p.thumb || p.src) + '" alt="" loading="lazy"><button type="button" title="이 사진 삭제" data-ph-del="' + esc(a.id) + '|' + i + '">✕</button></span>'; }).join('') + '</div></div>';
    }).join('') : '<p class="empty">아직 앨범이 없어요. 위에서 첫 사진을 올려 보세요.</p>';
  }
  function loadGallery() {
    return Promise.all([readJSON('data/gallery.json', []), readJSON('data/events.json', [])]).then(function (r) {
      GAL = Array.isArray(r[0].data) ? r[0].data : [];
      var evs = (Array.isArray(r[1].data) ? r[1].data : []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      alEvent.innerHTML = '<option value="">연결 안 함</option>' + evs.map(function (e) { return '<option value="' + esc(evId(e)) + '" data-date="' + esc(e.date) + '" data-title="' + esc(e.title) + '">' + esc(dateLabel(e.date) + ' · ' + e.title) + '</option>'; }).join('');
      renderAlbums();
    }).catch(function (e) { toast(e.message); });
  }
  alPick.addEventListener('change', function () {
    var a = GAL.filter(function (x) { return x.id === alPick.value; })[0];
    alDate.disabled = alTitle.disabled = !!a;
    if (a) { alDate.value = a.date; alTitle.value = a.title; alEvent.value = a.event || ''; }
  });
  alEvent.addEventListener('change', function () {
    var o = alEvent.selectedOptions[0];
    if (o && o.value && !alPick.value) { alDate.value = o.dataset.date; if (!alTitle.value) alTitle.value = o.dataset.title; }
  });
  alFiles.addEventListener('change', function () {
    var fs = Array.prototype.slice.call(alFiles.files || []);
    $('#al-prev').innerHTML = fs.map(function (f) { return '<img src="' + URL.createObjectURL(f) + '" alt="">'; }).join('');
    $('#al-save').textContent = fs.length ? '사진 ' + fs.length + '장 올리기' : '사진 올리기';
  });

  $('#al-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fs = Array.prototype.slice.call(alFiles.files || []);
    if (!fs.length) { toast('올릴 사진을 골라 주세요.'); return; }
    var existing = GAL.filter(function (x) { return x.id === alPick.value; })[0];
    var date = existing ? existing.date : alDate.value, title = existing ? existing.title : alTitle.value.trim();
    if (!date || !title) { toast('날짜와 앨범 이름을 넣어 주세요.'); return; }
    var id = existing ? existing.id : date + '-' + (slug(title) || 'photos');
    var btn = $('#al-save'), prog = $('#al-progress'); busy(btn, true);
    var stamp = Date.now().toString(36), photos = [], changes = [], done = 0, total = fs.length;
    var seq = Promise.resolve();
    fs.forEach(function (f, i) {
      seq = seq.then(function () {
        prog.textContent = '사진 줄이는 중 ' + (i + 1) + '/' + total;
        return Promise.all([resizeTo(f, 1600, .82), resizeTo(f, 480, .75)]).then(function (r) {
          var name = stamp + '-' + String(i + 1).padStart(2, '0') + '.jpg', dir = 'assets/gallery/' + id + '/';
          var tick = function () { done++; prog.textContent = '올리는 중 ' + Math.min(total, Math.ceil(done / 2)) + '/' + total; };
          changes.push({ path: dir + name, base64: r[0].base64, onDone: tick }, { path: dir + 't/' + name, base64: r[1].base64, onDone: tick });
          photos.push({ src: '/' + dir + name, thumb: '/' + dir + 't/' + name, w: r[0].w, h: r[0].h });
        });
      });
    });
    seq.then(function () {
      var mut = {};
      mut['data/gallery.json'] = function (cur) {
        cur = Array.isArray(cur) ? cur : [];
        var a = cur.filter(function (x) { return x.id === id; })[0];
        if (!a) { a = { id: id, date: date, title: title, photos: [] }; cur.push(a); }
        if (alEvent.value) a.event = alEvent.value; else if (!existing) delete a.event;
        a.photos = a.photos.concat(photos);
        return cur.sort(function (x, y) { return x.date < y.date ? 1 : -1; });
      };
      return commitFiles(changes, mut, '사진첩: ' + date + ' ' + title + ' 사진 ' + total + '장');
    }).then(function (out) {
      GAL = out['data/gallery.json']; renderAlbums();
      $('#al-form').reset(); alDate.disabled = alTitle.disabled = false; alDate.value = bizDate(); $('#al-prev').innerHTML = ''; alPick.value = id; alPick.dispatchEvent(new Event('change'));
      prog.textContent = ''; toast('사진 ' + total + '장을 올렸어요' + LIVE_NOTE);
    }).catch(function (err) { prog.textContent = ''; toast('올리기 실패: ' + err.message); }).then(function () { busy(btn, false); btn.textContent = '사진 올리기'; });
  });

  $('#al-list').addEventListener('click', function (e) {
    var ad = e.target.closest('[data-al-del]'), pd = e.target.closest('[data-ph-del]');
    var b = ad || pd; if (!b) return;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; var old = b.textContent; b.textContent = ad ? '정말 삭제?' : '삭제?'; setTimeout(function () { b.dataset.confirm = ''; b.textContent = old; }, 4000); return; }
    var id, idx = -1;
    if (ad) id = ad.dataset.alDel; else { var p = pd.dataset.phDel.split('|'); id = p[0]; idx = +p[1]; }
    var album = GAL.filter(function (x) { return x.id === id; })[0]; if (!album) return;
    var gone = idx < 0 ? album.photos : [album.photos[idx]];
    var changes = [];
    gone.forEach(function (ph) { [ph.src, ph.thumb].filter(Boolean).forEach(function (s) { changes.push({ path: s.replace(/^\//, ''), remove: true }); }); });
    var mut = {};
    mut['data/gallery.json'] = function (cur) {
      cur = Array.isArray(cur) ? cur : [];
      if (idx < 0) return cur.filter(function (x) { return x.id !== id; });
      var srcs = gone.map(function (g) { return g.src; });
      cur.forEach(function (x) { if (x.id === id) x.photos = x.photos.filter(function (ph) { return srcs.indexOf(ph.src) < 0; }); });
      return cur.filter(function (x) { return x.photos.length; });
    };
    b.disabled = true;
    commitFiles(changes, mut, idx < 0 ? '사진첩: 앨범 삭제 ' + id : '사진첩: 사진 1장 삭제 (' + id + ')')
      .then(function (out) { GAL = out['data/gallery.json']; renderAlbums(); toast((idx < 0 ? '앨범을' : '사진을') + ' 삭제했어요' + LIVE_NOTE); })
      .catch(function (err) { b.disabled = false; toast('삭제 실패: ' + err.message); });
  });

  /* ---------- 시작 ---------- */
  var startTab = store('gs_admin_tab');
  showTab(['timetable', 'events', 'gallery'].indexOf(startTab) >= 0 ? startTab : 'requests');
})();
