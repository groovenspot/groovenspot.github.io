// 정적 페이지 생성기 (의존성 없음). 실행: node src/build.mjs
// 언어별(ko는 루트, en/ja/zh는 하위 폴더) HTML을 만든다.
// 이벤트·타임테이블·아티스트·영상·메뉴는 data/*.json 에서 브라우저가 직접 읽으므로,
// 일정만 바꿀 때는 빌드할 필요 없이 data 파일만 고치면 된다.

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, LANG_LABEL, HTML_LANG, T, t } from './i18n.mjs';
import { GUIDE, GUIDE_LINKS } from './guide.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://xn--2i0bl1s25d.site'; // 그루브.site
const INSTAGRAM = 'https://www.instagram.com/groovenspot/';
const SOUNDCLOUD = 'https://on.soundcloud.com/IWtEmqOHfTecbn1cBI';
const YOUTUBE = 'https://www.youtube.com/@GROOVEBUSAN';
const XHS = 'https://www.xiaohongshu.com/user/profile/679dc482000000000e01e057';
// 신청곡 전달용 ntfy 토픽 (assets/admin.js 의 TOPIC 과 같아야 함)
const REQ_TOPIC = 'groovenspot-req-6witbq5hriea';
// Google Analytics 4 측정 ID (G-XXXXXXXXXX). 비워 두면 통계 코드를 넣지 않는다. 관리자 페이지에는 넣지 않음.
const GA_ID = 'G-G4Y93LP9PP';
const GA_TAG = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}if(!/^(localhost|127\\.)/.test(location.hostname)){gtag('js',new Date());gtag('config','${GA_ID}');}</script>` : '';
const LOGO_WORD = '<img src="/assets/logo-word.png" width="564" height="79" alt="Groove &amp; Spot">';
const fig = (src, alt, cls = '') => `<figure class="shot ${cls}"><a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${esc(alt)}" width="1080" height="1920" loading="lazy" decoding="async"></a><figcaption>${esc(alt)}</figcaption></figure>`;
const PHONE = '0507-1301-5970';
const ADDR_KO = '부산 부산진구 중앙대로680번가길 52';
const GMAP = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDR_KO)}`;
// 길찾기 버튼: 구글 지도 경로 안내 (현재 위치 → 매장)
const GMAP_DIR = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDR_KO)}`;
const GMAP_EMBED = (lang) => `https://maps.google.com/maps?q=${encodeURIComponent(ADDR_KO)}&hl=${lang === 'zh' ? 'zh-CN' : lang}&z=17&output=embed`;
const VERSION = Date.now().toString(36);

const FAQ_N = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
const PAGES = ['', 'events/', 'event/', 'floors/', 'menu/', 'gallery/', 'artists/', 'reserve/', 'info/', 'request/', 'guide/'];
const prefix = (lang) => (lang === 'ko' ? '' : `/${lang}`);
const href = (lang, page) => `${prefix(lang)}/${page}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(lang, page, { title, desc, body, active }) {
  const L = (k) => t(lang, k);
  const runtime = Object.fromEntries(Object.keys(T.ko).filter((k) => k.startsWith('rt.')).map((k) => [k.slice(3), L(k)]));
  const nav = [
    ['events/', 'nav.events'], ['floors/', 'nav.floors'], ['menu/', 'nav.menu'], ['gallery/', 'nav.gallery'], ['request/', 'nav.request'], ['info/', 'nav.info'],
  ];
  const fullTitle = title ? `${title} · Groove & Spot` : L('site.title');
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${SITE}${href(l, page)}">`).join('\n');
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<script>if(location.protocol==='http:'&&!/^(localhost|127\\.|\\[)/.test(location.hostname))location.replace('https:'+location.href.slice(5))</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0909">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || L('site.desc'))}">
<link rel="canonical" href="${SITE}${href(lang, page)}">
<meta name="keywords" content="${esc(L('site.kw'))}">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'NightClub',name:'Groove & Spot',alternateName:['그루브앤스팟','GROOVE N SPOT','Groove Club Busan','그루브 클럽','グルーブアンドスポット'],description:L('site.desc'),url:SITE+'/',image:SITE+'/assets/og.png',logo:SITE+'/assets/icon-512.png',telephone:'+82-507-1301-5970',address:{'@type':'PostalAddress',streetAddress:'52 Jungang-daero 680beonga-gil, 2F-3F',addressLocality:'Busanjin-gu, Busan',addressCountry:'KR'},openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Sunday','Monday','Tuesday','Wednesday','Thursday'],opens:'21:30',closes:'06:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:['Friday','Saturday'],opens:'21:00',closes:'07:00'}],isAccessibleForFree:true,publicAccess:true,keywords:L('site.kw'),hasMap:'https://www.google.com/maps/place/groove+club+busan/data=!4m2!3m1!1s0x3568eb656144707d:0x40a16e9eec334ab7',sameAs:['https://www.instagram.com/groovenspot','https://www.youtube.com/@groovebusan','https://www.threads.com/@groovenspot','https://www.facebook.com/profile.php?id=61594858447057',XHS]}).replace(/</g,'\\u003c')}</script>
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE}/${page}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Groove & Spot">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc || L('site.desc'))}">
<meta property="og:url" content="${SITE}${href(lang, page)}">
<meta property="og:image" content="${SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icon.png">
<link rel="apple-touch-icon" href="/assets/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500..900&family=Black+Han+Sans&family=Dela+Gothic+One&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/site.css?v=${VERSION}">
${GA_TAG}
</head>
<body data-page="${page.replace(/\/$/, '') || 'home'}">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <a class="brand logo" href="${href(lang, '')}"><img class="logo-icon" src="/assets/logo-icon.png" width="181" height="150" alt="">${LOGO_WORD}</a>
  <nav class="nav" aria-label="Main">
    ${nav.map(([p, k]) => `<a href="${href(lang, p)}"${active === p ? ' aria-current="page"' : ''}>${L(k)}</a>`).join('\n    ')}
  </nav>
  <details class="lang">
    <summary aria-label="Language: ${LANG_LABEL[lang]}"><span class="lang-globe" aria-hidden="true">🌐</span> Language</summary>
    <div class="lang-menu">
      ${LANGS.map((l) => `<a href="${href(l, page)}" hreflang="${HTML_LANG[l]}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_LABEL[l]}</a>`).join('\n      ')}
    </div>
  </details>
  <a class="btn btn-hot hdr-cta" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="${L('nav.open')}" data-open="${L('nav.open')}" data-close="${L('nav.close')}"><span></span><span></span><span></span></button>
