// ⑤ W-rewards · merchandise to collect and pay for at the club.
(() => {
  const L = Lounge, U = LoungeScreenUI, R = LoungeRewardUI;
  const t = U.words('shop', {
    title: ['굿즈', 'Merch'], store: ['매장에서 받고 결제해요.', 'Pick up and pay at the club.'],
    quantity: ['수량', 'Quantity'], stock: ['재고 {n}개', '{n} in stock'], soldOut: ['품절', 'Sold out'],
    subtotal: ['상품 합계', 'Merch total'], due: ['매장에서 낼 금액', 'Amount due at the club'],
    discount: ['쓸 포인트', 'Points to use'], discountHelp: ['1P는 1원이에요. 상품 금액의 20%까지 할인받을 수 있어요.', '1P is worth ₩1. Use points for up to 20% off merchandise.'],
    order: ['매장 수령 주문하기', 'Order for pickup'], orders: ['내 굿즈 주문', 'My merch orders'],
    sending: ['직원에게 보내는 중', 'Sending to staff'], pending: ['수령 대기', 'Waiting for pickup'],
    done: ['수령 완료', 'Picked up'], failed: ['전달 실패', 'Could not send'], expired: ['만료', 'Expired'],
    orderWindow: ['대기 중인 주문은 3건까지 가능해요. 접수 후 48시간 안에 수령해 주세요.', 'You can have up to three orders pending. Collect your order within 48 hours.'],
    login: ['로그인하면 주문할 수 있어요.', 'Log in to order.']
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

  async function render(root) {
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
    const goods = catalog.goods;
    const listing = goods.map(product).join('') || U.status('empty');
    const checkout = goods.some(good => good.stock > 0) ? R.panel('<p>' + t('store') +
      '</p><dl style="display:grid;gap:8px">' + triplet('subtotal', 'total') + triplet('due', 'due') +
      '</dl><label>' + t('discount') + ' <input name="points" type="number" min="0" max="0" value="0" required style="' +
      R.inputStyle + '"></label><p class="muted">' + t('discountHelp') + '</p><p class="muted">' + t('orderWindow') +
      '</p>' + R.message() + R.submit(t('order'))) : '';
    view.innerHTML = L.me ? '<form data-order>' + listing + checkout + '</form>' +
      history(info?.orders || []) + R.bookings(info?.bookings || []) + '<div data-booking></div>'
      : '<p>' + t('store') + '</p>' + listing + '<p>' + t('login') + '</p>' +
        U.button(L.esc(L.t('core.login')), 'data-login', true);
    if (!L.me) {
      view.querySelector('[data-login]').onclick = L.needLogin;
      return;
    }
    const refresh = () => render(root);
    R.bookingForm(view.querySelector('[data-booking]'), { store: true, done: refresh });
    const form = view.querySelector('[data-order]');
    if (!checkout) return;
    const use = form.elements.points;
    const button = form.querySelector('[type=submit]');
    function summarize() {
      const total = goods.reduce((sum, good, i) => sum + good.price * (Number(form.elements['n' + i]?.value) || 0), 0);
      use.max = Math.min(Math.floor(total / 5), points?.points ?? 0);
      if (Number(use.value) > Number(use.max)) use.value = use.max;
      button.disabled = total === 0;
      form.querySelector('[data-total]').textContent = money(total);
      form.querySelector('[data-due]').textContent = money(total - (Number(use.value) || 0));
    }
    form.oninput = summarize;
    summarize();
    R.wire(form, 'order', data => ({
      items: goods.map((good, i) => ({ sku: good.sku, n: Number(data.get('n' + i)) })).filter(item => item.n > 0),
      points: Number(data.get('points')), pay: 'store'
    }), refresh, true);
  }

  L.screen('shop', { nav: 'play', title: 'shop.title', render });
})();
