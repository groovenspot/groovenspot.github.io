// 손님 vs 직원 대결 (2026-11-28): 코드 연결 → 369 · GROOVE 마블 · NEON MEMORY. 서버 lounge/src/duel.js
(() => {
  const L = Lounge;
  const W = {
    title: ['같이 대결', 'Play together'],
    sub: ['방을 만들고 4자리 코드를 알려주거나, 받은 코드를 넣어요. 손님끼리도, 직원과도 할 수 있어요.', 'Create a room and share the 4-digit code, or enter one. Play with friends or staff.'],
    join: ['코드로 들어가기', 'Join with code'], enter: ['들어가기', 'Join'], make: ['방 만들기', 'Create room'],
    upto: ['최대 {n}명', 'Up to {n}'], rec: ['내 전적', 'My record'], recLine: ['{p}전 {w}승', '{p} played · {w} won'],
    code: ['입장 코드', 'Room code'], codeHelp: ['같이 할 사람에게 이 코드를 보여 주세요', 'Show this code to the other players'],
    players: ['참가자 {n}/{max}', 'Players {n}/{max}'], host: ['방장', 'Host'], staff: ['직원', 'Staff'],
    pens: ['내 벌칙', 'My penalties'], penHint: ['1명당 2개까지 · 누가 걸릴지 몰라요. 벌칙은 이 판에서만 보이고 저장하지 않아요.', 'Up to 2 each. Penalties are only used in this room and are not saved.'],
    penPh: ['예: 엽기 셀카 찍기', 'e.g. Funny selfie'], add: ['넣기', 'Add'], penN: ['벌칙 {n}개', '{n} penalties'],
    start: ['시작', 'Start'], needStaff: ['직원이 1명 이상 들어와야 시작돼요', 'A staff member must join first'],
    needTwo: ['2명 이상 모이면 시작돼요', 'Needs at least 2 players'], waitHost: ['방장이 시작하면 바로 시작돼요', 'Waiting for the host to start'],
    leave: ['나가기', 'Leave'], again: ['다시 하기', 'Play again'], other: ['다른 게임', 'Switch game'],
    myTurn: ['내 차례', 'Your turn'], turnOf: ['{nick} 차례', '{nick}’s turn'], out: ['탈락 — 구경 중', 'Out — watching'],
    say: ['"{n}" 말하기', 'Say "{n}"'], clap: ['짝', 'Clap'],
    rule369: ['3·6·9가 들어가면 숫자 대신 그 개수만큼 박수 (33 → 짝짝)', 'Clap instead of saying numbers with 3, 6 or 9 (33 → clap clap)'],
    roll: ['주사위 굴리기', 'Roll the dice'], ruleMarble: ['먼저 한 바퀴 도는 사람이 승리 · 벌칙 칸은 참가자가 적은 벌칙', 'First to finish a lap wins'],
    watch: ['순서를 잘 보세요', 'Watch the pattern'], repeat: ['같은 순서로 누르세요', 'Repeat the pattern'], sent: ['제출 완료 · 다른 사람 기다리는 중', 'Sent — waiting for others'],
    round: ['{n}라운드', 'Round {n}'], ruleMem: ['라운드마다 1개씩 늘어요 · 틀리면 탈락, 마지막까지 남으면 승리', 'One more each round. Miss and you are out.'],
    win: ['{nick} 승리!', '{nick} wins!'], draw: ['승자 없음', 'No winner'], loser: ['벌칙: {nick}', 'Penalty: {nick}'],
    noAlcohol: ['앱은 술을 권하지 않아요 · 벌칙은 참가자가 직접 적은 것', 'The app never asks anyone to drink'],
    err: ['다시 시도해 주세요', 'Please try again'],
    e_duel_code: ['코드를 다시 확인해 주세요', 'Check the code'], e_duel_full: ['방이 꽉 찼어요', 'The room is full'],
    e_duel_started: ['이미 시작한 방이에요', 'Already started'], e_duel_gone: ['끝난 방이에요', 'This room has ended'],
    e_duel_staff: ['직원이 1명 이상 있어야 시작돼요', 'A staff member must be in the room'], e_duel_alone: ['2명 이상 있어야 해요', 'Needs at least 2 players'],
    e_pen_bad: ['욕설·연락처·링크는 넣을 수 없어요', 'No profanity, contacts or links'], e_pen_long: ['20자까지 적을 수 있어요', 'Max 20 characters'],
    e_pen_max: ['벌칙은 2개까지예요', 'Up to 2 penalties'], e_pen_empty: ['벌칙을 적어 주세요', 'Write a penalty']
  };
  L.i18n({ ko: Object.fromEntries(Object.entries(W).map(([k, v]) => ['duel.' + k, v[0]])), en: Object.fromEntries(Object.entries(W).map(([k, v]) => ['duel.' + k, v[1]])) });
  const t = (k, v) => L.esc(L.t('duel.' + k, v));
  const GAME = {
    '369': { name: '369', max: 6, col: '#ffd23d', ko: '번갈아 숫자 세기 · 3·6·9는 박수', en: 'Count in turns, clap on 3·6·9' },
    marble: { name: 'GROOVE 마블', max: 4, col: '#ff3d6e', ko: '주사위로 판 돌기 · 벌칙은 직접 적기', en: 'Dice board game with your own penalties' },
    memory: { name: 'NEON MEMORY', max: 8, col: '#3dffb0', ko: '네온 순서 기억 · 끝까지 남으면 승리', en: 'Remember the neon pattern' }
  };
  const SQ = { start: ['🏁', '출발', 'Start'], hype: ['🔥', 'HYPE 10번', 'HYPE ×10'], pen: ['💀', '벌칙', 'Penalty'], song: ['🎤', '신청곡', 'Song request'],
    badge: ['🎁', '배지', 'Badge'], duel: ['⚔️', '직원과 한 판', 'Staff duel'], rest: ['💧', '쉬어가기', 'Rest'], photo: ['📸', '같이 사진', 'Group photo'],
    dance: ['💃', '10초 춤', '10s dance'], jump: ['⏩', '2칸 앞으로', '+2'], goal: ['🏆', '골인', 'Goal'] };
  const sqName = k => (SQ[k] || ['', k, k])[L.lang === 'ko' ? 1 : 2];
  const COL = ['#3dffb0', '#ff7a1a', '#a35cff', '#ffd23d', '#3dc8ff', '#ff3d6e', '#ffffff', '#9cff3d'];
  const PADS = ['#ff7a1a', '#a35cff', '#3dffb0', '#ff3d6e'];
  const errText = e => L.t('duel.e_' + e) !== 'duel.e_' + e ? L.t('duel.e_' + e) : L.t('duel.err');

  function css() {
    if (document.getElementById('duel-css')) return;
    const l = document.createElement('link'); l.id = 'duel-css'; l.rel = 'stylesheet'; l.href = '/lounge/css/duel.css?v=1'; document.head.append(l);
  }

  async function home(root) {
    root.className = 'duel';
    root.innerHTML = '<h1>' + t('title') + '</h1><p class="muted">' + t('sub') + '</p>' +
      '<form class="duel-join" data-join><label for="duel-code">' + t('join') + '</label><div><input id="duel-code" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="0000">' +
      '<button class="btn btn-hot">' + t('enter') + '</button></div></form>' +
      '<div class="duel-games">' + Object.entries(GAME).map(([k, g]) => '<section class="duel-game" style="--c:' + g.col + '"><h2>' + L.esc(g.name) +
        ' <small>' + t('upto', { n: g.max }) + '</small></h2><p>' + L.esc(L.lang === 'ko' ? g.ko : g.en) + '</p><p class="duel-rec" data-rec="' + k + '"></p>' +
        '<button type="button" class="btn" data-new="' + k + '">' + t('make') + '</button></section>').join('') + '</div>' +
      '<p class="muted duel-note">' + t('noAlcohol') + '</p>';
    const input = root.querySelector('#duel-code');
    input.oninput = () => { input.value = input.value.replace(/\D/g, '').slice(0, 4); };
    root.querySelector('[data-join]').onsubmit = async e => {
      e.preventDefault();
      if (input.value.length !== 4) return L.toast(errText('duel_code'));
      const r = await L.api('duel_join', { code: input.value });
      if (r.ok) L.go('duel/' + r.id); else L.toast(errText(r.error));
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-new]');
      if (!b) return;
      b.disabled = true;
      const r = await L.api('duel_new', { game: b.dataset.new });
      b.disabled = false;
      if (r.ok) L.go('duel/' + r.id); else L.toast(errText(r.error));
    };
    const s = await L.api('duel_stats');
    if (s.ok && root.isConnected) for (const [k, v] of Object.entries(s.games)) {
      const el = root.querySelector('[data-rec="' + k + '"]');
      if (el) el.textContent = L.t('duel.rec') + ' · ' + L.t('duel.recLine', { p: v.p, w: v.w });
    }
  }

  function playerChips(d) {
    return '<ul class="duel-players">' + d.players.map(p => '<li class="' + (p.out ? 'is-out' : '') + (d.g.turn === p.seat && d.status === 'play' ? ' is-turn' : '') + '" style="--pc:' + COL[p.seat] + '">' +
      '<i></i><b>' + L.esc(p.nick) + '</b>' + (p.staff ? '<span class="duel-tag">' + t('staff') + '</span>' : '') + (p.host ? '<span class="duel-tag is-host">' + t('host') + '</span>' : '') +
      '<small>' + t('recLine', { p: p.rec.p, w: p.rec.w }) + (d.status === 'lobby' ? ' · ' + t('penN', { n: p.pens }) : '') + '</small></li>').join('') + '</ul>';
  }

  function logLine(d, code) {
    const nick = i => L.esc(d.players[+i]?.nick || '');
    const [k, a, b, c] = String(code).split(':');
    if (k === 'join') return nick(a) + ' 👋';
    if (k === '369_ok') return nick(a) + ': ' + (+c ? '👏'.repeat(+c) : L.esc(b));
    if (k === '369_miss') return nick(a) + ' ✗ ' + L.esc(b);
    if (k === '369_late') return nick(a) + ' ⏱';
    if (k === 'm') return nick(a) + ' 🎲' + L.esc(b) + ' → ' + L.esc(sqName(c));
    if (k === 'mem_out') return a.split(',').map(nick).join(', ') + ' ✗';
    if (k === 'leave') return nick(a) + ' ↩';
    return '';
  }

  function room(root, id) {
    root.className = 'duel duel-room';
    let d = null, v = 0, timer = 0, busy = false, claps = 0, clapTimer = 0, memInput = [], memRoundShown = 0, memSent = 0, penDraft = '', sig = '', memStart = 0;
    const api = async (a, b = {}) => {
      const r = await L.api(a, { id, ...b });
      if (!root.isConnected) return r;
      if (r.ok && !r.same) {
        const next = JSON.stringify({ ...r, g: { ...r.g, left: 0, since: 0 } });
        if (r.g?.game === 'memory' && r.status === 'play' && (!d || d.g.round !== r.g.round || d.status !== 'play')) memStart = Date.now() - r.g.since;
        if (r.status !== 'play') { memRoundShown = 0; memSent = 0; memInput = []; }
        d = r; v = r.v;
        if (next !== sig) { sig = next; paint(); }
      }
      else if (r.error) { if (r.error === 'duel_gone' || r.error === 'duel_not_in') { L.toast(errText(r.error)); L.go('duel'); } else if (r.error !== 'duel_turn' && r.error !== 'dup') L.toast(errText(r.error)); }
      return r;
    };
    const loop = async () => {
      clearTimeout(timer);
      if (!root.isConnected) return;
      if (!busy && document.visibilityState === 'visible') await api('duel_get', { v: d?.status === 'lobby' ? v : undefined });
      timer = setTimeout(loop, d?.status === 'play' ? (d.g.game === 'marble' ? 1200 : 600) : 1500);
    };
    const act = async (a, b) => { if (busy) return; busy = true; try { await api(a, b); } finally { busy = false; } };

    function bar(left, total) {
      return '<div class="duel-bar"><i style="width:' + Math.max(0, Math.min(100, left / total * 100)) + '%;transition:width ' + Math.max(0, left) + 'ms linear" data-bar></i></div>';
    }
    function runBar() { const b = root.querySelector('[data-bar]'); if (b) requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = '0%'; })); }

    function lobby() {
      const me = d.players[d.me], g = GAME[d.g.game];
      const enough = d.players.length >= 2;
      return '<header class="duel-head" style="--c:' + g.col + '"><a href="#/duel" class="duel-back">‹</a><h1>' + L.esc(g.name) + '</h1></header>' +
        '<section class="duel-code"><span>' + t('code') + '</span><strong>' + L.esc(d.code) + '</strong><small>' + t('codeHelp') + '</small></section>' +
        '<h2 class="duel-h2">' + t('players', { n: d.players.length, max: d.max }) + '</h2>' + playerChips(d) +
        '<h2 class="duel-h2">' + t('pens') + '</h2><p class="muted duel-small">' + t('penHint') + '</p>' +
        '<ul class="duel-pens">' + (me.my_pens || []).map((p, i) => '<li>' + L.esc(p) + '<button type="button" data-del="' + i + '" aria-label="삭제">×</button></li>').join('') + '</ul>' +
        ((me.my_pens || []).length < 2 ? '<form class="duel-penform" data-pen><input maxlength="20" placeholder="' + t('penPh') + '" value="' + L.esc(penDraft) + '"><button class="btn">' + t('add') + '</button></form>' : '') +
        (d.host ? '<div class="duel-switch">' + Object.entries(GAME).map(([k, x]) => '<button type="button" class="btn' + (k === d.g.game ? ' is-on' : '') + '" data-game="' + k + '"' + (d.players.length > x.max ? ' disabled' : '') + '>' + L.esc(x.name) + '</button>').join('') + '</div>' +
          '<button type="button" class="btn btn-hot duel-start" data-start' + (enough ? '' : ' disabled') + '>' + t('start') + '</button>' +
          (!enough ? '<p class="muted duel-small">' + t('needTwo') + '</p>' : '')
          : '<p class="muted duel-wait">' + t('waitHost') + '</p>') +
        '<button type="button" class="btn duel-leave" data-leave>' + t('leave') + '</button>';
    }

    function turnLine() {
      const me = d.players[d.me];
      if (me.out) return '<p class="duel-turn">' + t('out') + '</p>';
      return '<p class="duel-turn' + (d.g.turn === d.me ? ' is-me' : '') + '">' + (d.g.turn === d.me ? t('myTurn') : t('turnOf', { nick: d.players[d.g.turn]?.nick || '' })) + '</p>';
    }

    function g369() {
      const mine = d.g.turn === d.me && !d.players[d.me].out;
      const shown = Math.max(0, d.g.left - 1000);
      return '<p class="muted duel-small">' + t('rule369') + '</p>' + turnLine() +
        '<div class="duel-369" aria-live="polite">' + L.esc(String(d.g.n)) + '</div>' + (mine ? bar(shown, d.g.lim) : '') +
        '<div class="duel-369-btns"><button type="button" class="btn btn-hot" data-say' + (mine ? '' : ' disabled') + '>' + t('say', { n: d.g.n }) + '</button>' +
        '<button type="button" class="btn duel-clap" data-clap' + (mine ? '' : ' disabled') + '>👏 ' + t('clap') + (claps ? ' ×' + claps : '') + '</button></div>';
    }

    function gMarble() {
      const B = d.g.board, pos = d.g.pos;
      const cell = i => { const r = i < 5 ? 0 : i < 9 ? i - 4 : i < 13 ? 4 : 16 - i, c = i < 5 ? i : i < 9 ? 4 : i < 13 ? 12 - i : 0; return [r, c]; };
      const tokens = i => d.players.map((p, s) => (pos[s] % 16 === i && pos[s] < 16 && !p.out) ? '<i style="background:' + COL[s] + '"></i>' : '').join('');
      const last = d.g.last;
      const ev = last ? '<div class="duel-ev' + (last.sq === 'pen' ? ' is-pen' : '') + '"><b>' + L.esc(d.players[last.who]?.nick || '') + '</b> 🎲' + last.d + ' → ' +
        L.esc(sqName(last.sq)) + (last.pen ? '<strong>' + L.esc(last.pen) + '</strong>' : '') + '</div>' : '';
      const mine = d.g.turn === d.me && !d.players[d.me].out;
      return '<p class="muted duel-small">' + t('ruleMarble') + '</p>' + turnLine() +
        '<div class="duel-board">' + B.map((k, i) => { const [r, c] = cell(i); return '<div class="duel-sq' + (k === 'pen' ? ' is-pen' : '') + '" style="grid-row:' + (r + 1) + ';grid-column:' + (c + 1) + '"><span>' + SQ[k][0] + '</span><small>' + L.esc(sqName(k)) + '</small><div class="duel-tok">' + tokens(i) + '</div></div>'; }).join('') +
        '<div class="duel-mid"><div class="duel-dice">' + (d.g.dice ? '⚀⚁⚂⚃⚄⚅'[d.g.dice - 1] : '🎲') + '</div>' + ev + '</div></div>' +
        (mine ? bar(d.g.left, 30000) : '') + '<button type="button" class="btn btn-hot duel-roll" data-roll' + (mine ? '' : ' disabled') + '>' + t('roll') + '</button>';
    }

    function gMemory() {
      const me = d.players[d.me], sent = d.g.subs[d.me] || memSent === d.g.round;
      const watching = Date.now() < memStart + d.g.show;
      return '<p class="muted duel-small">' + t('ruleMem') + '</p><p class="duel-turn">' + t('round', { n: d.g.round }) + ' · ' +
        (me.out ? t('out') : sent ? t('sent') : watching ? t('watch') : t('repeat')) + '</p>' +
        '<div class="duel-dots">' + d.g.seq.map((_, i) => '<i class="' + (i < memInput.length ? 'is-on' : '') + '"></i>').join('') + '</div>' +
        '<div class="duel-pads">' + PADS.map((c, i) => '<button type="button" class="duel-pad" style="--pad:' + c + '" data-pad="' + i + '"' + (me.out || sent ? ' disabled' : '') + ' aria-label="' + (i + 1) + '"></button>').join('') + '</div>' +
        (!watching && !me.out && !sent ? bar(d.g.left, d.g.left + 1) : '');
    }

    function done() {
      const r = d.result, g = GAME[d.g.game];
      const w = r.winner >= 0 ? d.players[r.winner] : null, l = r.loser >= 0 ? d.players[r.loser] : null;
      return '<div class="duel-done" style="--c:' + g.col + '"><p>' + L.esc(g.name) + '</p><h2>' + (w ? t('win', { nick: w.nick }) : t('draw')) + '</h2>' +
        (l ? '<div class="duel-penalty"><span>' + t('loser', { nick: l.nick }) + '</span><strong>' + L.esc(r.pen) + '</strong></div>' : '') +
        playerChips(d) +
        (d.host ? '<button type="button" class="btn btn-hot" data-start>' + t('again') + '</button><div class="duel-switch">' +
          Object.entries(GAME).filter(([k]) => k !== d.g.game).map(([k, x]) => '<button type="button" class="btn" data-start-game="' + k + '"' + (d.players.length > x.max ? ' disabled' : '') + '>' + L.esc(x.name) + '</button>').join('') + '</div>'
          : '<p class="muted">' + t('waitHost') + '</p>') +
        '<button type="button" class="btn duel-leave" data-leave>' + t('leave') + '</button></div>';
    }

    function playMemory() {
      if (d.status !== 'play' || d.g.game !== 'memory' || memRoundShown === d.g.round) return;
      memRoundShown = d.g.round; memInput = [];
      const start = memStart;
      d.g.seq.forEach((p, k) => {
        const at = start + d.g.gap + k * d.g.flash - Date.now();
        if (at < -d.g.flash) return;
        setTimeout(() => { const el = root.querySelector('[data-pad="' + p + '"]'); if (el) { el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), d.g.flash - 150); } }, Math.max(0, at));
      });
      setTimeout(() => { if (root.isConnected && d?.g.round === memRoundShown) paint(); }, Math.max(0, start + d.g.show - Date.now()) + 30);
    }

    function paint() {
      if (!d) return;
      const focus = document.activeElement?.matches?.('[data-pen] input');
      if (focus) penDraft = document.activeElement.value;
      if (d.status === 'lobby') root.innerHTML = lobby();
      else {
        const g = GAME[d.g.game];
        const body = d.status === 'done' ? done() : d.g.game === '369' ? g369() : d.g.game === 'marble' ? gMarble() : gMemory();
        root.innerHTML = '<header class="duel-head" style="--c:' + g.col + '"><a href="#/duel" class="duel-back">‹</a><h1>' + L.esc(g.name) + '</h1></header>' +
          (d.status === 'play' ? playerChips(d) : '') + body +
          (d.status === 'play' ? '<ol class="duel-log">' + d.log.slice(-4).reverse().map(c => logLine(d, c)).filter(Boolean).map(x => '<li>' + x + '</li>').join('') + '</ol>' : '');
        runBar(); playMemory();
      }
      if (focus) { const i = root.querySelector('[data-pen] input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    }

    root.addEventListener('submit', async e => {
      const f = e.target.closest('[data-pen]'); if (!f) return;
      e.preventDefault();
      const text = f.querySelector('input').value.trim(); if (!text) return;
      penDraft = '';
      const r = await act('duel_pen', { text });
      void r;
    });
    root.addEventListener('input', e => { if (e.target.matches('[data-pen] input')) penDraft = e.target.value; });
    root.onclick = async e => {
      const el = e.target.closest('button'); if (!el || el.disabled) return;
      if (el.dataset.del !== undefined) return act('duel_pen', { del: +el.dataset.del });
      if (el.dataset.game) return act('duel_game', { game: el.dataset.game });
      if (el.hasAttribute('data-start')) return act('duel_start');
      if (el.dataset.startGame) return act('duel_start', { game: el.dataset.startGame });
      if (el.hasAttribute('data-leave')) { clearTimeout(timer); await L.api('duel_leave', { id }); return L.go('duel'); }
      if (el.hasAttribute('data-roll')) return act('duel_move');
      if (el.hasAttribute('data-say')) { clearTimeout(clapTimer); const c = claps; claps = 0; return act('duel_move', c ? { claps: c } : { say: true }); }
      if (el.hasAttribute('data-clap')) {
        claps++; el.innerHTML = '👏 ' + t('clap') + ' ×' + claps;
        clearTimeout(clapTimer);
        clapTimer = setTimeout(() => { const c = claps; claps = 0; act('duel_move', { claps: c }); }, 650);
        return;
      }
      if (el.dataset.pad !== undefined) {
        const p = +el.dataset.pad;
        el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 160);
        memInput.push(p);
        const dots = root.querySelectorAll('.duel-dots i'); if (dots[memInput.length - 1]) dots[memInput.length - 1].classList.add('is-on');
        if (memInput.length >= d.g.seq.length) { memSent = d.g.round; const seq = memInput.slice(); await act('duel_move', { round: d.g.round, seq }); paint(); }
      }
    };
    loop();
    return () => clearTimeout(timer);
  }

  let stop = null;
  L.screen('duel', {
    nav: 'play', title: 'duel.title', auth: true, tabs: true,
    render(root, params) {
      css();
      if (stop) { stop(); stop = null; }
      if (params.id) stop = room(root, params.id);
      else return home(root);
    },
    leave() { if (stop) { stop(); stop = null; } }
  });
})();
