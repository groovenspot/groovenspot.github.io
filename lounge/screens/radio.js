(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('radio', {
    title: ['그루브 라디오', 'Groove Radio'], app: ['유튜브 앱으로 열기', 'Open in the YouTube app'],
    back: ['놀거리', 'Play'], workout: ['운동', 'Workout'], work: ['작업', 'Work'],
    drive: ['드라이브', 'Drive'], late: ['새벽 GROOVE', 'Late-night GROOVE'],
    sessions: ['GROOVE SESSIONS 전체', 'All GROOVE SESSIONS'],
    edm: ['3F EDM', '3F EDM'], hiphop: ['2F 힙합', '2F Hip-hop'],
    earned: ['라디오 {n}P 받았어요', 'Radio earned you {n}P']
  });
  const origin = 'https://www.youtube.com';
  const interval = 30 * 60_000;
  let cleanup;

  function playlist(value) {
    if (typeof value !== 'string') return '';
    if (/^[\w-]{2,100}$/.test(value)) return value;
    const safe = U.url(value);
    if (!safe) return '';
    const parsed = new URL(safe);
    const id = parsed.searchParams.get('list');
    return ['www.youtube.com', 'youtube.com', 'music.youtube.com', 'youtu.be'].includes(parsed.hostname) &&
      /^[\w-]{2,100}$/.test(id || '') ? id : '';
  }

  async function render(root) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/play', t('back')));
    const data = await L.api('config');
    if (!view.isConnected) return;
    const lists = (data?.radio || []).map(item => ({ ...item, id: playlist(item.playlist) })).filter(item => item.id);
    if (!lists.length) {
      view.innerHTML = U.status(data?.error && data.error !== 'action' ? 'error' : 'empty');
      return;
    }
    const defaultLabels = { sessions: 'GROOVE SESSIONS 전체', edm: '3F EDM', hiphop: '2F HIP-HOP' };
    const label = item => ['workout', 'work', 'drive', 'late'].includes(item.key) ||
      (Object.hasOwn(defaultLabels, item.key) && item.label === defaultLabels[item.key])
      ? t(item.key) : L.esc(item.label || item.key);
    view.innerHTML = '<div data-player style="' + U.card + '"></div><div style="display:grid;gap:8px">' +
      lists.map((item, i) => U.button(label(item), 'data-radio="' + i + '"')).join('') + '</div>';
    const player = view.querySelector('[data-player]');
    const buttons = [...view.querySelectorAll('[data-radio]')];
    let playingSince = null, elapsed = 0, timer, handshake, frame;

    function stopClock() {
      clearTimeout(timer);
      if (playingSince != null) elapsed += performance.now() - playingSince;
      playingSince = null;
    }
    function startClock() {
      if (playingSince != null) return;
      playingSince = performance.now();
      timer = setTimeout(async () => {
        if (!view.isConnected) return;
        elapsed = 0;
        playingSince = null;
        startClock();
        if (!L.me) return;
        const result = await L.api('radio_tick');
        if (view.isConnected && Number(result?.gained) > 0) L.toast(L.t('radio.earned', { n: result.gained }));
      }, Math.max(0, interval - elapsed));
    }
    function receive(event) {
      if (event.origin !== origin || event.source !== frame?.contentWindow) return;
      let message = event.data;
      if (typeof message === 'string') {
        try { message = JSON.parse(message); } catch { return; }
      }
      if (!message || typeof message !== 'object') return;
      const state = message.event === 'onStateChange' ? message.info : message.info?.playerState;
      if (typeof state !== 'number') return;
      clearInterval(handshake);
      if (state === 1) startClock();
      else stopClock();
    }
    window.addEventListener('message', receive);
    cleanup = () => {
      stopClock();
      clearInterval(handshake);
      window.removeEventListener('message', receive);
    };
    function select(i, autoplay) {
      stopClock();
      clearInterval(handshake);
      const item = lists[i];
      const query = new URLSearchParams({
        list: item.id, enablejsapi: '1', origin: location.origin, playsinline: '1', autoplay: autoplay ? '1' : '0'
      });
      player.innerHTML = '<h2>' + label(item) + '</h2><iframe title="' + label(item) +
        '" style="' + U.media + ';aspect-ratio:16/9" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src="' +
        L.esc(origin + '/embed/videoseries?' + query) + '"></iframe><p>' +
        U.link(origin + '/playlist?list=' + encodeURIComponent(item.id), t('app')) + '</p>';
      const app = player.querySelector('a');
      app.target = '_blank';
      app.rel = 'noopener noreferrer';
      frame = player.querySelector('iframe');
      let attempts = 0;
      handshake = setInterval(() => {
        if (++attempts > 15) clearInterval(handshake);
        frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), origin);
        frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), origin);
      }, 500);
      buttons.forEach((button, index) => button.setAttribute('aria-pressed', i === index));
    }
    buttons.forEach((button, index) => { button.onclick = () => select(index, true); });
    select(0, false);
  }
  L.screen('radio', { nav: 'play', auth: false, title: 'radio.title', render, leave() { cleanup?.(); cleanup = undefined; } });
})();
