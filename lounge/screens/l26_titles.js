(function (L) {
  const words = {
    collection: ['칭호 컬렉션', 'Title collection', '称号コレクション', '称号收藏'],
    count: ['{n}개 보유', '{n} earned', '{n}個獲得', '已获得 {n} 个'],
    all: ['전체', 'All', 'すべて', '全部'],
    milestone: ['기념', 'Milestones', '記念', '纪念'],
    season: ['{year} 시즌', '{year} seasons', '{year}年シーズン', '{year} 年赛季'],
    special: ['특별', 'Special', '特別', '特别'],
    normal: ['노말', 'Normal', 'ノーマル', '普通'],
    rare: ['레어', 'Rare', 'レア', '稀有'],
    epic: ['에픽', 'Epic', 'エピック', '史诗'],
    legend: ['레전드', 'Legend', 'レジェンド', '传奇'],
    visits: ['인증 방문 {n}회', '{n} verified visits', '認証済み来店 {n} 回', '验证到访 {n} 次'],
    weeks: ['매주 인증 방문 {n}주 연속', 'Verified visits in {n} consecutive weeks', '{n} 週連続で認証済み来店', '连续 {n} 周验证到访'],
    votes: ['층 투표 {n}회', '{n} floor votes', 'フロア投票 {n} 回', '楼层投票 {n} 次'],
    reviews: ['유효한 DJ 리뷰 {n}회', '{n} valid DJ reviews', '有効なDJレビュー {n} 件', '有效 DJ 评价 {n} 次'],
    attendance: ['앱 출석 누적 {n}일', '{n} days of app check-in', 'アプリ出席 通算 {n} 日', '累计打卡 {n} 天'],
    days: ['앱 출석 {n}일 연속', '{n} consecutive check-in days', 'アプリ出席 {n} 日連続', '连续打卡 {n} 天'],
    quarter: ['분기 인증 방문 {n}회', '{n} verified visits in the quarter', '四半期に認証済み来店 {n} 回', '季度内验证到访 {n} 次'],
    opening: ['오픈 후 30일 내 가입', 'Join within 30 days of opening', 'オープン後30日以内に登録', '开业后 30 天内注册'],
    birthday: ['생일 확인 기능 준비 중', 'Birthday verification pending', '誕生日の確認機能を準備中', '生日验证功能筹备中'],
    vip: ['VIP 등급', 'VIP membership', 'VIP会員', 'VIP 会员'],
    vvip: ['VVIP 등급', 'VVIP membership', 'VVIP会員', 'VVIP 会员'],
    revoked: ['회수됨', 'Revoked', '取り消し済み', '已撤销'],
    representative: ['대표 칭호', 'Representative title', '代表称号', '代表称号'],
    none: ['선택한 칭호 없음', 'No title selected', '称号は未選択', '未选择称号'],
    show: ['대표 칭호 공개', 'Show title by my nickname', 'ニックネームの横に表示', '在昵称旁公开显示'],
    select: ['대표로 설정', 'Set as title', '代表に設定', '设为代表'],
    clear: ['대표 해제', 'Clear title', '代表を解除', '取消代表'],
    saved: ['저장했어요.', 'Saved.', '保存しました。', '已保存。'],
    unavailable: ['선택할 수 없는 칭호예요.', 'This title is unavailable.', 'この称号は選択できません。', '无法选择此称号。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, i) => [
    lang, Object.fromEntries(Object.entries(words).map(([key, values]) => ['l26titles.' + key, values[i]]))
  ])));
  const text = (key, vars) => L.t('l26titles.' + key, vars);
  const e = (key, vars) => L.esc(text(key, vars));
  const num = value => new Intl.NumberFormat(L.lang).format(value);
  const name = (title, lang = L.lang) => title?.name?.[lang] || title?.name?.ko || '';
  const media = new Set(['normal', 'rare', 'epic', 'legend', 'special']);
  const canShow = () => L.open('l26_titles') && !L.previewMode();
  const effect = id => id === 'vip' || id === 'vvip' ? ' data-title-effect="' + id + '"' : '';

  function medal(title) {
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(title.id) || !media.has(title.rarity)) return '';
    return '<span class="l26-title-medal" aria-hidden="true" data-rarity="' + title.rarity + '"' + effect(title.id) +
      '><img src="/lounge/assets/titles/' + title.id + '.webp" loading="lazy" decoding="async" alt="">' +
      (title.id === 'vvip' ? '<i class="l26-title-sparkles"></i>' : '') + '</span>';
  }

  L.titleChip = function (title, locale) {
    if (!canShow() || !title || !/^[a-z][a-z0-9_]{0,40}$/.test(title.id) || !media.has(title.rarity)) return '';
    const label = name(title, locale);
    if (!label) return '';
    return '<span class="l26-title-chip" data-rarity="' + title.rarity + '"' + effect(title.id) + '>' +
      '<span class="l26-title-dot" aria-hidden="true"></span><span>' + L.esc(label) + '</span></span>';
  };

  document.addEventListener('load', event => {
    if (event.target.matches?.('.l26-title-medal img')) event.target.classList.add('is-loaded');
  }, true);
  document.addEventListener('error', event => {
    if (event.target.matches?.('.l26-title-medal img')) event.target.remove();
  }, true);

  if ('IntersectionObserver' in window && 'MutationObserver' in window) {
    const selector = '[data-title-effect]';
    const visibility = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) target.toggleAttribute('data-title-visible', isIntersecting);
    });
    const watch = (node, add) => {
      if (node.nodeType !== 1) return;
      const sync = element => add ? visibility.observe(element) : visibility.unobserve(element);
      if (node.matches(selector)) sync(node);
      for (const element of node.querySelectorAll(selector)) sync(element);
    };
    new MutationObserver(records => {
      for (const { addedNodes, removedNodes } of records) {
        for (const node of removedNodes) watch(node, false);
        for (const node of addedNodes) watch(node, true);
      }
    }).observe(document.getElementById('view'), { subtree: true, childList: true });
    // Profile headers are inside the view. Removing their nodes releases observation.
  }

  L.mountTitleCollection = async function (container) {
    if (!container || !canShow()) return;
    container.innerHTML = '<a class="l26-title-entry" href="#/l26_titles"><strong>' + e('collection') +
      '</strong><span data-title-count>' + L.esc(L.t('core.loading')) + '</span></a>';
    const data = await L.api('l26_titles_get');
    if (!container.isConnected) return;
    if (!canShow() || data.error === 'closed' || data.error === 'preview') return container.replaceChildren();
    const count = container.querySelector('[data-title-count]');
    if (data.ok) count.textContent = text('count', { n: num(data.count) });
    else count.remove();
  };

  function card(item, index, chosen) {
    const earned = item.earned_at !== null;
    const progress = !earned && !item.disabled ? '<span class="l26-title-progress"><progress aria-label="' +
      L.esc(name(item)) + '" value="' + L.esc(item.progress) + '" max="' + L.esc(item.target) + '"></progress><span>' +
      L.esc(num(item.progress) + '/' + num(item.target)) + '</span></span>' : '';
    return '<li class="l26-title-card" data-rarity="' + item.rarity + '"' + (chosen ? ' data-selected' : '') +
      (earned ? ' data-earned' : '') + '>' + medal(item) + '<div class="l26-title-info"><span class="l26-title-detail">' +
      e(item.rarity) + (item.season ? ' · ' + L.esc(item.season) : '') + '</span><h2>' + L.esc(name(item)) + '</h2><p>' +
      e(item.rule, { n: num(item.target) }) + '</p>' + progress +
      (item.disabled && item.rule !== 'birthday' ? '<span class="l26-title-detail">' + e('revoked') + '</span>' : '') + '</div>' +
      (earned ? '<button type="button" data-title-select="' + index + '" aria-pressed="' + chosen +
        '" aria-label="' + L.esc(name(item) + ' · ' + text(chosen ? 'clear' : 'select')) + '">' +
        e(chosen ? 'representative' : 'select') + '</button>' : '') + '</li>';
  }

  async function render(root) {
    const back = L.open('l26_shell') ? 'l26_my' : 'me';
    root.innerHTML = L.bar({ back, title: text('collection') }) +
      '<section class="l26-titles"><p role="status">' + L.esc(L.t('core.loading')) + '</p></section>';
    const content = root.querySelector('.l26-titles');
    let data = await L.api('l26_titles_get');
    if (!content.isConnected) return;
    if (!data.ok) {
      content.innerHTML = '<p role="status">' + L.esc(L.errorText(data)) + '</p><button type="button" data-title-retry>' + e('retry') + '</button>';
      content.querySelector('button').onclick = () => render(root);
      return;
    }
    let filter = 'all', updating = false;
    function draw(message = '', focus = '') {
      const { items, count, preference } = data;
      const years = [...new Set(items.filter(item => item.season).map(item => item.season.slice(0, 4)))].sort().reverse();
      const tabs = [['all', text('all')], ['milestone', text('milestone')],
        ...years.map(year => [year, text('season', { year })]), ['special', text('special')]];
      if (tabs.every(([key]) => key !== filter)) filter = 'all';
      const isSelected = item => item.id === preference.title_id && item.season === preference.season;
      const selected = items.find(isSelected);
      content.innerHTML = '<p class="l26-title-count">' + e('count', { n: num(count) }) +
        '</p><section class="l26-title-settings" aria-label="' + e('representative') +
        '"><div><strong>' + e('representative') + '</strong><p>' + (selected ? L.esc(name(selected)) : e('none')) +
        '</p></div>' + (selected ? '<button type="button" data-title-clear>' + e('clear') + '</button>' : '') +
        '<label><input type="checkbox" data-title-public' + (preference.is_public ? ' checked' : '') + '>' + e('show') +
        '</label></section><p class="l26-title-status" role="status">' + L.esc(message) +
        '</p><div class="l26-title-filters" role="group" aria-label="' + e('collection') + '">' +
        tabs.map(([key, label]) => '<button type="button" data-title-filter="' + key + '" aria-pressed="' +
          (filter === key) + '">' + L.esc(label) + '</button>').join('') + '</div><ul class="l26-title-grid">' +
        items.map((item, index) => filter === 'all' || item.category === filter || item.season.startsWith(filter + '-')
          ? card(item, index, isSelected(item)) : '').join('') + '</ul>';
      if (focus) content.querySelector(focus)?.focus({ preventScroll: true });
    }
    async function save(body, focus) {
      if (updating) return;
      updating = true;
      content.setAttribute('aria-busy', 'true');
      const result = await L.api('l26_title_set', body);
      if (!content.isConnected) return;
      updating = false;
      content.removeAttribute('aria-busy');
      if (!result.ok) return draw(result.error === 'title_unearned' ? text('unavailable') : L.errorText(result), focus);
      data = result;
      if (L.me) {
        const selection = data.preference;
        const item = selection.is_public && data.items.find(row => row.id === selection.title_id && row.season === selection.season);
        L.me.representative_title = item ? { id: item.id, rarity: item.rarity, name: item.name, season: item.season } : null;
      }
      draw(text('saved'), focus);
    }
    content.onchange = event => {
      if (event.target.matches('[data-title-public]')) void save({ is_public: event.target.checked }, '[data-title-public]');
    };
    content.onclick = event => {
      const control = event.target.closest('button');
      if (!control || updating) return;
      if (control.hasAttribute('data-title-clear')) {
        void save({ title_id: null }, '[data-title-public]');
      } else if (control.dataset.titleFilter) {
        filter = control.dataset.titleFilter;
        draw('', '[data-title-filter="' + filter + '"]');
      } else if (control.hasAttribute('data-title-select')) {
        const index = control.dataset.titleSelect;
        const item = data.items[index];
        const selected = control.getAttribute('aria-pressed') === 'true';
        void save(selected ? { title_id: null } : { title_id: item.id, season: item.season }, '[data-title-select="' + index + '"]');
      }
    };
    draw();
  }

  L.screen('l26_titles', { title: 'l26titles.collection', nav: 'me', bar: 'own', auth: true, render });
})(window.Lounge);
