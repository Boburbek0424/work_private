/* VELOX Virtual Store — app shell: routing + choreographed transitions.
 * Routes:  #/  #/clothing  #/caps  #/bags  #/shoes  #/p/<id>  #/login  #/register */
(function () {
  const VX = window.VX;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cur = { name: 'boot' };
  let token = 0;
  let lastStore = '#/';
  let navOpts = {};
  const racks = {};
  const views = {};

  function parse(hash) {
    const h = (hash || '').replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (!a) return { name: 'store' };
    if (VX.SECTIONS.some((s) => s.key === a)) return { name: 'section', key: a };
    if (a === 'p' && VX.byId(b)) return { name: 'product', id: b, key: VX.byId(b).cat };
    if (a === 'login' || a === 'register') return { name: 'auth', mode: a };
    return { name: 'store' };
  }

  /* ---------------- views ---------------- */
  function show(name, delay = 0) {
    const t = token;
    Object.entries(views).forEach(([k, el]) => {
      const on = k === name;
      el.style.setProperty('--delay', on ? delay + 'ms' : '0ms');
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-hidden', !on);
      el.inert = !on;
    });
    // once a view fully covers the room, stop rendering the room
    setTimeout(() => t === token && name && VX.room.setPaused(true), delay + 900);
    document.body.dataset.view = name || 'store';
  }
  function hideAll() {
    VX.room.setPaused(false);
    show(null);
    document.body.dataset.view = 'store';
  }

  function rack(key) {
    if (!racks[key]) {
      const sec = VX.SECTIONS.find((s) => s.key === key);
      racks[key] = new VX.Rack(views['sec-' + key], sec, {
        onOpen: (p, rect) => {
          navOpts.fromRect = rect;
          navigate('#/p/' + p.id);
        },
      });
    }
    return racks[key];
  }
  function stopRacks(except) {
    Object.entries(racks).forEach(([k, r]) => k !== except && r.stop());
  }

  /* ---------------- router ---------------- */
  async function route() {
    const r = parse(location.hash);
    const prev = cur;
    const opts = navOpts;
    navOpts = {};
    cur = r;
    const t = ++token;
    if (r.name !== 'auth') lastStore = location.hash || '#/';
    syncChrome(r);

    if (r.name !== 'auth' && prev.name === 'auth') VX.auth.leave();
    if (r.name !== 'product') VX.viewer.stop();

    switch (r.name) {
      case 'store': {
        stopRacks();
        hideAll();
        await VX.room.overview(prev.name !== 'store');
        break;
      }
      case 'section': {
        const rk = rack(r.key);
        stopRacks(r.key);
        if (prev.name === 'product' && prev.key === r.key) {
          rk.focusOn(prev.id);
          rk.start();
          show('sec-' + r.key);
          break;
        }
        hideAll();
        const p = VX.room.focus(r.key);
        rk.start();
        show('sec-' + r.key, reduce ? 0 : 820);
        await p;
        break;
      }
      case 'product': {
        stopRacks();
        const p = VX.byId(r.id);
        const fromSection = prev.name === 'section' && prev.key === r.key;
        const fromProduct = prev.name === 'product';
        if (!fromSection && !fromProduct) {
          hideAll();
          VX.room.focus(r.key);
          await wait(reduce ? 0 : 850);
          if (t !== token) return;
        }
        show('product');
        VX.viewer.open(p, opts.fromRect);
        break;
      }
      case 'auth': {
        stopRacks();
        if (prev.name === 'auth') {
          VX.auth.enter(r.mode, opts);
          break;
        }
        hideAll();
        VX.room.whirl();
        await wait(reduce ? 0 : 520);
        if (t !== token) return;
        show('auth');
        VX.auth.enter(r.mode, { ...opts, fresh: true });
        break;
      }
    }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function navigate(hash, opts = {}) {
    navOpts = opts;
    if (location.hash === hash || (hash === '#/' && !location.hash)) route();
    else location.hash = hash;
  }

  function back() {
    if (cur.name === 'product') navigate('#/' + cur.key);
    else if (cur.name === 'section') navigate('#/');
    else if (cur.name === 'auth') navigate(lastStore);
  }

  /* ---------------- chrome: dock, top bar ---------------- */
  function syncChrome(r) {
    const key = r.name === 'store' ? 'store' : r.key || '';
    const dock = $('.dock');
    let active = null;
    dock.querySelectorAll('[data-go]').forEach((b) => {
      const on = b.dataset.go === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
      if (on) active = b;
    });
    moveIndicator(active);
    $('.back-btn').classList.toggle('show', r.name !== 'store');
  }
  function moveIndicator(b) {
    const ind = $('.dock-ind');
    if (!b) return (ind.style.opacity = 0);
    ind.style.opacity = 1;
    ind.style.width = b.offsetWidth + 'px';
    ind.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  function onAuthChange() {
    const u = VX.auth.user;
    const btn = $('.acct-btn');
    btn.classList.toggle('in', !!u);
    btn.querySelector('.initials').textContent = u ? u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '';
    $('.acct-menu .who').textContent = u ? `Signed in as ${u.name}` : '';
    VX.cart.render();
  }

  /* ---------------- toast + confetti ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function confetti() {
    if (reduce) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    c.width = innerWidth * devicePixelRatio;
    c.height = innerHeight * devicePixelRatio;
    document.body.appendChild(c);
    const g = c.getContext('2d');
    g.scale(devicePixelRatio, devicePixelRatio);
    const colors = ['#d4f52a', '#ff5a1c', '#111111', '#2b4fae', '#ff5fa2', '#ffffff'];
    const bits = Array.from({ length: 150 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 8,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach((b) => {
        b.vy += 0.42;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.r += b.vr;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.r);
        g.globalAlpha = Math.max(0, 1 - t / 2.6);
        g.fillStyle = b.c;
        // speed-bar shaped confetti, of course
        g.beginPath();
        g.moveTo(-b.w / 2 + 2, -2);
        g.lineTo(b.w / 2 + 2, -2);
        g.lineTo(b.w / 2 - 2, 2);
        g.lineTo(-b.w / 2 - 2, 2);
        g.fill();
        g.restore();
      });
      if (t < 2.8) requestAnimationFrame(frame);
      else c.remove();
    })(t0);
  }

  /* ---------------- intro ---------------- */
  function intro() {
    const el = $('#intro');
    const skip = reduce || sessionStorage.getItem('velox_intro');
    sessionStorage.setItem('velox_intro', '1');
    return new Promise((resolve) => {
      setTimeout(() => {
        el.classList.add('done');
        resolve();
        setTimeout(() => el.remove(), 1400);
      }, skip ? 300 : 2100);
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    document.querySelectorAll('.view').forEach((v) => (views[v.dataset.view] = v));
    VX.room.init($('.room'), (section) => navigate('#/' + section));
    VX.viewer.init(views.product, { onSwitch: (p) => navigate('#/p/' + p.id) });
    VX.auth.init(views.auth);
    VX.cart.init();
    onAuthChange();

    $('.dock').addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) navigate(b.dataset.go === 'store' ? '#/' : '#/' + b.dataset.go);
      if (e.target.closest('.info-btn')) $('.modal').classList.add('open');
    });
    $('.modal').addEventListener('click', (e) => {
      if (e.target.closest('[data-x]') || e.target === e.currentTarget) $('.modal').classList.remove('open');
    });
    $('.back-btn').addEventListener('click', back);
    $('.brand').addEventListener('click', (e) => {
      e.preventDefault();
      navigate('#/');
    });
    $('.cart-btn').addEventListener('click', () => VX.cart.open());
    $('.acct-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!VX.auth.user) return navigate('#/login');
      $('.acct-menu').classList.toggle('open');
    });
    document.addEventListener('click', () => $('.acct-menu').classList.remove('open'));
    $('.acct-menu .out').addEventListener('click', () => {
      VX.auth.signOut();
      toast('Signed out. See you soon!');
    });

    addEventListener('keydown', (e) => {
      if (e.target.closest('input,textarea') || document.body.classList.contains('drawer-open')) return;
      if (e.key === 'Escape') {
        if ($('.modal').classList.contains('open')) return $('.modal').classList.remove('open');
        return back();
      }
      if (cur.name === 'section' && racks[cur.key] && racks[cur.key].key(e)) e.preventDefault();
      else if (cur.name === 'product' && VX.viewer.key(e)) e.preventDefault();
    });
    addEventListener('resize', () => {
      moveIndicator($('.dock .on'));
      Object.values(racks).forEach((r) => r.measure());
    });
    addEventListener('hashchange', route);

    // fonts change the dock button widths; re-place the indicator when they land
    document.fonts && document.fonts.ready.then(() => moveIndicator($('.dock .on')));

    intro().then(() => {
      const r = parse(location.hash);
      if (r.name === 'store') {
        cur = r;
        syncChrome(r);
        VX.room.intro();
      } else {
        VX.room.intro();
        setTimeout(route, reduce ? 0 : 900);
      }
    });
  }

  VX.app = { navigate, toast, confetti, onAuthChange, lastStoreHash: () => lastStore };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
