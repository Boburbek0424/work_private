/* VELOX Virtual Store — 360° product viewer.
 * The product is a real 3D object: a front face, a back face and a stack of
 * silhouette slices between them for thickness. Drag to turn it (with inertia),
 * pick a view, or let it spin. */
(function () {
  const VX = window.VX;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DEPTH = { clothing: [26, 8], shoes: [96, 26], caps: [70, 18], backpack: [58, 14], duffel: [92, 20], crossbody: [22, 6], waist: [40, 10] };
  const VIEWS = [
    { key: 'front', label: 'Front', a: 0 },
    { key: 'side', label: 'Side', a: 70 },
    { key: 'back', label: 'Back', a: 180 },
  ];

  let root, els, opts;
  let product = null, variant = 0, size = null, list = [];
  let angle = 0, vel = 0, target = null, spin = false, drag = null, lastInput = 0;
  let running = false, addedTimer = 0;

  function init(el, o) {
    root = el;
    opts = o;
    root.innerHTML = `
      <div class="pv">
        <div class="pv-stage">
          <div class="pv-wrap"><div class="pv-rail"></div><div class="pv-floor"></div><div class="pv-obj"></div></div>
          <button class="round-btn pv-prev" aria-label="Previous product">${VX.icon('left')}</button>
          <button class="round-btn pv-next" aria-label="Next product">${VX.icon('right')}</button>
          <div class="pv-views">${VIEWS.map((v) => `<button data-v="${v.key}">${v.label}</button>`).join('')}<button data-v="spin" class="pv-spin"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg>360°</button></div>
          <div class="pv-foot"><span class="pv-count"></span> · drag or pick a view to turn</div>
        </div>
        <aside class="pv-card">
          <div class="pv-cat"></div>
          <h2 class="pv-name"></h2>
          <div class="pv-price"></div>
          <div class="pv-colorname"></div>
          <div class="pv-swatches" role="radiogroup" aria-label="Color"></div>
          <div class="pv-size-head"><span>Select size</span><span class="pv-fit"></span></div>
          <div class="pv-sizes" role="radiogroup" aria-label="Size"></div>
          <div class="pv-err" aria-live="polite"></div>
          <button class="btn-primary pv-add"><span class="t">Add to Cart</span></button>
          <button class="link-btn pv-viewcart">View cart →</button>
          <p class="pv-desc"></p>
          <ul class="pv-perks"><li>Free shipping over $75</li><li>Free 30-day returns</li></ul>
        </aside>
      </div>`;
    const q = (s) => root.querySelector(s);
    els = {
      stage: q('.pv-stage'), wrap: q('.pv-wrap'), obj: q('.pv-obj'), floor: q('.pv-floor'), card: q('.pv-card'),
      cat: q('.pv-cat'), name: q('.pv-name'), price: q('.pv-price'), colorName: q('.pv-colorname'), swatches: q('.pv-swatches'),
      sizes: q('.pv-sizes'), fit: q('.pv-fit'), err: q('.pv-err'), add: q('.pv-add'), viewCart: q('.pv-viewcart'),
      desc: q('.pv-desc'), count: q('.pv-count'), views: q('.pv-views'),
    };
    bind();
  }

  /* ------------------------------------------------------------------ */
  function buildObj(p) {
    const [depth, n] = DEPTH[p.cat === 'bags' ? p.style : p.cat];
    const silColor = VX.shade(p.color, -0.32);
    const sil = VX.art(p, 'front', { sil: p.cat === 'shoes' ? true : silColor });
    let h = `<div class="pv-face pv-front" style="transform:translateZ(${depth / 2}px)">${VX.art(p, 'front')}</div>`;
    for (let i = 1; i < n; i++) {
      const z = -depth / 2 + (depth * i) / n;
      h += `<div class="pv-slice" style="transform:translateZ(${z.toFixed(2)}px)">${sil}</div>`;
    }
    h += `<div class="pv-face pv-back" style="transform:rotateY(180deg) translateZ(${depth / 2}px)">${VX.art(p, 'back')}</div>`;
    els.obj.innerHTML = h;
    els.wrap.dataset.cat = p.cat;
    els.front = els.obj.querySelector('.pv-front');
    els.back = els.obj.querySelector('.pv-back');
  }

  function sizeObj(p) {
    const asp = VX.ASPECT[p.cat];
    const vw = innerWidth, vh = innerHeight;
    const narrow = vw < 860;
    let w;
    if (p.cat === 'shoes') w = Math.min(narrow ? vw * 0.82 : vw * 0.42, 600);
    else if (p.cat === 'clothing') w = Math.min(((narrow ? 0.44 : 0.66) * vh) / asp, narrow ? vw * 0.7 : 520);
    else w = Math.min(((narrow ? 0.36 : 0.5) * vh) / asp, narrow ? vw * 0.66 : 440);
    els.wrap.style.width = w + 'px';
    els.wrap.style.height = w * asp + 'px';
    els.obj.style.setProperty('--pw', w + 'px');
  }

  function renderInfo() {
    const p = VX.withVariant(product, variant);
    const sec = VX.SECTIONS.find((s) => s.key === p.cat);
    els.cat.textContent = sec.title;
    els.name.textContent = p.name;
    els.price.textContent = VX.money(p.price);
    els.colorName.textContent = p.variants[variant].name;
    els.desc.textContent = p.desc;
    els.fit.textContent = p.cat === 'clothing' ? 'Unisex fit' : p.cat === 'shoes' ? "Men's sizing" : '';
    els.swatches.innerHTML = p.variants
      .map((v, i) => `<button role="radio" aria-checked="${i === variant}" class="${i === variant ? 'on' : ''}" data-i="${i}" title="${v.name}">${VX.art(VX.withVariant(product, i))}</button>`)
      .join('');
    els.sizes.innerHTML = p.sizes
      .map((s) => `<button role="radio" aria-checked="${s === size}" class="${s === size ? 'on' : ''}" data-s="${s}">${s}</button>`)
      .join('');
    els.sizes.dataset.n = p.sizes.length;
    const i = list.findIndex((x) => x.id === p.id);
    els.count.textContent = `${i + 1} of ${list.length}`;
    els.err.textContent = '';
  }

  /* ------------------------------------------------------------------ */
  function open(p, fromRect) {
    const changing = product && product.id !== p.id;
    product = p;
    variant = 0;
    size = p.sizes.length === 1 ? p.sizes[0] : null;
    list = VX.byCat(p.cat);
    resetAdd();
    buildObj(VX.withVariant(p, 0));
    sizeObj(p);
    renderInfo();
    spin = false;
    target = null;
    vel = 0;
    lastInput = performance.now();
    // signature reveal: a full 360° turn as it lands
    angle = reduce ? 0 : -360;
    target = 0;
    syncViews();
    if (fromRect && !reduce) flipFrom(fromRect);
    if (changing) {
      els.card.classList.remove('swap');
      void els.card.offsetWidth;
      els.card.classList.add('swap');
    }
    start();
  }

  // FLIP: start the object exactly where the carousel item was, then glide in
  function flipFrom(r) {
    const w = els.wrap;
    w.style.transition = 'none';
    w.style.transform = '';
    const to = w.getBoundingClientRect();
    if (!to.width) return;
    const sx = r.width / to.width;
    w.style.transform = `translate(${r.left - to.left}px, ${r.top - to.top}px) scale(${sx})`;
    w.style.transformOrigin = '0 0';
    void w.offsetWidth;
    w.style.transition = 'transform .95s cubic-bezier(.2,.8,.15,1)';
    w.style.transform = '';
  }

  function switchTo(dir) {
    const i = list.findIndex((x) => x.id === product.id);
    const next = list[(i + dir + list.length) % list.length];
    els.wrap.classList.remove('slide-l', 'slide-r');
    void els.wrap.offsetWidth;
    els.wrap.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    opts.onSwitch(next);
  }

  function setVariant(i) {
    if (i === variant) return;
    variant = i;
    const p = VX.withVariant(product, i);
    buildObj(p);
    renderInfo();
    // spin a full turn into the new colorway
    if (!reduce) {
      target = Math.round(angle / 360) * 360;
      angle = target - 360;
    }
    lastInput = performance.now();
  }

  function setView(key) {
    lastInput = performance.now();
    if (key === 'spin') {
      spin = !spin;
      target = null;
      syncViews();
      return;
    }
    spin = false;
    const v = VIEWS.find((x) => x.key === key);
    // nearest equivalent angle so it always takes the short way round
    const base = Math.round((angle - v.a) / 360) * 360;
    target = base + v.a;
    syncViews(key);
  }
  function syncViews(key) {
    els.views.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === 'spin' ? spin : b.dataset.v === key);
    });
  }

  /* ------------------------------------------------------------------ */
  function bind() {
    const st = els.stage;
    st.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      drag = { x: e.clientX, lastX: e.clientX, t: performance.now() };
      spin = false;
      target = null;
      vel = 0;
      syncViews();
      st.setPointerCapture(e.pointerId);
      st.classList.add('is-grabbing');
    });
    st.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const now = performance.now();
      const dx = e.clientX - drag.lastX;
      angle += dx * 0.5;
      vel = vel * 0.5 + ((dx * 0.5) / Math.max(0.008, (now - drag.t) / 1000)) * 0.5;
      drag.lastX = e.clientX;
      drag.t = now;
      lastInput = now;
    });
    const up = () => {
      if (!drag) return;
      drag = null;
      lastInput = performance.now();
      st.classList.remove('is-grabbing');
    };
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);

    root.querySelector('.pv-next').addEventListener('click', () => switchTo(1));
    root.querySelector('.pv-prev').addEventListener('click', () => switchTo(-1));
    els.views.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) setView(b.dataset.v);
    });
    els.swatches.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) setVariant(+b.dataset.i);
    });
    els.sizes.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      size = b.dataset.s;
      els.err.textContent = '';
      els.sizes.querySelectorAll('button').forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-checked', x === b);
      });
    });
    els.add.addEventListener('click', add);
    els.viewCart.addEventListener('click', () => VX.cart.open());
    addEventListener('resize', () => product && sizeObj(product));
  }

  function add() {
    if (!size) {
      els.err.textContent = 'Please select a size';
      els.sizes.classList.remove('shake');
      void els.sizes.offsetWidth;
      els.sizes.classList.add('shake');
      return;
    }
    const p = VX.withVariant(product, variant);
    VX.cart.add(p, size);
    flyToCart();
    els.add.classList.add('done');
    els.add.querySelector('.t').textContent = 'Added to cart ✓';
    els.viewCart.classList.add('show');
    clearTimeout(addedTimer);
    addedTimer = setTimeout(resetAdd, 2600);
  }
  function resetAdd() {
    if (!els) return;
    els.add.classList.remove('done');
    els.add.querySelector('.t').textContent = 'Add to Cart';
  }

  // a little copy of the product arcs into the bag icon
  function flyToCart() {
    const from = els.front.getBoundingClientRect();
    const to = document.querySelector('.cart-btn').getBoundingClientRect();
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.className = 'fly';
    inner.innerHTML = VX.art(VX.withVariant(product, variant));
    outer.appendChild(inner);
    const w = Math.min(from.width, 220);
    Object.assign(outer.style, { left: from.left + from.width / 2 - w / 2 + 'px', top: from.top + 'px', width: w + 'px' });
    document.body.appendChild(outer);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + w * 0.5);
    const dur = reduce ? 300 : 900;
    outer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { duration: dur, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    inner.animate(
      [
        { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1 },
        { transform: `translateY(${Math.min(-80, dy * 0.2)}px) scale(.6) rotate(-12deg)`, opacity: 1, offset: 0.35 },
        { transform: `translateY(${dy}px) scale(.08) rotate(25deg)`, opacity: 0.6 },
      ],
      { duration: dur, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' }
    ).onfinish = () => {
      outer.remove();
      VX.cart.bump();
    };
  }

  /* ------------------------------------------------------------------ */
  function start() {
    if (running) return;
    running = true;
    let last = performance.now();
    const tick = (now) => {
      if (!running) return;
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!drag) {
        if (spin) {
          vel += (48 - vel) * Math.min(1, dt * 2);
          angle += vel * dt;
        } else if (target !== null) {
          const k = 26, c = 2 * Math.sqrt(k) * 0.92;
          vel += ((target - angle) * k - vel * c) * dt;
          angle += vel * dt;
          if (Math.abs(target - angle) < 0.05 && Math.abs(vel) < 0.5) {
            angle = target;
            target = null;
            vel = 0;
          }
        } else {
          angle += vel * dt;
          vel *= Math.pow(0.06, dt); // inertia decay
        }
      }
      const idle = !spin && !drag && target === null && now - lastInput > 3500 && !reduce;
      const sway = idle ? Math.sin(now / 1400) * 9 * Math.min(1, (now - lastInput - 3500) / 2000) : 0;
      const a = angle + sway;
      const tilt = -4 + Math.sin(now / 2100) * (reduce ? 0 : 1.2);
      els.obj.style.transform = `rotateX(${tilt.toFixed(2)}deg) rotateY(${a.toFixed(2)}deg)`;
      const cos = Math.cos((a * Math.PI) / 180);
      els.front.style.setProperty('--lit', (0.72 + 0.28 * Math.max(0, cos)).toFixed(3));
      els.back.style.setProperty('--lit', (0.72 + 0.28 * Math.max(0, -cos)).toFixed(3));
      els.floor.style.transform = `translateX(-50%) scaleX(${(0.55 + 0.45 * Math.abs(cos)).toFixed(3)})`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
  }
  function key(e) {
    if (e.key === 'ArrowRight') switchTo(1);
    else if (e.key === 'ArrowLeft') switchTo(-1);
    else return false;
    return true;
  }

  VX.viewer = { init, open, stop, start, key, get product() { return product; } };
})();
