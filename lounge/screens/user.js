/* 프로필 화면 (4차 · 인스타그램 방식 — SPEC4 2장·5장·9장) — 주인: 프로필 작업창(B).
   #/u/<닉> 프로필 · #/u/<닉>/p/<글id> 그 사람 글 넘겨 보기 · #/blocks 차단 목록. 내 프로필(#/me)은 me.js 가 위 막대를 그리고 L.renderProfile3 을 부른다. */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('user', {
    title: ['프로필', 'Profile'], followers: ['팔로워', 'Followers'], following: ['팔로잉', 'Following'],
    follow: ['팔로우', 'Follow'], unfollow: ['팔로우 취소', 'Unfollow'],
    menu: ['신고·차단 메뉴', 'Report and block menu'], block: ['차단', 'Block'],
    unblock: ['차단 해제', 'Unblock'], blocked: ['차단했어요', 'Account blocked'],
    blocks: ['차단 목록', 'Blocked accounts'], message: ['메시지', 'Message'],
    missing: ['프로필을 찾을 수 없어요', 'Profile not found'],
    vipAdd: ['VIP 달기', 'Add VIP'], vipRemove: ['VIP 떼기', 'Remove VIP']
  });

  const profile = U.words('profile3', {
    posts: ['게시물', 'Posts'],
    tagged: ['태그됨', 'Tagged'],
    share: ['프로필 공유', 'Share profile'],
    locked: ['비공개 계정이에요', 'This account is private'],
    lockedHelp: ['팔로우 요청이 수락되면 게시물을 볼 수 있어요.', 'When your follow request is accepted, you can see their posts.'],
    highlights: ['하이라이트', 'Highlights'],
    post: ['게시물 {n}', 'Post {n}'],
    first: ['첫 방문', 'First visit'],
    visit5: ['5번 방문', '5 visits'],
    visit10: ['10번 방문', '10 visits'],
    attend7: ['7일 연속 출석', '7-day attendance streak'],
    voter: ['5번 투표', '5 votes'],
    moreBio: ['더 보기', 'Read more'],
    lessBio: ['접기', 'Show less'],
    firstPhoto: ['첫 사진 올리기', 'Post your first photo'],
    newHighlight: ['새 하이라이트', 'New highlight'],
    highlightName: ['하이라이트 이름', 'Highlight name'],
    pickPosts: ['담을 게시물을 골라 주세요.', 'Choose posts for this highlight.']
  });
  // 4차에서 새로 쓰는 문구 (기존 키의 문구를 바꾸지 않고 새 이름으로 — SPEC4 1장)
  const w = U.words('user4', {
    more: ['더 보기', 'More options'],
    newPost: ['새 게시물', 'New post'],
    menu: ['메뉴', 'Menu'],
    edit: ['프로필 편집', 'Edit profile'],
    photo: ['프로필 사진', 'Profile photo'],
    by1: ['{a}님이 팔로우합니다', 'Followed by {a}'],
    by2: ['{a}님, {b}님이 팔로우합니다', 'Followed by {a} and {b}'],
    byN: ['{a}님 외 {n}명이 팔로우합니다', 'Followed by {a} and {n} others'],
    copy: ['링크 복사', 'Copy link'],
    copied: ['링크를 복사했어요', 'Link copied'],
    qr: ['QR 코드', 'QR code'],
    qrHelp: ['카메라로 찍으면 이 프로필이 열려요.', 'Scan with a camera to open this profile.'],
    saveImage: ['이미지 저장', 'Save image'],
    shareIt: ['공유', 'Share'],
    lockedHelp: ['팔로우하면 사진을 볼 수 있어요.', 'Follow this account to see their photos.'],
    missing: ['사용자를 찾을 수 없어요', 'Profile not found'],
    noPosts: ['게시물 없음', 'No posts yet'],
    noTagged: ['태그된 사진 없음', 'No tagged photos yet'],
    noSaved: ['저장한 게시물 없음', 'Nothing saved yet'],
    viewer: ['게시물', 'Posts'],
    create: ['새로 만들기', 'New'],
    editHighlight: ['하이라이트 수정', 'Edit highlight'],
    deleteHighlight: ['하이라이트 삭제', 'Delete highlight'],
    deleteAsk: ['이 하이라이트를 삭제할까요?', 'Delete this highlight?'],
    del: ['삭제', 'Delete'],
    picked: ['{n}개 선택', '{n} selected'],
    private: ['비공개 계정', 'Private account'],
    tagRequests: ['태그 요청', 'Tag requests'],
    newCol: ['새 모음', 'New collection'],
    colName: ['모음 이름', 'Collection name'],
    colPosts: ['게시물 추가·빼기', 'Add or remove posts'],
    colAdd: ['게시물 추가', 'Add posts'],
    colRename: ['이름 바꾸기', 'Rename'],
    colDelete: ['모음 삭제', 'Delete collection'],
    colDeleteAsk: ['이 모음을 삭제할까요?', 'Delete this collection?'],
    colDeleteBody: ['저장한 게시물은 ‘저장됨’에 그대로 남아요.', 'The posts stay in Saved.'],
    colTitle: ['이름을 1~20자로 써 주세요.', 'Use 1–20 characters for the name.'],
    colLimit: ['모음은 20개까지 만들 수 있어요.', 'You can make up to 20 collections.'],
    colEmpty: ['이 모음에 담은 게시물이 없어요', 'Nothing in this collection yet'],
    colPick: ['이 모음에 담을 게시물을 골라 주세요.', 'Choose saved posts for this collection.'],
    colCount: ['{n}개', '{n}']
  });
  L.i18n({
    ja: { 'user4.more': 'その他', 'user4.newPost': '新規投稿', 'user4.menu': 'メニュー', 'user4.edit': 'プロフィールを編集',
      'user4.photo': 'プロフィール写真', 'user4.by1': '{a}さんがフォロー中', 'user4.by2': '{a}さん、{b}さんがフォロー中',
      'user4.byN': '{a}さん、他{n}人がフォロー中', 'user4.copy': 'リンクをコピー', 'user4.copied': 'リンクをコピーしました',
      'user4.qr': 'QRコード', 'user4.qrHelp': 'カメラで読み取るとこのプロフィールが開きます。', 'user4.saveImage': '画像を保存',
      'user4.shareIt': 'シェア', 'user4.lockedHelp': 'フォローすると写真を見られます。', 'user4.missing': 'ユーザーが見つかりません',
      'user4.noPosts': '投稿はまだありません', 'user4.noTagged': 'タグ付けされた写真はまだありません', 'user4.noSaved': '保存した投稿はありません',
      'user4.viewer': '投稿', 'user4.create': '新規', 'user4.editHighlight': 'ハイライトを編集', 'user4.deleteHighlight': 'ハイライトを削除',
      'user4.deleteAsk': 'このハイライトを削除しますか？', 'user4.del': '削除', 'user4.picked': '{n}件選択', 'user4.private': '非公開アカウント', 'user4.tagRequests': 'タグのリクエスト',
      'user4.newCol': '新しいコレクション', 'user4.colName': 'コレクション名', 'user4.colPosts': '投稿を追加・削除', 'user4.colAdd': '投稿を追加',
      'user4.colRename': '名前を変更', 'user4.colDelete': 'コレクションを削除', 'user4.colDeleteAsk': 'このコレクションを削除しますか？',
      'user4.colDeleteBody': '投稿は「保存済み」に残ります。', 'user4.colTitle': '名前は1〜20文字で入力してください。',
      'user4.colLimit': 'コレクションは20個まで作成できます。', 'user4.colEmpty': 'このコレクションにはまだ投稿がありません',
      'user4.colPick': 'このコレクションに入れる投稿を選んでください。', 'user4.colCount': '{n}件' },
    zh: { 'user4.more': '更多选项', 'user4.newPost': '发帖', 'user4.menu': '菜单', 'user4.edit': '编辑主页',
      'user4.photo': '头像', 'user4.by1': '{a} 已关注', 'user4.by2': '{a}、{b} 已关注',
      'user4.byN': '{a} 和另外 {n} 人已关注', 'user4.copy': '复制链接', 'user4.copied': '已复制链接',
      'user4.qr': '二维码', 'user4.qrHelp': '用相机扫描即可打开这个主页。', 'user4.saveImage': '保存图片',
      'user4.shareIt': '分享', 'user4.lockedHelp': '关注后即可查看照片。', 'user4.missing': '找不到用户',
      'user4.noPosts': '还没有帖子', 'user4.noTagged': '还没有被标记的照片', 'user4.noSaved': '还没有收藏',
      'user4.viewer': '帖子', 'user4.create': '新建', 'user4.editHighlight': '编辑精选', 'user4.deleteHighlight': '删除精选',
      'user4.deleteAsk': '要删除这个精选吗？', 'user4.del': '删除', 'user4.picked': '已选 {n} 项', 'user4.private': '私密账号', 'user4.tagRequests': '标记请求',
      'user4.newCol': '新建收藏夹', 'user4.colName': '收藏夹名称', 'user4.colPosts': '添加或移除帖子', 'user4.colAdd': '添加帖子',
      'user4.colRename': '重命名', 'user4.colDelete': '删除收藏夹', 'user4.colDeleteAsk': '要删除这个收藏夹吗？',
      'user4.colDeleteBody': '帖子仍会保留在“已收藏”中。', 'user4.colTitle': '名称请使用 1–20 个字。',
      'user4.colLimit': '最多可创建 20 个收藏夹。', 'user4.colEmpty': '这个收藏夹里还没有帖子',
      'user4.colPick': '选择要放入这个收藏夹的帖子。', 'user4.colCount': '{n} 个' }
  });
  const esc = L.esc;
  const count = value => Math.max(0, Number(value) || 0);
  const format = value => new Intl.NumberFormat(L.lang).format(count(value));
  const short = value => (L.count ? L.count(count(value)) : format(value));
  const path = (screen, nick) => '#/' + screen + '/' + encodeURIComponent(nick);
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  const followingState = user => user.me?.state || (user.me?.following ? 'following' : 'none');
  const earnedBadges = new Set(['first', 'visit5', 'visit10', 'attend7', 'voter']);
  L.profileBadgeLabel = (key, fallback) => earnedBadges.has(key) ? L.t('profile3.' + key) : fallback || key;
  const profileUrl = nick => new URL('/lounge/#/u/' + encodeURIComponent(nick), location.href).href;
  const emptyState = (icon, text, extra = '') => '<div class="pf-empty"><span class="pf-empty-icon" aria-hidden="true">' +
    L.icon(icon, { size: 30 }) + '</span><p>' + text + '</p>' + extra + '</div>';

  let cleanup = null;                 // 화면을 떠날 때 부를 것 (당겨서 새로고침·더 불러오기 관찰자)
  let startFrom = null;               // 격자에서 누른 글 → 글 넘겨 보기가 그 쪽부터 시작하도록 {nick, id, before}
  let liveGrid = null;                // 지금(또는 방금 떠난) 프로필 격자 상태 — 글 넘겨 보기에서 글이 지워지면 여기서도 뺀다
  function leave() { try { cleanup?.(); } catch (e) { console.error(e); } cleanup = null; }
  L.profileLeave = leave;
  // 맡겨 둔 상태 되찾기: 진짜 '뒤로 가기'로 돌아온 경우에만 돌려준다 (판정은 틀 ui.js 의 L.unstash 가 방문 기록 순번으로 한다)
  L.profileKept = name => (L.unstash ? L.unstash(name) : null);
  // 창(시트): 오른쪽 위 ✕ + 아래로 끌어 닫기 (틀 공통 모양)
  const sheet = html => L.sheet(html, { close: true });

  function actionLabel(user) {
    const state = followingState(user);
    if (state === 'following') return L.t('user.following');
    if (state === 'requested') return L.t('follows.requested');
    return L.t(user.me?.followsMe ? 'follows.followBack' : 'user.follow');
  }

  function wireFollow(button, user) {
    button.onclick = async () => {
      if (button.disabled || L.needLogin()) return;
      button.disabled = true;
      const state = L.open('follow2') ? followingState(user) : (followingState(user) === 'following' ? 'following' : 'none');
      const action = state === 'following' ? 'unfollow' : state === 'requested' ? 'follow_cancel' : 'follow';
      const result = await L.api(action, { nick: user.nick });
      if (!button.isConnected) return;
      button.disabled = false;
      if (result.error) return L.profileFollows.fail(result);
      await L.route();
    };
  }

  async function copyLink(href) {
    try {
      await navigator.clipboard.writeText(href);
      L.toast(L.t('user4.copied'));
    } catch (_) {
      const panel = sheet('<h2>' + w('copy') + '</h2><input class="pf-copy" readonly aria-label="' + w('copy') + '">');
      const field = panel.querySelector('input');
      field.value = href;
      field.select();
    }
  }

  // QR 카드: 주소는 앱이 쓰는 #/u/<닉> (B17). 공개 계정만 (SPEC3 결정 3).
  let qrReady;
  function loadQr() {
    if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
    qrReady ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-generator-1.4.4.js';
      script.onload = () => typeof window.qrcode === 'function' ? resolve(window.qrcode) : reject(new Error('qr'));
      script.onerror = () => reject(new Error('qr'));
      document.head.append(script);
    }).catch(error => { qrReady = null; throw error; });
    return qrReady;
  }
  async function qrCard(user) {
    const href = profileUrl(user.nick);
    const shareUI = typeof LoungeShare === 'undefined' ? null : LoungeShare;
    const panel = sheet('<h2 class="sr-only">' + w('qr') + '</h2><div class="pf-qr"><div class="pf-qr-card" data-qr-card>' +
      '<canvas data-profile-qr role="img" aria-label="' + w('qr') + '" width="8" height="8"></canvas><strong>@' + esc(user.nick) +
      '</strong><small>GROOVE LOUNGE</small></div><p class="muted">' + w('qrHelp') + '</p><div class="pf-qr-actions">' +
      (navigator.share || (L.open('share') && shareUI?.open) ? '<button type="button" class="pf-btn is-hot" data-qr-share><span class="pf-btn-in">' + w('shareIt') + '</span></button>' : '') +
      '<button type="button" class="pf-btn" data-qr-copy><span class="pf-btn-in">' + w('copy') + '</span></button>' +
      '<button type="button" class="pf-btn" data-qr-save><span class="pf-btn-in">' + w('saveImage') + '</span></button></div></div>');
    panel.classList.add('pf-sheet');
    const canvas = panel.querySelector('canvas');
    panel.querySelector('[data-qr-copy]').onclick = () => copyLink(href);
    const share = panel.querySelector('[data-qr-share]');
    if (share) share.onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: user.nick + ' · GROOVE LOUNGE', url: href }); } catch (_) { /* 닫음 */ } return; }
      shareUI.open({ profile: { nick: user.nick, private: Boolean(user.private) } });
    };
    panel.querySelector('[data-qr-save]').onclick = () => {
      const card = document.createElement('canvas'), pad = 48, size = canvas.width;
      card.width = size + pad * 2; card.height = size + pad * 2 + 96;
      const ctx = card.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, card.width, card.height);
      ctx.drawImage(canvas, pad, pad);
      ctx.fillStyle = '#120800'; ctx.textAlign = 'center';
      ctx.font = '800 34px sans-serif'; ctx.fillText('@' + user.nick, card.width / 2, size + pad + 52);
      ctx.fillStyle = '#ff7a1a'; ctx.font = '800 20px sans-serif'; ctx.fillText('GROOVE LOUNGE', card.width / 2, size + pad + 88);
      const link = document.createElement('a');
      link.download = 'groove-' + user.nick + '.png';
      link.href = card.toDataURL('image/png');
      link.click();
    };
    try {
      const make = await loadQr();
      if (!panel.isConnected) return;
      const qr = make(0, 'M');
      qr.addData(href, 'Byte');
      qr.make();
      const n = qr.getModuleCount(), cell = 8;
      canvas.width = canvas.height = (n + 8) * cell;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
        if (qr.isDark(row, col)) ctx.fillRect((col + 4) * cell, (row + 4) * cell, cell, cell);
      }
      canvas.dataset.ready = '';
    } catch (_) {
      if (panel.isConnected) panel.querySelector('[data-qr-card]').insertAdjacentHTML('beforeend', '<p role="status">' + U.t('error') + '</p>');
    }
  }
  L.profileQr = qrCard;

  // ⋯ 메뉴: 프로필 공유 · 링크 복사 · QR · 신고 · 차단 (P18). enhanced = 4차 모양(줄 목록), 아니면 예전 버튼 묶음.
  function wireMenu(button, user, enhanced = false) {
    if (!button) return;
    button.onclick = async () => {
      const [blocks, admin] = await Promise.all([
        L.me ? L.api('blocks') : {},
        user.tag?.kind !== 'staff' ? L.staffAdmin() : ''
      ]);
      const allowed = blocks.error !== 'action';
      if (!button.isConnected) return;
      const shareUI = typeof LoungeShare === 'undefined' ? null : LoungeShare;
      const canShare = enhanced && L.open('share') && typeof shareUI?.open === 'function';
      const open = enhanced && user.private !== true;
      const row = (icon, label, attrs, danger) => '<button type="button" class="ui-menu-item' + (danger ? ' is-danger' : '') + '" ' + attrs + '>' +
        L.icon(icon, { size: 22 }) + '<span>' + label + '</span></button>';
      const el = enhanced ? L.sheet('<h2 class="ui-menu-title">' + esc(user.nick) + '</h2><div class="ui-menu">' +
        (canShare ? row('send', profile('share'), 'data-menu-share') : '') +
        (open ? row('link', w('copy'), 'data-menu-copy') + row('grid', w('qr'), 'data-menu-qr') : '') +
        (admin ? row('check', t(user.tag?.kind === 'vip' ? 'vipRemove' : 'vipAdd'), 'data-vip') : '') +
        row('flag', U.t('report'), 'data-report', true) +
        row('block', t('block') + (allowed ? '' : ' · ' + U.t('soon')), 'data-block' + (allowed ? '' : ' disabled'), true) +
        '<button type="button" class="ui-menu-item is-cancel" data-menu-cancel><span>' + esc(L.t('ui.cancel')) + '</span></button></div>')
        : U.sheet('<h2>' + t('menu') + '</h2>' + U.button(U.t('report'), 'data-report') + ' ' +
          U.button(t('block') + (allowed ? '' : ' · ' + U.t('soon')), 'data-block' + (allowed ? '' : ' disabled')) +
          (admin ? ' ' + U.button(t(user.tag?.kind === 'vip' ? 'vipRemove' : 'vipAdd'), 'data-vip') : ''));
      if (enhanced) el.classList.add('ui-sheet-menu');
      const on = (selector, handler) => { const target = el.querySelector(selector); if (target) target.onclick = handler; };
      on('[data-menu-cancel]', () => L.closeSheet());
      on('[data-menu-share]', () => { L.closeSheet(); shareUI.open({ profile: { nick: user.nick, private: Boolean(user.private) } }); });
      on('[data-menu-copy]', () => { L.closeSheet(); void copyLink(profileUrl(user.nick)); });
      on('[data-menu-qr]', () => { L.closeSheet(); void qrCard(user); });
      const vipButton = el.querySelector('[data-vip]');
      if (vipButton) vipButton.onclick = async () => {
        vipButton.disabled = true;
        const currentAdmin = await L.staffAdmin();
        const result = currentAdmin ? await L.api('adm_vip_set', { admin: currentAdmin, mid: user.id, vip: user.tag?.kind !== 'vip' })
          : { error: 'forbidden' };
        if (!vipButton.isConnected) return;
        vipButton.disabled = false;
        if (result.error) return U.error(result);
        L.closeSheet();
        await L.route();
      };
      el.querySelector('[data-report]').onclick = () => {
        if (L.needLogin()) return;
        if (user.id) U.report('user', user.id);
        else U.error();
      };
      el.querySelector('[data-block]').onclick = async event => {
        if (await changeBlock(event.currentTarget, 'block', user.nick)) {
          L.closeSheet();
          await L.route();
          L.toast(L.t('user.blocked'));
        }
      };
    };
  }

  // 숫자 3칸: 게시물(누르면 격자로) · 팔로워 · 팔로잉 (P11). 예전 화면(legacy)은 전체 숫자·링크만.
  function stats(user, allowLinks, legacy = false) {
    return ['posts', 'followers', 'following'].map(key => {
      const label = key === 'posts' ? profile('posts') : t(key);
      const body = '<strong data-stat="' + key + '">' + esc(legacy ? format(user[key]) : short(user[key])) + '</strong><span>' + label + '</span>';
      if (key === 'posts') return legacy || user.locked ? '<span>' + body + '</span>' : '<button type="button" data-stat-posts>' + body + '</button>';
      return allowLinks ? '<a href="' + esc(path(key, user.nick)) + '">' + body + '</a>' : '<span>' + body + '</span>';
    }).join('');
  }

  // 격자 칸: 3:4 세로 · 여러 장 layers · 고정 pin · 영상 play (P24~P27). href(row) 로 가는 곳을 정한다.
  function postTiles(rows, start = 0, href = row => path('feed', row.id)) {
    return rows.filter(row => typeof row?.id === 'string').map((row, index) => {
      const image = row.thumb || row.photos?.[0];
      const thumb = U.image(typeof image === 'string' ? image : image?.thumb || image?.src);
      const video = row.kind === 'video' || row.video || row.youtube || row.hasVideo;
      const many = count(row.count ?? row.photos?.length) > 1;
      return '<a href="' + esc(href(row)) + '" data-post-id="' + esc(row.id) + '" aria-label="' + profile('post', { n: start + index + 1 }) +
        '">' + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async">' : '') +
        ((row.pinned || video || many)
          ? '<span class="pf-grid-meta" aria-hidden="true">' +
            (row.pinned ? L.icon('pin', { size: 18 }) : '') +
            (video ? L.icon('play', { size: 18, fill: true }) : many ? L.icon('layers', { size: 18 }) : '') +
            '</span>' : '') + '</a>';
    }).join('');
  }
  L.profileTiles = postTiles;

  // 하이라이트 열기: 스토리 뷰어가 있으면 전체 화면으로 (P21), 없으면 예전처럼 창에 격자.
  async function highlight(button, id, user) {
    const title = button.querySelector('[data-highlight-title]')?.textContent.trim() || button.textContent.trim();
    const response = await L.api('highlight_get', { id });
    if (!button.isConnected) return;
    const posts = response.highlight?.posts || [];
    if (!response.error && posts.length && typeof L.storyViewer === 'function') {
      const items = posts.flatMap(post => {
        const photos = Array.isArray(post.photos) && post.photos.length ? post.photos : [post.thumb];
        return photos.map(value => ({ id: post.id, post: post.id, text: post.text || '', at: post.at,
          photo: U.image(typeof value === 'string' ? value : value?.src || value?.thumb),
          author: { nick: post.author?.nick || user.nick, photo: post.author?.photo || '' } })).filter(item => item.photo);
      });
      const opened = items.length ? L.storyViewer({ items, title }) : null;
      if (opened !== null && opened !== false) return;     // 빈 틀(null)이면 아래 예전 방식으로
    }
    const panel = sheet('<h2></h2><div data-highlight></div>');
    panel.querySelector('h2').textContent = title;
    const tiles = postTiles(posts);
    panel.querySelector('[data-highlight]').innerHTML = response.error ? U.status('error') :
      tiles ? '<div class="pf-grid">' + tiles + '</div>' : U.status('empty');
  }

  // 하이라이트 만들기·고치기: 썸네일을 여러 장 고른다 (P22). existing = { id, title, posts:[id…] } 이면 고치기.
  function editHighlight(user, existing = null) {
    const panel = sheet('<h2>' + (existing ? w('editHighlight') : profile('newHighlight')) + '</h2><form class="shell-form pf-highlight-form">' +
      '<label class="shell-field">' + profile('highlightName') + '<input name="title" maxlength="100" required></label>' +
      '<p class="muted">' + profile('pickPosts') + ' <span data-picked></span></p><div class="pf-picks" data-picks></div>' +
      '<div class="pf-more-row" data-pick-more hidden><i></i></div>' +
      '<p class="shell-error" role="status"></p><button class="btn btn-hot" type="submit" disabled>' +
      esc(L.t('me.save')) + '</button></form>');
    const form = panel.querySelector('form');
    const picks = panel.querySelector('[data-picks]');
    const more = panel.querySelector('[data-pick-more]');
    const submit = form.querySelector('[type=submit]');
    const status = form.querySelector('[role=status]');
    const picked = panel.querySelector('[data-picked]');
    const chosen = new Set(existing?.posts || []);
    const seen = new Set();
    let before = null, loading = false;
    if (existing) form.elements.title.value = existing.title || '';
    const sync = () => {
      submit.disabled = !chosen.size;
      picked.textContent = chosen.size ? L.t('user4.picked', { n: chosen.size }) : '';
    };
    async function load() {
      if (loading) return;
      loading = true;
      const cursor = before;
      const result = await L.api('user_posts', { nick: user.nick, ...(cursor != null ? { before: cursor } : {}) });
      loading = false;
      if (!panel.isConnected) return;
      if (result.error) { status.textContent = L.t('screens.error'); return; }
      for (const post of result.posts || []) {
        if (!post?.id || seen.has(post.id)) continue;
        seen.add(post.id);
        const thumb = U.image(post.thumb);
        picks.insertAdjacentHTML('beforeend', '<label class="pf-pick"><input type="checkbox" name="posts" value="' +
          esc(post.id) + '"' + (chosen.has(post.id) ? ' checked' : '') + ' aria-label="' + profile('post', { n: seen.size }) + '">' +
          (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">' : '') + '<i aria-hidden="true">' + L.icon('check', { size: 16 }) + '</i></label>');
      }
      before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      more.hidden = before == null;
      status.textContent = seen.size ? '' : L.t('screens.empty');
      if (before != null && picks.getBoundingClientRect().bottom < innerHeight) void load();
    }
    const stop = L.more(more, load);
    form.onchange = event => {
      const box = event.target.closest('input[name=posts]');
      if (box) { if (box.checked) chosen.add(box.value); else chosen.delete(box.value); }
      sync();
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      const result = await L.api('highlight_set', { ...(existing ? { id: existing.id } : {}),
        title: form.elements.title.value.trim(), posts: [...chosen] });
      if (!panel.isConnected) return;
      if (result.error) { status.textContent = L.t('screens.failed'); submit.disabled = false; return; }
      stop();
      L.closeSheet();
      await L.route();
    };
    sync();
    void load();
  }

  // 길게 누르기(또는 오른쪽 누르기) → 수정·삭제 메뉴 (P22)
  function holdMenu(button, open) {
    let timer = 0, held = false, firedAt = 0;
    const clear = () => { clearTimeout(timer); timer = 0; };
    const fire = () => { if (Date.now() - firedAt < 700) return; firedAt = Date.now(); held = false; button.classList.remove('is-held'); open(); };
    button.addEventListener('pointerdown', () => {
      held = false; clear();
      timer = setTimeout(() => { held = true; button.classList.add('is-held'); }, 500);
    });
    button.addEventListener('pointerup', () => { clear(); if (held) setTimeout(fire, 60); });
    for (const name of ['pointerleave', 'pointercancel']) button.addEventListener(name, () => { clear(); button.classList.remove('is-held'); });
    button.addEventListener('contextmenu', event => { event.preventDefault(); clear(); fire(); });
    // 길게 누른 뒤 손을 뗄 때 따라오는 '누름'은 열기로 넘어가지 않게 막는다
    button.addEventListener('click', event => {
      if (!held && Date.now() - firedAt > 700) return;
      event.stopImmediatePropagation(); event.preventDefault();
      if (held) fire();
    }, true);
  }

  function galleries(view, user, own, kept) {
    const highlights = view.querySelector('[data-highlights]');
    const gallery = view.querySelector('[data-gallery]');
    const more = view.querySelector('[data-gallery-more]');
    const status = view.querySelector('[data-gallery-status]');
    const tabs = [...view.querySelectorAll('[data-profile-tab]')];
    const viewer = typeof L.feedCards === 'function';   // 글 넘겨 보기를 쓸 수 있나 (피드 카드가 있어야 함)
    const state = liveGrid = { nick: user.nick, mode: kept?.mode || 'posts', rows: kept?.rows || [], before: kept?.before ?? null,
      loaded: kept?.loaded === true, highlights: kept?.highlights || null, view };
    let version = 0, pending = false;
    const hrefOf = row => state.mode === 'posts' && viewer ? path('u', user.nick) + '/p/' + encodeURIComponent(row.id) : path('feed', row.id);

    function paintStatus(error = '') {
      const none = !state.rows.length;
      status.hidden = !(error || (state.loaded && none));
      if (error) status.innerHTML = '<p class="muted">' + esc(error) + '</p>';
      else if (state.loaded && none) status.innerHTML = emptyState(state.mode === 'tagged' ? 'tagged' : 'camera',
        w(state.mode === 'tagged' ? 'noTagged' : 'noPosts'),
        own && state.mode === 'posts' && L.open('posts') ? '<a class="pf-text-link" href="#/compose">' + profile('firstPhoto') + '</a>' : '');
      else status.replaceChildren();
      more.hidden = state.before == null;
    }

    async function load(append = false) {
      if (append && (pending || state.before == null)) return;
      const revision = ++version, mode = state.mode;
      const cursor = append ? state.before : null;
      pending = true;
      if (!append) {
        state.before = null;
        state.rows = [];
        state.loaded = false;
        gallery.replaceChildren();
        paintStatus();
        more.hidden = false;
      }
      const result = await L.api(mode === 'posts' ? 'user_posts' : 'user_tagged', { nick: user.nick,
        ...(cursor != null ? { before: cursor } : {}) });
      if (!view.isConnected || version !== revision) return;
      pending = false;
      state.loaded = true;
      if (result.error) {
        state.before = null;
        paintStatus(L.t(result.error === 'forbidden' ? 'profile3.locked' : 'screens.error'));
        return;
      }
      const seen = new Set(state.rows.map(row => row.id));
      const entries = (result.posts || []).filter(row => typeof row?.id === 'string' && !seen.has(row.id));
      for (const row of entries) row.from = cursor;       // 이 글이 든 쪽의 시작 위치 → 글 넘겨 보기가 여기서부터 부른다
      gallery.insertAdjacentHTML('beforeend', postTiles(entries, state.rows.length, hrefOf));
      state.rows.push(...entries);
      state.before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      paintStatus();
      setTimeout(() => {
        if (view.isConnected && version === revision && state.before != null && more.getBoundingClientRect().top < innerHeight + 400) void load(true);
      }, 0);
    }

    function choose(tab) {
      if (state.mode === tab.dataset.profileTab) return;
      state.mode = tab.dataset.profileTab;
      for (const control of tabs) control.setAttribute('aria-pressed', String(control === tab));
      void load();
    }
    for (const tab of tabs) {
      tab.setAttribute('aria-pressed', String(tab.dataset.profileTab === state.mode));
      tab.onclick = () => choose(tab);
    }
    gallery.addEventListener('click', event => {
      const tile = event.target.closest('a[data-post-id]');
      const row = tile && state.rows.find(item => item.id === tile.dataset.postId);
      startFrom = row && state.mode === 'posts' ? { nick: user.nick, id: row.id, before: row.from ?? null } : null;
    }, true);
    const stopMore = L.more(more, () => load(true));

    function paintHighlights(result) {
      const items = [...(result.auto || []).filter(item => count(item.count) > 0), ...(result.list || [])];
      highlights.replaceChildren();
      if (own) {
        highlights.insertAdjacentHTML('beforeend', '<button class="pf-highlight" type="button" data-new-highlight aria-label="' + profile('newHighlight') + '">' +
          '<span class="pf-highlight-cover is-new" aria-hidden="true">' + L.icon('plus', { size: 26 }) + '</span><span data-highlight-title>' + w('create') + '</span></button>');
        highlights.querySelector('[data-new-highlight]').onclick = () => editHighlight(user);
      }
      highlights.hidden = !own && !items.length;
      for (const item of items) {
        const cover = U.image(item.cover);
        const title = item.key === 'challenge' ? esc(L.t('challenge.title'))
          : item.key === 'tagged' ? profile('tagged') : esc(item.title);
        const button = document.createElement('button');
        button.className = 'pf-highlight';
        button.type = 'button';
        button.innerHTML = '<span class="pf-highlight-cover">' + (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' :
          '<span aria-hidden="true">✦</span>') + '</span><span data-highlight-title>' + title + '</span>';
        const id = item.key ? item.key + ':' + user.id : item.id;
        button.onclick = () => highlight(button, id, user);
        if (own && !item.key) holdMenu(button, () => L.menu([
          { label: L.t('user4.editHighlight'), icon: 'edit', async on() {
            const current = await L.api('highlight_get', { id });
            if (current.error) return U.error(current);
            editHighlight(user, { id, title: item.title, posts: (current.highlight?.posts || []).map(post => post.id) });
          } },
          { label: L.t('user4.deleteHighlight'), icon: 'trash', danger: true, async on() {
            if (!await L.confirm(L.t('user4.deleteAsk'), { ok: L.t('user4.del'), danger: true })) return;
            const result = await L.api('highlight_del', { id });
            if (result.error) return U.error(result);
            button.remove();
            if (state.highlights?.list) state.highlights.list = state.highlights.list.filter(entry => entry.id !== id);
          } }
        ], { title: item.title }));
        highlights.append(button);
      }
    }
    if (own) paintHighlights({});
    if (state.highlights) paintHighlights(state.highlights);
    else void L.api('highlights', { nick: user.nick }).then(result => {
      if (!view.isConnected || result.error) return;
      state.highlights = result;
      paintHighlights(result);
    });

    const stop = () => stopMore();
    if (state.loaded) {
      gallery.innerHTML = postTiles(state.rows, 0, hrefOf);
      paintStatus();
      return { state, stop, ready: Promise.resolve() };
    }
    return { state, stop, ready: load() };
  }

  // 4차 프로필 본문. view 안에 머리·버튼·하이라이트·탭·격자를 그린다. extra = 내 프로필의 포인트·스탬프 띠(버튼 줄 위 한 줄).
  //  kept = 뒤로 돌아왔을 때 되찾은 상태(격자·스크롤). stashKey = 떠날 때 맡길 이름.
  function enhanced(view, user, own, extra = '', kept = null, stashKey = '') {
    leave();
    const follow2 = L.open('follow2');
    const photos = L.profilePhotos.rows(user);
    const mainIndex = Math.max(0, photos.findIndex(photo => photo.main));
    const story = L.open('stories') && ['new', 'seen'].includes(user.story) ? user.story : '';
    const face = photos.length ? L.profilePhotos.image(photos[mainIndex], '') :
      '<span class="pf-avatar-letter" aria-hidden="true">' + esc(Array.from(user.nick || '')[0] || 'G') + '</span>';
    const avatar = photos.length || story ? '<button class="pf-avatar" type="button" data-profile-avatar' + (story ? ' data-story="' + story + '"' : '') +
      ' aria-label="' + w('photo') + '">' + face + '</button>' : '<span class="pf-avatar">' + face + '</span>';
    const badgeKey = typeof user.badge === 'string' ? user.badge : user.badge?.key;
    const badge = badgeKey ? L.profileBadgeLabel(badgeKey,
      user.badge?.label || (user.badges || []).find(item => item.key === badgeKey)?.label) : '';
    const showInstagram = typeof user.link === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(user.link);
    const shareUI = typeof LoungeShare === 'undefined' ? null : LoungeShare;
    const canShare = own && L.open('share') && typeof shareUI?.open === 'function';
    const mutual = follow2 && L.me && !own && count(user.mutual?.n) > 0 ? user.mutual : null;
    const faces = (mutual?.preview || []).filter(person => person?.nick).slice(0, 3);
    const mutualText = !mutual ? '' : !faces.length ? esc(L.t('follows.mutualCount', { n: format(mutual.n) }))
      : count(mutual.n) === 1 ? w('by1', { a: faces[0].nick })
        : count(mutual.n) === 2 && faces[1] ? w('by2', { a: faces[0].nick, b: faces[1].nick })
          : w('byN', { a: faces[0].nick, n: format(count(mutual.n) - 1) });
    // 메시지 버튼: 서버가 canMessage 를 주면 그대로, 없으면 지금 규칙(dm 켜짐). 잠긴 프로필에는 없다 (B10).
    const canMessage = !user.locked && (typeof user.canMessage === 'boolean' ? user.canMessage : L.open('dm'));
    const people = follow2 && L.me ? '<a class="pf-btn pf-btn-icon" href="#/suggest" aria-label="' + esc(L.t('follows.suggest')) + '"><span class="pf-btn-in">' +
      L.icon('userPlus', { size: 18 }) + '</span></a>' : '';
    const actions = own ? '<a class="pf-btn" href="#/me/edit"><span class="pf-btn-in">' + w('edit') + '</span></a>' +
      (canShare ? '<button type="button" class="pf-btn" data-profile-share><span class="pf-btn-in">' + profile('share') + '</span></button>' : '') + people :
      L.followButton({ nick: user.nick, state: followingState(user), followsMe: user.me?.followsMe === true },
        { caret: true, attrs: 'data-follow' }) +
      (canMessage ? '<a class="pf-btn" href="' + esc(path('dm', user.nick)) + '"><span class="pf-btn-in">' + t('message') + '</span></a>' : '') + people;
    const tag = ['staff', 'vip'].includes(user.tag?.kind) && typeof user.tag.label === 'string' ? user.tag : null;
    const chips = (tag ? '<span class="lounge-who-tag" data-kind="' + tag.kind + '">' + esc(L.tagLabel(tag, L.lang)) + '</span>' : '') +
      (['2F', '3F'].includes(user.floor) ? '<span class="pf-chip">' + esc(user.floor) + '</span>' : '') +
      (!tag && badge ? '<span class="pf-chip profile3-badge">' + esc(badge) + '</span>' : '');
    const bio = String(user.bio || '');
    view.classList.add('pf');
    view.innerHTML = '<section class="pf-head" data-profile-head><div class="pf-top">' + avatar +
      '<div class="pf-stats profile3-stats">' + stats(user, follow2 && L.me && !user.locked) + '</div></div>' +
      (chips ? '<div class="pf-id profile3-name" data-user-name>' + chips + '</div>' : '') +
      (bio ? '<div class="pf-bio is-short" data-bio><p class="shell-bio">' + (L.linkify ? L.linkify(bio) : esc(bio)) + '</p>' +
        '<button type="button" class="pf-more" aria-expanded="false" data-more-bio hidden><span>' + profile('moreBio') + '</span></button></div>' : '') +
      (showInstagram ? '<a class="pf-link" href="https://www.instagram.com/' + encodeURIComponent(user.link) +
        '/" target="_blank" rel="noopener noreferrer">' + L.icon('link', { size: 16 }) + '<span>' + esc(user.link) + '</span></a>' : '') +
      (mutual ? '<a class="pf-mutual" href="' + esc(path('mutuals', user.nick)) + '">' +
        (faces.length ? '<span class="pf-mutual-faces" aria-hidden="true">' + faces.map(person => L.avatar(person, 22)).join('') + '</span>' : '') +
        '<span>' + mutualText + '</span></a>' : '') +
      extra + '<div class="pf-actions">' + actions + '</div></section>' +
      (user.locked ? '<section class="pf-lock"><span class="pf-empty-icon" aria-hidden="true">' + L.icon('lock', { size: 28 }) + '</span><div><h2>' + profile('locked') +
        '</h2><p class="muted">' + w('lockedHelp') + '</p></div></section>' :
        '<div class="pf-highlights" aria-label="' + profile('highlights') + '" data-highlights hidden></div>' +
        '<div class="pf-tabs" role="group" aria-label="' + profile('posts') + '" data-profile-tabs>' +
        [['posts', profile('posts'), 'grid'], ['tagged', profile('tagged'), 'tagged']].map(([name, label, icon]) =>
          '<button type="button" data-profile-tab="' + name + '" aria-label="' + label + '" aria-pressed="' + (name === 'posts') + '">' +
          L.icon(icon, { size: 24 }) + '</button>').join('') +
        '</div><div class="pf-grid" data-gallery></div><div data-gallery-status role="status" hidden></div>' +
        '<div class="pf-more-row" data-gallery-more hidden><i></i></div>');

    // 소개가 두 줄을 넘칠 때만 끝에 회색 '더 보기' (P8)
    const bioBox = view.querySelector('[data-bio]');
    if (bioBox) {
      const text = bioBox.querySelector('p'), button = bioBox.querySelector('[data-more-bio]');
      if (text.scrollHeight > text.clientHeight + 2) {
        button.hidden = false;
        button.onclick = () => {
          bioBox.classList.remove('is-short');
          button.setAttribute('aria-expanded', 'true');
          button.hidden = true;
        };
      } else bioBox.classList.remove('is-short');
    }
    wireMenu(view.closest('[data-profile-root]')?.querySelector('[data-menu]') || view.querySelector('[data-menu]'), user, true);
    const share = view.querySelector('[data-profile-share]');
    if (share) share.onclick = () => shareUI.open({ profile: { nick: user.nick, private: Boolean(user.private) } });
    L.profilePhotos.load(view);
    const portrait = view.querySelector('[data-profile-avatar]');
    if (portrait) portrait.onclick = async () => {
      // 스토리가 있으면 스토리, 없으면 사진 크게 보기 (P6)
      if (story && typeof L.storyOpen === 'function' && await L.storyOpen(user.nick) !== false) return;
      if (photos.length && view.isConnected) L.profilePhotos.open(photos, mainIndex);
    };
    const grid = view.querySelector('[data-stat-posts]');
    if (grid) grid.onclick = () => view.querySelector('[data-profile-tabs]')?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    // 팔로우·취소: 버튼과 숫자만 바꾼다 (P16). 비공개 계정에서 끊으면 잠긴 화면이 돼야 하므로 그때만 다시 그린다.
    view.addEventListener('lounge:follow', event => {
      const { nick, prev, state, result } = event.detail || {};
      if (own || !same(nick, user.nick)) return;
      user.me = { ...(user.me || {}), state, following: state === 'following' };
      const delta = Number(state === 'following') - Number(prev === 'following');
      user.followers = Number.isFinite(result?.followers) ? result.followers : Math.max(0, count(user.followers) + delta);
      const cell = view.querySelector('[data-stat="followers"]');
      if (cell) cell.textContent = short(user.followers);
      if (user.private && delta && !user.locked !== (state === 'following')) void L.route();
    });

    const stops = [];
    let grids = null;
    if (!user.locked) {
      grids = galleries(view, user, own, kept);
      stops.push(grids.stop);
    }
    if (L.pull) stops.push(L.pull(view, () => { if (stashKey && L.unstash) L.unstash(stashKey); return L.route(); }));   // 당겨서 새로고침 (P29)
    // 떠나기 전에 격자·스크롤을 맡긴다 → 뒤로 돌아오면 그대로 (P31)
    if (stashKey && L.stash) view.addEventListener('click', event => {
      if (!event.target.closest('a[href^="#/"]')) return;
      const data = grids?.state || {};
      L.stash(stashKey, { user, extra, mode: data.mode, rows: data.rows, before: data.before, loaded: data.loaded, highlights: data.highlights, y: window.scrollY });
    }, true);
    cleanup = () => { for (const stop of stops) { try { stop(); } catch (e) { console.error(e); } } };
    if (kept?.y) requestAnimationFrame(() => { if (view.isConnected) window.scrollTo(0, kept.y); });
    return grids?.ready;
  }

  L.renderProfile3 = enhanced;

  // 그 사람 글 넘겨 보기 (#/u/<닉>/p/<글id>, P30): 누른 글부터 이어지는 목록. 피드 카드(L.feedCards)나 서버의 full 이 없으면 예전 한 장 보기로.
  async function postsView(root, nick, postId) {
    const fallback = () => location.replace('#/feed/' + encodeURIComponent(postId));
    if (typeof L.feedCards !== 'function') return fallback();
    root.innerHTML = '<div data-profile-root>' + L.bar({ back: 'u/' + nick, title: L.t('user4.viewer'), sub: esc(nick) }) +
      '<div class="pf-posts" data-post-list>' + U.status('loading', true) + '</div><div class="pf-more-row" data-post-more hidden><i></i></div></div>';
    const list = root.querySelector('[data-post-list]');
    const more = root.querySelector('[data-post-more]');
    const start = startFrom && same(startFrom.nick, nick) && startFrom.id === postId ? startFrom : null;
    startFrom = null;
    const seen = new Set(), pending = [];
    let before = start?.before ?? null, found = false, done = false, loading = false, pages = 0, moved = false;
    const gone = id => {      // 여기서 지운 글은 돌아갈 격자(맡겨 둔 목록)에서도 뺀다 — 같은 배열을 고쳐야 맡긴 쪽에도 반영된다
      if (!liveGrid || !same(liveGrid.nick, nick)) return;
      const at = liveGrid.rows.findIndex(row => row.id === id);
      if (at >= 0) liveGrid.rows.splice(at, 1);
    };
    const add = posts => {
      if (!posts.length) return null;
      const box = document.createElement('div');
      box.className = 'pf-posts-page';
      list.append(box);
      L.feedCards(box, posts, { onGone: gone, bleed: false });      // 이 목록은 이미 화면 끝까지 닿아 있다 (.pf-posts)
      return box;
    };
    async function load() {
      if (loading || done) return;
      loading = true;
      const cursor = before;
      const result = await L.api('user_posts', { nick, full: 1, ...(cursor != null ? { before: cursor } : {}) });
      loading = false;
      if (!list.isConnected) return 'gone';
      if (result.error) { done = true; return result.error; }
      const posts = (result.posts || []).filter(post => typeof post?.id === 'string' && !seen.has(post.id));
      // 예전 서버는 full 을 몰라 격자 카드(thumb 만)를 준다 → 한 장 보기로
      if (posts.length && !posts.some(post => Array.isArray(post.photos) || post.author || typeof post.text === 'string')) return 'plain';
      for (const post of posts) seen.add(post.id);
      before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      done = before == null;
      pages++;
      if (found) { add(posts); more.hidden = done; return ''; }
      const at = posts.findIndex(post => post.id === postId);
      if (at < 0) { pending.push(...posts); return ''; }
      found = true;
      list.replaceChildren();
      add(pending.concat(posts.slice(0, at)));
      const target = add(posts.slice(at));
      target.classList.add('pf-posts-from');
      const jump = () => { if (target.isConnected && !moved) target.scrollIntoView({ block: 'start' }); };
      jump();
      if (L.restoreScroll && L.restoreScroll()) moved = true;     // 이 목록으로 '뒤로' 돌아온 것이면 보던 자리로
      setTimeout(jump, 250);       // 위쪽 사진이 뒤늦게 자리를 잡아도 누른 글이 맨 위에 오게
      addEventListener('touchstart', () => { moved = true; }, { once: true, passive: true });
      addEventListener('wheel', () => { moved = true; }, { once: true, passive: true });
      more.hidden = done;
      return '';
    }
    while (!found) {
      const state = await load();
      if (state === 'gone') return;
      if (state === 'plain' || state === 'not_found') return fallback();
      if (state) { list.innerHTML = state === 'forbidden' ? emptyState('lock', profile('locked')) : U.status('error'); return; }
      if (!found && (done || pages >= 8)) return fallback();     // 그 사람 글이 아니거나 너무 오래된 글 → 한 장 보기
    }
    const stopMore = L.more(more, load);
    cleanup = () => stopMore();
  }

  // 저장됨 (#/saved · #/saved/<모음id>, F34): 3칸 격자 + 저장 모음(collections). 누르면 그 글(#/feed/<id>)로, 뒤로 오면 그대로.
  //  share.js 는 'saved' 화면이 이미 있으면 자기 것을 등록하지 않는다 → 이 파일 끝에서 등록한다.
  function collectionName(existing, done) {
    const panel = sheet('<h2>' + (existing ? w('colRename') : w('newCol')) + '</h2><form class="shell-form">' +
      '<label class="shell-field">' + w('colName') + '<input name="title" maxlength="20" required autocomplete="off"></label>' +
      '<p class="shell-error" role="status"></p><button class="btn btn-hot" type="submit">' + esc(L.t('me.save')) + '</button></form>');
    const form = panel.querySelector('form'), status = form.querySelector('[role=status]'), submit = form.querySelector('[type=submit]');
    form.elements.title.value = existing?.title || '';
    form.onsubmit = async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      const title = form.elements.title.value.trim();
      const result = await L.api('collection_set', { ...(existing ? { id: existing.id } : {}), title });
      if (!panel.isConnected) return;
      submit.disabled = false;
      if (result.error) {
        status.textContent = L.t(result.error === 'title' ? 'user4.colTitle' : result.error === 'collection_limit' ? 'user4.colLimit' : 'screens.failed');
        return;
      }
      L.closeSheet();
      done({ id: result.id || existing?.id, title });
    };
    form.elements.title.focus();
  }

  // 모음에 담을 글 고르기: 저장한 글 전체를 썸네일로 보여 주고, 이미 담긴 것은 표시해 둔다. 바뀐 것만 서버에 보낸다.
  async function collectionPosts(id, done) {
    const panel = sheet('<h2>' + w('colPosts') + '</h2><form class="shell-form pf-highlight-form"><p class="muted">' + w('colPick') +
      ' <span data-picked></span></p><div class="pf-picks" data-picks></div><div class="pf-more-row" data-pick-more><i></i></div>' +
      '<p class="shell-error" role="status"></p><button class="btn btn-hot" type="submit" disabled>' + esc(L.t('me.save')) + '</button></form>');
    const form = panel.querySelector('form'), picks = panel.querySelector('[data-picks]'), more = panel.querySelector('[data-pick-more]');
    const status = form.querySelector('[role=status]'), submit = form.querySelector('[type=submit]'), picked = panel.querySelector('[data-picked]');
    const inside = new Set();
    for (let cursor = null, page = 0; page < 20; page++) {      // 지금 이 모음에 든 글
      const result = await L.api('saved', { collection: id, ...(cursor != null ? { before: cursor } : {}) });
      if (!panel.isConnected) return;
      if (result.error) break;
      for (const post of result.posts || []) if (post?.id) inside.add(post.id);
      if (result.before == null || JSON.stringify(result.before) === JSON.stringify(cursor)) break;
      cursor = result.before;
    }
    const chosen = new Set(inside), seen = new Set();
    let before = null, loading = false, ended = false;
    const sync = () => {
      picked.textContent = chosen.size ? L.t('user4.picked', { n: chosen.size }) : '';
      submit.disabled = chosen.size === inside.size && [...chosen].every(post => inside.has(post));
    };
    async function load() {
      if (loading || ended) return;
      loading = true;
      const cursor = before;
      const result = await L.api('saved', cursor != null ? { before: cursor } : {});
      loading = false;
      if (!panel.isConnected) return;
      if (result.error) { status.textContent = L.t('screens.error'); ended = true; more.hidden = true; return; }
      for (const post of result.posts || []) {
        if (!post?.id || seen.has(post.id)) continue;
        seen.add(post.id);
        const image = post.thumb || post.photos?.[0];
        const thumb = U.image(typeof image === 'string' ? image : image?.thumb || image?.src);
        picks.insertAdjacentHTML('beforeend', '<label class="pf-pick"><input type="checkbox" name="posts" value="' + esc(post.id) + '"' +
          (chosen.has(post.id) ? ' checked' : '') + ' aria-label="' + profile('post', { n: seen.size }) + '">' +
          (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">' : '') + '<i aria-hidden="true">' + L.icon('check', { size: 16 }) + '</i></label>');
      }
      before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      ended = before == null;
      more.hidden = ended;
      if (!seen.size) status.textContent = L.t('user4.noSaved');
      if (!ended && picks.getBoundingClientRect().bottom < innerHeight) void load();
    }
    const stop = L.more(more, load);
    form.onchange = event => {
      const box = event.target.closest('input[name=posts]');
      if (box) { if (box.checked) chosen.add(box.value); else chosen.delete(box.value); }
      sync();
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      const jobs = [...[...chosen].filter(post => !inside.has(post)).map(post => ['save', post]),
        ...[...inside].filter(post => !chosen.has(post)).map(post => ['unsave', post])];
      let failed = false;
      for (const [action, post] of jobs) {
        const result = await L.api(action, { post, collection: id });
        if (result.error) failed = true;
      }
      if (!panel.isConnected) return;
      stop();
      L.closeSheet();
      if (failed) L.toast(L.t('screens.failed'));
      done();
    };
    sync();
    void load();
  }

  async function saved(root, { id } = {}) {
    leave();
    const barButton = (attr, icon, label) => '<button class="ui-bar-btn" type="button" ' + attr + ' aria-haspopup="dialog" aria-label="' + label + '">' + L.icon(icon) + '</button>';
    root.innerHTML = L.bar({ back: id ? 'saved' : 'me', title: L.t('share.saved'),
      right: id ? barButton('data-saved-menu hidden', 'more', w('more')) : barButton('data-saved-new hidden', 'plus', w('newCol')) }) +
      '<div class="pf pf-saved" data-saved>' + (id ? '' : '<div class="pf-cols" data-collections hidden></div>') +
      '<div class="pf-grid" data-gallery data-saved-posts></div><div data-gallery-status role="status" hidden></div>' +
      '<div class="pf-more-row" data-gallery-more><i></i></div></div>';
    const view = root.querySelector('[data-saved]');
    const gallery = view.querySelector('[data-gallery]'), status = view.querySelector('[data-gallery-status]');
    const more = view.querySelector('[data-gallery-more]');
    if (!L.open('share')) { view.innerHTML = U.status('soon'); return; }
    const key = 'saved:' + (id || '');
    const kept = L.profileKept(key);
    const state = kept?.loaded ? kept : { rows: [], before: null, loaded: false, cols: null };
    const reload = () => { if (L.unstash) L.unstash(key); return L.route(); };
    let pending = false;
    const paint = (error = '') => {
      status.hidden = !(error || (state.loaded && !state.rows.length));
      status.innerHTML = error ? '<p class="muted">' + esc(error) + '</p>' : status.hidden ? '' : emptyState('bookmark', id ? w('colEmpty') : esc(L.t('share.empty')),
        id ? '<button type="button" class="pf-text-link" data-saved-add>' + w('colAdd') + '</button>' : '');
      const add = status.querySelector('[data-saved-add]');
      if (add) add.onclick = () => collectionPosts(id, reload);
      more.hidden = state.before == null && state.loaded;
    };
    // 모음: 전체 화면에서는 위에 모음 줄 + ＋(새 모음), 모음 화면에서는 제목 + ⋯(추가·이름·삭제). 서버가 모르면 그냥 없다.
    function paintCollections(list) {
      state.cols = list;
      if (id) {
        const mine = list.find(item => item.id === id);
        const menu = root.querySelector('[data-saved-menu]');
        if (!mine) return;
        root.querySelector('.ui-bar-title h1').textContent = mine.title;
        menu.hidden = false;
        menu.onclick = () => L.menu([
          { label: L.t('user4.colPosts'), icon: 'plusBox', on: () => collectionPosts(id, reload) },
          { label: L.t('user4.colRename'), icon: 'edit', on: () => collectionName(mine, reload) },
          { label: L.t('user4.colDelete'), icon: 'trash', danger: true, async on() {
            if (!await L.confirm(L.t('user4.colDeleteAsk'), { ok: L.t('user4.del'), danger: true, body: L.t('user4.colDeleteBody') })) return;
            const result = await L.api('collection_del', { id });
            if (result.error) return U.error(result);
            if (L.unstash) L.unstash('saved:');
            L.back('saved');
          } }
        ], { title: mine.title });
        return;
      }
      const create = root.querySelector('[data-saved-new]');
      create.hidden = false;
      create.onclick = () => collectionName(null, made => L.go('saved/' + encodeURIComponent(made.id)));
      const row = view.querySelector('[data-collections]');
      row.hidden = !list.length;
      row.innerHTML = list.map(item => {
        const cover = U.image(item.cover);
        return '<a class="pf-col" href="#/saved/' + encodeURIComponent(item.id) + '"><span class="pf-col-cover">' +
          (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' : L.icon('bookmark', { size: 22 })) + '</span><span data-col-title>' +
          esc(item.title) + '</span><small>' + w('colCount', { n: short(item.count) }) + '</small></a>';
      }).join('');
    }
    if (state.cols) paintCollections(state.cols);
    else void L.api('collections').then(result => {
      if (view.isConnected && Array.isArray(result.list)) paintCollections(result.list.filter(item => item?.id));
    });
    async function load(append = false) {
      if (pending || (append && state.before == null)) return;
      pending = true;
      const cursor = append ? state.before : null;
      const result = await L.api('saved', { ...(id ? { collection: id } : {}), ...(cursor != null ? { before: cursor } : {}) });
      pending = false;
      if (!view.isConnected) return;
      state.loaded = true;
      if (result.error) {
        state.before = null;
        paint(L.t('screens.error'));
        if (result.error === 'auth') L.needLogin();
        return;
      }
      const seen = new Set(state.rows.map(row => row.id));
      const rows = (result.posts || []).filter(row => typeof row?.id === 'string' && !seen.has(row.id));
      gallery.insertAdjacentHTML('beforeend', postTiles(rows, state.rows.length));
      state.rows.push(...rows);
      state.before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      paint();
      setTimeout(() => {
        if (view.isConnected && state.before != null && more.getBoundingClientRect().top < innerHeight + 400) void load(true);
      }, 0);
    }
    view.addEventListener('click', event => {
      if (event.target.closest('a[href^="#/"]') && L.stash) L.stash(key, { ...state, y: window.scrollY });
    }, true);
    cleanup = L.more(more, () => load(true));
    if (state.loaded) {
      gallery.innerHTML = postTiles(state.rows);
      paint();
      if (kept.y) requestAnimationFrame(() => { if (view.isConnected) window.scrollTo(0, kept.y); });
    } else await load();
  }
  L.profileSaved = saved;
  L.profileSavedScreen = { nav: 'me', auth: true, title: 'share.saved', bar: 'own', keepScroll: true, render: saved, leave };

  async function changeBlock(button, action, nick) {
    if (L.needLogin() || button.disabled) return false;
    button.disabled = true;
    const result = await L.api(action, { nick });
    button.disabled = false;
    if (!button.isConnected) return false;
    if (!result.ok || result.error) {
      U.error(result);
      return false;
    }
    return true;
  }

  async function blocks(root) {
    root.innerHTML = L.bar({ back: 'me', title: L.t('user.blocks') }) + '<div class="pf pf-list" data-blocks>' + U.status('loading', true) + '</div>';
    const view = root.querySelector('[data-blocks]');
    const data = await L.api('blocks');
    if (!view.isConnected) return;
    if (data.error) {
      view.innerHTML = U.status(data.error === 'action' ? 'soon' : 'error');
      return;
    }
    const rows = Array.isArray(data.blocks) ? data.blocks.filter(row => row?.nick) : [];
    if (!rows.length) {
      view.innerHTML = emptyState('block', U.t('empty'));
      return;
    }
    const list = document.createElement('div');
    list.className = 'pf-rows';
    for (const person of rows) {
      const { nick } = person;
      list.insertAdjacentHTML('beforeend', '<div class="pf-row"><span class="pf-person">' + L.avatar(person, 44) +
        '<span class="pf-person-text"><strong>' + L.whoTag(person) + '</strong></span></span>' +
        '<button type="button" class="pf-btn pf-btn-small" data-unblock><span class="pf-btn-in">' + t('unblock') + '</span></button></div>');
      list.lastElementChild.querySelector('button').onclick = async event => {
        if (await changeBlock(event.currentTarget, 'unblock', nick)) await L.route();
      };
    }
    view.replaceChildren(list);
  }

  async function render(root, { id } = {}) {
    leave();
    const split = /^(.+)\/p\/([^/]+)$/.exec(id || '');
    if (split && L.open('profile2')) return postsView(root, split[1], split[2]);
    const nick = split ? split[1] : id;
    const profile2 = L.open('profile2');
    const own = name => Boolean(L.me && same(L.me.nick, name));
    // 내 프로필은 주소를 바꾸지 않고 같은 자리에서 '나' 화면 모양으로 그린다 (뒤로 가기가 꼬이지 않게)
    if (profile2 && nick && own(nick) && L.profileMe) { L.paintNav('me'); return L.profileMe(root); }
    const menu = '<button class="ui-bar-btn" type="button" data-menu aria-haspopup="dialog" aria-label="' +
      (profile2 ? w('more') : t('menu')) + '">' + L.icon('more') + '</button>';
    const wrap = document.createElement('div');
    wrap.dataset.profileRoot = '';
    wrap.innerHTML = L.bar({ back: 'feed', title: profile2 ? nick || L.t('user.title') : L.t('user.title'),
      right: profile2 ? '' : L.inboxIcons() }) + '<div data-profile-body></div>';
    root.replaceChildren(wrap);
    if (!profile2) L.paintInbox();
    const view = U.mount(wrap.querySelector('[data-profile-body]'), '');
    const stashKey = 'u:' + String(nick || '').toLowerCase();
    const stashed = L.profileKept(stashKey);
    const kept = profile2 ? stashed : null;
    const response = kept ? { user: kept.user } : nick ? await L.api('user', { nick }) : {};
    if (!view.isConnected) return;
    const user = response?.user;
    if (!user) {
      view.innerHTML = response?.error === 'network' ? U.status('error') :
        profile2 ? emptyState('user', w('missing')) : '<p role="status">' + t('missing') + '</p>';
      if (!nick || !L.me || !['not_found', 'missing'].includes(response.error)) return;
      const data = await L.api('blocks');
      if (!view.isConnected) return;
      const blocked = Array.isArray(data.blocks) && data.blocks.find(row =>
        typeof row?.nick === 'string' && row.nick.toLowerCase() === nick.toLowerCase());
      if (blocked) {
        (view.querySelector('.pf-empty') || view).insertAdjacentHTML('beforeend', U.button(t('unblock'), 'data-unblock'));
        view.querySelector('[data-unblock]').onclick = async event => {
          if (await changeBlock(event.currentTarget, 'unblock', blocked.nick)) await L.route();
        };
      }
      return;
    }
    const photo = U.image(user.photo);
    const mine = Boolean(L.me && (user.me?.self === true || same(L.me.nick, user.nick)));
    if (profile2) {
      if (mine && L.profileMe) { L.paintNav('me'); return L.profileMe(root); }
      const title = wrap.querySelector('.ui-bar-title h1');
      if (title) title.innerHTML = esc(user.nick) + (user.private ? ' <span class="pf-bar-lock" aria-hidden="true">' + L.icon('lock', { size: 14 }) + '</span>' : '');
      wrap.querySelector('.ui-bar-side.is-right').innerHTML = menu;
      return enhanced(view, user, false, '', kept, stashKey);
    }
    const follow2 = L.open('follow2');
    view.innerHTML = '<article style="' + U.card + '">' + (photo ? '<img alt="" src="' + L.esc(photo) +
      '" style="width:76px;height:76px;object-fit:cover;border-radius:50%;border:2px solid var(--g)">' : '') +
      '<h2 data-user-name>' + L.whoTag(user) + '</h2><p style="white-space:pre-wrap">' + L.esc(user.bio) + '</p>' +
      '<p class="muted">' + L.esc([user.floor, user.joinedMonth].filter(Boolean).join(' · ')) + '</p>' +
      '<p>' + (user.badges || []).filter(badge => badge.got !== false && badge.got !== null && badge.got !== 0).map(badge =>
        L.esc(badge.label || badge)).join(' · ') + '</p>' + (follow2 ? '<div data-counts></div>' : '<p data-counts></p>') +
      (mine ? '' : '<div style="display:flex;flex-wrap:wrap;gap:8px">' + U.button('', 'data-follow', true) +
        (L.open('dm') ? U.link('#/dm/' + encodeURIComponent(user.nick), t('message')) : '') +
        U.button('⋯', 'data-menu aria-haspopup="dialog" aria-label="' + t('menu') + '"') + '</div>') + '</article>';

    const follow = view.querySelector('[data-follow]');
    let following = Boolean(user.me?.following);
    function paint() {
      const counts = view.querySelector('[data-counts]');
      if (follow2) {
        counts.innerHTML = '<span class="profile3-stats">' + stats(user, L.me && !user.locked, true) + '</span>';
        if (follow) {
          follow.textContent = actionLabel(user);
          follow.setAttribute('aria-pressed', String(followingState(user) === 'following'));
        }
        return;
      }
      counts.innerHTML = '<b>' + t('followers') + ' ' + (Number(user.followers) || 0) +
        '</b> · ' + t('following') + ' ' + (Number(user.following) || 0);
      if (follow) {
        follow.textContent = L.t('user.' + (following ? 'unfollow' : 'follow'));
        follow.setAttribute('aria-pressed', following);
      }
    }
    paint();
    if (!follow) return;
    follow.onclick = async () => {
      if (L.needLogin() || follow.disabled) return;
      follow.disabled = true;
      const result = await L.api(following ? 'unfollow' : 'follow', { nick: user.nick });
      if (!view.isConnected) return;
      follow.disabled = false;
      if (!result || result.error) return U.error(result);
      const next = result.following ?? !following;
      user.followers = result.followers ?? Math.max(0, (Number(user.followers) || 0) + Number(next) - Number(following));
      following = next;
      paint();
    };
    if (follow2) wireFollow(follow, user);
    wireMenu(view.querySelector('[data-menu]'), user);
  }
  L.screen('user', { nav: 'feed', auth: false, title: 'user.title', bar: 'own', keepScroll: true, render, leave });
  L.screen('blocks', { nav: 'me', auth: true, title: 'user.blocks', bar: 'own', keepScroll: true, render: blocks });
  L.screen('saved', L.profileSavedScreen);
})();
