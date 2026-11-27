(function () {
  'use strict';

  const dictionary = {
    title: ['손님 DJ 평가', 'Guest DJ reviews', '来場者のDJ評価', '顾客DJ演出评价'],
    mine: ['내 DJ 평가 추이', 'My DJ review trend', '自分のDJ評価の推移', '我的DJ评价趋势'],
    independent: ['손님 평가만 집계', 'Guest reviews', '来場者の評価', '顾客评价'],
    waiting: ['불러오는 중…', 'Loading…', '読み込み中…', '加载中…'],
    empty: ['응답 0건', '0 responses', '回答0件', '0 条回应'],
    responses: ['응답', 'Responses', '回答', '回应'],
    sets: ['응답이 있는 세트', 'Sets with responses', '回答のあったセット', '有回应的演出'],
    low: ['표본 부족', 'Insufficient sample', 'サンプル不足', '样本不足'],
    from: ['시작 영업일', 'From business date', '開始営業日', '起始营业日'],
    to: ['종료 영업일', 'To business date', '終了営業日', '结束营业日'],
    floor: ['층', 'Floor', 'フロア', '楼层'],
    hour: ['시작 시간대 (KST)', 'Start hour (KST)', '開始時間帯 (KST)', '开始时段 (KST)'],
    all: ['전체', 'All', 'すべて', '全部'],
    apply: ['조회', 'Apply filters', '表示', '筛选'],
    confirm: ['실제 공연 확인', 'Confirm a performed set', '実際の出演を確認', '确认已完成的演出'],
    performed: ['선택한 DJ가 아래 시각에 실제로 공연했음을 확인했습니다.', 'I verified that this DJ performed at the times shown below.', '選択したDJが下記の時刻に実際に出演したことを確認しました。', '我已确认该DJ在以下时间实际完成了演出。'],
    starts: ['실제 시작 (KST)', 'Actual start (KST)', '実際の開始 (KST)', '实际开始时间 (KST)'],
    ends: ['실제 종료 (KST)', 'Actual end (KST)', '実際の終了 (KST)', '实际结束时间 (KST)'],
    save: ['공연 확인 저장', 'Save confirmation', '出演確認を保存', '保存演出确认'],
    edit: ['정정', 'Correct', '訂正', '更正'],
    cancel: ['평가 대상 취소', 'Cancel review eligibility', '評価対象から外す', '取消评价资格'],
    cancelPrompt: ['이 세트의 평가 접수를 중단할까요?', 'Stop accepting reviews for this set?', 'このセットの評価受付を停止しますか？', '停止接收这场演出的评价？'],
    correctPrompt: ['정정하면 기존 세트 응답은 보존되고, 집계에서 제외됩니다.', 'A correction preserves the previous responses and excludes them from totals.', '訂正前の回答は保存され、集計から除外されます。', '更正后，原有回应会保留并从汇总中移除。'],
    inactive: ['평가 대상 제외', 'Inactive set', '評価対象外', '评价已停用'],
    byDj: ['DJ별', 'By DJ', 'DJ別', '按DJ'],
    bySet: ['세트별', 'By set', 'セット別', '按演出'],
    weekly: ['주간', 'Weekly', '週別', '每周'],
    monthly: ['월간', 'Monthly', '月別', '每月'],
    review: ['의심 평가 검토', 'Flagged reviews', '要確認の評価', '待审核的评价'],
    repeat: ['반복 평가', 'Repeated reviews', '繰り返しの評価', '重复评价'],
    concentration: ['특정 DJ 쏠림', 'DJ concentration', '特定のDJへの偏り', '集中评价某位DJ'],
    reviewed: ['검토 완료', 'Reviewed', '確認済み', '已审核'],
    mark: ['검토 기록', 'Mark reviewed', '確認を記録', '记录审核'],
    more: ['다음 평가 보기', 'View more flagged reviews', '次の評価を表示', '查看更多待审核评价'],
    unavailable: ['등록된 DJ를 확인해 주세요.', 'Check the public DJ directory.', '公開DJ一覧を確認してください。', '请查看公开 DJ 名录。'],
    failure: ['요청을 처리하지 못했어요.', 'The request could not be completed.', '操作を完了できませんでした。', '无法完成此操作。'],
    retry: ['다시 시도', 'Retry', '再試行', '重试']
  };
  const lang = (navigator.language || 'ko').slice(0, 2);
  const index = ['ko', 'en', 'ja', 'zh'].indexOf(lang);
  const label = key => dictionary[key][index < 0 ? 1 : index];
  const count = new Intl.NumberFormat(lang);
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 });
  const kst = at => new Date(at + 9 * 3600e3).toISOString().slice(0, 16);
  const time = at => kst(at).replace('T', ' ');
  const choices = [['again', '🔥'], ['good', '👍'], ['miss', '🤔']];

  function element(tag, text, attrs = {}) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    return item;
  }

  function field(key, control) {
    const wrapper = element('label');
    wrapper.append(label(key), control);
    return wrapper;
  }

  function select(name, options) {
    const input = element('select', undefined, { name });
    for (const [value, text] of options) input.append(element('option', text, { value }));
    return input;
  }

  function button(key, handler, type = 'button') {
    const item = element('button', label(key), { type, class: 'btn' });
    if (handler) item.onclick = handler;
    return item;
  }

  function summary(item, heading, owner) {
    const card = element('article', undefined, { class: 'dj-report-card' });
    card.append(element('h4', heading));
    const total = item.total ? label('responses') + ' ' + count.format(item.total) : label('empty');
    card.append(element('p', total + (item.low_sample ? ' · ' + label('low') : '')));
    if (item.answered_sets !== undefined || !owner) {
      card.append(element('small', label('sets') + ' ' + count.format(item.answered_sets ?? item.sets)));
    }
    if (item.total && item.ratios) {
      const line = element('p', undefined, { class: 'dj-report-ratios' });
      for (const [choice, emoji] of choices) {
        line.append(element('span', emoji + ' ' + percent.format(item.ratios[choice]) +
          (owner ? ' (' + count.format(item.counts[choice]) + ')' : '')));
      }
      card.append(line);
    }
    return card;
  }

  async function personal(panel, request, active) {
    panel.classList.add('dj-report');
    panel.textContent = label('waiting');
    try {
      const data = await request('mine');
      if (!active()) return;
      panel.replaceChildren(element('p', label('independent')),
        ...data.months.map(month => summary(month, month.month, false)));
    } catch {
      if (active()) panel.replaceChildren(element('p', label('failure')), button('retry', () => personal(panel, request, active)));
    }
  }

  function owner(panel, request, active) {
    panel.classList.add('dj-report');
    const filterForm = element('form');
    const from = element('input', undefined, { type: 'date', name: 'from', required: '' });
    const to = element('input', undefined, { type: 'date', name: 'to', required: '' });
    const floor = select('floor', [['', label('all')], ['2F', '2F'], ['3F', '3F']]);
    const hour = select('hour', [['', label('all')], ...Array.from({ length: 24 }, (_, i) => [i, String(i).padStart(2, '0') + ':00'])]);
    const filters = element('div', undefined, { class: 'dj-report-fields' });
    filters.append(field('from', from), field('to', to), field('floor', floor), field('hour', hour));
    filterForm.append(filters, button('apply', null, 'submit'));
    filterForm.hidden = true;
    const editor = element('div');
    const status = element('p', label('waiting'), { role: 'status' });
    const results = element('div');
    panel.replaceChildren(element('p', label('independent')), editor, filterForm, status, results);
    let roster = [], criteria = {}, working = false, sequence = 0;
    const reload = () => load(criteria);

    async function mutate(task, args, done, controls = []) {
      if (working || !active()) return;
      working = true;
      controls.forEach(control => { control.disabled = true; });
      status.textContent = label('waiting');
      try {
        await request(task, { ...args, request_id: crypto.randomUUID() });
        if (active()) { done?.(); await reload(); }
      } catch {
        if (active()) status.textContent = label('failure');
      } finally {
        working = false;
        controls.forEach(control => { control.disabled = false; });
      }
    }

    function edit(set) {
      const details = element('details');
      details.open = Boolean(set);
      details.append(element('summary', label('confirm')));
      if (!roster.length) {
        details.append(element('p', label('unavailable')));
        editor.replaceChildren(details);
        return;
      }
      const form = element('form', undefined, { class: 'dj-report-fields' });
      const dj = select('dj', roster.map(item => [item.key, item.name]));
      const onFloor = select('floor', [['2F', '2F'], ['3F', '3F']]);
      const starts = element('input', undefined, { type: 'datetime-local', required: '' });
      const ends = element('input', undefined, { type: 'datetime-local', required: '' });
      const proof = element('input', undefined, { type: 'checkbox', required: '' });
      if (set) {
        if (roster.some(item => item.key === set.dj_key)) dj.value = set.dj_key;
        onFloor.value = set.floor;
        starts.value = kst(set.starts_at);
        ends.value = kst(set.ends_at);
      }
      const save = button('save', null, 'submit');
      const confirmation = field('performed', proof);
      confirmation.className = 'dj-report-confirmation';
      form.append(fieldDj(dj), field('floor', onFloor), field('starts', starts), field('ends', ends), confirmation, save);
      if (set) form.append(element('p', label('correctPrompt')));
      form.onsubmit = event => {
        event.preventDefault();
        void mutate('set', {
          step: 'confirm', attested: proof.checked, ...(set && { set_id: set.set_id }), dj_key: dj.value, floor: onFloor.value,
          starts_at: Date.parse(starts.value + ':00+09:00'), ends_at: Date.parse(ends.value + ':00+09:00')
        }, () => edit(), [save]);
      };
      details.append(form);
      editor.replaceChildren(details);
    }

    function fieldDj(input) {
      const wrapper = element('label', 'DJ');
      wrapper.append(input);
      return wrapper;
    }

    function section(key, rows) {
      const region = element('details');
      region.append(element('summary', label(key)), ...rows);
      return region;
    }

    function setCard(set) {
      const card = summary(set, set.dj_name + ' · ' + set.floor + ' · ' + time(set.starts_at) + '–' + kst(set.ends_at).slice(11), true);
      if (!set.active) card.append(element('p', label('inactive')));
      const actions = element('div', undefined, { class: 'dj-report-set-actions' });
      if (set.expires_at > Date.now() && !set.replaced) {
        actions.append(button('edit', () => { edit(set); editor.scrollIntoView({ block: 'nearest' }); }));
      }
      if (set.active) {
        actions.append(button('cancel', event => {
          if (window.confirm(label('cancelPrompt'))) {
            void mutate('set', { step: 'cancel', set_id: set.set_id }, null, [event.currentTarget]);
          }
        }));
      }
      if (actions.childNodes.length) card.append(actions);
      return card;
    }

    function reviewPanel(data, sets, region) {
      const cards = data.review.map(item => {
        const set = sets.get(item.set_id);
        const card = element('article', undefined, { class: 'dj-report-card' });
        if (set) card.append(element('h4', set.dj_name + ' · ' + set.floor + ' · ' + time(set.starts_at)));
        const choice = choices.find(([value]) => value === item.choice);
        card.append(element('p', [choice?.[1], ...item.flags.map(label)].filter(Boolean).join(' · ')));
        card.append(item.reviewed_at ? element('p', label('reviewed') + ' · ' + time(item.reviewed_at)) :
          button('mark', event => void mutate('review', { rating_id: item.rating_id }, null, [event.currentTarget])));
        return card;
      });
      region.append(...cards);
      if (data.next_review) {
        const more = button('more', async () => {
          more.disabled = true;
          const version = sequence;
          try {
            const next = await request('report', { ...criteria, before: data.next_review });
            if (!active() || version !== sequence) return;
            more.remove();
            reviewPanel(next, sets, region);
          } catch {
            if (active()) { more.disabled = false; status.textContent = label('failure'); }
          }
        });
        region.append(more);
      }
    }

    async function load(next) {
      const version = ++sequence;
      status.textContent = label('waiting');
      try {
        const data = await request('report', next);
        if (!active() || version !== sequence) return;
        criteria = next;
        roster = data.roster;
        if (!editor.childNodes.length) edit();
        from.value = data.from;
        to.value = data.to;
        filterForm.hidden = false;
        status.textContent = data.djs.length ? '' : label('empty');
        const djs = data.djs.map(dj => {
          const card = summary(dj, dj.dj_name, true);
          for (const [key, periods] of [['weekly', dj.weeks], ['monthly', dj.months]]) {
            card.append(section(key, periods.map(period => summary(period, period.key, true))));
          }
          return card;
        });
        const review = section('review', []);
        review.open = results.querySelector('[data-dj-review-flags]')?.open === true;
        review.dataset.djReviewFlags = '';
        reviewPanel(data, new Map(data.sets.map(set => [set.set_id, set])), review);
        const djSection = section('byDj', djs);
        djSection.open = true;
        results.replaceChildren(djSection, section('bySet', data.sets.map(setCard)),
          section('weekly', data.weeks.map(item => summary(item, item.key, true))),
          section('monthly', data.months.map(item => summary(item, item.key, true))), review);
      } catch {
        if (!active() || version !== sequence) return;
        results.replaceChildren();
        editor.replaceChildren();
        status.replaceChildren(document.createTextNode(label('failure') + ' '), button('retry', reload));
      }
    }

    filterForm.onsubmit = event => {
      event.preventDefault();
      if (working) return;
      void load({ from: from.value, to: to.value, floor: floor.value || null, hour: hour.value === '' ? null : +hour.value });
    };
    return load({});
  }

  window.GrooveDjReview = { label, personal, owner };
})();
