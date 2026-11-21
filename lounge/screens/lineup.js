/* SPEC5 t4 — timetable and party calendar */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const words = {
    title: ['타임테이블','Timetable','タイムテーブル','时间表'],
    parties: ['이번 주 파티','Upcoming parties','今週のパーティー','本周派对'],
    now: ['지금','Now','ただいま','正在播放'], alert: ['알림','Alerts','通知','提醒'],
    follow: ['팔로우','Follow','フォロー','关注'], unfollow: ['팔로우 취소','Unfollow','フォロー解除','取消关注'],
    more: ['남은 {n}팀 더 보기','See {n} more sets','残り{n}組を見る','查看其余{n}组'],
    empty: ['아직 타임테이블이 없어요','No timetable yet','タイムテーブルはまだありません','暂无时间表'],
    noParties: ['아직 예정된 파티가 없어요','No parties scheduled yet','予定はまだありません','暂无派对安排'],
    soon: ['준비 중이에요','Coming soon','準備中です','即将推出'],
    today: ['오늘','Today','今日','今天'], poster: ['포스터 크게 보기','Enlarge poster','ポスターを拡大','放大海报'],
    error: ['불러오지 못했어요. 다시 시도해 주세요.','Could not load. Please try again.','読み込めませんでした。もう一度お試しください。','加载失败，请重试。']
  };
  L.i18n(Object.fromEntries(['ko','en','ja','zh'].map((lang,i) => [lang,Object.fromEntries(Object.entries(words).map(([key,v]) => ['lineup5.'+key,v[i]]))])));
  const t = (key,vars) => L.esc(L.t('lineup5.'+key,vars));
  const floors = ['2F','3F'], states = new WeakMap(), requests = new WeakMap();
  const now = () => Number(typeof L.clock === 'function' ? L.clock() : L.clock) || Date.now();
  const nightMinute = at => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(at || '')) return Infinity;
    const [h,m] = at.split(':').map(Number);
    return h*60+m+(h<21?1440:0);
  };
  function activeIndex(rows,data,floor) {
    if (!(data.phase ? data.phase === 'open' : data.open === true)) return -1;
    const date = new Date(now()+9*3600e3), minute = date.getUTCHours()*60+date.getUTCMinutes();
    if (minute >= 420 && minute < 1260) return -1;
    const at = minute+(minute<1260?1440:0);
    let index = -1;
    rows.forEach((row,i) => { if (nightMinute(row.at)<=at) index=i; });
    const server = data.floors?.[floor]?.now;
    if (server) {
      const matches=rows.map((r,i) => r.dj===server || r.key===server ? i : -1).filter(i=>i>=0);
      if (matches.length && !matches.includes(index)) index=matches.findLast(i=>i<=index) ?? matches[0];
      else if (!matches.length) index=-1;
    }
    return index;
  }
  function lineup(el,data={},ctx={}) {
    if (!L.open('tonight5') && !ctx.enabled) { el.hidden=true; el.replaceChildren(); return; }
    el.hidden=false;
    const slots=Array.isArray(data.timetable)?data.timetable:[];
    const rowsFor=f=>slots.filter(r=>r?.floor===f).slice().sort((a,b)=>nightMinute(a.at)-nightMinute(b.at));
    let state=states.get(el);
    if (!state) { state={floor:floors.find(f=>activeIndex(rowsFor(f),data,f)>=0)||'2F'}; states.set(el,state); }
    const floor=state.floor, rows=rowsFor(floor), current=activeIndex(rows,data,floor);
    const start=ctx.compact && current>=0 ? Math.max(0,current-1):0;
    const visible=ctx.compact?rows.slice(start,start+6):rows;
    const remaining=rows.length-start-visible.length, followed=new Set(data.mine?.djs||[]);
    el.innerHTML='<section class="lineup5" data-floor="'+floor+'"><h2>'+t('title')+'</h2><div class="lineup5-tabs" role="tablist" aria-label="'+t('title')+'">'+
      floors.map(f=>'<button type="button" role="tab" aria-selected="'+(f===floor)+'" tabindex="'+(f===floor?0:-1)+'" data-floor-tab="'+f+'">'+f+(f==='2F'?' GROOVE':' SPOT')+'</button>').join('')+'</div><div role="tabpanel" aria-label="'+floor+'">'+
      (visible.length?'<ol class="lineup5-list">'+visible.map((row,i)=>{
        const index=start+i, mine=followed.has(row.key);
        const body='<time>'+L.esc(row.at)+'</time>'+L.avatar({nick:row.dj,photo:U.url(row.photo)},44)+
          '<span class="lineup5-name">'+L.esc(row.dj)+'</span><span class="lineup5-status">'+(index===current?'<b>'+t('now')+'</b>':'')+(mine?'<small>★ '+t('alert')+'</small>':'')+'</span>';
        return '<li class="lineup5-row'+(index===current?' is-now':current>=0 && index<current?' is-past':'')+'">'+
          (row.key?'<a class="lineup5-dj" href="#/dj/'+encodeURIComponent(row.key)+'">'+body+'</a>':'<div class="lineup5-dj">'+body+'</div>')+
          (ctx.follow && row.key?'<button type="button" class="lineup5-follow" data-follow="'+L.esc(row.key)+'" aria-pressed="'+mine+'" aria-label="'+t(mine?'unfollow':'follow')+' · '+L.esc(row.dj)+'">'+t(mine?'unfollow':'follow')+'</button>':'')+'</li>';
      }).join('')+'</ol>':'<p role="status" class="muted">'+t('empty')+'</p>')+'</div>'+
      (ctx.compact && (remaining>0||start>0)?'<a class="lineup5-more" href="#/lineup">'+t('more',{n:remaining})+'</a>':'')+'</section>';
    function select(f,focus) { state.floor=f; lineup(el,data,ctx); if(focus)el.querySelector('[data-floor-tab="'+f+'"]').focus(); }
    el.querySelectorAll('[data-floor-tab]').forEach(tab=>{
      tab.onclick=()=>select(tab.dataset.floorTab,true);
      tab.onkeydown=e=>{ if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?'2F':e.key==='End'?'3F':floor==='2F'?'3F':'2F',true);} };
    });
    el.querySelectorAll('[data-follow]').forEach(button=>{ button.onclick=async()=>{
      if(button.disabled||L.needLogin())return;
      const key=button.dataset.follow, was=followed.has(key); button.disabled=true;
      const result=await L.api(was?'dj_unfollow':'dj_follow',{key});
      if(!button.isConnected)return;
      button.disabled=false; if(result.error)return U.error(result);
      if(result.following)followed.add(key);else followed.delete(key);
      data.mine={...data.mine,djs:[...followed]}; lineup(el,data,ctx);
    }; });
  }
  function dateLabel(day) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return L.esc(day||'');
    return U.time(day+'T12:00:00+09:00',{month:'long',day:'numeric',weekday:'short'});
  }
  function partyMarkup(list,vertical) {
    const today=new Date(now()+9*3600e3).toISOString().slice(0,10);
    return '<div class="lineup5-parties'+(vertical?' is-vertical':'')+'">'+list.map((party,i)=>{
      const poster=U.url(party.poster);
      return '<article class="lineup5-party"><p><time datetime="'+L.esc(party.day)+'">'+dateLabel(party.day)+'</time>'+(party.day===today?' <b class="lineup5-today">'+t('today')+'</b>':'')+'</p>'+
        (poster?'<button type="button" class="lineup5-poster" data-poster="'+i+'" aria-label="'+t('poster')+' · '+L.esc(party.title)+'"><img src="'+L.esc(poster)+'" alt="" loading="lazy"></button>':'')+
        '<h3>'+L.esc(party.title)+'</h3><p class="lineup5-preview">'+L.esc((Array.isArray(party.lineup)?party.lineup:[]).slice(0,4).map(r=>[r.at,r.dj].filter(Boolean).join(' · ')).join(' / '))+'</p></article>';
    }).join('')+'</div>';
  }
  async function parties(el,data={},ctx={}) {
    const request={}; requests.set(el,request);
    if(!L.open('tonight5') && !ctx.enabled){el.hidden=true;el.replaceChildren();return;}
    const result=await L.api('parties');
    if(requests.get(el)!==request || !el.isConnected || (!L.open('tonight5') && !ctx.enabled))return;
    const list=Array.isArray(result.list)?result.list:[];
    el.hidden=!ctx.vertical && (Boolean(result.error)||!list.length);
    el.innerHTML=result.error?'<p role="status">'+t(['action','closed'].includes(result.error)?'soon':'error')+'</p>':
      (ctx.vertical?'':'<h2><a href="#/parties">'+t('parties')+'</a></h2>')+(list.length?partyMarkup(list,ctx.vertical):'<p role="status" class="muted">'+t('noParties')+'</p>');
    el.querySelectorAll('[data-poster]').forEach(button=>{button.onclick=()=>{
      const party=list[Number(button.dataset.poster)], src=U.url(party.poster);
      if(src)L.sheet('<h2>'+L.esc(party.title)+'</h2><img class="lineup5-zoom" src="'+L.esc(src)+'" alt="'+L.esc(party.title)+'">',{close:true});
    };});
  }
  // core does not await config for these two new routes yet. Check it here on direct entry.
  async function enabledForScreen() {
    if(L.open('tonight5'))return true;
    const config=await L.api('config');return config.open?.tonight5===true;
  }
  function screenRoot(root,title) {
    root.innerHTML=L.bar({title:L.t('lineup5.'+title),back:'tonight'})+'<div class="lineup5-screen" data-lineup5-content></div>';
    return root.querySelector('[data-lineup5-content]');
  }
  L.tonightParts=L.tonightParts||{}; Object.assign(L.tonightParts,{lineup,parties});
  L.screen('lineup',{nav:'tonight',bar:'own',title:'lineup5.title',async render(root){
    const view=screenRoot(root,'title');
    if(!await enabledForScreen()){view.innerHTML=t('soon');return;}
    if(!view.isConnected)return;
    const data=await L.api('tonight'); if(!view.isConnected)return;
    if(data.error){view.innerHTML=t('error');return;}
    view.innerHTML='<p class="lineup5-date">'+dateLabel(data.day)+'</p><h2>'+L.esc(data.party?.title||data.poster?.title||'')+'</h2><div data-lineup5-full></div>';
    lineup(view.querySelector('[data-lineup5-full]'),data,{follow:true,enabled:true});
  }});
  L.screen('parties',{nav:'tonight',bar:'own',title:'lineup5.parties',async render(root){
    const view=screenRoot(root,'parties');
    if(!await enabledForScreen()){view.innerHTML=t('soon');return;}
    if(!view.isConnected)return;
    await parties(view,{}, {vertical:true,enabled:true});
  }});
})();
