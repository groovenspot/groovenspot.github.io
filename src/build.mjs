// 정적 페이지 생성기 (의존성 없음). 실행: node src/build.mjs
// 언어별(ko는 루트, en/ja/zh는 하위 폴더) HTML을 만든다.
// 이벤트·타임테이블·아티스트·영상·메뉴는 data/*.json 에서 브라우저가 직접 읽으므로,
// 일정만 바꿀 때는 빌드할 필요 없이 data 파일만 고치면 된다.

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, LANG_LABEL, HTML_LANG, T, t } from './i18n.mjs';
import { GUIDE, GUIDE_LINKS } from './guide.mjs';
import { SEO, SEO_EV, EV_DESC, EV_INFO } from './seo.mjs';
import { ARTICLES, ART_UI } from './articles.mjs';
import { PRIVACY, EFFECTIVE } from './privacy.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://xn--2i0bl1s25d.site'; // 그루브.site
const INSTAGRAM = 'https://www.instagram.com/groovenspot/';
const SOUNDCLOUD = 'https://on.soundcloud.com/IWtEmqOHfTecbn1cBI';
const YOUTUBE = 'https://www.youtube.com/@GROOVEBUSAN';
const YTMUSIC = 'https://music.youtube.com/channel/UCdS6A_RNPeys5ZBkvFSwuQg';
const XHS = 'https://www.xiaohongshu.com/user/profile/679dc482000000000e01e057';
const TRIPADVISOR = 'https://www.tripadvisor.com/Attraction_Review-g297884-d34781588-Reviews-Groove_Spot-Busan.html';
// 신청곡 전달용 ntfy 토픽 (assets/admin.js 의 TOPIC 과 같아야 함)
const REQ_TOPIC = 'groovenspot-req-6witbq5hriea';
// 예약 신청 이전(대표 결정 2026-11-20): Worker 접수 후 기존 예약 시트에도 기록한다.
const RSV_API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
const RSV_DUAL_WRITE = true;
// 기존 예약 시트 'GROOVE 예약·손님'의 Apps Script 웹 앱.
const BOOK_API = 'https://script.google.com/macros/s/AKfycbwhY9z5tEh7zkadb_3nWjQTRnBRKRStUxGkCotbG9n72f2t0FBZVXvp39afJI7-sdRe/exec';
// Google Analytics 4 측정 ID (G-XXXXXXXXXX). 비워 두면 통계 코드를 넣지 않는다. 관리자 페이지에는 넣지 않음.
const GA_ID = 'G-G4Y93LP9PP';
const GA_TAG = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}if(!/^(localhost|127\\.)/.test(location.hostname)){gtag('js',new Date());gtag('config','${GA_ID}');}</script>` : '';
const LOGO_FULL = '<img src="/assets/logo.png" width="564" height="229" alt="Groove &amp; Spot">';
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
const PAGES = ['', 'links/', 'events/', 'event/', 'floors/', 'seats/', 'menu/', 'gallery/', 'artists/', 'reserve/', 'info/', 'request/', 'guide/', 'privacy/', 'lost/'];
const prefix = (lang) => (lang === 'ko' ? '' : `/${lang}`);
const href = (lang, page) => `${prefix(lang)}/${page}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(lang, page, { title, desc, body, active }) {
  const L = (k) => t(lang, k);
  const isHome = page === '' && active === '';
  const bare = page === 'links/'; // 인스타 프로필 링크용 한 장 페이지: 푸터·하단 바·챗봇 없이 (헤더는 홈과 같게)
  const runtime = Object.fromEntries(Object.keys(T.ko).filter((k) => k.startsWith('rt.')).map((k) => [k.slice(3), L(k)]));
  const nav = [
    ['events/', 'nav.events'], ['floors/', 'nav.floors'], ['menu/', 'nav.menu'], ['gallery/', 'nav.gallery'], ['request/', 'nav.request'], ['info/', 'nav.info'], ['/partners/', 'nav.partners'], ['/club/', 'nav.club'],
  ];
  const fullTitle = title ? `${title} · Groove & Spot` : L('site.title');
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${SITE}${href(l, page)}">`).join('\n');
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="naver-site-verification" content="663bc824a0d4240c00416f2be7539140c3b01922">
<script>if(location.protocol==='http:'&&!/^(localhost|127\\.|\\[)/.test(location.hostname))location.replace('https:'+location.href.slice(5))</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#101014">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || L('site.desc'))}">
<link rel="canonical" href="${SITE}${href(lang, page)}">
<meta name="keywords" content="${esc(L('site.kw'))}">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'NightClub',name:'Groove & Spot',alternateName:['그루브앤스팟','GROOVE N SPOT','Groove Club Busan','그루브 클럽','グルーブアンドスポット'],description:L('site.desc'),url:SITE+'/',image:SITE+'/assets/og.png',logo:SITE+'/assets/icon-512.png',telephone:'+82-507-1301-5970',address:{'@type':'PostalAddress',streetAddress:'52 Jungang-daero 680beonga-gil, 2F-3F',addressLocality:'Busanjin-gu, Busan',addressCountry:'KR'},openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Sunday','Monday','Tuesday','Wednesday','Thursday'],opens:'21:30',closes:'06:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:['Friday','Saturday'],opens:'21:00',closes:'07:00'}],isAccessibleForFree:true,publicAccess:true,keywords:L('site.kw'),hasMap:'https://www.google.com/maps/place/groove+club+busan/data=!4m2!3m1!1s0x3568eb656144707d:0x40a16e9eec334ab7',sameAs:['https://www.instagram.com/groovenspot','https://www.youtube.com/@groovebusan','https://www.threads.com/@groovenspot','https://www.facebook.com/profile.php?id=61594858447057',XHS,TRIPADVISOR]}).replace(/</g,'\\u003c')}</script>
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Unbounded:wght@500..900&family=Black+Han+Sans&family=Dela+Gothic+One&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/site.css?v=${VERSION}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&display=swap">
<link rel="stylesheet" href="/assets/shell.css?v=${VERSION}">${isHome || bare ? `
<link rel="stylesheet" href="/assets/home.css?v=${VERSION}">` : ''}
${GA_TAG}
</head>
<body class="site-public" data-page="${page.replace(/\/$/, '') || (isHome ? 'home' : 'not-found')}">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <a class="brand logo site-brand" href="${href(lang, '')}">${LOGO_FULL}</a>
  <nav class="nav" aria-label="Main">
    ${nav.map(([p, k]) => `<a href="${p === '/partners/' && lang !== 'ko' ? p + '?lang=' + lang : p[0] === '/' ? p : href(lang, p)}"${active === p ? ' aria-current="page"' : ''}>${L(k)}</a>`).join('\n    ')}
  </nav>
  <details class="lang">
    <summary aria-label="Language: ${LANG_LABEL[lang]}"><svg class="ic lang-globe" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span class="lang-cur">${lang.toUpperCase()}</span></summary>
    <div class="lang-menu">
      ${LANGS.map((l) => `<a href="${href(l, page)}" hreflang="${HTML_LANG[l]}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_LABEL[l]}</a>`).join('\n      ')}
    </div>
  </details>
  <nav class="lang-inline" aria-label="Language">${LANGS.map((l) => `<a href="${href(l, page)}" hreflang="${HTML_LANG[l]}"${l === lang ? ' aria-current="true"' : ''}>${l === 'ko' ? 'KO' : l === 'en' ? 'EN' : LANG_LABEL[l]}</a>`).join('')}</nav>
  <a class="btn btn-hot hdr-cta" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="${L('nav.open')}" data-open="${L('nav.open')}" data-close="${L('nav.close')}"><span></span><span></span><span></span></button>
</header>
<nav class="mnav" id="mnav" aria-label="Mobile" hidden>
  <a href="${href(lang, '')}"${!active ? ' aria-current="page"' : ''}>${L('nav.home')}</a>
  ${nav.map(([p, k]) => `<a href="${p === '/partners/' && lang !== 'ko' ? p + '?lang=' + lang : p[0] === '/' ? p : href(lang, p)}"${active === p ? ' aria-current="page"' : ''}>${L(k)}</a>`).join('\n  ')}
  <a href="${href(lang, 'artists/')}"${active === 'artists/' ? ' aria-current="page"' : ''}>${L('nav.artists')}</a>
  <a href="${href(lang, 'guide/')}"${active === 'guide/' ? ' aria-current="page"' : ''}>${GUIDE[lang].t}</a>
  <a href="${href(lang, 'lost/')}"${active === 'lost/' ? ' aria-current="page"' : ''}>${L('nav.lost')}</a>
  <a class="btn btn-hot mnav-cta" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
