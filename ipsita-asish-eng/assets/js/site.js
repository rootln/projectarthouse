/* Ipsita & Asish: the invitation card.
   Opens the envelope, places the embroidered art, and runs each page's animation.
   Motion is kept to transforms and opacity so scrolling stays smooth. */
(() => {
'use strict';
const CONFIG = window.CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement, main = $('#main'), hd = $('#hd'), foot = $('#foot'), env = $('#env');

// if a library failed to load, show the page without the envelope rather than a locked screen
if (!window.gsap || !window.ScrollTrigger || !window.Orn) { env && env.remove(); const l = $('#ld'); l && l.remove(); window.__ldDone = true; return; }

const Orn = window.Orn;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const wait = ms => new Promise(r => setTimeout(r, ms));
const f2 = n => +n.toFixed(2);
// cubic-bezier as an easing function, so GSAP can use the same curves as the CSS
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let s = x; for (let i = 0; i < 6; i++) { const d = dX(s); if (Math.abs(d) < 1e-6) break; s -= (X(s) - x) / d; } return Y(clamp(s)); };
}
const EASE_OUT = bezier(.23, 1, .32, 1), EASE_DRAWER = bezier(.32, .72, 0, 1);
// the room and the hotel, as guests should find it: "Feelings Hall, 1st Floor, Pal Heights Mantra"
const venueFull = () => [CONFIG.venue.hall, CONFIG.venue.name].filter(Boolean).join(', ');
// Safari does not redraw a mask when only a CSS variable inside it changes, so the pen and the iris write the mask itself
const penAt = (el, hidden) => { const v = f2(hidden) + '% 0'; el.style.webkitMaskPosition = v; el.style.maskPosition = v; };
const irisAt = (el, r) => { const m = r >= 110 ? 'none' : `radial-gradient(circle at 50% 50%,#000 ${f2(r)}%,transparent ${f2(r + 24)}%)`; el.style.webkitMaskImage = m; el.style.maskImage = m; };
// where a pen's stardust falls: the lettering is measured once when the writing starts, then followed with the scroll
// position, so the reveal never re-measures the page on every frame
function penBox(el) {
  const rg = document.createRange(); rg.selectNodeContents(el);
  const b = el.getBoundingClientRect(), tr = rg.getBoundingClientRect(), y0 = scrollY;
  return { left: b.left, width: b.width, l: tr.left, r: tr.right, h: tr.height, top: () => tr.top + (y0 - scrollY) };
}
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const graphemes = s => (window.Intl && Intl.Segmenter) ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : Array.from(s);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cld = (src, tr) => /res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src) ? src.replace('/image/upload/', `/image/upload/${tr}/`) : src;
const thumb = src => /images\.unsplash\.com/.test(src) ? src.replace(/([?&])w=\d+/, '$1w=360') : cld(src, 'c_fill,g_auto:faces,w_420,h_420,q_auto,f_auto');
const large = src => cld(src, 'c_limit,w_1800,h_1800,q_auto,f_auto');
// if Cloudinary refuses a crop, fall back to the original file
const rescue = img => { const raw = img.dataset.raw; if (!raw) return; const go = () => { if (img.src !== raw) img.src = raw; }; img.addEventListener('error', go, { once: true }); if (img.complete && !img.naturalWidth && img.src) go(); };
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'expo.out', duration: 1.2 });
ScrollTrigger.config({ ignoreMobileResize: true });

/* ═════════ ornaments: gradients for the written names, paisley corners, line art ═════════ */
document.body.insertAdjacentHTML('afterbegin', Orn.defs());
$$('[data-card]').forEach(c => c.insertAdjacentHTML('afterbegin', '<i class="cn cn--tl"></i><i class="cn cn--tr"></i><i class="cn cn--br"></i><i class="cn cn--bl"></i>'));
const ORN = { divider: () => Orn.divider(240), mandala: () => Orn.mandala(), wheel: () => Orn.wheel(), emblem: () => Orn.mandala() };
$$('[data-orn]').forEach(el => { el.innerHTML = ORN[el.dataset.orn](el); });

// torans repeat a whole number of times across the card (an odd number when the card asks for it)
function sizeToran(el) {
  const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
  const t0 = H * 1.5; let n = Math.max(1, Math.round(W / t0));
  if (el.hasAttribute('data-odd') && n % 2 === 0) n += W / t0 > n ? 1 : -1;
  el.style.backgroundSize = `${f2(W / Math.max(1, n))}px 100%`;
}
const torans = $$('[data-toran]');
const ro = new ResizeObserver(es => es.forEach(e => sizeToran(e.target)));
torans.forEach(t => { sizeToran(t); ro.observe(t); });

/* ═════════ embroidered arch frames, drawn at the window's live size ═════════ */
const Zari = (() => {
  let uid = 0;
  const cord = (d, w, per = w * .8, col = '#D7AF5A') => `<path d="${d}" fill="none" stroke="#6E4A12" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${f2(w * .78)}" stroke-dasharray="${f2(per * .62)} ${f2(per * .38)}" stroke-linejoin="round"/>`;
  const chain = d => `<path d="${d}" fill="none" stroke="#D7AF5A" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="2 2"/>`;
  const NS = 'http://www.w3.org/2000/svg';
  const probe = document.createElementNS(NS, 'svg'); probe.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden'); probe.setAttribute('aria-hidden', 'true');
  const pp = document.createElementNS(NS, 'path'); probe.appendChild(pp); document.body.appendChild(probe);
  const shift = (d, x, y) => d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (m, a, b) => `${f2(+a + x)} ${f2(+b + y)}`);
  const closed = (w, h, o) => shift(Orn.archPath(w + 2 * o, h + o).d, -o, -o);
  const open = (w, h, o) => closed(w, h, o).replace(/Z$/, '');
  function frame(w, h, pad = 24) {
    const id = 'z' + (++uid), top = 40, W = w + 2 * pad, H = h + pad + top + 14;
    let g = '', pr = '';
    const band = `${closed(w, h, 14)} ${closed(w, h, 4)}`;
    g += `<path d="${band}" fill-rule="evenodd" fill="#5E1022"/><path d="${band}" fill-rule="evenodd" fill="url(#${id}t)"/>`;
    g += cord(open(w, h, 3), 3.4, 2.8);
    g += cord(open(w, h, 15), 2.8, 2.2);
    g += chain(open(w, h, 21));
    pp.setAttribute('d', open(w, h, 9));
    const L = pp.getTotalLength(), n = Math.round(L / 6.4);
    for (let i = 0; i <= n; i++) { const p = pp.getPointAtLength(i / n * L); pr += `<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="2.4" fill="url(#${id}p)"/>`; }
    // plinth under the window
    g += `<rect x="-26" y="${h}" width="${w + 52}" height="13" fill="#5E1022"/><rect x="-26" y="${h}" width="${w + 52}" height="13" fill="url(#${id}t)"/>`;
    g += cord(`M-26 ${h + .5}H${w + 26}`, 2.6, 2.2) + cord(`M-26 ${h + 12.5}H${w + 26}`, 2.6, 2.2);
    for (let x = -18; x <= w + 18; x += 9) g += `<circle cx="${x}" cy="${h + 6.5}" r="1.9" fill="url(#${id}s)"/>`;
    // finial: a sequin flower crowned with pearls
    const ay = Orn.archPath(w + 42, h + 21).apexY - 21;
    for (let i = 0; i < 6; i++) { const a = (i * 60 - 90) * Math.PI / 180; g += `<ellipse cx="${f2(w / 2 + Math.cos(a) * 6)}" cy="${f2(ay - 9 + Math.sin(a) * 6)}" rx="5" ry="3" transform="rotate(${i * 60 - 90} ${f2(w / 2 + Math.cos(a) * 6)} ${f2(ay - 9 + Math.sin(a) * 6)})" fill="#C42638"/>`; }
    g += `<circle cx="${w / 2}" cy="${ay - 9}" r="3.4" fill="url(#${id}s)"/>`;
    [[0, -24, 2.6], [-6, -20, 1.8], [6, -20, 1.8]].forEach(([dx, dy, r]) => pr += `<circle cx="${w / 2 + dx}" cy="${ay + dy}" r="${r}" fill="url(#${id}p)"/>`);
    const defs = `<defs>
      <filter id="${id}f" filterUnits="userSpaceOnUse" x="${-pad - 20}" y="${-top - pad - 20}" width="${W + 40}" height="${H + 40}" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="ab"/><feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/>
        <feComposite in="ab" in2="lum" operator="arithmetic" k2=".5" k3=".5" result="h"/>
        <feDiffuseLighting in="h" surfaceScale="2.2" diffuseConstant="1.28" result="d"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting>
        <feSpecularLighting in="h" surfaceScale="2.2" specularConstant=".85" specularExponent="22" lighting-color="#FFF3D6" result="s"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting>
        <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" result="m"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
        <feComposite in="m" in2="s2" operator="arithmetic" k2="1" k3=".6" result="l"/><feComposite in="l" in2="SourceAlpha" operator="in" result="l2"/>
        <feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="sb"/><feOffset in="sb" dx=".7" dy="1.1" result="so"/><feFlood flood-color="#2A0A06" flood-opacity=".5"/><feComposite in2="so" operator="in" result="sh"/>
        <feMerge><feMergeNode in="sh"/><feMergeNode in="l2"/></feMerge></filter>
      <filter id="${id}d" filterUnits="userSpaceOnUse" x="${-pad - 20}" y="${-top - pad - 20}" width="${W + 40}" height="${H + 40}"><feDropShadow dx=".6" dy="1" stdDeviation=".7" flood-color="#2A0A06" flood-opacity=".5"/></filter>
      <pattern id="${id}t" width="40" height="1.25" patternUnits="userSpaceOnUse"><rect width="40" height=".55" fill="#fff" fill-opacity=".17"/><rect y=".72" width="40" height=".5" fill="#000" fill-opacity=".11"/></pattern>
      <radialGradient id="${id}p" cx=".5" cy=".5" r=".5" fx=".34" fy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#F7F1E6"/><stop offset=".78" stop-color="#D8CCB4"/><stop offset="1" stop-color="#A28F6E"/></radialGradient>
      <radialGradient id="${id}s" cx=".5" cy=".5" r=".5" fx=".38" fy=".34"><stop offset="0" stop-color="#FFF7D4"/><stop offset=".35" stop-color="#EBC86E"/><stop offset=".8" stop-color="#B98B34"/><stop offset="1" stop-color="#7E5719"/></radialGradient></defs>`;
    return { W, H, top, svg: `<svg viewBox="${-pad} ${-top - pad} ${W} ${H}" aria-hidden="true">${defs}<g filter="url(#${id}f)">${g}</g><g filter="url(#${id}d)">${pr}</g></svg>` };
  }
  function inside(d, pts) { pp.setAttribute('d', d); return pts.every(([x, y]) => pp.isPointInFill(new DOMPoint(x, y))); }
  return { frame, shift, inside };
})();
function placeFrame(win, el, pad) {
  const w = win.offsetWidth, h = win.offsetHeight; if (!w || !h) return;
  const k = w + 'x' + h; if (el._k === k) return; el._k = k;
  const fr = Zari.frame(w, h, pad);
  Object.assign(el.style, { left: -pad + 'px', top: -(fr.top + pad) + 'px', width: fr.W + 'px', height: fr.H + 'px' });
  el.innerHTML = fr.svg;
}

/* ═════════ smooth scrolling ═════════ */
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new Lenis({ lerp: .1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollToEl = el => {
  if (!lenis) { el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); return; }
  const dist = Math.abs(el.getBoundingClientRect().top);
  lenis.scrollTo(el, { duration: clamp(.45 + dist / 6000, .5, 1), easing: t => 1 - Math.pow(1 - t, 4) });
};
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  if (a.hasAttribute('data-film')) { e.preventDefault(); Menu.close(() => { lockPage(); Opening.play({ onDone: unlockPage }); }); return; }
  const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
  if (html.classList.contains('menu-open')) Menu.close(() => scrollToEl(t)); else scrollToEl(t);
}));

