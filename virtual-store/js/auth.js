/* VELOX Virtual Store — Sign in / Join pages.
 * The card is a two-sided 3D object. Switching between sign-in and join spins it
 * a full 360°: at the halfway point the branded back faces you, the form is
 * swapped while hidden, and the new form comes round to the front.
 * Accounts live in localStorage — this is a front-end demo, not real auth. */
(function () {
  const VX = window.VX;
  const USERS = 'velox_users';
  const SESSION = 'velox_session';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let root, card, front, scene, wrap;
  let mode = 'login';
  let angle = 0, anim = null, tiltX = 0, tiltY = 0, tx = 0, ty = 0, z = 0, scale = 1;
  let running = false;
  let next = null;
  let queue = Promise.resolve(); // spins run one after another, never on top of each other

  /* ---------------- storage ---------------- */
  const read = (k, store = localStorage) => {
    try {
      return JSON.parse(store.getItem(k));
    } catch (e) {
      return null;
    }
  };
  const write = (k, v, store = localStorage) => {
    try {
      store.setItem(k, JSON.stringify(v));
    } catch (e) {}
  };
  let user = read(SESSION) || read(SESSION, sessionStorage);

  async function hash(str) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'x' + (h >>> 0).toString(16);
  }

  /* ---------------- markup ---------------- */
  const eye = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const field = (name, label, type = 'text', auto = '') => `
    <div class="field" data-f="${name}">
      <input id="f-${name}" name="${name}" type="${type}" placeholder=" " autocomplete="${auto}" ${type === 'email' ? 'inputmode="email"' : ''}/>
      <label for="f-${name}">${label}</label>
      ${type === 'password' ? `<button type="button" class="eye" aria-label="Show password">${eye}</button>` : ''}
      <small class="msg"></small>
    </div>`;

  function formHTML(m) {
    if (m === 'login') {
      return `<form class="auth-form" novalidate>
        <div class="auth-top"><div class="auth-badge">${VX.markSVG()}</div><span class="auth-step">Member sign in</span></div>
        <h2>Welcome back</h2><p class="auth-sub">Sign in to keep shopping, track orders and save your favourites.</p>
        ${field('email', 'Email address', 'email', 'email')}
        ${field('password', 'Password', 'password', 'current-password')}
        <div class="auth-row"><label class="check"><input type="checkbox" name="remember" checked/><i></i>Keep me signed in</label><button type="button" class="link-btn forgot">Forgot password?</button></div>
        <button class="btn-primary auth-submit" type="submit"><span class="t">Sign in</span><span class="spin"></span></button>
        <div class="auth-or"><span>or</span></div>
        <button type="button" class="btn-ghost guest">Continue as guest</button>
        <p class="auth-switch">New to VELOX? <a href="#/register">Create an account</a></p>
      </form>`;
    }
    return `<form class="auth-form" novalidate>
      <div class="auth-top"><div class="auth-badge">${VX.markSVG()}</div><span class="auth-step">New member</span></div>
      <h2>Become a member</h2><p class="auth-sub">Free to join. Early drops, member pricing and free returns.</p>
      ${field('name', 'Full name', 'text', 'name')}
      ${field('email', 'Email address', 'email', 'email')}
      ${field('password', 'Password', 'password', 'new-password')}
      <div class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i><span>Use 8+ characters</span></div>
      ${field('confirm', 'Confirm password', 'password', 'new-password')}
      <label class="check terms"><input type="checkbox" name="terms"/><i></i>I agree to the Terms &amp; Privacy Policy</label>
      <small class="msg terms-msg"></small>
      <button class="btn-primary auth-submit" type="submit"><span class="t">Create account</span><span class="spin"></span></button>
      <p class="auth-switch">Already a member? <a href="#/login">Sign in</a></p>
    </form>`;
  }

  function successHTML(name, joined) {
    return `<div class="auth-ok">
      <svg class="ok-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
      <h2>${joined ? 'Welcome to the team' : 'Welcome back'}, ${escapeHTML(name.split(' ')[0])}!</h2>
      <p class="auth-sub">${joined ? 'Your member account is ready.' : 'You are signed in.'} Taking you back to the store…</p></div>`;
  }

  function ringHTML() {
    const text = 'VELOX MEMBERS • JUST MOVE • VIRTUAL STORE • ';
    const chars = [...text];
    const step = 360 / chars.length;
    return chars.map((ch, i) => `<span style="transform:translate(-50%,-50%) rotateY(${(i * step).toFixed(2)}deg) translateZ(var(--r))">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  }

  function init(el) {
    root = el;
    root.innerHTML = `
      <div class="auth">
        <div class="auth-bg"><i class="orb o1"></i><i class="orb o2"></i><i class="orb o3"></i><div class="auth-giant">VELOX</div></div>
        <div class="auth-scene">
          <div class="auth-3d">
            <div class="ring-pos"><div class="ring">${ringHTML()}</div></div>
            <div class="auth-card">
              <div class="auth-face auth-front"></div>
              <div class="auth-face auth-back">
                <div class="back-stripes"></div>
                <div class="back-mark">${VX.markSVG()}</div>
                <div class="back-word">VELOX</div>
                <div class="back-sub">MEMBERS · EST. 2026</div>
              </div>
            </div>
          </div>
        </div>
        <p class="auth-note">Demo only — accounts are stored in this browser.</p>
      </div>`;
    scene = root.querySelector('.auth-scene');
    wrap = root.querySelector('.auth-3d');
    card = root.querySelector('.auth-card');
    front = root.querySelector('.auth-front');
    setContent(formHTML(mode));
    bindTilt();
    front.addEventListener('submit', onSubmit);
    front.addEventListener('input', onInput);
    front.addEventListener('click', onClick);
  }

  function setContent(html) {
    front.innerHTML = html;
    measure();
  }
  function measure() {
    const h = front.firstElementChild.offsetHeight + 64;
    card.style.height = h + 'px';
  }

  /* ---------------- the 360° spin ---------------- */
  const easeSpin = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

  // Spin a full turn. `swap` runs while the back of the card faces the viewer.
  function spin360({ swap, dur = 1250, from = 0, entrance = false } = {}) {
    if (reduce) {
      swap && swap();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      let swapped = false;
      const base = 0;
      anim = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const k = easeSpin(t);
        angle = base + from + (360 - from) * k;
        const rel = angle - base;
        if (!swapped && rel >= 180) {
          swapped = true;
          swap && swap();
        }
        const dip = Math.sin(Math.PI * t);
        z = entrance ? -900 * (1 - k) : -160 * dip;
        scale = entrance ? 0.55 + 0.45 * k : 1 - 0.06 * dip;
        card.style.opacity = entrance ? Math.min(1, t * 3) : 1;
        if (t >= 1) {
          anim = null;
          // normalise: a card left at rotateY(720deg) looks identical but Chrome stops hit-testing it
          angle = 0;
          z = 0;
          scale = 1;
          resolve();
        }
      };
    });
  }

  function loop(now) {
    if (!running) return;
    anim && anim(now);
    tiltX += (tx - tiltX) * 0.08;
    tiltY += (ty - tiltY) * 0.08;
    card.style.transform = `translateZ(${z.toFixed(1)}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${(angle + tiltY).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    requestAnimationFrame(loop);
  }

  function bindTilt() {
    root.addEventListener('pointermove', (e) => {
      if (reduce || e.pointerType === 'touch') return;
      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const ny = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      tx = -ny * 10;
      ty = nx * 14;
    });
    root.addEventListener('pointerleave', () => (tx = ty = 0));
    addEventListener('resize', () => front.firstElementChild && measure());
  }

  /* ---------------- enter / switch ---------------- */
  function enter(m, opts = {}) {
    next = opts.next || next;
    const was = mode;
    mode = m;
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
    if (opts.fresh) {
      // fly in from deep space with a full turn
      setContent(formHTML(m));
      angle = 0;
      return spin360({ entrance: true, dur: 1500 }).then(() => focusFirst());
    }
    if (was !== m) {
      queue = queue.then(() => spin360({ swap: () => setContent(formHTML(m)) })).then(focusFirst);
      return queue;
    }
  }
  function leave() {
    running = false;
  }
  function focusFirst() {
    const i = front.querySelector('input');
    if (i && matchMedia('(pointer:fine)').matches) i.focus({ preventScroll: true });
  }

  /* ---------------- validation ---------------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function strength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
    return s;
  }
  function setErr(name, msg) {
    const f = front.querySelector(`[data-f="${name}"]`);
    if (!f) return;
    f.classList.toggle('bad', !!msg);
    f.querySelector('.msg').textContent = msg || '';
  }
  function onInput(e) {
    const f = e.target.closest('.field');
    if (f && f.classList.contains('bad')) {
      setErr(f.dataset.f, '');
      measure();
    }
    if (e.target.name === 'password' && mode === 'register') {
      const s = strength(e.target.value);
      const m = front.querySelector('.meter');
      m.dataset.s = e.target.value ? s : 0;
      m.querySelector('span').textContent = e.target.value ? ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'][s] : 'Use 8+ characters';
    }
    if (e.target.name === 'terms' && front.querySelector('.terms-msg').textContent) {
      front.querySelector('.terms-msg').textContent = '';
      measure();
    }
  }
  function onClick(e) {
    const eyeBtn = e.target.closest('.eye');
    if (eyeBtn) {
      const i = eyeBtn.parentElement.querySelector('input');
      i.type = i.type === 'password' ? 'text' : 'password';
      eyeBtn.classList.toggle('on', i.type === 'text');
    }
    if (e.target.closest('.forgot')) VX.app.toast('Demo store: try creating a new account instead 🙂');
    if (e.target.closest('.guest')) {
      VX.app.toast('Browsing as guest');
      VX.app.navigate(VX.app.lastStoreHash());
    }
  }
  function shake() {
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
  }

  async function onSubmit(e) {
    e.preventDefault();
    const fm = e.target;
    const v = Object.fromEntries(new FormData(fm).entries());
    const email = (v.email || '').trim().toLowerCase();
    let ok = true;
    const fail = (n, m) => {
      setErr(n, m);
      ok = false;
    };
    if (!EMAIL.test(email)) fail('email', 'Enter a valid email address');
    if (mode === 'register') {
      if ((v.name || '').trim().length < 2) fail('name', 'Tell us your name');
      if ((v.password || '').length < 8) fail('password', 'At least 8 characters');
      else if (strength(v.password) < 2) fail('password', 'Add a number or a capital letter');
      if (v.confirm !== v.password) fail('confirm', "Passwords don't match");
      if (!v.terms) {
        front.querySelector('.terms-msg').textContent = 'Please accept the terms';
        ok = false;
      }
    } else if (!v.password) fail('password', 'Enter your password');
    if (!ok) {
      measure();
      return shake();
    }

    const btn = fm.querySelector('.auth-submit');
    btn.classList.add('loading');
    btn.disabled = true;
    await new Promise((r) => setTimeout(r, 650));
    const users = read(USERS) || {};
    let name;
    if (mode === 'register') {
      if (users[email]) {
        btn.classList.remove('loading');
        btn.disabled = false;
        setErr('email', 'That email already has an account — sign in instead');
        measure();
        return shake();
      }
      const salt = Math.random().toString(36).slice(2);
      users[email] = { name: v.name.trim(), salt, hash: await hash(salt + v.password), joined: Date.now() };
      write(USERS, users);
      name = v.name.trim();
    } else {
      const u = users[email];
      if (!u || (await hash(u.salt + v.password)) !== u.hash) {
        btn.classList.remove('loading');
        btn.disabled = false;
        setErr('password', 'Email or password is incorrect');
        measure();
        return shake();
      }
      name = u.name;
    }
    user = { email, name };
    const remember = mode === 'register' || !!v.remember;
    write(SESSION, remember ? user : null);
    write(SESSION, remember ? null : user, sessionStorage);
    VX.app.onAuthChange();
    const joined = mode === 'register';
    await spin360({ swap: () => setContent(successHTML(name, joined)) });
    VX.app.confetti();
    setTimeout(() => {
      const target = next === 'checkout' ? '#/' : VX.app.lastStoreHash();
      const openBag = next === 'checkout';
      next = null;
      VX.app.navigate(target);
      if (openBag) setTimeout(() => VX.cart.open(), 1300);
    }, 1400);
  }

  function signOut() {
    user = null;
    write(SESSION, null);
    write(SESSION, null, sessionStorage);
    VX.app.onAuthChange();
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  VX.auth = { init, enter, leave, signOut, escapeHTML, get user() { return user; }, get mode() { return mode; } };
})();
