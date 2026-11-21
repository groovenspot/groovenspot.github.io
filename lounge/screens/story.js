/* 24시간 스토리 (4차 · lounge/SPEC4.md 7장) — 주인: 스토리·글쓰기 작업창(D)
   L.storyTray(el)            피드 맨 위 동그라미 줄 (내 스토리 ＋ · 안 본 사람 주황 테두리 · 본 사람 회색)
   L.storyOpen(nick)          그 사람 스토리를 전체 화면으로 (없으면 false) · 주소 #/story/<닉>
   L.storyViewer({items,title}) 스토리 모양 뷰어만 (프로필 하이라이트가 씀) → { close() } 또는 null
   L.storyNew()               올리기 (사진 1장 + 글 100자 + 층)
   스위치 L.open('stories') 가 꺼져 있으면 줄·뷰어·올리기 모두 아무것도 안 보인다. */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('story', {
    title: ['스토리', 'Stories'], mine: ['내 스토리', 'Your story'], add: ['스토리 올리기', 'Add to your story'],
    viewMine: ['내 스토리 보기', 'View your story'], of: ['{nick}님의 스토리', '{nick}’s story'],
    fresh: ['새 스토리', 'new'], seen: ['모두 봄', 'seen'],
    prev: ['이전', 'Previous'], next: ['다음', 'Next'], pause: ['멈춤', 'Pause'], play: ['재생', 'Play'], close: ['닫기', 'Close'], more: ['더 보기', 'More'],
    reply: ['메시지 보내기', 'Send message'], like: ['좋아요', 'Like'], unlike: ['좋아요 취소', 'Unlike'],
    views: ['본 사람 {n}', 'Seen by {n}'], viewers: ['본 사람', 'Viewers'], viewersN: ['{n}명이 봤어요', 'Seen by {n}'],
    viewersNote: ['내 스토리를 본 사람 목록은 나에게만 보여요.', 'Only you can see who viewed your story.'],
    noViewers: ['아직 본 사람이 없어요.', 'No one has seen this yet.'], liked: ['좋아요를 눌렀어요', 'Liked'],
    report: ['신고하기', 'Report'], take: ['사진을 내려 주세요', 'Take this photo down'],
    del: ['스토리 삭제', 'Delete story'], delAsk: ['이 스토리를 삭제할까요?', 'Delete this story?'], delBody: ['삭제하면 되돌릴 수 없어요.', 'This can’t be undone.'],
    deleted: ['삭제했어요', 'Deleted'], hidden: ['가렸어요', 'Hidden'],
    gone: ['볼 수 있는 스토리가 없어요. 24시간이 지났거나 삭제됐어요.', 'No story to show. It expired after 24 hours or was deleted.'],
    locked: ['이 스토리는 볼 수 없어요.', 'You can’t view this story.'], toFeed: ['피드로', 'Back to feed'],
    newTitle: ['새 스토리', 'New story'], album: ['사진첩', 'Photo library'], camera: ['카메라', 'Camera'],
    pickHint: ['사진 1장을 골라 주세요', 'Choose one photo'], change: ['사진 바꾸기', 'Change photo'],
    text: ['글', 'Caption'], prompt: ['한마디 남기기 (선택)', 'Say something (optional)'], chars: ['{n}/100', '{n}/100'], floor: ['층', 'Floor'], none: ['안 고름', 'None'],
    share: ['스토리에 공유', 'Share to story'], sharing: ['스토리에 올리는 중…', 'Sharing to your story…'], shared: ['스토리에 올렸어요', 'Shared to your story'],
    limit: ['오늘 올릴 수 있는 스토리를 다 올렸어요.', 'You’ve reached today’s story limit.'],
    failed: ['스토리를 올리지 못했어요. 다시 시도해 주세요.', 'Couldn’t share your story. Please try again.'],
    badPhoto: ['이 사진은 열 수 없어요. 다른 사진을 골라 주세요.', 'This photo can’t be opened. Choose another one.'],
    later: ['지금은 올릴 수 없어요. 잠시 뒤 다시 시도해 주세요.', 'Can’t share right now. Please try again in a moment.'],
    rule: ['24시간 뒤 자동으로 사라지고 사진도 지워져요. 본 사람 목록은 올린 사람에게 보여요. 연락처·링크는 자동으로 가려져요.',
      'Stories disappear after 24 hours and the photo is deleted. The person who posts can see who viewed it. Phone numbers, IDs and links are hidden automatically.']
  });
  L.i18n({
    ja: {
      'story.title': 'ストーリー', 'story.mine': 'あなたのストーリー', 'story.add': 'ストーリーに追加', 'story.viewMine': '自分のストーリーを見る', 'story.of': '{nick}さんのストーリー',
      'story.fresh': '新着', 'story.seen': '閲覧済み', 'story.prev': '前へ', 'story.next': '次へ', 'story.pause': '一時停止', 'story.play': '再生', 'story.close': '閉じる', 'story.more': 'その他',
      'story.reply': 'メッセージを送る', 'story.like': 'いいね', 'story.unlike': 'いいねを取り消す', 'story.views': '閲覧 {n}', 'story.viewers': '閲覧者', 'story.viewersN': '{n}人が見ました',
      'story.viewersNote': 'ストーリーを見た人の一覧は自分だけに表示されます。', 'story.noViewers': 'まだ誰も見ていません。', 'story.liked': 'いいねしました',
      'story.report': '報告する', 'story.take': 'この写真を取り下げてください', 'story.del': 'ストーリーを削除', 'story.delAsk': 'このストーリーを削除しますか？', 'story.delBody': '削除すると元に戻せません。',
      'story.deleted': '削除しました', 'story.hidden': '非表示にしました', 'story.gone': '表示できるストーリーがありません。24時間が過ぎたか、削除されました。',
      'story.locked': 'このストーリーは見られません。', 'story.toFeed': 'フィードへ', 'story.newTitle': '新しいストーリー', 'story.album': '写真ライブラリ', 'story.camera': 'カメラ',
      'story.pickHint': '写真を1枚選んでください', 'story.change': '写真を変更', 'story.text': 'キャプション', 'story.prompt': 'ひとこと（任意）', 'story.chars': '{n}/100', 'story.floor': 'フロア', 'story.none': '選択しない',
      'story.share': 'ストーリーでシェア', 'story.sharing': 'ストーリーに投稿中…', 'story.shared': 'ストーリーに投稿しました', 'story.limit': '今日投稿できるストーリーの上限に達しました。',
      'story.failed': 'ストーリーを投稿できませんでした。もう一度お試しください。', 'story.badPhoto': 'この写真は開けません。別の写真を選んでください。',
      'story.later': '今は投稿できません。しばらくしてからもう一度お試しください。',
      'story.rule': '24時間後に自動で消え、写真も削除されます。閲覧者の一覧は投稿した人に表示されます。連絡先・リンクは自動で伏せられます。'
    },
    zh: {
      'story.title': '快拍', 'story.mine': '你的快拍', 'story.add': '添加到快拍', 'story.viewMine': '查看我的快拍', 'story.of': '{nick} 的快拍',
      'story.fresh': '有新快拍', 'story.seen': '已看完', 'story.prev': '上一个', 'story.next': '下一个', 'story.pause': '暂停', 'story.play': '播放', 'story.close': '关闭', 'story.more': '更多',
      'story.reply': '发送消息', 'story.like': '赞', 'story.unlike': '取消赞', 'story.views': '{n} 人看过', 'story.viewers': '看过的人', 'story.viewersN': '{n} 人看过',
      'story.viewersNote': '看过你快拍的人只有你自己能看到。', 'story.noViewers': '还没有人看过。', 'story.liked': '已点赞',
      'story.report': '举报', 'story.take': '请撤下这张照片', 'story.del': '删除快拍', 'story.delAsk': '要删除这条快拍吗？', 'story.delBody': '删除后无法恢复。',
      'story.deleted': '已删除', 'story.hidden': '已隐藏', 'story.gone': '没有可以查看的快拍。可能已超过 24 小时或已被删除。',
      'story.locked': '无法查看这条快拍。', 'story.toFeed': '返回动态', 'story.newTitle': '新快拍', 'story.album': '相册', 'story.camera': '相机',
      'story.pickHint': '请选择 1 张照片', 'story.change': '更换照片', 'story.text': '文字', 'story.prompt': '说点什么（可选）', 'story.chars': '{n}/100', 'story.floor': '楼层', 'story.none': '不选择',
      'story.share': '分享到快拍', 'story.sharing': '正在发布快拍…', 'story.shared': '已发布到快拍', 'story.limit': '今天可以发布的快拍已达上限。',
      'story.failed': '快拍发布失败，请重试。', 'story.badPhoto': '无法打开这张照片，请换一张。',
      'story.later': '现在无法发布，请稍后再试。',
      'story.rule': '快拍会在 24 小时后自动消失，照片也会被删除。发布者可以看到谁看过。联系方式和链接会自动隐藏。'
    }
  });

  const TEXT = 100, HOLD = 220, CLOSE_PULL = 90;
  const FLOORS = [['2F', '2F GROOVE'], ['3F', '3F SPOT'], ['', null]];
  const icon = (name, opt) => L.icon(name, opt);
  const src = value => U.image(typeof value === 'string' ? value : value?.src || value?.url || value?.key || '');
  const sheet = () => document.getElementById('sheet');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trays = new Set();
  let current = null, afterPop = null;

  // 스위치: 공통 틀이 설정을 아직 못 받았을 수 있어 꺼져 보이면 한 번 직접 물어본다.
  async function ready() {
    if (L.open('stories')) return true;
    const config = await L.api('config');
    return config?.open?.stories === true;
  }

  // ── 전체 화면 층 ── #sheet(20) 아래 · 아래 탭(10) 위. 열려 있는 동안 #app 은 inert, 닫으면 포커스 복귀.
  function layer(className, label, onSheet) {
    const app = document.getElementById('app'), focus = document.activeElement;
    const el = document.createElement('div');
    el.className = 'sv-layer ' + className;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', label);
    el.tabIndex = -1;
    document.body.append(el);
    document.body.classList.add('sv-open');
    app.inert = true;
    // 메뉴·신고 시트가 닫히면 공통 틀이 #app 을 다시 풀어 버린다 → 층이 떠 있는 동안은 다시 잠근다.
    const watch = new MutationObserver(() => {
      const open = !sheet().hidden;
      if (!open) app.inert = true;
      onSheet?.(open);
    });
    watch.observe(sheet(), { attributes: true, attributeFilter: ['hidden'] });
    return {
      el,
      close() {
        watch.disconnect();
        el.remove();
        if (!document.querySelector('.sv-layer')) {
          document.body.classList.remove('sv-open');
          app.inert = !sheet().hidden;
        }
        if (focus?.isConnected) focus.focus({ preventScroll: true });
      }
    };
  }
  window.addEventListener('popstate', () => {
    if (current?.pushed) { current.pushed = false; current.close(); }
    if (afterPop) { const run = afterPop; afterPop = null; run(); }
  });
  window.addEventListener('hashchange', () => { if (current && !current.route) current.close(); });

  // ── 뷰어 ── groups = [{ user:{nick,photo,tag}, title, items, load() }] · story=true 면 좋아요·답장·본 사람·신고
  function openViewer({ groups, at = 0, story = false, route = false, title = '', onClose }) {
    current?.close();
    const duration = () => Number(L.storyMs) > 0 ? Number(L.storyMs) : 5000;
    let g = at, i = 0, elapsed = 0, last = 0, frame = 0, paused = false, held = false, loading = true, dragging = false, closed = false, version = 0;
    const view = layer('sv', L.t('story.title'), () => {});
    const el = view.el;
    el.innerHTML = '<div class="sv-frame" data-frame><img class="sv-bg" data-bg alt="" aria-hidden="true"><img class="sv-photo" data-photo alt="" draggable="false">' +
      '<div class="sv-load" data-load role="status"><i></i><span class="sr-only">' + U.t('loading') + '</span></div>' +
      '<button type="button" class="sv-tap sv-tap-prev" data-prev aria-label="' + t('prev') + '"></button>' +
      '<button type="button" class="sv-tap sv-tap-next" data-next aria-label="' + t('next') + '"></button>' +
      '<div class="sv-top"><div class="sv-bars" data-bars aria-hidden="true"></div><div class="sv-head"><div class="sv-who" data-who></div>' +
      '<button type="button" class="sv-btn" data-pause aria-label="' + t('pause') + '" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path data-pause-icon d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg></button>' +
      '<button type="button" class="sv-btn" data-menu aria-label="' + t('more') + '" hidden>' + icon('more') + '</button>' +
      '<button type="button" class="sv-btn" data-close aria-label="' + t('close') + '">' + icon('close') + '</button></div></div>' +
      '<div class="sv-bottom"><p class="sv-text" data-text></p><div class="sv-actions" data-actions></div></div></div>';
    const q = name => el.querySelector('[data-' + name + ']');
    const box = q('frame'), photo = q('photo'), bg = q('bg'), bars = q('bars'), who = q('who'), text = q('text'), actions = q('actions'), spinner = q('load');
    const item = () => groups[g]?.items?.[i];
    const running = () => !closed && !paused && !held && !loading && !dragging && sheet().hidden && !document.hidden;

    function tick(now) {
      if (closed) return;
      if (running()) elapsed += Math.min(now - last, 250);
      last = now;
      const fill = bars.children[i]?.firstElementChild;
      if (fill) fill.style.transform = 'scaleX(' + Math.min(1, elapsed / duration()) + ')';
      if (elapsed >= duration()) { elapsed = 0; step(1); }
      frame = requestAnimationFrame(tick);
    }
    function paintPause() {
      const button = q('pause');
      button.setAttribute('aria-pressed', paused);
      button.setAttribute('aria-label', L.t(paused ? 'story.play' : 'story.pause'));
      q('pause-icon').setAttribute('d', paused ? 'M8 5v14l11-7z' : 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z');
    }
    function paintActions() {
      const now = item(), group = groups[g];
      q('menu').hidden = !story;
      if (!story || !now) { actions.innerHTML = ''; return; }
      if (now.mine) {
        actions.innerHTML = '<button type="button" class="sv-pill" data-viewers>' + icon('eye', { size: 20 }) + '<span>' + t('views', { n: L.count(now.views || 0) }) + '</span></button>' +
          '<button type="button" class="sv-round" data-add aria-label="' + t('add') + '">' + icon('plus', { size: 22 }) + '</button>';
      } else {
        actions.innerHTML = (L.open('dm') && group.user?.nick && group.canMessage !== false ? '<button type="button" class="sv-pill sv-reply" data-reply>' + icon('send', { size: 18 }) + '<span>' + t('reply') + '</span></button>' : '<span class="sv-space"></span>') +
          '<button type="button" class="sv-round" data-like aria-pressed="' + Boolean(now.liked) + '" aria-label="' + t(now.liked ? 'unlike' : 'like') + '">' + icon('heart', { size: 26, fill: Boolean(now.liked) }) + '</button>';
      }
    }
    async function show(nextGroup, nextItem) {
      const request = ++version, group = groups[nextGroup];
      if (!group) return close();
      g = nextGroup; elapsed = 0; loading = true;
      spinner.hidden = false;
      if (!group.items) {
        photo.removeAttribute('src'); bg.removeAttribute('src'); text.textContent = ''; actions.innerHTML = ''; bars.innerHTML = '';
        paintWho(group, null);
        let items = [];
        try { items = await group.load(group) || []; } catch (error) { console.error(error); }
        if (closed || request !== version) return;
        group.items = items;
      }
      if (!group.items.length) {       // 그 사이에 사라진 사람: 다음 사람으로 (없으면 닫기)
        groups.splice(nextGroup, 1);
        if (nextGroup >= groups.length) return close();        // 마지막 사람이었으면 닫는다
        return show(nextGroup, story ? 'fresh' : 0);
      }
      i = nextItem === 'last' ? group.items.length - 1 : nextItem === 'fresh' ? Math.max(0, group.items.findIndex(one => !one.seen)) : Math.min(nextItem, group.items.length - 1);
      const now = group.items[i], url = src(now.photo);
      if (story && group.canMessage === undefined && group.user?.nick && L.open('dm') && !now.mine) {      // 메시지를 받을 수 있는 사람인지 (SPEC4 5장 canMessage)
        group.canMessage = null;
        L.api('user', { nick: group.user.nick }).then(result => {
          group.canMessage = result.user?.canMessage !== false && !result.error;
          if (!closed && groups[g] === group) paintActions();
        });
      }
      bars.innerHTML = group.items.map((_, n) => '<span' + (n < i ? ' data-done' : '') + '><i></i></span>').join('');
      paintWho(group, now);
      text.textContent = now.text || '';
      text.hidden = !now.text;
      paintActions();
      const done = () => { if (closed || request !== version) return; loading = false; spinner.hidden = true; };
      photo.onload = photo.onerror = done;
      photo.setAttribute('src', url); bg.setAttribute('src', url);
      photo.alt = now.text || L.t('story.of', { nick: group.user?.nick || now.author?.nick || '' });
      if (photo.complete && photo.naturalWidth) done();
      if (story && !now.seen && !now.mine) { now.seen = true; L.api('story_seen', { id: now.id }); }
      const ahead = group.items[i + 1] || groups[g + 1]?.items?.[0];
      if (ahead) new Image().src = src(ahead.photo);
      if (!groups[g + 1]?.items && groups[g + 1]?.load && i === group.items.length - 1) {     // 다음 사람 것을 미리 받아 둔다
        const coming = groups[g + 1];
        coming.pending ||= Promise.resolve(coming.load(coming)).then(items => { coming.items ||= items || []; }).catch(() => {});
      }
    }
    function paintWho(group, now) {
      const person = group.user || now?.author || {};
      const nick = person.nick || '';
      who.innerHTML = (nick ? '<a class="sv-who-link" href="#/u/' + encodeURIComponent(nick) + '">' + L.avatar(person, 32) + '<strong>' + L.esc(nick) + '</strong></a>' : '') +
        (group.title || title ? '<span class="sv-title">' + L.esc(group.title || title) + '</span>' : '') +
        (now?.at ? '<span class="sv-time">' + L.esc(L.ago(now.at)) + '</span>' : '') +
        (now?.floor === '2F' || now?.floor === '3F' ? '<span class="sv-floor" data-floor="' + now.floor + '">' + now.floor + '</span>' : '');
    }
    function step(way) {
      const group = groups[g];
      if (!group?.items) return;
      if (way > 0) {
        if (i + 1 < group.items.length) return void show(g, i + 1);
        if (g + 1 < groups.length) return void show(g + 1, story ? 'fresh' : 0);
        return close();
      }
      if (i > 0) return void show(g, i - 1);
      if (g > 0) return void show(g - 1, 'last');
      elapsed = 0;
    }
    function person(way) {           // 다음·이전 사람으로 (다음 사람이 없으면 닫기)
      if (way > 0) return g + 1 < groups.length ? void show(g + 1, story ? 'fresh' : 0) : close();
      if (g > 0) return void show(g - 1, story ? 'fresh' : 0);
      elapsed = 0;
    }
    function dropItem() {            // 지금 보던 것이 지워졌거나 가려졌을 때
      const group = groups[g];
      group.items.splice(i, 1);
      if (group.items.length) return void show(g, Math.min(i, group.items.length - 1));
      groups.splice(g, 1);
      if (g >= groups.length) return close();
      show(g, story ? 'fresh' : 0);
    }
    function close(then) {
      if (closed) return then?.();
      closed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keys, true);
      if (current === api) current = null;
      view.close();
      refreshTrays();
      try { onClose?.(Boolean(then)); } catch (error) { console.error(error); }
      if (api.pushed && history.state?.loungeStory) { api.pushed = false; afterPop = then || null; history.back(); }
      else then?.();
    }
    const leaveTo = hash => close(() => { location.hash = hash; });

    function keys(event) {
      if (!sheet().hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return close(); }
      if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === ' ' && !event.target.closest?.('button, a, input, textarea')) { paused = !paused; paintPause(); }
      else if (event.key === 'Tab') {       // 포커스를 층 안에 가둔다
        const stops = [...el.querySelectorAll('a[href], button')].filter(node => !node.hidden && !node.disabled && node.getClientRects().length);
        const first = stops[0], end = stops.at(-1);
        if (!first) return;
        if (event.shiftKey ? document.activeElement === first || document.activeElement === el : document.activeElement === end) {
          event.preventDefault();
          (event.shiftKey ? end : first).focus();
        }
        return;
      } else return;
      event.preventDefault();
    }
    document.addEventListener('keydown', keys, true);

    // 누르기: 짧게 = 왼쪽 이전 · 오른쪽 다음 / 길게 = 멈춤 / 아래로 끌기 = 닫기
    let press = null, holdTimer = 0;
    box.addEventListener('pointerdown', event => {
      if (event.button > 0 || event.target.closest('.sv-head, .sv-actions')) return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, prev: Boolean(event.target.closest('[data-prev]')) || event.clientX - box.getBoundingClientRect().left < box.clientWidth * 0.3 };
      box.setPointerCapture?.(event.pointerId);
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { if (press && !dragging) { held = true; el.classList.add('is-held'); } }, HOLD);
    });
    box.addEventListener('pointermove', event => {
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x, dy = event.clientY - press.y;
      if (Math.hypot(dx, dy) > 12) clearTimeout(holdTimer);      // 움직이면 '길게 누르기'가 아니다
      if (!dragging && !held && dy > 12 && dy > Math.abs(dx) * 1.2) { dragging = true; el.classList.add('is-dragging'); }
      if (dragging) {
        const pull = Math.max(0, dy);
        box.style.transform = 'translateY(' + pull + 'px) scale(' + Math.max(0.85, 1 - pull / 1600) + ')';
        el.style.setProperty('--sv-dim', String(Math.max(0.35, 1 - pull / 500)));
      }
    });
    const release = event => {
      if (!press || event.pointerId !== press.id) return;
      clearTimeout(holdTimer);
      const { x, y, prev } = press, dx = event.clientX - x, dy = event.clientY - y, moved = Math.hypot(dx, dy);
      press = null;
      if (dragging) {
        dragging = false;
        el.classList.remove('is-dragging');
        if (event.type === 'pointerup' && dy > CLOSE_PULL) return close();
        box.style.transform = '';
        el.style.removeProperty('--sv-dim');
      } else if (held) { /* 길게 누르기: 놓으면 이어서 */ }
      else if (event.type === 'pointerup' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) person(dx < 0 ? 1 : -1);     // 옆으로 밀기 = 다음·이전 사람
      else if (event.type === 'pointerup' && moved < 12) step(prev ? -1 : 1);
      if (held) { held = false; el.classList.remove('is-held'); }
    };
    box.addEventListener('pointerup', release);
    box.addEventListener('pointercancel', release);
    box.addEventListener('contextmenu', event => event.preventDefault());

    el.addEventListener('click', async event => {
      const hit = name => event.target.closest('[data-' + name + ']');
      const link = event.target.closest('a[href^="#/"]');
      if (link) { event.preventDefault(); return leaveTo(link.getAttribute('href')); }
      if (hit('prev')) { if (event.detail === 0) step(-1); return; }      // 키보드·보조 기기로 누른 경우(손가락은 위 pointer 처리)
      if (hit('next')) { if (event.detail === 0) step(1); return; }
      if (hit('close')) return close();
      if (hit('pause')) { paused = !paused; return paintPause(); }
      const now = item(), group = groups[g];
      if (!now) return;
      if (hit('reply')) return leaveTo('#/dm/' + encodeURIComponent(group.user.nick));
      if (hit('like')) {
        const liked = !now.liked;
        now.liked = liked; paintActions();
        el.querySelector('[data-like]')?.focus({ preventScroll: true });
        const result = await L.api(liked ? 'story_like' : 'story_unlike', { id: now.id });
        if (result.error) { now.liked = !liked; if (item() === now) paintActions(); U.error(result); }
        return;
      }
      if (hit('viewers')) return viewers(now, leaveTo);
      if (hit('add')) return close(() => { L.storyNew(); });
      if (hit('menu')) {
        const remove = () => { if (item() === now) dropItem(); };
        return void L.menu(now.mine ? [
          { label: L.t('story.views', { n: L.count(now.views || 0) }), icon: 'eye', on: () => viewers(now, leaveTo) },
          { label: L.t('story.add'), icon: 'plus', on: () => close(() => { L.storyNew(); }) },
          { label: L.t('story.del'), icon: 'trash', danger: true, on: async () => {
            if (!await L.confirm(L.t('story.delAsk'), { ok: L.t('story.del'), danger: true, body: L.t('story.delBody') })) return;
            const result = await L.api('story_del', { id: now.id });
            if (result.error && result.error !== 'missing') return U.error(result);
            L.toast(L.t('story.deleted'));
            remove();
          } }
        ] : [
          { label: L.t('story.report'), icon: 'flag', danger: true, on: () => {
            if (L.needLogin()) return;
            let gone = false;
            U.reason({ title: t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
              submit: async why => { const result = await L.api('report', { kind: 'story', id: now.id, why }); gone = result.hidden === true; return result; },
              done: () => { if (gone) remove(); } });
          } },
          { label: L.t('story.take'), icon: 'image', on: () => {
            if (L.needLogin()) return;
            U.reason({ title: t('take'), reasons: ['me'], submit: why => L.api('takedown', { photo: now.photo, why }), done: remove });
          } }
        ]);
      }
    });

    const api = { close, route, pushed: false, el };
    current = api;
    if (!route) { try { history.pushState({ loungeStory: Date.now() }, ''); api.pushed = true; } catch { /* 주소 기록을 못 쓰면 뒤로 가기만 안 됨 */ } }
    el.focus({ preventScroll: true });
    last = performance.now();
    frame = requestAnimationFrame(tick);
    show(g, story ? 'fresh' : 0);
    return api;
  }

  // 본 사람 목록 (올린 사람만)
  function viewers(story, leaveTo) {
    const panel = L.sheet('<div class="sv-sheet-head"><h2 data-viewers-title>' + t('viewers') + '</h2><button type="button" class="btn sv-sheet-close" data-viewers-close>' + t('close') + '</button></div>' +
      '<p class="sv-sheet-note">' + t('viewersNote') + '</p><div class="sv-viewers" data-viewers-list><p class="sv-sheet-note" role="status">' + U.t('loading') + '</p></div>');
    panel.classList.add('sv-sheet');
    const list = panel.querySelector('[data-viewers-list]'), people = [];
    panel.querySelector('[data-viewers-close]').onclick = L.closeSheet;
    async function load(before) {
      const result = await L.api('story_viewers', { id: story.id, ...(before && { before }) });
      if (!panel.isConnected) return;
      if (!Array.isArray(result.list)) { list.innerHTML = '<p class="sv-sheet-note">' + U.t('error') + '</p>'; return; }
      people.push(...result.list);
      story.views = result.n ?? people.length;
      panel.querySelector('[data-viewers-title]').textContent = L.t('story.viewersN', { n: L.count(story.views) });
      list.innerHTML = people.length ? people.map((person, n) => '<button type="button" class="sv-viewer" data-viewer="' + n + '">' + L.avatar(person, 44) +
        '<span class="sv-viewer-nick">' + L.whoTag(person) + '</span>' + (person.liked ? '<span class="sv-viewer-like" role="img" aria-label="' + t('liked') + '">' + icon('heart', { size: 18, fill: true }) + '</span>' : '') + '</button>').join('') +
        (result.before ? '<button type="button" class="btn sv-viewers-more" data-viewers-more>' + L.esc(L.t('ui.more')) + '</button>' : '')
        : '<p class="sv-sheet-note">' + t('noViewers') + '</p>';
      const more = list.querySelector('[data-viewers-more]');
      if (more) more.onclick = () => { more.disabled = true; load(result.before); };
    }
    list.addEventListener('click', event => {
      const row = event.target.closest('[data-viewer]');
      if (!row) return;
      const nick = people[Number(row.dataset.viewer)].nick;
      L.closeSheet();
      leaveTo('#/u/' + encodeURIComponent(nick));
    });
    load();
  }

  // ── 스토리 줄 ──
  function paintTray(el, data) {
    const me = L.me, mine = data.me && data.me.n > 0;
    const person = (row, label, attrs, extra) => '<li><button type="button" class="st-item" ' + attrs + ' aria-label="' + label + '">' +
      '<span class="st-face">' + L.avatar(row, 62, { ring: true }) + (extra || '') + '</span><span class="st-name">' + L.esc(row.label || row.nick) + '</span></button></li>';
    el.innerHTML = '<ul class="st-tray" aria-label="' + t('title') + '">' +
      person({ nick: me.nick, photo: me.photo, story: mine ? (data.me.seen ? 'seen' : 'new') : '', label: L.t('story.mine') }, t(mine ? 'viewMine' : 'add'), 'data-story-me data-nick=""' + (mine ? ' data-story-has' : ''),
        mine ? '' : '<span class="st-plus" aria-hidden="true">' + icon('plus', { size: 14, stroke: 3 }) + '</span>') +
      data.list.map((row, n) => person({ ...row, story: row.seen ? 'seen' : 'new' }, t('of', { nick: row.nick }) + ', ' + t(row.seen ? 'seen' : 'fresh'), 'data-story="' + n + '" data-nick="' + L.esc(row.nick) + '" data-seen="' + Boolean(row.seen) + '"')).join('') + '</ul>';
    el.onclick = event => {
      const button = event.target.closest('.st-item');
      if (!button) return;
      if (button.dataset.story !== undefined) return void openPeople(data.list.map(row => row.nick), Number(button.dataset.story), data.list);
      if (button.hasAttribute('data-story-has')) return void openPeople([me.nick], 0);
      L.storyNew();
    };
  }
  async function loadTray(el) {
    const data = await L.api('stories');
    if (!el.isConnected) return trays.delete(el);
    if (!Array.isArray(data.list) || !L.me) { el.hidden = true; el.replaceChildren(); return; }
    const focused = el.contains(document.activeElement) ? document.activeElement.closest('.st-item')?.dataset.nick : null;
    paintTray(el, data);
    el.hidden = false;
    if (focused != null) [...el.querySelectorAll('.st-item')].find(button => button.dataset.nick === focused)?.focus({ preventScroll: true });     // 다시 그려도 포커스는 같은 사람에게
  }
  function refreshTrays() {
    for (const el of trays) { if (el.isConnected) loadTray(el); else trays.delete(el); }
  }
  L.storyTray = async function (el) {
    if (!el) return;
    el.hidden = true;
    if (!L.me || !await ready() || !el.isConnected) return;
    trays.add(el);
    await loadTray(el);
  };

  function openPeople(nicks, at, rows, extra) {
    const groups = nicks.map((nick, n) => ({ user: rows?.[n] ? { nick, photo: rows[n].photo, tag: rows[n].tag } : { nick, photo: nick === L.me?.nick ? L.me.photo : '' },
      items: null, load: async group => {
        const result = await L.api('story_get', { nick });
        if (result.user) group.user = result.user;
        return (result.items || []).map(one => ({ ...one }));
      } }));
    return openViewer({ groups, at, story: true, ...extra });
  }

  // 그 사람 스토리 열기 → 열었으면 true, 볼 것이 없으면 false
  L.storyOpen = async function (nick, opt) {
    if (!nick || !await ready()) return false;
    if (!L.me) { L.needLogin(); return false; }
    const result = await L.api('story_get', { nick });
    if (!Array.isArray(result.items) || !result.items.length) return false;
    openViewer({ groups: [{ user: result.user || { nick }, items: result.items.map(one => ({ ...one })) }], story: true, ...opt });
    return true;
  };

  // 스토리 모양 뷰어만 (하이라이트): items = [{ photo, text, at, author:{nick,photo} }] → { close() } · 보여 줄 것이 없으면 null
  L.storyViewer = function (opt) {
    const items = (opt?.items || []).filter(one => one && src(one.photo));
    if (!items.length) return null;
    const first = items[0].author;
    const same = first?.nick && items.every(one => one.author?.nick === first.nick);
    return openViewer({ groups: [{ user: same ? first : null, title: opt.title || '', items: items.map(one => ({ ...one })) }], story: false, onClose: opt.onClose });
  };

  // ── 올리기 ── 사진 1장 → 9:16 미리보기 → 글·층 → 스토리에 공유. 올렸으면 true
  L.storyNew = async function () {
    if (!await ready()) return false;
    if (!L.me) { L.needLogin(); return false; }
    current?.close();
    return new Promise(resolve => {
      let file = null, url = '', busy = false, done = false;
      const view = layer('sn', L.t('story.newTitle'));
      const el = view.el;
      el.innerHTML = '<div class="sn-box"><header class="sn-head"><button type="button" class="sv-btn" data-sn-close aria-label="' + t('close') + '">' + icon('close') + '</button><h2>' + t('newTitle') + '</h2><span class="sn-head-pad"></span></header>' +
        '<div class="sn-stage" data-sn-stage><img class="sv-bg" data-sn-bg alt="" aria-hidden="true" hidden><img class="sv-photo" data-sn-photo alt="" hidden>' +
        '<div class="sn-pick" data-sn-pick><p>' + t('pickHint') + '</p><button type="button" class="sn-source" data-sn-album>' + icon('image', { size: 28 }) + '<span>' + t('album') + '</span></button>' +
        '<button type="button" class="sn-source" data-sn-camera>' + icon('camera', { size: 28 }) + '<span>' + t('camera') + '</span></button></div>' +
        '<p class="sv-text sn-caption" data-sn-caption hidden></p><span class="sv-floor sn-floor" data-sn-floor hidden></span>' +
        '<button type="button" class="sn-change" data-sn-change hidden>' + icon('image', { size: 18 }) + '<span>' + t('change') + '</span></button></div>' +
        '<form class="sn-form" data-sn-form novalidate><div class="sn-field"><label for="sn-text">' + t('text') + '</label>' +
        '<input id="sn-text" name="text" type="text" maxlength="' + TEXT + '" autocomplete="off" enterkeyhint="done" placeholder="' + t('prompt') + '"><small data-sn-chars aria-hidden="true">' + t('chars', { n: 0 }) + '</small></div>' +
        '<fieldset class="sn-floors"><legend>' + t('floor') + '</legend><div class="sn-pills">' + FLOORS.map(([key, label]) => '<label class="sn-pill"' + (key ? ' data-floor="' + key + '"' : '') +
          '><input class="sr-only" type="radio" name="floor" value="' + key + '"' + (key ? '' : ' checked') + '><span>' + (label || t('none')) + '</span></label>').join('') + '</div></fieldset>' +
        '<p class="sn-note">' + L.esc(L.t('compose.consent')) + '</p><p class="sn-fine">' + t('rule') + '</p>' +
        '<p class="sn-status" data-sn-status role="status" hidden></p>' +
        '<button type="submit" class="btn btn-hot sn-share" data-sn-share disabled>' + t('share') + '</button></form>' +
        '<input type="file" accept="image/*" data-sn-file hidden><input type="file" accept="image/*" capture="environment" data-sn-cam hidden></div>';
      const q = name => el.querySelector('[data-sn-' + name + ']');
      const form = q('form'), status = q('status'), share = q('share'), photo = q('photo'), bg = q('bg');
      const say = (key, prefix = 'story.') => { status.hidden = !key; status.textContent = key ? L.t(prefix + key) : ''; };
      function finish(value) {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', keys, true);
        if (url) URL.revokeObjectURL(url);
        if (current === api) current = null;
        view.close();
        if (api.pushed && history.state?.loungeStory) { api.pushed = false; history.back(); }
        resolve(value);
      }
      const api = { close: () => finish(false), route: false, pushed: false, el };
      current = api;
      try { history.pushState({ loungeStory: Date.now() }, ''); api.pushed = true; } catch { /* 뒤로 가기로 닫기만 안 됨 */ }
      function keys(event) {
        if (!sheet().hidden) return;
        if (event.key === 'Escape' && !busy) { event.preventDefault(); event.stopPropagation(); return finish(false); }
        if (event.key !== 'Tab') return;
        const stops = [...el.querySelectorAll('button, input:not([type=file]), a[href]')].filter(node => !node.disabled && node.getClientRects().length);
        const first = stops[0], end = stops.at(-1);
        if (first && (event.shiftKey ? document.activeElement === first || document.activeElement === el : document.activeElement === end)) {
          event.preventDefault();
          (event.shiftKey ? end : first).focus();
        }
      }
      document.addEventListener('keydown', keys, true);
      function paintCaption() {
        const value = form.elements.text.value.trim(), floor = form.elements.floor.value;
        q('chars').textContent = L.t('story.chars', { n: Array.from(form.elements.text.value).length });
        q('caption').textContent = value;
        q('caption').hidden = !file || !value;
        q('floor').textContent = floor;
        q('floor').dataset.floor = floor;
        q('floor').hidden = !file || !floor;
      }
      async function choose(input) {
        const picked = input.files[0];
        input.value = '';
        if (!picked || busy) return;
        const next = URL.createObjectURL(picked), probe = new Image();
        probe.src = next;
        try { await probe.decode(); } catch { URL.revokeObjectURL(next); return say('badPhoto'); }
        if (done) return URL.revokeObjectURL(next);
        if (url) URL.revokeObjectURL(url);
        file = picked; url = next;
        photo.src = bg.src = url;
        photo.hidden = bg.hidden = false;
        q('pick').hidden = true;
        q('change').hidden = false;
        share.disabled = false;
        say('');
        paintCaption();
      }
      q('file').onchange = () => choose(q('file'));
      q('cam').onchange = () => choose(q('cam'));
      form.addEventListener('input', paintCaption);
      form.addEventListener('change', paintCaption);
      el.addEventListener('click', event => {
        const hit = name => event.target.closest('[data-sn-' + name + ']');
        if (busy) return;
        if (hit('close')) return finish(false);
        if (hit('album') || hit('change')) return q('file').click();
        if (hit('camera')) return q('cam').click();
      });
      form.onsubmit = async event => {
        event.preventDefault();
        if (busy || !file) return;
        busy = true;
        share.disabled = true;
        el.classList.add('is-busy');
        say('sharing');
        let failure = '';
        try {
          const key = await L.upload(file, 'post');     // 서버 약속: 글쓰기와 같은 올리기(종류 따로 없음)
          const result = await L.api('story_new', { key, text: form.elements.text.value.trim(), floor: form.elements.floor.value });
          if (result.ok && result.id) {
            L.toast(L.t('story.shared'));
            finish(true);
            return refreshTrays();
          }
          if (result.error === 'auth') L.needLogin();
          failure = result.error === 'story_limit' ? 'story.limit' : result.error === 'closed' || result.error === 'action' ? 'screens.soon' :
            result.error === 'mask_unavailable' || result.error === 'busy' ? 'story.later' : result.error === 'photo' ? 'story.badPhoto' : 'story.failed';
        } catch (error) {
          if (error.message === 'auth') L.needLogin();
          failure = error.message === 'busy' ? 'compose.photoLimit' : error.message === 'photo' ? 'story.badPhoto' : 'story.failed';
        }
        if (done) return;
        busy = false;
        share.disabled = false;
        el.classList.remove('is-busy');
        status.hidden = false;
        status.textContent = L.t(failure);
      };
      paintCaption();
      el.focus({ preventScroll: true });
    });
  };

  // ── #/story/<닉> ── 알림에서 올 때. 닫으면 뒤로(없으면 피드).
  let routed = null;
  async function render(root, { id } = {}) {
    const page = document.createElement('section');
    page.className = 'sv-page';
    page.innerHTML = L.bar({ title: L.t('story.title'), back: 'feed' }) + '<div class="sv-page-body" data-content><p class="muted" role="status">' + U.t('loading') + '</p></div>';
    root.replaceChildren(page);
    const body = page.querySelector('[data-content]');
    const note = message => { body.innerHTML = '<p class="sv-page-note" role="status">' + message + '</p><a class="btn" href="#/feed">' + t('toFeed') + '</a>'; };
    if (!await ready()) { if (page.isConnected) body.innerHTML = '<p class="muted" role="status">' + L.esc(L.t('core.soon')) + '</p>'; return; }
    if (!page.isConnected) return;
    if (!L.me) {
      body.innerHTML = U.button(L.esc(L.t('core.login')), 'data-story-login', true);
      body.querySelector('button').onclick = L.needLogin;
      L.needLogin();
      return;
    }
    const nick = id || L.me.nick;
    const result = await L.api('story_get', { nick });
    if (!page.isConnected) return;
    if (!Array.isArray(result.items) || !result.items.length) return note(t(result.error === 'forbidden' ? 'locked' : 'gone'));
    body.innerHTML = '';
    let left = false;
    routed = openViewer({ groups: [{ user: result.user || { nick }, items: result.items.map(one => ({ ...one })) }], story: true, route: true,
      onClose: leaving => { routed = null; if (!left && !leaving && page.isConnected) L.back('feed'); } });
    routed.leave = () => { left = true; };
  }
  L.screen('story', {
    nav: 'feed', auth: false, bar: 'own', title: 'story.title', render,
    leave() { if (routed) { routed.leave(); routed.close(); routed = null; } }
  });
})();
