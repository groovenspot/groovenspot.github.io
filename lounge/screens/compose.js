/* 글쓰기 (4차 · lounge/SPEC4.md 4-3 · 기획 F40~F46·B7·B9) — 주인: 스토리·글쓰기 작업창(D)
   흐름: ① 사진 고르기 → ② 자르기·순서 → ③ 글·사람 태그·층·챌린지 → 공유.
   #/compose?challenge=<id> · #/compose?edit=<글id>(글·층만 고치기) · #/tags(내가 태그된 사진 승인) */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  // 예전 낱말(ja·zh 는 i18n/ja.js·zh.js 에 이미 있음) — 문구가 그대로인 것만 계속 쓴다.
  const o = U.words('compose', {
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
  // 4차에 새로 생긴 낱말 — ja·zh 는 아래 L.i18n 에 같이 넣는다 (SPEC4 1장: 새 문구는 새 키).
  const t = U.words('compose4', {
    title: ['새 게시물', 'New post'], editTitle: ['게시물 고치기', 'Edit post'],
    next: ['다음', 'Next'], share: ['공유', 'Share'], save: ['완료', 'Done'], back: ['뒤로', 'Back'],
    pickSub: ['최대 5장 · 올리기 전에 자르고 순서를 바꿀 수 있어요', 'Up to 5 · crop and reorder before you post'],
    crop: ['사진 자르기. 끌어서 위치를 옮기고 두 손가락이나 아래 막대로 확대해요.', 'Crop photo. Drag to move, pinch or use the slider to zoom.'],
    ratio: ['사진 비율', 'Aspect ratio'], orig: ['원본', 'Original'], zoom: ['확대', 'Zoom'],
    select: ['사진 {n} 보기', 'Show photo {n}'], order: ['순서', 'Order'],
    forward: ['앞으로 옮기기', 'Move earlier'], backward: ['뒤로 옮기기', 'Move later'], drop: ['빼기', 'Remove'],
    same: ['첫 사진의 비율이 모든 사진에 적용돼요.', 'The first photo’s ratio applies to every photo.'],
    preview: ['피드에 이렇게 보여요', 'How it will look in the feed'], of: ['{n}/{total}', '{n}/{total}'],
    chars: ['{n}/500', '{n}/500'],
    tag: ['사람 태그', 'Tag people'], tagNote: ['태그는 상대가 승인해야 프로필에 보여요.', 'A tag shows on a profile only after that person approves it.'],
    tagSearch: ['닉네임 검색', 'Search nicknames'], tagLimit: ['10명까지 태그할 수 있어요.', 'You can tag up to 10 people.'],
    tagEmpty: ['찾는 사람이 없어요.', 'No one found.'], tagHint: ['팔로우하는 사람이 먼저 보여요.', 'People you follow appear first.'],
    tagAdd: ['{nick} 태그하기', 'Tag {nick}'], tagDrop: ['{nick} 태그 빼기', 'Remove tag {nick}'], tagN: ['{n}명', '{n} people'],
    masked: ['연락처·링크는 올리면 자동으로 가려져요.', 'Phone numbers, IDs and links are hidden automatically when you post.'],
    draft: ['글은 이 기기에 임시 저장돼요.', 'Your caption is saved as a draft on this device.'],
    discard: ['고른 사진을 빼고 나갈까요?', 'Discard these photos?'], discardBody: ['쓴 글은 임시 저장돼요.', 'Your caption stays saved as a draft.'],
    discardOk: ['나가기', 'Discard'],
    uploading: ['사진 {n}/{total} 올리는 중…', 'Uploading photo {n} of {total}…'], posting: ['올리는 중…', 'Posting…'],
    done: ['올렸어요', 'Posted'], doneEarned: ['올렸어요 · {n}P를 받았어요!', 'Posted · You earned {n} points!'],
    bad: ['열 수 없는 사진은 뺐어요.', 'Photos that couldn’t be opened were skipped.'],
    editNote: ['사진은 바꿀 수 없어요. 글과 층만 고칠 수 있어요.', 'Photos can’t be changed. You can edit the caption and floor.'],
    editSoon: ['아직 고칠 수 없어요.', 'Editing isn’t available yet.'], editGone: ['이 글은 고칠 수 없어요.', 'You can’t edit this post.'],
    edited: ['고쳤어요', 'Saved'],
    tagsTitle: ['태그된 사진', 'Tagged photos'], tagsEmpty: ['승인을 기다리는 태그가 없어요.', 'No tags are waiting for your approval.'],
    tagsBy: ['{nick}님이 회원님을 태그했어요', '{nick} tagged you'], approve: ['승인', 'Approve'], decline: ['태그 지우기', 'Remove tag'],
    approved: ['승인했어요. 프로필 ‘태그됨’에 보여요.', 'Approved. It now shows under Tagged on your profile.'],
    removed: ['태그를 지웠어요.', 'Tag removed.'], view: ['글 보기', 'View post'],
    tagsNote: ['승인한 사진만 내 프로필 ‘태그됨’에 보여요. 지우면 태그가 사라져요.', 'Only photos you approve appear under Tagged on your profile. Removing deletes the tag.']
  });
  L.i18n({
    ja: {
      'compose4.title': '新規投稿', 'compose4.editTitle': '投稿を編集', 'compose4.next': '次へ', 'compose4.share': 'シェア', 'compose4.save': '完了', 'compose4.back': '戻る',
      'compose4.pickSub': '5枚まで · 投稿前に切り抜き・並べ替えができます', 'compose4.crop': '写真を切り抜く。ドラッグで移動、ピンチまたは下のバーで拡大します。',
      'compose4.ratio': '写真の比率', 'compose4.orig': 'オリジナル', 'compose4.zoom': '拡大', 'compose4.select': '写真{n}を表示', 'compose4.order': '順番',
      'compose4.forward': '前へ移動', 'compose4.backward': '後ろへ移動', 'compose4.drop': '外す', 'compose4.same': '1枚目の比率がすべての写真に適用されます。',
      'compose4.preview': 'フィードでの見え方', 'compose4.of': '{n}/{total}', 'compose4.chars': '{n}/500',
      'compose4.tag': '人をタグ付け', 'compose4.tagNote': 'タグは相手が承認するとプロフィールに表示されます。', 'compose4.tagSearch': 'ニックネームを検索',
      'compose4.tagLimit': 'タグ付けは10人までです。', 'compose4.tagEmpty': '見つかりませんでした。', 'compose4.tagHint': 'フォロー中の人が先に表示されます。',
      'compose4.tagAdd': '{nick}をタグ付け', 'compose4.tagDrop': '{nick}のタグを外す', 'compose4.tagN': '{n}人',
      'compose4.masked': '連絡先・リンクは投稿時に自動で伏せられます。', 'compose4.draft': '文章はこの端末に下書き保存されます。',
      'compose4.discard': '選んだ写真を外して戻りますか？', 'compose4.discardBody': '書いた文章は下書きに残ります。', 'compose4.discardOk': '戻る',
      'compose4.uploading': '写真 {n}/{total} をアップロード中…', 'compose4.posting': '投稿中…', 'compose4.done': '投稿しました', 'compose4.doneEarned': '投稿しました · {n}P獲得！',
      'compose4.bad': '開けない写真は外しました。', 'compose4.editNote': '写真は変更できません。文章とフロアだけ編集できます。',
      'compose4.editSoon': 'まだ編集できません。', 'compose4.editGone': 'この投稿は編集できません。', 'compose4.edited': '保存しました',
      'compose4.tagsTitle': 'タグ付けされた写真', 'compose4.tagsEmpty': '承認待ちのタグはありません。', 'compose4.tagsBy': '{nick}さんがあなたをタグ付けしました',
      'compose4.approve': '承認', 'compose4.decline': 'タグを削除', 'compose4.approved': '承認しました。プロフィールの「タグ付け」に表示されます。',
      'compose4.removed': 'タグを削除しました。', 'compose4.view': '投稿を見る', 'compose4.tagsNote': '承認した写真だけがプロフィールの「タグ付け」に表示されます。削除するとタグが消えます。'
    },
    zh: {
      'compose4.title': '新帖子', 'compose4.editTitle': '编辑帖子', 'compose4.next': '下一步', 'compose4.share': '分享', 'compose4.save': '完成', 'compose4.back': '返回',
      'compose4.pickSub': '最多 5 张 · 发布前可以裁剪和调整顺序', 'compose4.crop': '裁剪照片。拖动可移动，双指或下方滑块可放大。',
      'compose4.ratio': '照片比例', 'compose4.orig': '原始', 'compose4.zoom': '放大', 'compose4.select': '查看照片 {n}', 'compose4.order': '顺序',
      'compose4.forward': '前移', 'compose4.backward': '后移', 'compose4.drop': '移除', 'compose4.same': '第一张照片的比例会应用到所有照片。',
      'compose4.preview': '在动态中的显示效果', 'compose4.of': '{n}/{total}', 'compose4.chars': '{n}/500',
      'compose4.tag': '标记用户', 'compose4.tagNote': '对方同意后，标记才会显示在个人主页。', 'compose4.tagSearch': '搜索昵称',
      'compose4.tagLimit': '最多可以标记 10 人。', 'compose4.tagEmpty': '没有找到。', 'compose4.tagHint': '你关注的人会先显示。',
      'compose4.tagAdd': '标记 {nick}', 'compose4.tagDrop': '取消标记 {nick}', 'compose4.tagN': '{n} 人',
      'compose4.masked': '联系方式和链接在发布时会自动隐藏。', 'compose4.draft': '文字会作为草稿保存在此设备上。',
      'compose4.discard': '要移除已选照片并离开吗？', 'compose4.discardBody': '已写的文字会保留为草稿。', 'compose4.discardOk': '离开',
      'compose4.uploading': '正在上传照片 {n}/{total}…', 'compose4.posting': '正在发布…', 'compose4.done': '已发布', 'compose4.doneEarned': '已发布 · 获得 {n}P！',
      'compose4.bad': '无法打开的照片已移除。', 'compose4.editNote': '照片无法更换，只能修改文字和楼层。',
      'compose4.editSoon': '暂时无法编辑。', 'compose4.editGone': '无法编辑这条帖子。', 'compose4.edited': '已保存',
      'compose4.tagsTitle': '被标记的照片', 'compose4.tagsEmpty': '没有等待同意的标记。', 'compose4.tagsBy': '{nick} 标记了你',
      'compose4.approve': '同意', 'compose4.decline': '删除标记', 'compose4.approved': '已同意，会显示在个人主页的“被标记”。',
      'compose4.removed': '已删除标记。', 'compose4.view': '查看帖子', 'compose4.tagsNote': '只有你同意的照片才会显示在个人主页的“被标记”。删除后标记会消失。'
    }
  });

  const MAX = 5, CHARS = 500, TAGS = 10, DRAFT = 'gl_compose_draft', DRAFT_DAYS = 7;
  const MIN_RATIO = 0.8, MAX_RATIO = 1.91, MAX_ZOOM = 3, OUT = 1440;
  const FLOORS = [['2F', '2F GROOVE'], ['3F', '3F SPOT'], ['', null]];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const icon = (name, opt) => L.icon ? L.icon(name, opt) : '';
  let release;

  // ── 자르기 계산 (원본 픽셀 기준) ── photo = { w, h, z(확대 1~3), cx, cy(보이는 부분의 가운데) }
  function region(photo, ratio) {
    const unit = Math.max(ratio / photo.w, 1 / photo.h);          // 틀을 꽉 채우는 배율
    const sw = ratio / (unit * photo.z), sh = 1 / (unit * photo.z);
    photo.cx = clamp(photo.cx, sw / 2, photo.w - sw / 2);
    photo.cy = clamp(photo.cy, sh / 2, photo.h - sh / 2);
    return { x: photo.cx - sw / 2, y: photo.cy - sh / 2, sw, sh };
  }
  // 틀(비율 ratio 인 상자) 안에 사진을 자른 모양 그대로 놓는다 — 퍼센트라 상자 크기가 바뀌어도 그대로.
  function place(img, photo, ratio) {
    const r = region(photo, ratio);
    img.style.width = photo.w / r.sw * 100 + '%';
    img.style.height = photo.h / r.sh * 100 + '%';
    img.style.left = -r.x / r.sw * 100 + '%';
    img.style.top = -r.y / r.sh * 100 + '%';
  }
  // 올릴 파일: 자른 곳이 사진 전체면 원본 파일 그대로(L.upload 가 1440px 로 줄임), 아니면 canvas 로 잘라 Blob.
  async function output(photo, ratio) {
    const r = region(photo, ratio);
    const whole = r.sw >= photo.w - 0.5 && r.sh >= photo.h - 0.5;
    const scale = Math.min(1, OUT / Math.max(r.sw, r.sh));
    const w = Math.max(1, Math.round(r.sw * scale)), h = Math.max(1, Math.round(r.sh * scale));
    const sig = whole ? 'whole' : [r.x, r.y, r.sw, r.sh].map(v => Math.round(v)).join(',');
    if (whole) return { blob: photo.file, size: [w, h], sig };
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d', { alpha: false }).drawImage(photo.img, r.x, r.y, r.sw, r.sh, 0, 0, w, h);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) throw new Error('photo');
    return { blob, size: [w, h], sig };
  }

  function readDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT));
      if (draft && typeof draft.text === 'string' && Date.now() - draft.at < DRAFT_DAYS * 86400e3) return draft;
    } catch { /* 없는 것으로 */ }
    return null;
  }
  function writeDraft(text, floor) {
    try {
      if (text.trim()) localStorage.setItem(DRAFT, JSON.stringify({ text: text.slice(0, CHARS), floor, at: Date.now() }));
      else localStorage.removeItem(DRAFT);
    } catch { /* 저장 공간이 없으면 건너뜀 */ }
  }

  function shell(root, title, right) {
    const view = document.createElement('section');
    view.className = 'cx';
    view.innerHTML = L.bar({
      title: L.t(title),
      left: '<button class="ui-bar-btn" type="button" data-cx-back aria-label="' + t('back') + '">' + icon('back') + '</button>',
      right: right || ''
    }) + '<div class="cx-body" data-content></div>';
    root.replaceChildren(view);
    return view;
  }
  const skeleton = () => '<div class="cx-skeleton" role="status" data-post-skeleton><span class="sr-only">' + U.t('loading') +
    '</span><span class="cx-shimmer post-skeleton-media" aria-hidden="true"></span><span class="cx-shimmer cx-shimmer-line" aria-hidden="true"></span></div>';
  const state = message => '<p class="cx-state" role="status">' + message + '</p>';
  const floorField = value => '<fieldset class="cx-floors"><legend>' + o('floor') + '</legend><div class="cx-pills">' +
    FLOORS.map(([key, label]) => '<label class="cx-pill"' + (key ? ' data-floor="' + key + '"' : '') + '><input class="sr-only" type="radio" name="floor" value="' + key + '"' +
      (key === value ? ' checked' : '') + '><span>' + (label || o('none')) + '</span></label>').join('') + '</div></fieldset>';
  const captionField = () => '<div class="cx-field"><label class="cx-label" for="cx-caption">' + o('text') + '</label>' +
    '<textarea id="cx-caption" name="caption" rows="4" maxlength="' + CHARS + '" placeholder="' + o('prompt') + '"></textarea>' +
    '<small class="cx-chars" data-chars aria-hidden="true">' + t('chars', { n: 0 }) + '</small></div>';
  function countChars(form) {
    const paint = () => { form.querySelector('[data-chars]').textContent = L.t('compose4.chars', { n: Array.from(form.elements.caption.value).length }); };
    form.elements.caption.addEventListener('input', paint);
    paint();
    return paint;
  }
  // 미리보기(피드에 보일 모양): slides = [{ html }] — 옆으로 넘기고 점·'1/3' 표시
  function carousel(box, slides, ratio) {
    box.innerHTML = '<div class="cx-track" tabindex="0" role="region" aria-label="' + t('preview') + '">' +
      slides.map(html => '<div class="cx-slide" style="aspect-ratio:' + ratio + '">' + html + '</div>').join('') + '</div>' +
      (slides.length > 1 ? '<span class="cx-index" data-preview-index aria-hidden="true"></span><div class="cx-dots" aria-hidden="true">' +
        slides.map(() => '<i></i>').join('') + '</div>' : '');
    const track = box.firstElementChild, index = box.querySelector('[data-preview-index]'), dots = box.querySelectorAll('.cx-dots i');
    const paint = () => {
      const now = clamp(Math.round(track.scrollLeft / (track.clientWidth || 1)), 0, slides.length - 1);
      if (index) index.textContent = L.t('compose4.of', { n: now + 1, total: slides.length });
      dots.forEach((dot, i) => dot.toggleAttribute('data-on', i === now));
    };
    track.addEventListener('scroll', paint, { passive: true });
    track.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      track.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * track.clientWidth });
    });
    paint();
    return track;
  }

  // ── 사람 태그 고르기 ── chosen = [{ nick, photo }] (그 자리에서 바뀜). 닫히면 onChange()
  function tagSheet(chosen, onChange) {
    const me = L.me?.nick;
    const panel = L.sheet('<div class="cx-sheet-head"><h2>' + t('tag') + '</h2><button class="btn cx-sheet-done" type="button" data-tag-done>' + t('save') + '</button></div>' +
      '<p class="cx-sheet-note">' + t('tagNote') + '</p>' +
      '<div class="cx-chips" data-tag-chosen aria-live="polite"></div>' +
      '<label class="cx-search">' + icon('search', { size: 20 }) + '<span class="sr-only">' + t('tagSearch') + '</span>' +
      '<input type="search" data-tag-q maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="' + t('tagSearch') + '"></label>' +
      '<div class="cx-people" data-tag-list></div>');
    panel.classList.add('cx-sheet');
    const box = panel.querySelector('[data-tag-chosen]'), list = panel.querySelector('[data-tag-list]'), input = panel.querySelector('[data-tag-q]');
    let version = 0, shown = [], searchable = true, timer;
    const has = nick => chosen.some(person => person.nick === nick);
    function paintChosen() {
      box.hidden = !chosen.length;
      box.innerHTML = chosen.map((person, i) => '<button type="button" class="cx-chip" data-untag="' + i + '" aria-label="' + t('tagDrop', { nick: person.nick }) + '">' +
        '<span>@' + L.esc(person.nick) + '</span>' + icon('close', { size: 14 }) + '</button>').join('') +
        (chosen.length >= TAGS ? '<small class="cx-chip-note">' + t('tagLimit') + '</small>' : '');
    }
    function paintList(note) {
      list.innerHTML = shown.length ? shown.map((person, i) => {
        const on = has(person.nick);
        return '<button type="button" class="cx-person" data-pick-person="' + i + '" aria-pressed="' + on + '" aria-label="' +
          t(on ? 'tagDrop' : 'tagAdd', { nick: person.nick }) + '">' + L.avatar(person, 44) + '<span class="cx-person-nick">' + L.whoTag(person) +
          '</span><span class="cx-check" aria-hidden="true">' + icon('check', { size: 18 }) + '</span></button>';
      }).join('') : '<p class="cx-sheet-note">' + (note || t('tagEmpty')) + '</p>';
    }
    async function people(q) {
      const seen = new Set([me]), out = [];
      const add = rows => { for (const row of rows || []) { const person = typeof row === 'string' ? { nick: row } : row; if (person?.nick && !seen.has(person.nick)) { seen.add(person.nick); out.push(person); } } };
      if (q && searchable) {
        const found = await L.api('search', { q });
        if (Array.isArray(found.users)) add(found.users);
        else if (found.error === 'action' || found.error === 'closed') searchable = false;      // 예전 서버: 팔로우 목록 안에서 찾는다
      }
      if (!out.length || !q) {
        const [following, followers] = await Promise.all(['following', 'followers'].map(a => L.api(a, { nick: me, ...(q && { q }) })));
        add(following.list || following.people || following.following);
        add(followers.list || followers.people || followers.followers);
        if (q) { const key = q.toLowerCase(); for (let i = out.length - 1; i >= 0; i--) if (!out[i].nick.toLowerCase().includes(key)) out.splice(i, 1); }
      }
      if (q && /^[가-힣A-Za-z0-9._]{2,20}$/.test(q) && !out.some(person => person.nick.toLowerCase() === q.toLowerCase()) && q.toLowerCase() !== String(me).toLowerCase()) {
        const exact = await L.api('user', { nick: q });       // 팔로우하지 않는 사람도 닉네임을 정확히 치면 태그할 수 있다
        const user = exact.user || (exact.nick ? exact : null);
        if (user?.nick && !exact.error) out.unshift({ nick: user.nick, photo: user.photo || (Array.isArray(user.photos) ? user.photos[0] : ''), tag: user.tag });
      }
      return out.slice(0, 30);
    }
    async function search() {
      const request = ++version, q = input.value.trim().replace(/^@/, '');
      const result = await people(q);
      if (request !== version || !panel.isConnected) return;
      shown = result;
      paintList(q ? '' : t('tagHint'));
    }
    list.innerHTML = '<p class="cx-sheet-note" role="status">' + U.t('loading') + '</p>';
    paintChosen();
    search();
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
    panel.addEventListener('click', event => {
      const un = event.target.closest('[data-untag]'), pick = event.target.closest('[data-pick-person]');
      if (event.target.closest('[data-tag-done]')) return L.closeSheet();
      if (un) chosen.splice(Number(un.dataset.untag), 1);
      else if (pick) {
        const person = shown[Number(pick.dataset.pickPerson)], at = chosen.findIndex(item => item.nick === person.nick);
        if (at >= 0) chosen.splice(at, 1);
        else if (chosen.length >= TAGS) return L.toast(L.t('compose4.tagLimit'));
        else chosen.push({ nick: person.nick, photo: person.photo });
      } else return;
      paintChosen(); paintList(); onChange();
      if (un) input.focus();
    });
    return panel;
  }

  // ── 새 글 ──
  async function render(root, { challenge, edit } = {}) {
    if (edit) return renderEdit(root, edit);
    const view = shell(root, 'compose4.title',
      '<button class="cx-action" type="button" data-next hidden>' + t('next') + '</button>' +
      '<button class="cx-action" type="submit" form="post-compose" data-publish hidden>' + t('share') + '</button>');
    const body = view.querySelector('[data-content]');
    const backButton = view.querySelector('[data-cx-back]'), nextButton = view.querySelector('[data-next]'), send = view.querySelector('[data-publish]');
    backButton.onclick = () => L.back('feed');
    body.innerHTML = skeleton();
    const options = await L.api('post_options');
    if (!view.isConnected) return;
    if (!options.memberPosts) {
      body.innerHTML = state(U.t(options.error ? 'error' : 'soon'));
      return;
    }
    if (!L.me) {
      body.innerHTML = U.button(L.esc(L.t('core.login')), 'data-compose-login', true);
      body.querySelector('button').onclick = L.needLogin;
      L.needLogin();
      return;
    }

    const active = Array.isArray(options.active) ? options.active : [];
    const canTag = L.open('profile2');
    const draft = readDraft();
    body.innerHTML = '<form id="post-compose" class="cx-form" novalidate>' +
      '<p class="cx-status" data-compose-status role="status" hidden></p>' +
      '<input type="file" name="files" accept="image/*" multiple hidden>' +
      // ① 사진 고르기
      '<section class="cx-step" data-step="pick"><button class="cx-pick" type="button" data-pick>' + icon('image', { size: 40 }) +
      '<strong>' + o('choose') + '</strong><small>' + t('pickSub') + '</small></button><p class="cx-note">' + o('consent') + '</p></section>' +
      // ② 자르기 · 순서
      '<section class="cx-step" data-step="edit" hidden><div class="cx-stage-wrap"><div class="cx-stage" data-stage tabindex="0" role="group" aria-label="' + t('crop') + '">' +
      '<img data-stage-img alt="" draggable="false"><div class="cx-grid" aria-hidden="true"></div><span class="cx-index" data-index aria-hidden="true"></span></div></div>' +
      '<div class="cx-tools"><div class="cx-ratios" role="group" aria-label="' + t('ratio') + '">' +
      [['1:1', '1:1'], ['4:5', '4:5'], ['orig', t('orig')]].map(([key, label]) => '<button type="button" class="cx-ratio" data-ratio="' + key + '" aria-pressed="false">' + label + '</button>').join('') +
      '</div><label class="cx-zoom">' + icon('search', { size: 18 }) + '<span class="sr-only">' + t('zoom') + '</span><input type="range" data-zoom min="1" max="' + MAX_ZOOM + '" step="0.01" value="1"></label></div>' +
      '<div class="cx-strip" data-selection></div>' +
      '<div class="cx-order" role="group" aria-label="' + t('order') + '"><button type="button" class="cx-tool" data-move="-1" aria-label="' + t('forward') + '">' + icon('back', { size: 20 }) + '</button>' +
      '<button type="button" class="cx-tool" data-move="1" aria-label="' + t('backward') + '">' + icon('chevron', { size: 20 }) + '</button>' +
      '<button type="button" class="cx-tool cx-tool-text" data-remove="0">' + icon('trash', { size: 18 }) + '<span>' + t('drop') + '</span></button>' +
      '<span class="cx-count" data-count aria-live="polite"></span></div><p class="cx-hint" data-same>' + t('same') + '</p></section>' +
      // ③ 글 · 태그 · 층 · 챌린지
      '<section class="cx-step" data-step="write" hidden><div class="cx-preview" data-preview></div>' + captionField() +
      (canTag ? '<button type="button" class="cx-row" data-tag-open>' + icon('userPlus', { size: 22 }) + '<span class="cx-row-label">' + t('tag') +
        '</span><span class="cx-row-value" data-tag-value></span>' + icon('chevron', { size: 18 }) + '</button>' : '') +
      floorField(FLOORS.some(([key]) => key === draft?.floor) ? draft.floor : '') +
      (active.length ? '<label class="cx-field"><span class="cx-label">' + o('challenge') + '</span><select name="challenge"><option value="">' + o('none') +
        '</option>' + active.map(item => '<option value="' + L.esc(item.id) + '">' + L.esc(item.title) + '</option>').join('') + '</select></label>' : '') +
      '<p class="cx-note">' + o('consent') + '</p><p class="cx-fine">' + t('masked') + ' ' + t('draft') + (canTag ? ' ' + t('tagNote') : '') + '</p></section></form>';

    const form = body.querySelector('form');
    const { files, caption, challenge: select } = form.elements;
    if (select && active.some(item => item.id === challenge)) select.value = challenge;
    if (draft) caption.value = draft.text;
    const paintChars = countChars(form);
    const status = form.querySelector('[data-compose-status]');
    const stage = form.querySelector('[data-stage]'), stageImg = form.querySelector('[data-stage-img]');
    const strip = form.querySelector('[data-selection]'), count = form.querySelector('[data-count]'), zoom = form.querySelector('[data-zoom]');
    const preview = form.querySelector('[data-preview]'), tagValue = form.querySelector('[data-tag-value]');
    const photos = [], tags = [];
    let step = 'pick', ratioKey = 'orig', current = 0, submitting = false, attached = true, draftTimer;
    const floorValue = () => form.elements.floor.value;
    const saveDraft = () => writeDraft(caption.value, floorValue());
    release = () => {
      attached = false;
      clearTimeout(draftTimer);
      if (!release.posted) saveDraft();
      for (const photo of photos) URL.revokeObjectURL(photo.url);
    };
    caption.addEventListener('input', () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 400); });
    form.addEventListener('change', event => { if (event.target.name === 'floor') saveDraft(); });

    const ratio = () => ratioKey === '1:1' ? 1 : ratioKey === '4:5' ? 0.8 : clamp(photos[0].w / photos[0].h, MIN_RATIO, MAX_RATIO);
    function message(key, vars) {
      status.hidden = !key;
      status.textContent = key ? L.t((key in { sending: 1, photo: 1, upload: 1, busy: 1, photoLimit: 1, ended: 1 } ? 'compose.' : 'compose4.') + key, vars) : '';
    }
    function show(next) {
      if (next !== step && !submitting) message('');
      step = next;
      form.querySelectorAll('[data-step]').forEach(section => { section.hidden = section.dataset.step !== step; });
      nextButton.hidden = step !== 'edit';
      send.hidden = step !== 'write';
      if (step === 'write') paintPreview();
      window.scrollTo(0, 0);
    }
    function paintStage() {
      const photo = photos[current];
      if (!photo) return;
      const value = ratio();
      stage.style.setProperty('--r', value);
      if (stageImg.getAttribute('src') !== photo.url) stageImg.src = photo.url;
      place(stageImg, photo, value);
      zoom.value = photo.z;
      form.querySelector('[data-index]').textContent = photos.length > 1 ? L.t('compose4.of', { n: current + 1, total: photos.length }) : '';
    }
    function paintEdit() {
      current = clamp(current, 0, Math.max(0, photos.length - 1));
      strip.innerHTML = photos.map((photo, i) => '<button type="button" class="cx-thumb" data-select="' + i + '" aria-pressed="' + (i === current) +
        '" aria-label="' + t('select', { n: i + 1 }) + '"><img src="' + L.esc(photo.url) + '" alt="" draggable="false"><b aria-hidden="true">' + (i + 1) + '</b></button>').join('') +
        (photos.length < MAX ? '<button type="button" class="cx-thumb cx-thumb-add" data-pick aria-label="' + o('add') + '">' + icon('plus', { size: 22 }) + '</button>' : '');
      count.textContent = L.t('compose.count', { n: photos.length });
      form.querySelectorAll('[data-ratio]').forEach(button => button.setAttribute('aria-pressed', button.dataset.ratio === ratioKey));
      const remove = form.querySelector('.cx-order [data-remove]');
      remove.dataset.remove = current;
      remove.setAttribute('aria-label', L.t('compose.remove', { n: current + 1 }));
      form.querySelector('[data-move="-1"]').disabled = current === 0;
      form.querySelector('[data-move="1"]').disabled = current >= photos.length - 1;
      form.querySelector('[data-same]').hidden = photos.length < 2;
      paintStage();
    }
    function paintPreview() {
      const value = ratio();
      const track = carousel(preview, photos.map(photo => '<img src="' + L.esc(photo.url) + '" alt="" draggable="false">'), value);
      track.querySelectorAll('img').forEach((img, i) => place(img, photos[i], value));
    }
    function paintTags() {
      if (!tagValue) return;
      tagValue.textContent = !tags.length ? '' : tags.length <= 2 ? tags.map(person => '@' + person.nick).join(' ') : L.t('compose4.tagN', { n: tags.length });
    }

    files.onchange = async () => {
      const batch = Array.from(files.files);
      files.value = '';
      if (!batch.length || submitting) return;
      if (photos.length + batch.length > MAX) return message('photo');
      let skipped = false;
      const first = photos.length;
      for (const file of batch) {
        const url = URL.createObjectURL(file), img = new Image();
        img.src = url;
        try { await img.decode(); } catch { URL.revokeObjectURL(url); skipped = true; continue; }
        if (!attached) return URL.revokeObjectURL(url);
        if (!img.naturalWidth || !img.naturalHeight) { URL.revokeObjectURL(url); skipped = true; continue; }
        photos.push({ file, url, img, w: img.naturalWidth, h: img.naturalHeight, z: 1, cx: img.naturalWidth / 2, cy: img.naturalHeight / 2 });
      }
      if (photos.length) {
        current = Math.min(first, photos.length - 1);
        paintEdit();
        if (step !== 'edit') show('edit');
      }
      message(skipped ? 'bad' : '');
    };
    form.addEventListener('click', event => {
      if (submitting) return;
      const hit = name => event.target.closest('[' + name + ']');
      if (hit('data-pick')) return files.click();
      const picked = hit('data-select'), move = hit('data-move'), drop = hit('data-remove'), shape = hit('data-ratio');
      if (picked) current = Number(picked.dataset.select);
      else if (move) {
        const to = current + Number(move.dataset.move);
        if (to < 0 || to >= photos.length) return;
        photos.splice(to, 0, photos.splice(current, 1)[0]);
        current = to;
      } else if (drop) {
        const [photo] = photos.splice(Number(drop.dataset.remove), 1);
        if (photo) URL.revokeObjectURL(photo.url);
        message('');
        if (!photos.length) return show('pick');
      } else if (shape) ratioKey = shape.dataset.ratio;
      else if (hit('data-tag-open')) return void tagSheet(tags, paintTags);
      else return;
      paintEdit();
      if (picked || move) strip.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });

    // 자르기 틀: 한 손가락으로 끌기 · 두 손가락으로 확대 · 휠 · 방향키
    const points = new Map();
    let pinch;
    const spread = () => { const [a, b] = [...points.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    function pan(dx, dy) {
      const photo = photos[current], r = region(photo, ratio());
      photo.cx -= dx / (stage.clientWidth || 1) * r.sw;
      photo.cy -= dy / (stage.clientHeight || 1) * r.sh;
    }
    function setZoom(value) { photos[current].z = clamp(value, 1, MAX_ZOOM); paintStage(); }
    stage.addEventListener('pointerdown', event => {
      if (submitting || !photos[current]) return;
      stage.setPointerCapture?.(event.pointerId);
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (points.size === 2) pinch = { d: spread(), z: photos[current].z };
      stage.classList.add('is-moving');
    });
    stage.addEventListener('pointermove', event => {
      const point = points.get(event.pointerId);
      if (!point) return;
      const dx = event.clientX - point.x, dy = event.clientY - point.y;
      point.x = event.clientX; point.y = event.clientY;
      if (points.size >= 2 && pinch) { photos[current].z = clamp(pinch.z * spread() / pinch.d, 1, MAX_ZOOM); pan(dx / 2, dy / 2); }
      else pan(dx, dy);
      paintStage();
    });
    const lift = event => {
      points.delete(event.pointerId);
      if (points.size < 2) pinch = null;
      if (!points.size) stage.classList.remove('is-moving');
    };
    stage.addEventListener('pointerup', lift);
    stage.addEventListener('pointercancel', lift);
    stage.addEventListener('wheel', event => {
      if (!photos[current]) return;
      event.preventDefault();
      setZoom(photos[current].z * Math.exp(-event.deltaY / 400));
    }, { passive: false });
    stage.addEventListener('keydown', event => {
      const step = stage.clientWidth * 0.05;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (moves[event.key]) pan(...moves[event.key]);
      else if (event.key === '+' || event.key === '=') photos[current].z = clamp(photos[current].z + 0.1, 1, MAX_ZOOM);
      else if (event.key === '-') photos[current].z = clamp(photos[current].z - 0.1, 1, MAX_ZOOM);
      else return;
      event.preventDefault();
      paintStage();
    });
    zoom.addEventListener('input', () => setZoom(Number(zoom.value)));

    backButton.onclick = async () => {
      if (submitting) return;
      if (step === 'write') return show('edit');
      if (step === 'edit') {
        if (!await L.confirm(L.t('compose4.discard'), { ok: L.t('compose4.discardOk'), danger: true, body: caption.value.trim() ? L.t('compose4.discardBody') : '' })) return;
        if (!attached) return;
        for (const photo of photos.splice(0)) URL.revokeObjectURL(photo.url);
        message('');
        return show('pick');
      }
      L.back('feed');
    };
    nextButton.onclick = () => { if (!submitting && photos.length) show('write'); };

    form.onsubmit = async event => {
      event.preventDefault();
      if (submitting) return;
      if (!photos.length) return message('photo');
      if (step !== 'write') return show('write');
      const names = tags.map(person => person.nick);
      const data = { text: caption.value.trim(), floor: floorValue(), ...(select?.value && { challenge: select.value }) };
      submitting = true;
      view.classList.add('is-busy');
      for (const field of form.elements) field.disabled = true;
      send.disabled = true;
      try {
        const value = ratio(), sizes = [];
        for (const [i, photo] of photos.entries()) {
          message('uploading', { n: i + 1, total: photos.length });
          const out = await output(photo, value);
          if (!photo.key || photo.sig !== out.sig) {
            photo.key = await L.upload(out.blob, 'post');
            photo.sig = out.sig;
          }
          if (!attached) return;
          sizes.push(out.size);
        }
        message('posting');
        const post = { ...data, photos: photos.map(photo => photo.key), sizes };
        // 새 서버는 tags 를 글과 함께 받고(승인 대기 + 알림), 예전 서버는 모르는 칸을 무시한다 → 아래에서 post_tag 로 다시 붙인다(이미 있으면 서버가 무시).
        let result = await L.api('post', names.length ? { ...post, tags: names } : post);
        if (names.length && ['not_found', 'tag', 'tags', 'tag_limit', 'forbidden'].includes(result.error)) result = await L.api('post', post);
        if (!attached) return;
        if (result.error === 'busy') return message('busy');
        if (result.error === 'challenge') return message('ended');
        if (result.error === 'closed') {
          send.hidden = true;
          body.innerHTML = state(U.t('soon'));
          return;
        }
        if (result.error === 'photo') {
          for (const photo of photos) delete photo.key;
        }
        if (!result.id) {
          U.error(result);
          message('');
          return;
        }
        if (names.length && !Array.isArray(result.tagged)) {
          for (const nick of names) await L.api('post_tag', { post: result.id, nick });
        }
        release.posted = true;
        writeDraft('', '');
        L.toast(result.gained > 0 ? L.t('compose4.doneEarned', { n: result.gained }) : L.t('compose4.done'));
        // '#/feed' 로 바로 가면 공통 틀이 '뒤로 가기'로 보고 예전 목록·스크롤을 되살린다 → 새 주소로 가서 맨 위 새 글부터 보이게.
        L.go('feed?posted=' + encodeURIComponent(result.id));
      } catch (error) {
        if (!attached) return;
        if (error.message === 'busy') message('photoLimit');
        else if (error.message === 'auth') {
          L.needLogin();
          message('');
        } else message('upload');
      } finally {
        if (attached && form.isConnected) {
          for (const field of form.elements) field.disabled = false;
          send.disabled = false;
          view.classList.remove('is-busy');
          if (photos.length) paintEdit();
        }
        submitting = false;
      }
    };

    show('pick');
    // ＋ 를 눌러 들어왔으면(방금 누른 손길이 살아 있으면) 사진 고르기를 바로 연다 — 인스타그램처럼.
    if (navigator.userActivation?.isActive) { try { files.click(); } catch { /* 브라우저가 막으면 버튼으로 */ } }
  }

  // ── 고치기: 글·층만 (사진은 보여 주기만) ──
  async function renderEdit(root, id) {
    const view = shell(root, 'compose4.editTitle', '<button class="cx-action" type="submit" form="post-compose" data-save hidden>' + t('save') + '</button>');
    const body = view.querySelector('[data-content]'), save = view.querySelector('[data-save]');
    view.querySelector('[data-cx-back]').onclick = () => L.back('feed');
    body.innerHTML = skeleton();
    if (!L.me) {
      body.innerHTML = U.button(L.esc(L.t('core.login')), 'data-compose-login', true);
      body.querySelector('button').onclick = L.needLogin;
      L.needLogin();
      return;
    }
    const data = await L.api('post_get', { id });
    if (!view.isConnected) return;
    const post = data.post;
    if (!post || post.kind !== 'member' || !(post.canEdit ?? post.mine)) {
      body.innerHTML = state(post || data.error === 'missing' || data.error === 'not_found' ? t('editGone') : U.t('error'));
      return;
    }
    const urls = (post.photos || []).map(value => U.image(value?.src || value?.url || value?.key || value)).filter(Boolean);
    const size = Array.isArray(post.sizes) && Array.isArray(post.sizes[0]) ? post.sizes[0] : null;
    const ratio = size && size[0] > 0 && size[1] > 0 ? clamp(size[0] / size[1], MIN_RATIO, MAX_RATIO) : 1;
    body.innerHTML = '<form id="post-compose" class="cx-form" novalidate><p class="cx-status" data-compose-status role="status" hidden></p>' +
      '<section class="cx-step" data-step="write">' + (urls.length ? '<div class="cx-preview" data-preview></div>' : '') +
      '<p class="cx-fine">' + t('editNote') + '</p>' + captionField() + floorField(FLOORS.some(([key]) => key === post.floor) ? post.floor : '') +
      '<p class="cx-fine">' + t('masked') + '</p></section></form>';
    const form = body.querySelector('form'), status = form.querySelector('[data-compose-status]');
    if (urls.length) carousel(form.querySelector('[data-preview]'), urls.map(src =>
      '<img class="cx-fit" src="' + L.esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'), ratio);
    form.elements.caption.value = post.text || '';
    countChars(form);
    save.hidden = false;
    let busy = false;
    form.onsubmit = async event => {
      event.preventDefault();
      if (busy) return;
      busy = true; save.disabled = true; status.hidden = true;
      const text = form.elements.caption.value.trim(), floor = form.elements.floor.value;
      const result = await L.api('post_edit', { id: post.id, text, floor });
      if (!view.isConnected) return;
      busy = false; save.disabled = false;
      if (result.error === 'action' || result.error === 'closed') {      // 서버가 아직 글 고치기를 모름
        status.hidden = false;
        status.textContent = L.t('compose4.editSoon');
        return L.toast(L.t('compose4.editSoon'));
      }
      if (result.error || !result.ok) {
        if (['text', 'floor', 'forbidden', 'missing', 'not_found'].includes(result.error)) {
          status.hidden = false;
          status.textContent = L.t(result.error === 'text' ? 'screens.failed' : 'compose4.editGone');
        }
        return U.error(result);
      }
      // 피드·프로필 화면이 맡아 둔 목록을 고칠 수 있게 알린다 (듣는 쪽이 없어도 됨).
      window.dispatchEvent(new CustomEvent('lounge:post-edit', { detail: { id: post.id, text: result.post?.text ?? text, floor: result.post?.floor ?? floor, post: result.post || null } }));
      L.toast(L.t('compose4.edited'));
      L.back('feed/' + encodeURIComponent(post.id));
    };
  }

  // ── 내가 태그된 사진 승인 (#/tags) ──
  async function renderTags(root) {
    const view = shell(root, 'compose4.tagsTitle');
    const body = view.querySelector('[data-content]');
    view.querySelector('[data-cx-back]').onclick = () => L.back('me');
    body.innerHTML = skeleton();
    const data = await L.api('tag_pending');
    if (!view.isConnected) return;
    if (!Array.isArray(data.tags)) {
      body.innerHTML = state(U.t(data.error === 'closed' || data.error === 'action' ? 'soon' : 'error'));
      return;
    }
    const tags = data.tags;
    function paint() {
      body.innerHTML = '<p class="cx-fine">' + t('tagsNote') + '</p>' + (tags.length ? '<ul class="cx-tags">' + tags.map((tag, i) => {
        const src = L.photoSrc(tag.thumb), href = '#/feed/' + encodeURIComponent(tag.post);
        return '<li class="cx-tagrow" data-tag-post="' + L.esc(tag.post) + '"><a class="cx-tagthumb" href="' + L.esc(href) + '" aria-label="' + t('view') + '">' +
          (src ? '<img src="' + L.esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : icon('image', { size: 26 })) + '</a>' +
          '<p class="cx-tagtext">' + t('tagsBy', { nick: '\u0001' }).replace('\u0001', '<a href="#/u/' + encodeURIComponent(tag.by) + '">' + L.esc(tag.by) + '</a>') + '</p>' +
          '<div class="cx-tagbtns"><button type="button" class="btn btn-hot" data-approve="' + i + '">' + t('approve') + '</button>' +
          '<button type="button" class="btn" data-decline="' + i + '">' + t('decline') + '</button></div></li>';
      }).join('') + '</ul>' : '<div class="cx-empty">' + icon('tagged', { size: 44 }) + '<p>' + t('tagsEmpty') + '</p></div>');
    }
    paint();
    body.addEventListener('click', async event => {
      const button = event.target.closest('[data-approve], [data-decline]');
      if (!button || button.disabled) return;
      const approve = button.dataset.approve !== undefined, tag = tags[Number(approve ? button.dataset.approve : button.dataset.decline)];
      button.closest('.cx-tagrow').querySelectorAll('button').forEach(item => { item.disabled = true; });
      const result = await L.api(approve ? 'tag_approve' : 'tag_remove', { post: tag.post });
      if (!view.isConnected) return;
      if (result.error && result.error !== 'not_found') {
        button.closest('.cx-tagrow')?.querySelectorAll('button').forEach(item => { item.disabled = false; });
        return U.error(result);
      }
      tags.splice(tags.indexOf(tag), 1);
      paint();
      L.toast(L.t(approve && !result.error ? 'compose4.approved' : 'compose4.removed'));
    });
  }

  L.screen('compose', {
    nav: 'feed', auth: false, selfGate: true, bar: 'own', title: 'compose4.title', render,
    leave() { release?.(); release = undefined; }
  });
  L.screen('tags', { nav: 'me', auth: true, bar: 'own', title: 'compose4.tagsTitle', render: renderTags });
})();
