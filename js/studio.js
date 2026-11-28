/*
  Project Arthouse: the marketing studio pieces. No libraries.

   1. Hero app window: a sample workspace that turns its own screens
   2. Services index: the picture follows the row you are on
   3. How it works: a crowd, a signal, a message, a reply
   4. CRM sample pipeline: enquiries move along on their own

  Everything that writes text uses textContent, never innerHTML.
*/
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var motion = root.classList.contains("motion");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }

  /* Run fn(true/false) as an element enters or leaves the screen. */
  function inView(node, fn) {
    if (!("IntersectionObserver" in window)) { fn(true); return; }
    new IntersectionObserver(function (entries) { fn(entries[0].isIntersecting); }, { threshold: 0.2 }).observe(node);
  }

  /* 1. Hero app window -------------------------------------------------------- */
  (function () {

  var app = $("[data-app]");
  if (app) {
    var tabs = $$("[data-app-tab]", app);
    var panes = $$("[data-app-pane]", app);
    var side = $(".app__side", app);
    var timer = $("[data-app-timer]", app);
    var at = 0;
    var HOLD = 5200;
    var started = performance.now();
    var held = 0;
    var running = false;
    var paused = false;
    var visible = false;

    /* Numbers count up when their screen opens. */
    var fmt = function (n) { return Math.round(n).toLocaleString("en-IN"); };
    var countUp = function (pane) {
      $$("[data-count]", pane).forEach(function (node) {
        var end = parseFloat(node.getAttribute("data-count")) || 0;
        if (!motion) { node.textContent = fmt(end); return; }
        var t0 = performance.now();
        var step = function (now) {
          var k = Math.min(1, (now - t0) / 1100);
          node.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) { requestAnimationFrame(step); }
        };
        node.textContent = "0";
        requestAnimationFrame(step);
      });
    };

    var show = function (next, focus) {
      next = (next + tabs.length) % tabs.length;
      tabs.forEach(function (t, i) {
        var on = i === next;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      /* Every screen stays in the layout, so the window keeps one height. */
      panes.forEach(function (p, i) { p.classList.toggle("is-on", i === next); });
      if (side) { side.style.setProperty("--at", String(next)); }
      if (focus) { tabs[next].focus(); }
      at = next;
      started = performance.now();
      held = 0;
      countUp(panes[next]);
    };

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i, false); });
      t.addEventListener("keydown", function (ev) {
        if (ev.key === "ArrowDown" || ev.key === "ArrowRight") { ev.preventDefault(); show(at + 1, true); }
        if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") { ev.preventDefault(); show(at - 1, true); }
        if (ev.key === "Home") { ev.preventDefault(); show(0, true); }
        if (ev.key === "End") { ev.preventDefault(); show(tabs.length - 1, true); }
      });
    });

    app.addEventListener("pointerenter", function () { paused = true; });
    app.addEventListener("pointerleave", function () { paused = false; started = performance.now() - held * HOLD; });
    app.addEventListener("focusin", function () { paused = true; });
    app.addEventListener("focusout", function () { paused = false; started = performance.now() - held * HOLD; });

    /* The clock only runs while the window is on screen. */
    var tick = function (now) {
      if (!visible) { running = false; return; }
      if (!paused && !doc.hidden) {
        held = Math.min(1, (now - started) / HOLD);
        if (timer) { timer.style.transform = "scaleX(" + held.toFixed(3) + ")"; }
        if (held >= 1) { show(at + 1, false); }
      } else {
        started = now - held * HOLD;
      }
      requestAnimationFrame(tick);
    };

    show(0, false);
    if (motion) {
      inView(app, function (on) {
        visible = on;
        if (on && !running) { running = true; started = performance.now() - held * HOLD; requestAnimationFrame(tick); }
      });
    } else if (timer) {
      timer.parentElement.hidden = true;
    }
  }
  })();

  /* 2. Services index -------------------------------------------------------- */
  (function () {

  var svc = $("[data-svc]");
  if (svc) {
    var rows = $$("[data-svc-row]", svc);
    var pics = $$("[data-svc-pic]", svc);
    var current = -1;
    var hovering = false;

    var setOn = function (i) {
      if (i === current || i < 0) { return; }
      current = i;
      rows.forEach(function (r, k) { r.classList.toggle("is-on", k === i); });
      pics.forEach(function (p, k) { p.classList.toggle("is-on", k === i); });
    };

    rows.forEach(function (row, i) {
      row.addEventListener("pointerenter", function (ev) {
        if (ev.pointerType !== "mouse") { return; }
        hovering = true;
        svc.classList.add("is-hover");
        setOn(i);
      });
      row.addEventListener("pointerleave", function () { hovering = false; svc.classList.remove("is-hover"); });
      row.addEventListener("focus", function () { setOn(i); });
    });

    /* Without a mouse on a row, the row nearest the middle of the screen
       leads. Row positions are measured once (and again on resize), so
       scrolling never has to stop and measure the page. */
    var centers = [], top = 0, bottom = 0;
    var measure = function () {
      var y = window.scrollY;
      var r = svc.getBoundingClientRect();
      top = r.top + y; bottom = r.bottom + y;
      centers = rows.map(function (row) { var b = row.getBoundingClientRect(); return b.top + y + b.height / 2; });
    };
    var follow = function () {
      if (hovering || window.innerWidth <= 900 || !centers.length) { return; }
      var y = window.scrollY, vh = window.innerHeight;
      if (bottom < y || top > y + vh) { return; }
      var line = y + vh * 0.48;
      var best = 0, bestD = Infinity;
      centers.forEach(function (c, i) { var d = Math.abs(c - line); if (d < bestD) { bestD = d; best = i; } });
      setOn(best);
    };
    var queued = false;
    window.addEventListener("scroll", function () {
      if (queued) { return; }
      queued = true;
      requestAnimationFrame(function () { queued = false; follow(); });
    }, { passive: true });
    measure();
    window.addEventListener("load", measure);
    if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(measure); }
    if ("ResizeObserver" in window) { new ResizeObserver(function () { measure(); }).observe(doc.body); }
    setOn(0);
    /* The picture frame opens the first time the list comes into view. */
    inView(svc, function (on) { if (on) { svc.classList.add("is-seen"); } });
  }
  })();

  /* 3. How it works: the crowd ------------------------------------------------
     A crowd of hand-drawn people (Open Peeps, CC0) walks past. Now and then
     one of them shows a sign that they are ready. The automation that fires
     appears under the studio's mark as the real thing: the Instagram DM, the
     email with its subject line, the ad, the search ad, the WhatsApp nudge.
     It is sent along an arc, lands, and the reply comes back. Each moment
     also lights the matching step of the journey under the scene.

     Kept light on purpose: every person keeps the same drawing and size for
     the whole visit (so nothing is redrawn while they walk), and the canvas
     is only painted while something is in the air. */
  (function () {
  var scene = $("[data-crowd]");
  if (!scene) { return; }

  var cv = $("[data-crowd-canvas]", scene);
  var g = cv.getContext("2d");
  var crowd = $("[data-crowd-people]", scene);
  var beacon = $("[data-crowd-beacon]", scene);
  var card = $("[data-crowd-card]", scene);
  var markPath = $("[data-crowd-mark]");
  var jSteps = $$("[data-journey-step]");
  var jFill = $("[data-journey-fill]");
  var SVGNS = "http://www.w3.org/2000/svg";

  var PEEPS = [];
  for (var n = 1; n <= 24; n++) { PEEPS.push("assets/peeps/peep-" + (n < 10 ? "0" : "") + n + ".svg"); }

  /* What happens, who it happens to, and the automation that answers. */
  var DATA = [
    { tag: "Social media", signal: "Saved your reel on festive hampers", when: "Saved a reel", then: "DM in 2 min",
      kind: "chat", channel: "Instagram DM", to: "Priya", line: "Hi Priya! Here is the full hamper list, with prices.", extra: "Festive hampers.pdf",
      rtag: "Order", reply: "Two of the large ones, please." },
    { tag: "Website", signal: "Looked at the menu, left without booking", when: "Left without booking", then: "Ad for 7 days",
      kind: "ad", channel: "Meta ad", to: "Shown to Kabir", line: "Weekend brunch, 20% off", sub: "beanandbanyan.in", cta: "Book a table", art: ["Weekend", "brunch."],
      rtag: "Booked", reply: "Table for four, Saturday at 11." },
    { tag: "Website", signal: "Read the pricing page twice", when: "Pricing page, twice", then: "Send the case study",
      kind: "email", channel: "Email", to: "Ananya", line: "How a 40-person office gets coffee by 8:30", extra: "Hi Ananya, you were looking at office plans, so here is how one team does it.",
      rtag: "Call", reply: "Can we talk on Thursday?" },
    { tag: "Search", signal: "Searched for coffee near the office", when: "Searched nearby", then: "Search ad",
      kind: "search", channel: "Google Search ad", to: "Within 2 km", line: "Filter Coffee Near You, Open at 7am", sub: "beanandbanyan.in", extra: "Five minutes away. Order ahead and pick it up on your way in.",
      rtag: "Visit", reply: "On my way." },
    { tag: "CRM", signal: "Opened the quote, no reply in three days", when: "No reply in 3 days", then: "Gentle reminder",
      kind: "email", channel: "Follow-up email", to: "Rahul", line: "Did the quote reach you safely?", extra: "Hi Rahul, just checking in on the office plan. Happy to adjust anything.",
      rtag: "Yes", reply: "Approved. Send the invoice." },
    { tag: "Cart", signal: "Left two flasks in the cart", when: "Cart left for an hour", then: "WhatsApp nudge",
      kind: "chat", channel: "WhatsApp", to: "Meera", line: "Your two flasks are still waiting. Free delivery till tonight.", extra: "Complete my order",
      rtag: "Order", reply: "Done, thank you!" },
    { tag: "Invitation", signal: "Opened the wedding invite link", when: "Opened the invite", then: "Send the RSVP",
      kind: "chat", channel: "WhatsApp", to: "Vikram", line: "Somya and Prateek would love to see you. Tap to RSVP.", extra: "RSVP link",
      rtag: "RSVP", reply: "Coming, with family!" }
  ];

  var frozen = !motion;
  var seed = frozen ? 11 : (Math.random() * 1e9) | 0;
  var rnd = function () { seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  var ease = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

  var hexRgb = function (v, fb) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(v || "").trim());
    if (!m) { return fb; }
    var x = parseInt(m[1], 16);
    return [(x >> 16) & 255, (x >> 8) & 255, x & 255];
  };
  var AC, BG;
  var readColours = function () {
    var cs = getComputedStyle(scene);
    AC = hexRgb(cs.getPropertyValue("--accent-text"), [135, 88, 0]);
    BG = hexRgb(cs.getPropertyValue("--bg"), [239, 235, 227]);
  };
  var rgb = function (c, o) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (o === undefined ? 1 : o) + ")"; };
  readColours();

  /* ---- small DOM helpers (text is always set as text) */
  var mk = function (tag, cls, text) { var e = doc.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; };
  var icon = function (kind) {
    var s = doc.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "acard__ico");
    s.setAttribute("aria-hidden", "true");
    var d = {
      email: "M3.5 6h17v12h-17z M4 6.5l8 6.5 8-6.5",
      chat: "M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z",
      ad: "M3.8 10v4h2.7l6.8 4V6l-6.8 4z M16.4 9.3a3.6 3.6 0 0 1 0 5.4",
      search: "M10.5 4.5a6 6 0 1 1 0 12a6 6 0 0 1 0-12z M15 15l5 5"
    }[kind];
    var p = doc.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    s.appendChild(p);
    return s;
  };

  /* ---- the automation card under the mark */
  var cardTyping = null;
  var buildCard = function (d) {
    card.textContent = "";
    card.className = "acard acard--" + d.kind;
    var rule = mk("p", "acard__rule");
    rule.appendChild(mk("span", "acard__k", "When"));
    rule.appendChild(mk("span", "acard__v", d.when));
    rule.appendChild(mk("span", "acard__k", "Then"));
    rule.appendChild(mk("span", "acard__v", d.then));
    card.appendChild(rule);

    var head = mk("p", "acard__head");
    head.appendChild(icon(d.kind));
    head.appendChild(mk("b", "", d.channel));
    head.appendChild(mk("span", "", d.kind === "ad" || d.kind === "search" ? d.to : "to " + d.to));
    card.appendChild(head);

    var body = mk("div", "acard__body");
    var typed;
    if (d.kind === "email") {
      body.appendChild(mk("p", "acard__from", "From Bean and Banyan"));
      var subj = mk("p", "acard__subj");
      subj.appendChild(mk("span", "acard__label", "Subject"));
      typed = mk("span", "acard__typed");
      subj.appendChild(typed);
      body.appendChild(subj);
      body.appendChild(mk("p", "acard__prev", d.extra));
    } else if (d.kind === "chat") {
      typed = mk("p", "acard__bubble");
      body.appendChild(typed);
      body.appendChild(mk("p", "acard__att", d.extra));
    } else if (d.kind === "ad") {
      var art = mk("div", "acard__art");
      art.appendChild(mk("span", "", d.art[0]));
      art.appendChild(mk("em", "", d.art[1]));
      body.appendChild(art);
      var txt = mk("div", "acard__adtext");
      txt.appendChild(mk("p", "acard__spons", "Sponsored"));
      typed = mk("p", "acard__adhead");
      txt.appendChild(typed);
      txt.appendChild(mk("p", "acard__url", d.sub));
      txt.appendChild(mk("span", "acard__cta", d.cta));
      body.appendChild(txt);
    } else {
      var url = mk("p", "acard__url");
      url.appendChild(mk("b", "", "Ad"));
      url.appendChild(doc.createTextNode(d.sub));
      body.appendChild(url);
      typed = mk("p", "acard__title");
      body.appendChild(typed);
      body.appendChild(mk("p", "acard__prev", d.extra));
    }
    card.appendChild(body);
    var caret = mk("i", "acard__caret");
    typed.appendChild(caret);
    var textNode = doc.createTextNode("");
    typed.insertBefore(textNode, caret);
    return { node: textNode, caret: caret, line: d.line };
  };

  var cardIn = function () {
    if (frozen || typeof card.animate !== "function") { card.style.opacity = "1"; card.style.transform = "none"; return; }
    card.animate([{ opacity: 0, transform: "translateY(-10px) scale(0.92)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
                 { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
  };
  var cardOut = function () {
    if (frozen || typeof card.animate !== "function") { card.style.opacity = "0"; return; }
    card.animate([{ opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 0, transform: "translateY(-46px) scale(0.6)" }],
                 { duration: 380, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" });
  };

  /* ---- layout */
  var W = 0, H = 0, BY = 54, TOP = 150, BH = 400, SC = 1, SLOTS = 3;
  var size = function () {
    W = scene.clientWidth;
    H = scene.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    SC = Math.max(0.5, Math.min(1.1, W / 1440));
    SLOTS = W < 700 ? 1 : 3;
    BY = beacon ? beacon.offsetTop + beacon.offsetHeight / 2 : 54;
    TOP = BY + (W < 700 ? 210 : 150);
    BH = Math.max(200, H - TOP);
    crowd.style.top = TOP + "px";
    crowd.style.height = BH + "px";
  };

  /* People nobody has a reason to write to stay faded; farther away is lighter. */
  var fade = function (p) {
    return "grayscale(1) contrast(" + (0.38 + 0.32 * p.depth).toFixed(2) + ") brightness(" + (1 / (0.7 + 0.16 * p.depth)).toFixed(2) + ")";
  };
  var P = [];
  var place = function (p) {
    p.t = 31 + rnd() * 54;
    p.depth = (p.t - 31) / 54;
    p.w = Math.round((146 + (p.t - 31.8) * 2.62) * SC);
    p.h = Math.round(p.w * 1.203);
    p.dir = rnd() < 0.5 ? 1 : -1;
    p.speed = 108 / (14 + rnd() * 28);
    p.x = -4 + rnd() * 108;
    p.v = 1;
    p.state = "walk";
    p.reached = false;
    p.ph = rnd() * 6.283;
    p.f = 1.4 + p.speed * 0.2;
    p.bob = 0;
    p.px = (p.x / 100) * W;
    p.el.className = "crowd__pw";
    p.el.style.top = p.t.toFixed(2) + "%";
    p.el.style.width = p.w + "px";
    p.el.style.height = p.h + "px";
    p.el.style.zIndex = String(p.t | 0);
    p.img.src = PEEPS[(rnd() * PEEPS.length) | 0];
    p.img.style.filter = fade(p);
    p.img.style.transform = "scaleX(" + p.dir + ")";
  };
  /* Walking off one side brings the same person back on the other. */
  var wrap = function (p) {
    p.x = p.dir > 0 ? -10 : 110;
    p.reached = false;
    p.el.classList.remove("is-done");
    p.img.style.filter = fade(p);
  };
  var head = function (p) { return [p.px, TOP + (BH * p.t) / 100 - p.h / 2 + p.h * 0.21 + p.bob]; };

  var build = function () {
    crowd.textContent = "";
    P.length = 0;
    var count = Math.round(36 * Math.max(0.45, Math.min(1, W / 1440)));
    for (var i = 0; i < count; i++) {
      var el = mk("div");
      var pe = mk("div", "crowd__pe");
      var hp = mk("div", "crowd__hp");
      var img = mk("img");
      img.alt = ""; img.draggable = false; img.decoding = "async";
      var ok = mk("i", "crowd__ok");
      var tick = doc.createElementNS(SVGNS, "svg"); tick.setAttribute("viewBox", "0 0 24 24");
      var path = doc.createElementNS(SVGNS, "path"); path.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
      tick.appendChild(path); ok.appendChild(tick);
      hp.appendChild(img); hp.appendChild(ok); pe.appendChild(hp); el.appendChild(pe);
      crowd.appendChild(el);
      var p = { el: el, pe: pe, hp: hp, img: img };
      place(p);
      P.push(p);
    }
  };

  /* Three moments can be in the air at once (one on a phone). */
  var S = [0, 1, 2].map(function () {
    var tip = mk("div", "crowd__tip");
    var cen = mk("div", "crowd__cen");
    var box = mk("div", "crowd__tbox");
    cen.appendChild(box); tip.appendChild(cen); scene.appendChild(tip);
    return { tip: tip, box: box, p: null, ly: 0 };
  });

  var fill = function (box, tagText, text, cls) {
    box.textContent = "";
    box.appendChild(mk("span", "crowd__tag" + (cls ? " " + cls : ""), tagText));
    box.appendChild(doc.createTextNode(text));
  };
  var pop = function (el, on) {
    if (!frozen && typeof el.animate === "function") {
      el.animate(on ? [{ transform: "scale(0.4)", opacity: 0 }, { transform: "scale(1.04)", opacity: 1, offset: 0.7 }, { transform: "scale(1)", opacity: 1 }]
                    : [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.6)", opacity: 0 }],
                 { duration: on ? 520 : 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" });
    } else {
      el.style.transform = on ? "scale(1)" : "scale(0)";
      el.style.opacity = on ? "1" : "0";
    }
  };
  var flip = function (s) {
    var d = s.d;
    var set = function () { s.box.classList.add("is-reply"); fill(s.box, d.rtag, "“" + d.reply + "”", "is-reply"); };
    if (!frozen && typeof s.box.animate === "function") {
      s.box.animate([{ transform: "scale(1) rotateX(0deg)" }, { transform: "scale(1) rotateX(90deg)" }], { duration: 150, easing: "ease-in", fill: "forwards" }).finished.then(function () {
        set();
        s.box.animate([{ transform: "scale(1) rotateX(-90deg)" }, { transform: "scale(1) rotateX(0deg)" }], { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" });
      });
    } else {
      set();
    }
  };
  var hop = function (p) {
    if (frozen || typeof p.hp.animate !== "function") { return; }
    p.hp.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-22px) scale(1.05)" }, { transform: "translateY(0) scale(1)" }], { duration: 600, easing: "cubic-bezier(0.3, 0, 0.3, 1)" });
  };
  var bump = function (k) {
    if (frozen || !beacon || typeof beacon.animate !== "function") { return; }
    beacon.animate([{ transform: "scale(1)" }, { transform: "scale(" + k + ")" }, { transform: "scale(1)" }], { duration: 460, easing: "cubic-bezier(0.3, 0, 0.2, 1)" });
  };
  var underline = function () {
    if (frozen || !markPath || typeof markPath.animate !== "function") { return; }
    markPath.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
  };
  var stepAt = -1;
  var journeyTo = function (k) {
    if (k === stepAt) { return; }
    stepAt = k;
    jSteps.forEach(function (el, i) { el.classList.toggle("is-on", i === k); });
    if (jFill) { jFill.style.transform = "scaleX(" + ((k + 1) / Math.max(1, jSteps.length)).toFixed(3) + ")"; }
  };

  var pickSide = 1, di = (Math.random() * DATA.length) | 0, nextAt = 0.6;
  var pick = function () {
    var act = S.filter(function (s) { return s.p; }).map(function (s) { return s.p.px; });
    var cx = W / 2, gap = Math.max(300, W * 0.28);
    var lo = W < 700 ? 0.24 : 0.13, hi = 1 - lo;
    var ok = function (p) {
      if (p.state !== "walk" || p.reached || p.t < 47) { return false; }
      var f = p.px + ((p.dir * p.speed) / 100) * W * 2.8;
      return p.px > W * lo && p.px < W * hi && f > W * (lo - 0.03) && f < W * (hi + 0.03) &&
        (W < 700 || Math.abs(p.px - cx) > 180) && act.every(function (a) { return Math.abs(a - p.px) > gap; });
    };
    var c = P.filter(ok);
    var pref = c.filter(function (p) { return (p.px - cx) * pickSide > 0; });
    if (pref.length) { c = pref; }
    if (!c.length) { return null; }
    pickSide = -pickSide;
    return c[(rnd() * c.length) | 0];
  };
  var start = function (now) {
    var busy = S.filter(function (s) { return s.p; }).length;
    var s = busy < SLOTS ? S.find(function (x) { return !x.p; }) : null;
    if (!s) { nextAt = now + 0.2; return; }
    var p = pick();
    if (!p) { nextAt = now + 0.3; return; }
    s.p = p; s.d = DATA[di++ % DATA.length]; s.t0 = now; s.st = 0; s.ly = 0;
    nextAt = now + (SLOTS > 1 ? 2.9 : 8.2);
    p.state = "locked";
    p.el.style.zIndex = "200";
    p.img.style.filter = "none";
    p.img.style.transform = "scaleX(" + p.dir + ") scale(1.07)";
  };

  /* ---- what flies along the arc: an envelope, a chat bubble, or an ad */
  var token = function (kind, x, y, rot, sc) {
    g.save();
    g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
    g.setLineDash([]);
    g.fillStyle = rgb(BG); g.strokeStyle = rgb(AC); g.lineWidth = 2; g.lineJoin = "round";
    if (kind === "email") {
      g.beginPath(); g.rect(-15, -10.5, 30, 21); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-12.5, -7.5); g.lineTo(0, 2.5); g.lineTo(12.5, -7.5); g.stroke();
    } else if (kind === "chat") {
      g.beginPath(); g.moveTo(-15, -10); g.lineTo(15, -10); g.lineTo(15, 7); g.lineTo(-4, 7); g.lineTo(-10, 13); g.lineTo(-10, 7); g.lineTo(-15, 7); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = rgb(AC); [-7, 0, 7].forEach(function (dx) { g.beginPath(); g.arc(dx, -1.5, 1.8, 0, 6.2832); g.fill(); });
    } else {
      g.beginPath(); g.rect(-15, -11, 30, 22); g.fill(); g.stroke();
      g.fillStyle = rgb(AC); g.fillRect(-11, -7, 11, 9);
      g.beginPath(); g.moveTo(3, -5); g.lineTo(11, -5); g.moveTo(3, 0); g.lineTo(9, 0); g.moveTo(-11, 6); g.lineTo(11, 6); g.stroke();
    }
    g.restore();
  };

  var drawReach = function (s, a, now, hx, hy) {
    var p = s.p, P0 = [W / 2, BY], P1 = [(P0[0] + hx) / 2, Math.min(BY, hy) - (26 + Math.abs(hx - P0[0]) * 0.07)];
    var B = function (u) { var v = 1 - u; return [v * v * P0[0] + 2 * v * u * P1[0] + u * u * hx, v * v * P0[1] + 2 * v * u * P1[1] + u * u * hy]; };
    var seg = function (u0, u1, k) { g.beginPath(); for (var i = 0; i <= k; i++) { var q = B(u0 + ((u1 - u0) * i) / k); if (i) { g.lineTo(q[0], q[1]); } else { g.moveTo(q[0], q[1]); } } g.stroke(); };
    g.strokeStyle = rgb(AC);
    g.lineCap = "round";
    if (a < 4.3) { /* a ring settles on the person */
      var R = p.w * 0.27, k = Math.min(1, a / 0.5), e = 1 - Math.pow(1 - k, 3);
      g.save(); g.translate(hx, hy); g.rotate(now * 1.2); g.globalAlpha = 0.9 * k; g.lineWidth = 2;
      g.setLineDash([R * 0.5, R * 0.285]); g.beginPath(); g.arc(0, 0, R * (2.2 - 1.2 * e), 0, 6.2832); g.stroke(); g.restore();
    }
    if (a < 6.75) { /* the thread: dashed while aiming, solid while the reply comes back */
      g.save(); g.lineWidth = 1.2;
      if (a < 4.3) { g.globalAlpha = 0.55; g.setLineDash([3, 6]); g.lineDashOffset = -now * 24; seg(0, Math.min(1, a / 0.6), 28); }
      else { g.globalAlpha = 0.4 * Math.min(1, (6.75 - a) / 0.4); seg(0, 1, 28); }
      g.restore();
    }
    if (a >= 3.4 && a < 4.3) { /* the message travels along the arc */
      var u = ease((a - 3.4) / 0.9);
      g.save();
      for (var i = 0; i < 12; i++) {
        var u1 = u - (0.42 * i) / 12, u0 = u - (0.42 * (i + 1)) / 12;
        if (u1 <= 0) { break; }
        var f = 1 - i / 12;
        g.globalAlpha = f * 0.18; g.lineWidth = 13 * f; seg(Math.max(0, u0), u1, 3);
        g.globalAlpha = f * 0.95; g.lineWidth = 4.5 * f + 1; seg(Math.max(0, u0), u1, 3);
      }
      g.restore();
      var q = B(u), q2 = B(Math.min(1, u + 0.02)), dx = q2[0] - q[0];
      token(s.d.kind, q[0], q[1], Math.atan2(q2[1] - q[1], Math.abs(dx) || 1e-6) * (dx >= 0 ? 1 : -1) * 0.5, Math.min(1, (a - 3.4) / 0.15));
    }
    if (a >= 4.3 && a < 4.95) { /* it lands */
      var k2 = (a - 4.3) / 0.65, e2 = 1 - Math.pow(1 - k2, 3);
      g.save(); g.globalAlpha = 1 - k2; g.lineWidth = 2.5;
      g.beginPath(); g.arc(hx, hy, p.w * 0.2 + e2 * p.w * 0.32, 0, 6.2832); g.stroke(); g.lineWidth = 2;
      for (var j = 0; j < 10; j++) {
        var an = (j / 10) * 6.2832 + s.t0, r0 = p.w * 0.3 + e2 * p.w * 0.22, r1 = r0 + 12 * (1 - k2);
        g.beginPath(); g.moveTo(hx + Math.cos(an) * r0, hy + Math.sin(an) * r0); g.lineTo(hx + Math.cos(an) * r1, hy + Math.sin(an) * r1); g.stroke();
      }
      g.restore();
    }
    if (a >= 5.85 && a < 6.55) { /* the reply travels back */
      var ub = 1 - ease((a - 5.85) / 0.7);
      g.save();
      for (var m = 0; m < 8; m++) {
        var v0 = ub + (0.22 * m) / 8, v1 = ub + (0.22 * (m + 1)) / 8;
        if (v0 >= 1) { break; }
        g.globalAlpha = (1 - m / 8) * 0.7; g.lineWidth = 3 * (1 - m / 10); seg(v0, Math.min(1, v1), 3);
      }
      var qb = B(ub);
      g.globalAlpha = 1; g.fillStyle = rgb(AC);
      g.beginPath(); g.arc(qb[0], qb[1], 6, 0, 6.2832); g.fill();
      g.fillStyle = rgb(BG); g.beginPath(); g.arc(qb[0], qb[1], 2.4, 0, 6.2832); g.fill();
      g.restore();
    }
  };

  var mx = 0, tmx = 0;
  window.addEventListener("pointermove", function (ev) {
    var r = scene.getBoundingClientRect();
    tmx = (ev.clientX - r.left) / Math.max(1, r.width) - 0.5;
  }, { passive: true });

  var painted = false;
  var tick = function (now, dt, draw) {
    mx += (tmx - mx) * Math.min(1, dt * 4);
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      var tv = p.state === "walk" ? 1 : p.state === "locked" ? 0.45 : 0;
      p.v += (tv - p.v) * Math.min(1, dt * 5);
      p.x += p.dir * p.speed * p.v * dt;
      if ((p.x > 111 || p.x < -11) && p.state === "walk") { wrap(p); }
      var sw = Math.sin(now * Math.PI * p.f + p.ph);
      p.bob = -Math.abs(sw) * (1.5 + 2.5 * p.depth) * p.v;
      p.px = (p.x / 100) * W - mx * p.depth * W * 0.02;
      if (draw) { p.pe.style.transform = "translate3d(" + (p.px - p.w / 2).toFixed(1) + "px," + (-p.h / 2 + p.bob).toFixed(1) + "px,0) rotate(" + (sw * 0.7 * p.v).toFixed(2) + "deg)"; }
    }
    if (now >= nextAt) { start(now); }
    var active = S.some(function (s) { return s.p; });
    if (draw && (active || painted)) { g.clearRect(0, 0, W, H); painted = false; }
    S.forEach(function (s) {
      if (!s.p) { return; }
      var a = now - s.t0, pp = s.p, d = s.d;
      if (s.st < 1 && a >= 0.9) { s.st = 1; s.box.classList.remove("is-reply"); fill(s.box, d.tag, d.signal, ""); pop(s.box, true); journeyTo(0); }
      if (s.st < 2 && a >= 1.6) { s.st = 2; cardTyping = buildCard(d); cardTyping.t0 = now; cardTyping.n = -1; cardTyping.owner = s; cardIn(); journeyTo(1); }
      if (s.st < 3 && a >= 3.3) { s.st = 3; if (cardTyping && cardTyping.owner === s) { cardTyping.caret.remove(); cardOut(); cardTyping = null; } bump(1.14); }
      if (s.st < 4 && a >= 4.3) { s.st = 4; pp.state = "read"; pp.reached = true; hop(pp); journeyTo(2); }
      if (s.st < 5 && a >= 5) { s.st = 5; flip(s); underline(); }
      if (s.st < 6 && a >= 6.55) { s.st = 6; bump(1.1); pp.el.classList.add("is-done"); journeyTo(3); }
      if (s.st < 7 && a >= 7.25) { s.st = 7; pop(s.box, false); pp.state = "walk"; pp.el.style.zIndex = String(pp.t | 0); pp.img.style.transform = "scaleX(" + pp.dir + ")"; }
      if (a >= 7.65) { s.p = null; return; }
      if (draw) {
        var hd = head(pp), hx = hd[0], hy = hd[1];
        s.hx = hx;
        s.ty = hy - pp.h * 0.21 - 14;
        var lift = 0;
        S.forEach(function (o) { if (o !== s && o.p && o.t0 < s.t0 && Math.abs(o.hx - hx) < 350 && Math.abs(o.ty - s.ty) < 46) { lift = -46; } });
        s.ly += (lift - s.ly) * Math.min(1, dt * 8 || 1);
        /* keep the note on screen; its tail still points at the person */
        var half = (s.box.offsetWidth || 0) / 2 + 10;
        var x = Math.max(half, Math.min(W - half, hx));
        s.box.style.setProperty("--tail", (hx - x).toFixed(1) + "px");
        s.tip.style.transform = "translate(" + x.toFixed(1) + "px," + (s.ty + s.ly).toFixed(1) + "px)";
        drawReach(s, a, now, hx, hy);
        painted = true;
      }
    });
    if (cardTyping) {
      var L = cardTyping.line, k = Math.ceil(Math.min(1, (now - cardTyping.t0 - 0.25) / 1.0) * L.length);
      if (k !== cardTyping.n && k >= 0) { cardTyping.n = k; cardTyping.node.nodeValue = L.slice(0, k); }
    }
  };

  /* A still frame for people who asked for less motion: run the story until
     a message is in the air, then hold that moment with its card showing. */
  var drawStill = function () {
    seed = 11; di = 0; nextAt = 0.6; cardTyping = null;
    size(); build();
    S.forEach(function (s) { s.p = null; s.box.style.transform = "scale(0)"; s.box.style.opacity = "0"; });
    var i = 0;
    for (; i < 1600; i++) {
      tick(i / 60, 1 / 60, false);
      if (i > 420 && cardTyping && i / 60 - cardTyping.t0 > 1.4 && S.filter(function (s) { return s.p; }).length > 1) { break; }
    }
    tick(i / 60, 0, true);
  };

  if ("MutationObserver" in window) {
    new MutationObserver(function () { readColours(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* Nothing is built until the scene is close to the screen, and the
     drawings are decoded before anyone starts walking. */
  var started2 = false, ready = false, running = false, raf = 0, last = 0, clock = 0, lastW = 0;
  var loop = function (ms) {
    var dt = Math.min(0.1, Math.max(0, (ms - last) / 1000));
    last = ms;
    clock += dt;
    tick(clock, dt, true);
    raf = running ? requestAnimationFrame(loop) : 0;
  };
  var go = function () {
    if (running && ready && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  var begin = function () {
    if (started2) { return; }
    started2 = true;
    var decodes = PEEPS.map(function (src) {
      var im = new Image();
      im.src = src;
      return typeof im.decode === "function" ? im.decode().catch(function () {}) : Promise.resolve();
    });
    Promise.all(decodes).then(function () {
      if (frozen) {
        drawStill();
        if ("ResizeObserver" in window) { new ResizeObserver(function () { if (Math.abs(scene.clientWidth - W) > 40) { drawStill(); } }).observe(scene); }
        return;
      }
      size(); build(); lastW = W;
      if ("ResizeObserver" in window) {
        new ResizeObserver(function () { size(); if (Math.abs(W - lastW) > 60) { lastW = W; build(); } }).observe(scene);
      }
      ready = true;
      go();
    });
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { begin(); }
    }, { rootMargin: "800px 0px" }).observe(scene);
    inView(scene, function (on) {
      running = on && !frozen;
      if (running) { begin(); go(); }
    });
  } else {
    begin();
    running = !frozen;
  }
  })();

  /* 4. CRM sample pipeline --------------------------------------------------- */
  (function () {

  var pipe = $("[data-pipe]");
  if (pipe) {
    var cols = $$("[data-pipe-col]", pipe);
    var counts = $$("[data-pipe-count]", pipe);
    var NAMES = ["Priya S.", "Arjun M.", "Neha K.", "Rahul D.", "Fatima A.", "Vikram R.", "Ananya P.", "Kabir J.", "Meera N.", "Sameer T.", "Isha B.", "Dev G."];
    var SOURCES = ["Instagram ad", "Website form", "WhatsApp", "Google Search", "Facebook ad", "Referral"];
    var STEPS = ["Auto-reply sent", "Call booked", "Quote sent", "Paid"];
    var MAX = [3, 3, 3, 3];
    var made = 0;
    var cards = [];

    var makeCard = function (stage) {
      var li = doc.createElement("li");
      li.className = "pipe__card";
      var name = doc.createElement("span");
      name.className = "pipe__name";
      name.textContent = NAMES[made % NAMES.length];
      var src = doc.createElement("span");
      src.className = "pipe__src";
      src.textContent = SOURCES[(made * 5 + 1) % SOURCES.length];
      var stepEl = doc.createElement("span");
      stepEl.className = "pipe__step";
      li.appendChild(name);
      li.appendChild(src);
      li.appendChild(stepEl);
      made += 1;
      var card = { el: li, stage: stage, step: stepEl };
      place(card, stage, false);
      cards.push(card);
      return card;
    };

    var place = function (card, stage, animate) {
      var first = animate && motion ? card.el.getBoundingClientRect() : null;
      card.stage = stage;
      card.step.textContent = STEPS[stage];
      card.el.classList.toggle("is-won", stage === 3);
      cols[stage].insertBefore(card.el, cols[stage].firstChild);
      if (first && typeof card.el.animate === "function") {
        var last = card.el.getBoundingClientRect();
        card.el.animate(
          [{ transform: "translate(" + (first.left - last.left) + "px," + (first.top - last.top) + "px)" }, { transform: "none" }],
          { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        );
      }
    };

    var recount = function () {
      counts.forEach(function (c, i) { c.textContent = String(cards.filter(function (k) { return k.stage === i; }).length); });
    };

    /* A starting picture: a few in each column. */
    [3, 2, 2, 1].forEach(function (n, stage) { for (var k = 0; k < n; k++) { makeCard(stage); } });
    recount();

    var turn = 0;
    var move = function () {
      /* Take turns: a quote gets accepted, a reply goes out, a new lead gets answered. */
      var order = [2, 1, 0];
      for (var t = 0; t < order.length; t++) {
        var stage = order[(turn + t) % order.length];
        var here = cards.filter(function (k) { return k.stage === stage; });
        if (here.length) { place(here[0], stage + 1, true); break; }
      }
      turn += 1;
      /* Won keeps the latest few. */
      var won = cards.filter(function (k) { return k.stage === 3; });
      while (won.length > MAX[3]) {
        var gone = won.shift();
        gone.el.remove();
        cards.splice(cards.indexOf(gone), 1);
      }
      /* New enquiries keep arriving. */
      if (cards.filter(function (k) { return k.stage === 0; }).length < 2) {
        var fresh = makeCard(0);
        fresh.el.classList.add("is-new");
      }
      recount();
    };

    if (motion) {
      var pipeVisible = false;
      inView(pipe, function (on) { pipeVisible = on; });
      setInterval(function () { if (pipeVisible && !doc.hidden) { move(); } }, 2400);
    }
  }
  })();

})();
