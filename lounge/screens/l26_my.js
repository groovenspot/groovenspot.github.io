(function (L) {
  const copy = {
    entry: ['입장 QR', 'Entry QR', '入場QR', '入场二维码'],
    entryHelp: ['입구 직원에게 QR을 보여 주세요.', 'Show the QR to staff at the entrance.', '入口でスタッフにQRを提示してください。', '请在入口向员工出示二维码。'],
    visits: ['인증 방문', 'Verified visits', '認証済み来店', '已验证到访'],
    history: ['방문 기록', 'Visit history', '来店履歴', '到访记录'],
    empty: ['아직 인증된 방문이 없어요.', 'You have no verified visits yet.', '認証済みの来店はまだありません。', '暂无已验证的到访。'],
    selfCheckins: ['과거 셀프 체크인', 'Past self check-ins', '過去のセルフチェックイン', '以往自助签到'],
    selfCheckinHelp: ['방문 혜택은 인증 방문으로 쌓여요.', 'Verified visits count toward visit benefits.', '認証済み来店で特典を獲得できます。', '已验证到访计入到访权益。'],
    noSelfCheckins: ['과거 셀프 체크인 기록이 없어요.', 'You have no past self check-ins.', '過去のセルフチェックインはありません。', '暂无以往自助签到记录。'],
    points: ['포인트', 'Points', 'ポイント', '积分'],
    next: ['다음 혜택', 'Next benefit', '次の特典', '下一项权益'],
    progress: ['인증 방문 {current}/{target}회', 'Verified visits {current}/{target}', '認証済み来店 {current}/{target}回', '已验证到访 {current}/{target} 次'],
    ready: ['지금 요청할 수 있어요.', 'Available to request.', '今すぐ申請できます。', '现在可以申请。'],
    moreVisits: ['인증 방문 {n}회 더', '{n} more verified visit(s)', '認証済み来店あと{n}回', '还需 {n} 次验证到访'],
    allRequested: ['모든 방문 혜택을 요청했어요.', 'You’ve requested all visit benefits.', 'すべての来店特典を申請しました。', '你已申请所有到访权益。'],
    first_visit: ['첫 방문', 'First visit', '初来店', '首次到访'],
    returning: ['다시 방문', 'Returning guest', '再来店', '再次到访'],
    regular: ['단골', 'Regular', '常連', '常客'],
    benefits: ['내 방문 혜택', 'My visit benefits', '来店特典', '我的到访权益'],
    legacy: ['내 프로필', 'My profile', 'プロフィール', '我的资料'],
    legacyRewards: ['기존 보상', 'Rewards', '既存の特典', '奖励'],
    djs: ['DJ 팔로우', 'Follow DJs', 'DJをフォロー', '关注 DJ'],
    settings: ['알림 설정', 'Notification settings', '通知設定', '通知设置'],
    priority: ['입장 우선', 'Priority entry', '優先入場', '优先入场'],
    upgrade: ['자리 업그레이드', 'Seat upgrade', '座席アップグレード', '座位升级'],
    merch: ['굿즈', 'Merchandise', 'グッズ', '周边'],
    song: ['신청곡권', 'Song request', 'リクエスト曲券', '点歌券'],
    entrance: ['입장 전 입구에서 사용', 'Available at the door before entry', '入場前に入口で利用可能', '入场前可在入口使用'],
    available_seat: ['영업 중 빈자리가 있을 때 적용', 'Subject to seat availability during opening hours', '営業時間中に空席がある場合のみ利用可能', '营业期间有空位时可用'],
    venue_pickup: ['영업 중 재고가 있을 때 매장에서 수령', 'In-person pickup during opening hours, while supplies last', '営業時間中、在庫がある場合に店頭で受け取り可能', '营业期间有库存时可到店领取'],
    dj_acceptance: ['영업 중 DJ가 수락할 때 이용 가능', 'Subject to DJ approval during opening hours', '営業時間中にDJが承認した場合に利用可能', '营业期间经 DJ 同意后可用'],
    validity: ['요청한 영업일부터 {days}일간 유효', 'Valid for {days} business dates from the request date', '申請営業日から{days}日間有効', '自申请营业日起 {days} 天内有效'],
    expires: ['유효기간 {date} 08:00 KST까지', 'Expires {date} at 08:00 KST', '{date} 08:00 KSTまで有効', '有效期至 {date} 08:00 KST'],
    request: ['혜택 요청', 'Request benefit', '特典を申請', '申请权益'],
    available: ['사용 가능', 'Available', '利用可能', '可使用'],
    locked: ['미달성', 'Not yet earned', '未達成', '未达成'],
    requested: ['직원 확인 대기', 'Awaiting staff confirmation', 'スタッフ確認待ち', '等待员工确认'],
    confirmed: ['확인한 직원에게 이 코드를 보여 주세요.', 'Show this code to the staff member who confirmed it.', '確認したスタッフにこのコードを提示してください。', '请向已确认的员工出示此代码。'],
    used: ['사용 완료', 'Used', '使用済み', '已使用'],
    expired: ['만료', 'Expired', '期限切れ', '已过期'],
    showCode: ['직원에게 이 코드를 보여 주세요.', 'Show this code to staff.', 'このコードをスタッフに提示してください。', '请向员工出示此代码。'],
    qualify: ['인증 방문 {target}회를 채워 주세요.', 'Complete {target} verified visits.', '認証済み来店を{target}回達成してください。', '请完成 {target} 次已验证到访。'],
    checkWithStaff: ['매장에서 직원에게 확인해 주세요.', 'Ask staff at the venue.', '店頭でスタッフにご確認ください。', '请在店内向员工确认。'],
    viewProgress: ['방문 진행률 보기', 'View visit progress', '来店の進捗を見る', '查看到访进度'],
    viewNext: ['다음 혜택 보기', 'View next benefit', '次の特典を見る', '查看下一项权益'],
    noBenefits: ['요청한 방문 혜택이 없어요.', 'You have no requested visit benefits.', '申請した来店特典はありません。', '暂无已申请的到访权益。'],
    more: ['이전 방문 더 보기', 'Show earlier visits', '以前の来店を表示', '查看更多到访'],
    refresh: ['새로고침', 'Refresh', '更新', '刷新'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    loading: ['불러오는 중…', 'Loading…', '読み込み中…', '正在加载…']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, i) => [
    lang, Object.fromEntries(Object.entries(copy).map(([key, values]) => ['l26my.' + key, values[i]]))
  ])));

  const text = (key, vars) => L.esc(L.t('l26my.' + key, vars));
  const link = (path, key) => '<a class="btn" href="#/' + path + '">' + text(key) + '</a>';
  const button = (key, attr, hot = false) => '<button type="button" class="btn' + (hot ? ' btn-hot' : '') +
    '" ' + attr + '>' + text(key) + '</button>';
  const formatPoints = value => L.esc(new Intl.NumberFormat(L.lang).format(value));
  const busy = '<p role="status">';
  let qrScript;

  function stylesheet() {
    if (document.getElementById('l26-my-css')) return;
    const css = document.createElement('link');
    css.id = 'l26-my-css';
    css.rel = 'stylesheet';
    css.href = '/lounge/css/l26-my.css';
    document.head.append(css);
  }

  async function openMembershipEntryQr(control) {
    // The existing dialog issues l26_entry_issue. Switch this adapter to the shared ENTRY component.
    control.disabled = true;
    try {
      if (!L.showEntryQr) {
        qrScript ||= new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/lounge/screens/l26_entry.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.append(script);
        }).catch(error => { qrScript = null; throw error; });
        await qrScript;
      }
      if (control.isConnected) L.showEntryQr();
    } catch {
      if (control.isConnected) L.toast(L.t('core.unavailable'));
    } finally {
      control.disabled = false;
    }
  }

  async function legacy(root) {
    history.replaceState(history.state, '', '#/me');
    await L.route();
    if (!L.me || root.isConnected || location.hash !== '#/me') return;
    const member = L.me.id;
    const data = await L.api('l26_benefits');
    if (location.hash === '#/me' && L.me?.id === member && data.ok && data.benefits.length) {
      const panel = document.querySelector('#view > div');
      panel?.insertAdjacentHTML('afterbegin', '<div class="l26-my-legacy">' + link('l26_benefits', 'benefits') + '</div>');
    }
  }

  function frame(root, title) {
    stylesheet();
    root.className = 'l26-screen l26-my';
    root.innerHTML = '<h1>' + title + '</h1><div data-my-content aria-busy="true">' +
      busy + text('loading') + '</p></div><p data-my-status role="status" hidden></p>';
    return root.querySelector('[data-my-content]');
  }

  function showError(root, data) {
    const status = root.querySelector('[data-my-status]');
    status.hidden = false;
    status.textContent = data?.error ? L.errorText(data) : L.t('core.unavailable');
  }

  async function load(root, call) {
    const member = L.me.id;
    const result = await call();
    return root.isConnected && L.me?.id === member ? result : null;
  }

  function visitItems(days) {
    return days.map(day => '<li><time datetime="' + L.esc(day) + '">' + L.esc(day) + '</time></li>').join('');
  }

  function visitHistory(kind, title, dates, empty, next) {
    return '<div class="l26-my-visit-group" data-my-history="' + kind + '"><h3>' + text(title) + '</h3>' +
      (dates.length ? '<ul class="l26-my-history">' + visitItems(dates) + '</ul>' : '<p>' + text(empty) + '</p>') +
      (next ? button('more', 'data-my-more aria-label="' + text('more') + ' · ' + text(title) + '"') : '') + '</div>';
  }

  function bindHistory(root, content, kind, before, cursor, dates, next) {
    const group = content.querySelector('[data-my-history="' + kind + '"]');
    const more = group.querySelector('[data-my-more]');
    if (!more) return;
    more.onclick = async () => {
      more.disabled = true;
      const page = await load(root, () => L.api('l26_return', { [cursor]: before }));
      if (!page) return;
      more.disabled = false;
      if (!page.ok) return showError(root, page);
      group.querySelector('.l26-my-history').insertAdjacentHTML('beforeend', visitItems(page[dates]));
      before = page[next];
      more.hidden = !before;
    };
  }

  function benefitProgress(next, visits) {
    if (!next) return '<p>' + text('allRequested') + '</p>';
    const current = Math.min(visits, next.visits);
    const label = text('progress', { current: formatPoints(current), target: formatPoints(next.visits) });
    return '<h3>' + text(next.key) + '</h3><label class="l26-my-progress"><span>' + label + '</span>' +
      '<progress value="' + L.esc(current) + '" max="' + L.esc(next.visits) + '"></progress></label><p>' +
      (next.status === 'available' ? text('ready') : text('moreVisits', { n: formatPoints(next.visits - visits) })) + '</p>';
  }

  async function renderMy(root) {
    if (!L.open('l26_return')) return legacy(root);
    const content = frame(root, L.esc(L.t('nav.l26_my')));
    const result = await load(root, () => L.api('l26_return'));
    if (!result) return;
    if (result.error === 'closed') return legacy(root);
    content.removeAttribute('aria-busy');
    if (!result.ok) {
      showError(root, result);
      content.innerHTML = button('retry', 'data-my-retry');
      content.querySelector('button').onclick = () => renderMy(root);
      return;
    }

    const badges = result.badges.map(key => '<li>' + text(key) + '</li>').join('');
    content.innerHTML =
      '<section class="l26-my-card l26-my-membership"><div class="l26-my-visit-count"><h2>' + text('visits') +
      '</h2><strong data-my-visits>' + formatPoints(result.visits) + '</strong></div>' +
      '<div class="l26-my-next"><h2>' + text('next') + '</h2>' +
      benefitProgress(result.next_benefit, result.visits) + link('l26_benefits', 'benefits') + '</div></section>' +
      (L.open('l26_entry') ? '<section class="l26-my-card l26-my-entry"><div><h2>' + text('entry') + '</h2><p>' +
        text('entryHelp') + '</p></div>' + button('entry', 'data-my-qr', true) + '</section>' : '') +
      '<section class="l26-my-card l26-my-points"><h2>' + text('points') +
      '</h2><strong>' + formatPoints(result.points) + '</strong></section>' +
      (badges ? '<ul class="l26-my-badges">' + badges + '</ul>' : '') +
      '<section class="l26-my-card"><h2>' + text('history') + '</h2><p class="muted">' + text('selfCheckinHelp') + '</p>' +
      visitHistory('verified', 'visits', result.entries, 'empty', result.next_before) +
      (Array.isArray(result.legacy_checkins)
        ? visitHistory('self', 'selfCheckins', result.legacy_checkins, 'noSelfCheckins', result.next_legacy_before) : '') + '</section>' +
      '<div class="l26-my-links">' + link('me', 'legacy') + (L.open('rewards') ? link('rewards', 'legacyRewards') : '') +
      link('djs', 'djs') + link('me/settings', 'settings') + '</div>';

    const qr = content.querySelector('[data-my-qr]');
    if (qr) qr.onclick = () => openMembershipEntryQr(qr);
    bindHistory(root, content, 'verified', result.next_before, 'before', 'entries', 'next_before');
    if (result.next_legacy_before) {
      bindHistory(root, content, 'self', result.next_legacy_before, 'legacy_before', 'legacy_checkins', 'next_legacy_before');
    }
  }

  function linkToMy(key) {
    const membership = L.open('l26_shell') && L.open('l26_return');
    return link(membership ? 'l26_my' : 'me', membership ? key : 'legacy');
  }

  function benefitAction(item, available, code) {
    switch (item.status) {
      case 'available':
        return available ? button('request', 'data-my-redeem="' + L.esc(item.key) + '"', true) : '';
      case 'locked':
        return '<p>' + text('qualify', { target: formatPoints(item.visits) }) + '</p>';
      case 'requested':
      case 'confirmed':
        return code ? '<p>' + text(item.status === 'confirmed' ? 'confirmed' : 'showCode') +
          ' <strong class="l26-my-code">' + L.esc(code) + '</strong></p>' : '<p>' + text('checkWithStaff') + '</p>';
      case 'used':
        return linkToMy('viewProgress');
      case 'expired':
        return linkToMy('viewNext');
      default:
        return '';
    }
  }

  function benefitCard(item, enabled) {
    const available = item.status === 'available' && enabled;
    const code = ['requested', 'confirmed'].includes(item.status);
    const deadline = item.expires_at
      ? text('expires', { date: new Date(item.expires_at + 9 * 3_600_000).toISOString().slice(0, 10) })
      : text('validity', { days: item.validity_days });
    const state = item.status === 'confirmed' ? 'available' : item.status;
    return '<article class="l26-my-card" data-benefit="' + L.esc(item.key) + '"><div class="l26-my-benefit-heading"><h2>' +
      text(item.key) + '</h2><p data-benefit-status="' + L.esc(state) + '">' + text(state) + '</p></div><p>' +
      text(item.condition) + '</p><p class="muted">' + deadline + '</p><div class="l26-my-benefit-action">' +
      benefitAction(item, available, code && item.code) + '</div></article>';
  }

  async function renderBenefits(root) {
    const content = frame(root, text('benefits'));
    const data = await load(root, () => L.api('l26_benefits'));
    if (!data) return;
    content.removeAttribute('aria-busy');
    if (!data.ok) {
      showError(root, data);
      content.innerHTML = button('retry', 'data-my-retry');
      content.querySelector('button').onclick = () => renderBenefits(root);
      return;
    }
    content.innerHTML = '<div class="l26-my-links">' + linkToMy('legacy') +
      button('refresh', 'data-my-refresh') + '</div>' +
      (data.benefits.map(item => benefitCard(item, data.enabled)).join('') || '<p>' + text('noBenefits') + '</p>');
    content.querySelector('[data-my-refresh]').onclick = () => renderBenefits(root);
    content.querySelectorAll('[data-my-redeem]').forEach(control => {
      control.onclick = async () => {
        control.disabled = true;
        const result = await load(root, () => L.api('l26_redeem', { benefit: control.dataset.myRedeem }));
        if (!result) return;
        if (result.ok) return renderBenefits(root);
        control.disabled = false;
        showError(root, result);
      };
    });
  }

  L.screen('l26_my', { title: 'nav.l26_my', auth: true, render: renderMy });
  L.screen('l26_benefits', { title: 'l26my.benefits', nav: 'me', auth: true, render: renderBenefits });
})(window.Lounge);
