// 정적 페이지 생성기 (의존성 없음). 실행: node src/build.mjs
// 언어별(ko는 루트, en/ja/zh는 하위 폴더) HTML을 만든다.
// 이벤트·타임테이블·아티스트·영상·메뉴는 data/*.json 에서 브라우저가 직접 읽으므로,
// 일정만 바꿀 때는 빌드할 필요 없이 data 파일만 고치면 된다.

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, LANG_LABEL, HTML_LANG, T, t } from './i18n.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groovenspot.github.io';
const INSTAGRAM = 'https://www.instagram.com/groovenspot/';
const SOUNDCLOUD = 'https://on.soundcloud.com/IWtEmqOHfTecbn1cBI';
const PHONE = '0507-1301-5970';
const ADDR_KO = '부산 부산진구 중앙대로680번가길 52';
const VERSION = Date.now().toString(36);

const PAGES = ['', 'events/', 'event/', 'floors/', 'artists/', 'reserve/', 'info/'];
const prefix = (lang) => (lang === 'ko' ? '' : `/${lang}`);
const href = (lang, page) => `${prefix(lang)}/${page}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(lang, page, { title, desc, body, active }) {
  const L = (k) => t(lang, k);
  const runtime = Object.fromEntries(Object.keys(T.ko).filter((k) => k.startsWith('rt.')).map((k) => [k.slice(3), L(k)]));
  const nav = [
    ['events/', 'nav.events'], ['floors/', 'nav.floors'], ['artists/', 'nav.artists'], ['info/', 'nav.info'],
  ];
  const fullTitle = title ? `${title} · Groove & Spot` : L('site.title');
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${SITE}${href(l, page)}">`).join('\n');
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0909">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || L('site.desc'))}">
<link rel="canonical" href="${SITE}${href(lang, page)}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE}/${page}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Groove & Spot">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc || L('site.desc'))}">
<meta property="og:url" content="${SITE}${href(lang, page)}">
<meta property="og:image" content="${SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/icon.png">
<link rel="apple-touch-icon" href="/assets/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112..125,500..900&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/site.css?v=${VERSION}">
</head>
<body data-page="${page.replace(/\/$/, '') || 'home'}">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <a class="brand" href="${href(lang, '')}" aria-label="Groove & Spot home"><span class="b-g">GROOVE</span><span class="b-amp">&amp;</span><span class="b-s">SPOT</span></a>
  <nav class="nav" aria-label="Main">
    ${nav.map(([p, k]) => `<a href="${href(lang, p)}"${active === p ? ' aria-current="page"' : ''}>${L(k)}</a>`).join('\n    ')}
  </nav>
  <details class="lang">
    <summary aria-label="Language">${lang.toUpperCase()}</summary>
    <div class="lang-menu">
      ${LANGS.map((l) => `<a href="${href(l, page)}" hreflang="${HTML_LANG[l]}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_LABEL[l]}</a>`).join('\n      ')}
    </div>
  </details>
  <a class="btn btn-hot hdr-cta" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
</header>
<main id="main">
${body}
</main>
<footer class="ftr">
  <div class="ftr-grid">
    <div>
      <a class="brand brand-lg" href="${href(lang, '')}"><span class="b-g">GROOVE</span><span class="b-amp">&amp;</span><span class="b-s">SPOT</span></a>
      <p class="muted">${L('if.addr')}<br>${L('if.near')}</p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.hours')}</h2>
      <p>${L('hr.weekday')} 21:30 – 06:00<br>${L('hr.weekend')} 21:00 – 07:00<br><span class="muted">${L('hr.always')}</span></p>
    </div>
    <div>
      <h2 class="ftr-h">${L('sec.contact')}</h2>
      <p><a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br><a href="${INSTAGRAM}" rel="noopener">Instagram @groovenspot</a><br><a href="${SOUNDCLOUD}" rel="noopener">SoundCloud</a></p>
    </div>
  </div>
  <p class="ftr-small muted"><a href="/floor/">${L('ft.floor')}</a> · ${L('ft.age')} · © 2026 Groove &amp; Spot</p>
</footer>
<nav class="dock" aria-label="Quick actions">
  <a href="${href(lang, 'events/')}">${L('cta.tonight')}</a>
  <a class="dock-hot" href="${href(lang, 'reserve/')}">${L('cta.reserve')}</a>
  <a href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('cta.map')}</a>
</nav>
<div class="gate" id="gate" hidden>
  <div class="gate-box" role="dialog" aria-modal="true" aria-labelledby="gate-q">
    <p class="gate-badge">19+</p>
    <h2 id="gate-q">${L('gate.q')}</h2>
    <p class="muted">${L('gate.d')}</p>
    <div class="gate-act"><a class="btn" href="https://www.google.com/">${L('gate.no')}</a><button class="btn btn-hot" type="button" id="gate-yes">${L('gate.yes')}</button></div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.GS=${JSON.stringify({ lang, root: prefix(lang), phone: PHONE, instagram: INSTAGRAM, t: runtime })};</script>
