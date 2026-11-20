(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('compose', {
    title: ['새 사진 글', 'New photo post'], back: ['피드로', 'Back to feed'],
    choose: ['사진 고르기 (최대 5장)', 'Choose photos (up to 5)'],
    count: ['사진 {n}/5장', '{n}/5 photos'], remove: ['사진 {n} 빼기', 'Remove photo {n}'],
    text: ['글', 'Caption'], floor: ['층 고르기', 'Floor'], none: ['안 고름', 'None'],
    challenge: ['포토 챌린지', 'Photo challenge'], send: ['올리기', 'Publish'],
    sending: ['사진 글을 올리는 중이에요.', 'Publishing your photo post.'],
    photo: ['사진을 1~5장 골라 주세요.', 'Choose 1 to 5 photos.'],
    upload: ['사진을 올리지 못했어요. 다시 시도해 주세요.', 'Could not upload a photo. Please try again.'],
    busy: ['오늘 올릴 수 있는 수를 다 채웠어요.', 'You’ve reached today’s limit.'],
    photoLimit: ['오늘은 사진을 더 올릴 수 없어요.', 'You’ve reached today’s photo upload limit.'],
    ended: ['이 챌린지에는 지금 참여할 수 없어요.', 'This challenge is no longer open.'],
    consent: ['다른 손님의 얼굴이 크게 나온 사진은 허락을 받고 올려 주세요.',
      'Get permission before posting a close-up of another guest.'],
    earned: ['{n}P를 받았어요!', 'You earned {n} points!']
  });
  let release;

  async function render(root, { challenge } = {}) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/feed', t('back')));
    const [config, options] = await Promise.all([L.api('config'), L.api('post_options')]);
    if (!view.isConnected) return;
    if (!config.open?.posts && !options.memberPosts) {
      view.innerHTML = U.status(config.error || options.error ? 'error' : 'soon');
      return;
    }
    if (!L.me) {
      view.innerHTML = U.button(L.esc(L.t('core.login')), 'data-compose-login', true);
      view.querySelector('button').onclick = L.needLogin;
      L.needLogin();
      return;
    }

    const active = config.open?.challenge && Array.isArray(options.active) ? options.active : [];
    view.innerHTML = '<form style="display:grid;gap:12px;margin-top:12px">' +
      '<label>' + t('choose') + '<input type="file" name="files" accept="image/*" multiple></label>' +
      '<div data-selection style="display:flex;gap:8px;flex-wrap:wrap"></div>' +
      '<p class="muted" data-count aria-live="polite">' + t('count', { n: 0 }) + '</p>' +
      '<label>' + t('text') + '<textarea name="caption" rows="3" maxlength="500"></textarea></label>' +
      '<label>' + t('floor') + '<select name="floor"><option value="">' + t('none') +
      '</option><option>2F</option><option>3F</option></select></label>' +
      (active.length ? '<label>' + t('challenge') + '<select name="challenge"><option value="">' + t('none') +
        '</option>' + active.map(item => '<option value="' + L.esc(item.id) + '">' + L.esc(item.title) + '</option>').join('') +
        '</select></label>' : '') +
      '<p class="muted">' + t('consent') + '</p>' +
      '<p data-compose-status role="status" hidden></p>' +
      '<button class="btn btn-hot">' + t('send') + '</button></form>';
    const form = view.querySelector('form');
    const { files, caption, floor, challenge: select } = form.elements;
    if (select && active.some(item => item.id === challenge)) select.value = challenge;
    const selection = form.querySelector('[data-selection]');
    const count = form.querySelector('[data-count]');
    const status = form.querySelector('[data-compose-status]');
    const send = form.querySelector('button');
    const selected = [];
    let submitting = false;
    let attached = true;
    release = () => {
      attached = false;
      for (const photo of selected) URL.revokeObjectURL(photo.url);
    };

    function message(key) {
      status.hidden = !key;
      status.textContent = key ? L.t('compose.' + key) : '';
    }
    function paintSelection() {
      selection.innerHTML = selected.map((photo, index) => U.button(
        '<img alt="" src="' + L.esc(photo.url) + '" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover">',
        'data-remove="' + index + '" aria-label="' + t('remove', { n: index + 1 }) + '" style="padding:4px"'
      )).join('');
      count.textContent = L.t('compose.count', { n: selected.length });
      selection.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
          if (submitting) return;
          const [photo] = selected.splice(Number(button.dataset.remove), 1);
          URL.revokeObjectURL(photo.url);
          paintSelection();
          message('');
          files.focus();
        };
      });
    }
    files.onchange = () => {
      const batch = Array.from(files.files);
      files.value = '';
      if (selected.length + batch.length > 5) return message('photo');
      for (const file of batch) selected.push({ file, url: URL.createObjectURL(file) });
      paintSelection();
      message('');
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (submitting) return;
      if (!selected.length) return message('photo');
      const data = { text: caption.value.trim(), floor: floor.value, ...(select?.value && { challenge: select.value }) };
      submitting = true;
      for (const field of form.elements) field.disabled = true;
      message('sending');
      try {
        for (const photo of selected) {
          photo.key ||= await L.upload(photo.file, 'post');
          if (!attached) return;
        }
        const result = await L.api('post', { ...data, photos: selected.map(photo => photo.key) });
        if (!attached) return;
        if (result.error === 'busy') return message('busy');
        if (result.error === 'challenge') return message('ended');
        if (result.error === 'closed') {
          view.innerHTML = U.status('soon');
          return;
        }
        if (result.error === 'photo') {
          for (const photo of selected) delete photo.key;
        }
        if (!result.id) {
          U.error(result);
          message('');
          return;
        }
        if (result.gained > 0) L.toast(L.t('compose.earned', { n: result.gained }));
        L.go('feed/' + encodeURIComponent(result.id));
      } catch (error) {
        if (!attached) return;
        if (error.message === 'busy') message('photoLimit');
        else if (error.message === 'auth') {
          L.needLogin();
          message('');
        } else message('upload');
      } finally {
        for (const field of form.elements) field.disabled = false;
        submitting = false;
      }
    };
  }

  L.screen('compose', {
    nav: 'feed', auth: false, title: 'compose.title', render,
    leave() { release?.(); release = undefined; }
  });
})();
