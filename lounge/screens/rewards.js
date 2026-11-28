// ⑤ W-rewards · member rewards, recap card, and shared screen booking form.
const LoungeRewardUI = (() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('rewards', {
    title: ['보상', 'Rewards'], balance: ['쓸 수 있는 포인트', 'Available points'],
    expiry: ['포인트는 적립 후 12개월 동안 쓸 수 있어요.', 'Points are valid for 12 months after you earn them.'],
    stamps: ['스탬프 10개 보상', '10-stamp rewards'],
    stampReady: ['받을 수 있는 보상 {n}개', 'Ready to claim · {n}'],
    stampHelp: ['매장에서 직원에게 이 화면을 보여 주세요.', 'Show this screen to a staff member at the club.'],
    stampEmpty: ['체크인 스탬프 10개를 모으면 보상을 받아요.', 'Collect 10 check-in stamps to earn a reward.'],
    stampGiven: ['받은 보상 {n}개', 'Collected · {n}'],
    weekly: ['주간 미션', 'Weekly mission'], missionDone: ['{n}P 받았어요', 'You earned {n}P'],
    missionPoints: ['모두 마치면 {n}P', 'Complete all goals to earn {n}P'],
    checkins: ['매장 체크인', 'Venue check-ins'], votes: ['투표', 'Votes'], attends: ['출석', 'Daily check-ins'],
    season: ['시즌 레벨 {n}', 'Season level {n}'], next: ['{n}P 모으면 다음 레벨', 'Reach {n}P for the next level'],
    birthday: ['생일 주간', 'Birthday week'], month: ['월', 'Month'], day: ['일', 'Day'], save: ['저장', 'Save'],
    birthdayHelp: ['생일 주간에 체크인하면 보너스 포인트를 받아요.', 'Check in during your birthday week for bonus points.'],
    birthdayLocked: ['생일은 다음 해에 바꿀 수 있어요.', 'You can change your birthday next year.'],
    birthdayAfterWeek: ['이번 생일 주가 끝나면 생일을 바꿀 수 있어요.', 'You can change your birthday when this birthday week ends.'],
    invite: ['친구 초대', 'Invite a friend'], inviteButton: ['내 초대 코드 보기', 'Show my invite code'],
    inviteHelp: ['친구가 매장에서 직원 QR로 가입할 때 이 코드를 입력하면 두 분 모두 300P를 받아요.', 'When your friend signs up at the club with a staff QR and enters your code, you both earn 300P.'],
    recap: ['이번 달 나의 그루브', 'My Groove this month'],
    visits: ['매장 방문', 'Venue visits'], earned: ['이달에 모은 포인트', 'Points earned this month'],
    badges: ['모은 배지', 'Badges earned'], noBadges: ['아직 없어요', 'No badges yet'],
    favoriteDj: ['좋아한 DJ', 'Favorite DJ'], noDj: ['아직 없어요', 'No favorite yet'],
    makeCard: ['결산 카드 만들기', 'Make recap card'], download: ['이미지 저장', 'Save image'], share: ['공유', 'Share'],
    screen: ['전광판 메시지', 'Screen message'], preview: ['전광판 미리보기', 'Screen preview'],
    message: ['문구', 'Message'], time: ['오늘 나갈 시각 (한국 시간)', 'Time tonight (Korea time)'],
    timeHelp: ['23:30 전에 나갈 시각을 골라 주세요.', 'Choose a time before 11:30 p.m.'],
    bookingHelp: ['직원이 확인한 뒤 나가요. 예약이 반려되면 사용한 포인트를 돌려드려요.', 'Staff review each booking. If it’s declined, any points used are returned.'],
    bookingWindow: ['대기 중인 예약은 2건까지 가능해요. 처리되지 않은 예약은 다음 날 낮 12시에 만료돼요.', 'You can have up to two screen bookings pending. Unprocessed bookings expire at noon the next day.'],
    pointsPay: ['500P로 예약', 'Book for 500P'], birthdayPay: ['생일 축하 무료 예약', 'Book free birthday message'],
    storePay: ['매장 결제로 예약', 'Book and pay at the club'], history: ['내 전광판 예약', 'My screen bookings'],
    voucher: ['무료 전광판 1회 쓰기', 'Use my free screen message'],
    voucherHelp: ['주간 1등 보상 · 남은 무료 {n}회', 'Weekly #1 reward · {n} free left'],
    voucherPay: ['무료 1회로 예약', 'Book with my free message'],
    'error.voucher': ['쓸 수 있는 무료 전광판이 없어요.', 'You have no free screen message left.'],
    sending: ['직원에게 보내는 중', 'Sending to staff'], pending: ['직원 확인 대기', 'Waiting for staff'],
    done: ['송출 완료', 'Shown on screen'], rejected: ['반려', 'Declined'], failed: ['전달 실패', 'Could not send'], expired: ['만료', 'Expired'],
    stock: ['재고가 바뀌었어요. 상품 목록을 다시 확인해 주세요.', 'Stock changed. Please check the product list again.'],
    'error.time': ['아직 지나지 않은 23:30 전 시각을 골라 주세요.', 'Choose a future time before 11:30 p.m.'],
    'error.full': ['오늘 전광판 예약이 찼어요.', 'Today’s screen bookings are full.'],
    'error.pending_limit': ['대기 중인 요청이 {limit}건 있어요. 처리된 뒤 다시 신청해 주세요.', 'You have {limit} pending requests. Wait for one to finish before sending another.'],
    'error.daily_limit': ['오늘 신청할 수 있는 횟수를 다 썼어요. 다음 영업일에 다시 신청해 주세요.', 'You’ve reached today’s request limit. Try again on the next business day.'],
    'error.request': ['신청 정보가 바뀌었어요. 내용을 확인하고 다시 신청해 주세요.', 'This request no longer matches. Check the details and submit it again.'],
    'error.text': ['문구를 30자 이내로 써 주세요.', 'Enter a message of up to 30 characters.'],
    'error.points': ['포인트가 모자라요.', 'You don’t have enough points.'],
    'error.birthday': ['생일 날짜와 무료 예약 가능 여부를 확인해 주세요.', 'Check the birthday date and free booking availability.'],
    'error.discount': ['할인은 상품 금액의 20%까지 쓸 수 있어요.', 'Use points for up to 20% off the merchandise total.'],
    'error.staff': ['직원에게 전달하지 못했어요. 다시 시도해 주세요.', 'Could not reach the staff. Please try again.'],
    'error.network': ['연결을 확인하고 같은 내용으로 다시 시도해 주세요.', 'Check your connection and retry with the same details.']
  });
  L.i18n({
    ja: {
      'rewards.bookingWindow': '承認待ちの予約は2件までです。未処理の予約は翌日の正午に期限切れになります。',
      'rewards.expired': '期限切れ',
      'rewards.error.pending_limit': '未処理の申請が{limit}件あります。処理されてからもう一度お申し込みください。',
      'rewards.error.daily_limit': '本日の申請上限に達しました。次の営業日にお試しください。',
      'rewards.error.request': '申請内容が一致しません。内容を確認してから、もう一度お申し込みください。',
      'rewards.voucher': '無料の電光掲示板を1回使う',
      'rewards.voucherHelp': '週間1位の特典 · 無料あと{n}回',
      'rewards.voucherPay': '無料1回で予約',
      'rewards.error.voucher': '使える無料の電光掲示板がありません。'
    },
    zh: {
      'rewards.bookingWindow': '最多可有两笔待处理的预约。尚未处理的预约将于次日中午过期。',
      'rewards.expired': '已过期',
      'rewards.error.pending_limit': '你有 {limit} 笔待处理的请求，请等待处理后再提交。',
      'rewards.error.daily_limit': '已达到今天的申请上限，请在下一个营业日重试。',
      'rewards.error.request': '请求内容不一致，请确认后重新提交。',
      'rewards.voucher': '使用一次免费大屏留言',
      'rewards.voucherHelp': '每周第一奖励 · 还剩 {n} 次免费',
      'rewards.voucherPay': '用免费次数预约',
      'rewards.error.voucher': '没有可用的免费大屏留言。'
    }
  });

  const panel = html => '<section style="' + U.card + '">' + html + '</section>';
  const heading = (title, back) => '<h1>' + title + '</h1>' + U.link(back, L.esc(L.t(back === '#/me' ? 'nav.me' : 'nav.play')));
  const formStyle = 'display:grid;gap:10px';
  const inputStyle = 'display:block;width:100%;min-height:44px;background:var(--bg);color:inherit;border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit';
  const submit = label => '<button type="submit" class="btn btn-hot">' + label + '</button>';
  const message = () => '<p data-feedback role="status" hidden></p>';
  const amount = n => new Intl.NumberFormat(L.lang).format(Number(n) || 0);
  function feedback(form, { error, limit }) {
    const out = form.querySelector('[data-feedback]');
    if (error === 'auth') L.needLogin();
    const key = 'rewards.error.' + error;
    const value = L.t(key, { limit: Number(limit) || 0 });
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
        feedback(form, res);
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

  function bookingForm(view, { birthday = false, store = false, vouchers = 0, done }) {
    const free = !store && Number.isSafeInteger(vouchers) && vouchers > 0;
    const card = document.createElement('div');
    card.innerHTML = panel('<h2>' + t('screen') + '</h2>' +
      '<div style="overflow:hidden;border:2px solid #a15bff;border-radius:14px;background:#09050e;text-align:center">' +
      '<div style="background:#6d2bff;color:white;padding:6px;font-weight:800;letter-spacing:.12em">GROOVE · ' + t('preview') + '</div>' +
      '<div data-preview style="display:grid;place-items:center;min-height:96px;padding:12px;font-size:24px;font-weight:900;color:#fff">—</div></div>' +
      '<form style="' + formStyle + ';margin-top:14px"><label>' + t('message') +
      '<input name="text" required style="' + inputStyle + '" aria-describedby="booking-length"></label>' +
      '<small id="booking-length" class="muted">0 / 30</small><label>' + t('time') +
      '<input type="time" name="at" max="23:29" required style="' + inputStyle + '"></label>' +
      '<small class="muted">' + t('timeHelp') + '</small>' +
      (birthday ? '<label class="shell-choice"><input type="checkbox" name="birthday"> ' + t('birthdayPay') + '</label>' : '') +
      (free ? '<label class="shell-choice"><input type="checkbox" name="voucher"> ' + t('voucher') + '</label>' +
        '<small class="muted">' + t('voucherHelp', { n: amount(vouchers) }) + '</small>' : '') +
      '<p class="muted">' + t('bookingHelp') + '</p><p class="muted">' + t('bookingWindow') + '</p>' + message() +
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
    // 생일 무료·주간 1등 무료는 하나만 고름
    const label = () => {
      form.querySelector('[type=submit]').textContent = L.t('rewards.' + (form.elements.birthday?.checked ? 'birthdayPay'
        : form.elements.voucher?.checked ? 'voucherPay' : 'pointsPay'));
    };
    for (const [name, other] of [['birthday', 'voucher'], ['voucher', 'birthday']]) {
      if (form.elements[name]) form.elements[name].onchange = () => {
        if (form.elements[name].checked && form.elements[other]) form.elements[other].checked = false;
        label();
      };
    }
    wire(form, 'yc_reserve', data => ({ text: data.get('text'), at: data.get('at'),
      pay: store ? 'store' : data.has('birthday') ? 'birthday' : data.has('voucher') ? 'voucher' : 'points' }), done, true);
  }

  function birthdayForm(state) {
    return panel('<h2>' + t('birthday') + '</h2><p class="muted">' + t('birthdayHelp') + '</p>' +
      (state && !state.canChange ? '<p>' + amount(state.month) + ' / ' + amount(state.day) +
        '</p><small>' + t(state.changeAfterWeek ? 'birthdayAfterWeek' : 'birthdayLocked') + '</small>' :
        '<form data-birthday style="' + formStyle + '"><div style="display:flex;gap:12px"><label style="flex:1">' + t('month') +
        '<input name="month" type="number" min="1" max="12" required value="' + (state?.month || '') + '" style="' + inputStyle +
        '"></label><label style="flex:1">' + t('day') + '<input name="day" type="number" min="1" max="31" required value="' +
        (state?.day || '') + '" style="' + inputStyle + '"></label></div>' + message() + submit(t('save')) + '</form>'));
  }

  async function paintRecap(canvas, data, badgeNames, favorite) {
    const logo = new Image();
    logo.src = '/assets/logo-word.png';
    const hasLogo = await logo.decode().then(() => true, () => false);
    const ctx = canvas.getContext('2d');
    const background = ctx.createLinearGradient(0, 0, 1080, 1920);
    background.addColorStop(0, '#21132c');
    background.addColorStop(0.56, '#120e17');
    background.addColorStop(1, '#2d1810');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.textBaseline = 'alphabetic';
    function label(value, x, y, { size = 46, color = '#fff3ec', width = 888, weight = 700 } = {}) {
      ctx.fillStyle = color;
      ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
      ctx.fillText(value, x, y, width);
    }
    function wrap(value, x, y) {
      ctx.font = '700 48px system-ui, sans-serif';
      const lines = [''];
      for (const character of value) {
        const current = lines.at(-1);
        if (ctx.measureText(current + character).width <= 808) {
          lines[lines.length - 1] += character;
        } else if (lines.length === 1) {
          lines.push(character.trimStart());
        } else {
          lines[1] = current.replace(/.$/u, '') + '…';
          break;
        }
      }
      lines.forEach((line, i) => label(line, x, y + 60 * i, { size: 48, width: 808 }));
    }
    function tile(x, y, width, height) {
      ctx.fillStyle = '#ffffff0d';
      ctx.strokeStyle = '#f4bfd337';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 28);
      ctx.fill();
      ctx.stroke();
    }
    if (hasLogo) ctx.drawImage(logo, 96, 226, 360, 360 * logo.naturalHeight / logo.naturalWidth);
    else label('GROOVE & SPOT', 96, 268, { color: '#ffad73' });
    label(data.month, 96, 390, { color: '#e0bbf8' });
    label(L.t('rewards.recap'), 96, 520, { size: 96, weight: 900 });
    const tag = L.tagLabel(data.tag);
    ctx.font = '800 30px system-ui, sans-serif';
    const chipWidth = tag ? Math.ceil(ctx.measureText(tag).width) + 36 : 0;
    const nameWidth = 888 - chipWidth - (tag ? 24 : 0);
    label(data.nick, 96, 633, { size: 65, width: nameWidth });
    if (tag) {
      const x = 96 + Math.min(nameWidth, ctx.measureText(data.nick).width) + 24;
      ctx.fillStyle = data.tag.kind === 'vip' ? '#ffd66b' : '#fff3ed';
      ctx.beginPath();
      ctx.roundRect(x, 579, chipWidth, 56, 12);
      ctx.fill();
      label(tag, x + 18, 617, { size: 30, weight: 800, color: '#2d1b00', width: chipWidth - 36 });
    }

    for (const [i, [key, value]] of [
      ['visits', amount(data.checkins)], ['earned', amount(data.points) + 'P']
    ].entries()) {
      const x = 96 + i * 456;
      tile(x, 735, 432, 260);
      label(L.t('rewards.' + key), x + 40, 827, { size: 39, color: '#ecd8ef', width: 352 });
      label(value, x + 40, 942, { size: 78, color: '#ffad73', width: 352, weight: 900 });
    }
    for (const [i, [key, value]] of [['badges', badgeNames], ['favoriteDj', favorite]].entries()) {
      const y = 1040 + 270 * i;
      tile(96, y, 888, 238);
      label(L.t('rewards.' + key), 136, y + 75, { size: 36, color: '#e0bbf8' });
      wrap(value, 136, y + 146);
    }
  }

  async function recapCard(view, data) {
    const area = view.querySelector('[data-recap]');
    const badgeNames = data.badges?.map(badge => badge.label).filter(Boolean).join(' · ') || L.t('rewards.noBadges');
    const favorite = data.favoriteDj || L.t('rewards.noDj');
    const description = [data.month, [data.nick, L.tagLabel(data.tag)].filter(Boolean).join(' '), L.t('rewards.visits') + ' ' + amount(data.checkins),
      L.t('rewards.earned') + ' ' + amount(data.points) + 'P',
      L.t('rewards.badges') + ' ' + badgeNames, L.t('rewards.favoriteDj') + ' ' + favorite].join('. ');
    area.innerHTML = '<canvas width="1080" height="1920" role="img" aria-label="' + t('recap') +
      '" style="width:min(100%,320px);height:auto;border-radius:14px;margin:12px 0" hidden></canvas>';
    const canvas = area.querySelector('canvas');
    canvas.setAttribute('aria-description', description);
    await paintRecap(canvas, data, badgeNames, favorite);
    if (!canvas.isConnected) return;

    const download = document.createElement('a');
    download.className = 'btn';
    download.download = 'groove-' + data.month + '.png';
    download.textContent = L.t('rewards.download');
    download.href = canvas.toDataURL('image/png');
    canvas.hidden = false;
    canvas.style.display = 'block';
    area.append(download);
    if (navigator.canShare && navigator.share) canvas.toBlob(blob => {
      if (!blob || !canvas.isConnected) return;
      const file = new File([blob], download.download, { type: 'image/png' });
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
    function paint(state) {
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
        birthdayForm(state.birthday) +   // 전광판 예약은 2026-11-28 대표 결정으로 뺌

        panel('<h2>' + t('invite') + '</h2><p class="muted">' + t('inviteHelp') + '</p>' +
          U.button(t('inviteButton'), 'data-invite') + '<p data-code role="status"></p>') +
        panel('<h2>' + t('recap') + '</h2>' + U.button(t('makeCard'), 'data-make-card') + '<div data-recap></div>');

      const birthday = view.querySelector('[data-birthday]');
      if (birthday) wire(birthday, 'birthday_set',
        data => ({ month: Number(data.get('month')), day: Number(data.get('day')) }),
        result => paint({ ...state, birthday: result.birthday }));
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
        try {
          if (data.error) U.error(data);
          else await recapCard(view, data);
        } catch {
          U.error();
        } finally {
          button.disabled = false;
        }
      };
    }
    paint(state);
  }

  L.screen('rewards', { nav: 'play', title: 'rewards.title', render });
  return { panel, heading, formStyle, inputStyle, submit, message, amount, wire, bookings, bookingForm };
})();
