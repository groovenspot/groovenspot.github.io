// ⑤ W-rewards · member rewards, recap card, and shared screen booking form.
const LoungeRewardUI = (() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('rewards', {
    title: ['보상', 'Rewards'], balance: ['쓸 수 있는 포인트', 'Available points'],
    expiry: ['포인트는 적립 후 12개월 동안 쓸 수 있어요.', 'Points are valid for 12 months after you earn them.'],
    stamps: ['스탬프 10개 보상', '10-stamp rewards'],
    stampReady: ['받을 수 있는 보상 {n}개', '{n} rewards ready to claim'],
    stampHelp: ['매장에서 직원에게 이 화면을 보여 주세요.', 'Show this screen to a staff member at the club.'],
    stampEmpty: ['체크인 스탬프 10개를 모으면 보상을 받아요.', 'Collect 10 check-in stamps to earn a reward.'],
    stampGiven: ['받은 보상 {n}개', '{n} rewards collected'],
    weekly: ['주간 미션', 'Weekly mission'], missionDone: ['{n}P 받았어요', 'You earned {n}P'],
    missionPoints: ['모두 마치면 {n}P', 'Complete all goals to earn {n}P'],
    checkins: ['매장 체크인', 'Venue check-ins'], votes: ['투표', 'Votes'], attends: ['출석', 'Daily check-ins'],
    season: ['시즌 레벨 {n}', 'Season level {n}'], next: ['{n}P 모으면 다음 레벨', 'Reach {n}P for the next level'],
    birthday: ['생일 주간', 'Birthday week'], month: ['월', 'Month'], day: ['일', 'Day'], save: ['저장', 'Save'],
    birthdayHelp: ['생일 주간에 체크인하면 보너스 포인트를 받고, 전광판 축하를 한 번 무료로 예약할 수 있어요.', 'Check in during your birthday week for bonus points and book one free birthday message.'],
    birthdayLocked: ['생일은 다음 해에 바꿀 수 있어요.', 'You can change your birthday next year.'],
    invite: ['친구 초대', 'Invite a friend'], inviteButton: ['내 초대 코드 보기', 'Show my invite code'],
    inviteHelp: ['친구가 매장에서 직원 QR로 가입할 때 이 코드를 입력하면 두 분 모두 300P를 받아요.', 'When your friend signs up at the club with a staff QR and enters your code, you both earn 300P.'],
    recap: ['이번 달 나의 그루브', 'My Groove this month'],
    makeCard: ['결산 카드 만들기', 'Make recap card'], download: ['이미지 저장', 'Save image'], share: ['공유', 'Share'],
    screen: ['전광판 메시지', 'Screen message'], preview: ['전광판 미리보기', 'Screen preview'],
    message: ['문구', 'Message'], time: ['오늘 나갈 시각 (한국 시간)', 'Time tonight (Korea time)'],
    timeHelp: ['23:30 전에 나갈 시각을 골라 주세요.', 'Choose a time before 11:30 p.m.'],
    bookingHelp: ['직원이 확인한 뒤 나가요. 예약이 반려되면 사용한 포인트를 돌려드려요.', 'Staff review each booking. If it’s declined, any points used are returned.'],
    pointsPay: ['500P로 예약', 'Book for 500P'], birthdayPay: ['생일 축하 무료 예약', 'Book free birthday message'],
    storePay: ['매장 결제로 예약', 'Book and pay at the club'], history: ['내 전광판 예약', 'My screen bookings'],
    sending: ['직원에게 보내는 중', 'Sending to staff'], pending: ['직원 확인 대기', 'Waiting for staff'],
    done: ['송출 완료', 'Shown on screen'], rejected: ['반려', 'Declined'], failed: ['전달 실패', 'Could not send'],
    stock: ['재고가 바뀌었어요. 상품 목록을 다시 확인해 주세요.', 'Stock changed. Please check the product list again.'],
    'error.time': ['아직 지나지 않은 23:30 전 시각을 골라 주세요.', 'Choose a future time before 11:30 p.m.'],
    'error.full': ['오늘 전광판 예약이 찼어요.', 'Today’s screen bookings are full.'],
    'error.text': ['문구를 30자 이내로 써 주세요.', 'Enter a message of up to 30 characters.'],
    'error.points': ['포인트가 모자라요.', 'You don’t have enough points.'],
    'error.birthday': ['생일 날짜와 무료 예약 가능 여부를 확인해 주세요.', 'Check the birthday date and free booking availability.'],
    'error.discount': ['할인은 상품 금액의 20%까지 쓸 수 있어요.', 'Use points for up to 20% off the merchandise total.'],
    'error.staff': ['직원에게 전달하지 못했어요. 다시 시도해 주세요.', 'Could not reach the staff. Please try again.'],
    'error.network': ['연결을 확인하고 같은 내용으로 다시 시도해 주세요.', 'Check your connection and retry with the same details.']
  });

  const panel = html => '<section style="' + U.card + '">' + html + '</section>';
  const heading = (title, back) => '<h1>' + title + '</h1>' + U.link(back, L.esc(L.t(back === '#/me' ? 'nav.me' : 'nav.play')));
  const formStyle = 'display:grid;gap:10px';
  const inputStyle = 'display:block;width:100%;min-height:44px;background:var(--bg);color:inherit;border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit';
  const submit = label => '<button type="submit" class="btn btn-hot">' + label + '</button>';
  const message = () => '<p data-feedback role="status" hidden></p>';
  const amount = n => new Intl.NumberFormat(L.lang).format(Number(n) || 0);
  function feedback(form, error) {
    const out = form.querySelector('[data-feedback]');
    if (error === 'auth') L.needLogin();
    const key = 'rewards.error.' + error;
    const value = L.t(key);
    out.textContent = error === 'closed' ? L.t('core.soon')
      : error === 'stock' ? L.t('rewards.stock')
      : error === 'birthday_locked' ? L.t('rewards.birthdayLocked')
      : value === key ? L.t('screens.failed') : value;
    out.hidden = false;
  }

  function wire(form, action, read, done, useRequest = false) {
    let last, request;
    form.onsubmit = async event => {
      event.preventDefault();
      if (L.needLogin()) return;
      const button = form.querySelector('[type=submit]');
      if (button.disabled) return;
      const body = read(new FormData(form));
      if (useRequest) {
        const payload = JSON.stringify(body);
        if (payload !== last || !request) request = crypto.randomUUID();
        last = payload;
        body.request = request;
      }
      button.disabled = true;
      form.querySelector('[data-feedback]').hidden = true;
      const res = await L.api(action, body);
      if (!form.isConnected) return;
      button.disabled = false;
      if (res.error) {
        if (res.error !== 'network' && res.error !== 'server') request = null;
        feedback(form, res.error);
        return;
      }
      request = null;
      done(res);
    };
  }

  function bookings(rows) {
    if (!rows.length) return '';
    return panel('<h2>' + t('history') + '</h2><ul style="padding-inline-start:20px;margin-bottom:0">' +
      rows.map(row => '<li>' + L.esc(row.day) + ' · ' + L.esc(row.at) + ' · ' + L.esc(row.text) +
        ' <strong>(' + t(row.status) + ')</strong></li>').join('') + '</ul>');
  }

  function bookingForm(view, { birthday = false, store = false, done }) {
    const card = document.createElement('div');
    card.innerHTML = panel('<h2>' + t('screen') + '</h2>' +
      '<div style="overflow:hidden;border:2px solid #a15bff;border-radius:14px;background:#09050e;text-align:center">' +
      '<div style="background:#6d2bff;color:white;padding:6px;font-weight:800;letter-spacing:.12em">GROOVE · ' + t('preview') + '</div>' +
      '<div data-preview style="display:grid;place-items:center;min-height:96px;padding:12px;font-size:24px;font-weight:900">—</div></div>' +
      '<form style="' + formStyle + ';margin-top:14px"><label>' + t('message') +
      '<input name="text" required style="' + inputStyle + '" aria-describedby="booking-length"></label>' +
      '<small id="booking-length" class="muted">0 / 30</small><label>' + t('time') +
      '<input type="time" name="at" max="23:29" required style="' + inputStyle + '"></label>' +
      '<small class="muted">' + t('timeHelp') + '</small>' +
      (birthday ? '<label><input type="checkbox" name="birthday"> ' + t('birthdayPay') + '</label>' : '') +
      '<p class="muted">' + t('bookingHelp') + '</p>' + message() +
      submit(t(store ? 'storePay' : 'pointsPay')) + '</form>');
    view.append(card);
    const form = card.querySelector('form');
    const text = form.elements.text;
    const preview = card.querySelector('[data-preview]');
    const length = card.querySelector('#booking-length');
    text.oninput = () => {
      const chars = [...text.value];
      if (chars.length > 30) text.value = chars.slice(0, 30).join('');
      preview.textContent = text.value.trim() || '—';
      length.textContent = Math.min(chars.length, 30) + ' / 30';
    };
    if (birthday) form.elements.birthday.onchange = () => {
      form.querySelector('[type=submit]').textContent = L.t('rewards.' + (form.elements.birthday.checked ? 'birthdayPay' : 'pointsPay'));
    };
    wire(form, 'yc_reserve', data => ({ text: data.get('text'), at: data.get('at'),
      pay: store ? 'store' : data.has('birthday') ? 'birthday' : 'points' }), done, true);
  }

  function birthdayForm(state) {
    return panel('<h2>' + t('birthday') + '</h2><p class="muted">' + t('birthdayHelp') + '</p>' +
      (state && !state.canChange ? '<p>' + amount(state.month) + ' / ' + amount(state.day) + '</p><small>' + t('birthdayLocked') + '</small>' :
        '<form data-birthday style="' + formStyle + '"><div style="display:flex;gap:12px"><label style="flex:1">' + t('month') +
        '<input name="month" type="number" min="1" max="12" required value="' + (state?.month || '') + '" style="' + inputStyle +
        '"></label><label style="flex:1">' + t('day') + '<input name="day" type="number" min="1" max="31" required value="' +
        (state?.day || '') + '" style="' + inputStyle + '"></label></div>' + message() + submit(t('save')) + '</form>'));
  }

  function paintRecap(canvas, data) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#28133c');
    gradient.addColorStop(0.6, '#120b12');
    gradient.addColorStop(1, '#31180d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.textAlign = 'left';
    const label = (value, y, size = 54, color = '#f6efeb') => {
      ctx.fillStyle = color;
      ctx.font = '700 ' + size + 'px system-ui, sans-serif';
      ctx.fillText(value, 96, y, 888);
    };
    label('GROOVE LOUNGE', 200, 50, '#ffab73');
    label(data.month, 370, 56, '#dabdff');
    label(L.t('rewards.recap'), 500, 88);
    label(data.nick, 650, 60);
    const stats = [['checkins', data.checkins], ['attends', data.attends], ['balance', data.points]];
    for (const [i, [key, n]] of stats.entries()) {
      const y = 850 + i * 270;
      ctx.fillStyle = '#ffffff14';
      ctx.fillRect(96, y - 100, 888, 222);
      ctx.save();
      ctx.translate(40, 0);
      label(L.t('rewards.' + (key === 'balance' ? 'earned' : key)), y - 8, 43, '#dfc8e9');
      label(amount(n) + (key === 'balance' ? 'P' : ''), y + 82, 76);
      ctx.restore();
    }
  }

  function recapCard(view, data) {
    const area = view.querySelector('[data-recap]');
    area.innerHTML = '<canvas width="1080" height="1920" role="img" aria-label="' + t('recap') +
      '" style="display:block;width:min(100%,300px);height:auto;border-radius:14px;margin:12px 0"></canvas>' +
      '<a data-download class="btn" download="groove-' + L.esc(data.month) + '.png">' + t('download') + '</a>';
    const canvas = area.querySelector('canvas');
    paintRecap(canvas, data);
    area.querySelector('[data-download]').href = canvas.toDataURL('image/png');
    if (navigator.canShare && navigator.share) canvas.toBlob(blob => {
      if (!blob || !area.isConnected) return;
      const file = new File([blob], 'groove-' + data.month + '.png', { type: 'image/png' });
      if (!navigator.canShare({ files: [file] })) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = L.t('rewards.share');
      button.onclick = () => navigator.share({ files: [file] }).catch(err => {
        if (err.name !== 'AbortError') U.error();
      });
      area.append(button);
    }, 'image/png');
  }

  L.i18n({ ko: { 'rewards.earned': '적립 포인트' }, en: { 'rewards.earned': 'Points earned' } });

  async function render(root) {
    const view = U.mount(root, heading(t('title'), '#/me'));
    const config = await L.api('config');
    if (!view.isConnected) return;
    if (!config.open?.rewards) {
      view.innerHTML = U.status(config.error ? 'error' : 'soon');
      return;
    }
    if (!L.me) {
      view.innerHTML = U.button(L.esc(L.t('core.login')), 'data-login', true);
      view.querySelector('button').onclick = L.needLogin;
      return;
    }
    const state = await L.api('rewards');
    if (!view.isConnected) return;
    if (state.error) {
      view.innerHTML = U.status(state.error === 'closed' ? 'soon' : 'error');
      if (state.error === 'auth') L.needLogin();
      return;
    }
    const openStamps = state.stamps.filter(stamp => stamp.givenAt === null).length;
    const claimed = state.stamps.length - openStamps;
    view.innerHTML = panel('<h2>' + t('balance') + '</h2><strong style="font-size:2rem;color:var(--g)">' +
      amount(state.points) + 'P</strong><p class="muted">' + t('expiry') + '</p>') +
      panel('<h2>' + t('stamps') + '</h2><p>' + (openStamps ? t('stampReady', { n: openStamps }) + ' · ' + t('stampHelp') :
        t('stampEmpty')) + '</p>' + (claimed ? '<p class="muted">' + t('stampGiven', { n: claimed }) + '</p>' : '')) +
      panel('<h2>' + t('weekly') + '</h2><ul style="padding-inline-start:20px">' +
        Object.entries(state.mission.progress).filter(([key]) => state.mission[key] > 0).map(([key, n]) => '<li>' +
          t(key) + ' · ' + amount(Math.min(n, state.mission[key])) + ' / ' + amount(state.mission[key]) + '</li>').join('') +
        '</ul><strong>' + t(state.mission.paid ? 'missionDone' : 'missionPoints', { n: state.mission.points }) + '</strong>') +
      panel('<h2>' + t('season', { n: state.season.level }) + '</h2><p>' + amount(state.season.points) + 'P' +
        (state.season.next === null ? '' : ' · ' + t('next', { n: amount(state.season.next) })) + '</p>') +
      bookings(state.bookings) + '<div data-booking></div>' + birthdayForm(state.birthday) +
      panel('<h2>' + t('invite') + '</h2><p class="muted">' + t('inviteHelp') + '</p>' +
        U.button(t('inviteButton'), 'data-invite') + '<p data-code role="status"></p>') +
      panel('<h2>' + t('recap') + '</h2>' + U.button(t('makeCard'), 'data-make-card') + '<div data-recap></div>');

    const refresh = () => render(root);
    bookingForm(view.querySelector('[data-booking]'), { birthday: state.birthday?.free, done: refresh });
    const birthday = view.querySelector('[data-birthday]');
    if (birthday) wire(birthday, 'birthday_set', data => ({ month: Number(data.get('month')), day: Number(data.get('day')) }), refresh);
    view.querySelector('[data-invite]').onclick = async event => {
      const button = event.currentTarget;
      button.disabled = true;
      const result = await L.api('invite_code');
      if (!view.isConnected) return;
      button.disabled = false;
      if (result.error) U.error(result);
      else view.querySelector('[data-code]').textContent = result.code;
    };
    view.querySelector('[data-make-card]').onclick = async event => {
      const button = event.currentTarget;
      button.disabled = true;
      const data = await L.api('recap');
      if (!view.isConnected) return;
      button.disabled = false;
      if (data.error) U.error(data);
      else recapCard(view, data);
    };
  }

  L.screen('rewards', { nav: 'play', title: 'rewards.title', render });
  return { panel, heading, formStyle, inputStyle, submit, message, amount, wire, bookings, bookingForm };
})();
