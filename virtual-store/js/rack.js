/* VELOX Virtual Store — section carousel.
 * Products hang from a rail (or sit on a shelf). The rail is driven by a spring,
 * and every hanging item is its own little pendulum that swings when the rail
 * accelerates. Drag, scroll, arrow keys or click to browse. */
(function () {
  const VX = window.VX;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  class Rack {
    constructor(root, section, { onOpen }) {
      this.root = root;
      this.sec = section;
      this.items = VX.byCat(section.key);
      this.onOpen = onOpen;
      this.pos = 0;
      this.target = 0;
      this.v = 0;
      this.vPrev = 0;
      this.swing = this.items.map(() => ({ a: 0, w: 0 }));
      this.running = false;
      this.shown = -1;
      this.build();
      this.bind();
    }

    build() {
      const s = this.sec;
      this.root.innerHTML = `
        <div class="sec sec--${s.mode}" data-cat="${s.key}">
          <header class="sec-head">
            <div class="wordmark wordmark--xl"><span>VELOX</span>${VX.markSVG()}</div>
            <div class="sec-tag">${s.title}<small>${this.items.length} styles</small></div>
          </header>
          <div class="sec-track">
            <div class="sec-bar"></div>
            <div class="sec-items">${this.items
              .map((p, i) => `<button class="sec-item" data-i="${i}" aria-label="${p.name}"><div class="sec-art">${VX.art(p)}</div><span class="sec-shadow"></span></button>`)
              .join('')}</div>
          </div>
          <div class="sec-info"><div class="sec-name"></div><div class="sec-meta"></div></div>
          <button class="round-btn sec-prev" aria-label="Previous">${icon('left')}</button>
          <button class="round-btn sec-next" aria-label="Next">${icon('right')}</button>
          <p class="sec-hint">Drag, scroll or use ← → · click the center piece to open it</p>
        </div>`;
      this.el = this.root.firstElementChild;
      this.track = this.el.querySelector('.sec-track');
      this.nodes = [...this.el.querySelectorAll('.sec-item')];
      this.nameEl = this.el.querySelector('.sec-name');
      this.metaEl = this.el.querySelector('.sec-meta');
      this.measure();
    }

    measure() {
      const vw = innerWidth, vh = innerHeight;
      const asp = VX.ASPECT[this.sec.key];
      let w;
      if (this.sec.key === 'shoes') w = Math.min(vw * 0.36, 440, (vh * 0.36) / asp);
      else if (this.sec.key === 'clothing') w = Math.min((vh * 0.44) / asp, vw * 0.42, 380);
      else w = Math.min((vh * 0.38) / asp, vw * 0.38, 330);
      this.w = w;
      this.h = w * asp;
      this.el.style.setProperty('--iw', w + 'px');
      this.el.style.setProperty('--ih', this.h + 'px');
    }

    layoutX(d) {
      const a = Math.abs(d);
      const first = this.w * (this.sec.key === 'shoes' ? 0.8 : 0.82);
      const rest = this.w * (this.sec.key === 'shoes' ? 0.52 : 0.55);
      const x = a <= 1 ? a * first : first + (a - 1) * rest;
      return Math.sign(d) * x;
    }

    bind() {
      const tr = this.track;
      let drag = null;
      tr.addEventListener('pointerdown', (e) => {
        drag = { x: e.clientX, start: this.target, moved: 0, lastX: e.clientX, t: performance.now(), vx: 0 };
        tr.setPointerCapture(e.pointerId);
        this.el.classList.add('is-dragging');
      });
      tr.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const now = performance.now();
        const dx = e.clientX - drag.x;
        drag.moved = Math.max(drag.moved, Math.abs(dx));
        const unit = this.w * 0.55;
        this.target = this.clamp(drag.start - dx / unit, 0.35);
        const inst = -(e.clientX - drag.lastX) / unit / Math.max(0.008, (now - drag.t) / 1000);
        drag.vx = drag.vx * 0.7 + inst * 0.3;
        drag.lastX = e.clientX;
        drag.t = now;
      });
      const up = (e) => {
        if (!drag) return;
        this.el.classList.remove('is-dragging');
        if (drag.moved < 6) {
          // pointer capture retargets the event to the track, so hit-test manually
          const hit = document.elementFromPoint(e.clientX, e.clientY);
          const node = hit && hit.closest('.sec-item');
          if (node) this.pick(+node.dataset.i);
        } else {
          this.go(Math.round(this.target + drag.vx * 0.18));
        }
        drag = null;
      };
      tr.addEventListener('pointerup', up);
      tr.addEventListener('pointercancel', up);

      let acc = 0, lastWheel = 0;
      this.el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const now = performance.now();
        if (now - lastWheel > 250) acc = 0;
        lastWheel = now;
        acc += d;
        if (Math.abs(acc) > 60) {
          this.go(Math.round(this.target) + Math.sign(acc));
          acc = 0;
        }
      }, { passive: false });

      this.el.querySelector('.sec-prev').addEventListener('click', () => this.go(Math.round(this.target) - 1));
      this.el.querySelector('.sec-next').addEventListener('click', () => this.go(Math.round(this.target) + 1));
      // keyboard focus on an item centres it
      this.nodes.forEach((n, i) => n.addEventListener('focus', () => this.go(i)));
    }

    clamp(v, over = 0) {
      return Math.max(-over, Math.min(this.items.length - 1 + over, v));
    }
    go(i) {
      this.target = this.clamp(i);
    }
    pick(i) {
      if (Math.round(this.pos) === i && Math.abs(this.pos - i) < 0.2) {
        const art = this.nodes[i].querySelector('.sec-art');
        this.onOpen(this.items[i], art.getBoundingClientRect());
      } else this.go(i);
    }
    key(e) {
      if (e.key === 'ArrowRight') this.go(Math.round(this.target) + 1);
      else if (e.key === 'ArrowLeft') this.go(Math.round(this.target) - 1);
      else if (e.key === 'Enter' && !e.target.closest('button')) this.pick(Math.round(this.target));
      else return false;
      return true;
    }
    focusOn(id) {
      const i = this.items.findIndex((p) => p.id === id);
      if (i >= 0) {
        this.target = i;
        this.pos = i;
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.measure();
      let last = performance.now();
      const tick = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.04, (now - last) / 1000);
        last = now;
        this.update(dt, now / 1000);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    stop() {
      this.running = false;
    }

    update(dt, t) {
      // critically damped spring toward target
      const k = 70, c = 2 * Math.sqrt(k);
      this.v += ((this.target - this.pos) * k - this.v * c) * dt;
      this.pos += this.v * dt;
      const acc = (this.v - this.vPrev) / Math.max(dt, 0.001);
      this.vPrev = this.v;

      const hang = this.sec.mode !== 'shelf';
      this.nodes.forEach((n, i) => {
        const d = i - this.pos;
        const a = Math.abs(d);
        const s = 1 - 0.42 * Math.min(a, 1);
        const x = this.layoutX(d);
        let rot = 0;
        if (hang && !reduce) {
          const sw = this.swing[i];
          sw.w += (-46 * sw.a - 3.6 * sw.w - acc * 2.1) * dt;
          sw.a = Math.max(-18, Math.min(18, sw.a + sw.w * dt));
          rot = sw.a + Math.sin(t * 1.3 + i * 1.7) * 0.7;
        }
        const lift = !hang ? Math.sin(t * 1.6 + i) * (a < 0.5 ? 4 : 1.5) : 0;
        n.style.transform = `translate3d(${x.toFixed(1)}px, ${lift.toFixed(1)}px, 0) scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        n.style.zIndex = 100 - Math.round(a * 4);
        n.style.opacity = a > 6 ? Math.max(0, 7 - a) : 1;
        n.classList.toggle('is-center', a < 0.5);
      });

      const idx = Math.round(Math.max(0, Math.min(this.items.length - 1, this.pos)));
      if (idx !== this.shown) {
        this.shown = idx;
        const p = this.items[idx];
        const info = this.el.querySelector('.sec-info');
        info.classList.remove('in');
        void info.offsetWidth;
        this.nameEl.textContent = p.name;
        this.metaEl.textContent = `${VX.money(p.price)} · ${p.variants.length} colors`;
        info.classList.add('in');
      }
    }
  }

  function icon(n) {
    const d = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7' }[n];
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }

  VX.Rack = Rack;
  VX.icon = icon;
})();
