/* VELOX Virtual Store — the 3D room.
 * A CSS-3D box (4 walls + floor + ceiling) and a JS camera that orbits,
 * dollies and tweens between walls. No WebGL: everything is real DOM, so
 * the product art on the walls is crisp at any zoom. */
(function () {
  const VX = window.VX;
  const W = 1800; // wall width (room is square)
  const H = 1000; // wall height
  const HALF = W / 2;
  const P = 1000; // perspective distance, must match CSS
  const D2R = Math.PI / 180;

  // which wall each section lives on (camera yaw that faces it)
  const WALL_YAW = { clothing: 0, shoes: 90, bags: 180, caps: -90 };
  const OVERVIEW = { back: 400, y: 20, pitch: 0 };

  const cam = { yaw: -200, back: 900, y: -220, pitch: 9 };
  const ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 4),
    expo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  let world, stage, wrapEl;
  let tw = null;
  let mode = 'intro'; // intro | store | focus | away
  let vel = 0; // yaw velocity (deg/s) for drag inertia + auto orbit
  let drag = null;
  let lastInput = 0;
  let mx = 0, my = 0, px = 0, py = 0;
  let paused = false;
  let onPick = () => {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* building the room                                                   */
  /* ------------------------------------------------------------------ */
  const sv = (p, w) => `<div class="w-art" style="width:${w}px">${VX.art(p)}</div>`;
  const wordmark = (cls = '') => `<div class="wordmark ${cls}"><span>VELOX</span>${VX.markSVG()}</div>`;

  function clothingWall() {
    const items = VX.byCat('clothing');
    const x0 = 410, x1 = 1390;
    let h = wordmark('w-logo') + `<div class="rail" style="left:330px;top:330px;width:1140px"><i></i><i></i></div>`;
    items.forEach((p, i) => {
      const x = x0 + ((x1 - x0) * i) / (items.length - 1);
      h += `<div class="w-item sway" data-id="${p.id}" style="left:${x}px;top:326px;--d:${(i * 0.37) % 2}s">${sv(p, 100)}</div>`;
    });
    return h;
  }

  function shoesWall() {
    const items = VX.byCat('shoes');
    let h = `<div class="sign-wrap"><i></i><i></i><div class="sign">SHOES</div></div>
      <div class="panel wood" style="left:440px;top:230px;width:920px;height:560px">`;
    [0, 1, 2].forEach((r) =>
      [0, 1, 2].forEach((c) => {
        const p = items[r * 3 + c];
        const x = 160 + c * 300;
        const y = 160 + r * 170;
        h += `<div class="plank" style="left:${x}px;top:${y}px"></div>`;
        if (p) h += `<div class="w-item sit" data-id="${p.id}" style="left:${x}px;top:${y}px">${sv(p, 176)}</div>`;
      })
    );
    return h + `</div>`;
  }

  function capsWall() {
    const items = VX.byCat('caps');
    let h = `<div class="w-title">Caps &amp; Hats</div><div class="panel peg" style="left:470px;top:270px;width:860px;height:430px">`;
    items.forEach((p, i) => {
      const x = 110 + (i % 4) * 213;
      const y = 70 + Math.floor(i / 4) * 190;
      h += `<div class="pin" style="left:${x}px;top:${y - 8}px"></div><div class="w-item sway" data-id="${p.id}" style="left:${x}px;top:${y}px;--d:${i * 0.4}s">${sv(p, 150)}</div>`;
    });
    return h + `</div>`;
  }

  function bagsWall() {
    const items = VX.byCat('bags');
    const cross = items.filter((p) => p.style === 'crossbody');
    const rest = items.filter((p) => p.style !== 'crossbody');
    let h = '';
    cross.forEach((p, i) => {
      const x = 630 + i * 180;
      h += `<div class="pin big" style="left:${x}px;top:160px"></div><div class="w-item sway" data-id="${p.id}" style="left:${x}px;top:162px;--d:${i * 0.5}s">${sv(p, 116)}</div>`;
    });
    h += `<div class="panel wood cubby" style="left:430px;top:440px;width:940px;height:460px">`;
    rest.forEach((p, i) => {
      const c = i % 3;
      const r = Math.floor(i / 3);
      h += `<div class="cell" style="left:${16 + c * 306}px;top:${16 + r * 218}px"><div class="w-item cub" data-id="${p.id}">${sv(p, p.style === 'backpack' ? 150 : 210)}</div></div>`;
    });
    return h + `</div>`;
  }

  function wallEl(cls, section, transform, inner, label) {
    return `<div class="face wall ${cls}" data-section="${section}" style="width:${W}px;height:${H}px;transform:translate(-50%,-50%) ${transform}">
      ${inner}<div class="baseboard"></div><div class="w-hint">${label}<b>→</b></div></div>`;
  }

  function build() {
    world.innerHTML =
      wallEl('wall-back', 'clothing', `translateZ(${-HALF}px)`, clothingWall(), 'Enter Clothing') +
      wallEl('wall-right', 'shoes', `translateX(${HALF}px) rotateY(-90deg)`, shoesWall(), 'Enter Shoes') +
      wallEl('wall-front', 'bags', `translateZ(${HALF}px) rotateY(180deg)`, bagsWall(), 'Enter Bags') +
      wallEl('wall-left', 'caps', `translateX(${-HALF}px) rotateY(90deg)`, capsWall(), 'Enter Caps') +
      `<div class="face floor" style="width:${W}px;height:${W}px;transform:translate(-50%,-50%) translateY(${H / 2}px) rotateX(90deg)">
        <div class="floor-ring"><div class="floor-ring-in">${VX.markSVG()}</div></div></div>` +
      `<div class="face ceiling" style="width:${W}px;height:${W}px;transform:translate(-50%,-50%) translateY(${-H / 2}px) rotateX(-90deg)">
        <i></i><i></i><i></i></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* camera                                                              */
  /* ------------------------------------------------------------------ */
  function tweenTo(to, dur, opts = {}) {
    if (tw && tw.done) tw.done(false);
    const from = { ...cam };
    to = { ...to };
    if (to.yaw !== undefined && !opts.spin) {
      const d = ((((to.yaw - from.yaw) % 360) + 540) % 360) - 180; // shortest arc
      to.yaw = from.yaw + d;
    }
    if (reduce) dur = Math.min(dur, 350);
    return new Promise((resolve) => {
      tw = { from, to, dur, start: performance.now(), ease: opts.ease || ease.inOut, bump: opts.bump || 0, done: resolve };
    });
  }

  function step(now, dt) {
    if (tw) {
      const t = Math.min(1, (now - tw.start) / tw.dur);
      const k = tw.ease(t);
      for (const key in tw.to) cam[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      cam.back += tw.bump * Math.sin(Math.PI * t);
      if (t >= 1) {
        const done = tw.done;
        tw = null;
        cam.yaw = ((cam.yaw % 360) + 540) % 360 - 180;
        done && done(true);
      }
    } else if (mode === 'store' && !drag) {
      // inertia, then a slow showroom orbit once the visitor is idle
      const idle = now - lastInput > 2600;
      const targetVel = idle && !reduce ? 4.5 : 0;
      vel += (targetVel - vel) * Math.min(1, dt * (idle ? 0.8 : 3.2));
      cam.yaw += vel * dt;
    }
    // soft mouse parallax
    const k = Math.min(1, dt * 4);
    px += ((mode === 'focus' ? 0.8 : 2.2) * mx - px) * k;
    py += (1.2 * my - py) * k;
  }

  function render() {
    if (paused) return;
    const r = cam.yaw * D2R;
    const x = -Math.sin(r) * cam.back;
    const z = Math.cos(r) * cam.back;
    world.style.transform = `translateZ(${P}px) rotateX(${(cam.pitch - py).toFixed(3)}deg) rotateY(${(cam.yaw + px).toFixed(3)}deg) translate3d(${(-x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px, ${(-z).toFixed(2)}px)`;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(now, dt);
    render();
    requestAnimationFrame(loop);
  }

  function fit() {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vw / 1440, (vh / 900) * (vw < vh ? 0.62 : 1));
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }

  /* ------------------------------------------------------------------ */
  /* input                                                               */
  /* ------------------------------------------------------------------ */
  function bindInput() {
    wrapEl.addEventListener('pointerdown', (e) => {
      if (mode !== 'store') return;
      drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), lastX: e.clientX };
      vel = 0;
      lastInput = performance.now();
      wrapEl.setPointerCapture(e.pointerId);
      wrapEl.classList.add('is-grabbing');
    });
    wrapEl.addEventListener('pointermove', (e) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
      if (!drag) return;
      const now = performance.now();
      const dx = e.clientX - drag.lastX;
      drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y) * 0.02;
      const dYaw = -dx * 0.16;
      cam.yaw += dYaw;
      const dts = Math.max(0.008, (now - drag.t) / 1000);
      vel = vel * 0.6 + (dYaw / dts) * 0.4;
      drag.t = now;
      drag.lastX = e.clientX;
      lastInput = now;
    });
    const up = (e) => {
      if (!drag) return;
      const wasClick = drag.moved < 6;
      drag = null;
      lastInput = performance.now();
      wrapEl.classList.remove('is-grabbing');
      vel = Math.max(-140, Math.min(140, vel));
      if (wasClick) {
        vel = 0;
        // 3D hit-test: whatever wall is under the pointer
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const wall = hit && hit.closest('.wall');
        if (wall) onPick(wall.dataset.section, hit.closest('.w-item')?.dataset.id);
      }
    };
    wrapEl.addEventListener('pointerup', up);
    wrapEl.addEventListener('pointercancel', up);
    addEventListener('keydown', (e) => {
      if (mode !== 'store' || e.target.closest('input,textarea')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        lastInput = performance.now();
        const snapped = Math.round(cam.yaw / 90) * 90 + (e.key === 'ArrowRight' ? 90 : -90);
        tweenTo({ yaw: snapped }, 900);
      }
    });
    addEventListener('resize', fit);
  }

  /* ------------------------------------------------------------------ */
  /* public API                                                          */
  /* ------------------------------------------------------------------ */
  VX.room = {
    init(el, pick) {
      wrapEl = el;
      stage = el.querySelector('.stage');
      world = el.querySelector('.world');
      onPick = pick;
      build();
      fit();
      bindInput();
      requestAnimationFrame(loop);
    },
    // the opening establishing shot: a sweeping orbit down into the room
    intro() {
      mode = 'intro';
      return tweenTo({ yaw: 0, ...OVERVIEW }, 3000, { spin: true, ease: ease.inOut }).then((finished) => {
        if (!finished) return; // a route took over mid-shot
        mode = 'store';
        lastInput = performance.now();
      });
    },
    overview(fromFocus) {
      mode = 'store';
      lastInput = performance.now();
      vel = 0;
      return tweenTo({ ...OVERVIEW, yaw: tw ? tw.to.yaw : Math.round(cam.yaw / 90) * 90 }, fromFocus ? 1300 : 1100, { ease: ease.inOut });
    },
    // dolly up to a wall. If we are already close to another wall, arc out first.
    focus(section) {
      const yaw = WALL_YAW[section];
      const turning = Math.abs(((((yaw - cam.yaw) % 360) + 540) % 360) - 180) > 30;
      const fromFocus = mode === 'focus' || mode === 'away';
      mode = 'focus';
      vel = 0;
      return tweenTo({ yaw, back: -40, y: -110, pitch: 0 }, turning ? 1500 : 1150, { bump: fromFocus && turning ? 560 : 0 });
    },
    // a full 360° whirl used when leaving for the auth pages
    whirl() {
      mode = 'away';
      vel = 0;
      return tweenTo({ yaw: cam.yaw + 360, back: 700, y: -60, pitch: 4 }, 1500, { spin: true, bump: 200 });
    },
    setPaused(v) {
      paused = v;
      wrapEl.classList.toggle('is-covered', v);
    },
    get mode() {
      return mode;
    },
  };
})();
