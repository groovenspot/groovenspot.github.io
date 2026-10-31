/* Groove & Spot — runtime: 영업 상태, 이벤트·타임테이블·아티스트·영상·메뉴 렌더링, 예약 폼 */
(function () {
  'use strict';
  var GS = window.GS || { lang: 'ko', root: '', t: {} };
  var T = GS.t;
  var LANG = GS.lang;

  // 예전 사이트의 직원 동기화 링크(#s=…, ?syncbase=…)는 /floor/ 로 넘긴다
  if (document.body.dataset.page === 'home' && (/^#s=/.test(location.hash) || /syncbase=/.test(location.search))) {
    location.replace('/floor/' + location.search + location.hash);
    return;
  }

  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }
  // 데이터의 다국어 필드: "문자열" 또는 {"ko": "...", "en": "..."}
  function pick(v) { if (v == null) return ''; if (typeof v === 'string') return v; return v[LANG] || v.en || v.ko || ''; }
  function url(p) { return GS.root + '/' + p; }

  function toast(msg) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- 19+ 확인 ---------- */
  var gate = $('#gate');
  if (gate && store('gs_age_ok') !== '1') {
    gate.hidden = false;
    $('#gate-yes').addEventListener('click', function () { store('gs_age_ok', '1'); gate.hidden = true; });
    $('#gate-yes').focus();
  }

  /* ---------- 언어 선택 기억 ---------- */
  $$('.lang-menu a').forEach(function (a) { a.addEventListener('click', function () { store('gs_lang', a.dataset.lang); }); });
  $$('.lang').forEach(function (d) {
    document.addEventListener('click', function (e) { if (!d.contains(e.target)) d.open = false; });
  });

  /* ---------- 시간 (항상 한국 시간 기준) ---------- */
  function kstNow() { var d = new Date(Date.now() + 9 * 3600e3); return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay(), date: d }; }
  function ymd(date) { return date.toISOString().slice(0, 10); }
  function addDays(date, n) { return new Date(date.getTime() + n * 864e5); }
  function dowOf(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); }
  function isWeekendNight(dow) { return dow === 5 || dow === 6; }
  function hoursFor(dow) { return isWeekendNight(dow) ? { open: '21:00', close: '07:00' } : { open: '21:30', close: '06:00' }; }
  function mins(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  // 영업일 기준 분: 정오 이전 시각은 다음날 새벽으로 본다
  function nightMins(hhmm) { var m = mins(hhmm); return m < 12 * 60 ? m + 1440 : m; }

  var NOW = kstNow();
  var nowNight = NOW.h * 60 + NOW.mi + (NOW.h < 12 ? 1440 : 0);
  // 오전 8시 전이면 아직 전날 밤 영업일
  var BIZ = ymd(NOW.h < 8 ? addDays(NOW.date, -1) : NOW.date);
  var bizHours = hoursFor(dowOf(BIZ));
  var IS_OPEN = nowNight >= nightMins(bizHours.open) && nowNight < nightMins(bizHours.close);

  var status = $('[data-status]');
  if (status) {
    if (IS_OPEN) { status.textContent = fmt(T.openNow, { t: bizHours.close }); status.classList.add('on'); }
    else { status.textContent = fmt(T.opensAt, { t: hoursFor(NOW.dow).open }); }
  }

  var DOW = (T.dow || '').split(',');
  function dateLabel(iso) {
    var p = iso.split('-');
    return (+p[1]) + '.' + (+p[2]) + ' ' + (DOW[dowOf(iso)] || '');
  }

  /* ---------- 데이터 ---------- */
  var cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch('/data/' + name + '.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return null; });
    }
    return cache[name];
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, ''); }
  function normEvents(list) {
    return (Array.isArray(list) ? list : []).filter(function (e) { return e && e.date && e.title; }).map(function (e) {
      var o = Object.assign({}, e);
      o.id = e.id || e.date + '-' + slug(e.title);
      o.floors = String(e.floor || '2F+3F').split('+').map(function (s) { return s.trim(); });
      return o;
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  function floorChips(e) {
    return e.floors.map(function (f) { return '<span class="chip ' + (f === '2F' ? 'g' : 's') + '">' + esc(f) + (f === '2F' ? ' HIPHOP' : ' EDM') + '</span>'; }).join('');
  }

  function art(e, big) {
    var only = e.floors.length === 1 ? ' only-' + e.floors[0] : '';
    if (e.flyer) return '<div class="ev-art"><img src="' + esc(e.flyer) + '" alt="' + esc(e.title) + '" loading="' + (big ? 'eager' : 'lazy') + '"></div>';
    var p = e.date.split('-');
    return '<div class="ev-art gen' + only + '" aria-hidden="true"><div class="gd"><small>' + esc(DOW[dowOf(e.date)] || '') + '</small>' + (+p[1]) + '.' + p[2] + '</div><div class="gt">' + esc(e.title) + '</div></div>';
  }

  function lineupText(e) {
    var names = [];
    if (e.lineup) Object.keys(e.lineup).forEach(function (f) { names = names.concat(e.lineup[f] || []); });
    return names.join(' · ');
  }

  function card(e, past) {
    var tonight = e.date === BIZ ? '<span class="chip hot">' + esc(T.tonight) + '</span>' : '';
    var sub = lineupText(e) || pick(e.genre);
    return '<a class="ev" href="' + url('event/?id=' + encodeURIComponent(e.id)) + '">' + art(e) +
      '<div class="ev-meta"><span class="ev-date">' + esc(dateLabel(e.date)) + (e.open ? ' · ' + esc(T.open) + ' ' + esc(e.open) : '') + (past ? ' · ' + esc(T.past) : '') + '</span>' +
      '<span class="ev-title">' + esc(e.title) + '</span>' + (sub ? '<span class="ev-sub">' + esc(sub) + '</span>' : '') +
      '<span class="chips">' + tonight + floorChips(e) + '</span></div></a>';
  }

  function emptyBox(msg) {
    return '<p class="empty">' + esc(msg) + ' <a href="' + esc(GS.instagram) + '" rel="noopener">@groovenspot →</a></p>';
  }

  var evLists = $$('[data-events]');
  if (evLists.length) {
    load('events').then(function (raw) {
      var all = normEvents(raw);
      evLists.forEach(function (el) {
        var past = el.dataset.events === 'past';
        var list = all.filter(function (e) { return past ? e.date < BIZ : e.date >= BIZ; });
        if (past) list.reverse();
        var lim = +el.dataset.limit; if (lim) list = list.slice(0, lim);
        if (!list.length) {
          if (past) { el.closest('section').hidden = true; return; }
          el.innerHTML = emptyBox(T.noEvents); return;
        }
        el.innerHTML = list.map(function (e) { return card(e, past); }).join('');
      });
    });
  }

  /* ---------- 타임테이블 ---------- */
  function slots(day, floor) {
    var list = (day && day[floor]) || [];
    return list.map(function (s) { return { t: s.t, n: s.n, m: nightMins(s.t) }; }).sort(function (a, b) { return a.m - b.m; });
  }
  function currentIdx(list) {
    var idx = -1;
    list.forEach(function (s, i) { if (s.m <= nowNight) idx = i; });
    return idx;
  }
  function ttList(list, live) {
    var cur = live ? currentIdx(list) : -1;
    return '<ul class="tt">' + list.map(function (s, i) { return '<li' + (i === cur ? ' class="cur"' : '') + '><span class="tm">' + esc(s.t) + '</span><span class="nm">' + esc(s.n) + '</span></li>'; }).join('') + '</ul>';
  }

  var nowBox = $('[data-now]');
  var floorTT = $$('[data-floor-tt]');
  if (nowBox || floorTT.length) {
    load('timetable').then(function (tt) {
      var day = tt && tt[BIZ];
      if (!day) return;
      if (nowBox && IS_OPEN) {
        var html = ['2F', '3F'].map(function (f) {
          var list = slots(day, f), i = currentIdx(list);
          if (i < 0) return '';
          var nx = list[i + 1];
          return '<div class="now-card' + (f === '3F' ? ' s' : '') + '"><div class="fl">' + f + (f === '2F' ? ' · GROOVE' : ' · SPOT') + '</div><div class="dj">' + esc(list[i].n) + '</div><div class="nx">' + esc(fmt(T.since, { t: list[i].t })) + (nx ? ' · ' + esc(fmt(T.next, { n: nx.n, t: nx.t })) : '') + '</div></div>';
        }).join('');
        if (html) { $('[data-now-grid]').innerHTML = html; nowBox.hidden = false; }
      }
      floorTT.forEach(function (el) {
        var list = slots(day, el.dataset.floorTt);
        if (list.length) el.innerHTML = '<p class="tt-h">' + esc(T.today) + ' · ' + esc(dateLabel(BIZ)) + '</p>' + ttList(list, IS_OPEN);
      });
    });
  }

  /* ---------- 이벤트 상세 ---------- */
  var detail = $('[data-event-detail]');
  if (detail) {
    var id = new URLSearchParams(location.search).get('id');
    Promise.all([load('events'), load('timetable')]).then(function (r) {
      var e = normEvents(r[0]).filter(function (x) { return x.id === id; })[0];
      if (!e) { detail.innerHTML = '<div class="phead"><h1>404</h1><p class="lede">' + esc(T.notFound) + '</p><a class="back" href="' + url('events/') + '">← ' + esc(document.querySelector('.nav a').textContent) + '</a></div>'; return; }
      document.title = e.title + ' · ' + dateLabel(e.date) + ' · Groove & Spot';
      var day = r[1] && r[1][e.date];
      var lineup = e.floors.map(function (f) {
        var tt = slots(day, f);
        var names = (e.lineup && e.lineup[f]) || [];
        if (!tt.length && !names.length) return '';
        return '<div><p class="tt-h">' + f + (f === '2F' ? ' · GROOVE' : ' · SPOT') + '</p>' + (tt.length ? ttList(tt, e.date === BIZ && IS_OPEN) : '<ul>' + names.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>') + '</div>';
      }).join('');
      var past = e.date < BIZ;
      var reserveHref = url('reserve/?date=' + e.date + (e.floors.length === 1 ? '&floor=' + e.floors[0] : ''));
      detail.innerHTML = '<article class="evd">' + art(e, true) + '<div>' +
        '<div class="chips">' + floorChips(e) + (past ? '<span class="chip">' + esc(T.past) + '</span>' : '') + '</div>' +
        '<h1>' + esc(e.title) + '</h1>' +
        '<p class="evd-when">' + esc(dateLabel(e.date)) + (e.open ? ' · ' + esc(T.open) + ' ' + esc(e.open) : '') + '</p>' +
        (e.genre ? '<p class="muted">' + esc(pick(e.genre)) + '</p>' : '') +
        (e.desc ? '<p class="lede">' + esc(pick(e.desc)) + '</p>' : '') +
        (e.entry ? '<p>' + esc(pick(e.entry)) + '</p>' : '') +
        (lineup ? '<div class="evd-sec"><div class="lineup">' + lineup + '</div></div>' : '') +
        '<div class="evd-act">' + (past ? '' : '<a class="btn btn-hot btn-lg" href="' + reserveHref + '">' + esc(T.reserveThis) + '</a>') +
        '<button class="btn btn-lg" type="button" data-share>' + esc(T.share) + '</button></div>' +
        '<a class="back" href="' + url('events/') + '">← ' + esc(document.querySelector('.nav a').textContent) + '</a>' +
        '</div></article>';
      $('[data-share]', detail).addEventListener('click', function () {
        if (navigator.share) { navigator.share({ title: e.title, url: location.href }).catch(function () {}); return; }
        copy(location.href).then(function () { toast(T.linkCopied); });
      });
      // 검색엔진용 구조화 데이터
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'MusicEvent', name: e.title,
        startDate: e.date + 'T' + (e.open || hoursFor(dowOf(e.date)).open) + ':00+09:00',
        eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'NightClub', name: 'Groove & Spot', address: { '@type': 'PostalAddress', streetAddress: '중앙대로680번가길 52', addressLocality: '부산진구', addressRegion: '부산', addressCountry: 'KR' } },
        image: e.flyer ? [new URL(e.flyer, location.href).href] : undefined,
        performer: lineupText(e) ? lineupText(e).split(' · ').map(function (n) { return { '@type': 'PerformingGroup', name: n }; }) : undefined
      });
      document.head.appendChild(ld);
    });
  }

  /* ---------- 아티스트 ---------- */
  var artistsEl = $('[data-artists]');
  if (artistsEl) {
    load('artists').then(function (list) {
      list = Array.isArray(list) ? list : [];
      if (!list.length) { artistsEl.innerHTML = emptyBox(T.noArtists); return; }
      artistsEl.innerHTML = list.map(function (a) {
        var links = [];
        if (a.instagram) links.push('<a href="' + esc(a.instagram) + '" rel="noopener">Instagram</a>');
        if (a.soundcloud) links.push('<a href="' + esc(a.soundcloud) + '" rel="noopener">SoundCloud</a>');
        if (a.youtube) links.push('<a href="' + esc(a.youtube) + '" rel="noopener">YouTube</a>');
        var ph = a.photo ? '<div class="artist-ph" style="background-image:url(\'' + esc(a.photo) + '\')" role="img" aria-label="' + esc(a.name) + '"></div>' : '<div class="artist-ph" aria-hidden="true">' + esc(String(a.name).charAt(0)) + '</div>';
        return '<article class="artist">' + ph + '<div class="artist-b"><h3>' + esc(a.name) + '</h3>' +
          (a.role ? '<p>' + esc(pick(a.role)) + '</p>' : '') + (a.bio ? '<p>' + esc(pick(a.bio)) + '</p>' : '') +
          (links.length ? '<div class="links">' + links.join('') + '</div>' : '') + '</div></article>';
      }).join('');
    });
  }

  /* ---------- 라이브셋 영상 ---------- */
  var vidEl = $('[data-videos]');
  if (vidEl) {
    load('videos').then(function (list) {
      list = (Array.isArray(list) ? list : []).filter(function (v) { return v && v.youtube; });
      var lim = +vidEl.dataset.limit; if (lim) list = list.slice(0, lim);
      vidEl.innerHTML = list.map(function (v) {
        var vid = esc(v.youtube);
        return '<a class="vid" href="https://www.youtube.com/watch?v=' + vid + '" rel="noopener"><div class="vid-thumb" style="background-image:url(\'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg\')"></div><p>' + esc(pick(v.title)) + '</p></a>';
      }).join('');
    });
  }

  /* ---------- 메뉴 & 바틀 세트 ---------- */
  var menuEl = $('[data-menu]');
  function won(n) { return '₩' + Number(n).toLocaleString('en-US'); }
  if (menuEl) {
    load('menu').then(function (m) {
      if (!m) return;
      function render(f) {
        var d = m[f]; if (!d) return;
        var sets = '<div class="sets">' + d.sets.map(function (s) {
          return '<div class="set"><h3>' + esc(s.name) + '</h3>' + (s.desc ? '<p>' + esc(s.desc) + '</p>' : '') +
            (s.tiers ? '<div class="tiers">' + s.tiers.map(function (x) { return '<div><span>' + esc(x.q) + '</span><b>' + won(x.price) + '</b></div>'; }).join('') + '</div>' : '<div class="pr">' + won(s.price) + '</div>') + '</div>';
        }).join('') + '</div>';
        var menu = '<div class="menu">' + d.menu.map(function (c) {
          return '<div class="mcat"><h3>' + esc(c.name) + '</h3>' + c.items.map(function (i) {
            var main = LANG === 'ko' ? i.ko : i.en, sub = LANG === 'ko' ? i.en : i.ko;
            return '<div class="mrow"><span>' + esc(main) + '<small>' + esc(sub) + '</small></span><b>' + won(i.price) + '</b></div>';
          }).join('') + '</div>';
        }).join('') + '</div>';
        menuEl.innerHTML = sets + menu;
        $$('[data-svc]').forEach(function (p) { p.hidden = p.dataset.svc !== f; });
        $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === f ? 'true' : 'false'); });
      }
      $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { render(b.dataset.tab); }); });
      var q = new URLSearchParams(location.search).get('floor');
      render(q === '3F' ? '3F' : '2F');
    });
  }

  /* ---------- 예약 폼 ---------- */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
    }
  }

  var form = $('#rv-form');
  if (form) {
    var qs = new URLSearchParams(location.search);
    form.date.min = BIZ;
    form.date.value = qs.get('date') && qs.get('date') >= BIZ ? qs.get('date') : BIZ;
    var qf = qs.get('floor');
    if (qf === '2F' || qf === '3F') { var r = form.querySelector('input[name=floor][value="' + qf + '"]'); if (r) r.checked = true; }
    var draft = store('gs_rv'); // 이름·연락처만 이 기기에 기억
    if (draft) { try { draft = JSON.parse(draft); form.name.value = draft.name || ''; form.phone.value = draft.phone || ''; } catch (e) {} }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true;
      ['name', 'phone'].forEach(function (k) {
        var bad = !form[k].value.trim();
        form[k].setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) ok = false;
      });
      if (!ok) { toast(T.need); (form.name.value.trim() ? form.phone : form.name).focus(); return; }
      store('gs_rv', JSON.stringify({ name: form.name.value.trim(), phone: form.phone.value.trim() }));
      function lab(name) { var el = form[name]; var l = el.closest('label'); return l ? l.firstChild.textContent.trim() : name; }
      var floor = form.querySelector('input[name=floor]:checked');
      var type = form.type.options[form.type.selectedIndex].text;
      var lines = [
        T['bk.title'],
        lab('name') + ': ' + form.name.value.trim(),
        lab('phone') + ': ' + form.phone.value.trim(),
        lab('date') + ': ' + form.date.value + ' (' + (DOW[dowOf(form.date.value)] || '') + ')',
        lab('party') + ': ' + form.party.value,
        $('.seg legend', form).textContent + ': ' + (floor ? floor.nextElementSibling.textContent : ''),
        lab('type') + ': ' + type
      ];
      if (form.req.value.trim()) lines.push(lab('req') + ': ' + form.req.value.trim());
      var text = lines.join('\n');
      // 팝업 차단을 피하려고 복사 완료를 기다리지 않고 바로 연다
      copy(text);
      toast(T.copied);
      window.open(GS.instagram, '_blank', 'noopener');
    });
  }
})();
