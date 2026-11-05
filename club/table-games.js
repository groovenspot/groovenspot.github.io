(function () {
  'use strict';

  const dialog = document.getElementById('table-games');
  const find = (selector) => dialog.querySelector(selector);
  const picker = [...dialog.querySelectorAll('[data-table-game]')];
  const panels = [...dialog.querySelectorAll('[data-table-panel]')];
  const openButton = document.getElementById('g-table');
  const fingerPad = find('#table-finger-pad');
  const fingerStatus = find('#table-finger-status');
  const fingers = new Map();
  let fingerDeadline = 0;
  let fingerFrame = 0;
  let winner = null;

  function vibrate() {
    if (typeof navigator.vibrate === 'function') navigator.vibrate([100, 40, 160]);
  }

  function fingerTick() {
    const left = fingerDeadline - performance.now();
    if (left > 0) {
      const label = Math.ceil(left / 1000) + '초 · 그대로 유지';
      if (fingerStatus.textContent !== label) fingerStatus.textContent = label;
      fingerFrame = requestAnimationFrame(fingerTick);
      return;
    }
    const entries = [...fingers.values()];
    winner = entries[Math.floor(Math.random() * entries.length)];
    winner.classList.add('is-winner');
    fingerStatus.textContent = '💥 폭탄 당첨!';
    vibrate();
  }

  function armFinger() {
    cancelAnimationFrame(fingerFrame);
    if (fingers.size < 2) {
      fingerStatus.textContent = '두 명 이상 손가락을 올려요';
      return;
    }
    fingerDeadline = performance.now() + 3000;
    fingerTick();
  }

  function resetFinger() {
    cancelAnimationFrame(fingerFrame);
    for (const mark of fingers.values()) mark.remove();
    fingers.clear();
    if (winner) winner.remove();
    winner = null;
    fingerStatus.textContent = '두 명 이상 손가락을 올려요';
  }

  function moveMark(event, mark) {
    const box = fingerPad.getBoundingClientRect();
    mark.style.left = (event.clientX - box.left - fingerPad.clientLeft) + 'px';
    mark.style.top = (event.clientY - box.top - fingerPad.clientTop) + 'px';
  }

  fingerPad.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || winner || fingers.has(event.pointerId)) return;
    const mark = document.createElement('span');
    mark.className = 'finger-mark';
    mark.setAttribute('aria-hidden', 'true');
    moveMark(event, mark);
    fingerPad.appendChild(mark);
    fingers.set(event.pointerId, mark);
    fingerPad.setPointerCapture(event.pointerId);
    armFinger();
  });
  fingerPad.addEventListener('pointermove', (event) => {
    const mark = fingers.get(event.pointerId);
    if (mark && !winner) moveMark(event, mark);
  });
  function releaseFinger(event) {
    const mark = fingers.get(event.pointerId);
    if (!mark) return;
    fingers.delete(event.pointerId);
    if (mark !== winner) mark.remove();
    if (!winner) armFinger();
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    fingerPad.addEventListener(name, releaseFinger);
  }
  find('#table-finger-reset').addEventListener('click', resetFinger);

  const timerAction = find('#table-timer-action');
  const timerRule = find('#table-timer-rule');
  const timerStatus = find('#table-timer-status');
  const timerScores = find('#table-timer-scores');
  const timerRecords = [];
  const target = 700;
  let timerStart = null;

  function record(list, text) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  }

  function timerResult() {
    if (!timerRecords.length) return '';
    const hundredths = timerRule.value === 'hundredths';
    const score = (time) => hundredths ? time % 100 : Math.abs(time - target);
    const best = Math.min(...timerRecords.map(score));
    const leaders = timerRecords.flatMap((time, i) => score(time) === best ? [i + 1 + '번'] : []);
    if (hundredths) return '현재 선두 ' + leaders.join(', ');
    const farthest = Math.max(...timerRecords.map(score));
    const last = timerRecords.flatMap((time, i) => score(time) === farthest ? [i + 1 + '번'] : []);
    return '가장 가까운 기록 ' + leaders.join(', ') + ' / 가장 먼 기록 ' + last.join(', ');
  }

  function showTimer() {
    timerAction.textContent = timerRecords.length + 1 + '번 ' + (timerStart === null ? '시작' : '멈추기');
    timerRule.disabled = timerStart !== null;
    timerStatus.textContent = timerStart === null ? timerResult() : '시간을 가렸어요. 감으로 멈추세요.';
  }

  timerAction.addEventListener('click', () => {
    const now = performance.now();
    if (timerStart === null) {
      timerStart = now;
    } else {
      const time = Math.round((now - timerStart) / 10);
      timerRecords.push(time);
      record(timerScores, timerRecords.length + '번 · ' + (time / 100).toFixed(2) + '초');
      timerStart = null;
    }
    showTimer();
  });
  timerRule.addEventListener('change', showTimer);
  find('#table-timer-reset').addEventListener('click', () => {
    timerStart = null;
    timerRecords.length = 0;
    timerScores.replaceChildren();
    showTimer();
  });

  const reflexPad = find('#table-reflex-pad');
  const reflexStatus = find('#table-reflex-status');
  const reflexScores = find('#table-reflex-scores');
  const reflexRecords = [];
  let reflexDelay = 0;
  let reflexFrame = 0;
  let reflexStart = 0;

  function setReflex(state, text) {
    reflexPad.dataset.state = state;
    reflexPad.textContent = text;
  }

  function readyReflex() {
    clearTimeout(reflexDelay);
    cancelAnimationFrame(reflexFrame);
    setReflex('ready', reflexRecords.length + 1 + '번 시작');
  }

  function tapReflex() {
    const state = reflexPad.dataset.state;
    if (state === 'ready') {
      setReflex('wait', '기다리세요');
      reflexStatus.textContent = '';
      reflexDelay = setTimeout(() => {
        reflexFrame = requestAnimationFrame(() => {
          reflexStart = performance.now();
          setReflex('go', '지금!');
        });
      }, 1600 + Math.random() * 2400);
      return;
    }
    const early = state === 'wait';
    const elapsed = early ? null : Math.round(performance.now() - reflexStart);
    reflexRecords.push(elapsed);
    const turn = reflexRecords.length + '번';
    record(reflexScores, turn + ' · ' + (early ? '헛스윙' : elapsed + ' ms'));
    const times = reflexRecords.filter((time) => time !== null);
    const slowest = times.length ? Math.max(...times) : null;
    const slow = slowest === null ? [] : reflexRecords.flatMap((time, i) => time === slowest ? [i + 1 + '번'] : []);
    reflexStatus.textContent = (early ? turn + ' 헛스윙' : turn + ' · ' + elapsed + ' ms') +
      (slow.length ? ' / 가장 느린 기록 ' + slow.join(', ') + ' · ' + slowest + ' ms' : '');
    readyReflex();
  }

  reflexPad.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    tapReflex();
  });
  reflexPad.addEventListener('click', (event) => {
    if (event.detail === 0) tapReflex();
  });
  find('#table-reflex-reset').addEventListener('click', () => {
    reflexRecords.length = 0;
    reflexScores.replaceChildren();
    reflexStatus.textContent = '';
    readyReflex();
  });

  function pauseGames() {
    resetFinger();
    timerStart = null;
    showTimer();
    readyReflex();
  }

  picker.forEach((button) => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    pauseGames();
    for (const choice of picker) choice.setAttribute('aria-pressed', String(choice === button));
    for (const panel of panels) panel.hidden = panel.dataset.tablePanel !== button.dataset.tableGame;
  }));

  openButton.addEventListener('click', () => {
    dialog.showModal();
    document.getElementById('gamesclose').click();
  });
  dialog.addEventListener('keydown', (event) => event.stopPropagation());
  dialog.addEventListener('close', () => {
    pauseGames();
    document.getElementById('gamesbtn').focus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) pauseGames();
  });
})();
