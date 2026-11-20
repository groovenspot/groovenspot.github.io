(() => {
  const L = Lounge, U = LoungeScreenUI, P = LoungePostUI;
  const t = U.words('compose', {
    title: ['새 사진 글', 'New photo post'], back: ['피드로', 'Back to feed'],
    choose: ['사진 고르기', 'Choose photos'], add: ['사진 더 고르기', 'Add photos'],
    count: ['사진 {n}/5장', '{n}/5 photos'], remove: ['사진 {n} 빼기', 'Remove photo {n}'],
    text: ['글', 'Caption'], prompt: ['오늘 밤 어땠어요?', 'How was your night?'],
    floor: ['층 고르기', 'Floor'], none: ['안 고름', 'None'], preview: ['고른 사진', 'Selected photo'],
    challenge: ['포토 챌린지', 'Photo challenge'], send: ['올리기', 'Publish'],
    sending: ['사진 글을 올리는 중이에요.', 'Publishing your photo post.'],
    photo: ['사진을 1~5장 골라 주세요.', 'Choose 1 to 5 photos.'],
    upload: ['사진을 올리지 못했어요. 다시 시도해 주세요.', 'Could not upload a photo. Please try again.'],
    busy: ['오늘 올릴 수 있는 수를 다 채웠어요.', 'You’ve reached today’s limit.'],
    photoLimit: ['오늘은 사진을 더 올릴 수 없어요.', 'You’ve reached today’s photo upload limit.'],
    ended: ['이 챌린지에는 지금 참여할 수 없어요.', 'This challenge is no longer open.'],
    consent: ['다른 손님의 얼굴이 크게 나온 사진은 허락을 받고 올려 주세요. 사진 속 사람이 신고하면 바로 가려져요.',
      'Get permission before posting a close-up of another guest. A report from someone in the photo hides it immediately.'],
    earned: ['{n}P를 받았어요!', 'You earned {n} points!']
  });
  let release;

  async function render(root, { challenge } = {}) {
    const view = P.mount(root, t('title'),
      '<button class="btn btn-hot" type="submit" form="post-compose" data-publish hidden>' + t('send') + '</button>',
      '<a href="#/feed" class="btn post-close" aria-label="' + t('back') + '">×</a>');
    view.innerHTML = P.skeleton('cover');
    const options = await L.api('post_options');
    if (!view.isConnected) return;
    if (!options.memberPosts) {
      view.innerHTML = P.state(U.t(options.error ? 'error' : 'soon'));
      return;
    }
    if (!L.me) {
      view.innerHTML = U.button(L.esc(L.t('core.login')), 'data-compose-login', true);
      view.querySelector('button').onclick = L.needLogin;
      L.needLogin();
      return;
    }

    const active = Array.isArray(options.active) ? options.active : [];
    view.innerHTML = '<form id="post-compose" class="post-form">' +
      '<p class="post-state" data-compose-status role="status" hidden></p>' +
      '<input type="file" name="files" accept="image/*" multiple hidden>' +
      '<div data-preview></div><div class="post-thumbnails" data-selection data-post-layout hidden></div>' +
      '<p class="post-photo-count" data-count aria-live="polite">' + t('count', { n: 0 }) + '</p>' +
      '<label class="post-field">' + t('text') + '<textarea name="caption" rows="3" maxlength="500" placeholder="' + t('prompt') + '"></textarea></label>' +
      '<fieldset class="post-field post-floors"><legend>' + t('floor') + '</legend><div class="post-bar" data-post-layout>' +
      [['2F', '2F GROOVE'], ['3F', '3F SPOT'], ['', t('none')]].map(([value, label]) =>
        '<label class="post-floor-option"' + (value ? ' data-floor="' + value + '"' : '') +
        '><input class="sr-only" type="radio" name="floor" value="' + value + '"' + (value ? '' : ' checked') +
        '><span>' + label + '</span></label>').join('') + '</div></fieldset>' +
      (active.length ? '<label class="post-field">' + t('challenge') + '<select name="challenge"><option value="">' + t('none') +
        '</option>' + active.map(item => '<option value="' + L.esc(item.id) + '">' + L.esc(item.title) + '</option>').join('') +
        '</select></label>' : '') +
      '<p class="post-note">' + t('consent') + '</p></form>';
    const form = view.querySelector('form');
    const { files, caption, floor, challenge: select } = form.elements;
    if (select && active.some(item => item.id === challenge)) select.value = challenge;
    const preview = form.querySelector('[data-preview]');
    const selection = form.querySelector('[data-selection]');
    const count = form.querySelector('[data-count]');
    const status = form.querySelector('[data-compose-status]');
    const send = view.parentElement.querySelector('[data-publish]');
    send.hidden = false;
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
      const first = selected[0];
      preview.innerHTML = first ? '<div class="post-preview">' + P.image(first.url, t('preview')) + '</div>' :
        '<button class="post-preview post-preview-empty" type="button" data-pick><span aria-hidden="true">+</span>' +
        '<strong>' + t('choose') + '</strong></button>';
      selection.hidden = !first;
      selection.innerHTML = selected.map((photo, index) =>
        '<button class="post-thumb" type="button" data-remove="' + index + '" aria-label="' + t('remove', { n: index + 1 }) +
        '">' + P.image(photo.url) + '<span aria-hidden="true">×</span></button>').join('') +
        (first && selected.length < 5 ? '<button class="post-thumb post-thumb-add" type="button" data-pick aria-label="' +
          t('add') + '">+</button>' : '');
      count.textContent = L.t('compose.count', { n: selected.length });
      form.querySelector('[data-pick]')?.addEventListener('click', () => files.click());
      selection.querySelectorAll('[data-remove]').forEach(button => {
        button.onclick = () => {
          if (submitting) return;
          const [photo] = selected.splice(Number(button.dataset.remove), 1);
          URL.revokeObjectURL(photo.url);
          paintSelection();
          message('');
          form.querySelector('[data-pick], [data-remove]')?.focus();
        };
      });
    }
    paintSelection();
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
          send.hidden = true;
          view.innerHTML = P.state(U.t('soon'));
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
    nav: 'feed', auth: false, selfGate: true, title: 'compose.title', render,
    leave() { release?.(); release = undefined; }
  });
})();