</nav>
<main id="main">
${body}
</main>
${bare ? '' : `<footer class="ftr">
  <div class="ftr-grid">
    <div>
      <a class="brand logo site-brand" href="${href(lang, '')}">${LOGO_FULL}</a>
      <p class="muted">${L('if.addr')}<br>${L('if.near')}</p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.hours')}</h2>
      <p>${L('hr.weekday')} 21:30 – 06:00<br>${L('hr.weekend')} 21:00 – 07:00<br><span class="muted">${L('hr.always')}</span></p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.contact')}</h2>
      <p><a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br><a href="${INSTAGRAM}" rel="noopener">Instagram @groovenspot</a><br><a href="${YTMUSIC}" rel="noopener">YouTube Music</a><br><a href="${SOUNDCLOUD}" rel="noopener">SoundCloud</a><br><a href="${YOUTUBE}" rel="noopener">YouTube @GROOVEBUSAN</a><br><a href="${TRIPADVISOR}" rel="noopener">Tripadvisor</a><br><a href="${XHS}" rel="noopener">小红书 Xiaohongshu</a></p>
    </div>
  </div>
  <p class="ftr-small muted"><a href="${href(lang, 'guide/')}">${GUIDE[lang].t}</a> · <a href="${href(lang, 'artists/')}">${L('nav.artists')}</a> · <a href="${href(lang, 'lost/')}">${L('nav.lost')}</a> · <a href="${href(lang, 'privacy/')}"><b>${PRIVACY[lang].link}</b></a> · <a href="/admin/" rel="nofollow">Staff</a> · ${L('ft.age')} · © 2026 Groove &amp; Spot</p>
</footer>
<nav class="dock" aria-label="Quick actions">
  <a class="dock-hot" href="${href(lang, 'reserve/')}"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg><span>${L('cta.reserve')}</span></a>
  <a class="dock-b" href="${GMAP_DIR}" rel="noopener"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${L('cta.map')}</span></a>
  <a class="dock-b" href="${href(lang, 'events/')}"${active === 'events/' ? ' aria-current="page"' : ''}><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>${L('cta.tonight')}</span></a>
  <a class="dock-sub" href="${href(lang, 'request/')}"${active === 'request/' ? ' aria-current="page"' : ''}><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg><span>${L('nav.request')}</span></a>
  <a class="dock-sub" href="${href(lang, 'menu/')}"${active === 'menu/' ? ' aria-current="page"' : ''}><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/></svg><span>${L('nav.menu')}</span></a>
  <a class="dock-sub" href="${href(lang, 'info/')}"${active === 'info/' ? ' aria-current="page"' : ''}><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>${L('nav.info')}</span></a>
</nav>`}
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
  <button class="lb-nav lb-prev" type="button" data-lb="prev" aria-label="${L('rt.prevPhoto')}">‹</button>
  <figure class="lb-fig"><img id="lb-img" alt=""><figcaption id="lb-cap"></figcaption></figure>
  <button class="lb-nav lb-next" type="button" data-lb="next" aria-label="${L('rt.nextPhoto')}">›</button>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.GS=${JSON.stringify({ lang, root: prefix(lang), phone: PHONE, instagram: INSTAGRAM, whatsapp: 'https://wa.me/groovenspot', bookApi: BOOK_API, v: VERSION, topic: REQ_TOPIC, t: runtime })};</script>
<script src="/assets/site.js?v=${VERSION}" defer></script>
${bare ? '' : `<script src="/assets/chat.js?v=${VERSION}" defer></script>`}
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

// ── C: 플로어·안내 선 아이콘 (2026-11-20 리디자인) — 이모지 대신
const C_ICO = {
  dj: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  bar: '<path d="M8 22h8"/><path d="M12 15v7"/><path d="M5 3h14l-1 7a6 6 0 0 1-12 0z"/>',
  h: '<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8z"/>',
  stage: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
  table: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  dart: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  photo: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  smk: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  stairs: '<path d="M3 21h5v-5h5v-5h5V6h3"/><path d="m17 3 4 3-4 3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4"/><path d="M14 14h4"/>',
  shirt: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  ig: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  yt: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
  wave: '<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  arrow: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  map: '<path d="M14.1 6.3 9.9 4.2a2 2 0 0 0-1.8 0L3.6 6.4A1 1 0 0 0 3 7.3v12.1a1 1 0 0 0 1.4.9l4-2a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.4-2.2a1 1 0 0 0 .6-.9V5.2a1 1 0 0 0-1.4-.9l-4 2a2 2 0 0 1-1.8 0z"/><path d="M15 5.8v15"/><path d="M9 3.2v15"/>',
};
const cIco = (n, cls = '') => `<svg class="cx-ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${C_ICO[n] || ''}</svg>`;
// 오시는 길 약도 (서면역 3번 출구 → 도보 3분 → 매장). 실제 축척이 아닌 안내용 그림.
const routeSvg = (L) => `<svg class="in-route" viewBox="0 0 340 190" aria-hidden="true" focusable="false">
  <g stroke="rgba(255,255,255,.09)" stroke-width="14" stroke-linecap="square"><path d="M0 62H340"/><path d="M0 150H340"/><path d="M96 0V190"/><path d="M252 0V190"/></g>
  <path class="in-route-path" d="M66 128C120 128 140 96 176 96S230 72 246 60" fill="none" stroke="#ff7a1a" stroke-width="3.5" stroke-dasharray="7 7" stroke-linecap="round"/>
  <g transform="translate(46 108)"><rect width="40" height="40" rx="10" fill="#f7f1ec"/><path d="M12 10h16a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" fill="none" stroke="#070607" stroke-width="2.2"/><path d="M9 19h22M15 27l-3 4M25 27l3 4" stroke="#070607" stroke-width="2.2" stroke-linecap="round"/></g>
  <g transform="translate(246 60)"><circle r="22" fill="rgba(255,122,26,.22)"/><circle r="11" fill="#ff7a1a"/><circle r="4" fill="#070607"/></g>
</svg>
<span class="in-tag in-tag-exit">${L('if.exit')}</span><span class="in-tag in-tag-walk">${L('if.walk')}</span><span class="in-tag in-tag-shop">Groove &amp; Spot <small>2·3F</small></span>`;