<script src="/assets/site.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

const floorCard = (lang, f) => {
  const L = (k) => t(lang, k);
  return `<article class="floor floor-${f === '2F' ? 'g' : 's'}">
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

const BODIES = {
  '': (lang) => {
    const L = (k) => t(lang, k);
    return `<section class="hero">
  <div class="hero-eq" aria-hidden="true"><div class="eq eq-g">${bars(14)}</div><div class="eq eq-s">${bars(14)}</div></div>
  <div class="hero-in wrap">
    <p class="kicker">${L('hero.kicker')}</p>
    <h1 class="hero-title"><span class="b-g">GROOVE</span><span class="b-amp">&amp;</span><span class="b-s">SPOT</span></h1>
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
<section class="wrap sec" aria-labelledby="sets-h">
  <h2 class="sec-h" id="sets-h">${L('sec.sets')}</h2>
  <div class="videos" data-videos data-limit="3"></div>
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
      <a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a>
      <a class="btn" href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a>
    </div>
  </div>
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
    <div class="fbig-head"><p class="floor-no">${f}</p><h2 class="fbig-name">${L(`floor.${f}.name`)}</h2><p class="floor-genre">${L(`floor.${f}.genre`)}</p></div>
    <div class="fbig-body"><p class="lede">${L(`floor.${f}.long`)}</p>${am(keys)}
      <div class="tt-today" data-floor-tt="${f}"></div>
    </div>
  </div>
</section>`;
    return `${pageHead(lang, 'floors')}
${block('2F', ['dj', 'bar', 'h', 'stage', 'table', 'dart'])}
${block('3F', ['dj', 'bar', 'stage', 'table', 'photo', 'smk'])}`;
  },

  'artists/': (lang) => `${pageHead(lang, 'artists')}
<section class="wrap sec"><div class="artists" data-artists></div></section>`,

  'reserve/': (lang) => {
    const L = (k) => t(lang, k);
    const opt = (v, k) => `<option value="${v}">${k}</option>`;
    return `${pageHead(lang, 'reserve')}
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
    <div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="2F" class="tab-g">2F · HIPHOP</button><button role="tab" aria-selected="false" data-tab="3F" class="tab-s">3F · EDM</button></div>
  </div>
  <p class="muted small" data-svc="2F">${L('bt.svc2')}</p>
  <p class="muted small" data-svc="3F" hidden>${L('bt.svc3')}</p>
  <div data-menu></div>
  <p class="muted small">${L('mn.note')}</p>
</section>`;
  },

  'info/': (lang) => {
    const L = (k) => t(lang, k);
    return `${pageHead(lang, 'info')}
<section class="wrap sec info-grid">
  <div class="panel"><h2 class="sec-h">${L('sec.visit')}</h2>
    <p>${L('if.addr')}<br><span class="muted">${L('if.near')}</span></p>
    <div class="row-btns"><a class="btn" href="https://map.kakao.com/link/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.kakao')}</a><a class="btn" href="https://map.naver.com/v5/search/${encodeURIComponent(ADDR_KO)}" rel="noopener">${L('map.naver')}</a></div>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.hours')}</h2>
    <dl class="hours"><dt>${L('hr.weekday')}</dt><dd>21:30 – 06:00</dd><dt>${L('hr.weekend')}</dt><dd>21:00 – 07:00</dd></dl>
    <p class="muted">${L('hr.always')}</p>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.policy')}</h2>
    <ul class="checks"><li>${L('pol.age')}</li><li>${L('pol.dress')}</li><li>${L('pol.respect')}</li></ul>
  </div>
  <div class="panel"><h2 class="sec-h">${L('sec.contact')}</h2>
    <p><a href="tel:${PHONE.replace(/-/g, '')}">${PHONE}</a><br><a href="${INSTAGRAM}" rel="noopener">Instagram @groovenspot</a><br><a href="${SOUNDCLOUD}" rel="noopener">SoundCloud</a></p>
  </div>
</section>
<section class="wrap sec" aria-labelledby="faq-h">
  <h2 class="sec-h" id="faq-h">${L('sec.faq')}</h2>
  <div class="faq">
    ${[1, 2, 3, 4, 5, 6].map((i) => `<details><summary>${L(`faq.q${i}`)}</summary><p>${L(`faq.a${i}`)}</p></details>`).join('\n    ')}
  </div>
</section>`;
  },
};

const TITLES = { '': null, 'events/': 'page.events.t', 'event/': 'page.event.t', 'floors/': 'page.floors.t', 'artists/': 'page.artists.t', 'reserve/': 'page.reserve.t', 'info/': 'page.info.t' };

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
      title: titleKey ? t(lang, titleKey) : null,
      desc: titleKey && page !== 'event/' ? t(lang, `page.${page.replace('/', '')}.s`) : null,
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

console.log(`built ${LANGS.length * PAGES.length + 1} pages`);