</header>
<nav class="mnav" id="mnav" aria-label="Mobile" hidden>
  <a href="${href(lang, '')}"${!active ? ' aria-current="page"' : ''}>${L('nav.home')}</a>
  ${nav.map(([p, k]) => `<a href="${href(lang, p)}"${active === p ? ' aria-current="page"' : ''}>${L(k)}</a>`).join('\n  ')}
  <a href="${href(lang, 'artists/')}"${active === 'artists/' ? ' aria-current="page"' : ''}>${L('nav.artists')}</a>
  <a href="${href(lang, 'guide/')}"${active === 'guide/' ? ' aria-current="page"' : ''}>${GUIDE[lang].t}</a>
  <a class="btn btn-hot mnav-cta" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
</nav>
<main id="main">
${body}
</main>
<footer class="ftr">
  <div class="ftr-grid">
    <div>
      <a class="brand logo logo-lg" href="${href(lang, '')}"><img class="logo-icon" src="/assets/logo-icon.png" width="181" height="150" alt="">${LOGO_WORD}</a>
      <p class="muted">${L('if.addr')}<br>${L('if.near')}</p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.hours')}</h2>
      <p>${L('hr.weekday')} 21:30 – 06:00<br>${L('hr.weekend')} 21:00 – 07:00<br><span class="muted">${L('hr.always')}</span></p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.contact')}</h2>
      <p><a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br><a href="${INSTAGRAM}" rel="noopener">Instagram @groovenspot</a><br><a href="${SOUNDCLOUD}" rel="noopener">SoundCloud</a><br><a href="${YOUTUBE}" rel="noopener">YouTube @GROOVEBUSAN</a><br><a href="${XHS}" rel="noopener">小红书 Xiaohongshu</a></p>
    </div>
  </div>
  <p class="ftr-small muted"><a href="${href(lang, 'guide/')}">${GUIDE[lang].t}</a> · <a href="${href(lang, 'artists/')}">${L('nav.artists')}</a> · <a href="/admin/" rel="nofollow">Staff</a> · ${L('ft.age')} · © 2026 Groove &amp; Spot</p>
</footer>
<nav class="dock" aria-label="Quick actions">
  <a href="${href(lang, 'events/')}">${L('cta.tonight')}</a>
  <a class="dock-hot" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
  <a href="${GMAP_DIR}" rel="noopener">${L('cta.map')}</a>
  <a class="dock-sub" href="${href(lang, 'request/')}"${active === 'request/' ? ' aria-current="page"' : ''}>🎵 ${L('nav.request')}</a>
  <a class="dock-sub" href="${href(lang, 'menu/')}"${active === 'menu/' ? ' aria-current="page"' : ''}>🍾 ${L('nav.menu')}</a>
  <a class="dock-sub" href="${href(lang, 'info/')}"${active === 'info/' ? ' aria-current="page"' : ''}>📍 ${L('nav.info')}</a>
</nav>
<div class="gate" id="gate" hidden>
  <div class="gate-box" role="dialog" aria-modal="true" aria-labelledby="gate-q">
    <p class="gate-badge">19+</p>
    <h2 id="gate-q">${L('gate.q')}</h2>
    <p class="muted">${L('gate.d')}</p>
    <div class="gate-act"><a class="btn" href="https://www.google.com/">${L('gate.no')}</a><button class="btn btn-hot" type="button" id="gate-yes">${L('gate.yes')}</button></div>
  </div>
</div>
<div class="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="Photo viewer">
  <button class="lb-x" type="button" data-lb="close" aria-label="${L('rt.close')}">✕</button>
  <button class="lb-nav lb-prev" type="button" data-lb="prev" aria-label="${L('rt.prev')}">‹</button>
  <figure class="lb-fig"><img id="lb-img" alt=""><figcaption id="lb-cap"></figcaption></figure>
  <button class="lb-nav lb-next" type="button" data-lb="next" aria-label="${L('rt.next')}">›</button>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.GS=${JSON.stringify({ lang, root: prefix(lang), phone: PHONE, instagram: INSTAGRAM, topic: REQ_TOPIC, t: runtime })};</script>
<script src="/assets/site.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

const floorCard = (lang, f) => {
  const L = (k) => t(lang, k);
  return `<article class="floor floor-${f === '2F' ? 'g' : 's'}">
      <img class="floor-bg" src="/assets/img/floor-${f.toLowerCase()}.webp" width="1079" height="606" alt="" loading="lazy" decoding="async">
      <p class="floor-no">${f}</p>
      <h3 class="floor-name">${L(`floor.${f}.name`)}</h3>
      <p class="floor-genre">${L(`floor.${f}.genre`)}</p>
      <p>${L(`floor.${f}.desc`)}</p>
    </article>`;
};