/* ═════════ sparks, petals and stardust ═════════ */
const FX = (() => {
  const cv = $('#fx'), ctx = cv.getContext('2d'); let parts = [], raf = 0, dpr = 1, last = 0;
  const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches, CAP = TOUCH ? 240 : 480;
  const size = () => { dpr = TOUCH ? 1 : Math.min(1.5, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  size(); addEventListener('resize', size);
  const GOLD = ['#FFE19A', '#FFC14D', '#F6D68A', '#FFF3D0'], PETAL = ['#F7A21B', '#FFC234', '#E8742F', '#D7344A', '#FFB020'];
  const DUST = ['#C99A3B', '#D4A645', '#E2B85A', '#B8862B', '#E9C46A', '#FFF1C8'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cap = () => { if (parts.length > CAP) parts.splice(0, parts.length - CAP); };
  function embers(x, y, n = 30, spread = 1) {
    if (RM) return;
    for (let i = 0; i < n; i++) parts.push({ k: 'e', x: x + (Math.random() - .5) * 20 * spread, y, vx: (Math.random() - .5) * 2 * spread, vy: -1 - Math.random() * 3, g: -.01, s: .8 + Math.random() * 1.6, c: pick(GOLD), life: 1, d: .014 + Math.random() * .012, w: Math.random() * 6, r: 0 });
    cap(); go();
  }
  function burst(x, y, n = 60, power = 1) {
    if (RM) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 8) * power;
      parts.push({ k: Math.random() < .6 ? 'p' : 'e', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3 * power, g: .12, s: 1.2 + Math.random() * 2.2, c: Math.random() < .3 ? pick(GOLD) : pick(PETAL), life: 1, d: .007 + Math.random() * .008, w: Math.random() * 6, r: Math.random() * 6 });
    }
    cap(); go();
  }
  // stardust: four-pointed glints and fine glitter that twinkle as they drift and fall
  function dust(x, y, n = 18, power = 1, trail = false) {
    if (RM) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = trail ? Math.random() * .7 : (.5 + Math.random() * 3.4) * power;
      const big = !trail && Math.random() < .18;
      parts.push({ k: Math.random() < (trail ? .45 : .6) ? 's' : 'g', x: x + (trail ? (Math.random() - .5) * 10 : 0), y: y + (trail ? (Math.random() - .5) * 10 : 0),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - (trail ? .15 : .9 * power), g: trail ? .018 : .045, s: (trail ? .95 : 1.1) * (1.2 + Math.random() * (big ? 3.4 : 2.1)), c: pick(DUST),
        life: 1, d: (trail ? .016 : .011) + Math.random() * .014, w: Math.random() * 6, r: Math.random() * 6, tw: 2 + Math.random() * 3 });
    }
    cap(); go();
  }
  function star(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = a + Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(b) * r * .22, Math.sin(b) * r * .22); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function tick(now) {
    const k = last ? clamp((now - last) / 16.67, .5, 3) : 1; last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i], dusty = p.k === 's' || p.k === 'g';
      p.vy += p.g * k; p.vx *= Math.pow(dusty ? .96 : .98, k); p.vy *= Math.pow(dusty ? .97 : .98, k); p.w += .07 * k;
      p.x += (p.vx + Math.sin(p.w) * (dusty ? .18 : .5)) * k; p.y += p.vy * k; p.life -= p.d * k;
      if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      const fade = Math.min(1, p.life * 1.8);
      if (dusty) {
        const tw = .55 + .45 * Math.sin(p.w * p.tw);
        ctx.fillStyle = p.c;
        if (p.k === 's') {
          ctx.globalAlpha = fade * .22 * tw; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 2.6, 0, 6.29); ctx.fill();
          const sr = p.s * (1.7 + 1.3 * tw); p.r += .03 * k;
          ctx.fillStyle = '#6E4A0E'; ctx.globalAlpha = fade * .38; star(p.x + .4, p.y + .7, sr * 1.22, p.r);
          ctx.fillStyle = p.c; ctx.globalAlpha = fade * (.55 + .45 * tw); star(p.x, p.y, sr, p.r);
          ctx.fillStyle = '#FFFDF4'; ctx.globalAlpha = fade * tw; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * .38, 0, 6.29); ctx.fill();
        } else { ctx.fillStyle = '#7A520F'; ctx.globalAlpha = fade * .4; ctx.beginPath(); ctx.arc(p.x + .3, p.y + .5, p.s * .7, 0, 6.29); ctx.fill(); ctx.fillStyle = p.c; ctx.globalAlpha = fade * (.45 + .55 * tw); ctx.beginPath(); ctx.arc(p.x, p.y, p.s * .55, 0, 6.29); ctx.fill(); }
        continue;
      }
      ctx.globalAlpha = fade;
      if (p.k === 'e') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 1.3, 0, 6.29); ctx.fill(); ctx.globalAlpha *= .25; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3.5, 0, 6.29); ctx.fill(); }
      else { ctx.save(); ctx.translate(p.x, p.y); p.r += .07 * k; ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s * 3.4, p.s * 1.6 * Math.abs(Math.cos(p.w)) + .6, 0, 0, 6.29); ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  return { embers, burst, dust };
})();

/* stardust where a finger or the mouse touches: a puff on each tap or click, a fine trail while a finger drags */
(() => {
  if (RM) return;
  let lx = 0, ly = 0;
  const trail = (x, y, gap) => {
    const d = Math.hypot(x - lx, y - ly); if (d < gap) return;
    const n = Math.min(5, Math.floor(d / gap));
    for (let i = 1; i <= n; i++) FX.dust(lx + (x - lx) * i / n, ly + (y - ly) * i / n, 1, 1, true);
    lx = x; ly = y;
  };
  addEventListener('pointerdown', e => { lx = e.clientX; ly = e.clientY; FX.dust(lx, ly, e.pointerType === 'mouse' ? 14 : 22, e.pointerType === 'mouse' ? .8 : 1); }, { passive: true });
  addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { lx = t.clientX; ly = t.clientY; } }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) trail(t.clientX, t.clientY, 9); }, { passive: true });
})();

/* ═════════ a few marigold petals drifting down ═════════ */
const Petals = (() => {
  const cv = $('#petals'), ctx = cv.getContext('2d'); let W = 0, H = 0, on = false, last = 0, started = false;
  const COLS = [['#FFB21E', '#F28A0E'], ['#FFC93D', '#F7A21B'], ['#F59A1A', '#D86A08'], ['#E2475B', '#B9233A']];
  const P = [];
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; };
  size(); addEventListener('resize', size);
  const make = top => ({ x: Math.random() * W, y: top ? -20 - Math.random() * H * .4 : Math.random() * H, s: 4 + Math.random() * 4, vy: .35 + Math.random() * .45, sw: Math.random() * 6.28, sws: .01 + Math.random() * .012, r: Math.random() * 6.28, vr: (Math.random() - .5) * .03, flip: Math.random() * 6.28, c: COLS[Math.random() < .12 ? 3 : Math.floor(Math.random() * 3)] });
  for (let i = 0; i < (innerWidth < 700 ? 7 : 12); i++) P.push(make(false));
  let vel = 0;
  function tick(now) {
    if (!on) return;
    const k = last ? clamp((now - last) / 16.67, .5, 3) : 1; last = now;
    vel += ((lenis ? lenis.velocity : 0) - vel) * .1;
    // clear only the small squares the petals occupied last frame, not the whole screen
    for (const p of P) if (p.bx !== undefined) ctx.clearRect(p.bx, p.by, p.bw, p.bw);
    for (const p of P) {
      p.sw += p.sws * k; p.flip += .03 * k; p.r += p.vr * k;
      p.x += Math.sin(p.sw) * .5 * k; p.y += (p.vy - vel * .05) * k;
      if (p.y > H + 20) Object.assign(p, make(true));
      if (p.y < -60) p.y = H + 10;
      const e = p.s * 1.2 + 3; p.bx = Math.floor(p.x - e); p.by = Math.floor(p.y - e); p.bw = Math.ceil(e * 2) + 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(Math.cos(p.flip)) * .7 + .3);
      ctx.globalAlpha = .85; ctx.fillStyle = p.c[0];
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * .9, -p.s * .5, p.s * .7, p.s * .8, 0, p.s); ctx.bezierCurveTo(-p.s * .7, p.s * .8, -p.s * .9, -p.s * .5, 0, -p.s); ctx.fill();
      ctx.globalAlpha = .5; ctx.fillStyle = p.c[1]; ctx.beginPath(); ctx.ellipse(0, p.s * .3, p.s * .25, p.s * .6, 0, 0, 6.29); ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  const start = () => { if (RM || on) return; on = true; last = 0; requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) on = false; else if (started) start(); });
  return { start: () => { started = true; start(); } };
})();

/* ═════════ typewriter ═════════ */
function typeInto(el, text, speed = 34) {
  return new Promise(res => {
    if (RM) { el.textContent = text; return res(); }
    const g = graphemes(text); let k = 0;
    (function step() {
      if (k >= g.length) return res();
      el.textContent = g.slice(0, ++k).join('');
      setTimeout(step, g[k - 1] === '\n' ? speed * 8 : speed + Math.random() * speed * .6);
    })();
  });
}

/* ═════════ LOADER: a petal opens for each piece of the card that arrives ═════════ */
const Loader = (() => {
  const ld = $('#ld'), msg = $('#ldMsg'), bar = $('.ld__bar'), pts = $$('.ld__pt'), seal = $('#ldSeal');
  if (!ld) return { ready: Promise.resolve(), handOff: () => {} };
  ld.classList.add('ld--live');
  const art = ['envelope-back.webp', 'envelope-front.webp', 'envelope-flap.webp', 'envelope-flapIn.webp', 'seal.webp', 'toran.webp', 'zari.webp', 'corners.webp', 'kalash.webp', 'diya.webp', 'butti-faint.webp', 'butti.webp', 'silk.jpg', 'velvet.jpg'];
  const jobs = art.map(f => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = 'assets/art/' + f; if (i.decode) i.decode().then(res, res); }));
  jobs.push(document.fonts.ready);
  let done = 0, shown = 0; const total = jobs.length, t0 = performance.now();
  jobs.forEach(j => j.then(() => done++));
  let resolveReady; const ready = new Promise(r => resolveReady = r);
  // someone opening the invitation again gets a short version: the petals still open, in 0.6 s
  let seen = false; try { seen = localStorage.getItem('ai-invite-seen') === '1'; } catch (e) {}
  let quick = !RM && seen, MIN = RM ? 0 : quick ? 600 : 1700; const MAX = 7000;
  (function tick() {
    const el = performance.now() - t0, target = el > MAX ? 1 : done / total;
    if (!quick && !RM && done === total && el < 300) { quick = true; MIN = 600; }
    // the ring never runs ahead of the clock, so even a cached visit shows the petals opening
    shown = Math.min(target, shown + (RM ? 1 : .028), MIN ? el / MIN : 1);
    bar.style.setProperty('--o', f2(1 - shown));
    const n = Math.round(shown * pts.length); pts.forEach((p, i) => p.classList.toggle('on', i < n));
    if (shown >= 1) { msg.textContent = 'Your invitation is ready'; resolveReady(); return; }
    requestAnimationFrame(tick);
  })();
  // the seal is pressed, then it flies to its place on the envelope while the loader melts away
  function handOff(target, onLand) {
    window.__ldDone = true;
    try { localStorage.setItem('ai-invite-seen', '1'); } catch (e) {}
    if (RM) { ld.remove(); onLand(); return; }
    const r = seal.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, k = quick ? .6 : 1;
    gsap.timeline()
      .to(seal, { opacity: 1, filter: 'saturate(1)', scale: 1.22, duration: .22 * k, ease: 'power2.out' }, 0)
      .to(seal, { scale: 1, duration: .5 * k, ease: 'back.out(3)' }, .22 * k)
      .add(() => { FX.dust(cx, cy, 34, 1.4); FX.embers(cx, cy, 16, 1.4); }, .26 * k)
      .to(['.ld__ring', '.ld__names', '.ld__msg'], { opacity: 0, scale: .96, duration: .4, ease: EASE_OUT }, .5 * k)
      .to('.ld__bg', { opacity: 0, duration: k, ease: 'power1.inOut' }, .7 * k)
      .add(() => {
        const t = target();
        gsap.to(seal, { x: t.x - cx, y: t.y - cy, scale: t.w / r.width, rotate: 360, duration: 1.5 * k, ease: 'power3.inOut', onComplete: () => { onLand(); ld.remove(); } });
      }, .75 * k);
  }
  return { ready, handOff, quick: () => quick };
})();

/* ═════════ MUSIC: the song plays softly behind everything once the seal is tapped ═════════
   It fades in, fades out at the end of each play-through before it loops, dips away when the tab is hidden,
   and has a switch in the header (and on the opening film). Played through Web Audio where possible, so the
   low volume holds on iPhones too (they ignore the volume setting on a plain audio element). */
