/* Groove & Spot 가상 클럽 · 바 · 건배 · 한 잔 사주기 · VIP 테이블 · 미션 · 레벨 · 칭호 (live.js 의 GSLive 에 붙어요)
 * 가상 음료·바틀은 모두 무료예요. 메뉴 이름·가격은 실제 그루브앤스팟 메뉴(data/menu.json)에서 가져와 '매장가'로만 보여 줘요.
 * 기록(레벨·미션·칭호)은 이 브라우저(localStorage)에만 저장돼요. */
(function () {
  'use strict';
  var L = window.GSLive; if (!L) return;
  var G = L.G, LS = L.LS, mk = L.mk, $ = L.$, NET = L.net, THREE = G.THREE, UID = L.uid, doc = document;
  function pnow() { return performance.now(); }
  function now() { return Date.now(); }
  function esc(s) { return G.cleanText(s, 40); }
  function won(n) { return '₩' + Number(n).toLocaleString('ko-KR'); }
  var settings = { tipsy: LS.get('gs_lv_tipsy', '1') !== '0' };

  /* ---------------- 메뉴 (사이트에서는 data/menu.json 으로 새로 고침) ---------------- */
  var BAR_MENU = [
    { name: '칵테일', kind: 'mix', items: [['보드카 토닉', 6000], ['보드카 크랜베리', 6000], ['진 토닉', 6000], ['럼 콕', 6000], ['잭 콕', 8000], ['잭 애플 하이볼', 8000], ['제임슨 진저엘', 8000], ['깔루아 밀크', 8000]] },
    { name: '슈터 · 밤', kind: 'shot', items: [['레몬 드랍', 6000], ['데킬라샷 시에라', 6000], ['예거밤', 6000], ['잭샷', 7000], ['잭 허니샷', 7000]] },
    { name: '바틀 맥주', kind: 'beer', items: [['호가든', 8000], ['버드와이저', 9000], ['코로나', 9000], ['스텔라', 10000], ['기네스', 10000]] },
    { name: '무알콜', kind: 'soft', items: [['카스 제로', 9000], ['자몽주스', 7000], ['신데렐라', 8000], ['물', 0]] }
  ];
  var VIP_MENU = {
    '2F': [['딥 루미너스 SET', '딥 루미너스 3병 + 1병 서비스 + 안주', 500000], ['오로라 SET', '오로라 3병 + 1병 서비스 + 안주', 500000], ['킹 SET', '킹 3병 + 1병 서비스 + 안주', 500000], ['퀸 SET', '퀸 3병 + 1병 서비스 + 안주', 500000], ['잭다니엘스 SET', '잭다니엘스 + 오페라 프리마 브뤼 서비스 + 안주', 200000], ['헤네시 VSOP', '헤네시 VSOP + 오페라 프리마 브뤼 서비스', 280000]],
    '3F': [['딥 루미너스', '3+1 / 3B', 600000], ['킹', '3+1 / 3B', 600000], ['퀸', '3+1 / 3B', 600000], ['오로라', '3+1 / 3B', 600000], ['모엣 샹동', '3+1 / 3B', 700000], ['돔페리뇽', '3+1 / 3B', 3200000]]
  };
  function kindOf(cat) { cat = String(cat || ''); return /맥주|BEER/i.test(cat) ? 'beer' : /슈터|밤|SHOT/i.test(cat) ? 'shot' : /무알콜|NON/i.test(cat) ? 'soft' : /칵테일|COCKTAIL/i.test(cat) ? 'mix' : ''; }
  if (L.onSite) fetch('/data/menu.json?v=' + Math.floor(now() / 3600e3)).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (!m) return;
    var bar = m.bar && Array.isArray(m.bar.menu) ? m.bar.menu : null;
    if (bar) {
      var cats = []; bar.forEach(function (c) { var k = kindOf(c.name); if (!k || !Array.isArray(c.items)) return; var it = c.items.filter(function (i) { return i && i.ko && !/\d샷|\d잔/.test(i.ko); }).slice(0, 10).map(function (i) { return [String(i.ko).slice(0, 24), +i.price || 0]; }); if (it.length) cats.push({ name: String(c.name).replace(/\s*[A-Z/&\s-]{3,}$/, '').slice(0, 16), kind: k, items: it }); });
      var ORD = { mix: 0, beer: 1, shot: 2, soft: 3 }; cats.sort(function (a, b) { return ORD[a.kind] - ORD[b.kind]; });
      if (cats.length) { var soft = cats.filter(function (c) { return c.kind === 'soft'; })[0]; if (soft) soft.items.push(['물', 0]); else cats.push({ name: '무알콜', kind: 'soft', items: [['물', 0]] }); BAR_MENU = cats; }
    }
    ['2F', '3F'].forEach(function (F) {
      var sets = m[F] && Array.isArray(m[F].sets) ? m[F].sets : null; if (!sets) return;
      var out = sets.filter(function (s) { return s && s.name; }).slice(0, 9).map(function (s) { var t = Array.isArray(s.tiers) && s.tiers[0]; return [String(s.name).slice(0, 24), t ? String(t.q) : String(s.desc || '').slice(0, 40), t ? +t.price : +s.price || 0]; });
      if (out.length) VIP_MENU[F] = out;
    });
  }).catch(function () {});
  function liquid(name, kind) {
    var n = String(name);
    if (kind === 'water' || /^물$/.test(n)) return '#cfe9ff';
    if (/크랜베리|체리|신데렐라/.test(n)) return '#d0193f';
    if (/콕|예거|기네스|깔루아/.test(n) && !/밀크/.test(n)) return '#5b2a10';
    if (/밀크|베일리스/.test(n)) return '#efe1c4';
    if (/토닉|진 |제로|보드카/.test(n)) return '#dff4ff';
    if (/핫식스|레몬|데킬라|자몽/.test(n)) return '#ffcf3a';
    if (/하이볼|진저|애플|허니/.test(n)) return '#e9a443';
    if (kind === 'beer') return '#e8a82a';
    if (kind === 'champ') return '#f4dc8a';
    return '#ff9f4a';
  }
  var KIND = { mix: { sips: 5, str: .55, glass: 'tall' }, shot: { sips: 1, str: 1.3, glass: 'shot' }, beer: { sips: 6, str: .4, glass: 'beer' }, soft: { sips: 5, str: 0, glass: 'tall' }, water: { sips: 4, str: -1.2, glass: 'tall' }, champ: { sips: 4, str: .5, glass: 'flute' } };

  /* ---------------- 잔 모양 ---------------- */
  var glassM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .32, roughness: .05, metalness: .1, depthWrite: false });
  function glassMesh(kind, color) {
    var g = new THREE.Group(), c = new THREE.Color(color || '#ff9f4a');
    var liq = new THREE.MeshStandardMaterial({ color: c, emissive: c.clone().multiplyScalar(.35), transparent: true, opacity: .9, roughness: .2 });
    var k = (KIND[kind] || KIND.mix).glass, m;
    if (k === 'beer') {
      var bm = new THREE.MeshStandardMaterial({ color: kind === 'beer' ? 0x5a3510 : c, roughness: .15, metalness: .2, transparent: true, opacity: .92 });
      m = new THREE.Mesh(new THREE.CylinderGeometry(.03, .032, .13, 14), bm); m.position.y = .065; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .028, .06, 12), bm); m.position.y = .16; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.031, .031, .05, 14), new THREE.MeshStandardMaterial({ color: 0xf1e7cf, roughness: .7 })); m.position.y = .07; g.add(m);
    } else if (k === 'shot') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(.022, .018, .055, 12), glassM); m.position.y = .028; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.019, .016, .04, 12), liq); m.position.y = .022; g.add(m);
    } else if (k === 'flute') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(.024, .012, .12, 14), glassM); m.position.y = .14; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.021, .011, .09, 14), liq); m.position.y = .13; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .07, 6), glassM); m.position.y = .045; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .004, 14), glassM); m.position.y = .01; g.add(m);
    } else {
      m = new THREE.Mesh(new THREE.CylinderGeometry(.033, .028, .13, 16), glassM); m.position.y = .065; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(.03, .026, .1, 16), liq); m.position.y = .055; g.add(m);
      if (kind === 'mix') { m = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .17, 6), new THREE.MeshBasicMaterial({ color: 0xff3b5c })); m.position.set(.012, .1, 0); m.rotation.z = -.2; g.add(m); }
    }
    return g;
  }
  // 손에 쥐기: 오른손(아바타 기준 arms[0]) 끝에
  function holdGlass(av, mesh) { mesh.position.set(0, -.33, .045); mesh.rotation.set(Math.PI / 2, 0, 0); av.fores[0].add(mesh); }
  function poseHold(av, up) {
    if (up === 2) { av.arms[0].rotation.set(-2.6, 0, -.15); av.fores[0].rotation.x = -.35; return; }   // 건배: 잔을 높이
    if (up === 1) { av.arms[0].rotation.set(-1.15, 0, -.35); av.fores[0].rotation.x = -2.05; return; }  // 한 모금
    av.arms[0].rotation.set(-.32, 0, -.16); av.fores[0].rotation.x = -1.38;
  }
  function dkCode(d) { return d ? (d.kind + ':' + d.color).slice(0, 14) : null; }
  function dkParse(s) { var m = /^(mix|shot|beer|soft|water|champ):(#[0-9a-f]{6})$/i.exec(String(s || '')); return m ? { kind: m[1], color: m[2] } : null; }

  /* ---------------- 진행 (레벨 · 미션 · 칭호) ---------------- */
  function dayKey(ms) { return L.kst((ms == null ? now() : ms) - 6 * 3600e3).toISOString().slice(0, 10); }   // 영업일: 오전 6시에 바뀜
  function weekKey(ms) { var d = L.kst((ms == null ? now() : ms) - 6 * 3600e3), wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd); return d.toISOString().slice(0, 10); }
  var P = LS.json('gs_lv_prog', null);
  if (!P || P.v !== 1) P = { v: 1, xp: 0, lv: 1, st: {}, days: [], last: '', streak: 0, drinks: {}, d: null, w: null, titles: [], ti: '', items: [], wear: [], owl: 0, claims: 0 };
  function save() { LS.put('gs_lv_prog', P); }
  function need(lv) { return 60 + (lv - 1) * 30; }
  var POOL = {
    now: [['hi', 'chat', 1, '채팅으로 인사하기'], ['emote3', 'emote', 3, '손 들기·춤추기 3번'], ['drink', 'drink', 1, '바에서 한 잔 주문하기'], ['vote', 'vote', 1, '다음 곡 투표하기'], ['jump5', 'jump', 5, '점프 5번'], ['floor3', 'floor3', 1, '3층 SPOT 가 보기'], ['dj', 'dj', 1, 'DJ 부스 앞에 가 보기'], ['look', 'look', 1, '내 캐릭터 꾸미기'], ['bar', 'bar', 1, '바 앞에 가 보기']],
    night: [['drop1', 'drop', 1, '드롭에 맞춰 점프'], ['cheers1', 'cheers', 1, '누군가와 건배하기'], ['treat1', 'treat', 1, '한 잔 사 주기'], ['stay10', 'secs', 600, '10분 놀기'], ['listen10', 'listen', 600, '라디오 10분 듣기'], ['game1', 'game', 1, '게임 하나 해 보기'], ['sips10', 'sips', 10, '10모금 마시기'], ['perfect1', 'perfect', 1, '드롭 PERFECT 한 번']],
    day: [['drop5', 'drop', 5, '드롭 점프 5번'], ['stay30', 'secs', 1800, '30분 놀기'], ['combo3', 'combo', 3, '드롭 3연속 콤보'], ['drinks3', 'kinds', 3, '다른 음료 3가지 마셔 보기'], ['peak5', 'peak', 300, '피크 타임에 5분 함께하기'], ['vip1', 'vip', 1, 'VIP 테이블 잡기'], ['group1', 'group', 1, '여럿이 함께 드롭 점프']],
    week: [['w_days3', 'days', 3, '이번 주 3일 놀러 오기'], ['w_drop15', 'drop', 15, '이번 주 드롭 점프 15번'], ['w_cheers10', 'cheers', 10, '이번 주 건배 10번'], ['w_stay120', 'secs', 7200, '이번 주 2시간 놀기']]
  };
  var XP = { now: 15, night: 30, day: 50, week: 120 };
  var MAXKEYS = { combo: 1, kinds: 1, days: 1 };   // 누적이 아니라 최고값
  function pick(arr, n, seed) { var r = L.rng(L.hash(seed)), a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }
  function today() {
    var dk = dayKey();
    if (!P.d || P.d.k !== dk) {
      var ids = pick(POOL.now, 3, 'now' + dk).concat(pick(POOL.night, 3, 'night' + dk), pick(POOL.day, 2, 'day' + dk)).map(function (m) { return m[0]; });
      P.d = { k: dk, ids: ids, p: {}, c: {} }; P.drinksToday = {}; save();
    }
    var wk = weekKey();
    if (!P.w || P.w.k !== wk) { P.w = { k: wk, ids: POOL.week.map(function (m) { return m[0]; }), p: {}, c: {}, days: [] }; save(); }
    return P.d;
  }
  function mdef(id) { var hit = null; Object.keys(POOL).forEach(function (t) { POOL[t].forEach(function (m) { if (m[0] === id) hit = { id: m[0], key: m[1], goal: m[2], label: m[3], tier: t }; }); }); return hit; }
  function bump(book, ids, key, n) {
    var done = [];
    ids.forEach(function (id) {
      var m = mdef(id); if (!m || m.key !== key || book.c[id]) return;
      var before = book.p[id] || 0, after = MAXKEYS[key] ? Math.max(before, n) : before + n;
      book.p[id] = Math.min(m.goal, after);
      if (before < m.goal && book.p[id] >= m.goal) done.push(m);
    });
    return done;
  }
  var TITLES = [
    ['newbie', '새내기', function () { return P.claims >= 3; }, '미션 3개 받기'],
    ['regular', '단골', function () { return P.days.length >= 3; }, '서로 다른 3일 방문'],
    ['streak', '개근', function () { return P.streak >= 3; }, '3일 연속 방문'],
    ['dancer', '댄스머신', function () { return (P.st.drop || 0) >= 20; }, '드롭 점프 20번'],
    ['perfect', '드롭 장인', function () { return (P.st.perfect || 0) >= 10; }, 'PERFECT 10번'],
    ['drinker', '술고래', function () { return (P.st.sips || 0) >= 50; }, '50모금 마시기'],
    ['cheers', '건배왕', function () { return (P.st.cheers || 0) >= 20; }, '건배 20번'],
    ['host', '큰손', function () { return (P.st.treat || 0) >= 10; }, '한 잔 사주기 10번'],
    ['flex', '플렉스', function () { return (P.st.bottle || 0) >= 3; }, 'VIP 바틀 3번 주문'],
    ['radio', '라디오 DJ', function () { return (P.st.vote || 0) >= 20; }, '다음 곡 투표 20번'],
    ['owl', '밤샘', function () { return !!P.owl; }, '새벽 4시 넘어서도 놀기'],
    ['rising', '라이징', function () { return P.lv >= 10; }, '레벨 10'],
    ['resident', '밤의 주민', function () { return P.lv >= 25; }, '레벨 25'],
    ['legend', '레전드', function () { return P.lv >= 50; }, '레벨 50']
  ];
  var TNAME = {}; TITLES.forEach(function (t) { TNAME[t[0]] = t[1]; });
  var ITEMS = [['band', '네온 손목밴드', 3], ['shades', '네온 선글라스', 5], ['crown', '왕관', 10], ['halo', '헤일로', 15], ['gold', '골드 이름표', 20]];
  function checkUnlocks(quiet) {
    var got = [];
    TITLES.forEach(function (t) { if (P.titles.indexOf(t[0]) < 0 && t[2]()) { P.titles.push(t[0]); got.push('새 칭호: ' + t[1]); } });
    ITEMS.forEach(function (it) { if (P.items.indexOf(it[0]) < 0 && P.lv >= it[2]) { P.items.push(it[0]); got.push('새 아이템: ' + it[1]); } });
    if (got.length) { save(); if (!quiet) got.forEach(function (s, i) { setTimeout(function () { G.toast('🎁 ' + s, '#ffd23a'); }, 1300 + i * 1400); }); renderMs(); }
  }
  function addXP(n, why) {
    if (!(n > 0)) return;
    P.xp += n; var up = false;
    while (P.xp >= need(P.lv)) { P.xp -= need(P.lv); P.lv++; up = true; }
    save();
    if (up) { L.ui.big('LEVEL ' + P.lv + '!', '#ffd23a', 1800); L.ui.flash('rgba(255,210,58,.4)'); sendMe(); checkUnlocks(); }
    renderMs();
  }
  function stat(key, n, isMax) { P.st[key] = isMax ? Math.max(P.st[key] || 0, n) : (P.st[key] || 0) + n; }
  function progress(key, n) {
    var d = today(), done = bump(d, d.ids, key, n).concat(bump(P.w, P.w.ids, key, key === 'days' ? P.w.days.length : n));
    save();
    done.forEach(function (m, i) { setTimeout(function () { G.toast('🎯 미션 완료: ' + m.label, '#39ff8a'); }, i * 1300); });
    if (done.length) renderMs();
  }
  function claimable() { var d = today(), n = 0; d.ids.forEach(function (id) { var m = mdef(id); if (m && !d.c[id] && (d.p[id] || 0) >= m.goal) n++; }); P.w.ids.forEach(function (id) { var m = mdef(id); if (m && !P.w.c[id] && (P.w.p[id] || 0) >= m.goal) n++; }); return n; }
  function claim(book, id) {
    var m = mdef(id); if (!m || book.c[id] || (book.p[id] || 0) < m.goal) return;
    book.c[id] = 1; P.claims = (P.claims || 0) + 1; save();
    addXP(XP[m.tier], m.label); G.toast('+' + XP[m.tier] + ' XP · ' + m.label, '#ffd23a');
    checkUnlocks();
  }
  // 이벤트 → 기록·미션·경험치
  var sess = { start: 0, secs: 0, seen: {} };
  function onEv(k, n, x) {
    if (!G.entered()) return;
    if (k === 'floor') { if (x === '3F') once('floor3'); return; }
    if (k === 'drop') { stat('drop', 1); if (x && x.grade === 'PERFECT') { stat('perfect', 1); progress('perfect', 1); } stat('comboMax', x && x.combo || 1, true); progress('drop', 1); progress('combo', x && x.combo || 1); addXP(x && x.xp || 5); checkUnlocks(); return; }
    if (k === 'vote') { stat('vote', 1); progress('vote', 1); addXP(3); return; }
    if (k === 'emote' || k === 'jump' || k === 'chat' || k === 'group' || k === 'cheers' || k === 'treat' || k === 'game' || k === 'vip' || k === 'look') {
      stat(k, n); progress(k, n);
      if (k === 'cheers') addXP(6); if (k === 'treat') addXP(8); if (k === 'group') addXP(10);
      checkUnlocks(); return;
    }
  }
  function once(k) { if (sess.seen[k]) return; sess.seen[k] = 1; stat(k, 1); progress(k, 1); }

  /* ---------------- 내 상태 알리기 (레벨 · 칭호 · 아이템 · 잔 · 테이블) ---------------- */
  var ME = { drink: null, sipUntil: 0, cheerUntil: 0 };
  function sendMe() {
    var wear = (P.wear || []).filter(function (w) { return P.items.indexOf(w) >= 0; });
    NET.presence({ lv: P.lv, ti: P.titles.indexOf(P.ti) >= 0 ? P.ti : null, ux: wear.length ? wear.join(',') : null, dk: dkCode(ME.drink) });
  }

  /* ---------------- 이름표 위 배지 + 꾸미기 아이템 (나·다른 손님) ---------------- */
  function badgeSprite(lv, ti, gold) {
    var text = 'Lv ' + lv + (ti && TNAME[ti] ? ' · ' + TNAME[ti] : '');
    return G.textSprite(.74, .15, 512, 104, function (x, w, h) {
      x.font = '800 44px "Noto Sans KR", sans-serif'; var tw = Math.min(w - 40, x.measureText(text).width), bw = tw + 44;
      G.rrect(x, (w - bw) / 2, 14, bw, 76, 38); x.fillStyle = gold ? 'rgba(255,200,60,.92)' : 'rgba(20,16,24,.78)'; x.fill();
      x.lineWidth = 4; x.strokeStyle = gold ? '#fff2b8' : 'rgba(255,210,58,.7)'; x.stroke();
      x.fillStyle = gold ? '#2a1800' : '#ffd23a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 54, w - 50);
    });
  }
  function itemMeshes(av, ux) {
    var out = [];
    function add(parent, m) { parent.add(m); out.push([parent, m]); }
    if (ux.indexOf('band') >= 0) { var b = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 18), G.glow(0x39ff8a, .95)); b.position.y = -.25; b.rotation.x = Math.PI / 2; add(av.fores[1], b); }
    if (ux.indexOf('shades') >= 0) { [-1, 1].forEach(function (s) { var l = G.box(.072, .03, .012, G.glow(0x4fd6ff, .95)); l.position.set(s * .042, .016, .128); add(av.head, l); }); }
    if (ux.indexOf('crown') >= 0) {
      var cm = new THREE.MeshStandardMaterial({ color: 0xffcf3a, metalness: 1, roughness: .25, emissive: 0x553300 }), cr = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(.085, .09, .05, 18, 1, true), cm); cr.add(ring);
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(.018, .05, 8), cm); sp.position.set(Math.cos(a) * .085, .045, Math.sin(a) * .085); cr.add(sp); }
      cr.position.y = .15; add(av.head, cr);
    }
    if (ux.indexOf('halo') >= 0) { var h = new THREE.Mesh(new THREE.TorusGeometry(.11, .012, 8, 32), G.glow(0xfff0b0, .95)); h.position.y = .27; h.rotation.x = Math.PI / 2; add(av.head, h); }
    return out;
  }
  var DECOR = new WeakMap();   // 아바타 → {key, sprite, items, glass}
  function decorate(av, lv, ti, ux, dk) {
    if (!av) return;
    var key = lv + '|' + (ti || '') + '|' + (ux || '') + '|' + (dk || ''), cur = DECOR.get(av);
    if (cur && cur.key === key) { if (cur.sprite) cur.sprite.visible = !av.bubble; return cur; }
    if (cur) {
      if (cur.sprite) { av.g.remove(cur.sprite); G.disposeObj(cur.sprite); }
      cur.items.forEach(function (pm) { pm[0].remove(pm[1]); G.disposeObj(pm[1]); });
      if (cur.glass) { cur.glass.parent && cur.glass.parent.remove(cur.glass); G.disposeObj(cur.glass); }
    }
    var uxs = String(ux || '').split(','), d = { key: key, sprite: null, items: [], glass: null };
    if (lv > 1 || ti) { d.sprite = badgeSprite(lv, ti, uxs.indexOf('gold') >= 0); d.sprite.position.y = 2.3; av.g.add(d.sprite); }
    d.items = itemMeshes(av, uxs);
    var dp = dkParse(dk); if (dp) { d.glass = glassMesh(dp.kind, dp.color); holdGlass(av, d.glass); }
    DECOR.set(av, d); return d;
  }
  function cleanLv(v) { v = Math.floor(+v); return v >= 1 && v <= 199 ? v : 1; }
  function cleanTi(v) { return TNAME[v] ? v : ''; }
  function cleanUx(v) { return String(v || '').split(',').filter(function (s) { return ITEMS.some(function (it) { return it[0] === s; }); }).join(','); }

  /* ---------------- 바 ---------------- */
  function barSpot(F) {
    var rec = G.floors[F]; if (!rec) return null;
    if (F === '2F') return { a: [rec.X(690), rec.Z(278) - .62], b: [rec.X(895), rec.Z(278) - .62], tender: [rec.X(793), rec.Z(326)], yaw: Math.PI, look: Math.PI };
    return { a: [rec.X(780) - .62, rec.Z(285)], b: [rec.X(780) - .62, rec.Z(390)], tender: [rec.X(848), rec.Z(336)], yaw: -Math.PI / 2, look: -Math.PI / 2 };
  }
  function segDist(px, pz, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], t = ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz); t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t)); }
  function nearBar() { var s = barSpot(G.active()); return s && segDist(G.player.x, G.player.z, s.a, s.b) < 1.5; }
  var TENDERS = {};
  ['2F', '3F'].forEach(function (F) {
    var s = barSpot(F), rec = G.floors[F]; if (!s) return;
    var av = G.makeAvatar({ o: 3, t: 4, b: 0, s: F === '2F' ? 1 : 0, h: F === '2F' ? 0 : 3, hc: 0, a: 0, tc: '#141416', bc: '#141416' }, null, false);
    av.g.position.set(s.tender[0], 0, s.tender[1]); av.g.rotation.y = s.yaw; rec.group.add(av.g);
    TENDERS[F] = { av: av, busyUntil: 0 };
  });
  function tenderSay(text) { var T = TENDERS[G.active()]; if (!T) return; G.setBubble(T.av, text); T.busyUntil = pnow() + 1600; }
  var BT = { order: ['{d} 한 잔, 바로 나와요!', '좋은 선택이에요!', '{d}요? 금방 드릴게요.', '잘 고르셨네요.'], give: ['여기 있어요!', '맛있게 드세요!', '건배!', '나왔어요.'], water: ['수분 보충 좋아요!', '물 좋죠, 현명해요.'], tipsy: ['다음엔 물 어때요?', '천천히 하세요!', '속도 조절해요!'] };
  function line(arr, d) { return arr[Math.floor(Math.random() * arr.length)].replace('{d}', d || ''); }

  /* ---------------- 취기 ---------------- */
  var TIP = { v: +LS.get('gs_lv_tipsy_v', '0') || 0, at: +LS.get('gs_lv_tipsy_at', '0') || 0 };
  function tipsyNow() { var v = TIP.v - (now() - TIP.at) / 150000; return Math.max(0, v); }
  function addTipsy(x) { TIP.v = Math.max(0, Math.min(12, tipsyNow() + x)); TIP.at = now(); LS.set('gs_lv_tipsy_v', String(TIP.v)); LS.set('gs_lv_tipsy_at', String(TIP.at)); }
  function tipsyName(v) { return v < 1.5 ? '멀쩡' : v < 4 ? '알딸딸' : v < 7 ? '취함' : '만취'; }

  /* ---------------- 화면 조각 ---------------- */
  var tools = $('.top .tools'), bottom = $('.hud.bottom'), chatBtn = $('#chatbtn');
  var msBtn = mk('button', 'lv-msbtn'); msBtn.type = 'button'; msBtn.id = 'lvmsbtn'; msBtn.setAttribute('aria-label', '미션·레벨'); msBtn.textContent = '🏆';
  var msDot = mk('i', 'lv-dot'); msDot.hidden = true; msBtn.appendChild(msDot);
  if (tools) tools.insertBefore(msBtn, $('#sound'));
  var barBtn = mk('button', null); barBtn.type = 'button'; barBtn.id = 'lvbarbtn'; barBtn.setAttribute('aria-label', '바');
  barBtn.innerHTML = '🍸<span class="lbl"> 바</span>';
  if (bottom && chatBtn) bottom.insertBefore(barBtn, chatBtn);
  var dock = mk('div', 'lv-dock'); doc.body.appendChild(dock);
  var drinkChip = mk('div', 'chip lv-chip lv-drinkchip'); drinkChip.hidden = true; dock.appendChild(drinkChip);
  var vipChip = mk('div', 'chip lv-chip lv-vipchip'); vipChip.hidden = true; dock.appendChild(vipChip);
  var offer = mk('div', 'chip lv-offer'); offer.hidden = true; offer.setAttribute('role', 'alertdialog'); doc.body.appendChild(offer);
  var guideEl = mk('div', 'chip lv-guide'); guideEl.hidden = true; doc.body.appendChild(guideEl);
  function panel(id, title) {
    var p = mk('div', 'chip lv-panel'); p.id = id; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', title);
    var head = mk('div', 'bgm-head'), b = mk('b', null, title), sp = mk('span'), x = mk('button', null, '✕'); x.type = 'button'; x.setAttribute('aria-label', '닫기');
    head.appendChild(b); head.appendChild(sp); head.appendChild(x); p.appendChild(head);
    var body = mk('div', 'lv-pbody'); p.appendChild(body);
    x.addEventListener('click', function () { p.hidden = true; });
    doc.body.appendChild(p); return { el: p, body: body, sub: sp, title: b };
  }
  var barP = panel('lvbar', '🍸 바'), vipP = panel('lvvipmenu', '🍾 VIP 메뉴'), msP = panel('lvms', '🏆 미션 · 레벨'), treatP = panel('lvtreat', '🎁 한 잔 사주기');
  function closeAll(except) { [barP, vipP, msP, treatP].forEach(function (p) { if (p !== except) p.el.hidden = true; }); }
  function toggle(p, render) { var open = p.el.hidden; closeAll(p); p.el.hidden = !open; if (open && render) render(); }
  function btn(text, cls, fn) { var b = mk('button', cls || null, text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }

  /* ---------------- 바 창 ---------------- */
  var TREAT = { target: null };
  function renderBar(treatMode) {
    var B = barP.body; B.textContent = '';
    barP.sub.textContent = treatMode ? (TREAT.target ? TREAT.target.name + '님에게' : '') : '가상 음료는 전부 무료';
    if (!treatMode && !nearBar()) {
      var far = mk('div', 'lv-note'); far.appendChild(mk('span', null, '바 앞에서 주문할 수 있어요. ' + (G.active() === '2F' ? '2층 MAIN BAR는 화장실 쪽 카운터예요.' : '3층 MAIN BAR는 DJ 오른쪽 세로 카운터예요.')));
      var row = mk('div', 'lv-row'); row.appendChild(btn('🧭 바까지 안내', null, function () { guide(barTarget(), '바'); barP.el.hidden = true; })); row.appendChild(btn('⚡ 바로 이동', null, function () { goBar(); renderBar(false); }));
      far.appendChild(row); B.appendChild(far);
    }
    BAR_MENU.forEach(function (cat) {
      B.appendChild(mk('div', 'lv-cat', cat.name));
      var grid = mk('div', 'lv-grid');
      cat.items.forEach(function (it) {
        var kind = it[0] === '물' ? 'water' : cat.kind, b2 = btn('', 'lv-item');
        var sw = mk('i', 'lv-sw'); sw.style.background = liquid(it[0], kind); b2.appendChild(sw);
        b2.appendChild(mk('b', null, it[0])); b2.appendChild(mk('small', null, it[1] ? '매장가 ' + won(it[1]) : '무료'));
        b2.addEventListener('click', function () { if (treatMode) sendTreat(it[0], kind); else order(it[0], kind); });
        grid.appendChild(b2);
      });
      B.appendChild(grid);
    });
    B.appendChild(mk('small', 'lv-fine', '실제 매장 메뉴 이름과 가격이에요. 가상 클럽 안 음료는 무료이고 실제로 주문되지는 않아요.'));
  }
  function barTarget() { var s = barSpot(G.active()); return { F: G.active(), x: (s.a[0] + s.b[0]) / 2, z: (s.a[1] + s.b[1]) / 2 }; }
  function goBar() { var s = barSpot(G.active()), t = barTarget(); G.player.x = t.x; G.player.z = t.z; G.player.yaw = s.look; G.player.pitch = -.05; }
  var pendingOrder = 0;
  function order(name, kind) {
    if (!nearBar()) { G.toast('🍸 바 앞에서 주문해요', '#fff'); return; }
    if (pnow() < pendingOrder) return;
    pendingOrder = pnow() + 1800; barP.el.hidden = true;
    var tip = tipsyNow();
    tenderSay(kind === 'water' ? line(BT.water) : tip >= 6 && kind !== 'soft' ? line(BT.tipsy) : line(BT.order, name));
    G.toast('🍸 곧 나와요…', '#fff');
    setTimeout(function () { giveDrink(name, kind); tenderSay(line(BT.give)); }, 1500);
  }
  function giveDrink(name, kind, from) {
    var k = KIND[kind] || KIND.mix;
    ME.drink = { name: name, kind: kind, color: liquid(name, kind), sips: k.sips, max: k.sips, from: from || '' };
    if (!from) { stat('drink', 1); progress('drink', 1); }
    P.drinksToday = P.drinksToday || {}; P.drinksToday[name] = 1; stat('kinds', Object.keys(P.drinksToday).length, true); progress('kinds', Object.keys(P.drinksToday).length); save();
    sendMe(); renderDrink();
    G.toast('🍹 ' + name + (from ? ' · ' + from + '님이 사줬어요' : ' 받았어요'), '#ffd27a');
  }
  function sip() {
    var d = ME.drink; if (!d || d.sips <= 0) return;
    ME.sipUntil = pnow() + 900; d.sips--; addTipsy((KIND[d.kind] || KIND.mix).str);
    stat('sips', 1); progress('sips', 1);
    var tv = tipsyNow();
    if (tv >= 7 && !ME.warned) { ME.warned = true; setTimeout(function () { G.toast('💧 물 한 잔 어때요? 바에 무료 물이 있어요', '#cfe9ff'); }, 900); }
    if (tv < 4) ME.warned = false;
    if (d.sips <= 0) { setTimeout(function () { if (ME.drink === d) { ME.drink = null; sendMe(); renderDrink(); G.toast('다 마셨어요 · 바에서 한 잔 더?', '#fff'); } }, 1000); }
    renderDrink(); checkUnlocks();
  }
  var drinkSig = '';
  function renderDrink() {
    var d = ME.drink; drinkChip.hidden = !d || !G.entered(); if (!d) { drinkSig = ''; return; }
    var sig = d.name + '|' + d.sips + '|' + d.max + '|' + tipsyName(tipsyNow()); if (sig === drinkSig) return; drinkSig = sig;
    drinkChip.textContent = '';
    var info = mk('span', 'lv-dinfo'); var sw = mk('i', 'lv-sw'); sw.style.background = d.color; info.appendChild(sw);
    info.appendChild(mk('b', null, d.name)); info.appendChild(mk('small', null, d.sips + '/' + d.max + '모금 · ' + tipsyName(tipsyNow())));
    drinkChip.appendChild(info);
    function lbtn(icon, label, fn) { var b = btn(icon, null, fn); b.appendChild(mk('span', 'lbl', ' ' + label)); b.setAttribute('aria-label', label); return b; }
    drinkChip.appendChild(lbtn(d.kind === 'shot' ? '🥃' : '🍹', d.kind === 'shot' ? '원샷' : '한 모금', sip));
    drinkChip.appendChild(lbtn('🥂', '건배', cheers));
    drinkChip.appendChild(btn('🎁', 'lv-ico', function () { openTreat(); })).setAttribute('aria-label', '한 잔 사주기');
    drinkChip.appendChild(btn('✕', 'lv-ico', function () { ME.drink = null; sendMe(); renderDrink(); })).setAttribute('aria-label', '잔 내려놓기');
  }

  /* ---------------- 건배 ---------------- */
  var CHEERS = { recent: [], mineAt: 0, done: 0 };
  function clink() {
    var AC = G.AC(); if (!AC || !G.sound()) return;
    try { var t = AC.currentTime; [2630, 3170, 4100].forEach(function (f, i) { var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t + i * .015); g.gain.exponentialRampToValueAtTime(.12 / (i + 1), t + i * .015 + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .55); o.connect(g); g.connect(AC.destination); o.start(t + i * .015); o.stop(t + .6); }); } catch (e) {}
  }
  function cheers() {
    if (!ME.drink) { G.toast('먼저 바에서 음료를 받아 주세요', '#fff'); return; }
    if (pnow() - CHEERS.mineAt < 2500) return;
    CHEERS.mineAt = pnow(); ME.cheerUntil = pnow() + 2200;
    NET.emit('ch', { f: G.active(), x: Math.round(G.player.x * 10) / 10, z: Math.round(G.player.z * 10) / 10, u: UID, n: G.myNick() });
    if (!checkCheers()) setTimeout(function () { if (!checkCheers() && pnow() - CHEERS.done > 3000) npcCheers(); }, 1400);
  }
  function checkCheers() {
    if (!CHEERS.mineAt || pnow() - CHEERS.mineAt > 6000 || pnow() - CHEERS.done < 6000) return false;
    var F = G.active(), group = {};
    CHEERS.recent = CHEERS.recent.filter(function (c) { return pnow() - c.t < 8000; });
    CHEERS.recent.forEach(function (c) { if (c.f === F && Math.abs(c.t - CHEERS.mineAt) < 6000 && Math.hypot(c.x - G.player.x, c.z - G.player.z) < 4.5) group[c.u] = c.n; });
    var n = Object.keys(group).length; if (!n) return false;
    CHEERS.done = pnow(); clink(); L.ui.big('🥂 ' + (n + 1) + '명이 다 같이 건배!', '#ffd23a', 1500);
    var p = new THREE.Vector3(G.player.x, 1.6, G.player.z); G.sparks(F, p, 1.2);
    L.ev('cheers', 1);
    return true;
  }
  function npcCheers() {
    var rec = G.floors[G.active()], best = null, bd = 2.8;
    rec.npcs.forEach(function (n) { var d = Math.hypot(n.x - G.player.x, n.z - G.player.z); if (d < bd) { bd = d; best = n; } });
    if (!best) { G.toast('🥂 근처에 같이 건배할 사람이 없어요', '#fff'); return; }
    best.cheerUntil = pnow() + 2200; G.setBubble(best.av, '건배! 🥂'); CHEERS.done = pnow(); clink();
    L.ui.big('🥂 옆 손님과 건배!', '#ffd23a', 1300); L.ev('cheers', 1);
  }
  NET.on('ch', function (d) {
    if (!d || !/^u[a-z0-9]{4,12}$/.test(d.u || '') || (d.f !== '2F' && d.f !== '3F')) return;
    var x = +d.x, z = +d.z; if (!isFinite(x) || !isFinite(z)) return;
    CHEERS.recent.push({ u: d.u, n: esc(d.n) || '손님', f: d.f, x: x, z: z, t: pnow() });
    var en = NET.peerByUid(d.u); if (en) en.cheerUntil = pnow() + 2200;
    checkCheers();
  });

  /* ---------------- 한 잔 사주기 ---------------- */
  var lastTreat = 0, OFFER = null;
  function openTreat() {
    var B = treatP.body; B.textContent = ''; closeAll(treatP); treatP.el.hidden = false;
    B.appendChild(mk('p', 'lv-note', '누구에게 한 잔 사줄까요? (같은 층, 가까운 순)'));
    var F = G.active(), list = [];
    Object.keys(G.peers).forEach(function (id) { var en = G.peers[id]; if (en.f !== F || !en.pr || !/^u[a-z0-9]{4,12}$/.test(en.pr.uid || '')) return; list.push({ uid: en.pr.uid, name: en.nick || '손님', d: Math.hypot(en.x - G.player.x, en.z - G.player.z) }); });
    list.sort(function (a, b) { return a.d - b.d; });
    list.slice(0, 8).forEach(function (p) { B.appendChild(btn('🙂 ' + p.name + ' · ' + p.d.toFixed(0) + 'm', 'lv-pick', function () { TREAT.target = p; renderBar(true); closeAll(barP); barP.el.hidden = false; })); });
    var npc = nearestNpc(6);
    if (npc) B.appendChild(btn('🧍 옆 손님 (가상 손님)', 'lv-pick', function () { TREAT.target = { npc: npc, name: '옆 손님' }; renderBar(true); closeAll(barP); barP.el.hidden = false; }));
    if (!list.length && !npc) B.appendChild(mk('p', 'lv-note', '지금 이 층 가까이에 사줄 사람이 없어요.'));
  }
  function nearestNpc(r) { var rec = G.floors[G.active()], best = null, bd = r; rec.npcs.forEach(function (n) { var d = Math.hypot(n.x - G.player.x, n.z - G.player.z); if (d < bd) { bd = d; best = n; } }); return best; }
  function sendTreat(name, kind) {
    var tg = TREAT.target; barP.el.hidden = true; if (!tg) return;
    if (pnow() - lastTreat < 15000) { G.toast((Math.ceil((15000 - (pnow() - lastTreat)) / 1000)) + '초 뒤에 다시 살 수 있어요', '#fff'); return; }
    lastTreat = pnow();
    if (tg.npc) {
      var n = tg.npc; n.drink = glassMesh(kind, liquid(name, kind)); holdGlass(n.av, n.drink); n.cheerUntil = pnow() + 2200;
      G.setBubble(n.av, '고마워요! 건배! 🥂'); clink(); L.ev('treat', 1); G.toast('🎁 옆 손님에게 ' + name + ' 한 잔!', '#ffd23a'); return;
    }
    NET.emit('tr', { to: tg.uid, u: UID, n: G.myNick(), nm: name, k: kind });
    G.toast('🎁 ' + tg.name + '님에게 ' + name + ' 한 잔 권했어요', '#fff');
  }
  function showOffer(o) {
    OFFER = o; offer.textContent = ''; offer.hidden = false;
    offer.appendChild(mk('b', null, o.text));
    var row = mk('div', 'lv-row');
    row.appendChild(btn(o.yes || '받기', 'lv-yes', function () { var f = o.onYes; OFFER = null; offer.hidden = true; if (f) f(); }));
    row.appendChild(btn(o.no || '괜찮아요', null, function () { var f = o.onNo; OFFER = null; offer.hidden = true; if (f) f(); }));
    offer.appendChild(row);
    clearTimeout(showOffer.t); showOffer.t = setTimeout(function () { if (OFFER === o) { OFFER = null; offer.hidden = true; if (o.onNo) o.onNo(true); } }, 20000);
  }
  NET.on('tr', function (d) {
    if (!d || d.to !== UID || !/^u[a-z0-9]{4,12}$/.test(d.u || '') || !KIND[d.k]) return;
    var who = esc(d.n) || '손님', nm = esc(d.nm) || '한 잔';
    showOffer({ text: '🎁 ' + who + '님이 ' + nm + ' 한 잔 사주고 싶대요', onYes: function () { giveDrink(nm, d.k, who); NET.emit('ta', { to: d.u, u: UID, n: G.myNick(), nm: nm, ok: 1 }); }, onNo: function (auto) { NET.emit('ta', { to: d.u, u: UID, n: G.myNick(), nm: nm, ok: 0, auto: auto ? 1 : 0 }); } });
  });
  NET.on('ta', function (d) {
    if (!d || d.to !== UID) return; var who = esc(d.n) || '손님';
    if (d.ok) { G.toast('🥂 ' + who + '님이 ' + (esc(d.nm) || '한 잔') + ' 받았어요. 건배!', '#ffd23a'); clink(); L.ev('treat', 1); }
    else G.toast(d.auto ? who + '님이 답이 없어요' : who + '님이 다음에 받겠대요', '#fff');
  });

  /* ---------------- VIP 테이블 ---------------- */
  var TBL = { '2F': ['TABLE 2', 'TABLE 3', 'TABLE 4', 'TABLE 5', 'TABLE 6', 'TABLE 7', 'TABLE 1'], '3F': ['TABLE 9', 'TABLE 10', 'TABLE 11', 'TABLE 12', 'TABLE 13', 'TABLE 4', 'TABLE 3', 'TABLE 2', 'TABLE 1', 'D2', 'D1'] };
  function tname(F, i) { return (TBL[F] && TBL[F][i]) || ('TABLE ' + (i + 1)); }
  var VIP = { mine: null, guest: null, signs: {}, bottles: {}, parades: [], unlockAt: 0 };
  var HOLD = 15 * 60000;
  function vipUnlocked() { return P.lv >= 3 || sess.secs >= 600; }
  function claims() {   // [{F,i,at,uid,name,me}]
    var out = [];
    if (VIP.mine) out.push({ F: VIP.mine.F, i: VIP.mine.i, at: VIP.mine.at, uid: UID, name: G.myNick(), me: true });
    Object.keys(G.peers).forEach(function (id) {
      var en = G.peers[id], v = en.pr && en.pr.vp; if (!Array.isArray(v) || !en.pr.uid) return;
      var F = v[0], i = v[1] | 0, at = +v[2]; if ((F !== '2F' && F !== '3F') || !G.floors[F].tables[i] || !(at > 0) || now() - at > HOLD + 60000) return;
      out.push({ F: F, i: i, at: at, uid: en.pr.uid, name: en.nick || '손님', me: false });
    });
    return out;
  }
  function ownerOf(F, i, list) { var o = null; (list || claims()).forEach(function (c) { if (c.F === F && c.i === i && (!o || c.at < o.at || (c.at === o.at && c.uid < o.uid))) o = c; }); return o; }
  function nearTable() { var F = G.active(), best = -1, bd = 2.3; G.floors[F].tables.forEach(function (p, i) { var d = Math.hypot(p.x - G.player.x, p.z - G.player.z); if (d < bd) { bd = d; best = i; } }); return best; }
  function takeTable(i) {
    if (!vipUnlocked()) { G.toast('🔒 클럽에 10분 있거나 레벨 3이 되면 열려요', '#fff'); return; }
    var F = G.active(), o = ownerOf(F, i);
    if (o && !o.me) { G.toast('다른 분이 잡은 테이블이에요', '#fff'); return; }
    VIP.mine = { F: F, i: i, at: now() }; VIP.guest = null;
    NET.presence({ vp: [F, i, VIP.mine.at], vg: null });
    G.toast('👑 ' + tname(F, i) + ' · 15분 동안 내 테이블이에요', '#ffd23a');
    L.ev('vip', 1); renderVip();
  }
  function leaveTable() { VIP.mine = null; VIP.guest = null; NET.presence({ vp: null, vg: null }); renderVip(); }
  function vipOrder(item) {
    var m = VIP.mine; if (!m) return; vipP.el.hidden = true;
    var d = { f: m.F, i: m.i, it: item[0], n: G.myNick(), u: UID };
    NET.emit('vb', d); parade(d, true);
    stat('bottle', 1); save(); checkUnlocks();
  }
  function renderVipMenu() {
    var B = vipP.body, m = VIP.mine; B.textContent = ''; if (!m) return;
    vipP.sub.textContent = tname(m.F, m.i) + ' · 가상 바틀은 무료';
    (VIP_MENU[m.F] || []).forEach(function (it) {
      var b = btn('', 'lv-item lv-wide'); b.appendChild(mk('b', null, '🍾 ' + it[0])); b.appendChild(mk('small', null, (it[1] ? it[1] + ' · ' : '') + '매장가 ' + won(it[2])));
      b.addEventListener('click', function () { vipOrder(it); }); B.appendChild(b);
    });
    B.appendChild(mk('small', 'lv-fine', '주문하면 스파클러 퍼레이드가 테이블까지 와요. 실제 주문은 매장에서 직원에게 해 주세요.'));
  }
  // 웨이터가 바에서 테이블까지 스파클러를 들고 걸어가요
  var WAITERS = {};
  function waiter(F) {
    if (WAITERS[F]) return WAITERS[F];
    var av = G.makeAvatar({ o: 3, t: 4, b: 0, s: 1, h: 0, hc: 0, a: 0, tc: '#111114', bc: '#111114' }, null, false);
    av.g.visible = false; G.floors[F].group.add(av.g);
    var bottle = new THREE.Group(), bm = new THREE.MeshStandardMaterial({ color: 0x0f3a22, roughness: .1, metalness: .3, emissive: 0x05140b });
    var b1 = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .22, 14), bm); b1.position.y = .11; bottle.add(b1);
    var b2 = new THREE.Mesh(new THREE.CylinderGeometry(.015, .035, .1, 12), bm); b2.position.y = .27; bottle.add(b2);
    var foil = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .06, 10), new THREE.MeshStandardMaterial({ color: 0xffcf5a, metalness: 1, roughness: .3, emissive: 0x553300 })); foil.position.y = .33; bottle.add(foil);
    bottle.position.set(0, -.36, .05); bottle.rotation.x = Math.PI / 2; av.fores[1].add(bottle);
    return (WAITERS[F] = { av: av, spark: new THREE.Vector3() });
  }
  function parade(d, mine) {
    var F = d.f, rec = G.floors[F], tb = rec && rec.tables[d.i | 0]; if (!tb) return;
    var s = barSpot(F), W = waiter(F), from = { x: (s.a[0] + s.b[0]) / 2, z: (s.a[1] + s.b[1]) / 2 };
    var p = { F: F, i: d.i | 0, from: from, to: { x: tb.x, z: tb.z }, t0: pnow(), dur: 4600, W: W, item: esc(d.it), n: esc(d.n) || '손님' };
    VIP.parades.push(p); W.av.g.visible = true;
    G.sparks(F, W.spark, 5.2);
    if (F === G.active()) { G.toast('🍾 ' + p.n + '님 ' + p.item + ' 주문! 스파클러 퍼레이드', '#ffd27a'); G.hands(3); }
    if (mine) L.ev('bottle', 1);
  }
  NET.on('vb', function (d) { if (!d || (d.f !== '2F' && d.f !== '3F') || !/^u[a-z0-9]{4,12}$/.test(d.u || '')) return; parade(d, false); });
  function paradeTick() {
    var t = pnow();
    VIP.parades = VIP.parades.filter(function (p) {
      var k = Math.min(1, (t - p.t0) / p.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var x = p.from.x + (p.to.x - p.from.x) * e, z = p.from.z + (p.to.z - p.from.z) * e, A = p.W.av;
      A.g.position.set(x, 0, z); A.g.rotation.y = Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z);
      G.animAvatar(A, t / 1000, (t / 600) % 1, k < 1, null);
      A.arms[1].rotation.set(0, 0, 2.6); A.fores[1].rotation.x = -.25;
      p.W.spark.set(x + Math.cos(A.g.rotation.y) * .25, 2.35, z - Math.sin(A.g.rotation.y) * .25);
      if (k >= 1) {
        A.g.visible = false;
        placeBottle(p.F, p.i);
        return false;
      }
      return true;
    });
  }
  function placeBottle(F, i) {
    var rec = G.floors[F], tb = rec.tables[i], key = F + ':' + i; if (!tb) return;
    var old = VIP.bottles[key]; if (old) { rec.group.remove(old.g); G.disposeObj(old.g); }
    var g = new THREE.Group(), bm = new THREE.MeshStandardMaterial({ color: 0x0f3a22, roughness: .1, metalness: .3, emissive: 0x081a10 });
    var b1 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .055, .28, 16), bm); b1.position.y = .14; g.add(b1);
    var b2 = new THREE.Mesh(new THREE.CylinderGeometry(.018, .045, .12, 12), bm); b2.position.y = .34; g.add(b2);
    var lb = new THREE.Mesh(new THREE.CylinderGeometry(.056, .056, .1, 16, 1, true), G.glow(0xffd23a, .85)); lb.position.y = .13; g.add(lb);
    g.position.set(tb.x + .12, .66, tb.z + .05); rec.group.add(g);
    var sp = new THREE.Vector3(tb.x + .12, 1.05, tb.z + .05); G.sparks(F, sp, 6);
    VIP.bottles[key] = { g: g, until: now() + 10 * 60000 };
  }
  function vipAsk(o) { NET.emit('va', { to: o.uid, u: UID, n: G.myNick(), f: o.F, i: o.i }); G.toast('🙋 ' + o.name + '님께 물어봤어요', '#fff'); VIP.askAt = pnow(); }
  NET.on('va', function (d) {
    var m = VIP.mine; if (!d || d.to !== UID || !m || d.f !== m.F || (d.i | 0) !== m.i || !/^u[a-z0-9]{4,12}$/.test(d.u || '')) return;
    var who = esc(d.n) || '손님';
    showOffer({ text: '🙋 ' + who + '님이 ' + tname(m.F, m.i) + '에 같이 앉고 싶어 해요', yes: '들여보내기', no: '거절', onYes: function () { NET.emit('vr', { to: d.u, u: UID, ok: 1, f: m.F, i: m.i, n: G.myNick() }); G.toast('👑 ' + who + '님이 일행이 됐어요', '#ffd23a'); }, onNo: function () { NET.emit('vr', { to: d.u, u: UID, ok: 0, n: G.myNick() }); } });
  });
  NET.on('vr', function (d) {
    if (!d || d.to !== UID) return; var who = esc(d.n) || '손님';
    if (d.ok && (d.f === '2F' || d.f === '3F')) { VIP.guest = { F: d.f, i: d.i | 0, owner: d.u, name: who }; NET.presence({ vg: [d.f, d.i | 0] }); G.toast('👑 ' + who + '님이 들여보내 줬어요', '#ffd23a'); renderVip(); }
    else G.toast('이번에는 어렵대요', '#fff');
  });
  function pour() { var m = VIP.mine || VIP.guest; if (!m) return; giveDrink('샴페인', 'champ'); }
  var vipSig = '', vipLeftEl = null;
  function renderVip() {
    var F = G.active(), m = VIP.mine, gst = VIP.guest, ni = nearTable(), list = claims();
    if (!G.entered() || G.busy()) { vipChip.hidden = true; vipSig = ''; return; }
    var o0 = !m && !gst && ni >= 0 ? ownerOf(F, ni, list) : null;
    var sig = [F, m ? m.F + m.i : '', gst ? gst.F + gst.i + gst.name : '', ni, o0 ? o0.uid + o0.name : '', vipUnlocked() ? 1 : Math.ceil((600 - sess.secs) / 60), VIP.askAt && pnow() - VIP.askAt < 20000 ? 1 : 0].join('|');
    if (m && vipLeftEl) vipLeftEl.textContent = ' · ' + L.mmss(Math.max(0, HOLD - (now() - m.at)) / 1000);
    if (sig === vipSig) return; vipSig = sig;
    vipChip.textContent = ''; vipLeftEl = null;
    if (m) {
      var left = Math.max(0, HOLD - (now() - m.at)) / 1000;
      var hb = mk('b', null, '👑 ' + tname(m.F, m.i) + (m.F !== F ? ' (' + m.F + ')' : '')); vipLeftEl = mk('span', null, ' · ' + L.mmss(left)); hb.appendChild(vipLeftEl);
      vipChip.appendChild(hb);
      vipChip.appendChild(btn('🍾 VIP 메뉴', null, function () { toggle(vipP, renderVipMenu); }));
      vipChip.appendChild(btn('🥂 따르기', null, pour));
      vipChip.appendChild(btn('반납', null, function () { leaveTable(); G.toast('테이블을 반납했어요', '#fff'); }));
      vipChip.hidden = false; return;
    }
    if (gst) {
      vipChip.appendChild(mk('b', null, '👑 ' + gst.name + '님 테이블 일행'));
      vipChip.appendChild(btn('🥂 따르기', null, pour));
      vipChip.appendChild(btn('나가기', null, function () { VIP.guest = null; NET.presence({ vg: null }); renderVip(); }));
      vipChip.hidden = false; return;
    }
    if (ni >= 0) {
      var o = ownerOf(F, ni, list);
      if (!o) { vipChip.appendChild(mk('b', null, '👑 ' + tname(F, ni))); vipChip.appendChild(btn(vipUnlocked() ? 'VIP 테이블 잡기' : '🔒 ' + Math.max(1, Math.ceil((600 - sess.secs) / 60)) + '분 뒤 열려요', null, function () { takeTable(ni); })); }
      else { vipChip.appendChild(mk('b', null, '👑 ' + o.name + '님 테이블')); if (!VIP.askAt || pnow() - VIP.askAt > 20000) vipChip.appendChild(btn('🙋 같이 앉아도 될까요?', null, function () { vipAsk(o); renderVip(); })); }
      vipChip.hidden = false; return;
    }
    vipChip.hidden = true;
  }
  function vipSecond() {
    var list = claims();
    if (VIP.mine) {
      var o = ownerOf(VIP.mine.F, VIP.mine.i, list);
      if (o && !o.me) { G.toast('다른 분이 먼저 잡은 테이블이었어요', '#fff'); leaveTable(); }
      else if (now() - VIP.mine.at > HOLD) { G.toast('테이블 시간이 끝났어요', '#fff'); leaveTable(); }
    }
    if (VIP.guest) { var ow = list.filter(function (c) { return c.uid === VIP.guest.owner && c.F === VIP.guest.F && c.i === VIP.guest.i; })[0]; if (!ow) { VIP.guest = null; NET.presence({ vg: null }); G.toast('이제 그 테이블 일행이 아니에요', '#fff'); } }
    // 테이블 위 표지 (누구 테이블인지)
    var want = {};
    list.forEach(function (c) { var o = ownerOf(c.F, c.i, list); if (o === c) want[c.F + ':' + c.i] = c.name; });
    Object.keys(VIP.signs).forEach(function (k) { if (want[k] !== VIP.signs[k].name) { var s = VIP.signs[k]; s.rec.group.remove(s.sp); G.disposeObj(s.sp); delete VIP.signs[k]; } });
    Object.keys(want).forEach(function (k) {
      if (VIP.signs[k]) return; var pr = k.split(':'), rec = G.floors[pr[0]], tb = rec.tables[+pr[1]]; if (!tb) return;
      var name = want[k], sp = G.textSprite(1.1, .27, 512, 128, function (x, w, h) { x.font = '800 46px "Noto Sans KR", sans-serif'; var text = '👑 VIP · ' + name, tw = Math.min(w - 40, x.measureText(text).width), bw = tw + 50; G.rrect(x, (w - bw) / 2, 20, bw, 88, 40); x.fillStyle = 'rgba(30,20,6,.82)'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#ffd23a'; x.stroke(); x.fillStyle = '#ffe9a8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 66, w - 60); });
      sp.position.set(tb.x, 1.75, tb.z); rec.group.add(sp); VIP.signs[k] = { sp: sp, rec: rec, name: name };
    });
    Object.keys(VIP.bottles).forEach(function (k) { var b = VIP.bottles[k]; if (now() > b.until) { var pr = k.split(':'); G.floors[pr[0]].group.remove(b.g); G.disposeObj(b.g); delete VIP.bottles[k]; } });
    renderVip();
  }

  /* ---------------- 길 안내 ---------------- */
  var GUIDE = null;
  function guide(t, label) { GUIDE = { t: t, label: label }; }
  function guideTick() {
    if (!GUIDE) { guideEl.hidden = true; return; }
    var t = GUIDE.t, F = G.active();
    if (t.F !== F) { guideEl.hidden = false; guideEl.textContent = '🧭 ' + GUIDE.label + ' · ' + (t.F === '2F' ? '⬇ 2층' : '⬆ 3층') + '으로 가요'; return; }
    var dx = t.x - G.player.x, dz = t.z - G.player.z, d = Math.hypot(dx, dz);
    if (d < 1.3) { guideEl.hidden = false; guideEl.textContent = '📍 여기예요! ' + (GUIDE.label === '바' ? '🍸 버튼으로 주문해요' : ''); if (!GUIDE.doneAt) GUIDE.doneAt = pnow(); if (pnow() - GUIDE.doneAt > 3500) GUIDE = null; return; }
    var ang = Math.atan2(-dx, -dz) - G.player.yaw, arrows = ['⬆', '↖', '⬅', '↙', '⬇', '↘', '➡', '↗'];
    var idx = Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    guideEl.hidden = false; guideEl.textContent = '🧭 ' + GUIDE.label + ' ' + arrows[idx] + ' ' + d.toFixed(0) + 'm';
  }
  guideEl.addEventListener('click', function () { GUIDE = null; guideEl.hidden = true; });

  /* ---------------- 미션 창 ---------------- */
  function pbar(v, max) { var w = mk('div', 'lv-pbar'), f = mk('i'); f.style.width = Math.round(Math.min(1, v / max) * 100) + '%'; w.appendChild(f); return w; }
  function fmtProg(m, v) { return m.key === 'secs' || m.key === 'listen' || m.key === 'peak' ? Math.floor(v / 60) + ' / ' + Math.round(m.goal / 60) + '분' : v + ' / ' + m.goal; }
  function renderMs() {
    var n = claimable(); msDot.hidden = !n;
    if (msP.el.hidden) return;
    var B = msP.body, d = today(); B.textContent = '';
    msP.title.textContent = '🏆 Lv ' + P.lv + (P.ti && TNAME[P.ti] ? ' · ' + TNAME[P.ti] : '');
    msP.sub.textContent = P.xp + ' / ' + need(P.lv) + ' XP';
    B.appendChild(pbar(P.xp, need(P.lv)));
    function list(title, book, ids) {
      B.appendChild(mk('div', 'lv-cat', title));
      ids.forEach(function (id) {
        var m = mdef(id); if (!m) return; var v = book.p[id] || 0, row = mk('div', 'lv-mrow' + (book.c[id] ? ' done' : ''));
        var txt = mk('div', 'lv-mtxt'); txt.appendChild(mk('b', null, m.label)); txt.appendChild(mk('small', null, fmtProg(m, v) + ' · +' + XP[m.tier] + ' XP')); txt.appendChild(pbar(v, m.goal));
        row.appendChild(txt);
        if (book.c[id]) row.appendChild(mk('span', 'lv-got', '받음'));
        else if (v >= m.goal) row.appendChild(btn('받기', 'lv-yes', function () { claim(book, id); renderMs(); }));
        B.appendChild(row);
      });
    }
    list('오늘의 미션 · 매일 바뀌고 모두 같아요', d, d.ids);
    list('이번 주', P.w, P.w.ids);
    B.appendChild(mk('div', 'lv-cat', '칭호 (이름표 위에 보여요)'));
    var tc = mk('div', 'lv-chips');
    var none = btn('없음', null, function () { P.ti = ''; save(); sendMe(); renderMs(); }); none.setAttribute('aria-pressed', !P.ti ? 'true' : 'false'); tc.appendChild(none);
    TITLES.forEach(function (t) {
      var have = P.titles.indexOf(t[0]) >= 0, b = btn(have ? t[1] : '🔒 ' + t[1], null, function () { if (!have) { G.toast('🔒 ' + t[3], '#fff'); return; } P.ti = t[0]; save(); sendMe(); renderMs(); });
      b.setAttribute('aria-pressed', P.ti === t[0] ? 'true' : 'false'); if (!have) { b.classList.add('lock'); b.title = t[3]; }
      tc.appendChild(b);
    });
    B.appendChild(tc);
    B.appendChild(mk('div', 'lv-cat', '꾸미기 아이템 (레벨이 오르면 열려요)'));
    var ic = mk('div', 'lv-chips');
    ITEMS.forEach(function (it) {
      var have = P.items.indexOf(it[0]) >= 0, on = (P.wear || []).indexOf(it[0]) >= 0;
      var b = btn(have ? (on ? '✓ ' : '') + it[1] : '🔒 Lv' + it[2] + ' ' + it[1], null, function () { if (!have) { G.toast('🔒 레벨 ' + it[2] + '에 열려요', '#fff'); return; } P.wear = (P.wear || []).filter(function (w) { return w !== it[0]; }); if (!on) P.wear.push(it[0]); save(); sendMe(); renderMs(); });
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (!have) b.classList.add('lock'); ic.appendChild(b);
    });
    B.appendChild(ic);
    B.appendChild(mk('div', 'lv-cat', '설정'));
    var S = L.settings.get();
    [['dg', '드롭 점프 게임', S.dg], ['strobe', '드롭 스트로브 조명 (깜빡임)', S.strobe], ['shake', '드롭 화면 흔들림', S.shake], ['tipsy', '취기 화면 효과', settings.tipsy]].forEach(function (o) {
      var lab = mk('label', 'lv-set'), cb = mk('input'); cb.type = 'checkbox'; cb.checked = !!o[2];
      cb.addEventListener('change', function () { if (o[0] === 'tipsy') { settings.tipsy = cb.checked; LS.set('gs_lv_tipsy', cb.checked ? '1' : '0'); } else L.settings.set(o[0], cb.checked); });
      lab.appendChild(cb); lab.appendChild(mk('span', null, o[1])); B.appendChild(lab);
    });
    var st = P.st;
    B.appendChild(mk('small', 'lv-fine', '클럽에서 ' + Math.floor((st.secs || 0) / 60) + '분 · 방문 ' + P.days.length + '일 · 연속 ' + P.streak + '일 · 드롭 점프 ' + (st.drop || 0) + '번 · 건배 ' + (st.cheers || 0) + '번 · 기록은 이 브라우저에만 저장돼요'));
  }
  var lastPress = 0; msP.el.addEventListener('pointerdown', function () { lastPress = pnow(); });
  msBtn.addEventListener('click', function () { toggle(msP, renderMs); });
  barBtn.addEventListener('click', function () { TREAT.target = null; toggle(barP, function () { renderBar(false); }); });

  /* ---------------- 이벤트 잡기 (채팅·꾸미기·게임) ---------------- */
  var chatForm = $('#chatform'), chatIn = $('#chatin');
  if (chatForm) chatForm.addEventListener('submit', function () { if (chatIn && G.cleanText(chatIn.value, 140)) L.ev('chat', 1); }, true);
  var editBtn = $('#edit'); if (editBtn) editBtn.addEventListener('click', function () { if (G.entered()) L.ev('look', 1); });
  var gameOn = '';
  function watchGames() {
    var b = doc.body.classList, rh = $('#racehud'), k = b.contains('dartmode') ? 'dart' : b.contains('dancemode') ? 'dance' : b.contains('djxmode') ? 'djx' : rh && !rh.hidden ? 'race' : '';
    if (k && k !== gameOn) L.ev('game', 1);
    gameOn = k;
  }

  /* ---------------- 매 초 · 매 프레임 ---------------- */
  var lastDecor = 0, entered = false;
  function second() {
    if (!G.entered()) return;
    if (!entered) {
      entered = true; sess.start = now();
      var dk = dayKey();
      if (P.last !== dk) {
        var y = dayKey(now() - 86400e3); P.streak = P.last === y ? (P.streak || 0) + 1 : 1; P.last = dk;
        if (P.days.indexOf(dk) < 0) P.days.push(dk); if (P.days.length > 120) P.days = P.days.slice(-120);
        today(); if (P.w.days.indexOf(dk) < 0) P.w.days.push(dk); save();
        progress('days', P.w.days.length);
        setTimeout(function () { G.toast('🎉 오늘 첫 입장 · +20 XP' + (P.streak > 1 ? ' · ' + P.streak + '일 연속!' : ''), '#ffd23a'); addXP(20); }, 2600);
      }
      checkUnlocks(true); sendMe(); renderMs();
    }
    sess.secs++; stat('secs', 1); progress('secs', 1);
    var MS = L.music(), radioPlaying = L.radio.on() && G.bgm().on && G.sound();
    if (radioPlaying) progress('listen', 1);
    if (L.peak().on) progress('peak', 1);
    var h = L.kst().getUTCHours(); if (h >= 4 && h < 6 && !P.owl) { P.owl = 1; checkUnlocks(); }
    if (nearBar()) once('bar');
    var rec = G.floors[G.active()]; if (rec.djSpec && Math.hypot(rec.djSpec.x - G.player.x, rec.djSpec.z - G.player.z) < 3.4) once('dj');
    watchGames();
    if (sess.secs % 15 === 0) save();
    vipSecond(); renderDrink();
    if (!msP.el.hidden && sess.secs % 5 === 0 && pnow() - lastPress > 2000) renderMs(); else msDot.hidden = !claimable();
  }
  var tipFilter = '';
  function tick(t, dt) {
    var tp = pnow();
    paradeTick(); guideTick();
    // 아바타 꾸미기: 나 + 다른 손님 (가벼운 일이라 매 프레임 확인, 바뀔 때만 다시 만듦)
    var mine = G.mine();
    if (mine) { var wear = (P.wear || []).filter(function (w) { return P.items.indexOf(w) >= 0; }).join(','); decorate(mine, P.lv, P.titles.indexOf(P.ti) >= 0 ? P.ti : '', wear, dkCode(ME.drink)); if (ME.drink) poseHold(mine, tp < ME.cheerUntil ? 2 : tp < ME.sipUntil ? 1 : 0); }
    Object.keys(G.peers).forEach(function (id) {
      var en = G.peers[id]; if (!en.av || !en.pr) return;
      var pr = en.pr, dk = dkParse(pr.dk) ? pr.dk : '';
      decorate(en.av, cleanLv(pr.lv), cleanTi(pr.ti), cleanUx(pr.ux), dk);
      if (dk && en.av.g.visible) poseHold(en.av, tp < (en.cheerUntil || 0) ? 2 : 0);
    });
    // 바텐더·가상 손님
    var F = G.active(), T = TENDERS[F];
    if (T) { var bz = tp < T.busyUntil; G.animAvatar(T.av, t, (t * 1.5) % 1, false, null); if (bz) { T.av.arms[0].rotation.set(-1.3 + Math.sin(t * 14) * .35, 0, -.2); T.av.fores[0].rotation.x = -1.2; T.av.arms[1].rotation.set(-1.3 - Math.sin(t * 14) * .35, 0, .2); T.av.fores[1].rotation.x = -1.2; } }
    G.floors[F].npcs.forEach(function (n, k) {
      if (!n.drink && k % 3 === 0) { var kinds = ['mix', 'beer', 'champ'], kd = kinds[k % 3 === 0 ? (k / 3) % 3 : 0]; n.drink = glassMesh(kd, kd === 'beer' ? '#e8a82a' : kd === 'champ' ? '#f4dc8a' : ['#ff9f4a', '#d0193f', '#dff4ff'][k % 3]); holdGlass(n.av, n.drink); }
      if (n.drink && n.state !== 'walk') poseHold(n.av, tp < (n.cheerUntil || 0) ? 2 : 0);
    });
    // 취기 화면
    var tv = settings.tipsy ? tipsyNow() : 0, cv = doc.querySelector('#stage canvas');
    if (cv) { var f = tv >= 1.5 ? 'blur(' + Math.min(1.6, (tv - 1.5) * .22).toFixed(2) + 'px) saturate(' + (1 + Math.min(.6, tv * .06)).toFixed(2) + ')' : ''; if (f !== tipFilter) { tipFilter = f; cv.style.filter = f; } }
    if (tv >= 2.5 && G.entered()) { var amp = Math.min(.06, (tv - 2.5) * .01); G.camera.rotation.z += Math.sin(t * .7) * amp; G.camera.position.x += Math.sin(t * .45) * amp * 1.5; }
  }

  // 다른 손님이 나가면 정리 (WeakMap이라 아바타와 함께 사라짐)
  L.use({
    ev: onEv,
    second: second,
    tick: tick,
    onRoom: function () { if (G.entered()) sendMe(); }
  });
  window.GSLiveSocial = { P: P, ME: ME, VIP: VIP, order: order, giveDrink: giveDrink, sip: sip, cheers: cheers, takeTable: takeTable, vipOrder: vipOrder, addXP: addXP, claim: claim, today: today, progress: progress, nearBar: nearBar, goBar: goBar, renderMs: renderMs, TIP: TIP, sess: sess, openTreat: openTreat };
})();
