// Shared markup and interactions for the guest screens, loaded first by lounge/index.html.
const LoungeScreenUI = (() => {
  const L = Lounge;
  function words(prefix, entries) {
    const ko = {}, en = {};
    for (const [key, [korean, english]] of Object.entries(entries)) {
      ko[prefix + '.' + key] = korean;
      en[prefix + '.' + key] = english;
    }
    L.i18n({ ko, en });
    return (key, vars) => L.esc(L.t(prefix + '.' + key, vars));
  }
  const t = words('screens', {
    loading: ['불러오는 중', 'Loading'], empty: ['아직 없어요', 'Nothing here yet'],
    error: ['불러오지 못했어요. 다시 시도해 주세요.', 'Could not load. Please try again.'],
    failed: ['처리하지 못했어요. 다시 시도해 주세요.', 'Could not complete. Please try again.'],
    liveUnavailable: ['실시간 연결이 끊겼어요. 새로 고침해서 최신 내용을 볼 수 있어요.', 'Live updates are unavailable. Refresh to see the latest messages.'],
    reportUnavailable: ['이 항목은 더 이상 신고할 수 없어요.', 'This item can no longer be reported.'],
    reportLimit: ['오늘 신고할 수 있는 횟수를 다 썼어요.', 'You’ve reached today’s reporting limit.'],
    dup: ['오늘은 이미 했어요.', 'You already did this today.'],
    saved: ['완료했어요', 'Saved'], close: ['닫기', 'Close'], soon: ['준비 중', 'Coming soon'],
    report: ['신고하기', 'Report'], reason: ['이유를 골라 주세요', 'Choose a reason'],
    ad: ['광고', 'Spam'], sexual: ['성적인 내용', 'Sexual content'], abuse: ['괴롭힘', 'Harassment'],
    illegal: ['불법 내용', 'Illegal content'], etc: ['기타', 'Other'], me: ['사진 속 사람이 저예요', 'I’m in this photo']
  });
  const card = 'padding:16px;margin:12px 0;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow-wrap:anywhere';
  const media = 'display:block;width:100%;border:0;border-radius:14px';
  const status = (key, waiting = false) => '<p class="muted" role="status"' +
    (waiting ? ' data-loading' : '') + '>' + t(key) + '</p>';
  const button = (label, attrs = '', hot = false) =>
    '<button type="button" class="btn' + (hot ? ' btn-hot' : '') + '" ' + attrs + '>' + label + '</button>';
  const link = (href, label) => '<a class="btn" href="' + L.esc(href) + '">' + label + '</a>';

  function mount(root, heading) {
    const view = document.createElement('section');
    view.style.cssText = 'max-width:640px;margin:auto;overflow-wrap:anywhere';
    view.innerHTML = heading + '<div data-content>' + status('loading', true) + '</div>';
    root.replaceChildren(view);
    return view.querySelector('[data-content]');
  }
  function url(value) {
    if (typeof value !== 'string' || !value) return '';
    try {
      const parsed = new URL(value, location.href);
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(parsed.hostname))) return parsed.href;
    } catch { /* Invalid media URL. */ }
    return '';
  }
  function image(value) {
    if (typeof value !== 'string' || !value) return '';
    return url(/^(?:https?:\/\/|\/)/i.test(value) ? value : L.img(value));
  }
  function error(response) {
    if (response?.error === 'auth') L.needLogin();
    else L.toast(L.t('screens.' + (response?.error === 'dup' ? 'dup' : 'failed')));
  }
  function sheet(html) {
    const el = L.sheet(button(t('close'), 'data-c-close') + html);
    el.querySelector('[data-c-close]').onclick = () => L.closeSheet();
    return el;
  }
  function reason({ title, reasons, submit, done }) {
    const el = sheet('<h2>' + title + '</h2><form><label>' + t('reason') +
      '<select name="why" required><option value="">—</option>' +
      reasons.map(why => '<option value="' + why + '">' + t(why) + '</option>').join('') +
      '</select></label><button class="btn btn-hot" style="margin-top:12px">' + title + '</button></form>');
    el.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const send = form.querySelector('button');
      if (send.disabled) return;
      send.disabled = true;
      const result = await submit(form.elements.why.value);
      if (!el.isConnected) return;
      send.disabled = false;
      if (['target', 'not_found', 'busy'].includes(result?.error)) {
        L.toast(L.t(result.error === 'busy' ? 'screens.reportLimit' : 'screens.reportUnavailable'));
        return;
      }
      if (!result || result.error) return error(result);
      L.closeSheet();
      L.toast(L.t('screens.saved'));
      done?.();
    };
  }
  function report(kind, id) {
    if (L.needLogin()) return;
    reason({ title: t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
      submit: why => L.api('report', { kind, id, why }) });
  }
  function time(at, options) {
    const date = new Date(at);
    return at && Number.isFinite(date.getTime())
      ? L.esc(new Intl.DateTimeFormat(document.documentElement.lang || navigator.language,
          { timeZone: 'Asia/Seoul', ...options }).format(date)) : '';
  }
  return { words, t, card, media, status, button, link, mount, url, image, error, sheet, reason, report, time };
})();

