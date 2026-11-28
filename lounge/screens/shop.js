// ⑤ W-rewards · merchandise to collect and pay for at the club.
(() => {
  const L = Lounge, U = LoungeScreenUI, R = LoungeRewardUI;
  const t = U.words('shop', {
    title: ['포인트 교환소', 'Points shop'], mine: ['내 포인트', 'My points'], need: ['{n}P', '{n}P'],
    lack: ['{n}P 더 모으면 교환', '{n}P more to redeem'], only: ['한정', 'only'], canSwap: ['지금 교환 가능', 'Ready to redeem'], pickupTag: ['매장 수령', 'Pick up at club'], swap: ['교환하기', 'Redeem'], photoSoon: ['사진 준비 중', 'Photo coming soon'],
    confirm: ['{name}을(를) {n}P로 교환할까요?', 'Redeem {name} for {n}P?'], pickup: ['교환하면 매장에서 직원에게 받아요. 48시간 안에 안 받으면 포인트가 돌아와요.', 'Pick it up from staff at the club. Points return if not collected within 48 hours.'],
    yes: ['교환', 'Redeem'], no: ['취소', 'Cancel'], swapped: ['교환 완료! 매장에서 받아 가세요', 'Redeemed! Pick it up at the club'],
    myOrders: ['내 교환 내역', 'My redemptions'], howEarn: ['포인트는 출석·미션·놀거리로 모아요', 'Earn points from check-ins, missions and games'],
    'error.points': ['포인트가 모자라요', 'Not enough points'], 'error.stock': ['품절이에요', 'Sold out'], store: ['매장에서 받고 결제해요.', 'Pick up and pay at the club.'],
    quantity: ['수량', 'Quantity'], stock: ['재고 {n}개', '{n} in stock'], soldOut: ['품절', 'Sold out'],
    subtotal: ['상품 합계', 'Merch total'], due: ['매장에서 낼 금액', 'Amount due at the club'],
    discount: ['쓸 포인트', 'Points to use'], discountHelp: ['1P는 1원이에요. 상품 금액의 20%까지 할인받을 수 있어요.', '1P is worth ₩1. Use points for up to 20% off merchandise.'],
    order: ['매장 수령 주문하기', 'Order for pickup'], orders: ['내 굿즈 주문', 'My merch orders'],
    sending: ['직원에게 보내는 중', 'Sending to staff'], pending: ['수령 대기', 'Waiting for pickup'],
    done: ['수령 완료', 'Picked up'], failed: ['전달 실패', 'Could not send'], expired: ['만료', 'Expired'],
    orderWindow: ['대기 중인 주문은 3건까지 가능해요. 접수 후 48시간 안에 수령해 주세요.', 'You can have up to three orders pending. Collect your order within 48 hours.'],
    login: ['로그인하면 주문할 수 있어요.', 'Log in to order.']
  });
  L.i18n({
    ja: {
      'shop.expired': '期限切れ',
      'shop.orderWindow': '受け取り待ちの注文は3件までです。ご注文から48時間以内にお受け取りください。'
    },
    zh: {
      'shop.expired': '已过期',
      'shop.orderWindow': '最多可有三笔待领取的订单，请在下单后48小时内到店领取。'
    }
  });

  const money = amount => new Intl.NumberFormat(L.lang, { style: 'currency', currency: 'KRW' }).format(Number(amount) || 0);
  function triplet(key, id) {
    return '<div style="display:flex;justify-content:space-between;gap:8px"><dt>' + t(key) +
      '</dt><dd data-' + id + ' style="margin:0;font-weight:800">' + L.esc(money(0)) + '</dd></div>';
  }

  function product(good, i) {
    const key = good.photo || '';
    const src = /^p\/staff:[\w:-]+\/[\w-]+\.(?:webp|jpg)$/.test(key) ? L.img(key).replace(/%3A/gi, ':') : '';
    const name = L.esc(good.name);
    return R.panel((src ? '<img src="' + L.esc(src) + '" alt="" loading="lazy" style="' + U.media +
      ';max-height:200px;object-fit:cover">' : '') + '<h2>' + name + '</h2><strong>' + L.esc(money(good.price)) +
      '</strong><p class="muted">' + (good.stock ? t('stock', { n: R.amount(good.stock) }) : t('soldOut')) + '</p>' +
      (good.stock && L.me ? '<label>' + t('quantity') + ' <input name="n' + i + '" type="number" min="0" max="' +
        Math.min(good.stock, 20) + '" value="0" required aria-label="' + name + ' · ' + t('quantity') + '" style="' + R.inputStyle + '"></label>' : ''));
  }

  function history(rows) {
    if (!rows.length) return '';
    return R.panel('<h2>' + t('orders') + '</h2><ul style="padding-inline-start:20px">' + rows.map(row => '<li>' +
      row.items.map(item => L.esc(item.name) + ' × ' + R.amount(item.n)).join(', ') + ' · ' + L.esc(money(row.due)) +
      ' <strong>(' + t(row.status) + ')</strong></li>').join('') + '</ul>');
  }

  // 포인트 교환소 (2026-11-28): sku 'pt-' 상품을 포인트로만 교환 · 매장에서 수령
  const PIN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>';
  const ICON = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>';
  function card(good, mine) {
    const key = good.photo || '';
    const src = /^p\/staff:[\w:-]+\/[\w-]+\.(?:webp|jpg)$/.test(key) ? L.img(key).replace(/%3A/gi, ':') : '';
    const lack = Math.max(0, good.price - mine);
    const ready = L.me && good.stock && !lack;
    return '<button type="button" class="pshop-card" data-swap="' + L.esc(good.sku) + '"' + (good.stock ? '' : ' disabled') + '>' +
      '<span class="pshop-photo">' + (src ? '<img src="' + L.esc(src) + '" alt="" loading="lazy">' : ICON + '<small>' + t('photoSoon') + '</small>') +
      '<em class="pshop-badge">GROOVE ' + t('only') + '</em>' + (good.stock ? '' : '<b class="pshop-out">' + t('soldOut') + '</b>') + '</span>' +
      '<span class="pshop-name">' + L.esc(good.name) + '</span>' +
      '<span class="pshop-price">' + R.amount(good.price) + '<small>P</small></span>' +
      (!L.me ? '' : ready ? '<span class="pshop-ok">' + t('canSwap') + '</span>' : good.stock ? '<span class="pshop-lack">' + t('lack', { n: R.amount(lack) }) + '</span>' : '') +
      '<span class="pshop-tag">' + PIN + t('pickupTag') + '</span></button>';
  }
  function swaps(rows) {
    rows = rows.filter(row => row.pay === 'points');
    if (!rows.length) return '';
    return R.panel('<h2>' + t('myOrders') + '</h2><ul class="pshop-hist">' + rows.map(row => '<li><span>' +
      row.items.map(item => L.esc(item.name)).join(', ') + ' · ' + R.amount(row.total) + 'P</span><strong>' + t(row.status) + '</strong></li>').join('') + '</ul>');
  }
  function style() {
    if (document.getElementById('pshop-css')) return;
    const el = document.createElement('style'); el.id = 'pshop-css';
    el.textContent = '.pshop-me{display:flex;justify-content:space-between;align-items:center;padding:16px;border-radius:18px;margin-bottom:14px;background:linear-gradient(120deg,#ff7a1a,#ff3d6e);color:#fff}' +
      '.pshop-me span{font-weight:700;opacity:.9}.pshop-me strong{font-size:1.75rem;font-weight:900}.pshop-earn{font-size:.8125rem;color:var(--muted);margin:-6px 0 14px}' +
      '.pshop-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}.pshop-card{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:3px;cursor:pointer;min-width:0}.pshop-card:disabled{cursor:default;opacity:.6}.pshop-card:focus-visible{outline:2px solid var(--g);outline-offset:4px;border-radius:12px}' +
      '.pshop-photo{position:relative;aspect-ratio:1;border-radius:12px;background:#f2f2f4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9a9aa2;overflow:hidden;margin-bottom:6px}.pshop-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.pshop-photo small{font-size:.75rem}' +
      '.pshop-badge{position:absolute;top:0;left:0;font-style:normal;font-size:.75rem;font-weight:800;color:#fff;background:#7b3dff;padding:4px 9px;border-radius:12px 0 10px 0}.pshop-out{position:absolute;inset:0;display:grid;place-items:center;background:#000a;color:#fff;font-size:1rem}' +
      '.pshop-name{font-size:.9375rem;line-height:1.35;color:var(--txt);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '.pshop-price{font-size:1.25rem;font-weight:900;color:var(--txt);letter-spacing:-.01em}.pshop-price small{font-size:.875rem;font-weight:800;margin-left:1px}' +
      '.pshop-ok{font-size:.875rem;font-weight:800;color:#ff3d6e}.pshop-lack{font-size:.8125rem;color:var(--muted)}.pshop-tag{display:flex;align-items:center;gap:3px;font-size:.8125rem;font-weight:700;color:#ff7a1a}' +
      '.pshop-hist{list-style:none;padding:0;margin:0;display:grid;gap:8px}.pshop-hist li{display:flex;justify-content:space-between;gap:8px;font-size:.875rem}';
    document.head.append(el);
  }

  async function render(root) {
    style();
    const view = U.mount(root, R.heading(t('title'), '#/play'));
    const config = await L.api('config');
    if (!view.isConnected) return;
    if (!config.open?.shop) {
      view.innerHTML = U.status(config.error ? 'error' : 'soon');
      return;
    }
    const [catalog, info, points] = await Promise.all([
      L.api('goods'), L.me ? L.api('orders') : null, L.me ? L.api('points') : null
    ]);
    if (!view.isConnected) return;
    if (catalog.error) {
      view.innerHTML = U.status(catalog.error === 'closed' ? 'soon' : 'error');
      return;
    }
    const goods = catalog.goods.filter(good => /^pt-/.test(good.sku)).sort((a, b) => a.price - b.price);
    const mine = points?.points ?? 0;
    view.innerHTML = (L.me ? '<div class="pshop-me"><span>' + t('mine') + '</span><strong>' + R.amount(mine) + 'P</strong></div>' : '') +
      '<p class="pshop-earn">' + t('howEarn') + ' · ' + t('pickup') + '</p>' +
      '<div class="pshop-grid">' + (goods.map(good => card(good, mine)).join('') || U.status('empty')) + '</div>' +
      (L.me ? swaps(info?.orders || []) : '<p>' + t('login') + '</p>' + U.button(L.esc(L.t('core.login')), 'data-login', true));
    if (!L.me) { view.querySelector('[data-login]').onclick = L.needLogin; return; }
    view.onclick = event => {
      const b = event.target.closest('[data-swap]'); if (!b) return;
      const good = goods.find(g => g.sku === b.dataset.swap); if (!good || !good.stock) return;
      if (good.price > mine) return L.toast(L.t('shop.lack', { n: R.amount(good.price - mine) }));
      const panel = L.sheet('<h2>' + t('confirm', { name: good.name, n: R.amount(good.price) }) + '</h2><p class="muted">' + t('pickup') + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button type="button" class="btn" data-no>' + t('no') + '</button><button type="button" class="btn btn-hot" data-yes>' + t('yes') + '</button></div>');
      panel.querySelector('[data-no]').onclick = L.closeSheet;
      const request = 'px' + crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 20);
      panel.querySelector('[data-yes]').onclick = async e => {
        e.currentTarget.disabled = true;
        const r = await L.api('order', { pay: 'points', items: [{ sku: good.sku, n: 1 }], request });
        L.closeSheet();
        if (r.error) L.toast(L.t('shop.error.' + r.error) !== 'shop.error.' + r.error ? L.t('shop.error.' + r.error) : L.t('core.unavailable'));
        else { L.toast(L.t('shop.swapped')); render(root); }
      };
    };
  }

  L.screen('shop', { nav: 'play', title: 'shop.title', render });
})();
