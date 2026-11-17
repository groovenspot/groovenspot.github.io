// 분실물 페이지: 직원 앱(🔎 분실물)에서 올린 사진을 날짜별로 보여 준다. 10일 지나면 서버가 자동으로 지운다.
(function () {
  var API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
  var box = document.getElementById('lost'); if (!box) return;
  var GS = window.GS || {}, T = GS.t || {}, lang = GS.lang || 'ko';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DOW = { ko: '일월화수목금토', ja: '日月火水木金土', zh: '日一二三四五六' };
  var EN_D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], EN_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dayLabel(d) {
    var p = d.split('-'), m = +p[1], dd = +p[2], w = new Date(Date.UTC(+p[0], m - 1, dd)).getUTCDay();
    if (lang === 'en') return EN_M[m - 1] + ' ' + dd + ' (' + EN_D[w] + ')';
    if (lang === 'ja') return m + '月' + dd + '日（' + DOW.ja[w] + '）';
    if (lang === 'zh') return m + '月' + dd + '日（周' + DOW.zh[w] + '）';
    return m + '월 ' + dd + '일 (' + DOW.ko[w] + ')';
  }
  function post(body) { return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  var lb = document.getElementById('lostLb');
  function openLb(src) { if (!lb) return; lb.querySelector('img').src = src; lb.hidden = false; }
  if (lb) lb.addEventListener('click', function (e) { if (e.target.tagName !== 'IMG') lb.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb) lb.hidden = true; });

  post({ a: 'lf_public' }).then(function (r) {
    if (!r || !r.ok) throw new Error('lf');
    if (!r.list.length) { box.innerHTML = '<p class="muted">' + esc(T.lostEmpty || '') + '</p>'; return; }
    var days = [], g = {};
    r.list.forEach(function (x) { if (!g[x.date]) { g[x.date] = []; days.push(x.date); } g[x.date].push(x); });
    box.innerHTML = days.map(function (d) {
      var ph = [].concat.apply([], g[d].map(function (x) { return x.photos; }));
      return '<h2 class="lost-day">' + esc(dayLabel(d)) + '<small>' + esc((T.lostCount || '{n}').replace('{n}', g[d].length)) + '</small></h2><div class="lost-grid">' +
        ph.map(function (id) { return '<button type="button" data-lf="' + esc(id) + '" aria-label="' + esc(dayLabel(d)) + '"><img alt="" loading="lazy"></button>'; }).join('') + '</div>';
    }).join('');
    // 사진은 한 장씩 차례로 받는다
    var btns = Array.prototype.slice.call(box.querySelectorAll('[data-lf]')), i = 0;
    btns.forEach(function (b) { b.addEventListener('click', function () { var im = b.querySelector('img'); if (im.src) openLb(im.src); }); });
    (function next() {
      if (i >= btns.length) return;
      var b = btns[i++];
      post({ a: 'lf_img', id: b.dataset.lf }).then(function (x) { if (x && x.ok) b.querySelector('img').src = 'data:' + x.type + ';base64,' + x.data; }).catch(function () {}).then(next);
    })();
  }).catch(function () { box.innerHTML = '<p class="muted">' + esc(T.lostFail || '') + '</p>'; });
})();