const pageHead = (lang, key) => `<section class="phead wrap">
  <h1>${t(lang, `page.${key}.t`)}</h1>
  <p class="lede">${t(lang, `page.${key}.s`)}</p>
</section>`;

const bars = (n) => Array.from({ length: n }, () => '<i></i>').join('');

const menuTabs = (lang, withBar) => `<div class="tabs menu-tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="2F" class="tab-g">2F · HIPHOP</button><button role="tab" aria-selected="false" data-tab="3F" class="tab-s">3F · EDM</button>${withBar ? `<button role="tab" aria-selected="false" data-tab="bar" class="tab-b">${t(lang, 'tab.bar')}</button>` : ''}</div>`;

const BODIES = {
  '': (lang) => {
    const L = (k) => t(lang, k);
    return `<section class="hero">
  <picture class="hero-bg" aria-hidden="true">
    <source media="(max-width: 699px)" srcset="/assets/img/hero-tall.webp" width="369" height="656">
    <img src="/assets/img/hero-wide.webp" width="1079" height="656" alt="" fetchpriority="high">
  </picture>
  <div class="hero-in wrap">
    <p class="kicker">${L('hero.kicker')}</p>
    <h1 class="hero-logo"><img src="/assets/logo.png" width="564" height="229" alt="Groove &amp; Spot"></h1>
    <p class="hero-tag">${L('hero.tag')}</p>
    <p class="status" data-status></p>
    <div class="hero-act">
      <a class="btn btn-hot btn-lg" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
      <a class="btn btn-lg" href="${href(lang, 'events/')}">${L('cta.events')}</a>
    </div>
  </div>
</section>
<section class="now wrap" data-now hidden aria-labelledby="now-h">
  <h2 class="sec-h" id="now-h"><span class="live-dot" aria-hidden="true"></span>${L('sec.now')}</h2>
  <div class="now-grid" data-now-grid></div>
  <p class="now-act"><a class="btn" href="${href(lang, 'request/')}">🎵 ${L('cta.request')}</a></p>
</section>
<section class="wrap sec" aria-labelledby="up-h">
  <div class="sec-top"><h2 class="sec-h" id="up-h">${L('sec.upcoming')}</h2><a class="more" href="${href(lang, 'events/')}">${L('more.events')} →</a></div>
  <div class="cards" data-events="upcoming" data-limit="6"></div>
</section>
<section class="wrap sec" aria-labelledby="fl-h">
  <div class="sec-top"><h2 class="sec-h" id="fl-h">${L('sec.floors')}</h2><a class="more" href="${href(lang, 'floors/')}">${L('more.floors')} →</a></div>
  <div class="floors">
    ${floorCard(lang, '2F')}
    ${floorCard(lang, '3F')}
  </div>
</section>
<section class="wrap sec" aria-labelledby="ph-h" data-photos-sec hidden>
  <div class="sec-top"><h2 class="sec-h" id="ph-h">${L('sec.photos')}</h2><a class="more" href="${href(lang, 'gallery/')}">${L('more.gallery')} →</a></div>
  <div class="ph-strip" data-photos="latest" data-limit="8"></div>
</section>
<section class="wrap sec" aria-labelledby="sets-h">
  <h2 class="sec-h" id="sets-h">${L('sec.sets')}</h2>
  <div class="videos" data-videos data-limit="6"></div>
  <a class="sc yt" href="${YOUTUBE}" rel="noopener"><span class="yt-play" aria-hidden="true"></span><span>${L('more.yt')} →</span></a>
  <a class="sc" href="${SOUNDCLOUD}" rel="noopener"><span class="sc-wave" aria-hidden="true">${bars(28)}</span><span>${L('more.sc')} →</span></a>
</section>
<section class="wrap sec" aria-labelledby="ig-h" data-ig-sec hidden>
  <div class="sec-top"><h2 class="sec-h" id="ig-h">Instagram</h2><a class="more" href="${INSTAGRAM}" rel="noopener">@groovenspot →</a></div>
  <div class="ig" data-ig></div>
</section>
<section class="wrap sec visit" aria-labelledby="vi-h">
  <h2 class="sec-h" id="vi-h">${L('sec.visit')}</h2>
  <div class="visit-grid">
    <p class="visit-addr">${L('if.addr')}<br><span class="muted">${L('if.near')}</span></p>
    <div class="visit-act">
      <a class="btn" href="https://map.kakao.com/link/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.kakao')}</a>
      <a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a><a class="btn" href="${GMAP}" rel="noopener">${L('map.google')}</a>
      <a class="btn" href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a>
    </div>
  </div>
  <div class="gmap"><iframe src="${GMAP_EMBED(lang)}" title="${L('map.embed')} · Groove &amp; Spot" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
</section>`;
  },

  'events/': (lang) => `${pageHead(lang, 'events')}
<section class="wrap sec"><h2 class="sec-h">${t(lang, 'sec.upcoming')}</h2><div class="cards" data-events="upcoming"></div></section>
<section class="wrap sec"><h2 class="sec-h">${t(lang, 'sec.archive')}</h2><div class="cards cards-past" data-events="past"></div></section>`,

  'event/': () => `<div class="wrap" data-event-detail></div>`,

  'floors/': (lang) => {
    const L = (k) => t(lang, k);
    const am = (keys) => `<ul class="tags">${keys.map((k) => `<li>${L(`am.${k}`)}</li>`).join('')}</ul>`;
    const block = (f, keys) => `<section class="fbig fbig-${f === '2F' ? 'g' : 's'}" id="${f.toLowerCase()}">
  <div class="wrap fbig-in">
    <div class="fbig-head"><img class="fbig-img" src="/assets/img/floor-${f.toLowerCase()}.webp" width="1079" height="606" alt="" loading="lazy" decoding="async"><p class="floor-no">${f}</p><h2 class="fbig-name">${L(`floor.${f}.name`)}</h2><p class="floor-genre">${L(`floor.${f}.genre`)}</p></div>
    <div class="fbig-body"><p class="lede">${L(`floor.${f}.long`)}</p>${am(keys)}
      <div class="tt-today" data-floor-tt="${f}"></div>
      <p><a class="btn" href="${href(lang, 'request/')}?floor=${f}">🎵 ${L('cta.request')}</a></p>
    </div>
  </div>
</section>`;
    return `${pageHead(lang, 'floors')}
${block('2F', ['dj', 'bar', 'h', 'stage', 'table', 'dart'])}
${block('3F', ['dj', 'bar', 'stage', 'table', 'photo', 'smk'])}
<section class="wrap sec" aria-labelledby="lay-h"><h2 class="sec-h" id="lay-h">${L('sec.layout')}</h2><div class="shots">${fig('/assets/img/table-layout.webp', L('img.layout'))}</div></section>`;
  },

  'request/': (lang) => {
    const L = (k) => t(lang, k);
    return `${pageHead(lang, 'request')}
<section class="wrap sec rv">
  <form class="rv-form" id="rq-form" novalidate>
    <div class="full rq-search">
      <label for="rq-song">${L('rq.song')}</label>
      <input id="rq-song" name="song" maxlength="80" autocomplete="off" required placeholder="${esc(L('rq.searchPh'))}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rq-results">
      <ul class="rq-results" id="rq-results" role="listbox" hidden></ul>
      <p class="rq-hint muted small" id="rq-hint" aria-live="polite"></p>
    </div>
    <label>${L('rq.artist')}<input name="artist" maxlength="60" autocomplete="off"></label>
    <fieldset class="seg full"><legend>${L('rq.floor')}</legend>
      <label class="seg-g"><input type="radio" name="floor" value="2F" checked><span>2F · HIPHOP</span></label>
      <label class="seg-s"><input type="radio" name="floor" value="3F"><span>3F · EDM</span></label>
    </fieldset>
    <label>${L('rq.nick')}<input name="nick" maxlength="20" autocomplete="nickname"></label>
    <label>${L('rq.memo')}<input name="memo" maxlength="60" autocomplete="off"></label>
    <div class="full rv-act"><button class="btn btn-hot btn-lg" type="submit">${L('rq.btn')}</button></div>
    <p class="full muted small">${L('rq.note')}</p>
  </form>
</section>`;
  },

  'menu/': (lang) => {
    const L = (k) => t(lang, k);
    return `${pageHead(lang, 'menu')}
<section class="wrap sec" aria-label="${L('page.menu.t')}">
  ${menuTabs(lang, true)}
  <p class="muted small" data-svc="2F">${L('bt.svc2')}</p>
  <p class="muted small" data-svc="3F" hidden>${L('bt.svc3')}</p>
  <p class="muted small" data-svc="bar" hidden data-bar-note></p>
  <div data-menu></div>
  <p class="muted small">${L('mn.note')}</p>
  <div class="row-btns"><a class="btn btn-hot" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a></div>
</section>
<section class="wrap sec" aria-labelledby="lay-h"><h2 class="sec-h" id="lay-h">${L('sec.layout')}</h2><div class="shots">${fig('/assets/img/table-layout.webp', L('img.layout'))}</div></section>`;
  },

  'gallery/': (lang) => `${pageHead(lang, 'gallery')}
<section class="wrap sec"><div data-albums></div></section>`,

  'artists/': (lang) => `${pageHead(lang, 'artists')}
<section class="wrap sec"><div class="artists" data-artists></div></section>`,

  'reserve/': (lang) => {
    const L = (k) => t(lang, k);
    const opt = (v, k) => `<option value="${v}">${k}</option>`;
    return `<div class="banner wrap"><img src="/assets/img/tables.webp" width="1079" height="430" alt="" fetchpriority="high"></div>
${pageHead(lang, 'reserve')}
<section class="wrap sec rv">
  <form class="rv-form" id="rv-form" novalidate>
    <label>${L('rv.name')}<input name="name" autocomplete="name" placeholder="${esc(L('rv.p.name'))}" required></label>
    <label>${L('rv.phone')}<input name="phone" type="tel" autocomplete="tel" placeholder="010-0000-0000" required></label>
    <label>${L('rv.date')}<input name="date" type="date" required></label>
    <label>${L('rv.party')}<select name="party">${['1', '2', '3-4', '5-6', '7+'].map((v) => opt(v, v)).join('')}</select></label>
    <fieldset class="seg"><legend>${L('rv.floor')}</legend>
      <label class="seg-g"><input type="radio" name="floor" value="2F"><span>2F · HIPHOP</span></label>
      <label class="seg-s"><input type="radio" name="floor" value="3F"><span>3F · EDM</span></label>
      <label><input type="radio" name="floor" value="any" checked><span>${L('rv.any')}</span></label>
    </fieldset>
    <label>${L('rv.type')}<select name="type">${opt('guest', L('rv.t.guest'))}${opt('table', L('rv.t.table'))}${opt('bottle', L('rv.t.bottle'))}${opt('h', L('rv.t.h'))}</select></label>
    <label class="full">${L('rv.req')}<textarea name="req" rows="3" placeholder="${esc(L('rv.p.req'))}"></textarea></label>
    <div class="full rv-act">
      <button class="btn btn-hot btn-lg" type="submit">${L('rv.btn')}</button>
      <a class="btn btn-lg" href="tel:${PHONE.replace(/-/g, '')}">${L('rv.call')} · ${PHONE}</a>
    </div>
    <p class="full muted small">${L('rv.note')}</p>
  </form>
</section>
<section class="wrap sec" aria-labelledby="mn-h">
  <div class="sec-top"><h2 class="sec-h" id="mn-h">${L('sec.sets2')} · ${L('sec.menu')}</h2>
    ${menuTabs(lang, false)}
  </div>
  <p class="muted small" data-svc="2F">${L('bt.svc2')}</p>
  <p class="muted small" data-svc="3F" hidden>${L('bt.svc3')}</p>
  <div data-menu></div>
  <p class="muted small">${L('mn.note')}</p>
</section>
<section class="wrap sec"><div class="row-btns"><a class="btn" href="${href(lang, 'menu/')}?tab=bar">${L('sec.cocktail')} →</a><a class="btn" href="${href(lang, 'menu/')}">${L('more.menu')} →</a></div></section>`;
  },

  'guide/': (lang) => {
    const G = GUIDE[lang], K = GUIDE_LINKS[lang];
    return `<section class="phead wrap"><h1>${G.h1}</h1><p class="lede">${G.lede}</p></section>
<section class="wrap sec"><div class="panel"><dl class="hours guide-quick">${G.quick.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div></section>
${G.secs.map(([h, b], i) => `<section class="wrap sec" aria-labelledby="g${i}"><h2 class="sec-h" id="g${i}">${h}</h2><div class="prose">${b}</div></section>`).join('\n')}
<section class="wrap sec"><div class="row-btns"><a class="btn btn-hot" href="${href(lang, 'events/')}">${K[0]} →</a><a class="btn" href="${href(lang, 'info/')}">${K[1]} →</a><a class="btn" href="${href(lang, 'reserve/')}">${K[2]} →</a></div></section>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: G.h1, description: G.s, inLanguage: HTML_LANG[lang], author: { '@type': 'Organization', name: 'Groove & Spot' }, publisher: { '@type': 'Organization', name: 'Groove & Spot', logo: { '@type': 'ImageObject', url: SITE + '/assets/icon-512.png' } }, image: SITE + '/assets/og.png', mainEntityOfPage: SITE + href(lang, 'guide/'), about: { '@type': 'NightClub', name: 'Groove & Spot', url: SITE + '/' } }).replace(/</g, '\\u003c')}</script>`;
  },

  'info/': (lang) => {
    const L = (k) => t(lang, k);
    return `${pageHead(lang, 'info')}
<section class="wrap sec info-grid">
  <div class="panel"><h2 class="sec-h">${L('sec.visit')}</h2>
    <p>${L('if.addr')}<br><span class="muted">${L('if.near')}</span></p>
    <div class="row-btns"><a class="btn" href="https://map.kakao.com/link/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.kakao')}</a><a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a><a class="btn" href="${GMAP}" rel="noopener">${L('map.google')}</a></div>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.hours')}</h2>
    <dl class="hours"><dt>${L('hr.weekday')}</dt><dd>21:30 – 06:00</dd><dt>${L('hr.weekend')}</dt><dd>21:00 – 07:00</dd></dl>
    <p class="muted">${L('hr.always')}</p>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.policy')}</h2>
    <ul class="checks"><li>${L('pol.age')}</li><li>${L('pol.dress')}</li><li>${L('pol.respect')}</li></ul>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.contact')}</h2>
    <p><a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br><a href="${INSTAGRAM}" rel="noopener">Instagram @groovenspot</a><br><a href="${SOUNDCLOUD}" rel="noopener">SoundCloud</a><br><a href="${YOUTUBE}" rel="noopener">YouTube @GROOVEBUSAN</a><br><a href="${XHS}" rel="noopener">小红书 Xiaohongshu</a></p>
  </div>
</section>
<section class="wrap sec" aria-label="${L('map.embed')}"><div class="gmap gmap-lg"><iframe src="${GMAP_EMBED(lang)}" title="${L('map.embed')} · Groove &amp; Spot" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></section>
<section class="wrap sec"><div class="shots">${fig(`/assets/img/entry-policy-${lang === 'ko' ? 'ko' : 'en'}.webp`, L('img.policy'))}${fig('/assets/img/location-map.webp', L('img.map'))}</div></section>
<section class="wrap sec" aria-labelledby="faq-h">
  <h2 class="sec-h" id="faq-h">${L('sec.faq')}</h2>
  <p><a class="more" href="${href(lang, 'guide/')}">${GUIDE[lang].t} →</a></p>
  <div class="faq">
    ${FAQ_N.map((i) => `<details><summary>${L(`faq.q${i}`)}</summary><p>${L(`faq.a${i}`)}</p></details>`).join('\n    ')}
  </div>
</section>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ_N.map((i) => ({ '@type': 'Question', name: L(`faq.q${i}`), acceptedAnswer: { '@type': 'Answer', text: L(`faq.a${i}`) } })) }).replace(/</g, '\\u003c')}</script>`;
  },
};