const Music = (() => {
  const S = CONFIG.music || {}, btns = $$('#musicBtn, #opSnd');
  if (!S.src) { btns.forEach(b => b.remove()); return { start() {}, has: false }; }
  const VOL = clamp(S.volume == null ? .2 : +S.volume, 0, 1), IN = 5, OUT = 4;
  let START = Math.max(0, +S.start || 0);
  let a = null, ctx = null, gain = null, probe = null, heard = false, viaGain = false, cors = true, wanted = false, level = 0, raf = 0;
  function make() {
    // the song begins START seconds in, and loops back there (not to its opening) when it ends
    a = new Audio(); a.loop = false; a.preload = 'auto';
    a.addEventListener('loadedmetadata', () => {
      if (a.duration && START >= a.duration - 5) START = 0;              // a song shorter than the start point plays from its beginning
      if (a.currentTime < START - .5) a.currentTime = START;
    });
    a.addEventListener('ended', () => { a.currentTime = START; if (wanted) a.play().catch(() => {}); });
    if (cors) a.crossOrigin = 'anonymous';
    // without CORS headers the file can't go through Web Audio: play it plainly instead
    a.addEventListener('error', () => { if (!cors) return; cors = false; viaGain = false; const was = wanted; a.pause(); make(); if (was) play(); }, { once: true });
    a.src = S.src + (START ? '#t=' + START : '');
  }
  const setLevel = v => { level = v; if (viaGain && gain) gain.gain.value = v; else if (a) a.volume = clamp(v); };
  function tick() {
    raf = 0; if (!a) return;
    const d = a.duration || 0, t = a.currentTime || 0;
    // some phones ignore a seek made before the song has loaded: make sure it really starts at START
    if (START && t < START - .5 && a.readyState >= 1) a.currentTime = START;
    const env = d ? clamp(Math.min((t - START) / IN, (d - t) / OUT)) : clamp((t - START) / IN);
    const target = wanted && !document.hidden ? VOL * env : 0;
    // if the file arrived without CORS headers, Web Audio only ever hears silence: switch to a plain player
    if (viaGain && !heard && probe && !a.paused && t > START + 1) {
      const buf = new Float32Array(probe.fftSize); probe.getFloatTimeDomainData(buf);
      if (buf.some(x => Math.abs(x) > 1e-6)) heard = true;
      else if (t > START + 4) { const at = t; cors = false; viaGain = false; a.pause(); make(); a.currentTime = at; setLevel(level); a.play().catch(() => {}); }
    }
    setLevel(level + (target - level) * .05);
    if (!wanted && level < .002) { setLevel(0); a.pause(); return; }
    raf = requestAnimationFrame(tick);
  }
  function play() {
    if (!a) make();
    if (cors && !ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0; probe = ctx.createAnalyser(); probe.fftSize = 512; ctx.createMediaElementSource(a).connect(probe).connect(gain).connect(ctx.destination); viaGain = true; }
      } catch (e) { viaGain = false; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    setLevel(level);
    const p = a.play(); p && p.catch(() => { wanted = false; show(); });
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function show() {
    btns.forEach(b => {
      b.hidden = false; b.classList.toggle('is-playing', wanted); b.setAttribute('aria-pressed', wanted ? 'true' : 'false');
      b.setAttribute('aria-label', wanted ? 'Pause the music' : 'Play the music');
    });
  }
  // the first tap on the seal starts it (browsers only allow sound after a tap)
  function start() { wanted = true; play(); show(); }
  function toggle() { wanted = !wanted; if (wanted) play(); else if (!raf) raf = requestAnimationFrame(tick); show(); }
  btns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggle(); }));
  document.addEventListener('visibilitychange', () => {
    if (!a || !wanted) return;
    if (document.hidden) { a.pause(); setLevel(0); } else { setLevel(0); play(); }
  });
  // fetch the song while the envelope is on screen
  Loader.ready.then(() => setTimeout(() => { if (!a) make(); }, 1500));
  return { start, has: true };
})();

/* ═════════ THE OPENING FILM ═════════
   The envelope's card opens into the film. A third of the way in, the names are written over it in gold;
   when it ends (or a guest skips or scrolls) a bloom of gold light carries them into the first page. */
