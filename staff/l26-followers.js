(function () {
  const labels = {
    members: '전체 회원 / Members',
    active_members: '활성 회원 / Active members',
    official_followers: '공식 팔로워 / Official followers',
    unique_followers: '고유 팔로워 / Unique followers',
    follow_relationships: '팔로우 관계 / Follow relationships'
  };
  const format = new Intl.NumberFormat('ko-KR');
  const count = n => Number.isInteger(n) ? format.format(n) : '—';
  const delta = n => Number.isInteger(n) && n > 0 ? '+' + count(n) : count(n);
  const timestamp = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short'
  });

  function table({ title, headings, rows, escape }) {
    return '<div class="lounge-growth-table" tabindex="0" role="region" aria-label="' + escape(title) +
      '"><table class="lounge-table"><thead><tr>' + headings.map(heading => '<th scope="col">' + escape(heading) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(([name, ...values]) => '<tr><th scope="row">' + escape(name) +
      '</th>' + values.map(value => '<td>' + escape(value) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  async function render(panel, request, escape, errorText) {
    const data = await request('adm_l26_followers');
    if (!panel.isConnected) return;
    const metrics = Object.keys(labels);
    const trendHeadings = ['현재 / Now', '7일 증감 / 7d', '30일 증감 / 30d'];
    const headline = data.biz_day + ' · ' + timestamp.format(data.captured_at) + ' KST';
    const history = [...data.snapshots, data].reverse();
    const names = new Map();
    for (const day of history) for (const dj of day.djs) {
      if (!names.has(dj.key)) names.set(dj.key, dj.name);
    }
    panel.innerHTML = '<section class="lounge-growth"><p class="note">' + escape(headline) + '</p>' +
      '<p class="note">활성 회원은 해당 영업일 08:00 KST 이후 이용 기록이 있는 회원입니다. 직원·테스트 계정은 집계에서 제외합니다. ' +
      '—는 비교일 기록이 없음을 뜻합니다.</p>' +
      table({ title: '성장 지표', headings: ['지표 / Metric', ...trendHeadings], escape,
        rows: metrics.map(key => [labels[key], count(data.totals[key]), delta(data.change_7d?.[key]), delta(data.change_30d?.[key])]) }) +
      '<h3>DJ 팔로워 / DJ followers</h3>' +
      (data.djs.length ? table({ title: 'DJ 팔로워', headings: ['DJ', ...trendHeadings], escape,
        rows: data.djs.map(dj => [dj.name, count(dj.followers), delta(dj.change_7d), delta(dj.change_30d)]) })
        : '<p class="note">등록 DJ 없음 / No registered DJs</p>') +
      '<p class="note">과반 DJ가 충족하는 최대 기준 / Recommended minimum <strong>' +
      count(data.recommended_minimum) + '</strong></p>' +
      '<form data-follower-min><label>DJ 공개 최소 팔로워 / Minimum to show a DJ count ' +
      '<input name="minimum" type="number" min="0" max="' + Number.MAX_SAFE_INTEGER +
      '" step="1" placeholder="미설정" value="' + (data.minimum ?? '') + '"' + (data.preview ? ' disabled' : '') + '></label>' +
      '<button type="submit" class="btn"' + (data.preview ? ' disabled' : '') +
      '>저장 / Save</button><span role="status"></span></form>' +
      '<details><summary>일별 기록 / Daily snapshots</summary>' +
      table({ title: '일별 성장 기록', headings: ['영업일 / Business day', '수집 시각 / Captured', ...metrics.map(key => labels[key])],
        escape, rows: history.map(day => [day.biz_day, timestamp.format(day.captured_at), ...metrics.map(key => count(day.totals[key]))]) }) +
      (names.size ? '<label>DJ 일별 추이 / DJ history <select data-growth-dj></select></label><div data-growth-dj-history></div>' : '') +
      '</details></section>';

    const select = panel.querySelector('[data-growth-dj]');
    if (select) {
      for (const [key, name] of names) select.add(new Option(name, key));
      const paintDj = () => {
        panel.querySelector('[data-growth-dj-history]').innerHTML = table({
          title: 'DJ 일별 팔로워', headings: ['영업일 / Business day', '팔로워 / Followers'], escape,
          rows: history.map(day => [day.biz_day, count(day.djs.find(dj => dj.key === select.value)?.followers)])
        });
      };
      select.onchange = paintDj;
      paintDj();
    }

    if (data.preview) return;
    const form = panel.querySelector('[data-follower-min]');
    const input = form.elements.minimum;
    const save = form.querySelector('button');
    const status = form.querySelector('[role="status"]');
    form.onsubmit = async event => {
      event.preventDefault();
      if (save.disabled) return;
      const minimum = input.value === '' ? null : input.valueAsNumber;
      input.disabled = save.disabled = true;
      status.textContent = '';
      try {
        const result = await request('adm_l26_dj_follower_min_set', { minimum });
        if (!form.isConnected) return;
        input.value = result.minimum ?? '';
        status.textContent = '저장했습니다. / Saved.';
      } catch (error) {
        if (form.isConnected) status.textContent = errorText(error);
      } finally {
        input.disabled = save.disabled = false;
      }
    };
  }

  window.LoungeFollowerGrowth = { render };
})();