(() => {
  const L = Lounge;
  const U = LoungeScreenUI;
  const t = U.words('tonight', {
    open: ['영업 중', 'Open now'], closed: ['영업 전·종료', 'Closed'], unknown: ['영업 정보 없음', 'Hours unavailable'],
    now: ['지금 DJ', 'Now playing'], next: ['다음 DJ', 'Up next'], crowd0: ['정보 없음', 'Unknown'],
    crowd1: ['여유', 'Quiet'], crowd2: ['보통', 'Moderate'], crowd3: ['꽉 참', 'Full'],
    line: ['입구 줄', 'Entry queue'], none: ['줄 없음', 'No queue'], mins: ['약 {n}분', 'About {n} min'],
    live: ['매장 영상', 'Club live'], liveSlide: ['매장 영상 {n} / {total}', 'Club media {n} of {total}'],
    sound: ['매장 영상 소리', 'Club video sound'], soundOff: ['소리 켜기', 'Turn sound on'], soundOn: ['소리 끄기', 'Turn sound off'],
    share: ['공유', 'Share'], shareReady: ['지금 공유', 'Share now'], shareSave: ['저장', 'Save'],
    shareUnsupported: ['이 폰은 바로 공유가 안 돼요. 영상 저장 후 인스타에서 올려 주세요.', 'This phone can’t share directly. Save the video and upload it from Instagram.'],
    shareProgress: ['준비 중 {n}%', 'Preparing {n}%'], shareError: ['파일을 준비하지 못했어요.', 'Could not prepare the files.'],
    timetable: ['타임테이블', 'Timetable'],
    poster: ['파티 포스터', 'Party poster'], posterZoom: ['포스터 크게 보기', 'View poster full size'],
    going: ['갈래요', 'I’m going'], undo: ['갈래요 취소', 'Cancel going'],
    people: ['{n}명 갈래요', '{n} going'], friends: ['같이 가는 친구', 'Friends going'],
    stale: ['마지막으로 받은 정보예요', 'Showing the last update'],
    safety: ['안심 버튼', 'Call club security'], djs: ['DJ 목록', 'DJs']
  });
  function timetableMarkup(slots) {
    return '<h2>' + t('timetable') + '</h2>' +
      (slots?.length ? '<ul style="' + U.card + ';padding-left:36px">' + slots.map(slot =>
        '<li>' + L.esc(slot.at) + ' · ' + L.esc(slot.floor) + ' · ' + L.esc(slot.dj) + '</li>').join('') + '</ul>' :
        U.status('empty'));
  }

  function paintSchedule(section, { poster, timetable }) {
    const image = U.url(poster?.url);
    const fallback = () => { section.innerHTML = timetableMarkup(timetable); };
    if (!image) return fallback();
    const desc = poster.desc?.[L.lang] || poster.desc?.en || poster.desc?.ko;
    const caption = L.esc([poster.title, desc].filter(Boolean).join(' · '));
    const src = L.esc(image);
    section.innerHTML = '<h2>' + t('poster') + '</h2><figure style="margin:0">' +
      '<button type="button" data-poster-zoom aria-label="' + t('posterZoom') +
      '" style="display:block;width:100%;padding:0;border:0;border-radius:14px;background:transparent;cursor:zoom-in">' +
      '<img alt="" loading="lazy" style="' + U.media + '" src="' + src + '"></button>' +
      (caption ? '<figcaption title="' + caption + '" style="margin:8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        caption + '</figcaption>' : '') + '</figure>';
    section.querySelector('img').addEventListener('error', fallback, { once: true });
    section.querySelector('[data-poster-zoom]').onclick = () => {
      const panel = U.sheet('<h2>' + (L.esc(poster.title) || t('poster')) + '</h2>' +
        '<img alt="" style="' + U.media + '" src="' + src + '">' +
        (desc ? '<p>' + L.esc(desc) + '</p>' : ''));
      panel.style.width = 'min(100%, 960px)';
    };
  }
  function liveItems(lives) {
    return (lives || []).slice().sort((a, b) => b.at - a.at).flatMap(live => {
      const videos = (Array.isArray(live.vids) ? live.vids : [live.vid]).map(U.url).filter(Boolean);
      const photos = (Array.isArray(live.imgs) ? live.imgs : [live.img]).map(U.url).filter(Boolean);
      const photo = photos[0];
      const files = videos.map(url => ({ url, video: true })).concat(photos.map(url => ({ url })));
      const info = { floor: live.floor, at: live.at, files };
      return videos.length ? videos.map(url => ({ ...info, url, video: true })) : photo ? [{ ...info, url: photo }] : [];
    });
  }

  function mountLive(section, items, previous) {
    section.hidden = !items.length;
    if (!items.length) { section.replaceChildren(); return null; }
    const label = i => t('liveSlide', { n: i + 1, total: items.length });
    section.innerHTML = '<h2>' + t('live') + '</h2><div class="tonight-live-rail">' +
      items.map((item, i) => '<figure class="tonight-live-slide" aria-label="' + label(i) + '">' +
        (item.video ? '<video muted playsinline loop preload="none"></video>' :
          '<img loading="lazy" alt="" src="' + L.esc(item.url) + '">') +
        '<figcaption>' + (item.floor ? L.esc(item.floor) + ' · ' : '') +
        U.time(item.at, { timeStyle: 'short' }) + '</figcaption></figure>').join('') +
      '</div><div class="tonight-live-controls"><div class="tonight-live-dots">' +
      items.map((_, i) => '<button type="button" data-live-dot="' + i + '" aria-label="' + label(i) + '"></button>').join('') +
      '</div><span class="tonight-live-count" aria-hidden="true"></span>' +
      '<div class="tonight-live-actions"><button type="button" class="btn tonight-live-sound" aria-label="' + t('sound') + '"></button>' +
      (window.GrooveMediaShare ? items.map(() => '<button type="button" class="btn tonight-live-share" hidden></button>').join('') : '') + '</div></div>';

    const rail = section.querySelector('.tonight-live-rail');
    const slides = [...rail.children];
    const dots = [...section.querySelectorAll('[data-live-dot]')];
    const sound = section.querySelector('.tonight-live-sound');
    const count = section.querySelector('.tonight-live-count');
    const shares = [...section.querySelectorAll('.tonight-live-share')];
    shares.forEach((button, i) => {
      const item = items[i];
      GrooveMediaShare.bind(button, {
        items: item.files.map(({ url, video }, file) => ({
          name: 'groove_' + (video ? 'video_' : 'photo_') + (file + 1), video,
          load: progress => GrooveMediaShare.fetchBlob(url, progress)
        })),
        labels: { share: L.t('tonight.share'), ready: L.t('tonight.shareReady'), save: L.t('tonight.shareSave'),
          progress: n => L.t('tonight.shareProgress', { n }), unsupported: () => L.toast(L.t('tonight.shareUnsupported')), error: () => L.toast(L.t('tonight.shareError')) }
      });
    });
    let index = Math.max(0, items.findIndex(item => item.url === previous?.url));
    let audible = previous?.audible === true;
    let visible = false;
    let disposed = false;
    const activeVideo = () => slides[index].querySelector('video');

    function paintSound() {
      sound.hidden = !items[index].video;
      sound.setAttribute('aria-pressed', String(audible));
      sound.textContent = audible ? L.t('tonight.soundOn') : L.t('tonight.soundOff');
    }

    function syncPlayback() {
      const video = activeVideo();
      if (!video) return;
      if (!visible || document.hidden) { video.pause(); return; }
      if (!video.hasAttribute('src')) video.src = items[index].url;
      video.muted = !audible;
      video.play()?.catch(() => {
        if (disposed || video !== activeVideo() || !visible || document.hidden || !audible) return;
        audible = false;
        video.muted = true;
        paintSound();
        video.play()?.catch(() => {});
      });
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (disposed || entry.target !== activeVideo()) return;
      visible = entry.intersectionRatio >= .5;
      syncPlayback();
    }, { threshold: .5 });

    function activate(next) {
      const oldVideo = activeVideo();
      if (oldVideo) { oldVideo.autoplay = false; oldVideo.pause(); }
      observer.disconnect();
      visible = false;
      index = next;
      slides.forEach((slide, i) => { slide.inert = i !== index; });
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      const dot = dots[index], dotsRail = dot.parentElement;
      dotsRail.scrollLeft = dot.offsetLeft - dotsRail.clientWidth / 2 + dot.offsetWidth / 2;
      shares.forEach((button, i) => { button.hidden = i !== index; });
      count.textContent = (index + 1) + ' / ' + items.length;
      const video = activeVideo();
      if (video) {
        video.muted = !audible;
        video.autoplay = true;
        observer.observe(video);
      }
      paintSound();
    }

    rail.addEventListener('scroll', () => {
      if (!rail.clientWidth) return;
      const next = Math.max(0, Math.min(items.length - 1, Math.round(rail.scrollLeft / rail.clientWidth)));
      if (next !== index) activate(next);
    }, { passive: true });
    dots.forEach((dot, i) => { dot.onclick = () => { rail.scrollLeft = i * rail.clientWidth; }; });
    sound.onclick = () => {
      audible = !audible;
      paintSound();
      syncPlayback();
    };
    document.addEventListener('visibilitychange', syncPlayback);
    rail.scrollLeft = index * rail.clientWidth;
    activate(index);
    return {
      selection: () => ({ url: index ? items[index].url : null, audible }),
      dispose() {
        disposed = true;
        observer.disconnect();
        document.removeEventListener('visibilitychange', syncPlayback);
        const video = activeVideo();
        if (video) { video.autoplay = false; video.pause(); }
      }
    };
  }

  let timer;
  let lastGoing;
  let livePlayer;

  function render(root) {
    const actions = '<div class="shell-actions">' + U.link('#/djs', t('djs')) +
      (L.open('safety') ? U.link('#/safety', t('safety')) : '') + '</div>';
    const view = U.mount(root, '<h1>' + L.esc(L.t('nav.tonight')) + '</h1>' + actions);
    let data;
    let pending = false;
    let updating = false;
    let revision = 0;
    let liveKey;
    const going = () => Boolean(L.me && (data.going?.me ??
      (lastGoing?.day === data.day && lastGoing?.member === L.me.id && lastGoing?.value)));

    function paintGoing() {
      const el = view.querySelector('[data-going]');
      const summary = data.going || {};
      el.innerHTML = U.button(t(going() ? 'undo' : 'going'), 'aria-pressed="' + Boolean(going()) + '"', true) +
        ' <strong>' + t('people', { n: Number(summary.n) || 0 }) + '</strong>' +
        (summary.friends?.length ? '<div>' + t('friends') + ' · ' + summary.friends.map(nick =>
          U.link('#/u/' + encodeURIComponent(nick), L.esc(nick))).join(' ') + '</div>' : '');
      el.querySelector('button').onclick = async event => {
        if (L.needLogin() || updating) return;
        const button = event.currentTarget;
        const value = !going();
        const member = L.me?.id;
        updating = button.disabled = true;
        revision++;
        const result = await L.api(value ? 'going' : 'going_off');
        updating = false;
        if (!view.isConnected) return;
        button.disabled = false;
        if (!result || result.error) return U.error(result);
        lastGoing = { day: data.day, member, value };
        data.going = { ...result, me: value };
        paintGoing();
      };
    }

    async function refresh() {
      if (pending || updating) return;
      pending = true;
      const requested = revision;
      const result = await L.api('tonight');
      pending = false;
      if (!view.isConnected || updating || requested !== revision) return;
      if (!result || result.error) {
        if (!data) view.innerHTML = U.status(result?.error === 'action' ? 'empty' : 'error') + '<div data-going></div>';
        data ||= {};
        paintGoing();
        return;
      }
      data = result;
      const stamp = /^\d{4}-\d{2}-\d{2}$/.test(data.day || '') ? U.time(data.day + 'T12:00:00+09:00', { dateStyle: 'full' }) : '';
      if (!view.querySelector('[data-tonight-live]')) {
        view.innerHTML = '<div data-tonight-info></div><section data-tonight-live hidden></section><section data-tonight-schedule></section>';
      }
      view.querySelector('[data-tonight-info]').innerHTML = '<p class="muted">' + stamp + '</p><div style="' + U.card + '"><strong style="color:' +
        (data.open ? 'var(--ok)' : 'var(--muted)') + '">● ' + t(data.open === true ? 'open' : data.open === false ? 'closed' : 'unknown') +
        '</strong> · ' + L.esc(data.hours) + (data.stale ? '<p class="muted">' + t('stale') + '</p>' : '') +
        '</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        ['2F', '3F'].map((floor, i) => {
          const info = data.floors?.[floor] || {};
          const crowd = [1, 2, 3].includes(info.crowd) ? info.crowd : 0;
          return '<article style="' + U.card + ';margin:0;border-top:3px solid var(--' + (i ? 's' : 'g') + ')"><strong>' +
            floor + (i ? ' SPOT' : ' GROOVE') + '</strong><div><small class="muted">' + t('now') + '</small><br><b>' +
            L.esc(info.now || '—') + '</b></div><div><small class="muted">' + t('next') + '</small><br>' +
            L.esc([info.next, info.nextAt].filter(Boolean).join(' · ') || '—') + '</div><p>' + t('crowd' + crowd) +
            '<br><meter style="width:100%" min="0" max="3" value="' + crowd + '" aria-label="' + t('crowd' + crowd) +
            '"></meter></p></article>';
        }).join('') + '</div><p style="' + U.card + '">' + t('line') + ' · <b>' +
        (['10', '30'].includes(data.line) ? t('mins', { n: data.line }) : data.line === 'none' ? t('none') : t('crowd0')) +
        '</b></p><div data-going style="' + U.card + '"></div>';
      const items = liveItems(data.lives);
      const key = JSON.stringify(items);
      if (key !== liveKey) {
        liveKey = key;
        const previous = livePlayer?.selection();
        livePlayer?.dispose();
        livePlayer = mountLive(view.querySelector('[data-tonight-live]'), items, previous);
      }
      paintSchedule(view.querySelector('[data-tonight-schedule]'), data);
      paintGoing();
    }
    refresh();
    timer = setInterval(refresh, 60_000);
  }

  L.screen('tonight', { nav: 'tonight', auth: false, title: 'nav.tonight', render, leave() {
    clearInterval(timer);
    livePlayer?.dispose();
    livePlayer = null;
  } });
})();