const BODIES = {
  // 인스타 프로필 링크용 한 장 페이지 (링크트리 대신). 홈과 같은 디자인(히어로·TONIGHT·영문 제목+한글 부제).
  // 순서 = 인스타에서 넘어온 손님이 많이 찾는 순.
  'links/': (lang) => {
    const L = (k) => t(lang, k);
    const items = [
      { k: 'reserve', en: 'RESERVE', u: href(lang, 'reserve/'), t: L('lk.reserve') },
      { k: 'events', en: 'LINEUP', u: href(lang, 'events/'), t: L('cta.events') },
      { k: 'seats', en: 'SEATS', u: href(lang, 'seats/'), t: L('page.seats.t'), s: L('lk.seats.s') },
      { k: 'directions', en: 'DIRECTIONS', u: GMAP_DIR, t: L('lk.dir'), s: `${L('if.near')} · Google Maps`, ext: 1 },
      { k: 'timetable', en: 'TIMETABLE', u: href(lang, 'floors/'), t: L('lk.tt') },
      { k: 'menu', en: 'MENU', u: href(lang, 'menu/'), t: L('page.menu.t') },
      { k: 'livesets', en: 'LIVE SETS', u: YOUTUBE, t: L('lk.sets'), s: 'GROOVE SESSIONS · YouTube', ext: 1 },
      { k: 'club', en: 'VIRTUAL CLUB', u: '/club/', t: L('nav.club') },
      { k: 'request', en: 'SONG REQUEST', u: href(lang, 'request/'), t: L('cta.request') },
      { k: 'guestdj', en: 'GUEST DJ', u: 'https://ig.me/m/groovenspot', t: L('lk.dj'), s: L('lk.dj.s'), ext: 1 },
    ];
    const soc = [['Instagram', INSTAGRAM], ['YouTube', YOUTUBE], ['YouTube Music', YTMUSIC], ['SoundCloud', SOUNDCLOUD], ['Threads', 'https://www.threads.com/@groovenspot'], ['Tripadvisor', TRIPADVISOR], ['小红书', XHS]];
    return `<section class="hero">
  <img class="hero-bg" src="/assets/img/floor-2f.webp" width="1079" height="606" alt="" fetchpriority="high">
  <div class="hero-in wrap">
    <p class="kicker">${L('hero.kicker')}</p>
    <h1 class="hero-logo">${LOGO_FULL}</h1>
    <p class="hero-tag">${L('lk.tag')}</p>
    <div class="hero-act">
      <a class="btn btn-hot" href="${href(lang, 'reserve/')}" data-lk="reserve_hero">${L('cta.reserve')} <span aria-hidden="true">↗</span></a>
      <a class="btn" href="#lk-list" data-lk="links_down">${L('page.links.t')} <span aria-hidden="true">↓</span></a>
      <p class="status" data-status></p>
    </div>
  </div>
</section>
<section class="now" id="home-lineup" data-now hidden aria-labelledby="now-h">
  <div class="wrap">
    <h2 class="sec-h" id="now-h"><span class="home-title" aria-hidden="true">TONIGHT</span><span class="home-subtitle"><span class="live-dot" aria-hidden="true"></span><span id="now-h-txt">${L('sec.now')}</span></span></h2>
    <div class="now-grid" data-now-grid></div>
  </div>
</section>
<section class="wrap sec lk" id="lk-list" aria-labelledby="lk-h">
  <h2 class="sec-h" id="lk-h"><span class="home-title" aria-hidden="true">LINKS</span><span class="home-subtitle">${L('page.links.t')}</span></h2>
  <ul class="lk-list">
    ${items.map((i) => `<li><a class="lk-row" href="${i.u}" data-lk="${i.k}"${i.ext ? ' rel="noopener"' : ''}><span class="lk-en">${i.en}</span><span class="lk-t">${i.t}</span>${i.s ? `<span class="lk-s">${esc(i.s)}</span>` : ''}<span class="lk-go" aria-hidden="true">${i.ext ? '↗' : '→'}</span></a></li>`).join('\n    ')}
  </ul>
</section>
<section class="wrap sec lk" aria-labelledby="lk-f">
  <h2 class="sec-h" id="lk-f"><span class="home-title" aria-hidden="true">FOLLOW</span><span class="home-subtitle">${L('lk.follow')}</span></h2>
  <p class="lk-soc">${soc.map(([n, u]) => `<a class="btn" href="${u}" rel="noopener" data-lk="${n === '小红书' ? 'xiaohongshu' : n.toLowerCase()}">${n} <span aria-hidden="true">↗</span></a>`).join('')}</p>
  <p class="lk-foot muted">${L('if.addr')}<br>${L('hr.weekday')} 21:30 – 06:00 · ${L('hr.weekend')} 21:00 – 07:00 · <a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br>${L('ft.age')} · © 2026 Groove &amp; Spot</p>
</section>`;
  },
  '': (lang) => {
    const L = (k) => t(lang, k);
    return `<section class="hero">
  <img class="hero-bg" src="/assets/img/floor-2f.webp" width="1079" height="606" alt="" fetchpriority="high">
  <div class="hero-in wrap">
    <p class="status" data-status></p>
    <p class="kicker">${L('hero.kicker')}</p>
    <h1 class="hero-word"><span class="hw-g">GROOVE</span> <span class="hw-amp">&amp;</span> <span class="hw-s">SPOT</span></h1>
    <p class="hero-tag">${L('hero.tag')}</p>
    <div class="hero-act">
      <a class="btn btn-hot btn-lg" href="${href(lang, 'reserve/')}">${L('cta.reserve')}<svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
      <a class="btn btn-lg" href="#home-lineup">${L('cta.lineup')}<svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></a>
      <a class="btn btn-lg hero-map" href="${GMAP_DIR}" rel="noopener"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>${L('cta.map')}</a>
    </div>
  </div>
</section>
<section class="now" id="home-lineup" data-now hidden aria-labelledby="now-h">
  <div class="wrap">
    <h2 class="sec-h" id="now-h"><span class="home-title" aria-hidden="true">TONIGHT</span><span class="home-subtitle"><span class="live-dot" aria-hidden="true"></span><span id="now-h-txt">${L('sec.now')}</span></span></h2>
    <div class="now-grid" data-now-grid></div>
    <p class="now-act"><a class="btn" href="${href(lang, 'request/')}"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>${L('cta.request')}</a><a class="more" href="${href(lang, 'floors/')}">${L('sec.timetable')} →</a></p>
  </div>
</section>
<section class="wrap sec home-events" aria-labelledby="up-h">
  <div class="sec-top"><h2 class="sec-h" id="up-h"><span class="home-title" aria-hidden="true">UPCOMING</span><span class="home-subtitle">${L('sec.upcoming')}</span></h2><a class="more" href="${href(lang, 'events/')}">${L('more.events')} →</a></div>
  <p class="small" data-saved-event hidden></p>
  <div class="cards" data-events="upcoming" data-limit="6"></div>
</section>
<section class="wrap sec" aria-labelledby="fl-h">
  <div class="sec-top"><h2 class="sec-h" id="fl-h"><span class="home-title" aria-hidden="true">TWO FLOORS</span><span class="home-subtitle">${L('sec.floors')}</span></h2><a class="more" href="${href(lang, 'floors/')}">${L('more.floors')} →</a></div>
  <div class="floors">
    ${floorCard(lang, '2F')}
    ${floorCard(lang, '3F')}
  </div>
</section>
<section class="wrap sec" aria-labelledby="ph-h" data-photos-sec hidden>
  <div class="sec-top"><h2 class="sec-h" id="ph-h"><span class="home-title" aria-hidden="true">PHOTOS</span><span class="home-subtitle">${L('sec.photos')}</span></h2><a class="more" href="${href(lang, 'gallery/')}">${L('more.gallery')} →</a></div>
  <div class="ph-strip" data-photos="latest" data-limit="8"></div>
</section>
<section class="wrap sec" aria-labelledby="sets-h">
  <h2 class="sec-h" id="sets-h"><span class="home-title" aria-hidden="true">LIVE SETS</span><span class="home-subtitle">GROOVE SESSIONS · ${L('sec.sets')}</span></h2>
  <div class="videos" data-videos data-limit="6"></div>
  <div class="sc-row">
  <a class="sc yt" href="${YOUTUBE}" rel="noopener"><span class="yt-play" aria-hidden="true"></span><span>${L('more.yt')} →</span></a>
  <a class="sc ytm" href="${YTMUSIC}" rel="noopener"><span class="ytm-ic" aria-hidden="true"></span><span>${L('more.ytm')} →</span></a>
  <a class="sc" href="${SOUNDCLOUD}" rel="noopener"><span class="sc-wave" aria-hidden="true">${bars(28)}</span><span>${L('more.sc')} →</span></a>
  </div>
</section>
<section class="wrap sec" aria-labelledby="ig-h" data-ig-sec hidden>
  <div class="sec-top"><h2 class="sec-h" id="ig-h"><span class="home-title" aria-hidden="true">INSTAGRAM</span><span class="home-subtitle">@groovenspot</span></h2><a class="more" href="${INSTAGRAM}" rel="noopener">@groovenspot →</a></div>
  <div class="ig" data-ig></div>
</section>
<section class="wrap sec visit" aria-labelledby="vi-h">
  <h2 class="sec-h" id="vi-h"><span class="home-title" aria-hidden="true">FIND US</span><span class="home-subtitle">${L('if.near')}</span></h2>
  <div class="visit-grid">
    <p class="visit-addr"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${L('if.addr')}<br><span class="muted">${L('if.near')}</span></span></p>
    <div class="visit-hours"><p class="vh-h"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${L('sec.hours')}</p><p class="vh-r"><span>${L('hr.weekday')}</span><b>21:30 – 06:00</b></p><p class="vh-r"><span>${L('hr.weekend')}</span><b>21:00 – 07:00</b></p><p class="muted vh-n">${L('hr.always')}</p></div>
    <div class="visit-act">
      <a class="btn" href="https://map.kakao.com/link/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.kakao')}</a>
      <a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a><a class="btn" href="${GMAP}" rel="noopener">${L('map.google')}</a>
      <a class="btn visit-tel" href="tel:${PHONE.replace(/-/g, '')}"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${PHONE}</a>
    </div>
  </div>
  <div class="gmap"><iframe src="${GMAP_EMBED(lang)}" title="${L('map.embed')} · Groove &amp; Spot" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
</section>`;
  },

  'events/': (lang) => `<section class="phead wrap evs-head"><p class="evs-kick">EVENTS</p><h1>${t(lang, 'page.events.t')}</h1><p class="lede">${t(lang, 'page.events.s')}</p></section>
<section class="wrap evs-top"><div class="evs-week" data-ev-week></div><div class="evs-filter" data-ev-filter role="group" aria-label="${esc(t(lang, 'page.events.t'))}"></div></section>
<section class="wrap sec evs-up"><h2 class="sec-h">${t(lang, 'sec.upcoming')}</h2><div class="cards evs-list" data-events="upcoming"></div></section>
<section class="wrap sec evs-past"><h2 class="sec-h">${t(lang, 'sec.archive')}</h2><div class="cards cards-past" data-events="past"></div></section>`,

  'event/': () => `<div class="wrap" data-event-detail></div>`,

  'floors/': (lang) => {
    const L = (k) => t(lang, k);
    // 🎨 C 리디자인(2026-11-20): 층마다 화면 가득 사진 + 거대한 층 이름 · 선 아이콘 시설 칸 · 오늘 그 층 타임테이블(site.js가 채움) · 자리 고르기/신청곡
    const am = (keys) => `<ul class="fx-am">${keys.map((k) => `<li>${cIco(k)}<span>${L(`am.${k}`)}</span></li>`).join('')}</ul>`;
    const block = (f, keys, n) => {
      const g = f === '2F';
      return `<section class="fbig fx fx-${g ? 'g' : 's'}" id="${f.toLowerCase()}" aria-labelledby="fx-${f}">
  <div class="fx-hero"><img class="fx-img" src="/assets/img/floor-${f.toLowerCase()}.webp" width="1079" height="606" alt="" loading="${g ? 'eager' : 'lazy'}" decoding="async">
    <div class="wrap fx-hero-in"><p class="fx-no">${f} · FLOOR 0${n}</p><h2 class="fx-name" id="fx-${f}">${L(`floor.${f}.name`)}</h2><p class="fx-genre">${L(`floor.${f}.genre`)}</p></div>
  </div>
  <div class="wrap fx-body">
    <div class="fx-main"><p class="fx-lede">${L(`floor.${f}.long`)}</p>${am(keys)}</div>
    <div class="fx-side">
      <div class="tt-today fx-tt" data-floor-tt="${f}"></div>
      <div class="fx-act"><a class="btn btn-hot fx-cta" href="${href(lang, 'seats/')}?floor=${f}">${cIco('grid')}${L('cta.seats')}</a><a class="btn fx-req" href="${href(lang, 'request/')}?floor=${f}">${cIco('music')}${L('cta.request')}</a></div>
    </div>
  </div>
</section>`;
    };
    return `<section class="phead wrap cx-head"><p class="cx-kick">TWO FLOORS</p><h1>${L('page.floors.t')}</h1><p class="lede">${L('page.floors.s')}</p></section>
${block('2F', ['dj', 'bar', 'h', 'stage', 'table', 'dart'], 1)}
<section class="wrap fx-bldg" aria-labelledby="fx-bldg-h">
  <div class="fx-bldg-txt"><p class="cx-kick">ONE BUILDING · TWO STAGES</p><h2 id="fx-bldg-h">${L('fl.bldg.t')}</h2><p>${L('fl.bldg.s')}</p></div>
  <div class="fx-bldg-fig">
    <div class="fx-stack"><a class="fx-lv fx-lv-s" href="#3f"><small>3F</small><b>${L('floor.3F.name')}</b><span>${L('floor.3F.genre')}</span></a><a class="fx-lv fx-lv-g" href="#2f"><small>2F</small><b>${L('floor.2F.name')}</b><span>${L('floor.2F.genre')}</span></a><p class="fx-lv fx-lv-e">${cIco('pin')}<span>${L('fl.entry')} · ${L('if.near')}</span></p></div>
    <p class="fx-stairs">${cIco('stairs')}<b>${L('fl.stairs')}</b><small>2F ↔ 3F</small></p>
  </div>
</section>
${block('3F', ['dj', 'bar', 'stage', 'table', 'photo', 'smk'], 2)}
<section class="wrap sec fx-layout" aria-labelledby="lay-h"><div class="sec-top"><div><p class="cx-kick">LAYOUT</p><h2 class="sec-h" id="lay-h">${L('sec.layout')}</h2></div><a class="btn btn-hot" href="${href(lang, 'seats/')}">${cIco('grid')}${L('cta.seats')}</a></div><div class="shots">${fig('/assets/img/table-layout.webp', L('img.layout'))}</div></section>`;
  },

  'seats/': (lang) => {
    const L = (k) => t(lang, k);
    // 화면 문구는 이 페이지에만 넣는다(다른 페이지의 window.GS.t 를 키우지 않으려고)
    const S = Object.fromEntries(Object.keys(T.ko).filter((k) => k.startsWith('st.')).map((k) => [k.slice(3), L(k)]));
    return `${pageHead(lang, 'seats')}
<section class="wrap sec sm" data-seats data-floor="2F" aria-label="${esc(L('page.seats.t'))}">
  <div class="tabs sm-tabs" role="tablist" aria-label="${esc(L('st.floorsel'))}"><button type="button" role="tab" class="tab-g" data-sfloor="2F" aria-selected="true">2F · GROOVE</button><button type="button" role="tab" class="tab-s" data-sfloor="3F" aria-selected="false">3F · SPOT</button></div>
  <div class="sm-grid">
    <div>
      <div class="sm-wrap"><div class="sm-map" data-sm-map></div></div>
      <p class="muted small sm-hint">${L('st.hint')} <a href="/assets/img/table-layout.webp" target="_blank" rel="noopener">${L('st.orig')}</a></p>
    </div>
    <div class="panel sm-panel" data-sm-panel aria-live="polite"><div><h2 class="sm-h">${L('st.pick.t')}</h2><p class="muted">${L('st.pick.d')}</p></div></div>
  </div>
  <noscript><div class="shots">${fig('/assets/img/table-layout.webp', L('img.layout'))}</div></noscript>
  <script type="application/json" id="seats-t">${JSON.stringify(S).replace(/</g, '\\u003c')}</script>
</section>`;
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
      <div class="rq-recent" id="rq-recent" hidden><p class="muted small">${esc(L('rq.recent'))}</p><div class="rq-chips" id="rq-chips"></div></div>
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
<section class="wrap sec" aria-labelledby="lay-h"><div class="sec-top"><h2 class="sec-h" id="lay-h">${L('sec.layout')}</h2><a class="btn btn-hot" href="${href(lang, 'seats/')}">${L('cta.seats')} →</a></div><div class="shots">${fig('/assets/img/table-layout.webp', L('img.layout'))}</div></section>`;
  },

  'gallery/': (lang) => `${pageHead(lang, 'gallery')}
<section class="wrap sec"><div data-albums></div><p class="muted pp-note">📷 ${PRIVACY[lang].galleryNote}</p></section>`,

  'artists/': (lang) => `${pageHead(lang, 'artists')}
<section class="wrap sec"><div class="artists" data-artists></div></section>`,

  'reserve/': (lang) => {
    const L = (k) => t(lang, k);
    const opt = (v, k) => `<option value="${v}">${k}</option>`;
    return `<div class="banner wrap"><img src="/assets/img/tables.webp" width="1079" height="430" alt="" fetchpriority="high"></div>
${pageHead(lang, 'reserve')}
<section class="wrap sec rv">
  <form class="rv-form" id="rv-form" data-rsv-api="${esc(RSV_API)}" data-rsv-dual="${RSV_DUAL_WRITE ? '1' : '0'}" novalidate>
    <p class="full rv-seat" data-rv-seat data-label="${esc(L('st.sel'))}" data-change="${esc(L('rv.seat.change'))}"><a href="${href(lang, 'seats/')}">🪑 ${L('rv.seat.link')} →</a></p>
    <label>${L('rv.name')}<input name="name" maxlength="20" autocomplete="name" placeholder="${esc(L('rv.p.name'))}" required></label>
    <label>${L('rv.phone')}<input name="phone" type="tel" maxlength="30" autocomplete="tel" placeholder="010-0000-0000" required></label>
    <label>${L('rv.date')}<input name="date" type="date" required></label>
    <label>${L('rv.party')}<select name="party">${['1', '2', '3-4', '5-6', '7+'].map((v) => opt(v, v)).join('')}</select></label>
    <fieldset class="seg"><legend>${L('rv.floor')}</legend>
      <label class="seg-g"><input type="radio" name="floor" value="2F"><span>2F · HIPHOP</span></label>
      <label class="seg-s"><input type="radio" name="floor" value="3F"><span>3F · EDM</span></label>
      <label><input type="radio" name="floor" value="any" checked><span>${L('rv.any')}</span></label>
    </fieldset>
    <label>${L('rv.type')}<select name="type">${opt('guest', L('rv.t.guest'))}${opt('table', L('rv.t.table'))}${opt('bottle', L('rv.t.bottle'))}${opt('h', L('rv.t.h'))}</select></label>
    <label>${L('rv.bday')}<input name="bday" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="${esc(L('rv.p.bday'))}"></label>
    <label class="full">${L('rv.req')}<textarea name="req" rows="3" maxlength="500" placeholder="${esc(L('rv.p.req'))}"></textarea></label>
    <label class="full rv-chk"><input type="checkbox" name="consent"><span>${L('rv.consent')} <a href="${href(lang, 'privacy/')}">${PRIVACY[lang].link}</a></span></label>
    <label class="full rv-chk"><input type="checkbox" name="promo"><span>${L('rv.promo')}</span></label>
    <input class="rv-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="full rv-act">
      <button class="btn btn-hot btn-lg" type="submit" data-rv-main>${L('rv.btn')}</button>
      <button class="btn btn-lg btn-wa" type="button" data-wa data-rv-main>${L('rv.wa')}</button>
      <a class="btn btn-lg" href="tel:${PHONE.replace(/-/g, '')}">${L('rv.call')} · ${PHONE}</a>
    </div>
    <div class="full rv-done" data-rv-done role="status" aria-live="polite" hidden>
      <p class="rv-done-h" data-rv-h></p>
      <p data-rv-sub></p>
      <p class="rv-code" data-rv-code></p>
      <div class="rv-act"><button class="btn btn-hot btn-lg" type="button" data-rv-go hidden></button></div>
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

  'privacy/': (lang) => {
    const P = PRIVACY[lang];
    return `<section class="phead wrap"><h1>${P.t}</h1><p class="lede">${P.lede}</p><p class="muted">${P.eff}: ${EFFECTIVE}</p></section>
${P.secs.map(([h, b], i) => `<section class="wrap sec" aria-labelledby="pp${i}"><h2 class="sec-h" id="pp${i}">${h}</h2><div class="prose pp">${b}</div></section>`).join('\n')}`;
  },
  'guide/': (lang) => {
    const G = GUIDE[lang], K = GUIDE_LINKS[lang];
    return `<section class="phead wrap"><h1>${G.h1}</h1><p class="lede">${G.lede}</p></section>
<section class="wrap sec"><div class="panel"><dl class="hours guide-quick">${G.quick.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div></section>
${G.secs.map(([h, b], i) => `<section class="wrap sec" aria-labelledby="g${i}"><h2 class="sec-h" id="g${i}">${h}</h2><div class="prose">${b}</div></section>`).join('\n')}
<section class="wrap sec"><div class="row-btns"><a class="btn btn-hot" href="${href(lang, 'events/')}">${K[0]} →</a><a class="btn" href="${href(lang, 'info/')}">${K[1]} →</a><a class="btn" href="${href(lang, 'reserve/')}">${K[2]} →</a></div></section>
${ARTICLES.length ? `<section class="wrap sec" aria-labelledby="g-more"><h2 class="sec-h" id="g-more">${ART_UI.more[lang]}</h2><div class="prose"><ul>${ARTICLES.map((a) => `<li><a href="${href(lang, `guide/${a.slug}/`)}">${esc(a[lang].t)}</a></li>`).join('')}</ul></div></section>` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: G.h1, description: G.s, inLanguage: HTML_LANG[lang], author: { '@type': 'Organization', name: 'Groove & Spot' }, publisher: { '@type': 'Organization', name: 'Groove & Spot', logo: { '@type': 'ImageObject', url: SITE + '/assets/icon-512.png' } }, image: SITE + '/assets/og.png', mainEntityOfPage: SITE + href(lang, 'guide/'), about: { '@type': 'NightClub', name: 'Groove & Spot', url: SITE + '/' } }).replace(/</g, '\\u003c')}</script>`;
  },

  'lost/': (lang) => {
    const L = (k) => t(lang, k);
    return `${pageHead(lang, 'lost')}
<section class="wrap sec">
  <div class="panel lost-note"><p class="muted">${L('lost.note2')}</p>
    <div class="row-btns"><a class="btn btn-hot" href="tel:${PHONE.replace(/-/g, '')}">📞 ${PHONE}</a><a class="btn" href="${INSTAGRAM}" rel="noopener">Instagram DM</a></div></div>
</section>
<section class="wrap sec"><div id="lost" class="lost" aria-live="polite"><p class="muted">${L('rt.lostLoad')}</p></div></section>
<div class="lost-lb" id="lostLb" hidden role="dialog" aria-modal="true"><button type="button" class="lost-x" aria-label="${L('rt.close')}">✕</button><img alt=""></div>
<style>
.lost-note p { margin: 0 0 8px; }
.lost-day { margin: 22px 0 10px; font-size: 18px; }
.lost-day small { color: var(--muted, #999); font-weight: 600; margin-left: 6px; font-size: 13px; }
.lost-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.lost-grid button { padding: 0; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; overflow: hidden; background: #0c0c10; aspect-ratio: 1; cursor: zoom-in; }
.lost-grid img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lost-lb { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.92); display: grid; place-items: center; padding: 16px; }
.lost-lb img { max-width: 100%; max-height: 90vh; border-radius: 10px; }
.lost-x { position: absolute; top: 14px; right: 14px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(255,255,255,.15); color: #fff; font-size: 20px; cursor: pointer; }
</style>
<script src="/assets/lost.js?v=${VERSION}" defer></script>`;
  },

  'info/': (lang) => {
    const L = (k) => t(lang, k);
    // 🎨 C 리디자인(2026-11-20): 오늘 영업 상태(site.js [data-status]) · 약도 · 주소 복사 · 지도 앱 · 영업시간(오늘 줄 표시) · 입장 칸 · 연락처 · 언어 · FAQ
    const tel = PHONE.replace(/-/g, '');
    const pol = (k) => { const s = L(k); const i = s.indexOf(' · '); return i > 0 ? [s.slice(0, i), s.slice(i + 3)] : [s, '']; };
    const [ageT, ageD] = pol('pol.age');
    const [drT, drD] = pol('pol.dress');
    const contacts = [['phone', `tel:${tel}`, PHONE], ['ig', INSTAGRAM, 'Instagram @groovenspot'], ['yt', YOUTUBE, 'YouTube @GROOVEBUSAN'], ['wave', YTMUSIC, 'YouTube Music'], ['wave', SOUNDCLOUD, 'SoundCloud'], ['star', TRIPADVISOR, 'Tripadvisor'], ['book', XHS, '小红书 Xiaohongshu']];
    return `<section class="phead wrap cx-head"><p class="cx-kick">FIND US · FAQ</p><h1>${L('page.info.t')}</h1><p class="lede">${L('page.info.s')}</p></section>
<section class="wrap in-grid">
  <div class="in-col">
    <div class="in-card in-now"><p class="cx-kick">TONIGHT</p><p class="in-status" data-status>${L('hr.always')}</p><p class="in-sub">${L('hr.weekday')} 21:30 – 06:00 · ${L('hr.weekend')} 21:00 – 07:00</p></div>
    <div class="in-card in-visit"><p class="cx-kick">FIND US</p><h2 class="in-h">${L('sec.visit')}</h2>
      <div class="in-map" role="img" aria-label="${esc(L('if.near'))}">${routeSvg(L)}</div>
      <p class="in-addr">${L('if.addr')}<span>${L('if.near')}</span></p>
      <button class="btn in-copy" type="button" data-copy="${esc(ADDR_KO)} (2·3층)" data-done="${esc(L('if.copied'))}">${cIco('copy')}<span>${L('if.copy')}</span></button>
      <p class="in-note">${L('if.copy.d')}</p>
      <div class="in-maps"><a class="btn" href="https://map.kakao.com/link/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.kakao')}</a><a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a><a class="btn" href="${GMAP}" rel="noopener">${L('map.google')}</a></div>
      <a class="btn in-call" href="tel:${tel}">${cIco('phone')}<span>${PHONE}</span></a>
    </div>
    <div class="in-card in-hours"><p class="cx-kick">HOURS</p><h2 class="in-h">${L('sec.hours')}</h2>
      <dl class="in-hr"><div data-hrow="wk"><dt>${L('hr.weekday')}</dt><dd>21:30 – 06:00</dd></div><div data-hrow="we"><dt>${L('hr.weekend')}</dt><dd>21:00 – 07:00</dd></div></dl>
      <p class="in-sub">${L('hr.always')}</p>
    </div>
  </div>
  <div class="in-col">
    <div class="in-card in-entry"><p class="cx-kick">ENTRY</p><h2 class="in-h">${L('sec.policy')}</h2>
      <ul class="in-tiles"><li>${cIco('ticket')}<b>${L('pol.free')}</b><span>${L('pol.free.d')}</span></li><li>${cIco('id')}<b>${ageT}</b><span>${ageD}</span></li><li>${cIco('shirt')}<b>${drT}</b><span>${drD}</span></li></ul>
      <p class="in-respect">${cIco('heart')}<span>${L('pol.respect')}</span></p>
      <details class="in-pimg"><summary>${cIco('photo')}${L('img.policy')}</summary>${fig(`/assets/img/entry-policy-${lang === 'ko' ? 'ko' : 'en'}.webp`, L('img.policy'))}</details>
    </div>
    <div class="in-card in-contact"><p class="cx-kick">CONTACT</p><h2 class="in-h">${L('sec.contact')}</h2>
      <ul class="in-links">${contacts.map(([i, u, tx]) => `<li><a href="${u}" rel="noopener">${cIco(i)}<span>${tx}</span>${cIco('arrow', 'in-go')}</a></li>`).join('')}</ul>
    </div>
    <div class="in-card in-lang"><p class="cx-kick">LANGUAGE</p><h2 class="in-h">${L('in.lang')}</h2>
      <div class="in-langs">${LANGS.map((l) => `<a href="${href(l, 'info/')}" hreflang="${HTML_LANG[l]}" lang="${HTML_LANG[l]}"${l === lang ? ' aria-current="true"' : ''}>${LANG_LABEL[l]}</a>`).join('')}</div>
    </div>
  </div>
</section>
<section class="wrap sec in-gmap" aria-label="${L('map.embed')}"><div class="gmap gmap-lg"><iframe src="${GMAP_EMBED(lang)}" title="${L('map.embed')} · Groove &amp; Spot" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></section>
<section class="wrap sec in-faq" aria-labelledby="faq-h">
  <div class="sec-top"><div><p class="cx-kick">FAQ</p><h2 class="sec-h" id="faq-h">${L('sec.faq')}</h2></div><a class="more" href="${href(lang, 'guide/')}">${GUIDE[lang].t} →</a></div>
  <div class="faq">
    ${FAQ_N.map((i) => `<details><summary>${L(`faq.q${i}`)}</summary><p>${L(`faq.a${i}`)}</p></details>`).join('\n    ')}
  </div>
</section>
<script>(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;var s=b.querySelector('span'),o=s.textContent,v=b.getAttribute('data-copy');function ok(){s.textContent=b.getAttribute('data-done');b.classList.add('done');setTimeout(function(){s.textContent=o;b.classList.remove('done');},1800);}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(ok,function(){});}});var d=new Date(Date.now()+324e5),w=d.getUTCDay();if(d.getUTCHours()<8)w=(w+6)%7;var r=document.querySelector('[data-hrow="'+(w===5||w===6?'we':'wk')+'"]');if(r)r.classList.add('today');})();</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ_N.map((i) => ({ '@type': 'Question', name: L(`faq.q${i}`), acceptedAnswer: { '@type': 'Answer', text: L(`faq.a${i}`) } })) }).replace(/</g, '\\u003c')}</script>`;
  },
};

const TITLES = { '': null, 'events/': 'page.events.t', 'event/': 'page.event.t', 'floors/': 'page.floors.t', 'seats/': 'page.seats.t', 'links/': 'page.links.t', 'artists/': 'page.artists.t', 'reserve/': 'page.reserve.t', 'info/': 'page.info.t', 'lost/': 'page.lost.t', 'request/': 'page.request.t', 'menu/': 'page.menu.t', 'gallery/': 'page.gallery.t' };

function write(rel, html) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

for (const lang of LANGS) {
  if (lang !== 'ko' && existsSync(join(ROOT, lang))) rmSync(join(ROOT, lang), { recursive: true });
  for (const page of PAGES) {
    const titleKey = TITLES[page];
    const seo = (SEO[lang] || {})[page];
    const html = layout(lang, page, {
      title: page === 'privacy/' ? PRIVACY[lang].t : page === 'guide/' ? GUIDE[lang].t : seo ? seo.t : titleKey ? t(lang, titleKey) : null,
      desc: page === 'privacy/' ? PRIVACY[lang].s : page === 'guide/' ? GUIDE[lang].s : seo ? seo.s : titleKey && page !== 'event/' ? t(lang, `page.${page.replace('/', '')}.s`) : null,
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


// 안내 챗봇 데이터 (정해진 답변형) — FAQ 문구를 그대로 쓰고 키워드로 찾는다
const CHAT_IDS = { 1: 'dress', 2: 'age', 3: 'walkin', 4: 'parking', 5: 'smoke', 6: 'group', 7: 'fee', 8: 'foreign', 9: 'hours', 10: 'music', 11: 'timetable', 12: 'table' };
const CHAT_KW = {
  dress: ['dress', 'wear', 'clothes', 'outfit', 'shoes', 'slipper', 'sandal', '드레스', '복장', '옷', '슬리퍼', '신발', '츄리닝', '트레이닝', '服装', 'ドレス', '服', '着', '靴', '穿', '鞋'],
  age: ['age', 'old', 'minor', 'id card', '나이', '미성년', '19', '몇살', '신분증', '年齢', '歳', '年龄', '岁', '证件'],
  walkin: ['walk in', 'walk-in', 'without book', 'without reserv', '예약 없이', '예약없이', '워크인', '그냥 가', '予約なし', '予約なしで', '不预订', '没预订'],
  parking: ['park', 'car', '주차', '차 ', '駐車', '车', '停车'],
  smoke: ['smok', 'cigar', 'vape', '흡연', '담배', '전자담배', '喫煙', 'タバコ', '吸烟', '抽烟', '烟'],
  group: ['group', 'private', 'party', 'birthday', 'hire', 'rent', '단체', '대관', '생일', '파티', '団体', '貸切', '誕生日', '包场', '团体', '生日'],
  fee: ['fee', 'cover', 'entry', 'free', 'charge', 'price to enter', '입장료', '무료', '돈 내', '料金', '入場料', '無料', '门票', '入场费', '免费'],
  foreign: ['foreign', 'tourist', 'passport', 'korean only', '외국인', '여권', '관광', '外国', 'パスポート', '観光', '护照', '游客', '外国人'],
  hours: ['hour', 'open', 'close', 'what time', 'when', '영업', '시간', '몇시', '언제', '오픈', '마감', '営業', '時間', '何時', '营业', '几点', '时间'],
  music: ['music', 'genre', 'hip', 'edm', 'house', 'r&b', 'kpop', 'k-pop', '음악', '장르', '힙합', '노래', '音楽', 'ジャンル', '音乐', '风格'],
  timetable: ['dj', 'timetable', 'line up', 'lineup', 'who play', '타임테이블', '라인업', '디제이', 'タイムテーブル', '出演', '时间表', '阵容'],
  table: ['table', 'book', 'reserv', 'bottle', 'vip', 'guest', 'list', '테이블', '예약', '바틀', '게스트', 'テーブル', '予約', 'ボトル', '卡座', '预订', '订座', '酒'],
  location: ['where', 'address', 'location', 'direction', 'station', 'subway', 'metro', 'how to get', 'map', '위치', '주소', '어디', '가는', '역', '지하철', '찾아', '場所', '住所', '行き方', '駅', '地址', '位置', '怎么去', '地铁', '在哪'],
};
const CHAT_LOC = {
  ko: '부산 부산진구 중앙대로680번가길 52, 2·3층이에요. 서면역 3번 출구에서 걸어서 3분이에요.',
  en: '52 Jungang-daero 680beonga-gil, Busanjin-gu, Busan (2F–3F). 3 min walk from Seomyeon Station Exit 3.',
  ja: '釜山 釜山鎮区 中央大路680番街キル52の2・3階です。西面駅3番出口から徒歩3分です。',
  zh: '釜山 釜山镇区 中央大路680番街路52号 2–3楼，西面站3号出口步行3分钟。',
};
const CHAT_LOC_Q = { ko: '위치·가는 길', en: 'Location & directions', ja: '場所・行き方', zh: '位置与交通' };
const CHAT_UI = {
  ko: { title: '그루브 안내', hi: '안녕하세요! GROOVE N SPOT 안내예요. 궁금한 걸 누르거나 입력해 주세요.', ph: '예: 영업시간, 여권, 예약', fallback: '그 질문은 제가 정확히 답하기 어려워요. 예약 페이지나 WhatsApp·인스타 DM으로 물어봐 주시면 담당자가 답해 드려요.', book: '예약하기', map: '지도 열기' },
  en: { title: 'Groove Guide', hi: 'Hi! This is the GROOVE N SPOT guide. Tap a question or type yours.', ph: 'e.g. hours, passport, table', fallback: "I can't answer that one for sure. Ask us on WhatsApp or Instagram DM, or use the booking page — our team will reply.", book: 'Book now', map: 'Open map' },
  ja: { title: 'GROOVE案内', hi: 'こんにちは！GROOVE N SPOTの案内です。質問を選ぶか入力してください。', ph: '例：営業時間、パスポート、予約', fallback: 'その質問には正確にお答えできません。WhatsAppかInstagramのDM、または予約ページからお問い合わせください。担当者が返信します。', book: '予約する', map: '地図を開く' },
  zh: { title: 'GROOVE 指南', hi: '你好！这里是GROOVE N SPOT指南。点选或输入你的问题。', ph: '例如：营业时间、护照、预订', fallback: '这个问题我无法准确回答。请通过WhatsApp或Instagram私信，或在预订页面联系我们，工作人员会回复你。', book: '立即预订', map: '打开地图' },
};
const CHAT_TOP = ['hours', 'location', 'foreign', 'fee', 'dress', 'table', 'music', 'timetable'];
for (const lang of LANGS) {
  const items = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((i) => ({ id: CHAT_IDS[i], q: t(lang, `faq.q${i}`), a: t(lang, `faq.a${i}`) }));
  items.push({ id: 'location', q: CHAT_LOC_Q[lang], a: `${CHAT_LOC[lang]} <a href="${GMAP}" target="_blank" rel="noopener">${CHAT_UI[lang].map} →</a>` });
  for (const it of items) { it.k = CHAT_KW[it.id]; if (CHAT_TOP.includes(it.id)) it.top = 1; }
  items.sort((a, b) => (CHAT_TOP.indexOf(a.id) + 99 * !a.top) - (CHAT_TOP.indexOf(b.id) + 99 * !b.top));
  write(`assets/chat-${lang}.json`, JSON.stringify({ ui: CHAT_UI[lang], reserve: href(lang, 'reserve/'), items }));
}
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
// 이벤트 상세 버튼 아이콘 (선 아이콘 · 2026-11-20 리디자인)
const EV_SVG = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const EV_ICO = { cal: EV_SVG('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'), music: EV_SVG('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'), list: EV_SVG('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'), pin: EV_SVG('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'), nav: EV_SVG('<path d="m3 11 19-9-9 19-2-8z"/>') };
// 파티 날 사진 전부 (대표 지시 2026-11-19 20:13): flyer = 카드 표지(파티 포스터), more = 같이 보여 줄 사진(그날 타임테이블 등)
const moreOf = (e) => (Array.isArray(e.more) ? e.more : []).filter((x) => typeof x === 'string' && /^\/assets\//.test(x) && x !== e.flyer);
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
    const tt = floors.map((f) => { const rows = (day[f] || []).slice().sort((a, b) => nmin(a.t) - nmin(b.t)); const names = (e.lineup && e.lineup[f]) || []; if (!rows.length && !names.length) return ''; return `<div class="tt-col ${f === '2F' ? 'g' : 's'}"><p class="tt-h">${f}${f === '2F' ? ' GROOVE<small>HIPHOP · R&amp;B</small>' : ' SPOT<small>EDM</small>'}</p>${rows.length ? `<ul class="tt">${rows.map((r) => `<li><span class="tm">${esc(r.t)}</span><span class="nm">${esc(r.n)}</span></li>`).join('')}</ul>` : `<ul>${names.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`}</div>`; }).join('');
    const inTT = JSON.stringify(day).toUpperCase();
    const extra = Object.keys(e.lineup || {}).filter((k) => !floors.includes(k)).map((k) => { const rest = e.lineup[k].filter((n) => !inTT.includes(String(n).toUpperCase())); return rest.length ? `<div class="tt-col x"><p class="tt-h">${k === 'GUEST' ? 'SPECIAL GUEST' : esc(k)}</p><ul>${rest.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''; }).join('');
    const names = [...new Set([...Object.values(e.lineup || {}).flat(), ...Object.values(day).flat().map((r) => r.n)])].filter(Boolean);
    const photos = albums.flatMap((a) => a.photos).slice(0, 12);
    const desc = `${pickL(e.desc, lang) || e.title} — ${dLabel(e.date, lang)} · ${EV_DESC[lang]}. ${names.length ? 'DJ: ' + names.slice(0, 12).join(', ') : ''}`.trim();
    const EI = EV_INFO[lang];
    const evInfo = `<div class="evd-sec"><h2 class="sec-h">${EI.h}</h2><dl class="hours guide-quick">${EI.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><p><a class="more" href="${href(lang, 'guide/')}">${EI.more}: ${GUIDE[lang].t} →</a></p></div>`;
    const ld = { '@context': 'https://schema.org', '@type': 'MusicEvent', name: `${e.title} · Groove & Spot`, startDate: `${e.date}T${e.open || '21:30'}:00+09:00`, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', isAccessibleForFree: true, description: desc, url: `${SITE}${href(lang, page)}`, image: e.flyer ? [e.flyer, ...moreOf(e)].map((x) => SITE + x) : [SITE + '/assets/og.png'], location: { '@type': 'NightClub', name: 'Groove & Spot', address: { '@type': 'PostalAddress', streetAddress: '52 Jungang-daero 680beonga-gil', addressLocality: 'Busanjin-gu, Busan', addressCountry: 'KR' } }, organizer: { '@type': 'Organization', name: 'Groove & Spot', url: SITE + '/' }, performer: names.slice(0, 30).map((n) => ({ '@type': 'PerformingGroup', name: n })) };
    const body = `<article class="evd wrap" data-ev-date="${e.date}">
  <div class="evd-hero"${e.flyer ? ` style="--bg:url(${esc(e.flyer)})"` : ''}><div class="ev-art full">${e.flyer ? `<img src="${esc(e.flyer)}" alt="${esc(e.title)} · Groove &amp; Spot Busan ${esc(e.date)}" loading="eager">` + moreOf(e).map((x, i) => `<img src="${esc(x)}" alt="${esc(e.title)} · Groove &amp; Spot Busan ${esc(e.date)} (${i + 2})" loading="lazy">`).join('') : ''}</div></div>
  <div class="evd-body">
    <div class="chips evd-tags">${floors.map((f) => `<span class="chip ${f === '2F' ? 'g' : 's'}">${f}${f === '2F' ? ' HIPHOP' : ' EDM'}</span>`).join('')}</div>
    <h1>${esc(e.title)}</h1>
    <p class="evd-when">${EV_ICO.cal}${esc(dLabel(e.date, lang))}${e.open ? ` · OPEN ${esc(e.open)}` : ''}</p>
    ${e.desc ? `<p class="lede">${esc(pickL(e.desc, lang))}</p>` : ''}
    <div class="evd-act"><a class="btn btn-hot btn-lg evd-main" href="${href(lang, 'reserve/')}?date=${e.date}">${EV_ICO.cal}${L('cta.reserve') || L('nav.reserve')}</a><a class="btn btn-lg" href="${href(lang, 'request/')}">${EV_ICO.music}${L('nav.request')}</a><a class="btn btn-lg" href="${href(lang, 'events/')}">${EV_ICO.list}${L('ev.all')}</a></div>
    ${tt || extra ? `<div class="evd-sec"><h2 class="sec-h"><span class="evd-kick">TIMETABLE</span>${L('sec.timetable')}</h2><div class="lineup">${tt}${extra}</div></div>` : ''}
    ${photos.length ? `<div class="evd-sec"><h2 class="sec-h">${L('ev.photos')}</h2><div class="ph-grid">${photos.map((p) => `<a class="ph" href="${href(lang, 'gallery/')}#${esc(albums[0].id || '')}"><img src="${esc(p.thumb || p.src)}" alt="${esc(albums[0].title)} · Busan nightclub Groove &amp; Spot" loading="lazy" decoding="async"${p.w ? ` width="${p.w}" height="${p.h}"` : ''}></a>`).join('')}</div><p><a class="more" href="${href(lang, 'gallery/')}#${esc(albums[0].id || '')}">${L('ev.more')} →</a></p></div>` : ''}
    ${evInfo}
    <div class="evd-sec evd-visit"><h2 class="sec-h"><span class="evd-kick">FIND US</span>${L('sec.visit')}</h2><p class="evd-addr">${EV_ICO.pin}<span>Groove &amp; Spot · ${esc(L('if.addr'))}<small>${esc(L('if.near'))}</small></span></p><div class="evd-vb"><a class="btn" href="${GMAP_DIR}" rel="noopener">${EV_ICO.nav}${L('cta.map')}</a><a class="btn" href="${href(lang, 'info/')}">${L('nav.info')} →</a></div></div>
    <div class="evd-sec evd-more" data-ev-more="${esc(id)}" hidden></div>
  </div>
</article>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
    write(join(lang === 'ko' ? '' : lang, page, 'index.html'), layout(lang, page, { title: `${e.title} · ${dLabel(e.date, lang)} · ${SEO_EV[lang]}`, desc, body, active: 'events/' }));
  }
}

// 검색 유입용 안내 글 (guide/<slug>/)
const artPages = [];
for (const a of ARTICLES) {
  const page = `guide/${a.slug}/`;
  artPages.push(page);
  for (const lang of LANGS) {
    const A = a[lang], U = ART_UI.related[lang];
    const fill = (html) => html.replace(/%%a:([a-z0-9-]+)%%/g, (_, s) => href(lang, `guide/${s}/`)).replace(/%%(events|info|reserve|guide|floors|menu|request|privacy)%%/g, (_, p) => href(lang, `${p}/`))
      .replace(/%%(youtube|ytmusic|soundcloud)%%/g, (_, k) => ({ youtube: YOUTUBE, ytmusic: YTMUSIC, soundcloud: SOUNDCLOUD })[k]);
    const others = ARTICLES.filter((x) => x !== a);
    const body = `<article>
<section class="phead wrap"><h1>${A.h1}</h1><p class="lede">${A.lede}</p><p class="muted">${ART_UI.updated[lang]}: ${a.date}</p></section>
${A.secs.map(([h, b], i) => `<section class="wrap sec" aria-labelledby="a${i}"><h2 class="sec-h" id="a${i}">${h}</h2><div class="prose">${fill(b)}</div></section>`).join('\n')}
<section class="wrap sec"><div class="row-btns"><a class="btn btn-hot" href="${href(lang, 'events/')}">${U[0]} →</a><a class="btn" href="${href(lang, 'info/')}">${U[1]} →</a><a class="btn" href="${href(lang, 'reserve/')}">${U[2]} →</a><a class="btn" href="${href(lang, 'guide/')}">${U[3]} →</a></div></section>
${others.length ? `<section class="wrap sec" aria-labelledby="a-more"><h2 class="sec-h" id="a-more">${ART_UI.more[lang]}</h2><div class="prose"><ul>${others.map((x) => `<li><a href="${href(lang, `guide/${x.slug}/`)}">${esc(x[lang].t)}</a></li>`).join('')}</ul></div></section>` : ''}
</article>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: A.h1, description: A.s, inLanguage: HTML_LANG[lang], datePublished: a.date, dateModified: a.date, author: { '@type': 'Organization', name: 'Groove & Spot' }, publisher: { '@type': 'Organization', name: 'Groove & Spot', logo: { '@type': 'ImageObject', url: SITE + '/assets/icon-512.png' } }, image: SITE + '/assets/og.png', mainEntityOfPage: SITE + href(lang, page), about: { '@type': 'NightClub', name: 'Groove & Spot', url: SITE + '/' } }).replace(/</g, '\\u003c')}</script>`;
    write(join(lang === 'ko' ? '' : lang, page, 'index.html'), layout(lang, page, { title: A.t, desc: A.s, body, active: 'guide/' }));
  }
}

const smPages = [...PAGES.filter((p) => p !== 'event/'), ...artPages, ...evPages];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${smPages.flatMap((p) => LANGS.map((l) => `  <url><loc>${SITE}${href(l, p)}</loc><lastmod>${today}</lastmod>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${HTML_LANG[a]}" href="${SITE}${href(a, p)}"/>`).join('')}</url>`)).join('\n')}
  <url><loc>${SITE}/club/</loc><lastmod>${today}</lastmod></url>
  <url><loc>${SITE}/partners/</loc><lastmod>${today}</lastmod></url>
</urlset>
`);
// 다음 웹마스터도구 소유 인증 (2026-11-19) — robots.txt 맨 아래에 있어야 함
const DAUM_WMT = '#DaumWebMasterTool:f335e90dae51bde47b4d54d26c59e9f7fe6f58658c687280b2e9cb4a026775bc:MqfNpbtb2g8b8TIcUfNFlQ==';
write('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /staff/\nDisallow: /keep/\nDisallow: /me/\nSitemap: ${SITE}/sitemap.xml\n\n${DAUM_WMT}\n`);

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
<link rel="stylesheet" href="/assets/shell.css?v=${VERSION}">
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
  <button role="tab" data-tab="seats" aria-selected="false">🪑 자리 최소금액</button>
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
    <p class="muted small adm-auto" id="tt-auto"></p>
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
      <label class="full">포스터 · 타임테이블 이미지 (선택, 세로 이미지) <span class="muted small">타임테이블이 적힌 포스터를 올리면 오늘·내일 이벤트는 매시간(오후 2시~새벽 2시) 자동으로 읽어서 🎧 DJ 타임테이블에 넣어요.</span><input name="flyerFile" type="file" accept="image/*"></label>
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

<section data-panel="seats" hidden>
  <div class="adm-login" data-need-login></div>
  <div data-when-login hidden>
    <div class="adm-bar">
      <div class="tabs" id="st-floor"><button data-f="2F" class="tab-g" aria-selected="true">2F · GROOVE</button><button data-f="3F" class="tab-s" aria-selected="false">3F · SPOT</button></div>
      <a class="btn" href="/seats/" target="_blank" rel="noopener">손님 화면 보기</a>
    </div>
    <p class="muted small">자리 고르기 페이지에 보이는 자리별 최소 주문 금액이에요. 단위는 <b>만원</b>이고, 평일(일~목)과 주말(금·토)을 따로 넣어요. 한쪽만 넣으면 두 요일 모두 같은 금액으로 보여요.</p>
    <div class="st-list" id="st-list"></div>
    <div class="adm-act"><button class="btn btn-hot" id="st-save" type="button">2F · 3F 모두 저장</button></div>
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
