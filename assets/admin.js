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

  function pollRequests() {
    fetch('https://ntfy.sh/' + CFG.topic + '/json?poll=1&since=12h', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        requests = txt.split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } })
          .filter(function (m) { return m && m.event === 'message'; }).map(parseRequest).reverse();
        var ids = requests.map(function (r) { return r.id; });
        if (lastIds && $('#rq-sound').checked && ids.some(function (id) { return lastIds.indexOf(id) < 0; })) beep();
        lastIds = ids;
        var d = kst();
        $('#rq-status').textContent = '최근 12시간 · ' + requests.length + '곡 · ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' 갱신 (10초마다 자동)';
        renderRequests();
      })
      .catch(function () { $('#rq-status').textContent = '신청곡을 불러오지 못했어요. 인터넷 연결을 확인해 주세요. 10초 후 다시 시도해요.'; });
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
  pollRequests();
  setInterval(pollRequests, 10000);

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
      store(TOKEN_KEY, t); loggedIn = true; renderLoginState(); loadTimetable(); loadEvents();
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

  /* ---------- 시작 ---------- */
  var startTab = store('gs_admin_tab');
  showTab(startTab === 'timetable' || startTab === 'events' ? startTab : 'requests');
})();
