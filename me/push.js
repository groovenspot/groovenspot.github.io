(function () {
  'use strict';
  var SCOPE = '/me/', REF = 'gs_me_push_ref';

  function browser() {
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var installed = !!navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    return { ios: ios, installed: installed, push: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window };
  }
  function remember(k, on) {
    try {
      if (on) localStorage.setItem(REF, k);
      else if (localStorage.getItem(REF) === k) localStorage.removeItem(REF);
    } catch (e) {}
  }
  function remembered() {
    try {
      var k = localStorage.getItem(REF);
      return /^[A-Za-z0-9]{24,40}$/.test(k || '') && localStorage.getItem('gs_me_' + k) ? k : '';
    } catch (e) { return ''; }
  }
  function proof(sub) {
    if (!sub) return undefined;
    var j = sub.toJSON(), auth = j.keys && j.keys.auth;
    return auth ? { endpoint: j.endpoint, auth: auth } : undefined;
  }
  function key(v) {
    return Uint8Array.from(atob(v.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - v.length % 4) % 4)), function (c) { return c.charCodeAt(0); });
  }
  function mount(node, ctx) {
    var env = browser(), can = env.push && (!env.ios || env.installed), reg, sub, vk, prefs, ready = false, busy = false, leaving = false;
    node.innerHTML = '<h2 class="me-h">알림 설정</h2>' +
      (env.ios && !env.installed ? '<div class="me-push-ios" id="me-push-ios"><strong>아이폰은 홈 화면 앱에서 알림을 받아요</strong><ol>' +
        '<li>Safari에서 공유 버튼을 누르고 <b>홈 화면에 추가</b>를 골라 주세요.</li>' +
        '<li>홈 화면에서 앱을 열고 받은 내 페이지 링크를 붙여넣은 뒤, 본인 확인을 해 주세요.</li>' +
        '<li>이곳에서 <b>알림 받기</b>를 눌러 주세요.</li></ol></div>' : '') +
      '<button class="btn btn-hot me-save" type="button" id="me-push-toggle" disabled>알림 받기</button>' +
      '<p class="me-note" id="me-push-state"></p><div id="me-push-types" class="me-push-types"></div>' +
      '<p class="me-note">생일 축하와 파티 소식은 혜택 안내에 동의한 경우에만 와요.</p>' +
      '<p class="me-msg" id="me-push-msg" role="status"></p>';
    var toggle = node.querySelector('#me-push-toggle'), state = node.querySelector('#me-push-state'), types = node.querySelector('#me-push-types'), msg = node.querySelector('#me-push-msg');
    function request(action, extra, token) {
      return ctx.api(Object.assign({ a: action, k: ctx.k, t: token || ctx.token() }, extra || {}));
    }
    function message(s, success) { msg.textContent = s; msg.classList.toggle('ok', !!success); }
    function paint() {
      var on = !!(prefs && prefs.on);
      toggle.disabled = !can || !ready || !prefs || busy;
      toggle.textContent = on ? '이 기기 알림 끄기' : '알림 받기';
      state.textContent = !can ? (env.ios && !env.installed ? '홈 화면 앱에서 알림을 켤 수 있어요.' : '이 브라우저는 웹 알림을 지원하지 않아요.') :
        (!ready ? '기기 알림 연결을 확인하는 중이에요.' : on ? '이 기기에서 웹 알림을 받고 있어요.' : '이 기기의 웹 알림이 꺼져 있어요.');
      types.querySelectorAll('input').forEach(function (x) { x.disabled = busy; });
    }
    function draw(settings) {
      prefs = settings;
      types.replaceChildren();
      settings.types.forEach(function (x) {
        var label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
        label.className = 'me-chk'; input.type = 'checkbox'; input.value = x.id; input.checked = settings.off.indexOf(x.id) < 0;
        text.textContent = x.label + (x.ad ? ' (광고)' : '');
        label.append(input, text); types.append(label);
      });
      if (settings.on) remember(ctx.k, true);
      else remember(ctx.k, false);
      paint();
    }
    function refresh() {
      return request('me_push_settings', { sub: proof(sub) }).then(function (r) {
        if (leaving || !node.isConnected) return;
        if (!r.ok) { message('알림 설정을 열지 못했어요. 내 페이지를 다시 열어 주세요.'); return; }
        draw(r);
      });
    }
    types.addEventListener('change', function () {
      if (busy || !prefs) return;
      var off = Array.prototype.filter.call(types.querySelectorAll('input'), function (x) { return !x.checked; }).map(function (x) { return x.value; });
      busy = true; paint();
      request('me_push_settings', { off: off, sub: proof(sub) }).then(function (r) {
        if (!r.ok) throw new Error('save');
        if (leaving || !node.isConnected) return;
        draw(r); message('알림 설정을 저장했어요.', true);
      }).catch(function () { if (!leaving && node.isConnected) { draw(prefs); message('설정을 저장하지 못했어요. 다시 해 주세요.'); } }).finally(function () { busy = false; paint(); });
    });
    function disconnect(device, token) {
      return request('me_push_unsub', { sub: proof(device) }, token).catch(function () {}).finally(function () {
        return device.unsubscribe().catch(function () {});
      });
    }
    toggle.addEventListener('click', async function () {
      if (busy || !reg || !vk || !prefs) return;
      var token = ctx.token();
      busy = true; paint(); message('');
      try {
        if (prefs.on) {
          var off = await request('me_push_unsub', { sub: proof(sub) });
          if (!off.ok) throw new Error('off');
          if (sub) try { await sub.unsubscribe(); } catch (e) {}
          sub = null;
          await refresh(); message('이 기기 알림을 껐어요.', true);
        } else {
          if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vk });
          var device = sub;
          if (leaving) { await device.unsubscribe(); return; }
          var on = await request('me_push_sub', { sub: proof(device) }, token);
          if (leaving) { await disconnect(device, token); return; }
          if (!on.ok) throw new Error('on');
          await refresh(); message('이 기기 알림을 켰어요.', true);
        }
      } catch (e) {
        message(Notification.permission === 'denied' ? '알림 권한이 꺼져 있어요. 기기의 사이트 알림 설정을 확인해 주세요.' : '알림 연결을 바꾸지 못했어요. 다시 해 주세요.');
      } finally { busy = false; paint(); }
    });
    paint();
    if (can) {
      Promise.all([
        navigator.serviceWorker.register('/me/sw.js', { scope: SCOPE }).then(function () { return navigator.serviceWorker.ready; }),
        ctx.api({ a: 'push_key' })
      ]).then(function (values) {
        reg = values[0];
        if (!reg || reg.scope !== new URL(SCOPE, location.origin).href || !values[1].ok || !values[1].key) throw new Error('scope');
        vk = key(values[1].key);
        return reg.pushManager.getSubscription();
      }).then(function (existing) {
        if (leaving || !node.isConnected) return;
        sub = existing; ready = true;
        return refresh();
      }).catch(function () {
        can = false; paint(); message('이 기기에서 웹 알림을 준비하지 못했어요.');
        return refresh().catch(function () {});
      });
    } else refresh().catch(function () { message('알림 설정을 열지 못했어요.'); });
    return function leave(token) {
      leaving = true; remember(ctx.k, false);
      if (sub && prefs && prefs.on) disconnect(sub, token);
    };
  }
  window.GrooveMePush = { mount: mount, remembered: remembered, forget: function (k) { remember(k, false); } };
})();
