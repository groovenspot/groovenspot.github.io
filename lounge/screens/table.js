// ⑥ 라운지 7단계: 테이블 문의와 조각 모집.
(function (L) {
  const copy = {
    table: ['테이블 문의', 'Table inquiry'],
    split: ['조각 모집', 'Find a table group'],
    md: ['내 담당 MD', 'My host'],
    staff: ['예약 담당 직원이 확인해요.', 'A reservations team member will review your inquiry.'],
    people: ['인원', 'Number of guests'],
    floor: ['층', 'Floor'],
    note: ['직원에게 남길 메모 (선택)', 'Note for staff (optional)'],
    ask: ['문의 보내기', 'Send inquiry'],
    sent: ['문의를 보냈어요.', 'Inquiry sent.'],
    history: ['내 문의', 'My inquiries'],
    noInquiries: ['보낸 문의가 없어요.', 'You have no inquiries yet.'],
    pending: ['직원 확인 중', 'Waiting for staff'],
    tableOk: ['문의 확인 완료', 'Inquiry accepted'],
    tableNo: ['이번에는 이용하기 어려워요', 'Unavailable this time'],
    tableCall: ['담당 직원에게 확인해 주세요', 'Please follow up with staff'],
    create: ['모집 만들기', 'Start a group'],
    total: ['나를 포함한 전체 인원', 'Total guests, including you'],
    groups: ['모집 목록', 'Groups'],
    noGroups: ['아직 볼 수 있는 모집이 없어요.', 'There are no groups to show yet.'],
    notice: ['결제·정산은 매장에서 담당 MD 와', 'Arrange payment and settlement with the host at the club.'],
    open: ['모집 중', 'Open'],
    expired: ['모집 종료', 'Closed'],
    splitOk: ['확정', 'Confirmed'],
    splitNo: ['취소', 'Canceled'],
    join: ['참여하기', 'Join group'],
    joined: ['참여 중', 'Joined'],
    joinedNow: ['모집에 참여했어요.', 'You joined the group.'],
    created: ['모집을 만들었어요.', 'Group created.'],
    report: ['신고', 'Report'],
    why: ['신고 이유', 'Reason for reporting'],
    ad: ['광고·홍보', 'Advertising or promotion'],
    abuse: ['괴롭힘', 'Harassment'],
    sexual: ['성적인 내용', 'Sexual content'],
    illegal: ['불법 거래', 'Illegal activity'],
    etc: ['기타', 'Other'],
    reported: ['신고를 접수했어요.', 'Report received.'],
    refresh: ['새로 고침', 'Refresh'],
    loading: ['불러오는 중이에요.', 'Loading…'],
    missing: ['이 항목을 볼 수 없어요.', 'This item is unavailable.'],
    errStaff: ['직원에게 보내지 못했어요. 다시 시도해 주세요.', 'Could not reach staff. Please try again.'],
    errPeople: ['인원을 다시 골라 주세요.', 'Please check the number of guests.'],
    errFloor: ['층을 골라 주세요.', 'Choose a floor.'],
    errNote: ['메모는 500자까지 쓸 수 있어요.', 'Please keep your note to 500 characters.'],
    errFull: ['이미 모집이 끝났어요.', 'This group is no longer open.'],
    errDup: ['이미 접수했어요.', 'This has already been submitted.'],
    errBusy: ['처리 중이에요. 잠시 뒤 다시 시도해 주세요.', 'Please wait a moment and try again.'],
    errBanned: ['지금은 이 기능을 이용할 수 없어요.', 'You can’t use this feature right now.']
  };
  L.i18n(Object.fromEntries(['ko', 'en'].map((lang, i) =>
    [lang, Object.fromEntries(Object.entries(copy).map(([key, pair]) => ['sales.' + key, pair[i]]))]
  )));
  const words = key => L.t('sales.' + key);
  const t = key => L.esc(words(key));
  const button = key => '<button class="btn btn-hot" type="submit">' + t(key) + '</button>';
  const feedback = '<p class="shell-error" role="alert" hidden></p>';
  const floor = () => '<div class="shell-field"><label for="sales-floor">' + t('floor') + '</label>' +
    '<select id="sales-floor" name="floor"><option>2F</option><option>3F</option></select></div>';
  const people = (field, key, min, value) => '<label class="shell-field">' + t(key) +
    '<input type="number" required name="' + field + '" min="' + min + '" max="20" value="' + value + '"></label>';
  const errors = {
    staff: 'errStaff', floor: 'errFloor', people: 'errPeople', note: 'errNote', full: 'errFull',
    dup: 'errDup', busy: 'errBusy', not_found: 'missing', banned: 'errBanned', suspended: 'errBanned'
  };

  function errorText(code) {
    if (code === 'closed') return L.t('core.soon');
    if (code === 'auth') return L.t('core.need');
    return Object.hasOwn(errors, code) ? words(errors[code]) : L.t('core.unavailable');
  }

  async function perform(control, message, work, done) {
    control.disabled = true;
    message.hidden = true;
    const result = await work();
    if (!control.isConnected) return;
    control.disabled = false;
    if (result.error) {
      message.textContent = errorText(result.error);
      message.hidden = false;
      if (result.error === 'auth') L.needLogin();
      return;
    }
    await done(result);
  }

  function submit(form, action, fields, done) {
    form.onsubmit = event => {
      event.preventDefault();
      const control = form.querySelector('[type=submit]');
      if (control.disabled) return;
      const input = fields(new FormData(form));
      return perform(control, form.querySelector('[role=alert]'), () => L.api(action, input), done);
    };
  }

  async function screen(root, params, feature, title, request, paint) {
    root.innerHTML = '<div class="shell-stack"><h1>' + t(title) + '</h1><p role="status">' + t('loading') + '</p></div>';
    const stack = root.firstElementChild;
    const status = stack.querySelector('[role=status]');
    const config = await L.api('config');
    if (!root.isConnected || stack !== root.firstElementChild) return;
    if (config.error) {
      status.textContent = errorText(config.error);
      return;
    }
    if (config.open?.[feature] !== true) {
      status.textContent = L.t('core.soon');
      return;
    }
    if (L.needLogin()) {
      const login = document.createElement('button');
      login.className = 'btn btn-hot';
      login.textContent = L.t('core.login');
      login.onclick = L.needLogin;
      status.replaceWith(login);
      return;
    }
    const data = await L.api(request);
    if (!root.isConnected || stack !== root.firstElementChild) return;
    if (data.error) {
      status.textContent = errorText(data.error);
      if (data.error === 'auth') L.needLogin();
      return;
    }
    status.remove();
    const target = paint(stack, data);
    const controls = document.createElement('div');
    controls.className = 'shell-actions';
    const other = feature === 'sales' ? 'split' : 'table';
    const otherFeature = other === 'table' ? 'sales' : 'split';
    controls.innerHTML = '<button type="button" class="btn">' + t('refresh') + '</button>' +
      (config.open?.[otherFeature] ? '<a class="btn" href="#/' + other + '">' + t(other) + '</a>' : '');
    controls.querySelector('button').onclick = () => screen(root, params, feature, title, request, paint);
    stack.append(controls);
    if (params.id) {
      if (target) {
        target.tabIndex = -1;
        target.focus();
      } else {
        const missing = document.createElement('p');
        missing.className = 'muted';
        missing.setAttribute('role', 'status');
        missing.textContent = words('missing');
        stack.firstElementChild.after(missing);
      }
    }
  }

  function table(root, params) {
    return screen(root, params, 'sales', 'table', 'table_list', (stack, data) => {
      const states = { pending: 'pending', ok: 'tableOk', no: 'tableNo', call: 'tableCall' };
      stack.insertAdjacentHTML('beforeend', '<section class="shell-card">' +
        (data.staffName ? '<p><strong>' + t('md') + '</strong> · ' + L.esc(data.staffName) + '</p>' : '<p>' + t('staff') + '</p>') +
        '<form class="shell-form">' + floor() + people('people', 'people', 1, 2) +
        '<label class="shell-field">' + t('note') + '<textarea name="note" rows="3" maxlength="500"></textarea></label>' +
        feedback + button('ask') + '</form></section><section class="shell-stack"><h2>' + t('history') + '</h2>' +
        (data.inquiries.length ? data.inquiries.map(item => '<article class="shell-card" data-id="' + L.esc(item.id) +
          '"><div class="shell-row"><strong>' + L.esc(item.floor) + ' · ' + L.esc(item.people) +
          '</strong><span>' + t(states[item.status] || 'pending') + '</span></div><time class="muted">' +
          L.esc(item.day) + '</time></article>').join('') : '<p class="muted">' + t('noInquiries') + '</p>') + '</section>');
      submit(stack.querySelector('form'), 'table_ask', data => ({
        floor: data.get('floor'), people: Number(data.get('people')), note: data.get('note')
      }), result => {
        L.toast(words('sent'));
        if (params.id === result.inquiry.id) return table(root, params);
        L.go('table/' + encodeURIComponent(result.inquiry.id));
      });
      return [...stack.querySelectorAll('[data-id]')].find(card => card.dataset.id === params.id);
    });
  }

  function report(id) {
    const reasons = ['ad', 'abuse', 'sexual', 'illegal', 'etc'];
    const panel = L.sheet('<h2>' + t('report') + '</h2><form class="shell-form"><div class="shell-field">' +
      '<label for="sales-report-why">' + t('why') + '</label><select id="sales-report-why" name="why">' +
      reasons.map(reason => '<option value="' + reason + '">' + t(reason) + '</option>').join('') +
      '</select></div>' + feedback + '<div class="shell-actions">' + button('report') +
      '<button type="button" class="btn">' + L.esc(L.t('core.close')) + '</button></div></form>');
    panel.querySelector('[type=button]').onclick = L.closeSheet;
    submit(panel.querySelector('form'), 'report', data => ({ kind: 'split', id, why: data.get('why') }), () => {
      L.closeSheet();
      L.toast(words('reported'));
    });
  }

  function split(root, params) {
    return screen(root, params, 'split', 'split', 'split_list', (stack, data) => {
      const states = { open: 'open', pending: 'pending', ok: 'splitOk', no: 'splitNo', expired: 'expired' };
      stack.insertAdjacentHTML('beforeend', '<p class="shell-card">' + t('notice') +
        '</p><section class="shell-card"><h2>' + t('create') + '</h2><form class="shell-form">' +
        floor() + people('need', 'total', 2, 4) + feedback + button('create') +
        '</form></section><section class="shell-stack"><h2>' + t('groups') + '</h2>' +
        (data.groups.length ? data.groups.map(group => '<article class="shell-card" data-id="' + L.esc(group.id) +
          '"><div class="shell-row"><strong>' + L.esc(group.floor) + ' · ' + L.esc(group.count) + ' / ' + L.esc(group.need) +
          '</strong><span>' + t(states[group.status] || 'pending') + '</span></div><p>' + L.esc(group.nick) +
          ' · <time class="muted">' + L.esc(group.day) + '</time></p>' + feedback + '<div class="shell-actions">' +
          (group.joined ? '<span class="muted">' + t('joined') + '</span>' :
            '<button type="button" class="btn btn-hot" data-join>' + t('join') + '</button>') +
          '<button type="button" class="btn" data-report>' + t('report') + '</button></div></article>').join('') :
          '<p class="muted">' + t('noGroups') + '</p>') + '</section>');
      submit(stack.querySelector('form'), 'split_create', value => ({
        floor: value.get('floor'), need: Number(value.get('need'))
      }), result => {
        L.toast(words('created'));
        L.go('split/' + encodeURIComponent(result.group.id));
      });
      const cards = [...stack.querySelectorAll('[data-id]')];
      for (const card of cards) {
        const id = card.dataset.id;
        const join = card.querySelector('[data-join]');
        if (join) join.onclick = () => perform(join, card.querySelector('[role=alert]'),
          () => L.api('split_join', { id }), () => {
            L.toast(words('joinedNow'));
            return split(root, params);
          });
        card.querySelector('[data-report]').onclick = () => report(id);
      }
      return cards.find(card => card.dataset.id === params.id);
    });
  }

  L.screen('table', { nav: 'tonight', title: 'sales.table', render: table });
  L.screen('split', { nav: 'tonight', title: 'sales.split', render: split });
})(window.Lounge);
