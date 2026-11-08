/* GROOVE N SPOT 안내 챗봇 — 정해진 답변형(FAQ). 서버 없이 /assets/chat-<lang>.json 만 사용. */
(function () {
  var GS = window.GS || { lang: 'ko', root: '' };
  var lang = GS.lang || 'ko', data = null, box, log, input, opened = false;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(n, p) { try { if (window.gtag) window.gtag('event', n, p || {}); } catch (e) {} }
  function say(html, who) { var m = el('div', 'gc-msg ' + (who || 'bot'), html); log.appendChild(m); log.scrollTop = log.scrollHeight; }
  function chips(list) {
    var w = el('div', 'gc-chips');
    list.forEach(function (c) {
      var b = el('button', 'gc-chip', esc(c.label)); b.type = 'button';
      b.addEventListener('click', function () { if (c.href) { track('chat_link', { to: c.id || '' }); window.open(c.href, c.href.charAt(0) === '/' ? '_self' : '_blank', 'noopener'); return; } ask(c.label, c.i); });
      w.appendChild(b);
    });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
  }
  function actions() {
    var U = data.ui; return [
      { label: U.book, href: data.reserve, id: 'reserve' },
      { label: 'WhatsApp', href: GS.whatsapp || 'https://wa.me/groovenspot', id: 'whatsapp' },
      { label: 'Instagram DM', href: 'https://ig.me/m/groovenspot', id: 'instagram' }
    ];
  }
  function match(q) {
    var s = q.toLowerCase(), best = -1, score = 0;
    data.items.forEach(function (it, i) {
      var n = 0; (it.k || []).forEach(function (k) { if (s.indexOf(k) >= 0) n += k.length; });
      if (n > score) { score = n; best = i; }
    });
    return best;
  }
  function ask(text, i) {
    say(esc(text), 'me');
    if (i == null) i = match(text);
    track('chat_ask', { matched: i >= 0 ? data.items[i].id : 'none' });
    if (i >= 0) { var it = data.items[i]; say(it.a); if (it.id === 'table' || it.id === 'walkin') chips(actions()); }
    else { say(data.ui.fallback); chips(actions()); }
  }
  function build() {
    box = el('div', 'gc-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', data.ui.title); box.hidden = true;
    var head = el('div', 'gc-head', '<b>' + esc(data.ui.title) + '</b>');
    var x = el('button', 'gc-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'close'); x.addEventListener('click', toggle); head.appendChild(x);
    log = el('div', 'gc-log'); log.setAttribute('aria-live', 'polite');
    var f = el('form', 'gc-form'); input = el('input'); input.placeholder = data.ui.ph; input.setAttribute('aria-label', data.ui.ph); input.maxLength = 200;
    var send = el('button', 'gc-send', '➤'); send.type = 'submit'; send.setAttribute('aria-label', 'send');
    f.appendChild(input); f.appendChild(send);
    f.addEventListener('submit', function (ev) { ev.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; ask(v); });
    box.appendChild(head); box.appendChild(log); box.appendChild(f); document.body.appendChild(box);
    say(data.ui.hi);
    chips(data.items.filter(function (it) { return it.top; }).map(function (it) { return { label: it.q, i: data.items.indexOf(it) }; }));
  }
  function toggle() {
    if (!data) return;
    if (!box) build();
    opened = !opened; box.hidden = !opened; btn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    if (opened) { track('chat_open'); setTimeout(function () { input.focus(); }, 50); }
  }
  var btn = el('button', 'gc-btn', '💬'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
  function load() {
    fetch('/assets/chat-' + lang + '.json?v=' + (GS.v || '')).then(function (r) { return r.json(); }).then(function (j) {
      data = j; btn.setAttribute('aria-label', j.ui.title); btn.title = j.ui.title; document.body.appendChild(btn);
    }).catch(function () {});
  }
  btn.addEventListener('click', toggle);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
