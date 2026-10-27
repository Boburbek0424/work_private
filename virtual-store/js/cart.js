/* VELOX Virtual Store — bag / cart drawer (persisted in localStorage). */
(function () {
  const VX = window.VX;
  const KEY = 'velox_cart';
  const FREE_SHIP = 75;
  let lines = load();
  let el, body, foot, countEl, badge;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch (e) {}
  }
  const total = () => lines.reduce((s, l) => s + VX.byId(l.id).price * l.qty, 0);
  const count = () => lines.reduce((s, l) => s + l.qty, 0);

  function init() {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="drawer-backdrop" data-close></div>
      <aside class="drawer" aria-label="Your bag" aria-hidden="true">
        <header class="drawer-head"><h3>Your Bag <span class="drawer-count"></span></h3>
          <button class="round-btn" data-close aria-label="Close bag"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
        <div class="drawer-body"></div>
        <footer class="drawer-foot"></footer>
      </aside>`
    );
    el = document.querySelector('.drawer');
    body = el.querySelector('.drawer-body');
    foot = el.querySelector('.drawer-foot');
    countEl = el.querySelector('.drawer-count');
    badge = document.querySelector('.cart-btn .badge');
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    body.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const i = +b.dataset.i;
      if (b.dataset.act === 'inc') lines[i].qty++;
      if (b.dataset.act === 'dec') lines[i].qty--;
      if (b.dataset.act === 'rm' || lines[i].qty <= 0) {
        const row = b.closest('.line');
        row.classList.add('out');
        setTimeout(() => {
          lines.splice(i, 1);
          save();
          render();
        }, 320);
        return;
      }
      save();
      render();
    });
    foot.addEventListener('click', (e) => {
      if (e.target.closest('.checkout')) checkout();
      if (e.target.closest('.keep')) close();
    });
    addEventListener('keydown', (e) => e.key === 'Escape' && el.classList.contains('open') && close());
    render();
  }

  function render() {
    countEl.textContent = count() ? `(${count()})` : '';
    badge.textContent = count();
    badge.classList.toggle('show', count() > 0);
    if (!lines.length) {
      body.innerHTML = `<div class="empty"><div class="empty-art">${VX.markSVG()}</div><h4>Your bag is empty</h4><p>Walk the store and add something you love.</p></div>`;
      foot.innerHTML = `<button class="btn-primary keep">Keep browsing</button>`;
      return;
    }
    body.innerHTML = lines
      .map((l, i) => {
        const p = VX.withVariant(VX.byId(l.id), l.variant);
        return `<div class="line" style="--i:${i}">
          <div class="line-art">${VX.art(p)}</div>
          <div class="line-info"><b>${p.name}</b><span>${p.variants[l.variant].name} · ${l.size}</span>
            <div class="qty"><button data-act="dec" data-i="${i}" aria-label="Decrease">−</button><em>${l.qty}</em><button data-act="inc" data-i="${i}" aria-label="Increase">+</button></div></div>
          <div class="line-end"><b>${VX.money(p.price * l.qty)}</b><button class="link-btn" data-act="rm" data-i="${i}">Remove</button></div>
        </div>`;
      })
      .join('');
    const t = total();
    const left = Math.max(0, FREE_SHIP - t);
    foot.innerHTML = `
      <div class="ship"><span>${left > 0 ? `You're <b>${VX.money(left)}</b> away from free shipping` : '<b>You unlocked free shipping 🎉</b>'}</span>
        <div class="ship-bar"><i style="width:${Math.min(100, (t / FREE_SHIP) * 100)}%"></i></div></div>
      <div class="sum"><span>Subtotal</span><b>${VX.money(t)}</b></div>
      <div class="sum muted"><span>Shipping</span><span>${left > 0 ? VX.money(8) : 'Free'}</span></div>
      <button class="btn-primary checkout">${VX.auth.user ? 'Checkout' : 'Sign in to checkout'}</button>`;
  }

  function add(p, size) {
    const l = lines.find((x) => x.id === p.id && x.variant === p.variant && x.size === size);
    if (l) l.qty++;
    else lines.push({ id: p.id, variant: p.variant, size, qty: 1 });
    save();
    render();
  }

  function open() {
    render();
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
  }
  function close() {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
  }
  function bump() {
    const b = document.querySelector('.cart-btn');
    b.classList.remove('bump');
    void b.offsetWidth;
    b.classList.add('bump');
  }

  function checkout() {
    if (!VX.auth.user) {
      close();
      VX.app.toast('Sign in to finish your order');
      VX.app.navigate('#/login', { next: 'checkout' });
      return;
    }
    placeOrder();
  }

  function placeOrder() {
    const n = count();
    const t = total();
    lines = [];
    save();
    countEl.textContent = '';
    badge.classList.remove('show');
    body.innerHTML = `<div class="order-ok">
      <svg class="ok-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
      <h4>Order placed!</h4><p>Thanks ${VX.auth.escapeHTML(VX.auth.user.name.split(' ')[0])} — ${n} item${n > 1 ? 's' : ''}, ${VX.money(t)}.<br/>This is a demo store, so nothing was charged.</p></div>`;
    foot.innerHTML = `<button class="btn-primary keep">Back to the store</button>`;
    VX.app.confetti();
  }

  VX.cart = { init, add, open, close, bump, render, get count() { return count(); }, get pendingCheckout() { return lines.length > 0; } };
})();
