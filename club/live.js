/* Groove & Spot 가상 클럽 · 라이브 기능 (club/index.html 이 window.__GS 로 안쪽을 열어 줘요)
 *  1) 클럽 라디오 — 층마다 채널(2층 힙합 · 3층 EDM). 접속한 모두가 같은 곡의 같은 부분을 듣고, 다음 곡은 투표로 골라요.
 *  2) 음악 시계 — 원본 녹음을 분석한 비트 맵(club/beats, tools/beatmap.py)이 있으면 그 비트·드롭에, 없으면 곡 템포에 맞춰요.
 *  3) 음악 맞춤 쇼 — 조명·관객·카메라가 비트를 타고, 드롭 때 다 같이 점프(PERFECT·콤보), 매시 정각 10분은 피크 타임.
 *  바·VIP·미션은 live-social.js 가 GSLive.use() 로 붙어요. */
(function () {
  'use strict';
  var G = window.__GS;
  if (!G || window.GSLive) return;
  var doc = document;
  function $(s) { return doc.querySelector(s); }
  function mk(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    put: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var ON_SITE = /^(xn--2i0bl1s25d\.site|groovenspot\.github\.io|localhost|127\.0\.0\.1)$/.test(location.hostname);
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function now() { return Date.now(); }
  function pnow() { return performance.now(); }
  function kst(ms) { return new Date((ms == null ? Date.now() : ms) + 9 * 3600e3); } // getUTC* 값이 한국 시간
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mmss(s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var UID = LS.get('gs_lv_uid', '');
  if (!/^u[a-z0-9]{4,12}$/.test(UID)) { UID = 'u' + Math.random().toString(36).slice(2, 10); LS.set('gs_lv_uid', UID); }
  var MODS = [];
  function ev(k, n, x) { MODS.forEach(function (m) { if (m.ev) try { m.ev(k, n == null ? 1 : n, x); } catch (e) {} }); }

  /* ---------------- 실시간 연결 (주제 'lx' 하나로 묶음) ---------------- */
  var NET = { room: null, H: {}, pres: {} };
  function emit(k, d) { var r = NET.room; if (r) r.emit('lx', { k: k, d: d }).catch(function () {}); }
  function on(k, f) { (NET.H[k] = NET.H[k] || []).push(f); }
  function presence(patch) {
    Object.keys(patch).forEach(function (k) { if (patch[k] === null) delete NET.pres[k]; else NET.pres[k] = patch[k]; });
    var r = NET.room; if (r) r.presence(patch).catch(function () {});
  }
  function peerByUid(uid) { var hit = null; Object.keys(G.peers).forEach(function (id) { var en = G.peers[id]; if (en.pr && en.pr.uid === uid) hit = en; }); return hit; }

  /* ---------------- UI 조각 ---------------- */
  var big = mk('div', 'lv-big'); big.setAttribute('aria-live', 'polite'); doc.body.appendChild(big);
  var bigT = 0;
  function bigText(msg, color, ms, cls) { big.textContent = msg; big.style.color = color || '#fff'; big.className = 'lv-big show' + (cls ? ' ' + cls : ''); clearTimeout(bigT); bigT = setTimeout(function () { big.className = 'lv-big'; }, ms || 900); }
  var flash = mk('div', 'lv-flash'); doc.body.appendChild(flash);
  function flashNow(color) { flash.style.background = 'radial-gradient(ellipse at center, ' + (color || 'rgba(255,255,255,.55)') + ', rgba(255,255,255,0) 70%)'; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
  var hintEl = mk('div', 'lv-hint'); hintEl.hidden = true; doc.body.appendChild(hintEl);
  var tapBtn = mk('button', 'lv-tap', '🔇 눌러서 소리 켜기'); tapBtn.type = 'button'; tapBtn.hidden = true; doc.body.appendChild(tapBtn);
  var nowBox = mk('div', 'lv-now'); var nowPanel = $('#now-panel'); if (nowPanel) nowPanel.appendChild(nowBox);
  var peakLine = mk('div', 'lv-peak'); nowBox.appendChild(peakLine);
  var voteBtn = mk('button', 'lv-votebtn'); voteBtn.type = 'button'; voteBtn.hidden = true; nowBox.appendChild(voteBtn);
  var voteTime = mk('span'); voteBtn.appendChild(doc.createTextNode('🗳️ ')); voteBtn.appendChild(mk('span', 'lv-long', '다음 곡 ')); voteBtn.appendChild(doc.createTextNode('투표 · ')); voteBtn.appendChild(voteTime);
  voteBtn.addEventListener('click', function () { var p = $('#bgm'); if (p && p.hidden) $('#bgmbtn').click(); renderRadio(); });

  /* ---------------- 곡 정보: 채널(층)과 템포 ---------------- */
  // 제목의 장르 단어로 채널과 대략의 BPM을 정해요 (가장 먼저 나오는 장르 기준). 새 영상도 같은 규칙으로.
  var RULES = [['드럼앤베이스', 174, '3F'], ['D&B', 174, '3F'], ['하드댄스', 150, '3F'], ['레이브', 150, '3F'], ['스피드하우스', 140, '3F'], ['덥스텝', 140, '3F'], ['비나하우스', 134, '3F'], ['브라질리언', 130, '3F'], ['바운스', 130, '3F'], ['브레이크비트', 130, '3F'], ['테크하우스', 126, '3F'], ['퓨처하우스', 126, '3F'], ['멜로딕 하우스', 124, '3F'], ['하우스', 124, '3F'], ['일렉트로니카', 126, '3F'], ['EDM', 128, '3F'], ['아프로', 120, '3F'], ['트랩', 140, '2F'], ['힙합', 95, '2F'], ['알앤비', 92, '2F'], ['R&B', 92, '2F'], ['K-POP', 118, '2F'], ['올드스쿨', 96, '2F']];
  // 지금 영상들 (data/videos.json 제목으로 미리 계산 · 미리보기처럼 파일을 못 읽을 때 씀)
  var META = { dCGLe8eoCaU: ['2F', 95], Wh4yKtwqba0: ['3F', 130], suaSXr4VAOs: ['3F', 140], BFswuBOMnlQ: ['3F', 130], 'j-9AnMHFeHc': ['2F', 95], EWiqfFph0zU: ['3F', 126], '5RT02-6S9PM': ['3F', 174], BCZUWocn8GE: ['2F', 95], K4EwPIGsIh8: ['3F', 174], '8DwCGecJlL4': ['3F', 150], ozo6z50q5ME: ['3F', 130], aCYt0vQt0Rw: ['2F', 95], T_DzDtPP5Rg: ['3F', 126], _jv9wcteXfM: ['2F', 95], ZxWF6q5FHBk: ['3F', 126], PnvLmelOHaA: ['3F', 134], 'mizXXj-UqVU': ['3F', 140], mSQSQxr2bDI: ['2F', 95], '8a7_AWD2KD4': ['3F', 126], UH7nJLwSPKw: ['3F', 130], INRX_JrThjA: ['3F', 134], glZfoN1eXRo: ['3F', 128], kIaHSMZ1XiE: ['2F', 95], '-nUU0CmDVMo': ['3F', 126], HC6rRLWgL8w: ['3F', 130], xof6ObtenaM: ['3F', 130], rGSgG0L0uoM: ['3F', 140], 'hMj_FGPjC-Q': ['3F', 124], gok17CJCaJw: ['3F', 140], '65E38_ypTLs': ['3F', 130], 'Zo3-BVTTaXI': ['3F', 134], zw3jocYVZJI: ['3F', 130], '3h0gqZV5Q18': ['2F', 95] };
  function classify(title) { var best = null; RULES.forEach(function (r) { var i = String(title || '').indexOf(r[0]); if (i >= 0 && (!best || i < best[0])) best = [i, r]; }); return best ? [best[1][2], best[1][1]] : null; }
  function meta(yt) { return META[yt] || ['3F', 128]; }
  function durOf(tr) { var p = String(tr && tr.d || '').split(':').map(Number), s = 0; if (p.length < 2 || p.some(isNaN)) return 3600; p.forEach(function (x) { s = s * 60 + x; }); return s > 60 ? s : 3600; }
  var BAD = {}; // 여기서 재생이 막힌 영상

  /* ---------------- 클럽 라디오 ---------------- */
  var EPOCH = Date.UTC(2026, 10, 1, -9, 0, 0); // 2026-11-01 00:00 KST부터 이어지는 편성표
  var CH = { '2F': { name: '2층 힙합', order: [], st: null, last: null, decided: {}, pubT: 0 }, '3F': { name: '3층 EDM', order: [], st: null, last: null, decided: {}, pubT: 0 } };
  var R = { on: LS.get('gs_lv_radio', '1') !== '0', key: '', vote: null, started: false };
  function trackOf(yt) { for (var i = 0; i < G.TRACKS.length; i++) if (G.TRACKS[i].yt === yt) return G.TRACKS[i]; return null; }
  function idxOf(yt) { for (var i = 0; i < G.TRACKS.length; i++) if (G.TRACKS[i].yt === yt) return i; return -1; }
  function buildChannels() {
    ['2F', '3F'].forEach(function (ch) {
      var list = G.TRACKS.filter(function (tr) { return meta(tr.yt)[0] === ch; }).map(function (tr) { return tr.yt; }).sort();
      var r = rng(hash('gs-radio-' + ch)), a = list.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      CH[ch].order = a;
    });
  }
  buildChannels();
  function dur(yt) { return durOf(trackOf(yt)) * 1000; }
  function baseNext(ch, yt) { var o = CH[ch].order, i = o.indexOf(yt); return o[(i + 1) % o.length]; }
  function baseAt(ch, T) {
    var o = CH[ch].order; if (!o.length) return null;
    var tot = 0; o.forEach(function (y) { tot += dur(y); });
    var x = ((T - EPOCH) % tot + tot) % tot, t0 = T - x;
    for (var i = 0; i < o.length; i++) { var d = dur(o[i]); if (x < d) return { yt: o[i], t0: t0 }; x -= d; t0 += d; }
    return { yt: o[0], t0: T };
  }
  function validState(ch, s, T) { return s && typeof s.yt === 'string' && CH[ch].order.indexOf(s.yt) >= 0 && typeof s.t0 === 'number' && s.t0 > EPOCH && s.t0 < T + 90000 && T - s.t0 < 3 * 86400e3; }
  function stateAt(ch, T) {
    var S = CH[ch].st;
    if (validState(ch, S, T)) {
      var s = { yt: S.yt, t0: S.t0 };
      for (var n = 0; n < 400; n++) { var d = dur(s.yt); if (T < s.t0 + d) return s; s = { yt: baseNext(ch, s.yt), t0: s.t0 + d }; }
    }
    return baseAt(ch, T);
  }
  function cands(ch, s) {
    var o = CH[ch].order, nx = baseNext(ch, s.yt), r = rng(hash(ch + s.yt + Math.round(s.t0 / 1000))), pool = o.filter(function (y) { return y !== s.yt && y !== nx; }), out = [nx];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  function vkey(s) { return Math.round(s.t0 / 1000); }
  function tally(ch, s) {
    var k = vkey(s), c = [0, 0, 0];
    if (R.vote && R.vote[0] === ch && R.vote[1] === k) c[R.vote[2]]++;
    Object.keys(G.peers).forEach(function (id) { var v = G.peers[id].pr && G.peers[id].pr.vt; if (Array.isArray(v) && v[0] === ch && v[1] === k && v[2] >= 0 && v[2] < 3) c[v[2] | 0]++; });
    return c;
  }
  function winner(c) { var w = 0; for (var i = 1; i < 3; i++) if (c[i] > c[w]) w = i; return w; }
  function vote(c) {
    var ch = G.active(), s = stateAt(ch, now()); if (!s) return;
    var first = !R.vote || R.vote[1] !== vkey(s) || R.vote[0] !== ch;
    R.vote = [ch, vkey(s), c]; presence({ vt: R.vote });
    if (first) ev('vote');
    var tr = trackOf(cands(ch, s)[c]); if (tr) G.toast('🗳️ ' + tr.n + '에 투표했어요', '#ffd23a');
    renderRadio();
  }
  function adopt(ch, d, from) {
    if (!d || !CH[ch]) return;
    var s = { yt: String(d.yt || ''), t0: +d.t0 }, T = now();
    if (!validState(ch, s, T)) return;
    var cur = CH[ch].st;
    if (cur && cur.t0 > s.t0) return;           // 더 오래된 소식은 무시
    CH[ch].st = s; CH[ch].decided[s.t0] = true;
    if (from && cur && cur.t0 === s.t0 && cur.yt === s.yt) return;
    radioSync();
  }
  function publish(ch) {
    var r = NET.room, s = CH[ch].st; if (!r || !s) return;
    if (r.setState) r.setState('radio' + ch.toLowerCase(), s); else emit('rs', { ch: ch, yt: s.yt, t0: s.t0 });
  }
  // 곡이 끝나는 순간: 투표 결과로 다음 곡을 정하고, 아무도 안 알렸으면 내가 알림
  function radioSecond() {
    var T = now();
    ['2F', '3F'].forEach(function (ch) {
      var C = CH[ch]; if (!C.order.length) return;
      var cur = stateAt(ch, T);
      if (C.last && cur.t0 !== C.last.t0 && cur.t0 === C.last.t0 + dur(C.last.yt) && !C.decided[cur.t0]) {
        C.decided[cur.t0] = true;
        var cs = cands(ch, C.last), w = cs[winner(tally(ch, C.last))];
        if (w && w !== cur.yt) {
          C.st = { yt: w, t0: cur.t0 }; cur = stateAt(ch, T);
          var my = cur.t0; setTimeout(function () { if (CH[ch].st && CH[ch].st.t0 === my) publish(ch); }, 400 + Math.random() * 1800);
        }
      }
      C.last = cur;
    });
    radioSync();
    renderRadio();
  }
  function radioSync(force) {
    if (!R.on || !G.entered() || !G.sound()) { if (!R.on) R.key = ''; return; }
    var ch = G.active(), s = stateAt(ch, now()); if (!s) return;
    var pos = Math.max(0, (now() - s.t0) / 1000), key = ch + '|' + s.yt + '|' + s.t0;
    if (BAD[s.yt]) { var alt = s.yt, o = CH[ch].order; for (var k = 0; k < o.length && BAD[alt]; k++) alt = baseNext(ch, alt); if (BAD[alt]) return; s = { yt: alt, t0: s.t0 }; pos = pos % (dur(alt) / 1000); key += '|alt'; }
    var tr = trackOf(s.yt), idx = idxOf(s.yt); if (!tr || idx < 0) return;
    if (key !== R.key || force) {
      var first = !R.key; R.key = key; R.started = true; R.fixed = false;
      G.pickTrack(idx, null, null, { radio: true, start: pos, sub: '📻 ' + CH[ch].name + ' 라디오 · GROOVE SESSIONS #' + tr.s, quiet: !first && !force });
      if (!first && !force) bigText('📻 ' + tr.n, G.FLOORS[ch].css, 1400);
      return;
    }
    // 처음 재생될 때 버퍼링으로 늦어진 만큼 한 번 따라잡고, 그 뒤엔 3초 넘게 어긋날 때만 맞춰요
    var yp = ytPos(s.yt);
    if (yp != null && YTP.playing && YTP.ready && YTP.player) {
      var diff = pos - yp;
      if (!R.fixed) { R.fixed = true; if (Math.abs(diff) > 1) { try { YTP.player.seekTo(pos + .5, true); } catch (e) {} } }
      else if (Math.abs(diff) > 3) { try { YTP.player.seekTo(pos + .5, true); } catch (e) {} }
    }
  }
  function setRadio(onOff) {
    R.on = onOff; LS.set('gs_lv_radio', onOff ? '1' : '0');
    if (onOff) { R.key = ''; if (!G.sound()) { G.toast('🔊 소리를 켜면 라디오가 나와요', '#fff'); } radioSync(true); }
    renderRadio();
  }
  // BGM 창 맨 위: 라디오 버튼 + 다음 곡 투표
  var radioBox = mk('div', 'lv-radio'), radioBtn = mk('button', 'trk lv-radiobtn'), voteBox = mk('div', 'lv-vote');
  radioBtn.type = 'button'; radioBox.appendChild(radioBtn); radioBox.appendChild(voteBox);
  (function () { var list = $('#bgmlist'); if (list && list.parentNode) list.parentNode.insertBefore(radioBox, list); })();
  radioBtn.addEventListener('click', function () { setRadio(true); });
  // 버튼은 한 번 만들고 글자만 바꿔요 (매초 새로 만들면 누르는 순간 버튼이 바뀌어 눌림이 사라질 수 있어요)
  var RB = { b: mk('b', null, '📻 클럽 라디오 · 다 같이 듣기'), sm: mk('small'), headB: mk('b', null, '🗳️ 다음 곡 투표'), headS: mk('span'), opts: [], note: mk('small', 'lv-vnote') };
  radioBtn.appendChild(RB.b); radioBtn.appendChild(RB.sm);
  (function () {
    var head = mk('div', 'lv-vhead'); head.appendChild(RB.headB); head.appendChild(RB.headS); voteBox.appendChild(head);
    for (var i = 0; i < 3; i++) (function (i) {
      var b = mk('button', 'lv-vopt'), n = mk('span'), c = mk('em'); b.type = 'button'; b.appendChild(n); b.appendChild(c);
      b.addEventListener('click', function () { vote(i); }); voteBox.appendChild(b); RB.opts.push({ b: b, n: n, c: c });
    })(i);
    voteBox.appendChild(RB.note);
  })();
  function setText(el, t) { if (el.textContent !== t) el.textContent = t; }
  function renderRadio() {
    var ch = G.active() || '2F', s = stateAt(ch, now()); if (!s) return;
    var tr = trackOf(s.yt), pos = (now() - s.t0) / 1000, left = dur(s.yt) / 1000 - pos;
    setText(RB.sm, CH[ch].name + ' 채널 · ' + (tr ? tr.n + ' #' + tr.s : '') + ' · ' + mmss(pos) + ' / ' + mmss(dur(s.yt) / 1000));
    radioBtn.setAttribute('aria-pressed', R.on ? 'true' : 'false');
    setText(RB.headS, mmss(left) + ' 남음');
    var cs = cands(ch, s), c = tally(ch, s), mine = R.vote && R.vote[0] === ch && R.vote[1] === vkey(s) ? R.vote[2] : -1;
    RB.opts.forEach(function (o, i) {
      var t2 = trackOf(cs[i]); o.b.hidden = !t2; if (!t2) return;
      setText(o.n, t2.n + ' #' + t2.s); setText(o.c, c[i] + '표'); o.b.setAttribute('aria-pressed', mine === i ? 'true' : 'false');
    });
    setText(RB.note, R.on ? '가장 많이 뽑힌 곡이 다음에 나와요 · 이 층에 있는 사람 모두 같이 들어요' : '라디오를 켜면 투표한 곡을 다 같이 들어요');
    voteBtn.hidden = !R.on || !G.entered();
    setText(voteTime, mmss(left));
    if (R.on && G.bgm().on && nowPanel) {
      var nk = $('#nowk'), ns = $('#nowsub'); if (nk) setText(nk, 'CLUB RADIO');
      if (ns) { var key = CH[ch].name + mmss(pos); if (ns.dataset.lv !== key) { ns.dataset.lv = key; ns.textContent = ''; ns.appendChild(mk('span', 'lv-long', '📻 ' + CH[ch].name + ' · ')); ns.appendChild(doc.createTextNode(mmss(pos) + ' / ' + mmss(dur(s.yt) / 1000))); } }
    }
  }
  on('rs', function (d) { if (d && CH[d.ch]) adopt(d.ch, d, true); });
  on('rq', function () { ['2F', '3F'].forEach(function (ch) { var C = CH[ch]; if (C.st && validState(ch, C.st, now()) && now() - C.pubT > 4000) { C.pubT = now(); setTimeout(function () { emit('rs', { ch: ch, yt: C.st.yt, t0: C.st.t0 }); }, 200 + Math.random() * 1200); } }); });

  /* ---------------- 유튜브 플레이어 (IFrame API: 재생 위치를 알아야 조명이 맞아요) ---------------- */
  var YTP = { player: null, ready: false, id: '', start: 0, t: 0, at: 0, st: -1, playing: false, api: 0, wait: [], loadAt: 0, box: null, muted: false, plain: null };
  function ytApi(cb) {
    if (window.YT && window.YT.Player) { cb(true); return; }
    YTP.wait.push(cb);
    if (YTP.api) return; YTP.api = 1;
    var prev = window.onYouTubeIframeAPIReady;
    function done(ok) { if (YTP.api === 3) return; YTP.api = ok ? 2 : 3; var w = YTP.wait; YTP.wait = []; w.forEach(function (f) { f(ok); }); }
    window.onYouTubeIframeAPIReady = function () { if (typeof prev === 'function') try { prev(); } catch (e) {} done(true); };
    var s = doc.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = function () { done(false); }; doc.head.appendChild(s);
    setTimeout(function () { if (!(window.YT && window.YT.Player)) done(false); }, 9000);
  }
  function plainFrame(id, start, box) {
    if (YTP.plain) YTP.plain.remove();
    var f = doc.createElement('iframe'); f.title = 'GROOVE SESSIONS'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('allowfullscreen', ''); f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1&start=' + Math.floor(start || 0);
    box.textContent = ''; box.appendChild(f); YTP.plain = f;
  }
  function applyMute() {
    if (!YTP.ready || !YTP.player) return;
    try { if (G.sound() && !YTP.forcedMute) YTP.player.unMute(); else YTP.player.mute(); } catch (e) {}
  }
  function ytLoad(id, start, box) {
    YTP.box = box;
    if (!id) { YTP.id = ''; YTP.playing = false; if (YTP.player && YTP.ready) try { YTP.player.stopVideo(); } catch (e) {} if (YTP.plain) { YTP.plain.remove(); YTP.plain = null; } tapBtn.hidden = true; return; }
    YTP.id = id; YTP.start = start || 0; YTP.t = YTP.start; YTP.at = pnow(); YTP.st = -1; YTP.playing = false; YTP.loadAt = pnow(); YTP.checked = false;
    ytApi(function (ok) {
      if (YTP.id !== id) return;
      if (!ok) { plainFrame(id, start, box); return; }
      if (!YTP.player) {
        var holder = mk('div'); box.textContent = ''; box.appendChild(holder);
        YTP.player = new YT.Player(holder, {
          host: 'https://www.youtube-nocookie.com', videoId: id,
          playerVars: { autoplay: 1, start: Math.floor(start || 0), playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: function () {
              YTP.ready = true; applyMute();
              if (YTP.id && YTP.id !== id) { var el2 = (pnow() - YTP.loadAt) / 1000; YTP.player.loadVideoById({ videoId: YTP.id, startSeconds: YTP.start + el2 }); }
              else try { YTP.player.playVideo(); } catch (e) {}
            },
            onStateChange: function (e) { YTP.st = e.data; if (e.data === 1) { tapBtn.hidden = !YTP.forcedMute; } },
            onError: function (e) { ytError(e && e.data); }
          }
        });
      } else if (YTP.ready) { try { YTP.player.loadVideoById({ videoId: id, startSeconds: start || 0 }); } catch (e) {} applyMute(); }
    });
  }
  // 이 기기에서 못 트는 영상: 편성표(모두 같은 순서)는 그대로 두고, 나만 같은 채널의 다른 곡을 대신 틀어요
  function ytError(code) {
    var id = YTP.id; if (!id) return;
    YTP.err = code;
    if (BAD[id]) return;
    BAD[id] = 1;
    G.toast('이 영상은 여기서 재생할 수 없어요 · 다른 곡을 대신 틀어요', '#ff9a9a');
    if (R.on) { R.key = ''; radioSync(true); }
  }
  // 위치를 4번/초 읽어 두고 그 사이는 시계로 채워요
  setInterval(function () {
    if (!YTP.player || !YTP.ready || !YTP.id) return;
    try {
      var st = YTP.player.getPlayerState(), t = YTP.player.getCurrentTime();
      YTP.st = st; YTP.playing = st === 1;
      if (typeof t === 'number' && isFinite(t)) { YTP.t = t; YTP.at = pnow(); }
      var vd = YTP.player.getVideoData && YTP.player.getVideoData();
      YTP.cur = vd && vd.video_id || YTP.id;
    } catch (e) {}
    // 자동 재생이 막히면: 소리 없이 먼저 틀고 '소리 켜기' 버튼
    if (!YTP.checked && pnow() - YTP.loadAt > 3500) {
      YTP.checked = true;
      if (YTP.st !== 1 && YTP.st !== 3 && G.sound()) { YTP.forcedMute = true; try { YTP.player.mute(); YTP.player.playVideo(); } catch (e) {} tapBtn.hidden = false; }
    }
  }, 250);
  tapBtn.addEventListener('click', function () { YTP.forcedMute = false; tapBtn.hidden = true; if (YTP.player && YTP.ready) { try { YTP.player.unMute(); YTP.player.playVideo(); } catch (e) {} } else if (R.on) radioSync(true); });
  function ytPos(yt) {
    if (!YTP.player || !YTP.ready || YTP.id !== yt || (YTP.cur && YTP.cur !== yt)) return null;
    if (YTP.playing) return YTP.t + (pnow() - YTP.at) / 1000;
    if (YTP.st === 2 || YTP.st === 3) return YTP.t;
    return null;
  }
  var soundBtn = $('#sound');
  if (soundBtn) soundBtn.addEventListener('click', function () {
    setTimeout(function () {
      if (G.sound()) { YTP.forcedMute = false; tapBtn.hidden = true; if (R.on && G.entered() && (!G.bgm().on || G.bgm().idx < 0)) radioSync(true); }
      applyMute();
    }, 0);
  });

  /* ---------------- 비트 맵 (원본 녹음 분석 · club/beats) ---------------- */
  var VMAP = {}, MAPS = {};
  if (ON_SITE) {
    fetch('./beats/videos.json?v=' + Math.floor(now() / 3600e3)).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { if (d && typeof d === 'object') Object.keys(d).forEach(function (k) { if (/^[\w-]{11}$/.test(k) && d[k] && typeof d[k] === 'object') VMAP[k] = d[k]; }); }).catch(function () {});
    fetch('/data/videos.json?v=' + Math.floor(now() / 3600e3)).then(function (r) { return r.ok ? r.json() : []; }).then(function (list) {
      if (!Array.isArray(list)) return; var changed = false;
      list.forEach(function (v) { if (v && v.youtube && !META[v.youtube]) { var c = classify(v.title); if (c) { META[v.youtube] = c; changed = true; } } });
      if (changed) buildChannels();
    }).catch(function () {});
  }
  function loadMap(yt) {
    var v = VMAP[yt]; if (!v || MAPS[yt] !== undefined || !/^[\w\/.-]+\.json$/.test(v.map || '')) return;
    MAPS[yt] = null;
    fetch('./beats/' + v.map).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (!m || !Array.isArray(m.seg) || !m.seg.length) return;
      m.off = +v.off || 0; m.segT = m.seg.map(function (s) { return s[1]; }); MAPS[yt] = m;
    }).catch(function () {});
  }
  function mapIdx(m, sec) { // 녹음 시각 → 비트 번호(소수)
    var lo = 0, hi = m.seg.length - 1; if (sec <= m.segT[0]) { var s0 = m.seg[0]; return s0[0] + (sec - s0[1]) / s0[2]; }
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (m.segT[mid] <= sec) lo = mid; else hi = mid - 1; }
    var s = m.seg[lo]; return s[0] + (sec - s[1]) / s[2];
  }
  function mapTime(m, i) { var s = m.seg[0]; for (var k = 0; k < m.seg.length; k++) { if (m.seg[k][0] <= i) s = m.seg[k]; else break; } return s[1] + (i - s[0]) * s[2]; }

  /* ---------------- 피크 타임: 매시 정각부터 10분 ---------------- */
  function peakInfo(ms) { var k = kst(ms), sec = k.getUTCMinutes() * 60 + k.getUTCSeconds(); return sec < 600 ? { on: true, left: 600 - sec, next: 0 } : { on: false, left: 0, next: 3600 - sec }; }
  var PEAK = peakInfo();

  /* ---------------- 음악 시계 ---------------- */
  var MS = { mode: '', yt: '', pos: 0, i: 0, bpm: 120, spb: .5, ph: 0, hit: 0, e: 1, drop: false, build: -1, next: null, bar: 0, beat: 0, live: false };
  function music() {
    var b = G.bgm(), ch = G.active() || '2F', yt = '', pos = null, live = false;
    if (b.on && b.idx >= 0 && G.TRACKS[b.idx]) {
      yt = G.TRACKS[b.idx].yt; pos = ytPos(yt); live = pos != null;
      if (pos == null && R.on) { var s0 = stateAt(ch, now()); if (s0 && s0.yt === yt) pos = (now() - s0.t0) / 1000; }
      if (pos == null) pos = YTP.start + (pnow() - YTP.loadAt) / 1000;
    } else if (!b.on) {
      if (G.audioOn() && G.sound()) return null;           // 데모 비트: 원래 장면 그대로
      var s1 = stateAt(ch, now()); if (!s1) return null;    // 소리 없이 볼 때도 라디오 편성표에 맞춰 쇼
      yt = s1.yt; pos = (now() - s1.t0) / 1000;
    } else return null;                                       // 내 음악 파일: 원래 분석기 사용
    loadMap(yt);
    var m = MAPS[yt], peak = PEAK.on;
    MS.yt = yt; MS.pos = pos; MS.live = live;
    if (m) {
      var sec = pos - m.off, i = mapIdx(m, sec), bi = Math.floor(i), bar = Math.floor((i - m.db) / 4);
      var sp = 0; for (var k = 0; k < m.seg.length; k++) { if (m.seg[k][0] <= i) sp = m.seg[k][2]; else break; }
      MS.mode = 'map'; MS.i = i; MS.spb = sp || .5; MS.bpm = 60 / MS.spb; MS.ph = i - bi; MS.beat = bi; MS.bar = bar;
      var ed = m.e && bar >= 0 && bar < m.e.length ? +m.e.charAt(bar) / 9 : .7; MS.e = .35 + .65 * ed;
      var nd = null, ld = -1e9; for (var d = 0; d < m.drops.length; d++) { if (m.drops[d] <= i + .02) ld = m.drops[d]; else { nd = m.drops[d]; break; } }
      MS.drop = i - ld >= 0 && i - ld < 8;
      var bs = -1; m.builds.forEach(function (bb) { if (i >= Math.max(bb[0], bb[1] - 32) && i < bb[1]) bs = (i - Math.max(bb[0], bb[1] - 32)) / Math.max(1, bb[1] - Math.max(bb[0], bb[1] - 32)); });
      MS.build = bs;
      MS.next = nd != null ? { id: yt + ':' + nd, at: pnow() + (mapTime(m, nd) + m.off - pos) * 1000, beats: nd - i } : null;
    } else {
      var bpm = meta(yt)[1], spb = 60 / bpm, i2 = pos / spb, bar2 = Math.floor(i2 / 4), barLen = spb * 4;
      var cyc = Math.max(16, Math.round((peak ? 75 : 150) / barLen / 8) * 8), inCyc = ((bar2 % cyc) + cyc) % cyc, lastDropBar = bar2 - inCyc;
      MS.mode = 'tempo'; MS.i = i2; MS.spb = spb; MS.bpm = bpm; MS.ph = i2 - Math.floor(i2); MS.beat = Math.floor(i2); MS.bar = bar2;
      MS.drop = lastDropBar > 0 && inCyc < 2;
      MS.build = inCyc >= cyc - 8 ? (i2 - (lastDropBar + cyc - 8) * 4) / 32 : -1;
      MS.e = inCyc < 16 ? 1 : MS.build >= 0 ? .55 + .45 * MS.build : .8;
      var nbar = lastDropBar + cyc;
      MS.next = { id: yt + ':b' + nbar, at: pnow() + (nbar * 4 - i2) * spb * 1000, beats: nbar * 4 - i2 };
    }
    var sub = MS.build >= 0 ? (MS.build > .75 ? 4 : MS.build > .5 ? 2 : 1) : 1, phs = (MS.ph * sub) % 1;
    var accent = ((MS.beat % 4) + 4) % 4 === 0 ? 1.12 : .92;
    MS.hit = Math.pow(1 - phs, 3) * (.5 + .5 * MS.e) * accent * (peak ? 1.15 : 1);
    if (MS.drop) MS.hit = Math.min(1.2, MS.hit + .25);
    return MS;
  }
  function beat() {
    var m = music(); if (!m) { MS.mode = ''; return null; }
    return { ph: m.ph, hit: m.hit, drop: m.drop, e: m.e };
  }

  /* ---------------- 드롭 점프 게임 ---------------- */
  var DG = { on: LS.get('gs_lv_dg', '1') !== '0', cur: null, judged: {}, missed: {}, combo: 0, counts: {}, told: {}, mine: {} };
  var GRADES = [[90, 'PERFECT', '#ffd23a', 12], [180, 'GREAT', '#39ff8a', 8], [300, 'GOOD', '#4fd6ff', 5]];
  function dgJudge() {
    if (!DG.on || !G.entered() || G.busy() || !(G.sound() && G.bgm().on && G.bgm().idx >= 0)) return;
    var t = pnow(), n = null, d = 1e9;
    [DG.cur, DG.prev].forEach(function (c) { if (c && !DG.judged[c.id] && Math.abs(t - c.at) < Math.abs(d)) { n = c; d = t - c.at; } });   // 드롭 바로 뒤에 눌러도 그 드롭으로 쳐요
    if (!n || Math.abs(d) > 650) return;
    DG.judged[n.id] = true;
    var g = null; for (var k = 0; k < GRADES.length; k++) if (Math.abs(d) <= GRADES[k][0]) { g = GRADES[k]; break; }
    if (!g) { DG.combo = 0; bigText(d < 0 ? '조금 빨랐어요' : '조금 늦었어요', '#ffb0b0', 900, 'small'); return; }
    DG.combo++; DG.mine[n.id] = 1;
    bigText(g[1] + (DG.combo > 1 ? ' · 콤보 x' + DG.combo : ''), g[2], 1300);
    emit('dj', { id: n.id.slice(0, 40), g: g[1].charAt(0), u: UID });
    ev('drop', 1, { grade: g[1], xp: g[3], combo: DG.combo });
  }
  on('dj', function (d) { if (!d || typeof d.id !== 'string' || !/^u[a-z0-9]{4,12}$/.test(d.u || '')) return; (DG.counts[d.id] = DG.counts[d.id] || {})[d.u] = 1; });
  function dgTick() {
    var n = MS.mode && MS.next; if (!n) { hintEl.hidden = true; return; }
    if (!DG.cur || DG.cur.id !== n.id) { DG.prev = DG.cur; DG.cur = n; }
    else DG.cur.at = n.at;     // 위치가 다듬어지면 시각도 따라감
    var p = DG.prev, t = pnow();
    if (p && !DG.told[p.id] && t > p.at + 2400) {
      DG.told[p.id] = true;
      var cnt = Object.keys(DG.counts[p.id] || {}).length + (DG.mine[p.id] ? 1 : 0);
      if (cnt >= 2) { G.toast('🙌 ' + cnt + '명이 함께 드롭에 점프했어요!', '#ffd23a'); if (DG.mine[p.id]) ev('group'); }
      if (DG.on && G.entered() && !DG.judged[p.id] && MS.live && !G.busy()) DG.combo = 0;
    }
    var left = (n.at - t) / 1000, beats = left / MS.spb;
    var audible = G.sound() && G.bgm().on && G.bgm().idx >= 0;   // 소리 없이 볼 때는 조명만, 게임 안내는 안 띄워요
    var show = DG.on && audible && G.entered() && !G.busy() && beats <= 16 && beats > -1.5;
    hintEl.hidden = !show;
    if (show) {
      var b2 = Math.ceil(beats - .05);
      hintEl.textContent = beats > 4 ? '🔥 드롭까지 ' + b2 + '박 · ' + (doc.body.classList.contains('touch') ? '⤴ 버튼' : '스페이스') + '로 점프 준비' : beats > 0 ? '🔥 ' + b2 + '…' : '💥 지금 점프!';
      if (beats <= 3.05 && beats > 0) { var nb = Math.ceil(beats - .05); if (DG.lastCount !== n.id + nb) { DG.lastCount = n.id + nb; bigText(String(nb), '#fff', 420, 'count'); } }
    }
  }
  function dropMoment(F) {
    var rec = G.floors[F]; if (!rec) return;
    flashNow(F === '2F' ? 'rgba(255,170,90,.5)' : 'rgba(180,140,255,.5)');
    if (!DG.judged[(DG.cur || {}).id]) bigText('DROP!', G.FLOORS[F].css, 700);
    G.hands(4);
    var pts = rec.tables.slice(); if (rec.djSpec) pts.push(new G.THREE.Vector3(rec.djSpec.x, 1.2, rec.djSpec.z));
    pts.forEach(function (p, k) { if (k % 2 === 0 || k === pts.length - 1) G.sparks(F, p, 2.6); });
    SHOW.npcJump = pnow(); SHOW.shake = pnow();
  }

  /* ---------------- 음악 맞춤 쇼 (조명·관객·카메라) ---------------- */
  var SHOW = { strobe: LS.get('gs_lv_strobe', REDUCED ? '0' : '1') !== '0', shakeOn: LS.get('gs_lv_shake', REDUCED ? '0' : '1') !== '0', wasDrop: false, npcJump: 0, shake: 0, lastPeak: null, peakSpark: -1 };
  var tmpC = null;
  function showTick(t, dt) {
    var F = G.active(), rec = G.floors[F]; if (!rec || !MS.mode) { SHOW.wasDrop = false; return; }
    var tp = pnow();
    if (MS.drop && !SHOW.wasDrop) dropMoment(F);
    SHOW.wasDrop = MS.drop;
    // 빌드업: 조명이 점점 빠르게, 스트로브는 드롭 직후 2초
    if (MS.build >= 0 && rec.hemi) rec.hemi.intensity = rec.hemiBase * (1 + MS.build * .25 * (MS.ph < .5 ? 1 : .6));
    if (SHOW.strobe && rec.hemi && tp - SHOW.npcJump < 1800) rec.hemi.intensity = Math.floor(tp / 70) % 2 ? 1.25 : .38;
    // 피크 타임: 조명이 무지개로
    if (PEAK.on) {
      rec.lights.forEach(function (L, i) { L.color.setHSL(((t * .08) + i * .21 + MS.beat * .0625) % 1, .95, .55); });
      if (MS.bar !== SHOW.peakSpark && MS.bar % 8 === 0) { SHOW.peakSpark = MS.bar; var tb = rec.tables[(MS.bar / 8 | 0) % Math.max(1, rec.tables.length)]; if (tb) G.sparks(F, tb, 2); }
    }
    // 관객: 드롭 순간 다 같이 점프
    var jt = (tp - SHOW.npcJump) / 1000;
    if (jt < 1.4) rec.npcs.forEach(function (n, k) { var ph = jt * 2.6 - (k % 3) * .08; if (ph > 0 && ph < 1) n.av.g.position.y += Math.sin(ph * Math.PI) * .32; });
    // 카메라: 비트에 아주 살짝, 드롭엔 흔들림
    var cam = G.camera;
    if (SHOW.shakeOn && G.entered()) {
      var sk = (tp - SHOW.shake) / 1000;
      if (sk < .6) { var a = (1 - sk / .6) * .06; cam.position.x += (Math.random() - .5) * a; cam.position.y += (Math.random() - .5) * a; }
      if (MS.hit > .4 && (G.cam() !== 2)) cam.position.y += MS.hit * .012;
    }
    // LED: 카운트다운·드롭·피크 글자
    ledOverlay(rec, F);
  }
  function ledOverlay(rec, F) {
    if (!rec.led) return;
    var n = MS.next, txt = '', col = G.FLOORS[F].css;
    if (n) { var beats = (n.at - pnow()) / 1000 / MS.spb; if (beats <= 3.05 && beats > 0) txt = String(Math.ceil(beats - .05)); }
    if (MS.drop && pnow() - SHOW.npcJump < 2400) txt = 'DROP';
    else if (!txt && PEAK.on && (MS.bar % 16) < 2) { txt = 'PEAK TIME'; col = '#ffd23a'; }
    if (!txt) return;
    var x = rec.led.ctx, w = rec.led.c.width, h = rec.led.c.height;
    x.save(); x.globalAlpha = .9; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, h);
    x.font = '900 ' + Math.round(h * (txt.length > 4 ? .3 : .55)) + 'px Unbounded, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = col; x.shadowBlur = 40; x.fillStyle = '#fff'; x.fillText(txt, w / 2, h / 2, w - 40); x.restore();
    rec.led.tex.needsUpdate = true;
  }

  /* ---------------- 쇼 카메라 (🎥 버튼의 네 번째 시점) ---------------- */
  var CAMV = { shot: -1, cut: 0 };
  function camera(t) {
    if (G.cam() !== 3 || !G.entered()) return false;
    var F = G.active(), rec = G.floors[F], sp = rec && rec.djSpec, P = G.player, cam = G.camera; if (!sp) return false;
    var shot = MS.mode ? Math.floor(MS.i / 32) : Math.floor(t / 14);
    if (MS.drop) shot = -99;
    if (shot !== CAMV.shot) { CAMV.shot = shot; CAMV.cut = t; CAMV.k = shot === -99 ? 0 : (hash(F + shot) % 5); }
    var k = CAMV.k, el2 = t - CAMV.cut, fx = Math.sin(sp.yaw), fz = Math.cos(sp.yaw), sx = fz, sz = -fx, W = rec.W, D = rec.D;
    var px, py, pz, lx, ly, lz;
    if (k === 0) { px = sp.x - fx * 1.4 + sx * Math.sin(el2 * .3) * .8; py = 2.7; pz = sp.z - fz * 1.4 + sz * Math.sin(el2 * .3) * .8; lx = sp.x + fx * 7; ly = 1.1; lz = sp.z + fz * 7; }
    else if (k === 1) { px = sp.x + fx * 5.2 + sx * Math.sin(el2 * .2) * 2.2; py = 1.05; pz = sp.z + fz * 5.2 + sz * Math.sin(el2 * .2) * 2.2; lx = sp.x; ly = 2; lz = sp.z; }
    else if (k === 2) { var cx = (hash(F + CAMV.shot) % 2 ? 1 : -1) * W * .42, cz = (hash('z' + CAMV.shot) % 2 ? 1 : -1) * D * .36; px = cx; py = 3.55; pz = cz; lx = sp.x * .6; ly = .9; lz = sp.z * .6; }
    else if (k === 3) { var a = el2 * .22 + CAMV.shot; px = P.x + Math.cos(a) * 3.8; py = 2.1; pz = P.z + Math.sin(a) * 3.8; lx = P.x; ly = 1.25 + P.jy * .6; lz = P.z; }
    else { var span = W * .8, xx = -span / 2 + ((el2 * .7) % span); px = xx; py = 1.7; pz = D * .18; lx = xx + 3; ly = 1.3; lz = -D * .1; }
    px = clamp(px, -W / 2 + .3, W / 2 - .3); pz = clamp(pz, -D / 2 + .3, D / 2 - .3);
    cam.position.set(px, py, pz); cam.lookAt(lx, ly, lz);
    return true;
  }

  /* ---------------- 매 프레임 ---------------- */
  var lastSec = 0, lastPeakOn = PEAK.on, peakToldSoon = false;
  function tick(t, dt, b, hit, walking) {
    var tp = pnow();
    if (tp - lastSec > 1000) {
      lastSec = tp; PEAK = peakInfo();
      if (PEAK.on !== lastPeakOn) { lastPeakOn = PEAK.on; if (G.entered()) { if (PEAK.on) { bigText('🔥 PEAK TIME', '#ffd23a', 2200); flashNow('rgba(255,210,58,.45)'); var rec0 = G.floors[G.active()]; rec0.tables.forEach(function (p) { G.sparks(G.active(), p, 3); }); } else G.toast('피크 타임 끝 · 다음은 ' + (kst().getUTCHours() + 1) % 24 + '시 정각', '#fff'); } peakToldSoon = false; }
      if (!PEAK.on && PEAK.next <= 60 && !peakToldSoon && G.entered()) { peakToldSoon = true; G.toast('🔥 1분 뒤 피크 타임!', '#ffd23a'); }
      peakLine.textContent = PEAK.on ? '🔥 피크 타임 · ' + mmss(PEAK.left) : '피크 타임까지 ' + mmss(PEAK.next);
      peakLine.className = 'lv-peak' + (PEAK.on ? ' on' : '');
      radioSecond();
      MODS.forEach(function (m) { if (m.second) try { m.second(); } catch (e) {} });
    }
    showTick(t, dt);
    dgTick();
    MODS.forEach(function (m) { if (m.tick) try { m.tick(t, dt, walking); } catch (e) {} });
  }

  /* ---------------- index.html 에서 부르는 곳 ---------------- */
  function onRoom(r) {
    if (NET.room === r) return; NET.room = r;
    r.on('lx', function (m) {
      if (m.sameTab) return; var o = m.data || {}; if (!o || typeof o.k !== 'string' || !NET.H[o.k]) return;
      NET.H[o.k].forEach(function (f) { try { f(o.d || {}, m.peer); } catch (e) {} });
    }, function () {});
    if (r.setState) ['2F', '3F'].forEach(function (ch) { r.on('st/radio' + ch.toLowerCase(), function (m) { if (m && m.data) adopt(ch, m.data, true); }, function () {}); });   // 사이트(MQTT): 서버에 남겨 둔 라디오 상태
    else setTimeout(function () { emit('rq', {}); }, 1500);                                                                                                                   // 미리보기 방: 있는 사람에게 물어봄
    presence(Object.assign({ uid: UID }, NET.pres));
    MODS.forEach(function (m) { if (m.onRoom) try { m.onRoom(r); } catch (e) {} });
  }
  function onPick(i, radio) {
    if (!radio && R.on) { R.on = false; LS.set('gs_lv_radio', '0'); R.key = ''; G.toast('📻 라디오를 껐어요 · BGM 창 맨 위에서 다시 켜요', '#fff'); }
    renderRadio();
  }
  function onEnter(sound) {
    presence({ uid: UID });
    setTimeout(renderRadio, 0);
    if (R.on && sound) { radioSync(true); return true; }
    return false;
  }
  function onFloor(F) { if (R.on && R.key) radioSync(); renderRadio(); ev('floor', 1, F); }
  function onJump() { dgJudge(); ev('jump'); }
  function onEmote(k) { ev('emote', 1, k); }

  window.GSLive = {
    beat: beat, tick: tick, camera: camera, ytLoad: ytLoad,
    onRoom: onRoom, onPick: onPick, onEnter: onEnter, onFloor: onFloor, onJump: onJump, onEmote: onEmote,
    // live-social.js 가 씀
    use: function (m) { MODS.push(m); if (NET.room && m.onRoom) m.onRoom(NET.room); },
    G: G, LS: LS, mk: mk, $: $, kst: kst, hash: hash, rng: rng, mmss: mmss, clamp: clamp, uid: UID, onSite: ON_SITE,
    net: { emit: emit, on: on, presence: presence, peerByUid: peerByUid, room: function () { return NET.room; } },
    ui: { big: bigText, flash: flashNow },
    music: function () { return MS; }, peak: function () { return PEAK; }, ev: ev,
    settings: {
      get: function () { return { dg: DG.on, strobe: SHOW.strobe, shake: SHOW.shakeOn }; },
      set: function (k, v) { if (k === 'dg') { DG.on = v; LS.set('gs_lv_dg', v ? '1' : '0'); } if (k === 'strobe') { SHOW.strobe = v; LS.set('gs_lv_strobe', v ? '1' : '0'); } if (k === 'shake') { SHOW.shakeOn = v; LS.set('gs_lv_shake', v ? '1' : '0'); } }
    },
    radio: { on: function () { return R.on; }, set: setRadio, vote: vote, state: function (ch) { return stateAt(ch || G.active(), now()); }, cands: function (ch) { var s = stateAt(ch || G.active(), now()); return s ? cands(ch || G.active(), s) : []; }, tally: function (ch) { var s = stateAt(ch || G.active(), now()); return s ? tally(ch || G.active(), s) : [0, 0, 0]; }, CH: CH },
    _test: { YTP: YTP, MS: MS, DG: DG, CH: CH, R: R, stateAt: stateAt, baseAt: baseAt, cands: cands, adopt: adopt, radioSecond: radioSecond, MAPS: MAPS, VMAP: VMAP, peakInfo: peakInfo, setPeak: function (p) { PEAK = p; } }
  };
  renderRadio();
  // 이미 방이 열려 있으면 바로 붙기 (스크립트가 늦게 왔을 때)
  if (G.room()) onRoom(G.room());
})();
