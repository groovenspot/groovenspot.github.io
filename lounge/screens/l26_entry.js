(function (L) {
  let generator;

  function loadGenerator() {
    if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
    generator ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-generator-1.4.4.js';
      script.onload = () => typeof window.qrcode === 'function' ? resolve(window.qrcode) : reject(new Error('qr'));
      script.onerror = reject;
      document.head.append(script);
    }).catch(error => { generator = null; throw error; });
    return generator;
  }

  function draw(canvas, make, value) {
    const qr = make(0, 'M');
    qr.addData(value, 'Byte');
    qr.make();
    const size = qr.getModuleCount(), cell = 8;
    canvas.width = canvas.height = (size + 8) * cell;
    const pen = canvas.getContext('2d');
    pen.fillStyle = '#fff';
    pen.fillRect(0, 0, canvas.width, canvas.height);
    pen.fillStyle = '#000';
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) pen.fillRect((col + 4) * cell, (row + 4) * cell, cell, cell);
    }
  }

  L.showEntryQr = function () {
    if (!L.me) return L.needLogin();
    if (!L.open('l26_entry')) return;
    const member = L.me.id;
    const text = (ko, en) => L.lang === 'ko' ? ko : en;
    const title = text('입장 QR', 'Entry QR');
    const panel = L.sheet('<h2>' + title + '</h2><div class="pf-qr">' +
      '<p>' + text('입구 직원에게 QR을 보여 주세요.', 'Show this QR to the entrance staff.') + '</p>' +
      '<canvas data-entry-qr role="img" aria-label="' + title + '" style="width:min(100%, 272px)" hidden></canvas>' +
      '<p data-entry-countdown aria-hidden="true"></p><p data-entry-status role="status"></p>' +
      '<button class="btn" data-entry-refresh type="button">' + text('새 QR 받기', 'Get a new QR') + '</button></div>', { close: true });
    const canvas = panel.querySelector('canvas');
    const status = panel.querySelector('[data-entry-status]');
    const countdown = panel.querySelector('[data-entry-countdown]');
    const refresh = panel.querySelector('button[data-entry-refresh]');
    const live = () => panel.isConnected && L.me?.id === member;
    let timer;

    function clear() {
      clearInterval(timer);
      canvas.hidden = true;
      canvas.width = 0;
      countdown.textContent = '';
    }

    async function issue() {
      clear();
      refresh.disabled = true;
      status.textContent = text('QR 발급 중…', 'Getting your QR…');
      try {
        const make = await loadGenerator();
        if (!live()) return;
        const result = await L.api('l26_entry_issue');
        if (!live()) return;
        if (!result.ok || !Number.isSafeInteger(result.expires_at) || !/^l26\.[A-Za-z0-9_-]{43}$/.test(result.qr)) {
          status.textContent = result.error === 'closed' ? text('입장 QR 기능이 꺼져 있어요.', 'Entry QR is unavailable.') : L.errorText(result);
          return;
        }
        // Use the server expiry and also cap the display to a minute on a slow device clock.
        const expiresAt = Math.min(result.expires_at, Date.now() + 60_000);
        draw(canvas, make, result.qr);
        canvas.hidden = false;
        status.textContent = '';
        const tick = () => {
          if (!live()) return clear();
          const seconds = Math.ceil((expiresAt - Date.now()) / 1000);
          if (seconds <= 0) {
            clear();
            status.textContent = text('QR이 만료됐어요. 새 QR을 받아 주세요.', 'QR expired. Get a new code.');
          } else countdown.textContent = text(seconds + '초 남음', seconds + ' seconds left');
        };
        timer = setInterval(tick, 250);
        tick();
      } catch {
        if (live()) status.textContent = text('QR을 표시하지 못했어요. 다시 시도해 주세요.', 'Could not show the QR. Try again.');
      } finally {
        if (live()) refresh.disabled = false;
      }
    }
    refresh.onclick = issue;
    issue();
  };
})(window.Lounge);
