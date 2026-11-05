(function () {
  'use strict';

  const dialog = document.querySelector('#application-dialog');
  const form = document.querySelector('#application-form');
  if (!dialog || !form) return;

  const select = (selector) => dialog.querySelector(selector);
  const preview = select('#application-preview');
  const messageElement = select('#application-message');
  const summary = select('#application-errors');
  const copyButton = select('#application-copy');
  const copyStatus = select('#application-copy-status');
  const manualCopy = select('#application-manual-copy');
  const manualMessage = select('#application-manual-message');
  const sendStatus = select('#application-send-status');
  const categories = new Set(['주점·식당', '노래·룸', '숙박', '파티', '기타']);
  const fieldNames = ['store-name', 'category', 'address', 'contact-name', 'phone', 'email', 'instagram', 'benefit', 'note'];
  const limits = { 'store-name': 60, category: 10, address: 120, 'contact-name': 30, phone: 30, email: 100, instagram: 180, benefit: 300, note: 100 };
  let lastTrigger = null;
  let previousOverflow = '';
  let message = '';
  let copyAttempt = 0;

  function field(name) { return select('#application-' + name); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function line(value) { return clean(value).replace(/\s+/g, ' '); }

  function validEmail(value) {
    if (value.length > 254) return false;
    const parts = value.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
        /[\s<>()[\],:;\\"\u0000-\u001f\u007f]/u.test(local)) return false;
    if (!domain || domain.endsWith('.') || /[\s<>()[\],:;\\/?#%@\u0000-\u001f\u007f]/u.test(domain)) return false;
    try {
      const hostname = new URL('https://' + domain).hostname;
      const labels = hostname.split('.');
      return hostname.length <= 253 && labels.length > 1 && labels.every((label) =>
        /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
    } catch { return false; }
  }

  function validInstagramUsername(value) {
    return /^[A-Za-z0-9_](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?$/.test(value) && !value.includes('..');
  }

  function instagramProfile(value) {
    const input = clean(value);
    if (!input) return '';
    if (/^@?[A-Za-z0-9._]{1,30}$/.test(input)) {
      const username = input.replace(/^@/, '');
      if (!validInstagramUsername(username)) return null;
      return 'https://www.instagram.com/' + username + '/';
    }
    try {
      const candidate = /^(?:www\.)?instagram\.com\//i.test(input) ? 'https://' + input : input;
      const url = new URL(candidate);
      const match = url.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port || !match || !validInstagramUsername(match[1])) return null;
      return 'https://www.instagram.com/' + match[1] + '/';
    } catch { return null; }
  }

  function readValues() {
    return Object.fromEntries(fieldNames.map((name) => [name, ['benefit', 'note'].includes(name) ? clean(field(name).value).replace(/\r\n?/g, '\n') : line(field(name).value)]));
  }

  function applicationMessage(values) {
    return [
      '[그루브앤스팟 신규 제휴 신청]',
      '매장명: ' + values['store-name'],
      '업종: ' + values.category,
      '주소: ' + values.address,
      '담당자: ' + values['contact-name'],
      '전화: ' + (values.phone || '미기재'),
      '이메일: ' + (values.email || '미기재'),
      'Instagram: ' + (values.instagram || '미기재'),
      '',
      '제안 혜택·협의 내용',
      values.benefit,
      '',
      '추가 문의',
      values.note || '없음'
    ].join('\n');
  }

  function clearErrors() {
    summary.textContent = '';
    summary.hidden = true;
    for (const name of fieldNames) {
      field(name).removeAttribute('aria-invalid');
      const error = select('#application-error-' + name);
      error.textContent = '';
      error.hidden = true;
    }
  }

  function validate(values) {
    const errors = new Map();
    const required = { 'store-name': '매장명을 입력해 주세요.', category: '업종을 선택해 주세요.', address: '매장 주소를 입력해 주세요.', 'contact-name': '담당자 이름을 입력해 주세요.', benefit: '제안 혜택이나 협의하고 싶은 내용을 입력해 주세요.' };
    for (const [name, error] of Object.entries(required)) if (!values[name]) errors.set(name, error);
    for (const name of fieldNames) if (values[name].length > limits[name]) errors.set(name, '최대 ' + limits[name].toLocaleString('ko') + '자까지 입력할 수 있습니다.');
    if (values.category && !categories.has(values.category)) errors.set('category', '목록에서 업종을 선택해 주세요.');
    if (!values.phone && !values.email) {
      errors.set('phone', '전화번호 또는 이메일을 한 가지 이상 입력해 주세요.');
      errors.set('email', '전화번호 또는 이메일을 한 가지 이상 입력해 주세요.');
    }
    if (values.phone && (!/^\+?[0-9 ()-]+$/.test(values.phone) || !/^[0-9]{9,15}$/.test(values.phone.replace(/\D/g, '')))) errors.set('phone', '연락 가능한 전화번호를 확인해 주세요. 숫자와 +, 공백, 괄호, -를 사용할 수 있습니다.');
    if (values.email && !validEmail(values.email)) errors.set('email', '이메일 주소를 확인해 주세요. 예: partner@example.com');
    const instagram = instagramProfile(values.instagram);
    if (instagram === null) errors.set('instagram', 'Instagram 아이디 또는 https://instagram.com/아이디 형식의 프로필 주소를 입력해 주세요.');
    else values.instagram = instagram;
    return errors;
  }

  function displayErrors(errors) {
    for (const [name, message] of errors) {
      field(name).setAttribute('aria-invalid', 'true');
      const error = select('#application-error-' + name);
      error.textContent = message;
      error.hidden = false;
    }
    summary.textContent = '입력 내용을 확인해 주세요. 표시된 항목을 수정하면 신청서를 만들 수 있습니다.';
    summary.hidden = false;
    field(errors.keys().next().value).focus();
  }

  function stage(name) {
    for (const item of dialog.querySelectorAll('[data-application-stage]')) {
      if (item.dataset.applicationStage === name) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
  }

  function resetCopy() {
    copyAttempt += 1;
    copyButton.disabled = false;
    copyButton.removeAttribute('aria-busy');
    copyButton.textContent = '01 신청서 복사';
    copyStatus.textContent = '';
    sendStatus.textContent = '';
    manualCopy.hidden = true;
    manualMessage.value = '';
  }

  function resetApplication() {
    form.reset();
    clearErrors();
    message = '';
    messageElement.textContent = '';
    resetCopy();
    preview.hidden = true;
    form.hidden = false;
    stage('form');
  }

  function openApplication(trigger) {
    if (dialog.open) return;
    resetApplication();
    lastTrigger = trigger || document.activeElement;
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    field('store-name').focus();
  }

  function selectManualMessage() {
    manualMessage.focus();
    manualMessage.select();
    manualMessage.setSelectionRange(0, manualMessage.value.length);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();
    const values = readValues();
    const errors = validate(values);
    if (errors.size) { displayErrors(errors); return; }
    message = applicationMessage(values);
    resetCopy();
    messageElement.textContent = message;
    form.hidden = true;
    preview.hidden = false;
    stage('preview');
    select('#application-preview-title').focus();
  });

  select('#application-edit').addEventListener('click', () => {
    message = '';
    messageElement.textContent = '';
    resetCopy();
    preview.hidden = true;
    form.hidden = false;
    stage('form');
    field('store-name').focus();
  });

  copyButton.addEventListener('click', async () => {
    if (!message || copyButton.disabled) return;
    const currentMessage = message;
    const attempt = ++copyAttempt;
    copyButton.disabled = true;
    copyButton.setAttribute('aria-busy', 'true');
    copyButton.textContent = '복사하는 중…';
    copyStatus.textContent = '';
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(currentMessage);
      if (!dialog.open || attempt !== copyAttempt || message !== currentMessage) return;
      copyStatus.textContent = '신청서를 복사했습니다. 공식 DM에 붙여넣어 직접 전송해 주세요.';
      manualCopy.hidden = true;
    } catch {
      if (!dialog.open || attempt !== copyAttempt || message !== currentMessage) return;
      manualMessage.value = currentMessage;
      manualCopy.hidden = false;
      copyStatus.textContent = '자동 복사를 사용할 수 없습니다. 아래 신청서를 선택해 복사해 주세요.';
      selectManualMessage();
    } finally {
      if (attempt === copyAttempt) {
        copyButton.disabled = false;
        copyButton.removeAttribute('aria-busy');
        copyButton.textContent = '01 신청서 복사';
      }
    }
  });

  select('#application-select-message').addEventListener('click', selectManualMessage);
  select('#application-dm').addEventListener('click', () => {
    sendStatus.textContent = '공식 DM에 신청서를 붙여넣고 직접 전송해 주세요. 전송 여부는 이 페이지에서 확인할 수 없습니다.';
  });
  select('#application-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    resetApplication();
    document.body.style.overflow = previousOverflow;
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    else document.querySelector('#partner-apply [data-application-open]')?.focus({ preventScroll: true });
    lastTrigger = null;
  });
  dialog.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  for (const button of document.querySelectorAll('[data-application-open]')) button.addEventListener('click', () => openApplication(button));
}());