const TITLES = { '': null, 'events/': 'page.events.t', 'event/': 'page.event.t', 'floors/': 'page.floors.t', 'artists/': 'page.artists.t', 'reserve/': 'page.reserve.t', 'info/': 'page.info.t', 'request/': 'page.request.t', 'menu/': 'page.menu.t', 'gallery/': 'page.gallery.t' };

function write(rel, html) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

for (const lang of LANGS) {
  if (lang !== 'ko' && existsSync(join(ROOT, lang))) rmSync(join(ROOT, lang), { recursive: true });
  for (const page of PAGES) {
    const titleKey = TITLES[page];
    const html = layout(lang, page, {
      title: page === 'guide/' ? GUIDE[lang].t : titleKey ? t(lang, titleKey) : null,
      desc: page === 'guide/' ? GUIDE[lang].s : titleKey && page !== 'event/' ? t(lang, `page.${page.replace('/', '')}.s`) : null,
      body: BODIES[page](lang),
      active: page,
    });
    write(join(lang === 'ko' ? '' : lang, page, 'index.html'), html);
  }
}

write('404.html', layout('ko', '', {
  title: t('ko', '404.t'),
  body: `<section class="phead wrap"><h1>404</h1><p class="lede">${t('ko', '404.t')} · ${t('en', '404.t')}</p><p><a class="btn btn-hot" href="/">${t('ko', '404.home')}</a></p></section>`,
}).replace(/<link rel="canonical"[^>]*>\n/, ''));