const Opening = (() => {
  const O = CONFIG.opening || {}, op = $('#op'), v = $('#opV'), bg = $('#opBg'), title = $('#opTitle'), nameEl = $('.op__n'),
    skip = $('#opSkip'), snd = $('#opSnd'), playBtn = $('#opPlay'), ctl = $('#opCtl'), glow = $('.op__glow'), shade = $('.op__shade');
  const has = !!(op && (O.src || O.fallback));
  if (!has) { op && op.remove(); return { has, load() {}, prime() {}, play: o => o && o.onDone && o.onDone() }; }
  const srcs = [O.src, O.fallback].filter(Boolean);
  let broken = false, vw = 16, vh = 9, fit = false, loaded = false, playing = false, revealed = false, finishing = false, onDone = null, raf = 0, failT = 0, endT = 0, revealT = 0;
  if (O.poster) v.poster = O.poster;
  // try the fallback; if that fails too, the names appear over the poster and the page carries on by itself
  v.addEventListener('error', () => {
    const i = srcs.indexOf(v.getAttribute('src'));
    if (i > -1 && i < srcs.length - 1) { v.src = srcs[i + 1]; if (playing) v.play().catch(() => {}); return; }
    broken = true; playBtn.hidden = true;
    if (playing && !finishing && !RM) { clearTimeout(failT); failT = setTimeout(() => { reveal(); endT = setTimeout(() => finish(), 5200); }, 900); }
  });
  v.addEventListener('loadedmetadata', () => { if (v.videoWidth) { vw = v.videoWidth; vh = v.videoHeight; layout(); } });
  // start fetching the film as soon as the envelope is on screen
  function load() { if (loaded) return; loaded = true; v.preload = 'auto'; v.src = srcs[0]; v.load(); }
  // called inside the tap on the seal: playing once during a tap lets phones (even in low-power mode) play it later
  function prime() {
    load(); if (RM) return;
    [v].forEach(x => { try { const p = x.play(); p && p.then(() => { if (!playing) { x.pause(); x.currentTime = 0; } }).catch(() => {}); } catch (e) {} });
  }
  // landscape film on a tall phone (or the reverse): show all of it, framed by a blurred copy of itself, and put the names in the free space
  function layout() {
    const W = innerWidth, H = innerHeight, cov = Math.max(W / vw, H / vh), shown = (W / (vw * cov)) * (H / (vh * cov));
    fit = shown < .62;
    op.classList.toggle('op--fit', fit);
    let ty = H * .3, above = false, side = false;
    if (fit) {
      if (!bg.getAttribute('src') && v.getAttribute('src')) { bg.src = v.getAttribute('src'); if (playing) { bg.currentTime = v.currentTime; bg.play().catch(() => {}); } }
      const s = Math.min(W / vw, H / vh), w = vw * s, h = vh * s, top = (H - h) * .62, left = (W - w) / 2;
      Object.assign(v.style, { left: f2(left) + 'px', top: f2(top) + 'px', width: f2(w) + 'px', height: f2(h) + 'px' });
      side = w < W - 2;
      if (top >= 200) { above = true; ty = top * .52; } else ty = Math.max(H * .24, 150);
    } else Object.assign(v.style, { left: '', top: '', width: '', height: '' });
    op.classList.toggle('op--above', above); op.classList.toggle('op--side', side);
    op.style.setProperty('--ty', f2(ty) + 'px');
  }
  addEventListener('resize', () => { if (playing) layout(); });

  const revealAt = () => O.revealAt > 0 ? O.revealAt : clamp((v.duration || 8) * .32, 1.2, 4);
  function play(opts = {}) {
    onDone = opts.onDone || null; playing = true; revealed = false; finishing = false;
    load(); layout();
    op.classList.remove('op--open'); op.classList.add('op--on'); op.setAttribute('aria-hidden', 'false');
    gsap.set([v, bg], { clearProps: 'transform,filter' }); gsap.set(v, { filter: 'blur(0px) brightness(1)' }); gsap.set(bg, { filter: 'blur(7px) saturate(1.2) brightness(.5)' }); gsap.set(glow, { opacity: 0, scale: .08 }); gsap.set(op, { opacity: 1 });
    gsap.set(shade, { opacity: 0 }); gsap.set(ctl, { opacity: 0 }); gsap.set(title.children, { opacity: 0, y: 0 }); gsap.set(title, { opacity: 1, y: 0 });
    nameEl.classList.add('wo'); penAt(nameEl, 100);
    skip.firstElementChild.textContent = 'Skip'; playBtn.hidden = true;
    try { v.currentTime = 0; } catch (e) {}
    if (RM) { v.pause(); irisAt(op, 110); op.classList.add('op--open'); playBtn.hidden = broken; reveal(true); gsap.set(ctl, { opacity: 1 }); skip.firstElementChild.textContent = 'Continue'; skip.focus({ preventScroll: true }); return; }
    // the film opens out of the card like an iris
    const iris = { r: 0 }; irisAt(op, 0);
    gsap.to(iris, { r: 110, duration: 1.5, ease: 'power2.inOut', onUpdate: () => irisAt(op, iris.r), onComplete: () => op.classList.add('op--open') });
    gsap.to(ctl, { opacity: 1, duration: .8, delay: 1.4 });
    setTimeout(() => skip.focus({ preventScroll: true }), 1500);
    if (broken) { failT = setTimeout(() => { reveal(); endT = setTimeout(() => finish(), 5200); }, 1400); cancelAnimationFrame(raf); return; }
    start();
    // if the film will not start (no network, blocked), show the names over the poster and carry on
    clearTimeout(failT); failT = setTimeout(() => { if (v.currentTime < .1 && playing && !finishing) { reveal(); endT = setTimeout(() => finish(), 5200); } }, 6000);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(watch);
  }
  function start() {
    const p = v.play();
    if (p && p.catch) p.catch(() => { playBtn.hidden = broken; });
    if (fit && bg.getAttribute('src')) { try { bg.currentTime = v.currentTime; } catch (e) {} bg.play().catch(() => {}); }
  }
  playBtn.addEventListener('click', () => { playBtn.hidden = true; start(); });
  function watch() {
    if (!playing) return;
    const t = v.currentTime;
    if (!revealed && t >= revealAt()) reveal();
    if (fit && bg.getAttribute('src') && Math.abs(bg.currentTime - t) > .25) { try { bg.currentTime = t; } catch (e) {} }
    raf = requestAnimationFrame(watch);
  }
  v.addEventListener('ended', () => { if (!playing || RM) return; if (!revealed) reveal(); clearTimeout(endT); endT = setTimeout(() => finish(), revealed ? 1400 : 3200); });

  // the names: written left to right in gold, shedding stardust from the pen
  function reveal(instant) {
    if (revealed) return; revealed = true;
    const [n, g, d] = title.children;
    skip.firstElementChild.textContent = 'Continue';
    if (instant) { gsap.set(title.children, { opacity: 1 }); gsap.set(shade, { opacity: 1 }); nameEl.classList.remove('wo'); return; }
    const st = { p: 0 }; let pb = null;
    gsap.timeline()
      .to(shade, { opacity: 1, duration: 1.4, ease: 'power1.out' }, 0)
      .set(n, { opacity: 1 }, .4)
      .to(st, { p: 1, duration: 2.4, ease: 'power1.inOut', onStart: () => { pb = penBox(n); }, onUpdate() {
        penAt(n, 100 - st.p * 100);
        if (!pb) return; const x = pb.left + pb.width * (1.2 - 1.4 * (1 - st.p)), y = pb.top();
        if (x > pb.l && x < pb.r) { FX.dust(x, y + pb.h * (.2 + Math.random() * .6), 1, 1.2, true); if (Math.random() < .3) FX.dust(x, y + pb.h * .5, 1, 1.2, true); }
      }, onComplete: () => { n.classList.remove('wo'); n.style.webkitMaskPosition = n.style.maskPosition = ''; const r = n.getBoundingClientRect(); FX.dust(r.left + r.width / 2, r.top + r.height / 2, 40, 2); } }, .4)
      .fromTo(g, { opacity: 0, y: 10, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: EASE_OUT, clearProps: 'filter' }, 2.2)
      .fromTo(d, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 2.8);
  }

  // scrolling, swiping or the arrow keys carry on into the page once the names are up
  const want = () => { if (playing && !finishing && revealed && v.currentTime > revealAt() + 2.2) finish(); };
  addEventListener('wheel', e => { if (playing && e.deltaY > 8) want(); }, { passive: true });
  let ty0 = null;
  addEventListener('touchstart', e => { if (playing) ty0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => { if (playing && ty0 !== null && ty0 - e.touches[0].clientY > 40) { ty0 = null; want(); } }, { passive: true });
  addEventListener('keydown', e => { if (playing && ['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); want(); } if (playing && e.key === 'Escape') finish(true); });
  skip.addEventListener('click', () => finish(!revealed));

  // gold light blooms from the centre, the film dissolves into it, and the page is waiting underneath
  function finish(fast) {
    if (!playing || finishing) return; finishing = true;
    clearTimeout(failT); clearTimeout(endT);
    if (RM) { end(); return; }
    const W = innerWidth, H = innerHeight;
    if (fast) {
      gsap.timeline({ onComplete: end })
        .to([ctl, title], { opacity: 0, duration: .2, ease: EASE_OUT }, 0)
        .to(glow, { opacity: 1, scale: 1.25, duration: .5, ease: 'power2.out' }, 0)
        .add(() => { const cb = onDone; onDone = null; cb && cb(); }, .45)
        .to(op, { opacity: 0, duration: .3, ease: EASE_OUT }, .5);
      return;
    }
    gsap.timeline({ onComplete: end })
      .to(ctl, { opacity: 0, duration: .4 }, 0)
      .to(title, { y: -30, opacity: 0, duration: fast ? .6 : 1.2, ease: 'power2.in' }, fast ? 0 : .35)
      .to(v, { scale: 1.08, filter: 'blur(8px) brightness(1.35)', duration: 1.7, ease: 'power1.in' }, 0)
      .to(bg, { filter: 'blur(9px) saturate(1.2) brightness(1.1)', duration: 1.7, ease: 'power1.in' }, 0)
      .to(glow, { opacity: 1, scale: 1.25, duration: 1.7, ease: 'power2.in' }, .15)
      .add(() => { for (let k = 0; k < 4; k++) setTimeout(() => FX.dust(W / 2 + (Math.random() - .5) * W * .3, H / 2 + (Math.random() - .5) * H * .2, 18, 1.6), k * 160); }, .4)
      .add(() => { const cb = onDone; onDone = null; cb && cb(); }, 1.75)
      .to(op, { opacity: 0, duration: 1.1, ease: 'power1.out' }, 1.85);
  }
  function end() {
    playing = false; cancelAnimationFrame(raf);
    v.pause(); bg.pause();
    op.classList.remove('op--on', 'op--open'); op.setAttribute('aria-hidden', 'true');
    gsap.set(op, { opacity: 1 });
    const cb = onDone; onDone = null; cb && cb();
  }

  return { has, load, prime, play };
})();

/* ═════════ 0 · THE ENVELOPE ═════════ */
const mantraEl = $('#mantraText');
const mantraText = mantraEl.textContent.trim();
mantraEl.textContent = '';

(() => {
  const box = $('#envBox'), flap = $('#envFlap'), card = $('#envCard'), seal = $('#seal'), hint = $('#envHint'), forEl = $('.env__for');
  html.classList.add('is-locked'); main.inert = true; hd.inert = true; foot.inert = true;
  let opened = false;

  // gold dust drifting up behind the envelope
  const Dust = (() => {
    const cv = $('#dust'), ctx = cv.getContext('2d'); let W = 0, H = 0, on = !RM;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; };
    size(); addEventListener('resize', size);
    const P = Array.from({ length: innerWidth < 700 ? 34 : 64 }, () => ({ x: Math.random(), y: Math.random(), s: .5 + Math.random() * 1.5, v: .0002 + Math.random() * .0005, w: Math.random() * 6.28, a: .2 + Math.random() * .55 }));
    function tick() {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v; p.w += .02; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.globalAlpha = p.a * .6 * (.6 + .4 * Math.sin(p.w * 3)); ctx.fillStyle = '#C99A3B'; ctx.beginPath(); ctx.arc(p.x * W + Math.sin(p.w) * 12, p.y * H, p.s, 0, 6.29); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    if (on) requestAnimationFrame(tick);
    return { stop: () => { on = false; } };
  })();

  gsap.set(seal, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  if (!RM) {
    gsap.set(forEl, { opacity: 0, y: 24 });
    gsap.set(box, { opacity: 0, y: 70, rotateX: 18, transformPerspective: 1400, transformOrigin: '50% 100%' });
    gsap.set(hint, { opacity: 0 });
    gsap.set(seal, { scale: 0, rotate: -40 });
  }
  // where the seal will sit once the envelope has settled
  const sealTarget = () => {
    const keep = box.style.transform; box.style.transform = 'none';
    const r = seal.getBoundingClientRect(); box.style.transform = keep;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: seal.offsetWidth };
  };
  Loader.ready.then(() => {
    Loader.handOff(sealTarget, () => { if (!RM) gsap.set(seal, { scale: 1, rotate: 0 }); });
    setTimeout(() => Opening.load(), 1200);
    if (RM) return;
    gsap.timeline({ delay: Loader.quick && Loader.quick() ? .4 : .7 })
      .to(forEl, { opacity: 1, y: 0, duration: 1.6 }, .1)
      .to(box, { opacity: 1, y: 0, rotateX: 0, duration: 1.9 }, .2)
      .to(hint, { opacity: 1, duration: 1 }, 1.8)
      .to(box, { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 2.3);
  });

  function open() {
    if (opened) return; opened = true;
    Opening.prime(); Music.start();
    gsap.killTweensOf(box);
    const sr = seal.getBoundingClientRect();
    if (RM) { done(); if (Opening.has) Opening.play({ onDone: enterSite }); return; }
    FX.burst(sr.left + sr.width / 2, sr.top + sr.height / 2, 40, .7);
    FX.dust(sr.left + sr.width / 2, sr.top + sr.height / 2, 30, 1.3);
    const br = box.getBoundingClientRect(), cr = card.getBoundingClientRect();
    gsap.set([flap, card, '.env__front', '.env__back'], { force3D: true });
    gsap.timeline({ onComplete: done })
      .to([hint, forEl], { opacity: 0, y: -16, duration: .3, ease: 'power2.out' }, 0)
      .to(box, { y: 0, duration: .4, ease: 'power2.out' }, 0)
      .to(seal, { scale: 1.15, duration: .16, ease: 'power2.out' }, 0)
      .to(seal, { y: innerHeight * .9, x: 40, rotate: 110, duration: 1.15, ease: 'power2.in' }, .16)
      .to(seal, { opacity: 0, duration: .3 }, 1)
      .to(flap, { rotateX: 180, duration: 1.15, ease: 'power3.inOut' }, .26)
      .set(flap, { zIndex: 0 }, .84)
      .set(card, { zIndex: 2 }, .84)
      .to(card, { y: -cr.height * .62, duration: 1.3, ease: 'power3.inOut' }, 1.05)
      .add(() => { FX.burst(br.left + br.width / 2, br.top + br.height * .15, 80, 1.05); FX.dust(br.left + br.width / 2, br.top + br.height * .1, 40, 2); }, 1.85)
      // the envelope drops away and the card grows into the page
      .to(['.env__back', '.env__front', flap, '.env__shadow'], { y: innerHeight * .75, opacity: 0, duration: 1.1, ease: 'power3.in' }, 2.3)
      .to(card, { y: 0, scale: Math.max(innerWidth / cr.width, innerHeight / cr.height) * 1.08, duration: 1.4, ease: 'expo.inOut' }, 2.5)
      // the card opens into the opening film; without one, straight into the first page
      .add(() => { if (Opening.has) Opening.play({ onDone: enterSite }); }, 2.85)
      .to(card, { opacity: 0, duration: .5, ease: 'power1.in' }, 3.3)
      .to(env, { opacity: 0, duration: .8 }, 3.2)
      .add(() => { if (!Opening.has) beginEnter(); }, 3.15);
  }
  seal.addEventListener('click', e => { e.stopPropagation(); open(); });
  box.addEventListener('click', open);

  function done() {
    Dust.stop(); env.remove();
    if (!Opening.has) enterSite();
  }
})();
// the page itself starts: unlock scrolling and play the first page's entrance
let entered = false;
function enterSite() {
  if (entered) { unlockPage(); return; } entered = true;
  unlockPage();
  ScrollTrigger.sort(); ScrollTrigger.refresh();
  beginEnter();
  Petals.start();
  Auto.begin(5000);
}
function lockPage() { html.classList.add('is-locked'); main.inert = true; hd.inert = true; foot.inert = true; lenis && lenis.stop(); }
function unlockPage() { html.classList.remove('is-locked'); main.inert = false; hd.inert = false; foot.inert = false; lenis && lenis.start(); }

// html.is-moving while the page scrolls (by hand or by itself); the gold shimmer rests until it stops
{ let mt = 0; addEventListener('scroll', () => { if (!mt) html.classList.add('is-moving'); clearTimeout(mt); mt = setTimeout(() => { mt = 0; html.classList.remove('is-moving'); }, 180); }, { passive: true }); }

/* ═════════ AUTO-SCROLL: the invitation scrolls itself, slowly, once it has opened.
   A touch, a click, the wheel or a scrolling key hands control back; the button in the corner pauses and resumes. ═════════ */
const Auto = (() => {
  const btn = $('#autoBtn'), lbl = $('#autoLbl');
  let on = false, ready = false, y = 0, set = 0, ramp = 0, hold = 0, timer = 0, pins = [], period = 1000 / 60;
  const dts = [];
  // about seven seconds a screen. The page moves the same whole number of pixels on every frame
  // (2 px at 60 Hz, 1 px at 120 Hz): uneven sub-pixel steps are what make slow scrolling shimmer
  const speed = () => clamp(innerHeight * .14, 100, 140);
  const maxY = () => document.documentElement.scrollHeight - innerHeight;
  const now = () => lenis ? lenis.scroll : scrollY;
  // the folded card opens a little faster than the page moves, then holds still long enough to read it
  const measure = () => { pins = ScrollTrigger.getAll().filter(st => st.pin).map(st => ({ a: Math.round(st.start), b: Math.round(st.end), done: st.end < now() - 1 })); };
  ScrollTrigger.addEventListener('refresh', measure);
  const go = () => { set = y; if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); };
  // the screen's own frame interval, learnt from the last half-second of frames
  const learn = dt => { if (dt < 4 || dt > 45) return; dts.push(dt); if (dts.length > 30) dts.shift(); const s = [...dts].sort((p, q) => p - q); period = s[s.length >> 1]; };
  function tick(time, dtMs) {
    if (html.classList.contains('is-locked')) return;
    if (Math.abs(now() - set) > 30) { stop(); return; }              // moved some other way (scrollbar, find on page)
    learn(dtMs);
    if (hold > 0) { hold -= dtMs / 1000; ramp = 0; return; }
    ramp = Math.min(1, ramp + dtMs / 700);                            // a gentle start: one pixel a frame, then full speed
    const frames = Math.max(1, Math.round(dtMs / period));            // a dropped frame is made up, still in whole pixels
    const p = pins.find(q => !q.done && q.b > y);
    let v = speed() * (p && y >= p.a ? 2 : 1);
    let step = Math.max(1, Math.round(v * period / 1000 * Math.max(.5, ramp)));
    if (p) {
      const d = p.b - y;
      if (d < step * 40) step = Math.max(1, Math.min(step, Math.ceil(d / 40)));   // settles into the open card
      if (d <= step * frames) { y = p.b; p.done = true; hold = 4; go(); return; }
    }
    y = Math.min(y + step * frames, Math.floor(maxY())); go();
    if (y >= Math.floor(maxY())) stop();
  }
  function start() {
    if (on || !ready) return;
    on = true; y = set = Math.round(now()); ramp = 0; hold = 0; measure();
    gsap.ticker.add(tick); paint();
  }
  function stop() { clearTimeout(timer); timer = 0; if (!on) return; on = false; gsap.ticker.remove(tick); paint(); }
  function paint() { btn.classList.toggle('is-on', on); lbl.textContent = on ? 'Pause' : 'Auto-scroll'; vis(); }
  // out of the way while a guest fills in the reply, and gone at the very end
  let atReply = false;
  new IntersectionObserver(es => { atReply = es[0].intersectionRatio > .3; vis(); }, { threshold: [0, .3, .6] }).observe($('#rsvp .card'));
  function vis() { btn.classList.toggle('is-shown', ready && (on || (!atReply && now() < maxY() - 4))); }
  btn.addEventListener('click', () => on ? stop() : start());
  // the guest takes over
  addEventListener('wheel', stop, { passive: true });
  addEventListener('pointerdown', e => { if (!e.target.closest('#autoBtn, #musicBtn')) stop(); }, { passive: true });
  addEventListener('keydown', e => {
    if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) return;
    if (e.key === ' ' && e.target.closest('input, textarea, select, button, a')) return;
    stop();
  });
  addEventListener('scroll', vis, { passive: true });
  return {
    // once the page opens: give the blessing a moment, then start, unless the guest is already scrolling.
    // With reduced motion the page never moves by itself; the button is there for anyone who wants it.
    begin(delay) {
      if (ready) return; ready = true; btn.hidden = false; requestAnimationFrame(vis);
      if (!RM) timer = setTimeout(() => { timer = 0; start(); }, delay);
    }
  };
})();

/* ═════════ 1 · THE BLESSING ═════════ */
const altar = $('.altar');
if (!RM) {
  gsap.set('#begin .sri, #begin .meaning, #begin .jay, #begin .cue', { opacity: 0 });
  gsap.set('#begin .emblem', { opacity: 0, scale: .6, rotate: -60 });
  gsap.set('#begin .emblem .w', { strokeDashoffset: 1 });
  gsap.set('#begin .altar > *', { opacity: 0, y: 30 });
  gsap.set('#begin .toran', { yPercent: -60, opacity: 0 });
}
let begun = false;
function beginEnter() {
  if (begun) return; begun = true;
  gsap.to(hd, { opacity: 1, duration: 1.4, ease: 'power2.out' });
  if (RM) { mantraEl.textContent = mantraText; altar.classList.remove('unlit'); gsap.set('#begin .emblem .w', { strokeDashoffset: 0 }); gsap.set('#begin .emblem .dot', { opacity: 1 }); return; }
  gsap.from('#begin .card', { scale: 1.04, opacity: 0, duration: 1.4, ease: 'power2.out' });
  gsap.timeline({ delay: .2 })
    .to('#begin .toran', { yPercent: 0, opacity: 1, duration: 1.8, ease: 'elastic.out(1,.6)' }, 0)
    .to('#begin .emblem', { opacity: 1, scale: 1, rotate: 0, duration: 2.2 }, .3)
    .to('#begin .emblem .w', { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', stagger: { amount: .9 } }, .3)
    .to('#begin .emblem .dot', { opacity: 1, duration: .4, stagger: { amount: .8 } }, 1.4)
    .add(() => { const r = $('#begin .emblem').getBoundingClientRect(); FX.dust(r.left + r.width / 2, r.top + r.height / 2, 26, 1.2); }, 1.9)
    .to('#begin .sri', { opacity: 1, duration: 1.2 }, .9)
    .add(() => typeInto(mantraEl, mantraText, 30), 1.3)
    .to('#begin .altar > *', { opacity: 1, y: 0, duration: 1.6, stagger: .15 }, 1.6)
    .add(() => { altar.classList.remove('unlit'); $$('.altar .diya').forEach(d => { const r = d.getBoundingClientRect(); FX.embers(r.left + r.width * .41, r.top + r.height * .2, 18, .5); }); }, 2.7)
    .to('#begin .meaning', { opacity: 1, duration: 1.4 }, 4)
    .to('#begin .jay', { opacity: 1, duration: 1.4 }, 4.4)
    .to('#begin .cue', { opacity: 1, duration: 1 }, 4.8);
}

/* ═════════ MENU ═════════ */
const Menu = (() => {
  const m = $('#menu'), btn = $('#menuBtn'), lbl = $('#menuLbl'), tor = $('.menu .toran');
  let open = false, tl = null;
  gsap.set('.menu__nav a>span', { yPercent: 110 });
  gsap.set(tor, { yPercent: -60 });
  function show() {
    open = true; html.classList.add('menu-open'); btn.setAttribute('aria-expanded', 'true'); lbl.textContent = 'Close';
    { const r = btn.getBoundingClientRect(); FX.dust(r.left + r.width / 2, r.top + r.height / 2, 22, 1.2); }
    lenis && lenis.stop();
    tl && tl.kill();
    tl = gsap.timeline();
    tl.set(m, { visibility: 'visible' }).add(() => sizeToran(tor));
    if (RM) {
      // reduced motion: everything simply fades in
      tl.set('.menu__bg', { clipPath: 'inset(0 0 0% 0)' }).set(['.menu__nav a>span', tor], { yPercent: 0 })
        .fromTo(['.menu__bg', '.menu__nav a>span', tor, '.menu__foot'], { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' });
    } else {
      tl.to('.menu__bg', { clipPath: 'inset(0 0 0% 0)', duration: .4, ease: EASE_DRAWER })
        .to('.menu__nav a>span', { yPercent: 0, duration: .3, stagger: .04, ease: EASE_OUT }, .16)
        .to(tor, { opacity: 1, yPercent: 0, duration: .5, ease: 'back.out(1.4)' }, .2)
        .to('.menu__foot', { opacity: 1, duration: .3, ease: EASE_OUT }, .3);
    }
    setTimeout(() => $('.menu__nav a').focus({ preventScroll: true }), RM ? 50 : 300);
  }
  // closing is quick, and whatever the tap asked for (a scroll, the film) starts at the same moment
  function close(cb) {
    open = false; html.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); lbl.textContent = 'Menu';
    tl && tl.kill();
    lenis && lenis.start();
    tl = gsap.timeline({ onComplete: () => { gsap.set(m, { visibility: 'hidden' }); gsap.set(['.menu__nav a>span', tor, '.menu__bg', '.menu__foot'], { clearProps: 'opacity' }); gsap.set('.menu__nav a>span', { yPercent: 110 }); gsap.set(tor, { yPercent: -60, opacity: 0 }); gsap.set('.menu__foot', { opacity: 0 }); } });
    if (RM) tl.to(['.menu__bg', '.menu__nav a>span', tor, '.menu__foot'], { opacity: 0, duration: .15, ease: 'none' }).set('.menu__bg', { clipPath: 'inset(0 0 100% 0)' });
    else tl.to(['.menu__nav a>span', '.menu__foot', tor], { opacity: 0, duration: .15, ease: EASE_OUT })
      .to('.menu__bg', { clipPath: 'inset(0 0 100% 0)', duration: .25, ease: EASE_OUT }, .05);
    cb && cb();
  }
  btn.addEventListener('click', () => open ? close() : show());
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(); });
  return { close };
})();

/* ═════════ 3 · THE INVITATION: a gatefold that opens as you scroll ═════════ */
(() => {
  const inv = $('#inv'), body = document.createElement('div');
  body.className = 'inv__body';
  [...inv.children].forEach(c => body.appendChild(c));
  inv.appendChild(body);
  const fit = () => {
    body.style.transform = 'none';
    const cs = getComputedStyle(inv), avH = inv.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), avW = inv.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const k = Math.min(1, avH / body.offsetHeight, avW / body.offsetWidth);
    body.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : 'none';
  };
  document.fonts.ready.then(fit); addEventListener('resize', fit); fit();
  const items = $$('.inv__body > *'); let parted = false;
  if (RM) { gsap.set('#flapL', { rotateY: -178 }); gsap.set('#flapR', { rotateY: 178 }); $('#gateHint').style.visibility = 'hidden'; return; }
  gsap.set(items, { opacity: 0, y: 18 });
  gsap.set('.gate__art', { scale: .92, opacity: .4 });
  const doors = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '#inviteStage', start: 'top top', end: '+=210%', pin: true, scrub: .8, anticipatePin: 1 } });
  doors
    .to('#gateHint', { opacity: 0, duration: .06 }, 0)
    .add(() => { if (parted) return; parted = true; const r = $('#gate').getBoundingClientRect(); for (let k = 0; k < 6; k++) FX.dust(r.left + r.width / 2, r.top + r.height * (.15 + k * .14), 10, 1); }, .1)
    .to('#flapL', { rotateY: -178, duration: .42, ease: 'power2.inOut' }, .04)
    .to('#flapR', { rotateY: 178, duration: .42, ease: 'power2.inOut' }, .07)
    .to('.gate__art', { scale: 1, opacity: 1, duration: .3, ease: 'power2.out' }, .22)
    .to({}, { duration: .001 }, 1);
  // the lettering is not tied to the scroll: once the doors are most of the way open it is written in, line by line,
  // in its own time, so a quick flick on a phone (or the auto-scroll) still shows it arriving
  const lines = gsap.timeline({ paused: true })
    .to(items, { opacity: 1, y: 0, duration: .65, stagger: .075, ease: EASE_OUT });
  let shown = false;
  doors.eventCallback('onUpdate', () => {
    const k = doors.progress();
    if (!shown && k > .3) { shown = true; lines.timeScale(1).play(); }
    else if (shown && k < .16) { shown = false; lines.timeScale(2.5).reverse(); }
  });
  // a flat rise (no 3D tilt): Safari mis-draws a tilted card whose doors are themselves 3D, painting them over the page above
  gsap.from('#gate', { y: 70, scale: .94, duration: 1.3, ease: EASE_OUT, clearProps: 'transform', scrollTrigger: { trigger: '#inviteStage', start: 'top 80%', once: true } });
})();

/* ═════════ cards unfold as they arrive; titles are written on in gold by a sparkling pen ═════════ */
const once = (el, start = 'top 86%') => ({ trigger: el, start, once: true });
// light travels across the gold lettering, each piece on its own beat
$$('.sec-title, .foot__mark, .inv__cer, .inv__name, .day__num, .venue__name, .gate__lbl, .who h3, .rdone h3, .env__for .foil, .env__card .script').forEach((el, i) => { el.classList.add('sheen'); el.style.setProperty('--sd', f2(i * 1.7 % 7) + 's'); });
// glints along the zari borders
$$('[data-card]').forEach((card, ci) => {
  const r = rng(ci * 97 + 13), sides = ['t', 'b', 'l', 'r'];
  let h = '';
  for (let k = 0; k < 8; k++) {
    const s = sides[k % 4], u = f2(10 + r() * 80), off = 'calc(var(--bw) / -2)';
    const pos = s === 't' ? `left:${u}%;top:${off}` : s === 'b' ? `left:${u}%;bottom:${off};margin-bottom:calc(var(--s) / -2)` : s === 'l' ? `top:${u}%;left:${off}` : `top:${u}%;right:${off};margin-right:calc(var(--s) / -2)`;
    h += `<i class="gl" style="${pos};--s:${Math.round(14 + r() * 12)}px;--d:${f2(r() * 5.5)}s"><i></i></i>`;
  }
  card.insertAdjacentHTML('beforeend', h);
});
// only the gold that is on screen keeps shimmering
{ const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('still', !e.isIntersecting)), { rootMargin: '80px' }); $$('.sheen, .gl').forEach(el => io.observe(el)); }
if (!RM) {
  $$('#couple .card, #day .card, #venue .card, #rsvp .card').forEach(card => {
    // the card rises into place. Only transform and opacity change (flat, no 3D tilt, which Safari can mis-draw),
    // so the phone's graphics chip moves the finished card instead of redrawing it and its zari border on every frame
    gsap.timeline({ scrollTrigger: once(card, 'top 92%') })
      .fromTo(card, { opacity: 0, y: 64, scale: .97, transformOrigin: '50% 100%', willChange: 'transform, opacity' },
        { opacity: 1, y: 0, scale: 1, duration: .95, ease: EASE_OUT, clearProps: 'transform,opacity,willChange' })
      .from($$(':scope > .cn', card), { opacity: 0, scale: .6, rotate: -40, duration: .7, stagger: .06, ease: 'back.out(1.6)' }, .45);
  });
  $$('[data-rise]').forEach((el, i) => gsap.from(el, { opacity: 0, y: 46, duration: 1.5, delay: (i % 2) * .12, scrollTrigger: once(el, 'top 90%') }));
  $$('.sec-title').forEach(el => {
    el.classList.add('wo'); penAt(el, 100);
    const st = { p: 0 }; let pb = null;
    gsap.to(st, { p: 1, duration: 1.9, ease: 'power1.inOut', scrollTrigger: once(el, 'top 88%'), onStart: () => { pb = penBox(el); }, onComplete: () => { el.classList.remove('wo'); el.style.webkitMaskPosition = el.style.maskPosition = ''; }, onUpdate() {
      penAt(el, 100 - st.p * 100);
      // the pen: stardust shed at the edge of the ink, only where there are letters
      if (!pb) return; const x = pb.left + pb.width * (1.2 - 1.4 * (1 - st.p));
      if (x > pb.l && x < pb.r) FX.dust(x, pb.top() + pb.h * (.25 + Math.random() * .55), 1, 1, true);
    } });
  });
  $$('.sec-sub').forEach(el => gsap.fromTo(el, { opacity: 0, y: 8, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: EASE_OUT, clearProps: 'filter', scrollTrigger: once(el, 'top 92%') }));
}

