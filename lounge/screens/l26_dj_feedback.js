(function (L) {
  'use strict';

  const strings = {
    title: ['DJ 세트 평가', 'DJ set review', 'DJセットの評価', 'DJ演出评价'],
    help: ['현장에서 직접 들은 공연만 평가해 주세요.', 'Please rate only sets you heard in person.', '会場で実際に聴いたセットだけを評価してください。', '请只评价你亲自在现场听过的演出。'],
    again: ['다시 듣고 싶어요', 'Would listen again', 'また聴きたい', '想再听一次'],
    good: ['괜찮았어요', 'It was good', 'よかった', '感觉不错'],
    miss: ['아쉬웠어요', 'Could be better', '少し物足りなかった', '还有提升空间'],
    saved: ['평가를 남겼어요.', 'Review saved.', '評価を保存しました。', '评价已保存。'],
    empty: ['지금 평가할 수 있는 공연이 없어요.', 'There are no sets available to review right now.', '現在評価できるセットはありません。', '当前没有可评价的演出。'],
    failed: ['잠시 후 다시 시도해 주세요.', 'Please try again in a moment.', 'しばらくしてからもう一度お試しください。', '请稍后重试。'],
    unavailable: ['이 공연은 지금 평가할 수 없어요.', 'This set is no longer available to review.', 'このセットは現在評価できません。', '当前无法评价这场演出。'],
    reminder: ['DJ 평가 알림 받기', 'DJ review reminders', 'DJ評価の通知を受け取る', '接收DJ演出评价提醒'],
    inboxOnly: ['앱 알림함에서 받아요.', 'Delivered to your in-app inbox.', 'アプリ内の通知一覧で受け取れます。', '提醒仅显示在应用内通知中心。'],
    preview: ['미리보기', 'Preview', 'プレビュー', '预览']
  };
  const languages = ['ko', 'en', 'ja', 'zh'];
  L.i18n(Object.fromEntries(languages.map((lang, index) => [lang,
    Object.fromEntries(Object.entries(strings).map(([key, values]) => ['djReview.' + key, values[index]]))])));
  const choices = [['again', '🔥'], ['good', '👍'], ['miss', '🤔']];
  const flag = 'l26_dj_feedback';
  const t = key => L.t('djReview.' + key);
  const esc = L.esc;
  const clock = (value, withDate) => new Intl.DateTimeFormat(L.lang, {
    timeZone: 'Asia/Seoul', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
    ...(withDate && { month: 'short', day: 'numeric' })
  }).format(value);

  function setMarkup(set, preview) {
    const picked = choices.find(([choice]) => choice === set.choice);
    const controls = picked
      ? '<p class="dj-review-saved" role="status">' + picked[1] + ' ' + esc(t(picked[0])) + ' · ' + esc(t('saved')) + '</p>'
      : '<div class="dj-review-actions">' + choices.map(([choice, emoji]) =>
        '<button type="button" class="btn" data-dj-choice="' + choice + '"' + (preview ? ' disabled' : '') +
        '><span aria-hidden="true">' + emoji + '</span> ' + esc(t(choice)) + '</button>').join('') +
        '</div><p class="muted" data-dj-error role="status" hidden></p>';
    return '<article class="dj-review-card" data-dj-set="' + esc(set.set_id) + '"><h3>' + esc(set.dj_name) +
      '</h3><p class="muted">' + esc(set.floor) + ' · ' + esc(clock(set.starts_at, true)) + '–' +
      esc(clock(set.ends_at, false)) + ' KST</p>' + controls + '</article>';
  }

  function mount(root, surface) {
    let pending = false, posting = 0, snapshot = '', stopped = false, expiryTimer;
    const active = () => root.isConnected && !stopped;
    async function refresh() {
      if (!active() || pending || posting) return;
      clearTimeout(expiryTimer);
      const enabled = L.open(flag) && L.me;
      if (!enabled) { root.hidden = true; return; }
      pending = true;
      const data = await L.api('l26_dj_feedback', { surface });
      pending = false;
      if (!active() || !L.open(flag)) { root.hidden = true; return; }
      const sets = data.sets || [];
      if (!data.ok || (surface !== 'inbox' && !sets.length)) {
        root.hidden = surface !== 'inbox' || ['closed', 'auth'].includes(data.error);
        if (!root.hidden) root.innerHTML = '<p role="status">' + esc(t('failed')) + '</p>';
        snapshot = '';
        return;
      }
      root.hidden = false;
      if (!data.preview && sets.length) {
        const expiry = Math.min(...sets.map(set => set.expires_at));
        expiryTimer = setTimeout(refresh, Math.max(1000, expiry - data.server_now));
      }
      const next = JSON.stringify([L.lang, data.preview, sets]);
      if (snapshot === next) return;
      snapshot = next;
      root.innerHTML = (surface === 'inbox' ? '' : '<h2>' + esc(t('title')) + '</h2>') +
        (sets.length ? '<p class="muted">' + esc(t('help')) + '</p>' +
          (data.preview ? '<p class="muted">' + esc(t('preview')) + '</p>' : '') +
          '<div class="dj-review-list">' + sets.map(set => setMarkup(set, data.preview)).join('') + '</div>'
          : '<p>' + esc(t('empty')) + '</p>');
    }

    root.classList.add('dj-review');
    root.onclick = async event => {
      const button = event.target.closest('[data-dj-choice]');
      if (!button || button.disabled || !active() || !L.open(flag) || L.isPreview()) return;
      const card = button.closest('[data-dj-set]');
      const buttons = [...card.querySelectorAll('button')];
      buttons.forEach(item => { item.disabled = true; });
      posting++;
      const result = await L.api('l26_dj_rate', { set_id: card.dataset.djSet, choice: button.dataset.djChoice });
      posting--;
      if (!active() || !card.isConnected) return;
      if (result.ok) {
        const choice = choices.find(([key]) => key === result.choice);
        card.querySelector('.dj-review-actions').outerHTML = '<p class="dj-review-saved" role="status">' +
          (choice ? choice[1] + ' ' + esc(t(choice[0])) + ' · ' : '') + esc(t('saved')) + '</p>';
        card.querySelector('[data-dj-error]').hidden = true;
      } else {
        const permanent = ['missing', 'expired', 'closed', 'ineligible', 'forbidden', 'preview'].includes(result.error);
        const status = card.querySelector('[data-dj-error]');
        status.hidden = false;
        status.textContent = t(permanent ? 'unavailable' : 'failed');
        if (!permanent) buttons.forEach(item => { item.disabled = false; });
      }
      if (result.error === 'closed' || !L.open(flag)) root.hidden = true;
    };
    return { refresh, destroy() { stopped = true; clearTimeout(expiryTimer); root.onclick = null; } };
  }

  L.mountDjFeedback = mount;
  L.djReviewLabel = t;
  let inbox;
  L.screen(flag, {
    title: 'djReview.title', nav: 'me', auth: true,
    render(root) {
      root.innerHTML = L.bar({ title: t('title'), back: 'alerts' }) + '<section data-dj-inbox hidden></section>';
      if (L.open(flag)) {
        inbox = mount(root.querySelector('[data-dj-inbox]'), 'inbox');
        return inbox.refresh();
      }
      L.go('alerts');
    },
    leave() { inbox?.destroy(); inbox = null; }
  });
})(window.Lounge);