// iOS may resize only the visual viewport when browser controls or the keyboard appear.
(() => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement;
  const textEntry = 'textarea, input:not([type]), input[type=text], input[type=tel], input[type=password], input[type=number], input[type=search]';

  function updateViewport() {
    const unzoomed = Math.abs(viewport.scale - 1) < .05;
    const inset = unzoomed ? Math.max(0, root.clientHeight - viewport.height - viewport.offsetTop) : 0;
    const focused = document.activeElement;
    const keyboard = unzoomed && root.clientHeight - viewport.height > 120 && focused?.matches(textEntry);
    root.style.setProperty('--lounge-bottom-inset', inset + 'px');
    root.style.setProperty('--lounge-visual-height', (unzoomed ? viewport.height * .9 : root.clientHeight * .9) + 'px');
    root.toggleAttribute('data-lounge-keyboard', Boolean(keyboard));
    return keyboard ? focused : null;
  }

  function revealFocused() {
    const focused = updateViewport();
    if (!focused) return;
    const overlap = focused.getBoundingClientRect().bottom - (viewport.offsetTop + viewport.height - 12);
    if (overlap <= 0) return;
    const panel = focused.closest('#sheet > .in');
    if (panel) panel.scrollTop += overlap;
    else window.scrollBy(0, overlap);
  }

  viewport.addEventListener('resize', revealFocused);
  viewport.addEventListener('scroll', updateViewport);
  document.addEventListener('focusin', revealFocused);
  document.addEventListener('focusout', () => requestAnimationFrame(updateViewport));
  updateViewport();
})();