/* ═════════ 4 · COUPLE ═════════ */
$$('.medal__img img').forEach(rescue);
if (!RM) {
  gsap.from('.duo__and', { scale: .5, opacity: 0, rotate: -15, duration: 1.6, ease: 'back.out(2)', scrollTrigger: once('.duo__and', 'top 85%') });
  gsap.from('.medal__img', { clipPath: 'circle(0% at 50% 50%)', duration: 1.8, ease: 'expo.inOut', stagger: .2, scrollTrigger: once('.duo', 'top 80%') });
  gsap.from('.medal__img img', { scale: 1.5, duration: 2.4, ease: 'expo.out', stagger: .2, scrollTrigger: once('.duo', 'top 80%') });
  gsap.from('.medal__ring', { scale: .85, opacity: 0, rotate: -20, duration: 1.8, stagger: .2, scrollTrigger: once('.duo', 'top 80%'), onStart: () => $$('.medal').forEach((m, i) => setTimeout(() => { const r = m.getBoundingClientRect(); FX.dust(r.left + r.width / 2, r.top + r.height / 2, 30, 1.6); }, 700 + i * 250)) });
  gsap.from('#pond', { y: 40, opacity: 0, duration: 1.6, scrollTrigger: once('#pond', 'top 96%') });
}

/* ═════════ 5 · THE DAY: calendar, panchang, countdown ═════════ */
const [Y, Mo, Da] = (CONFIG.date || '2026-12-06').split('-').map(Number);
const hasTime = /^\d{1,2}:\d{2}$/.test(CONFIG.time || '');
const [hh, mm] = hasTime ? CONFIG.time.split(':').map(Number) : [0, 0];
const startUTC = Date.UTC(Y, Mo - 1, Da, hh, mm) - 330 * 60000; // IST = UTC+5:30
const timeLabel = hasTime ? new Date(Date.UTC(2000, 0, 1, hh, mm)).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : '';
if (hasTime) {
  $('.inv__when').innerHTML = `Sunday, 6 December 2026, from ${timeLabel}<br>Feelings Hall, 1st Floor<br>Pal Heights Mantra, Pahala<br>Bhubaneswar`;
  $('#finWhen').innerHTML = `<span>Sunday, 6 December 2026, ${timeLabel}</span><span class="dot"> · </span><span>Feelings\u00a0Hall, 1st\u00a0Floor, Pal\u00a0Heights\u00a0Mantra, Bhubaneswar</span>`;
}
(() => {
  const grid = $('#calGrid'), first = new Date(Date.UTC(Y, Mo - 1, 1)).getUTCDay(), days = new Date(Date.UTC(Y, Mo, 0)).getUTCDate();
  let h = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<b>${d}</b>`).join('');
  for (let i = 0; i < first; i++) h += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const sun = (first + d - 1) % 7 === 0;
    if (d === Da) h += `<span class="the${sun ? ' sun' : ''}">${d}<svg class="cal__heart" viewBox="-60 -60 120 120" aria-hidden="true"><path pathLength="1" d="M3 33C-20 16-46 0-41-23C-36-44-10-45 0-23C7-45 36-48 43-27C50-6 27 14-1 36C-6 40-13 38-11 31"/></svg></span>`;
    else h += `<span${sun ? ' class="sun"' : ''}>${d}</span>`;
  }
  grid.innerHTML = h;
  const heart = $('.cal__heart path', grid), mw = $$('.day__mandala .w'), md = $$('.day__mandala .dot');
  if (RM) { gsap.set(heart, { strokeDashoffset: 0 }); gsap.set(mw, { strokeDashoffset: 0 }); gsap.set(md, { opacity: 1 }); return; }
  gsap.from('#calGrid span', { opacity: 0, scale: .6, duration: .9, stagger: { each: .016, from: Da + first - 1 }, ease: 'back.out(2)', scrollTrigger: once(grid, 'top 80%') });
  gsap.to(heart, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', delay: .9, scrollTrigger: once(grid, 'top 80%') });
  gsap.from('.day__num', { scale: 1.3, opacity: 0, duration: 2, scrollTrigger: once('.day__num', 'top 85%') });
  gsap.from('.day__wd, .day__month', { opacity: 0, y: 20, duration: 1.4, stagger: .15, scrollTrigger: once('.day__num', 'top 85%') });
  gsap.to(mw, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: { amount: .8 }, scrollTrigger: once('.day__big', 'top 75%') });
  gsap.to(md, { opacity: 1, duration: .6, stagger: { amount: .8 }, delay: 1.6, scrollTrigger: once('.day__big', 'top 75%') });
})();
$$('[data-type]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => typeInto(el, el.dataset.type, 44) }));
(() => {
  // split-flap tiles: the old number folds down over the new one
  const flaps = Object.fromEntries($$('.fl').map(e => {
    e.innerHTML = '<span class="fl__t"><b>00</b></span><span class="fl__b"><b>00</b></span><span class="fl__ft"><b>00</b></span><span class="fl__fb"><b>00</b></span>';
    return [e.dataset.k, { el: e, v: '00', b: $$('b', e) }];
  }));
  let live = false;
  const set = (k, v) => {
    const f = flaps[k], s = String(v).padStart(2, '0');
    if (!live || s === f.v) return;
    const [top, bot, ft, fb] = f.b, old = f.v; f.v = s;
    if (RM) { f.b.forEach(b => b.textContent = s); return; }
    top.textContent = s; bot.textContent = old; ft.textContent = old; fb.textContent = s;
    f.el.classList.remove('go'); void f.el.offsetWidth; f.el.classList.add('go');
    clearTimeout(f.t); f.t = setTimeout(() => { bot.textContent = ft.textContent = s; f.el.classList.remove('go'); }, 680);
  };
  // the clock starts at 00 and flips to the real time when it comes into view
  ScrollTrigger.create({ trigger: '#fin', start: 'top 88%', once: true, onEnter: () => { live = true; upd(); } });
  function upd() {
    let ms = startUTC - Date.now();
    if (ms <= 0) { const end = startUTC + (hasTime ? CONFIG.durationHours || 4 : 24) * 3600000; $('#cdTitle').textContent = Date.now() < end ? 'Today is the day' : 'Thank you for celebrating with us'; ms = 0; }
    const s = Math.floor(ms / 1000);
    set('d', Math.floor(s / 86400)); set('h', Math.floor(s % 86400 / 3600)); set('m', Math.floor(s % 3600 / 60)); set('s', s % 60);
  }
  upd(); setInterval(upd, 1000);
  const pad = n => String(n).padStart(2, '0');
  const fmt = t => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
  const title = 'Ipsita & Asish: Engagement & Ring Ceremony', details = 'The engagement of Ipsita Senapati and Asish Kumar Sahoo. Margashirsha Krishna Trayodashi, Ravi Pradosh.';
  const day = `${Y}${pad(Mo)}${pad(Da)}`, nx = new Date(Date.UTC(Y, Mo - 1, Da + 1)), nextDay = `${nx.getUTCFullYear()}${pad(nx.getUTCMonth() + 1)}${pad(nx.getUTCDate())}`;
  const dur = (CONFIG.durationHours || 4) * 3600000;
  const dates = hasTime ? `${fmt(startUTC)}/${fmt(startUTC + dur)}` : `${day}/${nextDay}`;
  const loc = venueFull() + ', ' + CONFIG.venue.address;
  $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + dates + '&details=' + encodeURIComponent(details) + '&location=' + encodeURIComponent(loc);
  $('#ics').addEventListener('click', () => {
    const esc = s => s.replace(/,/g, '\\,');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ipsita and Asish//Engagement//EN', 'BEGIN:VEVENT', 'UID:ipsita-asish-20261206@engagement', 'DTSTAMP:' + fmt(Date.now()),
      ...(hasTime ? ['DTSTART:' + fmt(startUTC), 'DTEND:' + fmt(startUTC + dur)] : ['DTSTART;VALUE=DATE:' + day, 'DTEND;VALUE=DATE:' + nextDay]),
      'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(details), 'LOCATION:' + esc(loc), 'END:VEVENT', 'END:VCALENDAR'];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ipsita-asish-engagement.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
})();

/* ═════════ 6 · MOMENTS: a sphere of photographs ═════════ */
const Sphere = (() => {
  const stage = $('#sphere'), M = CONFIG.moments || [], DEG = Math.PI / 180;
  if (!M.length) return { pause() {} };
  const N = innerWidth < 700 ? 35 : 70, GA = Math.PI * (3 - Math.sqrt(5)), r = rng(42);
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i + .5) / N * 2, rad = Math.sqrt(1 - y * y), t = i * GA;
    const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1), R = 2.2 + r();
    return { x: Math.cos(t) * rad, y, z: Math.sin(t) * rad, sx: R * Math.sin(b) * Math.cos(a), sy: R * Math.cos(b), sz: R * Math.sin(b) * Math.sin(a), dl: r() * .6 };
  });
  const nodes = pts.map((q, i) => {
    const m = M[i % M.length], b = document.createElement('button');
    b.className = 'hn'; b.type = 'button'; b.dataset.i = i % M.length; b.setAttribute('aria-label', 'Open photo: ' + m.title);
    if (i >= M.length) b.tabIndex = -1;
    b.innerHTML = `<img src="${thumb(m.src)}" data-raw="${m.src}" alt="" decoding="async" draggable="false">`; rescue(b.firstChild);
    stage.appendChild(b); return b;
  });
  let S = 0, Rr = 0, Pp = 0, half = 0, rotY = 0, rotX = -14, vY = 0, vX = 0, dragging = false, moved = 0, lx = 0, ly = 0, visible = false, raf = 0, t0 = 0, last = 0, assembled = RM, paused = false;
  function size() { S = stage.clientWidth; Rr = S * .4; Pp = Rr * 3.4; const s = Math.round(S * (innerWidth < 700 ? .105 : .1)); half = s / 2; stage.style.setProperty('--s', s + 'px'); }
  size(); addEventListener('resize', size);
  function frame(now) {
    raf = 0; if (!visible || paused) return;
    if (!t0) t0 = now; const el = (now - t0) / 1000, k = last ? clamp((now - last) / 16.67, .5, 3) : 1; last = now;
    if (!dragging) {
      rotY += (vY + (RM ? 0 : .14)) * k; rotX += vX * k; vY *= Math.pow(.95, k); vX *= Math.pow(.95, k);
      rotX += (-14 - rotX) * .02 * k;
    }
    rotX = clamp(rotX, -60, 60);
    const cy = Math.cos(rotY * DEG), sy = Math.sin(rotY * DEG), cx = Math.cos(rotX * DEG), sx = Math.sin(rotX * DEG), c = S / 2;
    for (let i = 0; i < N; i++) {
      const q = pts[i]; let x = q.x, y = q.y, z = q.z, op = 1;
      if (!assembled) { const e = easeOut(clamp((el - q.dl) / 1.8)); x = lerp(q.sx, x, e); y = lerp(q.sy, y, e); z = lerp(q.sz, z, e); op = e; }
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const fz = Pp / (Pp - z2 * Rr), X = c + x1 * Rr * fz, Yy = c + y2 * Rr * fz, depth = clamp((z2 + 1) / 2), sc = fz * (.55 + .5 * depth);
      const n = nodes[i];
      n.style.transform = `translate3d(${(X - half).toFixed(1)}px,${(Yy - half).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      n.style.opacity = ((.22 + .78 * sm(-.55, .35, z2)) * op).toFixed(3);
      const zi = 1000 + Math.round(z2 * 40); if (n._z !== zi) { n._z = zi; n.style.zIndex = zi; }
    }
    if (!assembled && el > 2.6) assembled = true;
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: .1 }).observe(stage);
  let pid = null;
  stage.addEventListener('pointerdown', e => { if (dragging) return; pid = e.pointerId; dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; vX = vY = 0; });
  addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    vY = clamp(dx * .3, -8, 8); vX = e.pointerType === 'mouse' ? clamp(-dy * .3, -6, 6) : 0; rotY += vY; rotX += vX;
  }, { passive: true });
  const end = e => { if (e.pointerId === pid) { dragging = false; pid = null; } };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  stage.addEventListener('click', e => { const b = e.target.closest('.hn'); if (!b) return; if (moved > 8) { e.preventDefault(); return; } Lightbox.open(+b.dataset.i, b); });
  return { pause: v => { paused = v; if (!v) start(); } };
})();

