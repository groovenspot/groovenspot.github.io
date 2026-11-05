/* Groove & Spot — runtime: 영업 상태, 이벤트·타임테이블·아티스트·영상·메뉴 렌더링, 예약 폼 */
(function () {
  'use strict';
  var GS = window.GS || { lang: 'ko', root: '', t: {} };
  var T = GS.t;
  var LANG = GS.lang;

  // 예전 매장 앱의 직원 동기화 링크(#s=…, ?syncbase=…)는 정리된 주소로 바꿔 둔다
  if (/^#s=/.test(location.hash) || /syncbase=/.test(location.search)) history.replaceState(null, '', location.pathname);

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

  /* ---------- 방문 통계 (Google Analytics, GA_ID 가 있을 때만) ---------- */
  // 이름·전화번호 같은 개인정보는 보내지 않는다
  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} }
  // 사이트 안의 다른 페이지로 넘어가는 클릭은 바로 보내면 페이지가 바뀌며 사라질 수 있어서,
  // 저장해 두었다가 다음 페이지가 열릴 때 보낸다
  try {
    var pend = JSON.parse(sessionStorage.getItem('gs_pending') || '[]');
    sessionStorage.removeItem('gs_pending');
    pend.forEach(function (x) { track(x[0], x[1]); });
  } catch (e) {}
  function trackNext(name, params) {
    try { var l = JSON.parse(sessionStorage.getItem('gs_pending') || '[]'); l.push([name, params]); sessionStorage.setItem('gs_pending', JSON.stringify(l.slice(-5))); }
    catch (e) { track(name, params); }
  }
  function where(el) {
    if (el.closest('.dock')) return 'bottom_bar';
    if (el.closest('.mnav')) return 'mobile_menu';
    if (el.closest('.hdr')) return 'header';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.evd')) return 'event_page';
    if (el.closest('.ftr')) return 'footer';
    return document.body.dataset.page || 'page';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a || e.defaultPrevented) return;
    var h = a.getAttribute('href') || '', at = where(a);
    if (/\/reserve\/(\?|$)/.test(h)) trackNext('reserve_click', { location: at });
    else if (/\/request\/(\?|$)/.test(h)) trackNext('request_click', { location: at });
    else if (h.indexOf('tel:') === 0) track('call_click', { location: at });
    else if (/google\.com\/maps|map\.naver|map\.kakao/.test(h)) track('directions_click', { map: /google/.test(h) ? 'google' : /naver/.test(h) ? 'naver' : 'kakao', location: at });
    else if (/instagram\.com/.test(h)) track('instagram_click', { location: at });
    else if (/youtube\.com|soundcloud/.test(h)) track('media_click', { site: /youtube/.test(h) ? 'youtube' : 'soundcloud', location: at });
  });

  /* ---------- 휴대폰 메뉴 (☰) ---------- */
  var mbtn = $('.menu-btn'), mnav = $('#mnav');
  function setMenu(open) {
    mnav.hidden = !open; mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    mbtn.setAttribute('aria-label', open ? mbtn.dataset.close : mbtn.dataset.open);
    document.body.classList.toggle('mnav-open', open);
  }
  if (mbtn && mnav) {
    mbtn.addEventListener('click', function () { setMenu(mnav.hidden); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); mbtn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900 && !mnav.hidden) setMenu(false); });
  }

  /* ---------- 언어 선택 기억 ---------- */
  $$('.lang-menu a').forEach(function (a) { a.addEventListener('click', function () { store('gs_lang', a.dataset.lang); track('language_change', { language: a.dataset.lang }); }); });
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
      cache[name] = fetch('/data/' + name + '.json?v=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' })
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
    if (e.flyer) return '<div class="ev-art' + (big ? ' full' : '') + '"><img src="' + esc(e.flyer) + '" alt="' + esc(e.title) + '" loading="' + (big ? 'eager' : 'lazy') + '"></div>';
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

  var savedKey = 'gs_saved_events';
  var saveLabels = {
    ko: ['행사 저장', '저장됨', '저장한 행사'],
    en: ['Save event', 'Saved', 'Saved event'],
    ja: ['イベントを保存', '保存済み', '保存したイベント'],
    zh: ['收藏活动', '已收藏', '收藏的活动']
  }[LANG] || ['Save event', 'Saved', 'Saved event'];
  function savedIds() {
    try {
      var ids = JSON.parse(store(savedKey));
      return Array.isArray(ids) ? ids : [];
    } catch (e) { return []; }
  }
  function refreshOnReturn(update) {
    window.addEventListener('pageshow', update);
    window.addEventListener('storage', function (event) {
      if (!event.key || event.key === savedKey) update();
    });
    update();
  }

  var evLists = $$('[data-events]');
  if (evLists.length) {
    load('events').then(function (raw) {
      var all = normEvents(raw);
      var savedLine = $('[data-saved-event]');
      if (savedLine) refreshOnReturn(function () {
        var ids = savedIds();
        var e = all.find(function (event) { return event.date >= BIZ && ids.indexOf(event.id) >= 0; });
        savedLine.hidden = !e;
        savedLine.textContent = '';
        if (!e) return;
        var link = document.createElement('a');
        link.href = url('event/?id=' + encodeURIComponent(e.id));
        link.textContent = saveLabels[2] + ' · ' + dateLabel(e.date) +
          (e.open ? ' ' + e.open : '') + ' · ' + e.title + ' →';
        savedLine.appendChild(link);
      });
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
  // 홈: 영업 중이면 층별 "지금 플레이 중", 아니면 "오늘 밤 라인업"(시작 시각 순). 타임테이블이 없으면 이벤트 라인업, 그것도 없으면 "곧 공개".
  function renderNow(tt, evs) {
    var date = IS_OPEN ? BIZ : ymd(NOW.date);
    var day = tt && tt[date];
    var ev = normEvents(evs).filter(function (e) { return e.date === date; })[0];
    var labels = {
      ko: ['지금', '다음', '첫 DJ', '힙합 · R&B', '일정 없음', '라인업'],
      en: ['Now', 'Next', 'First DJ', 'Hip-hop · R&B', 'No slot listed', 'Lineup'],
      ja: ['現在', '次', '最初のDJ', 'ヒップホップ · R&B', '予定なし', '出演DJ'],
      zh: ['当前', '下一位', '首位 DJ', '嘻哈 · R&B', '暂无安排', '阵容']
    }[LANG] || ['Now', 'Next', 'First DJ', 'Hip-hop · R&B', 'No slot listed', 'Lineup'];
    var live = false;
    var cards = ['2F', '3F'].map(function (f) {
      var list = slots(day, f), i = IS_OPEN ? currentIdx(list) : -1;
      var current = list[Math.max(i, 0)], next = list[Math.max(i, 0) + 1];
      var spot = f === '3F';
      live = live || i >= 0;
      var head = '<h3 class="fl">' + f + (spot ? ' SPOT' : ' GROOVE') + '</h3>' +
        '<p class="now-genre">' + esc(spot ? 'EDM' : labels[3]) + '</p>';
      function row(label, name, time) {
        return '<div><dt>' + esc(label) + (time ? ' <time>' + esc(time) + '</time>' : '') +
          '</dt><dd class="dj">' + esc(name) + '</dd></div>';
      }
      var names = ev && ev.lineup ? (ev.lineup[f] || ev.lineup.GUEST || []) : [];
      var first = current
        ? row(i >= 0 ? labels[0] : labels[2], current.n, current.t)
        : row(labels[5], names.join(' · ') || T.lineupSoon, '');
      return '<section class="now-card' + (spot ? ' s' : '') + (i >= 0 ? ' on' : '') + '">' + head +
        '<dl class="now-slots">' + first + row(labels[1], next ? next.n : labels[4], next && next.t) + '</dl></section>';
    }).join('');
    $('[data-now-grid]').innerHTML = cards;
    var h = $('#now-h-txt'); if (h) h.textContent = live ? T.nowPlaying : fmt(T.tonightLineup, { d: dateLabel(date) }) + (ev ? ' · ' + ev.title : '');
    nowBox.classList.toggle('is-live', live);
    nowBox.hidden = false;
  }
  if (nowBox) {
    Promise.all([load('timetable'), load('events')]).then(function (r) { renderNow(r[0], r[1]); });
    setInterval(function () {
      NOW = kstNow(); nowNight = NOW.h * 60 + NOW.mi + (NOW.h < 12 ? 1440 : 0);
      BIZ = ymd(NOW.h < 8 ? addDays(NOW.date, -1) : NOW.date); bizHours = hoursFor(dowOf(BIZ));
      IS_OPEN = nowNight >= nightMins(bizHours.open) && nowNight < nightMins(bizHours.close);
      Promise.all([load('timetable'), load('events')]).then(function (r) { renderNow(r[0], r[1]); }); }, 60000);
  }
  if (floorTT.length) {
    load('timetable').then(function (tt) {
      var day = tt && tt[BIZ];
      if (!day) return;
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
      }).join('') + Object.keys(e.lineup || {}).filter(function (k) { return e.floors.indexOf(k) < 0; }).map(function (k) {
        var inTT = JSON.stringify(day || {}).toUpperCase();
        var rest = (e.lineup[k] || []).filter(function (n) { return inTT.indexOf(String(n).toUpperCase()) < 0; });
        if (!rest.length) return '';
        return '<div><p class="tt-h">' + esc(k === 'GUEST' ? 'SPECIAL GUEST' : k) + '</p><ul>' + rest.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
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
        '<div class="evd-sec" data-evd-photos hidden><h2 class="sec-h">' + esc(T.photosOf) + '</h2><div data-evd-grid></div></div>' +
        '<div class="evd-act">' + (past ? '' : '<a class="btn btn-hot btn-lg" href="' + reserveHref + '">' + esc(T.reserveThis) + '</a>') +
        (past ? '' : '<button class="btn btn-lg" type="button" data-save-event aria-pressed="false">' + esc(saveLabels[0]) + '</button>') +
        '<button class="btn btn-lg" type="button" data-share>' + esc(T.share) + '</button></div>' +
        '<a class="back" href="' + url('events/') + '">← ' + esc(document.querySelector('.nav a').textContent) + '</a>' +
        '</div></article>';
      var saveButton = $('[data-save-event]', detail);
      if (saveButton) {
        function updateSaveButton() {
          var saved = savedIds().indexOf(e.id) >= 0;
          saveButton.setAttribute('aria-pressed', String(saved));
          saveButton.textContent = saveLabels[saved ? 1 : 0];
        }
        refreshOnReturn(updateSaveButton);
        saveButton.addEventListener('click', function () {
          var ids = savedIds();
          var nextIds = ids.indexOf(e.id) >= 0 ? ids.filter(function (id) { return id !== e.id; }) : ids.concat(e.id);
          store(savedKey, JSON.stringify(nextIds));
          updateSaveButton();
        });
      }
      $('[data-share]', detail).addEventListener('click', function () {
        if (navigator.share) { navigator.share({ title: e.title, url: location.href }).catch(function () {}); return; }
        copy(location.href).then(function () { toast(T.linkCopied); });
      });
      load('videos').then(function (vids) {
        var names = {};
        if (e.lineup) Object.keys(e.lineup).forEach(function (f) { (e.lineup[f] || []).forEach(function (n) { names[djKey(n)] = 1; }); });
        var mine = (Array.isArray(vids) ? vids : []).filter(function (v) { return v.dj && names[djKey(v.dj)]; }).slice(0, 6);
        if (!mine.length) return;
        var box = document.createElement('div'); box.className = 'evd-sec';
        box.innerHTML = '<h2 class="sec-h">' + esc(T.setsOf) + '</h2><div class="videos">' + mine.map(vidCard).join('') + '</div>';
        var ph = $('[data-evd-photos]', detail); ph.parentNode.insertBefore(box, ph);
      });
      load('gallery').then(function (raw) {
        var list = [];
        albumsOf(raw).filter(function (a) { return a.event === e.id || (!a.event && a.date === e.date); }).forEach(function (a) { list = list.concat(flat(a)); });
        if (!list.length) return;
        var g = $('[data-evd-grid]', detail); g.innerHTML = thumbs(list, 'ph-grid'); bindThumbs(g, list);
        $('[data-evd-photos]', detail).hidden = false;
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

  /* ---------- 사진첩 (data/gallery.json) ---------- */
  // 앨범: { id, date, title, event?, photos: [{ src, thumb, w, h }] }
  function albumsOf(raw) {
    return (Array.isArray(raw) ? raw : []).filter(function (a) { return a && a.date && a.photos && a.photos.length; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  var lb = $('#lb'), lbList = [], lbIdx = 0, lbLast = null;
  function lbShow(i) {
    lbIdx = (i + lbList.length) % lbList.length;
    var p = lbList[lbIdx];
    $('#lb-img').src = p.src; $('#lb-img').alt = p.alt || '';
    $('#lb-cap').textContent = (p.cap ? p.cap + ' · ' : '') + (lbIdx + 1) + ' / ' + lbList.length;
    var nx = lbList[(lbIdx + 1) % lbList.length]; if (nx) { var pre = new Image(); pre.src = nx.src; }
  }
  function lbOpen(list, i, from) { track('photo_view', { page: document.body.dataset.page }); lbList = list; lbLast = from; lb.hidden = false; document.body.style.overflow = 'hidden'; lbShow(i); $('[data-lb="close"]', lb).focus(); }
  function lbClose() { lb.hidden = true; document.body.style.overflow = ''; $('#lb-img').src = ''; if (lbLast) lbLast.focus(); }
  if (lb) {
    lb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) { var a = b.dataset.lb; if (a === 'close') lbClose(); else lbShow(lbIdx + (a === 'next' ? 1 : -1)); return; }
      if (e.target === lb) lbClose();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbClose(); else if (e.key === 'ArrowRight') lbShow(lbIdx + 1); else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    });
    var tx = null;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (tx == null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1)); tx = null; });
  }
  function thumbs(list, cls) {
    return '<div class="' + cls + '">' + list.map(function (p, i) {
      return '<button type="button" class="ph" data-i="' + i + '"><img src="' + esc(p.thumb || p.src) + '" alt="' + esc(p.alt || '') + '" loading="lazy" decoding="async"' + (p.w ? ' width="' + p.w + '" height="' + p.h + '"' : '') + '></button>';
    }).join('') + '</div>';
  }
  function bindThumbs(el, list) {
    el.addEventListener('click', function (e) { var b = e.target.closest('.ph'); if (b && el.contains(b)) lbOpen(list, +b.dataset.i, b); });
  }
  function flat(album) {
    var cap = dateLabel(album.date) + ' · ' + album.title;
    var alt = album.title + ' · ' + dateLabel(album.date) + ' · Busan nightclub Groove & Spot, Seomyeon';
    return album.photos.map(function (p) { return { src: p.src, thumb: p.thumb, w: p.w, h: p.h, cap: cap, alt: alt }; });
  }

  var albumsEl = $('[data-albums]');
  if (albumsEl) {
    load('gallery').then(function (raw) {
      var albums = albumsOf(raw);
      if (!albums.length) { albumsEl.innerHTML = emptyBox(T.noPhotos); return; }
      albumsEl.innerHTML = albums.map(function (a, k) {
        return '<section class="album" id="' + esc(a.id || '') + '"><div class="album-h"><h2 class="sec-h">' + esc(a.title) + '</h2><span class="muted">' + esc(dateLabel(a.date)) + ' · ' + esc(fmt(T.photoCount, { n: a.photos.length })) + '</span>' +
          (a.event ? ' <a class="more" href="' + url('event/?id=' + encodeURIComponent(a.event)) + '">→</a>' : '') +
          (a.ig && a.ig.length ? ' <a class="more" href="' + esc(a.ig[0]) + '" rel="noopener">Instagram ↗</a>' : '') + '</div><div data-k="' + k + '"></div></section>';
      }).join('');
      albums.forEach(function (a, k) {
        var holder = $('[data-k="' + k + '"]', albumsEl), list = flat(a);
        holder.innerHTML = thumbs(list, 'ph-grid'); bindThumbs(holder, list);
      });
      if (location.hash) { var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }
    });
  }
  var strip = $('[data-photos="latest"]');
  if (strip) {
    load('gallery').then(function (raw) {
      var list = [];
      albumsOf(raw).forEach(function (a) { list = list.concat(flat(a)); });
      list = list.slice(0, +strip.dataset.limit || 8);
      if (!list.length) return;
      strip.innerHTML = thumbs(list, 'ph-row'); bindThumbs(strip, list);
      $('[data-photos-sec]').hidden = false;
    });
  }

  /* ---------- 라이브셋 영상 (data/videos.json, 유튜브 GROOVE SESSIONS) ---------- */
  function vidCard(v) {
    var vid = esc(v.youtube);
    var head = v.dj ? esc(v.dj) + (v.session ? ' · GROOVE SESSIONS ' + String(v.session).padStart(3, '0') : '') : esc(pick(v.title));
    var sub = v.dj ? esc(pick(v.title)) : '';
    return '<a class="vid" href="https://www.youtube.com/watch?v=' + vid + '" rel="noopener"><div class="vid-thumb" style="background-image:url(\'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg\')">' +
      (v.duration ? '<span class="vid-dur">' + esc(v.duration) + '</span>' : '') + '</div><p><b>' + head + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</p></a>';
  }
  function djKey(n) { return String(n || '').toUpperCase().replace(/^DJ\s+/, '').replace(/[^A-Z0-9가-힣]/g, ''); }
  var vidEl = $('[data-videos]');
  if (vidEl) {
    load('videos').then(function (list) {
      list = (Array.isArray(list) ? list : []).filter(function (v) { return v && v.youtube; });
      var lim = +vidEl.dataset.limit; if (lim) list = list.slice(0, lim);
      vidEl.innerHTML = list.map(vidCard).join('');
    });
  }

  /* ---------- 인스타그램 게시물 (공식 임베드) ---------- */
  var igEl = $('[data-ig]');
  if (igEl) {
    load('instagram').then(function (list) {
      list = (Array.isArray(list) ? list : []).map(function (u) { return typeof u === 'string' ? u : u && u.url; })
        .filter(function (u) { return /^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+/.test(u || ''); }).slice(0, 6);
      if (!list.length) return;
      igEl.innerHTML = list.map(function (u) {
        var clean = u.split('?')[0].replace(/\/?$/, '/');
        return '<blockquote class="instagram-media" data-instgrm-permalink="' + esc(clean) + '" data-instgrm-version="14"><a href="' + esc(clean) + '" rel="noopener">Instagram</a></blockquote>';
      }).join('');
      $('[data-ig-sec]').hidden = false;
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.instagram.com/embed.js'; document.body.appendChild(s);
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
        var sets = !d.sets ? '' : '<div class="sets">' + d.sets.map(function (s) {
          return '<div class="set"><h3>' + esc(s.name) + '</h3>' + (s.desc ? '<p>' + esc(s.desc) + '</p>' : '') +
            (s.tiers ? '<div class="tiers">' + s.tiers.map(function (x) { return '<div><span>' + esc(x.q) + '</span><b>' + won(x.price) + '</b></div>'; }).join('') + '</div>' : '<div class="pr">' + won(s.price) + '</div>') + '</div>';
        }).join('') + '</div>';
        var menu = '<div class="menu">' + d.menu.map(function (c) {
          return '<div class="mcat"><h3>' + esc(c.name) + '</h3>' + (c.note ? '<p class="mnote">' + esc(pick(c.note)) + '</p>' : '') + c.items.map(function (i) {
            var main = LANG === 'ko' ? i.ko : i.en, sub = LANG === 'ko' ? i.en : i.ko;
            return '<div class="mrow"><span>' + esc(main) + '<small>' + esc(sub) + '</small></span><b>' + won(i.price) + '</b></div>';
          }).join('') + '</div>';
        }).join('') + '</div>';
        menuEl.innerHTML = sets + menu;
        var bn = $('[data-bar-note]'); if (bn && m.bar) bn.textContent = pick(m.bar.note);
        $$('[data-svc]').forEach(function (p) { p.hidden = p.dataset.svc !== f; });
        $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === f ? 'true' : 'false'); });
      }
      $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { render(b.dataset.tab); track('menu_tab', { tab: b.dataset.tab }); }); });
      var qs0 = new URLSearchParams(location.search), q = qs0.get('floor');
      render(qs0.get('tab') === 'bar' && $('[data-tab="bar"]') ? 'bar' : q === '3F' ? '3F' : '2F');
    });
  }

  /* ---------- 신청곡 (ntfy 토픽으로 전송 → 관리자 페이지·DJ 폰에서 확인) ---------- */
  var rq = $('#rq-form');
  if (rq) {
    var qf0 = new URLSearchParams(location.search).get('floor');
    if (qf0 === '3F') rq.querySelector('input[name=floor][value="3F"]').checked = true;
    var lastNick = store('gs_nick'); if (lastNick) rq.nick.value = lastNick;

    // 로컬 곡을 먼저 표시하고 외부 검색 결과를 보완한다.
    var box = $('#rq-results'), hint = $('#rq-hint'), song = rq.song, sCache = {}, sTimer = null, sSeq = 0, sItems = [], sActive = -1;
    // 응답이 늦으면 포기 (검색 중… 이 계속 남지 않게)
    function timed(p, ms) { return new Promise(function (ok, no) { var tm = setTimeout(function () { no(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(tm); ok(v); }, function (e) { clearTimeout(tm); no(e); }); }); }
    function jsonp(url, ms) { // CORS가 막혀도 되는 방식 (Deezer)
      return new Promise(function (ok, no) {
        var cb = 'gsCb' + Date.now() + Math.floor(Math.random() * 1e4), s = document.createElement('script'), done = false;
        var end = function () { done = true; try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); };
        window[cb] = function (d) { if (done) return; end(); ok(d); };
        s.onerror = function () { if (!done) { end(); no(new Error('jsonp')); } };
        setTimeout(function () { if (!done) { end(); no(new Error('timeout')); } }, ms);
        s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'output=jsonp&callback=' + cb; document.head.appendChild(s);
      });
    }
    function itunes(term, country) {
      var k = country + '|' + term;
      if (sCache[k]) return Promise.resolve(sCache[k]);
      var u = 'https://itunes.apple.com/search?media=music&entity=song&limit=8&term=' + encodeURIComponent(term) + (country ? '&country=' + country : '');
      return timed(fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }), 2200)
        .then(function (d) { var res = (d.results || []).map(function (x) { return { t: x.trackName, a: x.artistName, img: x.artworkUrl60 }; }); sCache[k] = res; return res; });
    }
    function deezer(term) {
      var k = 'dz|' + term;
      if (sCache[k]) return Promise.resolve(sCache[k]);
      return jsonp('https://api.deezer.com/search?limit=8&q=' + encodeURIComponent(term), 2200)
        .then(function (d) { var res = ((d && d.data) || []).map(function (x) { return { t: x.title, a: x.artist && x.artist.name, img: x.album && x.album.cover_small }; }); sCache[k] = res; return res; });
    }
    // 두 번 실패한 검색 서비스는 이번 방문 동안 건너뜀
    function bad(k) { try { return +sessionStorage.getItem('gs_sbad_' + k) >= 2; } catch (e) { return false; } }
    function fail(k) { try { sessionStorage.setItem('gs_sbad_' + k, String((+sessionStorage.getItem('gs_sbad_' + k) || 0) + 1)); } catch (e) {} }
    function anySearch(term) {
      var tries = [['kr', function () { return itunes(term, 'KR'); }], ['us', function () { return itunes(term, ''); }], ['dz', function () { return deezer(term); }]].filter(function (x) { return !bad(x[0]); });
      if (!tries.length) return Promise.resolve(null);
      return new Promise(function (resolve) {
        var remaining = tries.length, responded = false;
        function finish() { if (--remaining === 0) resolve(responded ? [] : null); }
        tries.forEach(function (source) {
          source[1]().then(function (results) {
            responded = true;
            if (results.length) resolve(results);
            finish();
          }, function () { fail(source[0]); finish(); });
        });
      });
    }
    // 저장된 인기곡 목록 (검색이 막혀도 바로 찾기 · 한글 가수명 · 초성 검색)
    var SONGS = null, songsP = null;
    function loadSongs() { if (!songsP) songsP = fetch('/data/songs.json?v=' + new Date().toISOString().slice(0, 10)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { SONGS = (d && d.songs) || []; return SONGS; }).catch(function () { SONGS = []; return SONGS; }); return songsP; }
    var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    function norm(s) { return String(s || '').toLowerCase().replace(/[\s.,'’!?\-_()\[\]&·~]/g, ''); }
    function cho(s) { var o = ''; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i) - 0xac00; o += c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : s[i]; } return o; }
    function localSearch(term) {
      if (!SONGS) return [];
      var q = norm(term), isCho = /^[ㄱ-ㅎ]+$/.test(q), out = [];
      if (!q) return out;
      for (var i = 0; i < SONGS.length && out.length < 40; i++) {
        var s = SONGS[i], t = norm(s[0]), a = norm(s[1]), k = norm(s[3] || ''), sc = 0;
        if (isCho) { if (cho(k).indexOf(q) === 0) sc = 3; else if (cho(t).indexOf(q) >= 0 || cho(k).indexOf(q) >= 0) sc = 2; }
        else { if (t.indexOf(q) === 0) sc = 5; else if (k === q || a === q) sc = 4; else if (t.indexOf(q) >= 0) sc = 3; else if (k.indexOf(q) >= 0 || a.indexOf(q) >= 0) sc = 2; else if ((t + a + k).indexOf(q) >= 0) sc = 1; }
        if (sc) out.push({ t: s[0], a: s[1], sc: sc, i: i });
      }
      return out.sort(function (x, y) { return y.sc - x.sc || x.i - y.i; }).slice(0, 8);
    }
    function closeList() { box.hidden = true; song.setAttribute('aria-expanded', 'false'); song.removeAttribute('aria-activedescendant'); sActive = -1; }
    function cancelSearch() { clearTimeout(sTimer); sSeq++; }
    function pickSong(i) {
      var it = sItems[i]; if (!it) return;
      cancelSearch();
      song.value = it.t.slice(0, 80); rq.artist.value = it.a.slice(0, 60); closeList(); hint.textContent = ''; rq.dataset.picked = '1';
      song.setAttribute('aria-invalid', 'false');
    }
    function setActive(i) {
      sActive = i;
      $$('li', box).forEach(function (li, k) { li.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (i >= 0) { song.setAttribute('aria-activedescendant', 'rq-opt-' + i); var li = $('#rq-opt-' + i); if (li) li.scrollIntoView({ block: 'nearest' }); }
    }
    function search() {
      cancelSearch();
      var term = song.value.trim(), my = sSeq;
      closeList();
      if (term.length < 2) { hint.textContent = ''; return; }

      var initials = /^[ㄱ-ㅎ\s]+$/.test(term), remoteResults = null;
      function render() {
        var local = localSearch(term);
        if (remoteResults && remoteResults.length) {
          show(local.filter(function (x) { return x.sc >= 5; }).concat(remoteResults, local), '');
        } else if (local.length) {
          show(local, remoteResults === null ? '' : (remoteResults === false ? T.rqLocal : ''));
        } else if (remoteResults === false) {
          closeList(); hint.textContent = T.rqSearchOff;
        } else if (remoteResults !== null || (initials && SONGS)) {
          show([], '');
        } else {
          hint.textContent = T.rqSearching;
        }
      }
      render();
      if (!SONGS) loadSongs().then(function () { if (my === sSeq) render(); });
      if (initials) return;
      sTimer = setTimeout(function () {
        anySearch(term).then(function (results) {
          if (my !== sSeq) return;
          remoteResults = results === null ? false : results;
          if (results === null) track('song_search_fail', { term_len: term.length });
          render();
        });
      }, 250);
    }
    function show(res, note) {
      var seen = {};
      sItems = res.filter(function (x) { if (!x.t) return false; x.a = x.a || ''; var k = (x.t + '|' + x.a).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 8);
      if (!sItems.length) { closeList(); hint.textContent = T.rqNoResult; return; }
      hint.textContent = note || '';
      box.innerHTML = sItems.map(function (x, i) {
        return '<li role="option" id="rq-opt-' + i + '" data-i="' + i + '" aria-selected="false">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" width="44" height="44" loading="lazy">' : '<span class="rq-noimg"></span>') +
          '<span class="rq-t"><b>' + esc(x.t) + '</b><small>' + esc(x.a) + '</small></span></li>';
      }).join('');
      box.hidden = false; song.setAttribute('aria-expanded', 'true'); sActive = -1;
    }
    // 오늘 신청된 곡 (ntfy 기록에서 곡·가수 줄만) — 검색이 막혀도 눌러서 바로 신청
    (function recent() {
      var wrap = $('#rq-recent'), chips = $('#rq-chips'); if (!wrap || !chips || !GS.topic) return;
      timed(fetch('https://ntfy.sh/' + encodeURIComponent(GS.topic) + '/json?poll=1&since=12h'), 6000).then(function (r) { return r.ok ? r.text() : ''; }).then(function (txt) {
        var seen = {}, list = [];
        String(txt).split('\n').reverse().forEach(function (ln) {
          var m; try { m = JSON.parse(ln); } catch (e) { return; }
          if (!m || m.event !== 'message' || !m.message || !/신청곡/.test(m.title || '')) return;
          var first = String(m.message).split('\n')[0].trim().slice(0, 140), k = first.toLowerCase();
          if (!first || seen[k] || list.length >= 6) return; seen[k] = 1; list.push(first);
        });
        if (!list.length) return;
        chips.innerHTML = list.map(function (x, i) { return '<button type="button" data-ri="' + i + '">' + esc(x) + '</button>'; }).join('');
        wrap.hidden = false;
        chips.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-ri]'); if (!b) return;
          var parts = list[+b.dataset.ri].split(' — ');
          cancelSearch();
          song.value = parts[0].slice(0, 80); rq.artist.value = (parts.slice(1).join(' — ') || '').slice(0, 60);
          rq.dataset.picked = '1'; closeList(); hint.textContent = ''; song.setAttribute('aria-invalid', 'false');
          track('song_recent_pick', {});
        });
      }).catch(function () {});
    })();
    loadSongs();
    var composing = false;
    song.addEventListener('compositionstart', function () { composing = true; cancelSearch(); closeList(); });
    song.addEventListener('compositionend', function () { composing = false; search(); });
    song.addEventListener('input', function () { if (!composing) search(); });
    song.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(sItems.length - 1, sActive + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, sActive - 1)); }
      else if (e.key === 'Enter' && sActive >= 0) { e.preventDefault(); pickSong(sActive); }
      else if (e.key === 'Escape') { cancelSearch(); closeList(); }
    });
    box.addEventListener('mousedown', function (e) { e.preventDefault(); });
    box.addEventListener('click', function (e) { var li = e.target.closest('li[data-i]'); if (li) pickSong(+li.dataset.i); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.rq-search')) { cancelSearch(); closeList(); } });
    rq.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var song = rq.song.value.trim();
      if (!song) { rq.song.setAttribute('aria-invalid', 'true'); toast(T.rqNeed); rq.song.focus(); return; }
      rq.song.setAttribute('aria-invalid', 'false');
      var wait = 60 - Math.floor((Date.now() - (+store('gs_rq_last') || 0)) / 1000);
      if (wait > 0) { toast(fmt(T.rqWait, { s: wait })); return; }
      var floor = rq.querySelector('input[name=floor]:checked').value;
      var clip = function (s, n) { return String(s).replace(/\s+/g, ' ').trim().slice(0, n); };
      var msg = clip(song, 80) + (rq.artist.value.trim() ? ' — ' + clip(rq.artist.value, 60) : '');
      if (rq.nick.value.trim()) { msg += '\n👤 ' + clip(rq.nick.value, 20); store('gs_nick', clip(rq.nick.value, 20)); }
      if (rq.memo.value.trim()) msg += '\n💬 ' + clip(rq.memo.value, 60);
      var btn = rq.querySelector('button[type=submit]'); btn.disabled = true;
      fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify({ topic: GS.topic, title: floor + ' 신청곡', message: msg, tags: [floor, 'notes'] }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); })
        .then(function () { track('song_request', { floor: floor, from_search: rq.dataset.picked === '1' ? 'yes' : 'no' }); rq.dataset.picked = ''; store('gs_rq_last', String(Date.now())); toast(T.rqSent); rq.song.value = ''; rq.artist.value = ''; rq.memo.value = ''; })
        .catch(function () { toast(T.rqFail); })
        .then(function () { btn.disabled = false; });
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
      track('reserve_submit', { type: form.type.value, floor: floor ? floor.value : '', party: form.party.value });
      toast(T.copied);
      window.open(GS.instagram, '_blank', 'noopener');
    });
  }
})();
