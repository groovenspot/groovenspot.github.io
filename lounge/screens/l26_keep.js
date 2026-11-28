(function (L) {
  const copy = {
    title: ['내 킵', 'My kept bottles', 'キープボトル', '我的寄存酒'],
    count: ['보관 중 {n}병', '{n} bottles kept', 'キープ中 {n}本', '寄存中 {n} 瓶'],
    expiry: ['만료', 'Expires', '期限', '到期'],
    expired: ['만료 {n}일 지남', 'Expired {n} days ago', '期限から{n}日経過', '已过期 {n} 天'],
    noExpiry: ['만료일 없음', 'No expiry date', '期限なし', '无到期日'],
    unlinked: ['킵 장부 연결 전', 'Ledger unlinked', 'キープ台帳未連携', '尚未关联寄存记录'],
    request: ['킵 연결 요청', 'Request a ledger link', 'キープ連携を申請', '申请关联寄存记录'],
    requested: ['직원에게 연결을 요청했어요.', 'Staff have received your request.', 'スタッフに連携を申請しました。', '已向员工发送关联申请。'],
    help: ['매장에서 직원에게 말해도 돼요.', 'You can also ask a staff member at the venue.', '店頭でスタッフにお声がけいただけます。', '你也可以在店内请员工帮忙。'],
    inPerson: ['연장이나 꺼내기는 매장에서 담당에게 요청해 주세요.', 'Ask your contact at the venue to extend storage or take out a bottle.', '延長や取り出しは店頭で担当スタッフにお申し付けください。', '如需延长寄存或取酒，请在店内联系负责人。'],
    staff: ['담당 직원', 'Your contact', '担当スタッフ', '负责人'],
    ops: ['그루브 운영팀', 'Groove Operations', 'GROOVE運営チーム', 'GROOVE 运营团队'],
    contact: ['담당에게 연락', 'Call your contact', '担当に電話', '致电负责人'],
    stored: ['보관 중인 술', 'Bottles in storage', 'キープ中のボトル', '寄存中的酒'],
    empty: ['보관 중인 술이 없어요.', 'You have no bottles in storage.', 'キープ中のボトルはありません。', '暂无寄存中的酒。'],
    sealed: ['미개봉 병', 'Sealed bottle', '未開封ボトル', '未开封'],
    opened: ['개봉한 병', 'Open bottle', '開封済みボトル', '已开封'],
    bottles: ['{n}병', '{n} bottles', '{n}本', '{n} 瓶'],
    remaining: ['남은 양', 'Remaining', '残量', '剩余量'],
    full: ['가득', 'Full', '満量', '满瓶'],
    date: ['맡긴 날', 'Stored on', '預けた日', '寄存日期'],
    end: ['만료일', 'Expiry date', '期限日', '到期日期'],
    recent: ['최근 기록', 'Recent activity', '最近の履歴', '近期记录'],
    noHistory: ['아직 기록이 없어요.', 'There is no activity yet.', '履歴はまだありません。', '暂无记录。'],
    deposit: ['맡김', 'Stored', '預け入れ', '已寄存'],
    take: ['꺼냄', 'Taken out', '取り出し', '已取出'],
    finish: ['다 마심', 'Finished', '飲み切り', '已喝完'],
    closed: ['내 킵을 지금은 볼 수 없어요.', 'Your kept bottles are currently unavailable.', '現在キープボトルは表示できません。', '暂时无法查看寄存酒。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    loading: ['불러오는 중…', 'Loading…', '読み込み中…', '正在加载…']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [
    lang, Object.fromEntries(Object.entries(copy).map(([key, values]) => ['l26keep.' + key, values[index]]))
  ])));

  const flag = 'l26_keep_view';
  const venuePhone = '0507-1301-5970';
  const tr = (key, values) => L.t('l26keep.' + key, values);
  const text = (key, values) => L.esc(tr(key, values));
  const number = n => new Intl.NumberFormat(L.lang).format(n);
  const actions = { 맡김: 'deposit', 꺼냄: 'take', '다 마심': 'finish' };
  const button = (label, hot = false) =>
    '<button type="button" class="btn' + (hot ? ' btn-hot' : '') + '">' + text(label) + '</button>';

  function daysLeft(expiry, today) {
    const day = Date.parse(expiry + 'T00:00:00Z');
    const now = Date.parse(today + 'T00:00:00Z');
    return Number.isFinite(day) && Number.isFinite(now) ? (day - now) / 86_400_000 : null;
  }

  function deadline(days) {
    if (days === null) return text('noExpiry');
    const label = days < 0 ? text('expired', { n: number(-days) }) : 'D-' + L.esc(number(days));
    return '<strong class="l26-keep-dd' + (days <= 7 ? ' is-soon' : '') + '">' + label + '</strong>';
  }

  function summary(data) {
    if (!data.linked) return text(data.requested ? 'requested' : 'unlinked');
    const days = data.items.map(item => daysLeft(item.exp, data.today)).filter(day => day !== null);
    const upcoming = days.filter(day => day >= 0);
    const nearest = upcoming.length ? Math.min(...upcoming) : days.length ? Math.max(...days) : null;
    const count = data.items.reduce((n, item) => n + item.n, 0);
    return text('count', { n: number(count) }) + ' <span aria-hidden="true">·</span> ' +
      (nearest !== null && nearest >= 0 ? text('expiry') + ' ' : '') + deadline(nearest);
  }

  L.mountKeepCard = async function (slot) {
    const id = L.me?.id;
    if (!slot || !id || L.me.access?.locked || !L.open(flag)) return;
    slot.innerHTML = '<a class="l26-keep-card" href="#/l26_keep"><span><b>' + text('title') + '</b>' +
      '<span class="l26-keep-summary" aria-live="polite">' + text('loading') + '</span></span>' +
      L.icon('chevron', { size: 18 }) + '</a>';
    const response = await L.api('l26_keep_me');
    if (!slot.isConnected || L.me?.id !== id) return;
    if (!L.open(flag) || ['closed', 'entry_required', 'banned', 'suspended'].includes(response.error)) {
      slot.replaceChildren();
      return;
    }
    slot.querySelector('.l26-keep-summary').innerHTML = response.error ? text('closed') : summary(response);
  };

  function itemRows(data) {
    return data.items.map(item => {
      const opened = item.kind === '딴 병';
      const amount = opened
        ? item.amt === '가득' ? text('full') : L.esc(item.amt || '—')
        : text('bottles', { n: number(item.n) });
      const days = daysLeft(item.exp, data.today);
      return '<li class="l26-keep-item"><div class="l26-keep-row"><div><b>' + L.esc(item.liq) +
        '</b><p class="muted">' + text(opened ? 'opened' : 'sealed') + '</p></div>' +
        (days === null ? '' : deadline(days)) + '</div><dl>' +
        '<div><dt>' + text('remaining') + '</dt><dd>' + amount + '</dd></div>' +
        '<div><dt>' + text('date') + '</dt><dd>' + L.esc(item.day || '—') + '</dd></div>' +
        '<div><dt>' + text('end') + '</dt><dd>' + (item.exp ? L.esc(item.exp) : text('noExpiry')) +
        '</dd></div></dl></li>';
    }).join('');
  }

  function history(data) {
    const amount = value => value === '가득' ? text('full') : L.esc(value);
    return data.log.slice(0, 8).map(entry => {
      const label = actions[entry.what];
      return '<li class="l26-keep-row"><div><b>' + (label ? text(label) : '') + '</b>' +
        (entry.liq ? ' · ' + L.esc(entry.liq) : '') +
        (entry.from || entry.to ? '<p class="muted">' + (amount(entry.from) || '—') + ' → ' + (amount(entry.to) || '—') + '</p>' : '') +
        '</div><time datetime="' + L.esc(entry.at) + '">' + L.esc(entry.at) + '</time></li>';
    }).join('');
  }

  function linked(panel, data) {
    const phone = /^[\d -]{9,20}$/.test(data.staffPhone || '') ? data.staffPhone : venuePhone;
    const assignee = data.staff && data.staff !== copy.ops[0] ? L.esc(data.staff) : text('ops');
    panel.innerHTML = '<section class="l26-keep-box"><h2>' + text('stored') + '</h2>' +
      (data.items.length ? '<ul class="l26-keep-list">' + itemRows(data) + '</ul>' : '<p class="muted">' + text('empty') + '</p>') +
      '</section><section class="l26-keep-box"><h2>' + text('staff') + '</h2><div class="l26-keep-row">' +
      '<div><b>' + assignee + '</b><p class="muted">' + L.esc(phone) + '</p></div>' +
      '<a class="btn" href="tel:' + phone.replace(/\D/g, '') + '">' + text('contact') + '</a></div>' +
      '<p class="muted">' + text('inPerson') + '</p></section><section class="l26-keep-box"><h2>' + text('recent') + '</h2>' +
      (data.log.length ? '<ul class="l26-keep-log">' + history(data) + '</ul>' : '<p class="muted">' + text('noHistory') + '</p>') +
      '</section>';
  }

  function unlinked(panel, id, requested, reload) {
    panel.innerHTML = '<section class="l26-keep-box"><h2>' + text('unlinked') + '</h2><p class="muted">' + text('help') +
      '</p><p class="l26-keep-status" role="status"' + (requested ? '' : ' hidden') + '>' +
      (requested ? text('requested') : '') + '</p>' + (requested ? '' : button('request', true)) + '</section>';
    const submit = panel.querySelector('button');
    if (!submit) return;
    submit.onclick = async () => {
      submit.disabled = true;
      const result = await L.api('l26_keep_link_request');
      if (!panel.isConnected || L.me?.id !== id) return;
      if (result.ok) return unlinked(panel, id, true, reload);
      if (['conflict', 'busy', 'closed', 'entry_required'].includes(result.error)) return reload();
      const status = panel.querySelector('[role="status"]');
      status.textContent = L.errorText(result);
      status.hidden = false;
      submit.disabled = false;
    };
  }

  async function render(root) {
    const id = L.me.id;
    root.innerHTML = L.bar({ title: tr('title'), back: L.open('l26_shell') ? 'l26_my' : 'me' }) +
      '<div class="l26-keep-detail" data-l26-keep-detail></div>';
    const panel = root.querySelector('[data-l26-keep-detail]');
    async function load() {
      panel.innerHTML = '<p role="status" class="muted">' + text('loading') + '</p>';
      const data = L.open(flag) ? await L.api('l26_keep_me') : { error: 'closed' };
      if (!panel.isConnected || L.me?.id !== id) return;
      if (data.error === 'entry_required') return L.go('l26_access');
      if (data.error) {
        panel.innerHTML = '<section class="l26-keep-box"><p role="status">' +
          (data.error === 'closed' ? text('closed') : L.esc(L.errorText(data))) + '</p>' +
          (data.error === 'closed' ? '' : button('retry')) + '</section>';
        const retry = panel.querySelector('button');
        if (retry) retry.onclick = load;
      } else if (data.linked) linked(panel, data);
      else unlinked(panel, id, data.requested, load);
    }
    await load();
  }

  L.screen('l26_keep', { title: 'l26keep.title', nav: 'me', bar: 'own', auth: true, render });
})(window.Lounge);