const Lightbox = (() => {
  const lb = $('#lb'), img = $('#lbImg'), M = CONFIG.moments || []; let i = 0, last = null;
  function show(k, animate) {
    i = (k + M.length) % M.length;
    const put = () => { img.dataset.raw = M[i].src; img.src = large(M[i].src); rescue(img); img.alt = M[i].title; $('#lbTitle').textContent = M[i].title; $('#lbCap').textContent = M[i].caption || CONFIG.momentCaption || ''; $('#lbN').textContent = `${String(i + 1).padStart(2, '0')} of ${String(M.length).padStart(2, '0')}`; };
    put();
    if (animate && !RM) gsap.fromTo('.lb__img img', { opacity: .35 }, { opacity: 1, duration: .15, ease: 'none', overwrite: true });
  }
  function open(k, from) {
    last = document.activeElement; show(k); lb.hidden = false; Sphere.pause(true); lenis && lenis.stop(); html.classList.add('is-locked');
    gsap.to('.lb__bg', { opacity: 1, duration: RM ? .2 : .3, ease: EASE_OUT });
    if (from && !RM) {
      const a = from.getBoundingClientRect(), b = $('.lb__img').getBoundingClientRect();
      gsap.fromTo('.lb__img', { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width }, { x: 0, y: 0, scale: 1, duration: .5, ease: EASE_OUT });
    } else if (!RM) gsap.fromTo('.lb__img', { scale: .95, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: EASE_OUT });
    gsap.fromTo('.lb__cap > *', { opacity: 0, y: RM ? 0 : 12 }, { opacity: 1, y: 0, stagger: .04, duration: .3, delay: .15, ease: EASE_OUT });
    gsap.fromTo('.lb__close', { opacity: 0 }, { opacity: 1, duration: .3, delay: .15, ease: EASE_OUT });
    setTimeout(() => $('.lb__close').focus(), 60);
  }
  function close() {
    gsap.to('.lb__bg,.lb__fig,.lb__close', { opacity: 0, duration: .2, ease: EASE_OUT, onComplete: () => { lb.hidden = true; gsap.set('.lb__fig,.lb__close', { opacity: 1 }); } });
    Sphere.pause(false); lenis && lenis.start(); html.classList.remove('is-locked');
    last && last.focus && last.focus({ preventScroll: true });
  }
  lb.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  $('#lbPrev').addEventListener('click', () => show(i - 1, true)); $('#lbNext').addEventListener('click', () => show(i + 1, true));
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1, true); if (e.key === 'ArrowRight') show(i + 1, true);
    if (e.key === 'Tab') { const fb = $$('button', lb), first = fb[0], lastB = fb[fb.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastB.focus(); } else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); first.focus(); } }
  });
  return { open };
})();

