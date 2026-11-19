/* Ornament kit for the Asish & Ipsita card: gold foil, marigold torans, kalash, diyas,
   elephants, peacocks, lotuses, cusped arches and Pattachitra-style frames.
   Everything is drawn as SVG strings so it scales cleanly and can be animated. */
(function () {
  'use strict';
  const f = n => +n.toFixed(2);

  /* ── shared paint: gradients, filters and reusable flower symbols ── */
  function defs() {
    let mg = '';
    const petal = (w, L) => `M0 0C${f(-w * .6)} ${f(-L * .4)} ${f(-w)} ${f(-L * .75)} ${f(-w * .62)} ${f(-L * .93)}Q${f(-w * .3)} ${f(-L * 1.03)} 0 ${f(-L * .95)}Q${f(w * .3)} ${f(-L * 1.03)} ${f(w * .62)} ${f(-L * .93)}C${f(w)} ${f(-L * .75)} ${f(w * .6)} ${f(-L * .4)} 0 0z`;
    const flower = (id, cols) => {
      let s = `<symbol id="${id}" viewBox="-50 -50 100 100" overflow="visible">`;
      [[48, 20, 15, 0], [38, 17, 13, 9], [28, 14, 11, 4], [18, 10, 9, 13]].forEach(([L, n, w, off], k) => {
        for (let i = 0; i < n; i++) s += `<path transform="rotate(${f(i / n * 360 + off)})" d="${petal(w, L)}" fill="${cols[k]}" stroke="#B4500A" stroke-opacity=".35" stroke-width=".8"/>`;
      });
      s += `<circle r="7" fill="#B95407"/><circle r="3.5" fill="#E38D1C"/></symbol>`;
      return s;
    };
    mg += flower('mgA', ['#FFC233', '#FFA51C', '#F48A0E', '#E06A08']);
    mg += flower('mgB', ['#FFD54D', '#FFBC2B', '#F99E17', '#EA7C0C']);
    mg += flower('mgR', ['#E8445A', '#D72F49', '#C0213B', '#A3172F']);
    // a simplified marigold for tiny sizes (strings and swags)
    mg += `<symbol id="mgS" viewBox="-50 -50 100 100" overflow="visible">` +
      Array.from({ length: 14 }, (_, i) => `<path transform="rotate(${f(i * 360 / 14)})" d="${petal(18, 48)}" fill="#FFB020"/>`).join('') +
      Array.from({ length: 10 }, (_, i) => `<path transform="rotate(${f(i * 36 + 18)})" d="${petal(14, 32)}" fill="#F38A0F"/>`).join('') +
      `<circle r="9" fill="#C25D08"/></symbol>`;
    mg += `<symbol id="leafS" viewBox="-12 0 24 60" overflow="visible"><path d="M0 0C10 12 11 34 0 58C-11 34-10 12 0 0z" fill="url(#leaf)"/><path d="M0 2V56" stroke="#9BC46B" stroke-width="1" opacity=".7"/></symbol>`;
    mg += `<symbol id="paisley" viewBox="0 0 60 90" overflow="visible"><path d="M30 88C8 86 0 66 6 50 12 32 30 22 40 12 46 6 50 2 54 0 50 8 52 16 56 26 62 44 58 70 44 82 40 86 35 88 30 88z"/><path d="M30 78C17 76 12 64 16 54 20 42 32 36 40 28 42 40 46 50 44 62 42 72 36 78 30 78z" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".9"/><circle cx="30" cy="62" r="4"/></symbol>`;

    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7A5418"/><stop offset=".18" stop-color="#C99A3B"/><stop offset=".33" stop-color="#F3DB8E"/>
        <stop offset=".42" stop-color="#FFF4C9"/><stop offset=".54" stop-color="#D9AF55"/><stop offset=".72" stop-color="#8F6420"/>
        <stop offset=".88" stop-color="#E2C26E"/><stop offset="1" stop-color="#A57A2C"/>
      </linearGradient>
      <linearGradient id="foilV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F6E3A1"/><stop offset=".35" stop-color="#D4A84E"/><stop offset=".6" stop-color="#9C7027"/><stop offset=".85" stop-color="#E8C877"/><stop offset="1" stop-color="#A37A2E"/>
      </linearGradient>
      <linearGradient id="foilU" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="400" spreadMethod="reflect">
        <stop offset="0" stop-color="#7E5719"/><stop offset=".25" stop-color="#C99A3B"/><stop offset=".4" stop-color="#F0D68E"/><stop offset=".55" stop-color="#B88A33"/><stop offset=".8" stop-color="#7E5719"/><stop offset="1" stop-color="#D9B866"/>
      </linearGradient>
      <radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#D4434C"/><stop offset=".45" stop-color="#A11E2B"/><stop offset="1" stop-color="#5E0E18"/></radialGradient>
      <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3F7F33"/><stop offset="1" stop-color="#1F5226"/></linearGradient>
      <linearGradient id="lotusG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFF4F6"/><stop offset=".55" stop-color="#F7B6C6"/><stop offset="1" stop-color="#E05A87"/></linearGradient>
      <linearGradient id="lotusG2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FAD0DB"/><stop offset="1" stop-color="#EE7EA0"/></linearGradient>
      <linearGradient id="copper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C3E17"/><stop offset=".3" stop-color="#C77A3E"/><stop offset=".45" stop-color="#F3C08A"/><stop offset=".62" stop-color="#C46F35"/><stop offset="1" stop-color="#6E3412"/></linearGradient>
      <radialGradient id="flameG" cx=".5" cy=".72" r=".6"><stop offset="0" stop-color="#FFFBE2"/><stop offset=".35" stop-color="#FFD660"/><stop offset=".75" stop-color="#FF8A26"/><stop offset="1" stop-color="#FF5A14" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowG"><stop offset="0" stop-color="#FFD27A" stop-opacity=".75"/><stop offset="1" stop-color="#FFB040" stop-opacity="0"/></radialGradient>
      <linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A8C8A"/><stop offset=".5" stop-color="#0F5E78"/><stop offset="1" stop-color="#173F86"/></linearGradient>
      <linearGradient id="wine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E1B2E"/><stop offset="1" stop-color="#5A0C1D"/></linearGradient>
      <filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.2" stdDeviation="1" flood-color="#4a2a08" flood-opacity=".35"/></filter>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
      ${mg}
    </defs></svg>`;
  }

  /* ── small pieces ── */
  const use = (id, x, y, s, rot = 0, cls = '') => `<use href="#${id}"${cls ? ` class="${cls}"` : ''} transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s / 100)})" width="100" height="100" x="-50" y="-50"/>`;

  function bell(x, y, s) {
    return `<g transform="translate(${f(x)} ${f(y)})">
      <path d="M0 ${-s * .42}V${-s * .2}" stroke="#8a6420" stroke-width="${f(s * .06)}"/>
      <circle cy="${f(-s * .46)}" r="${f(s * .07)}" fill="none" stroke="url(#foilV)" stroke-width="${f(s * .04)}"/>
      <path d="M${f(-s * .44)} ${f(s * .62)}C${f(-s * .46)} ${f(s * .1)} ${f(-s * .36)} ${f(-s * .24)} 0 ${f(-s * .24)}C${f(s * .36)} ${f(-s * .24)} ${f(s * .46)} ${f(s * .1)} ${f(s * .44)} ${f(s * .62)}Q${f(s * .56)} ${f(s * .7)} ${f(s * .62)} ${f(s * .76)}H${f(-s * .62)}Q${f(-s * .56)} ${f(s * .7)} ${f(-s * .44)} ${f(s * .62)}z" fill="url(#foilV)"/>
      <path d="M${f(-s * .4)} ${f(s * .34)}H${f(s * .4)}M${f(-s * .45)} ${f(s * .5)}H${f(s * .45)}" stroke="#8a6420" stroke-width="${f(s * .03)}" opacity=".6"/>
      <circle cy="${f(s * .86)}" r="${f(s * .1)}" fill="#8a6420"/></g>`;
  }

  function diya(x, y, s, cls = 'diya') {
    return `<g class="${cls}" transform="translate(${f(x)} ${f(y)})">
      <circle cy="${f(-s * .55)}" r="${f(s * .9)}" fill="url(#glowG)" class="diya__glow"/>
      <path class="diya__flame" d="M0 ${f(-s * 1.05)}C${f(-s * .18)} ${f(-s * .7)} ${f(-s * .26)} ${f(-s * .44)} 0 ${f(-s * .28)}C${f(s * .26)} ${f(-s * .44)} ${f(s * .18)} ${f(-s * .7)} 0 ${f(-s * 1.05)}z" fill="url(#flameG)"/>
      <path d="M${f(-s * .62)} ${f(-s * .26)}C${f(-s * .5)} ${f(s * .22)} ${f(s * .5)} ${f(s * .22)} ${f(s * .62)} ${f(-s * .26)}Q${f(s * .78)} ${f(-s * .34)} ${f(s * .9)} ${f(-s * .44)}Q${f(s * .7)} ${f(-s * .18)} ${f(s * .55)} ${f(-s * .14)}Q0 ${f(-s * .04)} ${f(-s * .55)} ${f(-s * .14)}z" fill="url(#copper)"/>
      <path d="M${f(-s * .62)} ${f(-s * .26)}Q0 ${f(-s * .12)} ${f(s * .62)} ${f(-s * .26)}" fill="none" stroke="#F6C99A" stroke-width="${f(s * .04)}" opacity=".7"/></g>`;
  }

  /* ── marigold toran: rope, leaves, swags, hanging strings with bells ── */
  function toran(W, o = {}) {
    const n = o.anchors || Math.max(3, Math.round(W / 210));
    const dip = o.dip || 46, top = 8;
    let back = '', front = '', strings = '';
    // rope
    back += `<path d="M0 ${top}H${W}" stroke="url(#foilV)" stroke-width="4"/><path d="M0 ${top}H${W}" stroke="#7a5418" stroke-width="1.2" stroke-dasharray="3 5" opacity=".7"/>`;
    // mango leaves hanging from the rope
    const nl = Math.round(W / 26);
    for (let i = 0; i < nl; i++) {
      const x = (i + .5) / nl * W, rot = (i % 2 ? -8 : 8) + Math.sin(i * 1.7) * 6;
      back += `<use href="#leafS" transform="translate(${f(x)} ${top + 2}) rotate(${f(rot)}) scale(${f(.62 + (i % 3) * .08)})" x="-12" y="0" width="24" height="60"/>`;
    }
    // flowers on the rope
    const nf = Math.round(W / 40);
    for (let i = 0; i <= nf; i++) front += use(i % 2 ? 'mgA' : 'mgB', i / nf * W, top, 22, i * 23);
    // swags between anchors
    for (let k = 0; k < n; k++) {
      const x0 = k / n * W, x1 = (k + 1) / n * W, steps = Math.round((x1 - x0) / 9);
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = x0 + (x1 - x0) * t, y = top + 4 + dip * Math.sin(Math.PI * t);
        front += use(i % 3 === 0 ? 'mgR' : 'mgS', x, y, 13 + Math.sin(Math.PI * t) * 3, i * 37);
      }
    }
    // hanging strings + bells at anchors
    for (let k = 0; k <= n; k++) {
      const x = k / n * W, len = (o.len || 7) - (k % 2);
      let g = `<g class="sway" style="transform-origin:${f(x)}px ${top}px;animation-delay:${f(-k * .7)}s">`;
      g += `<path d="M${f(x)} ${top}V${top + len * 12 + 6}" stroke="#9a7428" stroke-width="1"/>`;
      for (let i = 0; i < len; i++) g += use(i % 2 ? 'mgA' : 'mgB', x, top + 14 + i * 12, 15, i * 40);
      g += bell(x, top + 14 + len * 12 + 8, 18);
      g += '</g>';
      strings += g;
    }
    const H = top + (o.len || 7) * 12 + 40;
    return { svg: `<svg class="toran" viewBox="0 -8 ${f(W)} ${H + 8}" width="100%" height="${H + 8}" preserveAspectRatio="xMidYMin meet" aria-hidden="true">${back}${strings}${front}</svg>`, h: H };
  }

  /* ── kalash: copper pot, mango leaves, coconut ── */
  function kalash() {
    let leaves = '';
    [-155, -128, -100, -72, -45, -30, -142, -60].forEach((a, i) => {
      leaves += `<use href="#leafS" transform="translate(100 118) rotate(${a - 90}) scale(${i > 5 ? .9 : 1.05})" x="-12" y="0" width="24" height="60"/>`;
    });
    return `<svg class="kalash" viewBox="0 0 200 250" aria-hidden="true">
      <ellipse cx="100" cy="236" rx="70" ry="8" fill="#000" opacity=".12"/>
      ${leaves}
      <ellipse cx="100" cy="88" rx="25" ry="31" fill="#7a4a22"/><path d="M80 80Q100 70 120 80M78 92Q100 84 122 92M82 104Q100 98 118 104" stroke="#5a3214" stroke-width="2" fill="none"/>
      <path d="M92 60Q96 46 100 40Q104 46 108 60" fill="#8a5a2a"/>
      <path d="M100 52v-14" stroke="#3f7f33" stroke-width="3"/>
      <ellipse cx="100" cy="120" rx="36" ry="8" fill="url(#copper)"/>
      <path d="M72 122C70 132 74 140 76 146C42 156 34 200 56 222C76 240 124 240 144 222C166 200 158 156 124 146C126 140 130 132 128 122Z" fill="url(#copper)"/>
      <path d="M74 136H126" stroke="#C8202E" stroke-width="4"/><path d="M75 142H125" stroke="#F1C14A" stroke-width="2"/>
      <path d="M48 186C80 196 120 196 152 186" stroke="url(#foilV)" stroke-width="3" fill="none"/>
      <path d="M50 196C80 206 120 206 150 196" stroke="url(#foilV)" stroke-width="1.5" fill="none" stroke-dasharray="2 5"/>
      <g transform="translate(100 172)" fill="url(#foilV)">${Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45})" d="M0 0C4 -5 4 -11 0 -15C-4 -11 -4 -5 0 0z"/>`).join('')}<circle r="3.5" fill="#C8202E"/></g>
      <ellipse cx="82" cy="170" rx="8" ry="22" fill="#fff" opacity=".18" transform="rotate(18 82 170)"/>
      <path d="M78 228H122L118 236H82Z" fill="#7C3E17"/></svg>`;
  }

  /* ── elephant (Kalinga temple style), facing right; flip with scale(-1,1) ── */
  function elephant(cls = 'elephant') {
    const body = 'M46 70C52 40 90 26 130 28C150 29 160 22 172 20C196 17 214 30 216 50C217 58 216 64 214 70C224 70 236 62 240 46C244 32 240 18 230 14C222 11 216 18 222 24C228 28 230 36 228 46C225 58 216 72 206 82C202 86 198 90 196 96C194 110 192 124 192 140L192 176C192 182 188 184 182 184L166 184C162 184 160 181 160 176L160 134C150 136 126 138 108 136C100 136 96 134 92 132L92 176C92 182 88 184 82 184L64 184C60 184 58 181 58 176L58 128C50 118 44 100 44 86C44 80 45 74 46 70Z';
    return `<svg class="${cls}" viewBox="20 0 230 196" aria-hidden="true">
      <path d="M170 132V178C170 183 172 185 177 185H194C198 185 200 183 200 178V128Z" fill="#8a6420"/>
      <path d="M70 128V178C70 183 72 185 77 185H96C100 185 101 183 101 178V130Z" fill="#8a6420"/>
      <path d="M46 78C38 92 36 110 38 124" stroke="#8a6420" stroke-width="3" fill="none"/><path d="M38 122l-4 10 4-2 3 3z" fill="#8a6420"/>
      <path d="${body}" fill="url(#foil)"/>
      <path d="M166 40C184 36 192 56 188 78C186 92 176 104 162 102C154 100 150 86 152 70C154 56 158 44 166 40Z" fill="#B88A3A" stroke="#7a5418" stroke-width="1.2"/>
      <path d="M160 52C170 52 176 64 174 78" stroke="#7a5418" stroke-width="1" fill="none" opacity=".6"/>
      <path d="M84 34C104 28 136 28 154 34L158 96C150 104 140 96 130 104C120 96 110 104 100 96C90 104 84 98 80 96Z" fill="url(#wine)" stroke="url(#foilV)" stroke-width="2.4"/>
      <path d="M90 44C110 38 132 38 148 44L150 86C120 92 110 92 88 86Z" fill="none" stroke="#F1C14A" stroke-width="1" stroke-dasharray="1 4" stroke-linecap="round"/>
      <g fill="#F1C14A">${[[104, 64], [120, 60], [136, 64], [112, 76], [128, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
      <path d="M118 52l6 10-6 10-6-10z" fill="#F1C14A"/>
      <path d="M80 96l-2 10M158 96l2 10" stroke="#F1C14A" stroke-width="2"/><circle cx="78" cy="108" r="2.4" fill="#C8202E"/><circle cx="160" cy="108" r="2.4" fill="#C8202E"/>
      <path d="M176 24C190 20 206 26 212 40L205 46C197 38 187 34 178 34Z" fill="#C8202E" stroke="url(#foilV)" stroke-width="1.5"/>
      <circle cx="208" cy="52" r="3" fill="#F1C14A"/>
      <circle cx="198" cy="47" r="2.6" fill="#2a1608"/>
      <path d="M204 84C214 90 224 90 232 83C223 88 212 86 206 80Z" fill="#FFF6E3" stroke="#8a6420" stroke-width=".8"/>
      <path d="M160 160H192M58 160H92" stroke="#C8202E" stroke-width="5"/><path d="M160 160H192M58 160H92" stroke="#F1C14A" stroke-width="1.5" stroke-dasharray="2 4"/>
      <path d="M222 30C226 34 228 42 226 50" stroke="#7a5418" stroke-width="1" fill="none" opacity=".5"/>
    </svg>`;
  }

  /* ── peacock with a tail that can fan open (feathers rotate in JS) ── */
  function peacock(cls = 'peacock', nF = 19) {
    let tail = '';
    for (let i = 0; i < nF; i++) {
      const L = 150 - Math.abs(i - (nF - 1) / 2) * 3.2;
      tail += `<g class="fth" data-i="${i}" transform="rotate(170)">
        <path d="M0 0Q${f(L * .55)} -2 ${f(L * .82)} 0" stroke="#5f8a3a" stroke-width="1.2" fill="none"/>
        <path d="M${f(L * .3)} 0Q${f(L * .62)} -10 ${f(L * .9)} 0Q${f(L * .62)} 10 ${f(L * .3)} 0z" fill="#1E7A63" opacity=".55"/>
        <ellipse cx="${f(L * .9)}" cy="0" rx="13" ry="9.5" fill="#C9B03E"/>
        <ellipse cx="${f(L * .9)}" cy="0" rx="10" ry="7" fill="#118A85"/>
        <ellipse cx="${f(L * .91)}" cy="0" rx="6.5" ry="4.8" fill="#1F4FA6"/>
        <ellipse cx="${f(L * .92)}" cy="0" rx="3.4" ry="2.6" fill="#0A1B45"/></g>`;
    }
    return `<svg class="${cls}" viewBox="-60 -60 320 300" aria-hidden="true">
      <g class="tail" transform="translate(104 172)">${tail}</g>
      <path d="M126 178L120 214M134 178L136 214M120 214l-8 4M120 214l6 4M136 214l-6 4M136 214l8 3" stroke="#8a6420" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M100 176C96 160 104 140 124 132C140 126 150 118 152 104C154 88 150 70 156 58C160 48 172 46 178 52C182 56 184 60 194 62L184 66C178 68 172 70 168 80C164 94 166 112 160 128C156 144 148 160 136 172C126 182 110 184 100 176Z" fill="url(#teal)"/>
      <path d="M112 166C118 150 134 142 148 148C142 162 130 172 112 172Z" fill="#0B4A5E" stroke="url(#foilV)" stroke-width="1"/>
      <path d="M118 160q5-4 10 0M124 154q5-4 10 0M130 160q5-4 10 0" stroke="#C9B03E" stroke-width="1" fill="none"/>
      <path d="M168 54q5 -3 10 2" stroke="#fff" stroke-width="2.4" fill="none"/><circle cx="172" cy="56" r="2" fill="#0A1B45"/>
      <path d="M184 62L196 62L184 66Z" fill="#C9B03E"/>
      <g stroke="#1F4FA6" stroke-width="1.2">${[[164, 48, 150, 24], [168, 46, 158, 20], [171, 46, 167, 18], [174, 47, 176, 20], [176, 49, 184, 24]].map(([a, b, c, d]) => `<path d="M${a} ${b}L${c} ${d}"/><circle cx="${c}" cy="${d}" r="3" fill="#118A85" stroke="none"/>`).join('')}</g>
    </svg>`;
  }

  /* ── lotus: three rows of petals that open with `o` (0..1) ── */
  function lotus(o = 1, cls = 'lotus') {
    const pet = (L, w) => `M0 0C${f(w * .9)} ${f(-L * .3)} ${f(w * .7)} ${f(-L * .82)} 0 ${-L}C${f(-w * .7)} ${f(-L * .82)} ${f(-w * .9)} ${f(-L * .3)} 0 0z`;
    let s = `<svg class="${cls}" viewBox="-110 -120 220 150" aria-hidden="true"><ellipse cx="0" cy="18" rx="96" ry="12" fill="#2E6B3A" opacity=".85"/><ellipse cx="0" cy="16" rx="80" ry="8" fill="#3F8A4A"/>`;
    [[9, 66, 34, 78, 'url(#lotusG)'], [7, 78, 30, 52, 'url(#lotusG2)'], [5, 70, 30, 26, 'url(#lotusG)']].forEach(([n, spread, w, L, fill], row) => {
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - .5) * 2 * spread;
        s += `<path class="lp" data-a="${f(a)}" transform="rotate(${f(a * o)})" d="${pet(L + row * 6, w)}" fill="${fill}" stroke="#C2416E" stroke-opacity=".45" stroke-width="1"/>`;
      }
    });
    s += `<ellipse cx="0" cy="-22" rx="10" ry="6" fill="#F2C14A"/></svg>`;
    return s;
  }

  /* ── cusped (scalloped) arch outline as a path in a w × h box ── */
  function archPath(w, h, o = {}) {
    const cusps = o.cusps || 9, depth = o.depth || .045 * w, spring = o.spring || h - w * .62;
    const R = w * .62, cxL = w - R, cxR = R; // pointed arch from two circles
    const pts = [];
    const N = cusps * 2;
    const yS = spring;
    const angTop = Math.acos((w / 2 - cxL) / R);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let x, y;
      if (t <= .5) { const a = Math.PI - angTop * (t / .5); x = cxR + R * Math.cos(a); y = yS - R * Math.sin(a); }
      else { const a = angTop - angTop * ((t - .5) / .5); x = cxL + R * Math.cos(a); y = yS - R * Math.sin(a); }
      pts.push([x, y]);
    }
    const apexY = pts[cusps][1];
    let d = `M0 ${f(h)}L0 ${f(yS)}`;
    for (let i = 0; i < N; i += 2) {
      const [x0, y0] = pts[i], [x2, y2] = pts[i + 2], [x1, y1] = pts[i + 1];
      const mx = (x0 + x2) / 2, my = (y0 + y2) / 2, nx = w / 2 - mx, ny = (yS + (apexY - yS) * .3) - my, nl = Math.hypot(nx, ny) || 1;
      d += `Q${f(x1 + nx / nl * depth)} ${f(y1 + ny / nl * depth)} ${f(x2)} ${f(y2)}`;
    }
    d += `L${f(w)} ${f(h)}Z`;
    return { d, apexY };
  }

  /* ── ornate arch frame (gold lines, pillars, finial) around a w × h window ── */
  function archFrame(w, h, pad = 22) {
    const W = w + pad * 2, H = h + pad * 2 + 30;
    const inner = archPath(w, h), outer = archPath(w + pad * 1.3, h + pad * 1.3, { depth: .04 * w });
    const kalashTop = `<g transform="translate(${f(W / 2)} ${f(pad + 30 + inner.apexY - 20)})"><path d="M0 -26C-6 -18 -6 -10 0 -6C6 -10 6 -18 0 -26z" fill="url(#foilV)"/><circle cy="-2" r="6" fill="url(#foilV)"/><path d="M-12 4H12L9 10H-9Z" fill="url(#foilV)"/></g>`;
    return { W, H, svg: `<svg class="archframe" viewBox="0 0 ${f(W)} ${f(H)}" aria-hidden="true">
      <g transform="translate(${f(pad * .35)} ${f(30 + pad * .35)})"><path d="${outer.d}" fill="none" stroke="url(#foil)" stroke-width="3"/></g>
      <g transform="translate(${f(pad)} ${f(30 + pad)})">
        <path d="${inner.d}" fill="none" stroke="url(#foil)" stroke-width="2"/>
        <path d="${inner.d}" fill="none" stroke="#F3DB8E" stroke-width="1" stroke-dasharray="1 6" stroke-linecap="round" transform="translate(${f(-6)} ${f(-6)}) scale(${f((w + 12) / w)} ${f((h + 6) / h)})"/>
      </g>
      ${kalashTop}
      <rect x="${f(pad * .35 - 6)}" y="${f(H - 18)}" width="${f(W - pad * .7 + 12)}" height="6" fill="url(#foilV)"/>
      <rect x="${f(pad * .35 - 12)}" y="${f(H - 10)}" width="${f(W - pad * .7 + 24)}" height="10" fill="url(#foilV)" opacity=".85"/>
    </svg>`, inner };
  }

  /* ── ornate card frame sized to a w × h card ── */
  function cardFrame(w, h, o = {}) {
    const m = o.m || 14, k = Math.min(w, h);
    const cr = Math.min(110, k * .17);
    let s = `<svg class="cardframe" viewBox="0 0 ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}" aria-hidden="true">`;
    s += `<rect x="${m}" y="${m}" width="${f(w - m * 2)}" height="${f(h - m * 2)}" rx="4" fill="none" stroke="url(#foilU)" stroke-width="2.4"/>`;
    s += `<rect x="${m + 7}" y="${m + 7}" width="${f(w - (m + 7) * 2)}" height="${f(h - (m + 7) * 2)}" fill="none" stroke="url(#foilU)" stroke-width=".8"/>`;
    // Pattachitra band: a row of sindoor teeth and gold dots inside the double rule
    const b = m + 14, bandId = 'band' + Math.round(w) + 'x' + Math.round(h);
    s += `<defs><pattern id="${bandId}" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L8 2L16 10Z" fill="#B3202A" opacity=".85"/><circle cx="8" cy="9" r="1.3" fill="#C99A3B"/></pattern></defs>`;
    s += `<rect x="${b}" y="${b}" width="${f(w - b * 2)}" height="10" fill="url(#${bandId})"/>`;
    s += `<rect x="${b}" y="${f(h - b - 10)}" width="${f(w - b * 2)}" height="10" fill="url(#${bandId})" transform="rotate(180 ${f(w / 2)} ${f(h - b - 5)})"/>`;
    s += `<rect x="${m + 24}" y="${m + 24}" width="${f(w - (m + 24) * 2)}" height="${f(h - (m + 24) * 2)}" fill="none" stroke="url(#foilU)" stroke-width="1"/>`;
    // corner fans
    const fan = (x, y, rot) => {
      let g = `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})">`;
      for (let i = 0; i < 7; i++) { const a = -i / 6 * 90; g += `<path transform="rotate(${f(a)})" d="M0 0C${f(cr * .16)} ${f(cr * .18)} ${f(cr * .2)} ${f(cr * .52)} 0 ${f(cr * .74)}C${f(-cr * .2)} ${f(cr * .52)} ${f(-cr * .16)} ${f(cr * .18)} 0 0z" fill="url(#foilU)" opacity="${i % 2 ? .75 : 1}"/>`; }
      g += `<path d="M${f(cr * .86)} 0A${f(cr * .86)} ${f(cr * .86)} 0 0 1 0 ${f(cr * .86)}" fill="none" stroke="url(#foilU)" stroke-width="1.6"/>`;
      g += `<path d="M${f(cr)} 0A${cr} ${cr} 0 0 1 0 ${f(cr)}" fill="none" stroke="#B3202A" stroke-width="1" stroke-dasharray="2 4"/>`;
      for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; g += `<circle cx="${f(Math.cos(a) * cr * .93)}" cy="${f(Math.sin(a) * cr * .93)}" r="1.6" fill="#C99A3B"/>`; }
      g += `<circle r="${f(cr * .12)}" fill="#B3202A"/><circle r="${f(cr * .06)}" fill="url(#foilU)"/>`;
      return g + '</g>';
    };
    const c = m + 24;
    s += fan(c, c, 0) + fan(w - c, c, 90) + fan(w - c, h - c, 180) + fan(c, h - c, 270);
    // centre crest top and bottom: lotus with scrolling vines
    const crest = (y, flip) => {
      let g = `<g transform="translate(${f(w / 2)} ${f(y)}) scale(1 ${flip ? -1 : 1})">`;
      const L = Math.min(150, w * .2);
      g += `<path d="M-${f(L)} 0C-${f(L * .7)} 0 -${f(L * .55)} 14 -${f(L * .4)} 10C-${f(L * .28)} 6 -${f(L * .3)} -6 -${f(L * .2)} -2C-${f(L * .12)} 1 -16 8 0 8C16 8 ${f(L * .12)} 1 ${f(L * .2)} -2C${f(L * .3)} -6 ${f(L * .28)} 6 ${f(L * .4)} 10C${f(L * .55)} 14 ${f(L * .7)} 0 ${f(L)} 0" fill="none" stroke="url(#foilU)" stroke-width="1.6"/>`;
      for (let i = 0; i < 5; i++) { const a = (i - 2) * 26; g += `<path transform="rotate(${a})" d="M0 6C6 -4 6 -16 0 -24C-6 -16 -6 -4 0 6z" fill="url(#foilU)"/>`; }
      g += `<circle cy="8" r="3" fill="#B3202A"/>`;
      return g + '</g>';
    };
    s += crest(c + 4, true) + crest(h - c - 4, false);
    return s + '</svg>';
  }

  /* ── divider ── */
  function divider(w = 280) {
    const h = w / 2;
    return `<svg class="divider" viewBox="${-h} -14 ${w} 28" aria-hidden="true">
      <path d="M${-h + 4} 0H-30M30 0H${h - 4}" stroke="url(#foilU)" stroke-width="1"/>
      <path d="M-30 0C-24 -8 -16 -8 -14 0C-16 8 -24 8 -30 0zM30 0C24 -8 16 -8 14 0C16 8 24 8 30 0z" fill="url(#foilU)"/>
      <path d="M0 -11L7 0L0 11L-7 0Z" fill="#B3202A"/><circle r="2.6" fill="url(#foilU)"/>
      <circle cx="${-h + 4}" r="2" fill="url(#foilU)"/><circle cx="${h - 4}" r="2" fill="url(#foilU)"/></svg>`;
  }

  /* ── medallion ring around a round portrait ── */
  function medallion(cls = 'medal') {
    let s = `<svg class="${cls}" viewBox="-130 -130 260 260" aria-hidden="true">`;
    for (let i = 0; i < 32; i++) s += `<path transform="rotate(${f(i * 360 / 32)})" d="M0 -106C7 -112 7 -122 0 -128C-7 -122 -7 -112 0 -106z" fill="url(#foil)" opacity="${i % 2 ? .7 : 1}"/>`;
    s += `<circle r="104" fill="none" stroke="url(#foil)" stroke-width="3"/><circle r="98" fill="none" stroke="#B3202A" stroke-width="1.4" stroke-dasharray="2 5"/>`;
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; s += `<circle cx="${f(Math.cos(a) * 112)}" cy="${f(Math.sin(a) * 112)}" r="1.4" fill="#C99A3B"/>`; }
    return s + '</svg>';
  }

  /* ── mandala (jhoti) with drawable strokes ── */
  function mandala(cls = 'mandala') {
    let s = `<svg class="${cls}" viewBox="-100 -100 200 200" aria-hidden="true">`;
    const ring = r => s += `<circle class="w" pathLength="1" r="${r}"/>`;
    [20, 24, 52, 56, 90, 95].forEach(ring);
    for (let i = 0; i < 12; i++) s += `<path class="w" pathLength="1" transform="rotate(${i * 30})" d="M0 -24C10 -32 11 -44 0 -52C-11 -44 -10 -32 0 -24z"/>`;
    for (let i = 0; i < 24; i++) s += `<path class="w" pathLength="1" transform="rotate(${i * 15 + 7.5})" d="M0 -56C6 -64 6 -76 0 -88C-6 -76 -6 -64 0 -56z"/>`;
    for (let i = 0; i < 8; i++) s += `<path class="w" pathLength="1" transform="rotate(${i * 45})" d="M0 -8C4 -12 4 -16 0 -20C-4 -16 -4 -12 0 -8z"/>`;
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; s += `<circle class="dot" cx="${f(98 * Math.cos(a))}" cy="${f(98 * Math.sin(a))}" r=".9"/>`; }
    return s + '</svg>';
  }

  /* ── Konark wheel (fine line) ── */
  function wheel(cls = 'wheel') {
    let s = `<svg class="${cls}" viewBox="-100 -100 200 200" aria-hidden="true">`;
    const w = d => s += `<path class="w" pathLength="1" d="${d}"/>`;
    const circ = r => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0`;
    [97, 92, 84, 78, 22, 16, 7].forEach(r => w(circ(r)));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, b = a + Math.PI / 8;
      const P = (r, o) => `${f(r * Math.cos(a) - o * Math.sin(a))} ${f(r * Math.sin(a) + o * Math.cos(a))}`;
      w(`M${P(22, -4)}L${P(78, -3)}M${P(22, 4)}L${P(78, 3)}`);
      const cx = 50 * Math.cos(a), cy = 50 * Math.sin(a);
      w(`M${f(cx + 7)} ${f(cy)}A7 7 0 1 1 ${f(cx - 7)} ${f(cy)}A7 7 0 1 1 ${f(cx + 7)} ${f(cy)}`);
      w(`M${f(22 * Math.cos(b))} ${f(22 * Math.sin(b))}L${f(78 * Math.cos(b))} ${f(78 * Math.sin(b))}`);
    }
    return s + '</svg>';
  }

  /* ── wax seal with monogram ── */
  function seal(cls = 'seal') {
    let blob = '';
    const N = 28;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = 50 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 5.1) * 1.8; blob += (i ? 'L' : 'M') + f(Math.cos(a) * r) + ' ' + f(Math.sin(a) * r); }
    return `<svg class="${cls}" viewBox="-60 -60 120 120" aria-hidden="true">
      <path d="${blob}Z" fill="url(#wax)"/>
      <circle r="38" fill="none" stroke="#6E1019" stroke-width="2.4" opacity=".7"/><circle r="36.5" fill="none" stroke="#E46A6F" stroke-width=".8" opacity=".5"/>
      ${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return `<circle cx="${f(Math.cos(a) * 43)}" cy="${f(Math.sin(a) * 43)}" r="1.1" fill="#E46A6F" opacity=".55"/>`; }).join('')}
      <g font-family="Pinyon Script, cursive" font-size="31" text-anchor="middle"><text x="-15" y="10" fill="#5E0C15" opacity=".85">A</text><text x="17" y="10" fill="#5E0C15" opacity=".85">I</text><text x="-16" y="9" fill="#F4B0A8" opacity=".6">A</text><text x="16" y="9" fill="#F4B0A8" opacity=".6">I</text></g>
      <text x="1" y="6" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="12" fill="#F6C1B8" opacity=".85">&amp;</text>
      <ellipse cx="-16" cy="-22" rx="16" ry="8" fill="#fff" opacity=".14" transform="rotate(-30 -16 -22)"/></svg>`;
  }

  /* ── damask tile for the velvet ── */
  function damaskURI(col = '#6a1428') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" fill="${col}" color="${col}">
      <g transform="translate(46 14) scale(.62)"><path d="M30 88C8 86 0 66 6 50 12 32 30 22 40 12 46 6 50 2 54 0 50 8 52 16 56 26 62 44 58 70 44 82 40 86 35 88 30 88z"/></g>
      <g transform="translate(136 104) rotate(180) scale(.62)"><path d="M30 88C8 86 0 66 6 50 12 32 30 22 40 12 46 6 50 2 54 0 50 8 52 16 56 26 62 44 58 70 44 82 40 86 35 88 30 88z"/></g>
      <g transform="translate(135 45)">${Array.from({ length: 6 }, (_, i) => `<path transform="rotate(${i * 60})" d="M0 0C4 -4 4 -10 0 -13C-4 -10 -4 -4 0 0z"/>`).join('')}</g>
      <g transform="translate(45 135)">${Array.from({ length: 6 }, (_, i) => `<path transform="rotate(${i * 60})" d="M0 0C4 -4 4 -10 0 -13C-4 -10 -4 -4 0 0z"/>`).join('')}</g>
      <circle cx="0" cy="0" r="2.5"/><circle cx="180" cy="0" r="2.5"/><circle cx="0" cy="180" r="2.5"/><circle cx="180" cy="180" r="2.5"/><circle cx="90" cy="90" r="2.5"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  window.Orn = { defs, toran, kalash, diya, bell, elephant, peacock, lotus, archPath, archFrame, cardFrame, divider, medallion, mandala, wheel, seal, damaskURI, use };
})();
