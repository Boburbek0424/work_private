/* VELOX Virtual Store — procedural product art.
 * Every product is drawn as an SVG string from a few parameters (style + colors),
 * so the whole store ships without a single image file.
 * Each generator supports view 'front' | 'back' and opts.sil (flat silhouette, used
 * for the 3D extrusion layers in the 360° viewer). */
(function () {
  const VX = (window.VX = window.VX || {});
  let uid = 0;

  /* ---------- color helpers ---------- */
  function rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // p in [-1, 1]: negative darkens toward black, positive lightens toward white
  function shade(h, p) {
    const [r, g, b] = rgb(h);
    const t = p < 0 ? 0 : 255;
    const a = Math.abs(p);
    const f = (c) => Math.round((t - c) * a + c);
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function lum(h) {
    const [r, g, b] = rgb(h);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const contrast = (h) => (lum(h) > 0.62 ? '#151515' : '#ffffff');

  // mirror an absolute path (M/L/C/Q/Z with x y pairs) across the vertical axis
  function mir(d, w = 200) {
    return d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (m, x, y) => `${+(w - x).toFixed(2)} ${y}`);
  }

  /* ---------- brand mark: three forward-leaning speed bars ---------- */
  function mark(x, y, s, color) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">
      <path d="M0 6 L3 0 L13 0 L10 6 Z"/><path d="M12 6 L15 0 L21 0 L18 6 Z" opacity=".75"/><path d="M20 6 L23 0 L26 0 L23 6 Z" opacity=".5"/></g>`;
  }
  function markSVG(color = 'currentColor') {
    return `<svg class="vx-mark" viewBox="0 0 26 6" aria-hidden="true">${mark(0, 0, 1, color)}</svg>`;
  }

  function wrap(vb, body, cls = '') {
    return `<svg class="art ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  }
  function shadeDefs(id) {
    return `<linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".75" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
      <linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".6" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`;
  }

  /* =====================================================================
   * CLOTHING (viewBox 0 0 200 230)
   * styles: hoodie | zip | tech | windbreaker | puffer | crew | longsleeve | coach | quarterzip
   * ===================================================================== */
  const G = {
    body: 'M88 36 C80 38 66 44 56 52 L54 204 Q100 211 146 204 L144 52 C134 44 120 38 112 36 C108 43 92 43 88 36 Z',
    sl: 'M56 52 C44 58 38 70 35 88 L24 182 L44 185 L54 104 Z',
    puffBody: 'M88 34 C78 36 62 42 52 52 L50 200 Q100 210 150 200 L148 52 C138 42 122 36 112 34 C108 42 92 42 88 34 Z',
    puffSl: 'M52 52 C38 58 32 72 29 92 L18 178 L42 183 L52 106 Z',
    hoodF: 'M80 46 C68 34 76 12 100 11 C124 12 132 34 120 46 C112 56 88 56 80 46 Z',
    hoodIn: 'M87 44 C84 31 91 19 100 19 C109 19 116 31 113 44 C107 51 93 51 87 44 Z',
    hoodB: 'M80 40 C74 62 84 94 100 98 C116 94 126 62 120 40 C110 30 90 30 80 40 Z',
    hoodBtop: 'M82 40 C80 24 88 14 100 13 C112 14 120 24 118 40 Z',
  };
  const HOODED = ['hoodie', 'zip', 'tech', 'windbreaker', 'puffer'];

  function garment(p, view, opts) {
    const id = 'vg' + ++uid;
    const st = p.style;
    const puff = st === 'puffer';
    const body = puff ? G.puffBody : G.body;
    const sl = puff ? G.puffSl : G.sl;
    const sr = mir(sl);
    const hooded = HOODED.includes(st);
    const back = view === 'back';
    const hood = hooded ? (back ? G.hoodBtop : G.hoodF) : '';
    const silPaths = [sl, sr, body, hood].filter(Boolean);

    if (opts.sil) {
      return wrap('0 0 200 230', `<g fill="${opts.sil}">${silPaths.map((d) => `<path d="${d}"/>`).join('')}</g>`, 'sil');
    }

    const c = p.color;
    const c2 = p.color2 || shade(c, -0.3);
    const dk = shade(c, -0.32);
    const ln = shade(c, -0.18);
    const lt = shade(c, 0.18);
    const logo = p.logo || contrast(c);
    let s = `<defs>${shadeDefs(id)}<clipPath id="${id}c">${silPaths.map((d) => `<path d="${d}"/>`).join('')}</clipPath></defs>`;

    // hanger
    const hook = `<path d="M100 26 L100 14 C100 8 104 4 108.5 4 C113 4 116 7 116 11.5" stroke="#8f877c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M58 52 L100 27 L142 52" stroke="#b5895a" stroke-width="5" stroke-linecap="round" fill="none"/>${hook}`;

    if (back && hooded) s += `<path d="${G.hoodBtop}" fill="${shade(c, -0.08)}"/>`;
    s += `<path d="${sl}" fill="${shade(c, -0.04)}"/><path d="${sr}" fill="${shade(c, -0.1)}"/><path d="${body}" fill="${c}"/>`;

    // clipped overlays: color blocks, quilting
    let ov = '';
    if (st === 'tech') ov += `<path d="M0 134 L100 148 L200 120 L200 240 L0 240 Z" fill="${c2}"/><path d="M0 134 L100 148 L200 120" stroke="${shade(c2, -0.3)}" stroke-width="1.2" fill="none"/>`;
    if (st === 'windbreaker') ov += `<path d="M0 116 L100 152 L200 116 L200 240 L0 240 Z" fill="${c2}"/><path d="M0 116 L100 152 L200 116" stroke="${p.accent || '#fff'}" stroke-width="2.2" fill="none" opacity=".9"/>`;
    if (puff) {
      for (let y = 66; y < 204; y += 16) {
        ov += `<path d="M10 ${y} Q100 ${y + 7} 190 ${y}" stroke="${dk}" stroke-width="1.6" fill="none" opacity=".75"/>
          <path d="M10 ${y - 7} Q100 ${y} 190 ${y - 7}" stroke="${lt}" stroke-width="3" fill="none" opacity=".35"/>`;
      }
    }
    if (st === 'coach' && back) ov += `<path d="M56 74 Q100 82 144 74" stroke="${ln}" stroke-width="1.2" fill="none"/>`;
    s += `<g clip-path="url(#${id}c)">${ov}</g>`;

    // ribs
    const hemRib = ['hoodie', 'zip', 'crew', 'quarterzip', 'tech'].includes(st);
    if (hemRib) s += `<path d="M54 198 Q100 205 146 198 L146 207 Q100 214 54 207 Z" fill="${st === 'tech' ? shade(c2, -0.12) : shade(c, -0.14)}"/>`;
    if (st !== 'coach') {
      const cuff = st === 'tech' ? shade(c2, -0.12) : shade(c, -0.14);
      const L = puff ? 'M18 176 L42 181 L41 190 L17 185 Z' : 'M24 178 L44 181 L43 191 L23 188 Z';
      s += `<path d="${L}" fill="${cuff}"/><path d="${mir(L)}" fill="${cuff}"/>`;
    }

    if (!back) {
      if (hooded) s += `<path d="${G.hoodF}" fill="${shade(c, 0.04)}"/><path d="${G.hoodIn}" fill="${shade(c, -0.45)}"/>`;
      switch (st) {
        case 'hoodie':
          s += `<path d="M70 148 L130 148 L138 194 L62 194 Z" fill="${shade(c, -0.03)}" stroke="${ln}" stroke-width="1.2"/>
            <path d="M94 52 L92 86 M106 52 L108 88" stroke="${shade(c, 0.35)}" stroke-width="2" stroke-linecap="round"/>
            ${mark(88, 74, 0.95, logo)}`;
          break;
        case 'zip':
          s += `<path d="M100 44 L100 205" stroke="${shade(c, -0.35)}" stroke-width="2.2"/><rect x="97.5" y="52" width="5" height="9" rx="1.5" fill="${shade(c, -0.5)}"/>
            <path d="M68 150 L76 190 M132 150 L124 190" stroke="${ln}" stroke-width="1.6"/>
            <path d="M95 52 L94 82 M105 52 L106 82" stroke="${shade(c, 0.4)}" stroke-width="1.8" stroke-linecap="round"/>
            ${mark(112, 70, 0.62, logo)}`;
          break;
        case 'tech':
          s += `<path d="M100 44 L100 205" stroke="${shade(c2, -0.45)}" stroke-width="2.4"/><rect x="97.5" y="52" width="5" height="9" rx="1.5" fill="#111"/>
            <path d="M157 70 L161 108" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>
            ${mark(66, 72, 0.6, contrast(c))}`;
          break;
        case 'windbreaker':
          s += `<path d="M100 44 L100 205" stroke="${shade(c, -0.4)}" stroke-width="2"/><rect x="97.5" y="52" width="5" height="9" rx="1.5" fill="#111"/>
            ${mark(112, 70, 0.62, p.accent || c2)}`;
          break;
        case 'puffer':
          s += `<path d="M100 42 L100 202" stroke="${shade(c, -0.42)}" stroke-width="2.2"/><rect x="97.5" y="52" width="5" height="9" rx="1.5" fill="${shade(c, -0.6)}"/>
            ${mark(112, 66, 0.6, logo)}`;
          break;
        case 'crew':
          s += `<path d="M86 36 C92 45 108 45 114 36 C113 42 108 49 100 49 C92 49 87 42 86 36 Z" fill="${shade(c, -0.16)}"/>${mark(87, 66, 1, logo)}`;
          break;
        case 'longsleeve':
          s += `<path d="M87 36 C92 44 108 44 113 36 C112 40 107 45 100 45 C93 45 88 40 87 36 Z" fill="${shade(c, -0.14)}"/>${mark(112, 64, 0.6, logo)}`;
          break;
        case 'coach':
          s += `<path d="M88 36 L74 46 L90 66 L100 46 Z" fill="${shade(c, -0.1)}" stroke="${ln}" stroke-width="1"/>
            <path d="${mir('M88 36 L74 46 L90 66 L100 46 Z')}" fill="${shade(c, -0.14)}" stroke="${ln}" stroke-width="1"/>
            <path d="M100 48 L100 204" stroke="${ln}" stroke-width="1.4"/>
            ${[70, 100, 130, 160, 188].map((y) => `<circle cx="104" cy="${y}" r="2.2" fill="${shade(c, -0.45)}"/>`).join('')}
            <rect x="116" y="80" width="14" height="10" rx="2" fill="${shade(c, 0.25)}"/>${mark(117.5, 83, 0.42, c)}
            <path d="M88 207 L86 220 M112 207 L114 220" stroke="${shade(c, 0.3)}" stroke-width="1.6" stroke-linecap="round"/>`;
          break;
        case 'quarterzip':
          s += `<path d="M86 30 L114 30 L114 41 C108 47 92 47 86 41 Z" fill="${shade(c, -0.12)}"/>
            <path d="M100 32 L100 96" stroke="${shade(c, 0.45)}" stroke-width="2"/><rect x="97.5" y="34" width="5" height="9" rx="1.5" fill="${shade(c, 0.5)}"/>
            ${mark(112, 68, 0.62, logo)}`;
          break;
      }
    } else {
      if (hooded) s += `<path d="${G.hoodB}" fill="${shade(c, -0.06)}"/><path d="M100 22 L100 96" stroke="${ln}" stroke-width="1.2"/>`;
      else if (st === 'quarterzip') s += `<path d="M86 30 L114 30 L114 40 C108 44 92 44 86 40 Z" fill="${shade(c, -0.16)}"/>`;
      else if (st === 'coach') s += `<path d="M86 36 C92 46 108 46 114 36 L116 44 C108 52 92 52 84 44 Z" fill="${shade(c, -0.12)}"/>`;
      else s += `<path d="M86 36 C92 42 108 42 114 36 C112 40 106 44 100 44 C94 44 88 40 86 36 Z" fill="${shade(c, -0.18)}"/>`;
      if (!hooded) s += mark(93, 56, 0.5, logo);
    }

    // soft lighting + folds
    s += `<g clip-path="url(#${id}c)" pointer-events="none">
      <rect width="200" height="230" fill="url(#${id}s)"/><rect width="200" height="230" fill="url(#${id}v)"/>
      <path d="M78 70 C74 120 77 160 72 204 M124 80 C128 130 125 170 130 204" stroke="#000" stroke-opacity=".07" stroke-width="3" fill="none"/>
      <path d="M54 104 L44 185 M146 104 L156 185" stroke="#000" stroke-opacity=".12" stroke-width="2.5" fill="none"/></g>`;
    if (hooded) s += hook;
    return wrap('0 0 200 230', s);
  }

  /* =====================================================================
   * SHOES (viewBox 0 0 240 150) — side profile, toe pointing right
   * styles: runner | high | court
   * ===================================================================== */
  const SH = {
    out: 'M18 118 C18 128 30 133 50 133 L206 133 C222 133 231 126 229 116 L20 112 Z',
    mid: 'M16 100 C14 112 18 121 30 122 L214 122 C226 122 232 115 230 104 C220 108 190 108 160 106 L60 104 C40 103 24 100 16 100 Z',
    courtMid: 'M16 96 L228 100 C232 110 231 122 220 125 L26 125 C16 123 13 110 16 96 Z',
    runner: 'M22 102 C18 84 20 62 30 48 C36 40 50 38 62 42 C70 46 76 58 86 62 C110 70 150 74 178 80 C204 86 224 92 230 104 C200 108 120 108 22 102 Z',
    runnerCollar: 'M30 48 C36 40 50 38 62 42 C66 50 60 57 50 57 C40 57 34 53 30 48 Z',
    high: 'M24 102 C20 78 20 40 26 18 C40 12 58 12 70 16 C74 34 80 52 96 62 C120 72 156 76 182 82 C206 88 224 94 228 102 C200 106 120 106 24 102 Z',
    highCollar: 'M26 18 C40 12 58 12 70 16 C66 23 52 26 40 26 C32 26 28 23 26 18 Z',
    court: 'M22 98 C18 82 22 62 32 54 C40 48 54 48 64 52 C72 58 80 64 92 68 C116 74 150 78 178 84 C204 90 222 92 228 100 C200 104 120 104 22 98 Z',
    courtCollar: 'M32 54 C40 48 54 48 64 52 C66 59 60 63 50 63 C42 63 36 60 32 54 Z',
  };

  function shoe(p, view, opts) {
    const st = p.style || 'runner';
    const upper = SH[st];
    const mid = st === 'court' ? SH.courtMid : SH.mid;
    const flip = view === 'back' ? ' transform="translate(240 0) scale(-1 1)"' : '';
    if (opts.sil) {
      // sil === true: two-tone slice so the sole reads correctly from the side
      const up = opts.sil === true ? shade(p.color, -0.28) : opts.sil;
      const so = opts.sil === true ? shade(p.sole || '#f4f3ef', -0.14) : opts.sil;
      const ou = opts.sil === true ? shade(p.out || shade(p.sole || '#f4f3ef', -0.55), -0.1) : opts.sil;
      return wrap('0 0 240 150', `<g${flip}><path d="${SH.out}" fill="${ou}"/><path d="${mid}" fill="${so}"/><path d="${upper}" fill="${up}"/></g>`, 'sil');
    }

    const id = 'vs' + ++uid;
    const c = p.color;
    const a = p.color2 || shade(c, -0.4);
    const sole = p.sole || '#f4f3ef';
    const out = p.out || shade(sole, -0.55);
    let s = `<defs><linearGradient id="${id}g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
      <clipPath id="${id}c"><path d="${upper}"/></clipPath></defs><g${flip}>`;
    s += `<path d="${SH.out}" fill="${out}"/>`;
    for (let x = 34; x < 214; x += 12) s += `<path d="M${x} 128 L${x + 6} 133" stroke="${shade(out, -0.3)}" stroke-width="1.5"/>`;
    s += `<path d="${mid}" fill="${sole}"/><path d="M24 112 C80 114 160 115 222 112" stroke="${shade(sole, -0.12)}" stroke-width="1.4" fill="none"/>`;
    s += `<path d="${upper}" fill="${c}"/>`;
    // overlays clipped to upper: toe cap, heel counter, mesh dots
    let ov = `<path d="M176 70 C204 82 228 92 236 110 L180 112 C176 96 174 84 176 70 Z" fill="${shade(c, -0.1)}"/>
      <path d="M0 40 C34 52 44 80 46 112 L0 112 Z" fill="${a}"/>`;
    if (st === 'runner') for (let x = 96; x < 176; x += 8) for (let y = 74; y < 100; y += 7) ov += `<circle cx="${x + (y % 2) * 3}" cy="${y}" r="1" fill="${shade(c, -0.18)}"/>`;
    s += `<g clip-path="url(#${id}c)">${ov}<rect width="240" height="150" fill="url(#${id}g)"/></g>`;
    // collar
    const col = st === 'high' ? SH.highCollar : st === 'court' ? SH.courtCollar : SH.runnerCollar;
    s += `<path d="${col}" fill="${shade(c, -0.55)}"/>`;
    // laces
    const [x0, y0, x1, y1] = st === 'high' ? [70, 22, 104, 66] : st === 'court' ? [80, 62, 150, 78] : [88, 62, 160, 77];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      s += `<path d="M${x - 5} ${y - 3} L${x + 6} ${y + 3}" stroke="${p.lace || '#fafafa'}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x + 2}" cy="${y + 6}" r="1.4" fill="${shade(c, -0.4)}"/>`;
    }
    // brand mark on the quarter panel
    s += mark(st === 'high' ? 104 : 108, st === 'court' ? 84 : 82, 2.5, a);
    s += `<rect x="${st === 'high' ? 20 : 24}" y="${st === 'high' ? 24 : 56}" width="6" height="16" rx="2" fill="${a}"/>`;
    s += `</g>`;
    return wrap('0 0 240 150', s);
  }

  /* =====================================================================
   * CAPS (viewBox 0 0 200 160) — styles: cap | bucket
   * ===================================================================== */
  function cap(p, view, opts) {
    const st = p.style || 'cap';
    const back = view === 'back';
    const crown = st === 'bucket' ? 'M60 100 C60 62 72 42 100 42 C128 42 140 62 140 100 Z' : 'M38 102 C38 54 66 30 100 30 C134 30 162 54 162 102 Q100 94 38 102 Z';
    const brim = st === 'bucket' ? 'M26 104 C40 90 160 90 174 104 C180 122 150 132 100 132 C50 132 20 122 26 104 Z' : 'M34 100 Q100 89 166 100 C170 111 152 122 100 123 C48 122 30 111 34 100 Z';
    if (opts.sil) return wrap('0 0 200 160', `<g fill="${opts.sil}"><path d="${crown}"/><path d="${brim}"/></g>`, 'sil');
    const id = 'vc' + ++uid;
    const c = p.color;
    const c2 = p.color2 || c;
    let s = `<defs><radialGradient id="${id}g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>`;
    if (st === 'bucket') {
      s += `<path d="${brim}" fill="${shade(c2, -0.06)}"/><path d="M34 112 C60 124 140 124 166 112" stroke="${shade(c2, -0.25)}" stroke-width="1.2" fill="none" stroke-dasharray="3 3"/>`;
      s += `<path d="${crown}" fill="${c}"/><path d="${crown}" fill="url(#${id}g)"/><path d="M62 92 Q100 100 138 92 L139 100 Q100 108 61 100 Z" fill="${shade(c, -0.15)}"/>`;
      if (!back) s += mark(87, 70, 1, contrast(c));
      s += `<path d="${brim}" fill="url(#${id}g)" opacity=".6"/>`;
    } else if (!back) {
      s += `<path d="${crown}" fill="${c}"/><path d="M100 30 C88 50 82 76 80 98 M100 30 C112 50 118 76 120 98" stroke="${shade(c, -0.18)}" stroke-width="1.3" fill="none"/>`;
      s += `<circle cx="100" cy="31" r="3.2" fill="${shade(c, -0.15)}"/><circle cx="66" cy="62" r="1.5" fill="${shade(c, -0.3)}"/><circle cx="134" cy="62" r="1.5" fill="${shade(c, -0.3)}"/>`;
      s += mark(87, 66, 1, contrast(c)) + `<path d="${crown}" fill="url(#${id}g)"/>`;
      s += `<path d="${brim}" fill="${shade(c2, -0.06)}"/><path d="M34 106 Q100 96 166 106" stroke="${shade(c2, -0.22)}" stroke-width="1" fill="none" stroke-dasharray="3 3"/><path d="${brim}" fill="url(#${id}g)" opacity=".7"/>`;
    } else {
      s += `<path d="M34 104 Q30 96 44 96 L58 100 Z M166 104 Q170 96 156 96 L142 100 Z" fill="${shade(c2, -0.12)}"/>`;
      s += `<path d="${crown}" fill="${c}"/><path d="M100 30 L100 84" stroke="${shade(c, -0.18)}" stroke-width="1.3"/><circle cx="100" cy="31" r="3.2" fill="${shade(c, -0.15)}"/>`;
      s += `<path d="M80 102 C80 82 120 82 120 102 Z" fill="${shade(c, -0.5)}"/><rect x="76" y="90" width="48" height="6" rx="2" fill="${shade(c, -0.2)}"/><rect x="108" y="89" width="8" height="8" rx="1.5" fill="#cfcfcf"/>`;
      s += `<path d="${crown}" fill="url(#${id}g)"/>`;
    }
    return wrap('0 0 200 160', s);
  }

  /* =====================================================================
   * BAGS (viewBox 0 0 200 220) — styles: backpack | duffel | crossbody | waist
   * ===================================================================== */
  const BG = {
    backpack: 'M48 50 C48 34 64 26 100 26 C136 26 152 34 152 50 L156 192 C156 203 147 209 134 209 L66 209 C53 209 44 203 44 192 Z',
    duffel: 'M24 102 C24 80 40 72 100 72 C160 72 176 80 176 102 L176 160 C176 172 166 178 150 178 L50 178 C34 178 24 172 24 160 Z',
    crossbody: 'M58 112 L142 112 C148 112 152 116 152 122 L152 176 C152 184 146 189 138 189 L62 189 C54 189 48 184 48 176 L48 122 C48 116 52 112 58 112 Z',
    waist: 'M34 112 C34 94 62 86 100 86 C138 86 166 94 166 112 C166 130 138 138 100 138 C62 138 34 130 34 112 Z',
  };
  function bag(p, view, opts) {
    const st = p.style;
    const back = view === 'back';
    const d = BG[st];
    if (opts.sil) return wrap('0 0 200 220', `<g fill="${opts.sil}"><path d="${d}"/></g>`, 'sil');
    const id = 'vb' + ++uid;
    const c = p.color;
    const c2 = p.color2 || shade(c, -0.2);
    const lg = contrast(c);
    let s = `<defs><radialGradient id="${id}g" cx=".35" cy=".25" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>`;
    if (st === 'backpack') {
      s += `<path d="M84 28 C84 12 116 12 116 28" stroke="${shade(c, -0.4)}" stroke-width="5" fill="none"/>`;
      if (back) {
        s += `<path d="${d}" fill="${shade(c, -0.08)}"/><rect x="56" y="58" width="88" height="110" rx="18" fill="${shade(c, -0.2)}"/>
          <path d="M66 40 C60 90 58 140 64 196 M134 40 C140 90 142 140 136 196" stroke="${shade(c, -0.5)}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
      } else {
        s += `<path d="M46 60 C36 100 38 160 46 196 M154 60 C164 100 162 160 154 196" stroke="${shade(c, -0.45)}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
        s += `<path d="${d}" fill="${c}"/><path d="M50 60 Q100 44 150 60" stroke="${shade(c, -0.3)}" stroke-width="2" fill="none"/>`;
        s += `<path d="M62 118 L138 118 C145 118 149 122 149 129 L149 186 C149 194 143 199 135 199 L65 199 C57 199 51 194 51 186 L51 129 C51 122 55 118 62 118 Z" fill="${c2}"/><path d="M54 132 Q100 124 146 132" stroke="${shade(c2, -0.35)}" stroke-width="1.8" fill="none"/>`;
        s += mark(74, 156, 2, lg);
      }
    } else if (st === 'duffel') {
      s += `<path d="M66 76 C66 40 134 40 134 76" stroke="${shade(c, -0.35)}" stroke-width="6" fill="none"/><path d="${d}" fill="${c}"/>`;
      s += `<ellipse cx="34" cy="128" rx="8" ry="40" fill="${shade(c, -0.18)}"/><ellipse cx="166" cy="128" rx="8" ry="40" fill="${shade(c, -0.18)}"/>`;
      s += `<path d="M40 80 Q100 70 160 80" stroke="${shade(c, -0.35)}" stroke-width="2" fill="none" stroke-dasharray="2 2"/>`;
      if (!back) s += mark(60, 116, 3, lg);
      else s += `<rect x="70" y="112" width="60" height="34" rx="6" fill="${shade(c, -0.1)}" stroke="${shade(c, -0.3)}"/>`;
    } else if (st === 'crossbody') {
      s += `<path d="M100 8 L54 116 M100 8 L146 116" stroke="${shade(c, -0.35)}" stroke-width="3" fill="none"/><circle cx="100" cy="8" r="4" fill="#9b958c"/>`;
      s += `<path d="${d}" fill="${c}"/>`;
      if (!back) s += `<path d="M48 124 L152 124 L152 146 C130 152 70 152 48 146 Z" fill="${shade(c, -0.08)}"/>${mark(87, 160, 1, lg)}`;
    } else {
      s += `<path d="M2 108 L36 110 M164 110 L198 108" stroke="${shade(c, -0.4)}" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="${c}"/>`;
      if (!back) s += `<path d="M42 104 Q100 92 158 104" stroke="${shade(c, -0.35)}" stroke-width="1.8" fill="none"/>${mark(84, 114, 1.25, lg)}`;
    }
    s += `<path d="${d}" fill="url(#${id}g)"/>`;
    return wrap('0 0 200 220', s);
  }

  /* ---------- dispatcher ---------- */
  function art(p, view = 'front', opts = {}) {
    switch (p.cat) {
      case 'shoes': return shoe(p, view, opts);
      case 'caps': return cap(p, view, opts);
      case 'bags': return bag(p, view, opts);
      default: return garment(p, view, opts);
    }
  }
  const ASPECT = { clothing: 230 / 200, shoes: 150 / 240, caps: 160 / 200, bags: 220 / 200 };

  VX.art = art;
  VX.mark = mark;
  VX.markSVG = markSVG;
  VX.shade = shade;
  VX.contrast = contrast;
  VX.ASPECT = ASPECT;
})();