/* ═════════ 7 · VENUE ═════════ */
$('#dirBtn').href = CONFIG.venue.maps;
$('#copyAddr').addEventListener('click', async e => {
  const b = e.currentTarget, t = b.textContent;
  try { await navigator.clipboard.writeText(venueFull() + ', ' + CONFIG.venue.address); b.textContent = 'Address copied'; } catch (_) { b.textContent = 'Copy failed, long-press the address'; }
  setTimeout(() => b.textContent = t, 2200);
});
(() => {
  const V = CONFIG.venue, el = $('#vmap'), chips = $('#chips');
  const places = [{ name: V.name, at: V.pin || [20.2984, 85.8231], venue: true }, ...(V.landmarks || [])];
  chips.innerHTML = places.map((p, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-i="${i}"><i></i>${p.name}</button>`).join('');
  // warm ivory map to sit inside the zari frame
  const STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#F3ECDF' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7A5442' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#FBF8F3' }, { weight: 3 }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D9C7A8' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#EEE5D4' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#EAE1CF' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E0E4C8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FCF6EA' }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#EED9AC' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#D4AE5E' }] },
    { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#C9B48E' }] },
    { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CCDCDD' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6E8A90' }] }
  ];
  let map = null, started = false, failed = false;
  const pad = () => innerWidth < 700 ? { top: 110, left: 50, right: 50, bottom: 60 } : { top: 120, left: 110, right: 110, bottom: 70 };
  // if the key is missing, refused or the script cannot load, show Google's plain embed instead
  function fallback() {
    if (failed) return; failed = true; map = null;
    const at = V.pin || [20.3419441, 85.8830584], q = `${at[0]},${at[1]}+(${encodeURIComponent(V.name)})`;
    el.innerHTML = `<iframe title="Map showing ${V.name}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${q}&z=15&output=embed"></iframe>`;
  }
  window.gm_authFailure = fallback;
  async function build() {
    try {
      const { Map, OverlayView } = await google.maps.importLibrary('maps');
      const { LatLng, LatLngBounds, ControlPosition } = await google.maps.importLibrary('core');
      if (failed) return;
      el.innerHTML = '';
      map = new Map(el, { styles: STYLE, disableDefaultUI: true, zoomControl: true, zoomControlOptions: { position: ControlPosition.LEFT_BOTTOM }, gestureHandling: 'cooperative', clickableIcons: false, keyboardShortcuts: false, backgroundColor: '#F3ECDF' });
      // HTML pins (the wax seal and gold markers) drawn as an overlay so they keep the site's styling
      class Pin extends OverlayView {
        constructor(p, i) { super(); this.p = p; this.i = i; this.pos = new LatLng(p.at[0], p.at[1]); }
        onAdd() {
          const d = document.createElement('div'); d.className = 'pin-ov';
          d.innerHTML = this.p.venue ? `<div class="pin pin--venue"><img src="assets/art/seal.webp" alt=""><span>${this.p.name}</span></div>` : `<div class="pin${this.p.side ? ' pin--' + this.p.side : ''}"><i></i><span>${this.p.name}</span></div>`;
          d.style.zIndex = this.p.venue ? 2 : 1;
          d.addEventListener('click', e => { e.stopPropagation(); focus(this.i); });
          this.d = d; this.getPanes().overlayMouseTarget.appendChild(d);
        }
        draw() { const pt = this.getProjection().fromLatLngToDivPixel(this.pos); if (pt) { this.d.style.left = pt.x + 'px'; this.d.style.top = pt.y + 'px'; } }
        onRemove() { this.d && this.d.remove(); }
      }
      places.forEach((p, i) => new Pin(p, i).setMap(map));
      const b = new LatLngBounds(); places.forEach(p => b.extend(new LatLng(p.at[0], p.at[1])));
      map.fitBounds(b, pad());
      places.bounds = b;
    } catch (e) { fallback(); }
  }
  function load() {
    if (started) return; started = true;
    if (!CONFIG.venue.mapsKey) { fallback(); return; }
    window.__aiMap = build;
    const sc = document.createElement('script');
    sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CONFIG.venue.mapsKey)}&v=weekly&loading=async&callback=__aiMap`;
    sc.async = true; sc.onerror = fallback;
    document.head.appendChild(sc);
  }
  function focus(i) {
    $$('.chip', chips).forEach((c, k) => c.classList.toggle('on', k === i));
    if (!map) return;
    const [lat, lng] = places[i].at;
    map.panTo({ lat, lng });
    map.setZoom(i ? 15 : 16);
  }
  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) focus(+b.dataset.i); });
  new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '700px' }).observe(el);
})();

/* ═════════ 8 · KINDLY REPLY ═════════ */
const DIYA = '<span class="diya"><i class="diya__flame"><i></i></i><img class="art" src="assets/art/diya.webp" alt="" width="179" height="82"></span>';
(() => {
  const sec = $('#rsvp'), card = $('#rsvp .card'), form = $('#rform'), name = $('#rname'), note = $('#rnote'), err = $('#rerr'), out = $('#gcount'), guests = $('#guests'), diyas = $('#rdone .diyas');
  // with no number set, WhatsApp opens its chat picker and the guest chooses who receives the reply
  const waNum = String(CONFIG.rsvpWhatsApp || '').replace(/\D/g, '');
  let n = 1;
  [['#fName', name], ['#fNote', note]].forEach(([w, i]) => i.addEventListener('input', () => $(w).classList.toggle('filled', !!i.value)));
  $$('.step button').forEach(b => b.addEventListener('click', () => { n = clamp(n + +b.dataset.step, 1, 12); out.textContent = n; if (!RM) gsap.fromTo(out, { yPercent: +b.dataset.step > 0 ? 40 : -40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5 }); }));
  $$('input[name="att"]').forEach(r => r.addEventListener('change', () => guests.classList.toggle('off', form.att.value === 'no')));
  const flipTo = on => {
    if (RM) { sec.classList.toggle('done', on); diyas.classList.toggle('unlit', !on); return; }
    gsap.to(card, { rotateY: 90, transformPerspective: 1800, duration: .5, ease: 'power2.in', onComplete: () => {
      sec.classList.toggle('done', on); diyas.classList.add('unlit'); ScrollTrigger.refresh();
      gsap.fromTo(card, { rotateY: -90 }, { rotateY: 0, duration: .9, ease: 'power3.out', clearProps: 'transform', onComplete: () => { if (on) { diyas.classList.remove('unlit'); const r = diyas.getBoundingClientRect(); FX.embers(r.left + r.width / 2, r.top + r.height * .2, 36, 2.4); } } });
    } });
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const who = name.value.trim();
    if (!who) { err.textContent = 'Add your name so the family knows who is coming.'; name.focus(); return; }
    err.textContent = '';
    const yes = form.att.value === 'yes';
    const msg = [`Namaskar! RSVP for Ipsita & Asish's engagement (Sunday, 6 December 2026, ${venueFull()}, Bhubaneswar).`, '', `Name: ${who}`,
      yes ? 'Attending: Yes, joyfully' : 'Attending: Sending blessings from afar', yes ? `Guests (including me): ${n}` : '', note.value.trim() ? `Note: ${note.value.trim()}` : ''].filter((l, i) => l || i === 1).join('\n');
    const url = (waNum ? `https://wa.me/${waNum}` : 'https://wa.me/') + '?text=' + encodeURIComponent(msg);
    $('#waAgain').href = url;
    window.open(url, '_blank', 'noopener');
    const b = $('#sendBtn img').getBoundingClientRect();
    if (!RM) gsap.fromTo('#sendBtn img', { scale: .82, rotate: -10 }, { scale: 1, rotate: 0, duration: 1, ease: 'elastic.out(1,.4)' });
    FX.burst(b.left + b.width / 2, b.top + b.height / 2, 56, .8); FX.dust(b.left + b.width / 2, b.top + b.height / 2, 36, 1.6);
    clearTimeout(swanT);
    setTimeout(() => { flipTo(true); Lake.boat(who); }, RM ? 0 : 700);
  });
  // a few seconds after a guest has typed their name, their swan diya sets out on the lake (no need to send first)
  let swanT = 0;
  name.addEventListener('input', () => {
    clearTimeout(swanT);
    const who = name.value.trim().replace(/\s+/g, ' ');
    if (who.length >= 2) swanT = setTimeout(() => Lake.boat(who), 4500);
  });
  $('#editRsvp').addEventListener('click', () => { flipTo(false); setTimeout(() => name.focus({ preventScroll: true }), RM ? 0 : 1300); });
})();

/* ═════════ the lake below the temples ═════════ */
const Temples = (() => {
  const P = pts => 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
  const mirror = (L, x) => L.concat(L.slice(0, -1).reverse().map(([px, py]) => [2 * x - px, py]));
  function rekha(x, base, w, h, flagDir = 1) {
    const hw = w / 2, L = [], yPl = base - h * .035, yM = base - h * .13, yB = base - h * .27, yG = base - h * .8;
    L.push([x - hw * 1.12, base], [x - hw * 1.12, yPl], [x - hw * 1.02, yPl], [x - hw * 1.02, yM], [x - hw * 1.08, yM], [x - hw * 1.08, yM - h * .016], [x - hw, yM - h * .016], [x - hw, yB], [x - hw * 1.05, yB], [x - hw * 1.05, yB - h * .012]);
    const N = 14, y0 = yB - h * .012;
    for (let i = 0; i <= N; i++) { const u = i / N, k = 1 - .45 * Math.pow(u, 2.15), y = y0 - (y0 - yG) * u; L.push([x - hw * k * 1.04, y]); if (i < N) L.push([x - hw * k * 1.04, y - (y0 - yG) / N * .35], [x - hw * k, y - (y0 - yG) / N * .35]); }
    const yN = yG - h * .02; L.push([x - hw * .4, yG], [x - hw * .4, yN]);
    const ry = h * .028, rx = hw * .72, ya = yN - ry;
    for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 + Math.PI * i / 18, rr = 1 + .05 * Math.sin(a * 14); L.push([x + rx * rr * Math.cos(a), ya + ry * Math.sin(a)]); }
    const yK = ya - ry, dh = h * .03;
    for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI / 2 * i / 8; L.push([x + hw * .34 * Math.cos(a), yK + dh * Math.sin(a)]); }
    let s = `<path d="${P(mirror(L, x))}"/>`;
    const top = yK - dh, kr = Math.max(2, hw * .13), pole = h * .08, pw = Math.max(1.2, w * .014);
    s += `<circle cx="${x}" cy="${top - kr * .8}" r="${kr}"/><rect x="${x - pw / 2}" y="${top - kr * 1.6 - pole}" width="${pw}" height="${pole}"/>`;
    const fy = top - kr * 1.6 - pole, fl = h * .045;
    s += `<path d="M${x} ${fy}l${flagDir * fl} ${fl * .3}l${-flagDir * fl * .15} ${fl * .3}l${flagDir * fl * .15} ${fl * .3}L${x} ${fy + fl * .55}z"/>`;
    return s;
  }
  function pidha(x, base, w, h, tiers = 3) {
    const hw = w / 2, L = [], yB = base - h * .4;
    L.push([x - hw * 1.06, base], [x - hw * 1.06, base - h * .04], [x - hw, base - h * .04], [x - hw, yB]);
    const th = h * .1, kg = h * .028;
    for (let k = 0; k < tiers; k++) { const y0 = yB - k * (th + kg), wide = hw * (1.2 - k * .2), nar = hw * (.98 - k * .2); L.push([x - wide, y0], [x - nar * .94, y0 - th], [x - nar * .8, y0 - th], [x - nar * .8, y0 - th - kg]); }
    const yT = yB - tiers * (th + kg), bw = hw * .58, bh = h * .14;
    L.push([x - bw, yT]);
    for (let i = 0; i <= 10; i++) { const a = Math.PI + Math.PI / 2 * i / 10; L.push([x + bw * Math.cos(a), yT + bh * Math.sin(a) * (1 - .15 * Math.cos(a))]); }
    let s = `<path d="${P(mirror(L, x))}"/>`;
    const top = yT - bh, kr = Math.max(1.8, hw * .1);
    s += `<ellipse cx="${x}" cy="${top}" rx="${bw * .55}" ry="${h * .018}"/><circle cx="${x}" cy="${top - h * .018 - kr * .8}" r="${kr}"/><rect x="${x - .7}" y="${top - kr * 2 - h * .08}" width="1.4" height="${h * .08}"/>`;
    return s;
  }
  return { rekha, pidha };
})();