// 검색엔진용: 사이트맵 + robots.txt (관리자 페이지는 제외)
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
// 이벤트 상세 고정 페이지 (검색엔진용) — data/events.json·timetable.json·gallery.json 으로 생성
import { readFileSync } from 'node:fs';
const readJ = (f, d) => { try { return JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')); } catch (e) { return d; } };
const EVENTS = readJ('events.json', []), TTJ = readJ('timetable.json', {}), GAL = readJ('gallery.json', []);
const slugE = (x) => String(x).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
const pickL = (v, lang) => (v == null ? '' : typeof v === 'string' ? v : v[lang] || v.en || v.ko || '');
const DOWS = { ko: ['일', '월', '화', '수', '목', '금', '토'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ja: ['日', '月', '火', '水', '木', '金', '土'], zh: ['日', '一', '二', '三', '四', '五', '六'] };
const dLabel = (d, lang) => { const [y, m, dd] = d.split('-').map(Number); const w = DOWS[lang][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]; return lang === 'en' ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${dd}, ${y} (${w})` : lang === 'ko' ? `${y}년 ${m}월 ${dd}일 (${w})` : lang === 'ja' ? `${y}年${m}月${dd}日（${w}）` : `${y}年${m}月${dd}日（周${w}）`; };
const nmin = (t) => { const [h, m] = t.split(':').map(Number); const v = h * 60 + m; return v < 720 ? v + 1440 : v; };
const evPages = [];
for (const e of EVENTS) {
  if (!e || !e.date || !e.title) continue;
  const id = e.id || `${e.date}-${slugE(e.title)}`;
  const page = `event/${id}/`;
  const floors = String(e.floor || '2F+3F').split('+').map((x) => x.trim());
  const day = TTJ[e.date] || {};
  const albums = GAL.filter((a) => a && a.photos && a.photos.length && (a.event === id || (!a.event && a.date === e.date)));
  evPages.push(page);
  for (const lang of LANGS) {
    const L = (k) => t(lang, k);
    const tt = floors.map((f) => { const rows = (day[f] || []).slice().sort((a, b) => nmin(a.t) - nmin(b.t)); const names = (e.lineup && e.lineup[f]) || []; if (!rows.length && !names.length) return ''; return `<div><p class="tt-h">${f}${f === '2F' ? ' · GROOVE · HIPHOP' : ' · SPOT · EDM'}</p>${rows.length ? `<ul class="tt">${rows.map((r) => `<li><span class="tm">${esc(r.t)}</span><span class="nm">${esc(r.n)}</span></li>`).join('')}</ul>` : `<ul>${names.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`}</div>`; }).join('');
    const inTT = JSON.stringify(day).toUpperCase();
    const extra = Object.keys(e.lineup || {}).filter((k) => !floors.includes(k)).map((k) => { const rest = e.lineup[k].filter((n) => !inTT.includes(String(n).toUpperCase())); return rest.length ? `<div><p class="tt-h">${k === 'GUEST' ? 'SPECIAL GUEST' : esc(k)}</p><ul>${rest.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''; }).join('');
    const names = [...new Set([...Object.values(e.lineup || {}).flat(), ...Object.values(day).flat().map((r) => r.n)])].filter(Boolean);
    const photos = albums.flatMap((a) => a.photos).slice(0, 12);
    const desc = `${pickL(e.desc, lang) || e.title} — ${dLabel(e.date, lang)} · Groove & Spot, Seomyeon, Busan. ${names.length ? 'DJ: ' + names.slice(0, 12).join(', ') : ''}`.trim();
    const ld = { '@context': 'https://schema.org', '@type': 'MusicEvent', name: `${e.title} · Groove & Spot`, startDate: `${e.date}T${e.open || '21:30'}:00+09:00`, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', isAccessibleForFree: true, description: desc, url: `${SITE}${href(lang, page)}`, image: e.flyer ? [SITE + e.flyer] : [SITE + '/assets/og.png'], location: { '@type': 'NightClub', name: 'Groove & Spot', address: { '@type': 'PostalAddress', streetAddress: '52 Jungang-daero 680beonga-gil', addressLocality: 'Busanjin-gu, Busan', addressCountry: 'KR' } }, organizer: { '@type': 'Organization', name: 'Groove & Spot', url: SITE + '/' }, performer: names.slice(0, 30).map((n) => ({ '@type': 'PerformingGroup', name: n })) };
    const body = `<article class="evd wrap">
  <div class="ev-art full">${e.flyer ? `<img src="${esc(e.flyer)}" alt="${esc(e.title)} · Groove &amp; Spot Busan ${esc(e.date)}" loading="eager">` : ''}</div>
  <div>
    <div class="chips">${floors.map((f) => `<span class="chip ${f === '2F' ? 'g' : 's'}">${f}${f === '2F' ? ' HIPHOP' : ' EDM'}</span>`).join('')}</div>
    <h1>${esc(e.title)}</h1>
    <p class="evd-when">${esc(dLabel(e.date, lang))}${e.open ? ` · OPEN ${esc(e.open)}` : ''}</p>
    ${e.desc ? `<p class="lede">${esc(pickL(e.desc, lang))}</p>` : ''}
    ${tt || extra ? `<div class="evd-sec"><h2 class="sec-h">${L('sec.timetable')}</h2><div class="lineup">${tt}${extra}</div></div>` : ''}
    ${photos.length ? `<div class="evd-sec"><h2 class="sec-h">${L('ev.photos')}</h2><div class="ph-grid">${photos.map((p) => `<a class="ph" href="${href(lang, 'gallery/')}#${esc(albums[0].id || '')}"><img src="${esc(p.thumb || p.src)}" alt="${esc(albums[0].title)} · Busan nightclub Groove &amp; Spot" loading="lazy" decoding="async"${p.w ? ` width="${p.w}" height="${p.h}"` : ''}></a>`).join('')}</div><p><a class="more" href="${href(lang, 'gallery/')}#${esc(albums[0].id || '')}">${L('ev.more')} →</a></p></div>` : ''}
    <p class="muted">Groove &amp; Spot · ${esc(L('if.addr'))} · ${esc(L('if.near'))}</p>
    <div class="evd-act"><a class="btn btn-hot btn-lg" href="${href(lang, 'reserve/')}?date=${e.date}">${L('nav.reserve') || 'Reserve'}</a><a class="btn btn-lg" href="${href(lang, 'events/')}">${L('ev.all')}</a></div>
  </div>
</article>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
    write(join(lang === 'ko' ? '' : lang, page, 'index.html'), layout(lang, page, { title: `${e.title} · ${dLabel(e.date, lang)}`, desc, body, active: 'events/' }));
  }
}
const smPages = [...PAGES.filter((p) => p !== 'event/'), ...evPages];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${smPages.flatMap((p) => LANGS.map((l) => `  <url><loc>${SITE}${href(l, p)}</loc><lastmod>${today}</lastmod>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${HTML_LANG[a]}" href="${SITE}${href(a, p)}"/>`).join('')}</url>`)).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nDisallow: /admin/\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`built ${LANGS.length * PAGES.length + 1} pages`);

// 관리자 페이지 (한국어만, 검색 제외). 저장은 GitHub API로 data/*.json 을 직접 커밋한다.
write('admin/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script>if(location.protocol==='http:'&&!/^(localhost|127\\.|\\[)/.test(location.hostname))location.replace('https:'+location.href.slice(5))</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0a0909">
<title>관리자 · Groove & Spot</title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500..900&family=Black+Han+Sans&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/site.css?v=${VERSION}">
<link rel="stylesheet" href="/assets/admin.css?v=${VERSION}">
</head>
<body class="adm" data-page="admin">
<header class="hdr">
  <a class="brand logo" href="/"><img class="logo-icon" src="/assets/logo-icon.png" width="181" height="150" alt="">${LOGO_WORD}</a>
  <span class="adm-badge">ADMIN</span>
  <span class="adm-user" id="adm-user"></span>
</header>
<nav class="adm-tabs wrap" role="tablist">
  <button role="tab" data-tab="requests" aria-selected="true">🎵 신청곡 <b id="rq-count"></b></button>
  <button role="tab" data-tab="timetable" aria-selected="false">🎧 DJ 타임테이블</button>
  <button role="tab" data-tab="events" aria-selected="false">📅 이벤트</button>
  <button role="tab" data-tab="gallery" aria-selected="false">📸 사진첩</button>
</nav>
<main id="main" class="wrap adm-main">

<section data-panel="requests">
  <div class="adm-bar">
    <div class="tabs" id="rq-filter"><button data-f="all" aria-selected="true">전체</button><button data-f="2F" class="tab-g" aria-selected="false">2F</button><button data-f="3F" class="tab-s" aria-selected="false">3F</button></div>
    <label class="adm-check"><input type="checkbox" id="rq-hide"> 틀은 곡 숨기기</label>
    <label class="adm-check"><input type="checkbox" id="rq-sound"> 새 신청곡 알림음</label>
    <button class="btn btn-hot rq-refresh" type="button" id="rq-refresh">🔄 새로고침</button>
  </div>
  <p class="muted small" id="rq-status">불러오는 중…</p>
  <ol class="rq-list" id="rq-list"></ol>
  <details class="adm-help"><summary>DJ 폰으로 실시간 알림 받기</summary>
    <p>휴대폰에 <b>ntfy</b> 앱(무료)을 설치하고 토픽 <code>${REQ_TOPIC}</code> 을 구독하면, 신청곡이 들어올 때마다 푸시 알림이 와요. 브라우저에서는 <a href="https://ntfy.sh/${REQ_TOPIC}" target="_blank" rel="noopener">ntfy.sh/${REQ_TOPIC}</a> 에서도 볼 수 있어요.</p>
    <p>손님용 신청곡 페이지: <a href="/request/" target="_blank">그루브.site/request/</a> (매장 QR을 이 주소로 만들면 돼요)</p>
  </details>
</section>

<section data-panel="timetable" hidden>
  <div class="adm-login" data-need-login></div>
  <div data-when-login hidden>
    <div class="adm-bar">
      <label>날짜 <input type="date" id="tt-date"></label>
      <div class="tabs" id="tt-floor"><button data-f="2F" class="tab-g" aria-selected="true">2F · GROOVE</button><button data-f="3F" class="tab-s" aria-selected="false">3F · SPOT</button></div>
    </div>
    <p class="muted small">영업일 기준 날짜예요. 새벽 시간(00:00~07:00)도 전날 날짜에 넣으세요.</p>
    <ul class="tt-edit" id="tt-rows"></ul>
    <form class="adm-row" id="tt-add"><input name="t" type="time" required aria-label="시작 시간"><input name="n" placeholder="DJ 이름" maxlength="40" required aria-label="DJ 이름"><button class="btn" type="submit">추가</button></form>
    <div class="adm-act"><button class="btn btn-hot" id="tt-save" type="button">이 날짜 저장</button><button class="btn" id="tt-clear" type="button">이 층 비우기</button></div>
    <details class="adm-help" open><summary>주간 일정 한 번에 붙여넣기</summary>
      <p class="muted small">예전 관리자와 같은 형식이에요. 층 줄, 날짜 줄, 시간+이름 줄 순서로 붙여넣으면 돼요. 10:00~11:59는 밤, 12:xx는 자정 이후로 읽어요.</p>
      <textarea id="tt-bulk" rows="8" placeholder="3층 spot&#10;11월7일 금요일&#10;11:00 N&#10;12:00 EZZY&#10;01:20 DIA&#10;2층 groove&#10;11월7일 금요일&#10;10:00 GROOVE DJ&#10;12:00 ZINO"></textarea>
      <div class="adm-act"><button class="btn" id="tt-parse" type="button">미리보기</button><button class="btn btn-hot" id="tt-bulk-save" type="button" disabled>불러온 일정 저장</button></div>
      <div id="tt-preview"></div>
    </details>
  </div>
</section>

<section data-panel="events" hidden>
  <div class="adm-login" data-need-login></div>
  <div data-when-login hidden>
    <form class="rv-form adm-ev" id="ev-form" novalidate>
      <input type="hidden" name="id">
      <label>날짜<input name="date" type="date" required></label>
      <label>이벤트 이름<input name="title" maxlength="60" required placeholder="SATURDAY GUEST NIGHT"></label>
      <label>층<select name="floor"><option value="2F+3F">2F + 3F</option><option value="2F">2F · GROOVE</option><option value="3F">3F · SPOT</option></select></label>
      <label>오픈 시간<input name="open" type="time"></label>
      <label>장르<input name="genre" maxlength="40" placeholder="Hip-hop / R&amp;B"></label>
      <label>입장 안내<input name="entry" maxlength="80" placeholder="입장료 20,000원 (1드링크 포함)"></label>
      <label>2F 라인업 (쉼표로 구분)<input name="l2" placeholder="ZINO, ROAD"></label>
      <label>3F 라인업 (쉼표로 구분)<input name="l3" placeholder="DIA, ZET"></label>
      <label class="full">소개 (선택)<textarea name="desc" rows="2" maxlength="200"></textarea></label>
      <label class="full">플라이어 이미지 (선택, 세로 4:5 권장)<input name="flyerFile" type="file" accept="image/*"></label>
      <div class="full adm-flyer" id="ev-flyer"></div>
      <div class="full adm-act"><button class="btn btn-hot" type="submit" id="ev-save">이벤트 저장</button><button class="btn" type="button" id="ev-reset">새로 작성</button></div>
    </form>
    <h2 class="sec-h adm-h">등록된 이벤트</h2>
    <ul class="ev-admin" id="ev-list"></ul>
  </div>
</section>

<section data-panel="gallery" hidden>
  <div class="adm-login" data-need-login></div>
  <div data-when-login hidden>
    <form class="rv-form adm-ev" id="al-form" novalidate>
      <label>앨범<select id="al-pick"><option value="">+ 새 앨범 만들기</option></select></label>
      <label>날짜<input id="al-date" type="date" required></label>
      <label>앨범 이름<input id="al-title" maxlength="60" placeholder="HALLOWEEN NIGHT" required></label>
      <label>연결할 이벤트 (선택)<select id="al-event"><option value="">연결 안 함</option></select></label>
      <label class="full">사진 고르기 (여러 장 가능)<input id="al-files" type="file" accept="image/*" multiple></label>
      <p class="full muted small">사진은 이 기기에서 긴 변 1600px로 줄여서 올려요. 한 번에 30장 정도까지 권장해요. 원본은 올라가지 않아요.</p>
      <div class="full al-prev" id="al-prev"></div>
      <div class="full adm-act"><button class="btn btn-hot" type="submit" id="al-save">사진 올리기</button><span class="muted small" id="al-progress"></span></div>
    </form>
    <h2 class="sec-h adm-h">앨범</h2>
    <div id="al-list"></div>
  </div>
</section>

<template id="login-tpl">
  <div class="panel">
    <h2 class="sec-h">관리자 로그인</h2>
    <p>일정을 저장하려면 GitHub 관리자 키가 필요해요. 한 번 넣으면 이 기기에 기억돼요.</p>
    <ol class="small muted">
      <li><a href="https://github.com/settings/tokens/new?scopes=public_repo&amp;description=Groove%20%26%20Spot%20admin" target="_blank" rel="noopener">GitHub 키 만들기</a>를 눌러 groovenspot 계정으로 로그인</li>
      <li>Expiration을 고르고 맨 아래 <b>Generate token</b> → 나온 키(ghp_…) 복사</li>
      <li>아래에 붙여넣기</li>
    </ol>
    <form class="adm-row" data-login><input type="password" name="token" placeholder="ghp_…" autocomplete="off" required aria-label="GitHub 키"><button class="btn btn-hot" type="submit">로그인</button></form>
  </div>
</template>
</main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.GSA=${JSON.stringify({ topic: REQ_TOPIC, owner: 'groovenspot', repo: 'groovenspot.github.io', branch: 'main' })};</script>
<script src="/assets/admin.js?v=${VERSION}" defer></script>
</body>
</html>
`);
