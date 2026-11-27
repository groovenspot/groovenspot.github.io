(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('play', {
    points: ['내 포인트', 'My points'], attend: ['오늘 출석하기', 'Claim daily attendance'],
    done: ['오늘 출석했어요', 'Attendance claimed today'], earned: ['{n}P 받았어요', 'You earned {n}P'],
    radio: ['그루브 라디오', 'Groove Radio'], radioText: ['운동·작업·드라이브·새벽', 'Workout, work, drive and late night'],
    vote: ['투표', 'Vote'], voteText: ['그루브의 다음 테마를 골라요', 'Choose Groove’s next theme'],
    cup: ['DJ 월드컵', 'DJ World Cup'], cupText: ['DJ 영상 16개 중 내 최애를 골라요', 'Pick your favorite of 16 DJ clips'],
    djs: ['DJ 목록', 'DJs'], rewards: ['보상', 'Rewards'], rank: ['주간 순위', 'Weekly rankings'],
    shop: ['굿즈', 'Merch'], challenge: ['포토 챌린지', 'Photo challenge'], songs: ['어제 나온 곡', 'Last night’s tracks'],
    // 놀거리 개편 1차 (play1)
    pill: ['내 포인트 {n}P · 보상·굿즈·DJ 보기', 'My points: {n}P. Open rewards, merch and DJs'],
    pillGuest: ['보상·굿즈·DJ 보기', 'Open rewards, merch and DJs'], more: ['보상·굿즈', 'Rewards'],
    menu: ['포인트 쓰는 곳', 'Points and more'],
    today: ['오늘 판', 'Today’s board'], todayAuto: ['오늘 판 · 출석 자동 완료', 'Today’s board · Auto check-in done'],
    progress: ['{n} / {total} 완료', '{n} of {total} done'], streak: ['연속 출석', 'Streak'], days: ['{n}일', '{n} days'],
    stateDone: ['완료', 'done'], stateLeft: ['아직', 'to do'],
    allNote: ['5개 다 하면 올클 +{n}P', 'Finish all 5 for an all-clear bonus of +{n}P'],
    allDone: ['오늘 판 올클! +{n}P 받았어요', 'All clear today! You earned +{n}P'], stamp: ['올클', 'ALL CLEAR'],
    guest: ['로그인하면 들어올 때마다 출석이 자동으로 돼요. 하루 5개를 다 하면 올클 보너스!', 'Log in and attendance is claimed automatically. Finish all 5 for a daily bonus.'],
    toastAttend: ['출석 +{n}P', 'Attendance +{n}P'], toastAll: ['올클 +{n}P', 'All clear +{n}P'],
    iAttend: ['출석', 'Attend'], iGuess: ['맞히기', 'Guess'], iCup: ['월드컵', 'Cup'], iVote: ['투표', 'Vote'], iRadio: ['라디오', 'Radio'],
    nowWeekday: ['지금 · 새 DJ 셋', 'Now · New DJ set'], nowNext: ['지금 · 어젯밤 돌아보기', 'Now · Last night'],
    nowWeekend: ['지금 · 오늘 밤', 'Now · Tonight'], nowLive: ['LIVE · 영업 중', 'LIVE · Open now'],
    listen: ['이어 듣기', 'Keep listening'], listeners: ['{n}명 같이 듣는 중', '{n} listening now'],
    radioFallback: ['그루브 라디오 틀어 놓기', 'Put Groove Radio on'], setBy: ['{dj}의 셋', 'Set by {dj}'],
    survey: ['어젯밤 그루브, 몇 점이었어요?', 'How was Groove last night?'], surveyGo: ['어젯밤 평가하기', 'Rate last night'],
    album: ['어젯밤 사진', 'Last night’s photos'], seeAll: ['전체 보기', 'See all'],
    songsAll: ['곡 목록 {n}곡', 'All {n} tracks'], nextEmpty: ['어젯밤 사진과 곡이 곧 올라와요', 'Last night’s photos and tracks are coming soon'],
    lineup: ['오늘 밤 라인업', 'Tonight’s lineup'], lineupEmpty: ['라인업은 타임테이블에서 볼 수 있어요', 'See the timetable for tonight’s lineup'],
    timetable: ['타임테이블', 'Timetable'], going: ['오늘 갈래요', 'I’m going'], goingOn: ['갈래요 취소', 'Cancel going'],
    goingN: ['{n}명 갈래요', '{n} going'],
    live: ['지금 플레이 중', 'Playing now'], liveEmpty: ['지금 DJ는 오늘 밤 화면에서 볼 수 있어요', 'See Tonight for who is playing'],
    nextUp: ['다음 {dj} · {at}', 'Next {dj} · {at}'], tonight: ['오늘 밤 보기', 'Open Tonight'],
    f2: ['2F 힙합', '2F Hip-hop'], f3: ['3F EDM', '3F EDM'],
    shelf: ['놀이', 'Games'], sGuess: ['DJ 맞히기', 'Guess the DJ'], sShorts: ['GROOVE 숏츠', 'GROOVE Shorts'],
    subGuess: ['힌트 보고 DJ 맞히기', 'Use clues to name the DJ'], subCup: ['최애 DJ 셋 고르기', 'Pick your favorite set'],
    subShorts: ['짧은 영상 넘겨 보기', 'Swipe through short clips'], subVote: ['오늘의 투표', 'Today’s vote'],
    subChallenge: ['이번 주 사진 주제', 'This week’s photo theme'],
    doneToday: ['오늘 완료', 'Done today'], plus: ['+{n}P', '+{n}P'],
    battle: ['이번 주 층 대항전', 'This week’s floor battle'], myTeam: ['내 팀 {f}', 'My team {f}'],
    team2: ['2F 힙합 팀', 'Team 2F Hip-hop'], team3: ['3F EDM 팀', 'Team 3F EDM'],
    pickTeam: ['팀을 고르면 놀거리 1개마다 우리 층에 1점', 'Pick a team. Each game you play scores 1 point for your floor.'],
    battleRule: ['놀거리 1개 = 우리 층 1점 · 월요일 결산', 'Each game = 1 point for your floor · Results on Monday'],
    battleBar: ['2F {a}점, 3F {b}점', '2F {a} points, 3F {b} points'], lastWin: ['지난주 {f} 승리', 'Last week: {f} won'],
    lastTie: ['지난주 무승부', 'Last week: tie'], won: ['내가 보탠 팀이 이겼어요', 'Your team won'],
    contrib: ['이번 주 내가 보탠 {n}점', 'You added {n} this week'],
    meRow: ['나 {n}위 · {p}P', 'Me · #{n} · {p}P'], meNone: ['이번 주는 아직 순위가 없어요', 'No ranking for you yet this week'],
    me: ['나', 'Me'], ptsLabel: ['포인트', 'Points'], todayLabel: ['오늘 판', 'Today']
  });
  L.i18n({
    ja: {
      'play.pill': 'マイポイント {n}P・特典・グッズ・DJを見る', 'play.pillGuest': '特典・グッズ・DJを見る', 'play.more': '特典・グッズ',
      'play.menu': 'ポイントの使い道', 'play.today': '今日のボード', 'play.todayAuto': '今日のボード・出席は自動で完了',
      'play.progress': '{n} / {total} 完了', 'play.streak': '連続出席', 'play.days': '{n}日', 'play.stateDone': '完了', 'play.stateLeft': '未完了',
      'play.allNote': '5つすべてでコンプリート +{n}P', 'play.allDone': '今日のコンプリート！+{n}P獲得', 'play.stamp': 'コンプ',
      'play.guest': 'ログインすると来るたびに出席が自動で記録されます。5つすべてでボーナス！',
      'play.toastAttend': '出席 +{n}P', 'play.toastAll': 'コンプリート +{n}P',
      'play.iAttend': '出席', 'play.iGuess': 'DJ当て', 'play.iCup': 'DJ対決', 'play.iVote': '投票', 'play.iRadio': 'ラジオ',
      'play.nowWeekday': 'いま・新着DJセット', 'play.nowNext': 'いま・昨夜をふり返る', 'play.nowWeekend': 'いま・今夜', 'play.nowLive': 'LIVE・営業中',
      'play.listen': '続きを聴く', 'play.listeners': '{n}人が一緒に聴いています', 'play.radioFallback': 'Grooveラジオを流す', 'play.setBy': '{dj}のセット',
      'play.survey': '昨夜のGroove、何点でしたか？', 'play.surveyGo': '昨夜を評価する', 'play.album': '昨夜の写真', 'play.seeAll': 'すべて見る',
      'play.songsAll': '曲リスト {n}曲', 'play.nextEmpty': '昨夜の写真と曲はもうすぐ公開されます',
      'play.lineup': '今夜のラインナップ', 'play.lineupEmpty': 'ラインナップはタイムテーブルで確認できます', 'play.timetable': 'タイムテーブル',
      'play.going': '今夜行きます', 'play.goingOn': '行くのをやめる', 'play.goingN': '{n}人が行きます',
      'play.live': 'いまプレイ中', 'play.liveEmpty': 'いまのDJは「今夜」画面で確認できます', 'play.nextUp': '次 {dj}・{at}', 'play.tonight': '今夜を見る',
      'play.f2': '2階 ヒップホップ', 'play.f3': '3階 EDM',
      'play.shelf': 'あそぶ', 'play.sGuess': 'DJ当てクイズ', 'play.sShorts': 'GROOVEショート',
      'play.subGuess': 'ヒントでDJを当てよう', 'play.subCup': '推しDJセットを選ぼう', 'play.subShorts': '短い動画をスワイプ', 'play.subVote': '今日の投票',
      'play.subChallenge': '今週の写真テーマ', 'play.doneToday': '今日は完了', 'play.plus': '+{n}P',
      'play.battle': '今週のフロア対抗戦', 'play.myTeam': 'マイチーム {f}', 'play.team2': '2階 ヒップホップチーム', 'play.team3': '3階 EDMチーム',
      'play.pickTeam': 'チームを選ぶと、あそぶたびに自分のフロアに1点', 'play.battleRule': 'あそび1つ＝フロアに1点・月曜に集計',
      'play.battleBar': '2F {a}点、3F {b}点', 'play.lastWin': '先週は{f}の勝ち', 'play.lastTie': '先週は引き分け',
      'play.won': 'あなたのチームが勝ちました', 'play.contrib': '今週あなたが入れた{n}点',
      'play.meRow': 'わたし {n}位・{p}P', 'play.meNone': '今週はまだランキングがありません', 'play.me': 'わたし', 'play.ptsLabel': 'ポイント', 'play.todayLabel': '今日'
    },
    zh: {
      'play.pill': '我的积分 {n}P·查看奖励、周边和 DJ', 'play.pillGuest': '查看奖励、周边和 DJ', 'play.more': '奖励·周边',
      'play.menu': '积分用途', 'play.today': '今日任务', 'play.todayAuto': '今日任务·已自动签到',
      'play.progress': '已完成 {n} / {total}', 'play.streak': '连续签到', 'play.days': '{n}天', 'play.stateDone': '已完成', 'play.stateLeft': '未完成',
      'play.allNote': '5 项全部完成可得全勤 +{n}P', 'play.allDone': '今日全勤！获得 +{n}P', 'play.stamp': '全勤',
      'play.guest': '登录后每次进来都会自动签到。完成全部 5 项还有奖励！',
      'play.toastAttend': '签到 +{n}P', 'play.toastAll': '全勤 +{n}P',
      'play.iAttend': '签到', 'play.iGuess': '猜 DJ', 'play.iCup': '对决', 'play.iVote': '投票', 'play.iRadio': '电台',
      'play.nowWeekday': '现在·新 DJ 演出', 'play.nowNext': '现在·回顾昨晚', 'play.nowWeekend': '现在·今晚', 'play.nowLive': 'LIVE·营业中',
      'play.listen': '继续收听', 'play.listeners': '{n} 人正在一起听', 'play.radioFallback': '播放 Groove 电台', 'play.setBy': '{dj} 的演出',
      'play.survey': '昨晚的 Groove 几分？', 'play.surveyGo': '给昨晚打分', 'play.album': '昨晚的照片', 'play.seeAll': '查看全部',
      'play.songsAll': '歌单 {n} 首', 'play.nextEmpty': '昨晚的照片和歌曲马上上传',
      'play.lineup': '今晚阵容', 'play.lineupEmpty': '阵容请看时间表', 'play.timetable': '时间表',
      'play.going': '今晚要去', 'play.goingOn': '取消要去', 'play.goingN': '{n} 人要去',
      'play.live': '正在播放', 'play.liveEmpty': '现在的 DJ 请在“今晚”页面查看', 'play.nextUp': '下一位 {dj}·{at}', 'play.tonight': '查看今晚',
      'play.f2': '2楼 嘻哈', 'play.f3': '3楼 EDM',
      'play.shelf': '游戏', 'play.sGuess': '猜猜 DJ', 'play.sShorts': 'GROOVE 短视频',
      'play.subGuess': '看提示猜 DJ', 'play.subCup': '选出最爱的 DJ 演出', 'play.subShorts': '滑动看短视频', 'play.subVote': '今日投票',
      'play.subChallenge': '本周照片主题', 'play.doneToday': '今日已完成', 'play.plus': '+{n}P',
      'play.battle': '本周楼层对抗赛', 'play.myTeam': '我的队 {f}', 'play.team2': '2楼 嘻哈队', 'play.team3': '3楼 EDM 队',
      'play.pickTeam': '选择队伍后，每玩一项就为你的楼层加 1 分', 'play.battleRule': '每玩一项 = 楼层 1 分·周一结算',
      'play.battleBar': '2F {a} 分，3F {b} 分', 'play.lastWin': '上周 {f} 获胜', 'play.lastTie': '上周平局',
      'play.won': '你所在的队赢了', 'play.contrib': '本周你贡献了 {n} 分',
      'play.meRow': '我 第 {n} 名·{p}P', 'play.meNone': '本周还没有排名', 'play.me': '我', 'play.ptsLabel': '积分', 'play.todayLabel': '今日'
    }
  });
  const raw = (key, vars) => L.t('play.' + key, vars);
  const API = () => window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  const FLOORS = ['2F', '3F'];
  const svg = path => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  // 놀이 선반: [key, 주소, 이름 key, 설명 key, 아이콘, 색]
  const TILES = [
    ['guess', '#/guess', 'sGuess', 'subGuess', '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4V14M12 17.2h.01"/>', 'g'],
    ['cup', '#/cup', 'cup', 'subCup', '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>', 's'],
    ['shorts', '#/shorts', 'sShorts', 'subShorts', '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>', 'pink'],
    ['vote', '#/vote', 'vote', 'subVote', '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>', 'ok'],
    ['radio', '#/radio', 'radio', 'radioText', '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>', 'blue'],
    ['challenge', '#/challenge', 'challenge', 'subChallenge', '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 'amber']
  ];
  const ITEM = { attend: 'iAttend', guess: 'iGuess', cup: 'iCup', vote: 'iVote', radio: 'iRadio' };
  const ICON = Object.fromEntries(TILES.map(tile => [tile[0], tile[4]]));
  ICON.attend = '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>';
  // 인스타식 놀거리 (2026-11-21): 프로필 머리(아바타+숫자 3개) · 오늘 판 = 하이라이트 동그라미 · 지금 = 게시물 카드 · 놀이 = 3칸 격자
  const STYLE = `
.pl{--ring:linear-gradient(45deg,var(--g),var(--s));display:grid;gap:18px;max-width:640px;margin:auto;overflow-wrap:anywhere;min-width:0}
.pl>*{min-width:0}
.pl>.ui-pull{margin-bottom:-18px}
.pl-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pl-head h1{margin:0}
.pl-pill{display:inline-flex;align-items:center;gap:6px;min-height:44px;max-width:60%;padding:0 14px;border-radius:12px;border:0;background:var(--fill);color:var(--txt);font:inherit;font-size:.9375rem;font-weight:800;cursor:pointer}
.pl-pill span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-pill svg:first-child{color:var(--g)}
.pl-card{position:relative;display:grid;gap:12px;min-width:0}
.pl-card h2,.pl-now h2{margin:0}
.pl-card>h2,.pl-sec h2,.pl-row>h2{font-size:1rem}
.pl-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;min-width:0}
.pl-row>*{min-width:0}
.pl-k{display:block;font-size:.8125rem;color:var(--muted)}
.pl-big{display:block;font-size:1.25rem;font-weight:900;line-height:1.25}
.pl-gold{color:var(--g)}
/* 프로필 머리 */
.pl-prof{display:flex;align-items:center;gap:20px}
.pl-ava{position:relative;flex:none;width:84px;height:84px;border-radius:50%;padding:3px;background:var(--ring)}
.pl-ava[data-off]{background:var(--line-2)}
.pl-ava>.ui-avatar{width:100%;height:100%;border:3px solid var(--bg);box-sizing:border-box}
.pl-stats{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding:0;list-style:none;text-align:center;min-width:0}
.pl-stats b{display:block;font-size:1.25rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.2}
.pl-stats span{display:block;font-size:.8125rem;color:var(--txt)}
.pl-bio{display:grid;gap:2px;font-size:.875rem;line-height:1.45}
.pl-bio .pl-k{font-size:.875rem}
.pl-bar{height:4px;border-radius:999px;background:var(--fill);overflow:hidden}
.pl-bar>i{display:block;height:100%;border-radius:inherit;background:var(--ring);transition:width .4s ease}
/* 오늘 판 = 하이라이트 */
.pl-chips{display:flex;gap:12px;margin:0;padding:2px 0;list-style:none;overflow-x:auto;scrollbar-width:none}
.pl-chips::-webkit-scrollbar{display:none}
.pl-chip{position:relative;display:grid;justify-items:center;gap:5px;flex:1 0 64px;max-width:76px;text-align:center;font-size:.75rem;line-height:1.25;min-width:0}
.pl-chip>b{position:relative;display:grid;place-items:center;width:62px;height:62px;border-radius:50%;padding:2px;box-sizing:border-box;background:var(--line-2)}
.pl-chip>b>i{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;border:3px solid var(--bg);box-sizing:border-box;background:var(--fill);color:var(--muted);font-style:normal}
.pl-chip[data-done]>b{background:var(--ring)}
.pl-chip[data-done]>b>i{color:var(--txt)}
.pl-chip[data-done]>b::after{content:'✓';position:absolute;right:-2px;bottom:-2px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;border:2px solid var(--bg);background:var(--g);color:var(--g-ink);font-size:11px;font-weight:900}
.pl-chip>span{font-weight:600;color:var(--txt)}
.pl-chip small{color:var(--muted);font-weight:600}
.pl-note{margin:0;font-size:.8125rem;color:var(--muted)}
.pl-stamp{position:absolute;top:0;right:0;padding:3px 10px;border-radius:999px;background:var(--ring);color:#fff;font-size:.75rem;font-weight:900;letter-spacing:.04em}
/* 지금 = 게시물 카드 */
.pl-now{--tone:var(--s);display:grid;gap:12px;padding:0 0 16px;border-bottom:1px solid var(--line);min-width:0}
.pl-now[data-kind=nextday]{--tone:var(--g)}
.pl-now[data-kind=live]{--tone:var(--bad)}
.pl-eyebrow{display:flex;align-items:center;gap:10px;font-size:.8125rem;font-weight:700;color:var(--txt);min-height:36px}
.pl-now>.pl-eyebrow::before,.pl-now>.pl-row>.pl-eyebrow:first-child::before{content:'G';display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:50%;background:var(--bg);color:var(--txt);font-weight:900;font-size:.875rem;box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--tone)}
.pl-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none}
.pl-now[data-kind=live] .pl-dot{background:var(--bad)}
.pl-now .pl-big{font-size:1.375rem;letter-spacing:-.01em}
.pl-sub{margin:0;color:var(--muted);font-size:.875rem}
.pl-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pl-actions .btn,.pl-cta{width:100%;gap:8px;padding-inline:10px;text-align:center}
.pl-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;margin-inline:-16px}
.pl-photos img{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:var(--fill)}
.pl-list{display:grid;gap:8px;margin:0;padding:0;list-style:none;font-size:.875rem}
.pl-list li{display:flex;gap:10px;min-width:0}
.pl-list li>span:first-child{flex:none;color:var(--muted);font-variant-numeric:tabular-nums}
.pl-f[data-floor="2F"]{color:var(--g);font-weight:800}
.pl-f[data-floor="3F"]{color:var(--s);font-weight:800}
.pl-floors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pl-floor{display:grid;gap:2px;padding:12px;border-radius:12px;background:var(--fill);min-width:0}
.pl-floor strong{font-size:1.125rem}
.pl-sec{display:grid;gap:10px;padding-top:12px}
.pl-sec .pl-row{align-items:center}
/* 놀이 = 프로필 격자 */
.pl-shelf{gap:0}
.pl-tabs{display:flex;justify-content:center;border-top:1px solid var(--line)}
.pl-tabs h2{display:flex;align-items:center;gap:6px;margin:0;padding:12px 4px 10px;border-top:1.5px solid var(--txt);margin-top:-1px;font-size:.8125rem;font-weight:800;letter-spacing:.04em}
.pl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;margin-inline:-16px}
.pl-tile{--tone:var(--g);position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;aspect-ratio:1;min-height:44px;padding:10px;overflow:hidden;color:#fff;text-decoration:none;min-width:0;
  background:radial-gradient(120% 90% at 20% 0%,color-mix(in srgb,var(--tone) 85%,#fff 0%) 0%,transparent 70%),linear-gradient(160deg,color-mix(in srgb,var(--tone) 70%,#000),#0b0b0b)}
.pl-tile[data-tone=s]{--tone:var(--s)}
.pl-tile[data-tone=pink]{--tone:#ff4d8d}
.pl-tile[data-tone=ok]{--tone:#1fbf75}
.pl-tile[data-tone=blue]{--tone:#3f7dff}
.pl-tile[data-tone=amber]{--tone:#f2a516}
.pl-tile[aria-disabled]{filter:grayscale(.8);opacity:.6}
.pl-tile strong{display:block;font-size:.875rem;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,.45)}
.pl-tile small{display:block;font-size:.6875rem;line-height:1.3;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-ico{position:absolute;top:10px;left:10px;display:grid;place-items:center;color:#fff;opacity:.95}
.pl-ico svg{width:26px;height:26px}
.pl-badge{position:absolute;top:8px;right:8px;padding:2px 7px;border-radius:999px;font-size:.6875rem;font-weight:800;background:rgba(0,0,0,.45);color:#fff}
.pl-badge:empty{display:none}
.pl-badge[data-done]{background:#fff;color:#0f0f0f}
.pl-badge[data-soon]{background:rgba(0,0,0,.55)}
/* 층 대항전 · 주간 순위 */
.pl-split{display:grid;gap:12px;padding:16px;border-radius:var(--radius);background:var(--card);border:1px solid var(--line)}
.pl-score{display:flex;justify-content:space-between;gap:8px;font-weight:900;font-size:1.125rem;font-variant-numeric:tabular-nums}
.pl-score span:first-child{color:var(--g)}
.pl-score span:last-child{color:var(--s);text-align:right}
.pl-vs{display:flex;gap:3px;height:8px;border-radius:999px;overflow:hidden;background:var(--fill)}
.pl-vs i{display:block;height:100%}
.pl-vs i:first-child{background:var(--g)}
.pl-vs i:last-child{flex:1;background:var(--s)}
.pl-rank{display:grid;gap:2px;margin:0;padding:0;list-style:none}
.pl-rank li{display:flex;align-items:center;gap:12px;min-height:48px;min-width:0}
.pl-rank li>b{width:24px;flex:none;font-variant-numeric:tabular-nums;text-align:center}
.pl-rank li>span{flex:1;min-width:0}
.pl-rank li>em{font-style:normal;font-weight:800;color:var(--muted)}
.pl-rank .pl-me{padding:0 12px;border-radius:12px;background:var(--fill)}
.pl-rank .pl-me em{color:var(--g)}
.pl-menu{display:grid;gap:8px;margin-top:12px}
.pl-menu .btn{width:100%}
.pl-sk{display:block;height:1em;border-radius:8px;background:linear-gradient(90deg,var(--fill),var(--fill-2),var(--fill));background-size:200% 100%;animation:pl-sk 1.2s linear infinite}
@keyframes pl-sk{to{background-position:-200% 0}}
@media (prefers-reduced-motion: reduce){.pl-sk{animation:none}.pl-bar>i{transition:none}}
`;

  // 예전 놀거리(play1 꺼짐)도 인스타식: 프로필 머리(내 사진 + 포인트 + 출석) · 놀이 3칸 격자 (2026-11-21)
  const LEGACY = [
    ['radio', 'radio', 'radioText', TILES[4][4], 'blue'], ['vote', 'vote', 'voteText', TILES[3][4], 'ok'],
    ['cup', 'cup', 'cupText', TILES[1][4], 's'], ['guess', 'sGuess', 'subGuess', TILES[0][4], 'g', 'guess'],
    ['djs', 'djs', '', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>', 'pink'],
    ['rewards', 'rewards', '', '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8S10.5 3.5 8 4.5 9 8 12 8zm0 0s1.5-4.5 4-3.5S15 8 12 8z"/>', 'amber', 'rewards'],
    ['rank', 'rank', '', '<path d="M5 21V12M12 21V5M19 21v-6"/>', 's', 'rewards'],
    ['shop', 'shop', '', '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>', 'pink', 'shop'],
    ['challenge', 'challenge', 'subChallenge', TILES[5][4], 'amber', 'challenge'],
    ['songs', 'songs', '', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', 'blue', 'songs'],
    ['shorts', 'sShorts', 'subShorts', TILES[2][4], 'pink'],
    ['photos', 'album', '', '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>', 'ok']
  ];
  function legacyRender(root) {
    injectStyle();
    const view = document.createElement('section');
    view.className = 'pl';
    const me = L.me || {};
    const grid = LEGACY.map(([key, name, sub, icon, tone, gate]) => {
      const open = !gate || L.open(gate);
      const inner = '<span class="pl-ico">' + svg(icon) + '</span><strong>' + t(name) + '</strong>' +
        (sub ? '<small>' + t(sub) + '</small>' : '') + (open ? '' : '<span class="pl-badge" data-soon>' + L.esc(L.t('core.soon')) + '</span>');
      return open ? '<a class="pl-tile" data-tone="' + tone + '" data-pl-tile="' + key + '" href="#/' + key + '">' + inner + '</a>'
        : '<div class="pl-tile" data-tone="' + tone + '" data-pl-tile="' + key + '" aria-disabled="true">' + inner + '</div>';
    }).join('');
    view.innerHTML = '<div class="pl-head"><h1>' + L.esc(L.t('nav.play')) + '</h1></div>' +
      '<section class="pl-card"><div class="pl-prof"><span class="pl-ava"' + (L.me ? '' : ' data-off') + '>' + L.avatar({ nick: me.nick, photo: me.photo }, 78) +
      '</span><ul class="pl-stats" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)"><li><b data-points>' + (L.me ? L.esc(num(me.points).toLocaleString(L.lang)) : '—') +
      '</b><span>' + t('ptsLabel') + '</span></li><li style="display:grid;align-items:center;padding-left:8px">' + U.button(t('attend'), 'data-attend', true) +
      '</li></ul></div></section>' +
      '<section class="pl-card pl-shelf"><div class="pl-tabs"><h2>' + svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>') +
      t('shelf') + '</h2></div><div class="pl-grid">' + grid + '</div></section>';
    root.replaceChildren(view);

    const heading = view.querySelector('[data-points]');
    const button = view.querySelector('[data-attend]');
    function showPoints(points) {
      heading.textContent = num(points).toLocaleString(L.lang);
    }
    if (L.me) {
      L.api('points').then(data => {
        if (view.isConnected && !button.disabled) showPoints(data?.points ?? L.me?.points);
      });
    }
    button.onclick = async () => {
      if (L.needLogin() || button.disabled) return;
      button.disabled = true;
      const data = await L.api('attend');
      if (!view.isConnected) return;
      if (!data || (data.error && data.error !== 'dup')) {
        button.disabled = false;
        return U.error(data);
      }
      button.textContent = L.t('play.done');
      if (!data.error) {
        showPoints(data.points);
        L.toast(L.t('play.earned', { n: Number(data.gained) || 0 }));
      }
    };
  }

  // ── 놀거리 개편 1차 ──
  let dispose, refresher = null;
  const num =value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const pts = value => Number.isSafeInteger(value) && value > 0 ? value : 0;

  function injectStyle() {
    if (document.getElementById('pl-style')) return;
    const style = document.createElement('style');
    style.id = 'pl-style';
    style.textContent = STYLE;
    document.head.append(style);
  }

  // 화면을 보고 있던 시간을 재서 떠날 때·숨길 때 보냄 (sendBeacon, text/plain)
  function trackDwell() {
    let since = document.hidden ? null : performance.now(), total = 0;
    function flush() {
      if (since != null) total += performance.now() - since;
      since = null;
      const ms = Math.round(total);
      total = 0;
      let token = '';
      try { token = localStorage.getItem('gl_token') || ''; } catch { /* 저장소를 못 쓰면 보내지 않음 */ }
      if (!token || ms < 1000) return;
      const body = JSON.stringify({ a: 'play_time', token, ms });
      try {
        if (!navigator.sendBeacon?.(API(), body)) {
          fetch(API(), { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: true }).catch(() => {});
        }
      } catch { /* 체류시간은 놓쳐도 됨 */ }
    }
    function visibility() {
      if (document.hidden) flush();
      else if (since == null) since = performance.now();
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }

  function tileBadge(item, open) {
    if (!open) return '<span class="pl-badge" data-soon>' + L.esc(L.t('core.soon')) + '</span>';
    if (item?.done) return '<span class="pl-badge" data-done>' + t('doneToday') + '</span>';
    return '<span class="pl-badge">' + (pts(item?.pts) ? t('plus', { n: item.pts }) : '') + '</span>';
  }
  function tileOpen(key, item) {
    if (item && typeof item.open === 'boolean') return item.open;
    return key === 'guess' ? L.open('guess') : key === 'challenge' ? L.open('challenge') : true;
  }
  function tiles(shelf) {
    const byKey = new Map((Array.isArray(shelf) ? shelf : []).map(item => [item?.key, item]));
    return TILES.map(([key, href, name, sub, icon, tone]) => {
      const item = byKey.get(key), open = tileOpen(key, item);
      const inner = '<span class="pl-ico">' + svg(icon) + '</span><strong>' + t(name) +
        '</strong><small>' + t(sub) + '</small>' + tileBadge(item, open);
      return open ? '<a class="pl-tile" data-tone="' + tone + '" data-pl-tile="' + key + '" href="' + href + '">' + inner + '</a>'
        : '<div class="pl-tile" data-tone="' + tone + '" data-pl-tile="' + key + '" aria-disabled="true">' + inner + '</div>';
    }).join('');
  }

  function skeleton(lines) {
    return lines.map(width => '<span class="pl-sk" style="width:' + width + '%"></span>').join('');
  }

  function paintPill(pill, points) {
    const label = pill.querySelector('span');
    if (L.me && points != null) {
      label.textContent = num(points).toLocaleString(L.lang) + 'P';
      pill.setAttribute('aria-label', raw('pill', { n: num(points).toLocaleString(L.lang) }));
    } else {
      label.textContent = raw('more');
      pill.setAttribute('aria-label', raw('pillGuest'));
    }
  }

  // 포인트 알약 → 보상·굿즈·DJ 목록·주간 순위 (4차 공통 메뉴 시트, 없으면 링크 시트)
  function openMenu() {
    const entries = [['rewards', 'rewards', 'check'], ['shop', 'shop', 'bookmark'], ['djs', '', 'user'], ['rank', 'rewards', 'grid']];
    const label = (name, gate) => !gate || L.open(gate) ? raw(name) : raw(name) + ' · ' + L.t('core.soon');
    if (typeof L.menu === 'function') {
      return L.menu(entries.map(([name, gate, icon]) => ({ label: label(name, gate), icon,
        on: () => !gate || L.open(gate) ? L.go(name) : L.toast(L.t('core.soon')) })), { title: raw('menu') });
    }
    return L.sheet('<h2>' + t('menu') + '</h2><div class="pl-menu">' + entries.map(([name, gate]) =>
      !gate || L.open(gate) ? '<a class="btn" href="#/' + name + '">' + t(name) + '</a>'
        : '<span class="btn" aria-disabled="true" style="opacity:.6">' + L.esc(label(name, gate)) + '</span>'
    ).join('') + '</div>', { close: true });
  }

  // 프로필 머리: 내 사진(링) + 포인트 · 연속 출석 · 오늘 n/5
  function profHead(points, streak, progress, ring) {
    const me = L.me || {};
    return '<div class="pl-prof"><span class="pl-ava"' + (ring ? '' : ' data-off') + '>' + L.avatar({ nick: me.nick, photo: me.photo }, 78) + '</span>' +
      '<ul class="pl-stats"><li><b data-pl-stat-points>' + (points == null ? '—' : L.esc(num(points).toLocaleString(L.lang))) + '</b><span>' + t('ptsLabel') +
      '</span></li><li><b class="pl-gold" data-pl-streak>' + (streak == null ? '—' : t('days', { n: num(streak) })) + '</b><span>' + t('streak') +
      '</span></li><li><b data-pl-progress>' + (progress || '—') + '</b><span>' + t('todayLabel') + '</span></li></ul></div>';
  }

  function paintToday(box, today, points) {
    box.removeAttribute('aria-busy');
    if (!today) {
      box.innerHTML = profHead(null, null, '', false) + '<div class="pl-bio"><span class="pl-k">' + t('today') + '</span><span>' + t('guest') + '</span></div>' +
        U.button(L.esc(L.t('core.login')), 'data-pl-login', true);
      box.querySelector('[data-pl-login]').onclick = () => L.needLogin();
      return;
    }
    const items = Array.isArray(today.items) ? today.items : [];
    const total = num(today.total) || items.length || 5;
    const done = items.filter(item => item?.done).length;
    const percent = Math.round(Math.min(1, done / total) * 100);
    const bonus = pts(today.allclear?.pts);
    const cleared = Boolean(today.allclear?.done);
    box.innerHTML = profHead(points, today.streak, done + '/' + total, done > 0) +
      '<div class="pl-bio"><span class="pl-k">' + t('todayAuto') + '</span><span>' + t('progress', { n: done, total }) +
      (cleared ? '' : bonus ? ' · ' + t('allNote', { n: bonus }) : '') + '</span></div>' +
      (cleared ? '<span class="pl-stamp" data-pl-stamp>' + t('stamp') + (bonus ? ' +' + bonus + 'P' : '') + '</span>' : '') +
      '<div class="pl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done +
      '" aria-label="' + t('today') + '"><i style="width:' + percent + '%"></i></div><ul class="pl-chips">' +
      items.map(item => '<li class="pl-chip" data-pl-chip="' + L.esc(item?.key) + '"' + (item?.done ? ' data-done' : '') +
        '><b aria-hidden="true"><i>' + svg(ICON[item?.key] || '<circle cx="12" cy="12" r="3"/>') + '</i></b><span>' + (ITEM[item?.key] ? t(ITEM[item.key]) : L.esc(item?.key)) +
        '<span class="sr-only"> ' + t(item?.done ? 'stateDone' : 'stateLeft') + '</span></span><small>' +
        (pts(item?.pts) ? '+' + L.esc(item.pts) + 'P' : '') + '</small></li>').join('') + '</ul>';
    const toasts = [];
    if (today.attended) toasts.push(raw('toastAttend', { n: num(today.attended.gained) }));
    if (pts(today.allclear?.gained)) toasts.push(raw('toastAll', { n: today.allclear.gained }));
    if (toasts.length) L.toast(toasts.join(' · '));
  }

  const eyebrow = (key, dot) => '<span class="pl-eyebrow">' + (dot ? '<span class="pl-dot" aria-hidden="true"></span>' : '') + t(key) + '</span>';
  const floorName = floor => floor === '2F' ? t('f2') : t('f3');

  function paintNow(box, now, reload) {
    box.removeAttribute('aria-busy');
    const kind = ['weekday', 'nextday', 'weekend', 'live'].includes(now?.kind) ? now.kind : 'weekday';
    box.dataset.kind = kind;
    if (kind === 'weekday') {
      const set = now?.set;
      const many = num(now?.listeners) >= 3;
      box.innerHTML = '<div class="pl-row" style="align-items:center">' + eyebrow('nowWeekday') +
        (many ? '<span class="pl-eyebrow" data-pl-listeners><span class="pl-dot" aria-hidden="true"></span>' + t('listeners', { n: num(now.listeners) }) + '</span>' : '') +
        '</div><h2 class="pl-big">' + (set?.title ? L.esc(set.title) : t('radioFallback')) + '</h2>' +
        (set?.dj ? '<p class="pl-sub">' + t('setBy', { dj: set.dj }) + '</p>' : '') +
        '<a class="btn btn-hot pl-cta" data-pl-listen href="#/radio">' + svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>') + t('listen') + '</a>';
      return;
    }
    if (kind === 'nextday') {
      const album = now?.album, photos = (album?.photos || []).map(photo => U.url(photo?.thumb || photo?.src)).filter(Boolean).slice(0, 3);
      const songs = now?.songs;
      let html = eyebrow('nowNext');
      if (now?.survey) {
        html += '<h2 class="pl-big">' + t('survey') + '</h2><a class="btn btn-hot pl-cta" data-pl-survey href="#/vote">' + t('surveyGo') + '</a>';
      }
      if (album && photos.length) {
        html += '<div class="pl-sec"><div class="pl-row"><h2>' + t('album') + '</h2><a class="shell-link" href="#/photos/' +
          encodeURIComponent(album.id) + '">' + t('seeAll') + '</a></div><div class="pl-photos" data-pl-photos>' +
          photos.map(src => '<img alt="" loading="lazy" decoding="async" src="' + L.esc(src) + '">').join('') + '</div></div>';
      }
      if (songs && num(songs.count) > 0) {
        html += '<div class="pl-sec"><div class="pl-row"><h2>' + t('songs') + '</h2><a class="shell-link" href="#/songs">' +
          t('songsAll', { n: num(songs.count) }) + '</a></div><ul class="pl-list" data-pl-songs>' +
          (songs.top || []).map(song => '<li><span>' + L.esc(song?.at || '') + '</span><span><strong>' + L.esc(song?.title) +
            '</strong>' + (song?.artist ? ' · ' + L.esc(song.artist) : '') + '</span></li>').join('') + '</ul></div>';
      }
      if (!now?.survey && !(album && photos.length) && !(songs && num(songs.count) > 0)) {
        html += '<h2 class="pl-big">' + t('nextEmpty') + '</h2><a class="btn pl-cta" href="#/photos">' + t('album') + '</a>';
      }
      box.innerHTML = html;
      return;
    }
    if (kind === 'weekend') {
      const lineup = Array.isArray(now?.lineup) ? now.lineup.slice(0, 8) : [];
      let going = { n: num(now?.going?.n), me: Boolean(now?.going?.me) };
      box.innerHTML = eyebrow('nowWeekend') + '<h2 class="pl-big">' + t('lineup') + '</h2>' +
        (lineup.length ? '<ul class="pl-list" data-pl-lineup>' + lineup.map(slot => '<li><span>' + L.esc(slot?.at) +
          '</span><span><span class="pl-f" data-floor="' + L.esc(slot?.floor) + '">' + L.esc(slot?.floor) + '</span> ' + L.esc(slot?.dj) + '</span></li>').join('') + '</ul>'
          : '<p class="pl-sub">' + t('lineupEmpty') + '</p>') +
        '<div class="pl-actions"><a class="btn" href="#/tonight">' + t('timetable') + '</a>' +
        U.button('', 'data-pl-going', true) + '</div><p class="pl-sub" data-pl-going-n></p>';
      const button = box.querySelector('[data-pl-going]'), count = box.querySelector('[data-pl-going-n]');
      const paint = () => {
        button.textContent = raw(going.me ? 'goingOn' : 'going');
        button.setAttribute('aria-pressed', String(going.me));
        button.classList.toggle('btn-hot', !going.me);
        count.textContent = going.n > 0 ? raw('goingN', { n: going.n }) : '';
      };
      paint();
      button.onclick = async () => {
        if (L.needLogin() || button.disabled) return;
        button.disabled = true;
        const result = await L.api(going.me ? 'going_off' : 'going');
        if (!box.isConnected) return;
        button.disabled = false;
        if (!result || result.error) return U.error(result);
        going = { n: num(result.n), me: Boolean(result.me) };
        paint();
      };
      return;
    }
    const playing = now?.playing;
    box.innerHTML = eyebrow('nowLive', true) + '<h2 class="pl-big">' + t('live') + '</h2>' +
      (playing ? '<div class="pl-floors" data-pl-playing>' + FLOORS.map(floor => {
        const info = playing[floor] || {};
        return '<div class="pl-floor"><span class="pl-f" data-floor="' + floor + '">' + floorName(floor) + '</span><strong>' +
          (info.now ? L.esc(info.now) : '—') + '</strong>' + (info.next ? '<small class="pl-sub">' +
          t('nextUp', { dj: info.next, at: info.nextAt || '' }) + '</small>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="pl-sub">' + t('liveEmpty') + '</p>') +
      '<a class="btn btn-hot pl-cta" href="#/tonight">' + t('tonight') + '</a>';
  }

  // 층 대항전 (battle.js battleView): { week, score: {'2F','3F'}, mine: '2F'|'3F'|'', last: { week, winner: '2F'|'3F'|'tie', score } | null, won, contrib: { today, week } }
  function battleInfo(battle) {
    const floorOf = value => FLOORS.includes(value) ? value : '';
    const score = floor => num(battle?.score?.[floor] ?? battle?.scores?.[floor] ?? battle?.floors?.[floor]?.score ?? battle?.floors?.[floor] ?? battle?.[floor]?.score ?? battle?.[floor]);
    const mine = floorOf(battle?.mine) || floorOf(battle?.team) || floorOf(battle?.myFloor) || floorOf(battle?.floor) ||
      (battle?.mine === undefined && battle?.team === undefined && battle?.myFloor === undefined ? floorOf(L.me?.floor) : '');
    const last = battle?.last ?? battle?.lastWeek ?? null;
    const winner = last && typeof last === 'object' ? last.winner : battle?.lastWinner;
    return { a: score('2F'), b: score('3F'), mine, winner: floorOf(winner) || (winner === 'tie' || winner === '' && last ? 'tie' : ''),
      won: battle?.won === true, contrib: num(battle?.contrib?.week) };
  }

  function paintBattle(box, battle, reload) {
    if (!battle || typeof battle !== 'object') { box.hidden = true; return; }
    const { a, b, mine, winner, won, contrib } = battleInfo(battle);
    const share = a + b > 0 ? Math.round(a / (a + b) * 100) : 50;
    box.hidden = false;
    box.innerHTML = '<div class="pl-row" style="align-items:center"><h2>' + t('battle') + '</h2>' +
      (mine ? '<span class="pl-k" data-pl-team>' + t('myTeam', { f: mine }) + '</span>' : '') + '</div>' +
      '<div class="pl-score"><span>2F ' + L.esc(a.toLocaleString(L.lang)) + '</span><span>' + L.esc(b.toLocaleString(L.lang)) + ' 3F</span></div>' +
      '<div class="pl-vs" role="img" aria-label="' + t('battleBar', { a, b }) + '"><i style="width:' + share + '%"></i><i></i></div>' +
      (winner ? '<p class="pl-note">' + (winner === 'tie' ? t('lastTie') : t('lastWin', { f: floorName(winner) })) + (won ? ' · ' + t('won') : '') + '</p>' : '') +
      (mine ? '<p class="pl-note">' + (contrib ? t('contrib', { n: contrib }) + ' · ' : '') + t('battleRule') + '</p>' : '<p class="pl-note">' + t('pickTeam') + '</p><div class="pl-actions">' +
        U.button(t('team2'), 'data-pl-team-pick="2F"') + U.button(t('team3'), 'data-pl-team-pick="3F"') + '</div>');
    box.querySelectorAll('[data-pl-team-pick]').forEach(button => {
      button.onclick = async () => {
        if (L.needLogin() || button.disabled) return;
        box.querySelectorAll('[data-pl-team-pick]').forEach(other => { other.disabled = true; });
        const result = await L.api('profile_set', { floor: button.dataset.plTeamPick });
        if (!box.isConnected) return;
        if (!result || result.error) {
          box.querySelectorAll('[data-pl-team-pick]').forEach(other => { other.disabled = false; });
          return U.error(result);
        }
        if (result.me) L.me = result.me;
        reload();
      };
    });
  }

  function paintRank(box, rank) {
    if (!rank || !Array.isArray(rank.top)) { box.hidden = true; return; }
    box.hidden = false;
    const colors = ['var(--g)', 'var(--s)', 'var(--muted)'];
    box.innerHTML = '<div class="pl-row" style="align-items:center"><h2>' + t('rank') + '</h2><a class="shell-link" href="#/rank">' +
      t('seeAll') + '</a></div><ol class="pl-rank" data-pl-rank>' + rank.top.slice(0, 3).map((row, i) =>
        '<li><b style="color:' + colors[i] + '">' + num(row?.place || i + 1) + '</b><span>' + L.whoTag(row) + '</span><em>' +
        L.esc(num(row?.points).toLocaleString(L.lang)) + 'P</em></li>').join('') +
      (L.me ? rank.me ? '<li class="pl-me" data-pl-rank-me><b>' + num(rank.me.place) + '</b><span>' + t('me') + '</span><em>' +
        L.esc(num(rank.me.points).toLocaleString(L.lang)) + 'P</em></li>' : '<li class="pl-me pl-note" data-pl-rank-me>' + t('meNone') + '</li>' : '') + '</ol>';
  }

  function modern(root) {
    injectStyle();
    const view = document.createElement('section');
    view.className = 'pl';
    view.dataset.pl = '';
    view.innerHTML = '<div class="pl-head"><h1>' + L.esc(L.t('nav.play')) + '</h1><button type="button" class="pl-pill" data-pl-points>' +
      svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h3.2a2.2 2.2 0 0 1 0 4.4H9.5V8M9.5 12.9V16"/>') + '<span></span>' +
      svg('<path d="M9 6l6 6-6 6"/>') + '</button></div>' +
      '<section class="pl-card" data-pl-today aria-busy="true" aria-label="' + t('today') + '">' + skeleton([40, 60, 100]) + '</section>' +
      '<section class="pl-card pl-shelf" data-pl-shelf><div class="pl-tabs"><h2>' + svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>') +
      t('shelf') + '</h2></div><div class="pl-grid">' + tiles(null) + '</div></section>' +
      '<section class="pl-now" data-pl-now aria-busy="true">' + skeleton([30, 80, 50]) + '</section>' +
      '<section class="pl-card pl-split" data-pl-battle hidden></section>' +
      '<section class="pl-card pl-split" data-pl-ranking hidden></section>';
    root.replaceChildren(view);
    const pill = view.querySelector('[data-pl-points]');
    paintPill(pill, L.me?.points);
    pill.onclick = openMenu;
    const stopDwell = trackDwell();
    const stopPull = typeof L.pull === 'function' ? L.pull(view, () => fill()) : null;
    refresher = () => fill();
    dispose = () => { refresher = null; stopPull?.(); stopDwell(); };

    async function fill() {
      const data = await L.api('play_home');
      if (!view.isConnected) return;
      if (data?.on === false) {
        dispose?.();
        dispose = undefined;
        return legacyRender(root);
      }
      if (!data || data.error) {
        if (data?.error === 'auth') L.needLogin();
        view.querySelector('[data-pl-today]').innerHTML = U.status('error');
        view.querySelector('[data-pl-now]').hidden = true;
        return;
      }
      if (data.points != null && L.me) L.me.points = data.points;
      paintPill(pill, data.points);
      paintToday(view.querySelector('[data-pl-today]'), data.today, data.points);
      paintNow(view.querySelector('[data-pl-now]'), data.now, fill);
      view.querySelector('[data-pl-shelf] .pl-grid').innerHTML = tiles(data.shelf);
      paintBattle(view.querySelector('[data-pl-battle]'), data.battle, fill);
      paintRank(view.querySelector('[data-pl-ranking]'), data.rank);
    }
    return fill();
  }

  function render(root) {
    dispose?.();
    dispose = undefined;
    return L.open('play1') ? modern(root) : legacyRender(root);
  }
  function leave() {
    dispose?.();
    dispose = undefined;
  }
  // 아래 '놀거리' 탭을 다시 누르면(틀이 맨 위로 올린 뒤) 새 화면은 데이터만 다시 받음
  function refresh() {
    if (refresher) return refresher();
    return L.route();
  }
  L.screen('play', { nav: 'play', auth: false, title: 'nav.play', render, leave, refresh });
})();