const Lake = (() => {
  const lake = $('#lake'), shore = $('#shore'), ref = $('#lakeRef');
  // shared colours for every lamp on the water (a zero-size svg, so Safari still finds them)
  lake.insertAdjacentHTML('afterbegin', `<svg class="lake__defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="lkGlow"><stop offset="0" stop-color="#FFC66B" stop-opacity=".6"/><stop offset=".45" stop-color="#FF9A3C" stop-opacity=".2"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></radialGradient>
    <linearGradient id="lkStreak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC66B" stop-opacity=".6"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></linearGradient>
    <linearGradient id="lkFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF6A12"/><stop offset=".5" stop-color="#FFAA33"/><stop offset="1" stop-color="#FFE08A" stop-opacity=".15"/></linearGradient>
    <linearGradient id="lkClay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DE7E44"/><stop offset=".55" stop-color="#A9481F"/><stop offset="1" stop-color="#5E220C"/></linearGradient>
    <linearGradient id="lkLeaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86A23F"/><stop offset="1" stop-color="#2B4314"/></linearGradient>
    <linearGradient id="lkBrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C8"/><stop offset=".3" stop-color="#EBC877"/><stop offset=".68" stop-color="#BF8E34"/><stop offset="1" stop-color="#6A4510"/></linearGradient>
    <linearGradient id="lkBrassL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7DC"/><stop offset=".45" stop-color="#E6C26E"/><stop offset="1" stop-color="#94661F"/></linearGradient>
  </defs></svg>`);
  const marigold = (x, y, r) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#E06A1A"/><circle r="${r * .76}" fill="none" stroke="#FFB021" stroke-width="${r * .36}" stroke-dasharray="${f2(r * .3)} ${f2(r * .2)}"/><circle r="${r * .42}" fill="#F8A51C"/><circle r="${r * .16}" fill="#7A320E"/></g>`;
  const flame = (x, base, h) => `<g class="lk-flame"><path d="M${x} ${base} C${x - 8} ${base - h * .3} ${x - 5} ${base - h * .72} ${x} ${base - h} C${x + 5} ${base - h * .72} ${x + 8} ${base - h * .3} ${x} ${base}Z" fill="url(#lkFlame)"/><path d="M${x} ${base - 1} C${x - 4} ${base - h * .2} ${x - 3} ${base - h * .42} ${x} ${base - h * .6} C${x + 3} ${base - h * .42} ${x + 4} ${base - h * .2} ${x} ${base - 1}Z" fill="#FFEAA8"/><ellipse cx="${x}" cy="${base - h * .12}" rx="1.7" ry="2.9" fill="#FFFFFF"/></g>`;
  const delay = () => `style="--d:${f2(-Math.random() * 3)}s"`;
  // a clay diya on a sal-leaf cup with marigolds; the anchor is the centre of its waterline
  const clay = () => `<svg class="lkd" viewBox="0 0 120 104" ${delay()} aria-hidden="true">
    <ellipse class="lk-streak" cx="104" cy="86" rx="5" ry="16" fill="url(#lkStreak)"/>
    <ellipse class="lk-rip" cx="60" cy="80" rx="48" ry="6" fill="none" stroke="#FFD9A0" stroke-opacity=".45" stroke-width="1"/>
    <circle class="lk-glow" cx="104" cy="32" r="32" fill="url(#lkGlow)"/>
    <path d="M6 70 C30 88 90 88 114 70 C104 84 84 90 60 90 C36 90 16 84 6 70Z" fill="url(#lkLeaf)"/>
    <path d="M6 70 C30 80 90 80 114 70" fill="none" stroke="#B4CC72" stroke-width="1.1" opacity=".75"/>
    <path d="M60 89V79M42 87l5-9M78 87l-5-9M24 83l8-6M96 83l-8-6" stroke="#3E5A1E" stroke-width=".8" opacity=".85"/>
    ${marigold(18, 71, 7)}${marigold(106, 72, 6.2)}${marigold(88, 79, 5)}
    <path d="M26 56 C28 74 88 78 96 58 L108 50 C102 50 98 50 94 52 C80 58 42 60 26 56Z" fill="url(#lkClay)"/>
    <ellipse cx="60" cy="55.5" rx="34" ry="5.5" fill="#43160A"/>
    <ellipse cx="60" cy="55" rx="34" ry="5.5" fill="none" stroke="#EBA067" stroke-width="1.2"/>
    <ellipse cx="58" cy="56" rx="24" ry="3.1" fill="#F2C35C" opacity=".85"/>
    <path d="M32 64 C48 71 74 71 90 63" fill="none" stroke="#A3242C" stroke-width="2.2"/>
    <path d="M32 64 C48 71 74 71 90 63" fill="none" stroke="#FFF1D6" stroke-width="1.5" stroke-dasharray="0 4.2" stroke-linecap="round"/>
    <path d="M94 52 L104 48" stroke="#2A1206" stroke-width="1.6" stroke-linecap="round"/>
    ${flame(104, 48, 32)}
  </svg>`;
  // the guest's own lamp: a brass swan (hamsa) diya with a lotus cup on its back, facing the way it glides
  const swan = () => `<div class="lks"><svg viewBox="0 0 220 160" ${delay()} aria-hidden="true">
    <path d="M52 131 C34 127 18 129 2 135 M60 135 C42 135 28 139 14 147" fill="none" stroke="#FFD9A0" stroke-opacity=".38" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse class="lk-rip" cx="112" cy="128" rx="86" ry="8" fill="none" stroke="#FFD9A0" stroke-opacity=".4" stroke-width="1"/>
    <ellipse class="lk-streak" cx="104" cy="137" rx="7" ry="21" fill="url(#lkStreak)"/>
    <circle class="lk-glow" cx="104" cy="50" r="44" fill="url(#lkGlow)"/>
    <path d="M58 104 C40 96 30 76 34 52 C44 70 54 84 70 94Z" fill="url(#lkBrassL)" stroke="#7A5212" stroke-width=".8"/>
    <path d="M60 106 C46 102 36 90 36 74 C46 86 56 94 72 98Z" fill="url(#lkBrass)" stroke="#7A5212" stroke-width=".7"/>
    <path d="M38 60 C44 74 54 86 66 94M36 78 C44 88 54 96 66 100" fill="none" stroke="#8A5E18" stroke-width=".7" opacity=".8"/>
    <path d="M52 104 C54 128 150 134 170 108 C174 102 172 98 166 98 L64 98 C56 98 52 100 52 104Z" fill="url(#lkBrass)" stroke="#6A4510" stroke-width=".9"/>
    <path d="M58 106 C88 116 134 116 164 104" fill="none" stroke="#8A5E18" stroke-width=".8"/>
    <path d="M62 113 C88 124 132 124 158 111" fill="none" stroke="#FFF1C8" stroke-width="1.5" stroke-dasharray="0 4" stroke-linecap="round" opacity=".9"/>
    <path d="M76 108 C90 92 122 88 142 98 C130 100 116 104 106 112 C96 114 84 112 76 108Z" fill="url(#lkBrassL)" stroke="#7A5212" stroke-width=".8"/>
    <path d="M86 106 C98 98 116 96 132 99M92 110 C102 104 114 102 124 103" fill="none" stroke="#8A5E18" stroke-width=".7"/>
    <path d="M150 104 C166 94 166 78 160 66 C153 52 156 36 170 33 C182 31 189 40 186 48 L200 51 C193 54 186 55 181 53 C176 60 175 70 179 82 C184 98 172 110 152 110Z" fill="url(#lkBrassL)" stroke="#6A4510" stroke-width=".9"/>
    <path d="M186 47.5 L201 51 L186.5 54Z" fill="#B8402A"/>
    <path d="M168 34 C170 26 176 24 180 28 C176 28 173 30 172 34Z" fill="url(#lkBrass)"/>
    <circle cx="176" cy="41" r="1.9" fill="#2A1206"/><circle cx="176.6" cy="40.4" r=".55" fill="#FFF"/>
    <circle cx="165" cy="92" r="3.3" fill="#A3242C" stroke="#FFF1C8" stroke-width=".8"/>
    <path d="M90 98 C88 88 96 82 104 80 C112 82 120 88 118 98Z" fill="url(#lkBrass)" stroke="#6A4510" stroke-width=".8"/>
    <path d="M96 97 C94 90 99 86 104 85 C109 86 114 90 112 97M104 85V97" fill="none" stroke="#8A5E18" stroke-width=".7"/>
    <ellipse cx="104" cy="81" rx="12" ry="2.6" fill="#4A2A08"/><ellipse cx="104" cy="81" rx="9" ry="1.8" fill="#F2C35C"/>
    ${flame(104, 80, 38)}
  </svg><span class="boat__name"></span></div>`;
  function spawn(h, x, y, dur, dx) {
    const fl = $$('.float', lake); if (fl.length > 30) fl[0].remove();
    const el = document.createElement('div'); el.className = 'float'; el.innerHTML = `<div class="anchor"><div class="bob">${h}</div></div>`;
    el.style.left = x + 'px'; el.style.top = y + 'px'; lake.appendChild(el);
    if (RM) return el;
    gsap.fromTo(el, { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' });
    gsap.to(el, { x: dx, y: -14, duration: dur, ease: 'none', onComplete: () => el.remove() });
    gsap.to(el, { opacity: 0, duration: 2, delay: dur - 2 });
    return el;
  }
  // the guest's swan: it glides in from the left, turns at the far side and keeps gliding to and fro in its own lane,
  // above the little diyas, so it is there whenever the guest reaches the lake. A new name renames the same swan.
  let sw = null, swTween = null, swDir = 1, lakeSeen = false;
  const swanY = () => lake.clientHeight * .4;
  function glide() {
    const W = lake.clientWidth, to = swDir > 0 ? W * .8 : W * .2, from = gsap.getProperty(sw, 'x');
    swTween = gsap.to(sw, { x: to, duration: Math.max(4, Math.abs(to - from) / Math.max(26, W / 24)), ease: 'sine.inOut', onComplete: () => {
      swDir = -swDir;
      // turning round on the water
      swTween = gsap.to($('svg', sw), { scaleX: swDir, duration: 1.1, ease: 'power1.inOut', onComplete: glide });
    } });
    if (!lakeSeen) swTween.pause();
  }
  function boat(name) {
    if (sw) { $('.boat__name', sw).textContent = name; return; }
    sw = document.createElement('div'); sw.className = 'float float--swan';
    sw.innerHTML = `<div class="anchor"><div class="bob">${swan()}</div></div>`; $('.boat__name', sw).textContent = name;
    sw.style.left = '0px'; sw.style.top = swanY() + 'px'; lake.appendChild(sw);
    if (RM) { gsap.set(sw, { x: lake.clientWidth * .5 }); return; }
    gsap.set(sw, { x: -120 }); gsap.fromTo(sw, { opacity: 0 }, { opacity: 1, duration: 1.4 });
    glide();
  }
  // the swan only moves while the lake is on screen, so it is never missed and costs nothing out of view
  new IntersectionObserver(es => { lakeSeen = es[0].isIntersecting; if (swTween) lakeSeen ? swTween.resume() : swTween.pause(); }).observe(lake);
  addEventListener('resize', () => { if (sw) sw.style.top = swanY() + 'px'; });
  function diya(x, y) { spawn(clay(), x, y, 16, 110 + Math.random() * 160); }
  lake.addEventListener('click', e => { const r = lake.getBoundingClientRect(); diya(e.clientX - r.left, e.clientY - r.top); });
  lake.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); diya(lake.clientWidth * (.2 + Math.random() * .6), lake.clientHeight * (.35 + Math.random() * .35)); } });
  ScrollTrigger.create({ trigger: lake, start: 'top 85%', once: true, onEnter: () => [0, 1300, 2700, 4200].forEach((t, k) => setTimeout(() => diya(lake.clientWidth * (.1 + k * .22), lake.clientHeight * (.56 + (k % 2) * .14)), t)) });
  function drawShore() {
    const W = shore.parentNode.clientWidth, H = shore.parentNode.clientHeight; if (!W || !H) return;
    const r = rng(5); let g = '';
    for (let x = 14; x < W; x += 40 + r() * 92) { const h = H * (.32 + r() * .66); g += r() < .65 ? Temples.rekha(x, H, h * .34, h, r() < .5 ? 1 : -1) : Temples.pidha(x, H, h * .9, h * .78); }
    g += `<rect x="0" y="${H - 3}" width="${W}" height="3"/>`;
    [shore, ref].forEach(el => { el.setAttribute('viewBox', `0 0 ${W} ${H}`); el.setAttribute('height', H); el.innerHTML = g; });
  }
  drawShore(); addEventListener('resize', () => { clearTimeout(drawShore.t); drawShore.t = setTimeout(drawShore, 150); });
  return { boat };
})();

/* footer: the names written out in gold */
if (!RM) {
  { const fm = $('#footMark'), st = { p: 0 }; let pb = null;
    gsap.to(st, { p: 1, duration: 2.6, ease: 'power2.inOut', scrollTrigger: once(fm, 'top 95%'), onStart: () => { pb = penBox(fm); }, onUpdate() {
      fm.style.clipPath = `inset(-20% ${f2(100 - st.p * 100)}% -20% 0)`;
      if (!pb) return; const x = pb.left + pb.width * st.p;
      if (x > pb.l && x < pb.r && st.p < 1) FX.dust(x, pb.top() + pb.h * (.2 + Math.random() * .6), 1, 1, true);
    }, onComplete: () => { fm.style.clipPath = ''; } });
    fm.style.clipPath = 'inset(-20% 100% -20% 0)'; }
  gsap.from('.foot > p, .foot > .btn', { opacity: 0, y: 20, duration: 1.4, stagger: .12, scrollTrigger: once('#footMark', 'top 95%') });
}

ScrollTrigger.sort();
addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
