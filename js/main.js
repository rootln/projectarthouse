/*
  Project Arthouse site script. No libraries.

   1. Helpers
   2. Contact links
   3. Images and logos
   4. Theme switch
   5. Loader
   6. Reveal on scroll
   7. Hero: moving field, changing word
   8. Marquee
   9. Statement: words light up as you scroll
  10. Cursor follower
  11. Tilt, spotlight, magnetic buttons
  12. Quote reel
  14. Questions and rate-card plans (accordion), plan links, hero countdown
  15. Process line
  16. Work section from js/work.js
  17. Brief form
  18. Header, menu, progress bar
  19. One scroll loop

  Everything that writes text to the page uses textContent, never innerHTML,
  so nothing typed by a visitor or stored in a data file can run as markup.
*/
(function () {
  "use strict";

  /* 1. Helpers ------------------------------------------------------------- */

  var C = window.ARTHOUSE || {};
  var WORK = Array.isArray(window.ARTHOUSE_WORK) ? window.ARTHOUSE_WORK : [];
  var doc = document;
  var root = doc.documentElement;
  var motion = root.classList.contains("motion");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function el(tag, cls, text) {
    var node = doc.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  /* Only web addresses and paths on this site are allowed in links and images
     that come from a data file. This keeps "javascript:" and similar out. */
  function safeUrl(value) {
    var v = String(value || "").trim();
    /* Control characters and backslashes are how a scheme gets disguised. */
    if (!v || /[\x00-\x1F\x7F\\]/.test(v)) { return ""; }
    var parsed;
    try { parsed = new URL(v, window.location.href); } catch (e) { return ""; }
    if (parsed.protocol === "https:") { return parsed.href; }
    var here = window.location;
    if (parsed.protocol === here.protocol && parsed.host === here.host && /^(https?|file):$/.test(parsed.protocol)) { return parsed.href; }
    return "";
  }

  /* 2. Contact links ------------------------------------------------------- */

  var emailOk = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(C.email || "");
  var waNumber = String(C.whatsapp || "").replace(/\D/g, "");
  var waOk = waNumber.length >= 8 && waNumber.length <= 15;

  function fillLinks(attr, href) {
    $$("[" + attr + "]").forEach(function (a) {
      var holder = a.hasAttribute("data-optional") ? a : (a.closest("[data-optional]") || a);
      if (!href) { holder.hidden = true; return; }
      a.href = href;
    });
  }

  fillLinks("data-email", emailOk ? "mailto:" + C.email : "");
  fillLinks("data-whatsapp", waOk ? "https://wa.me/" + waNumber : "");
  fillLinks("data-instagram", safeUrl(C.instagram));
  fillLinks("data-linkedin", safeUrl(C.linkedin));
  /* The address may break after the @ on narrow screens, and nowhere else. */
  $$("[data-email-text]").forEach(function (node) {
    if (!emailOk) { return; }
    var at = C.email.indexOf("@") + 1;
    node.textContent = "";
    node.appendChild(doc.createTextNode(C.email.slice(0, at)));
    node.appendChild(doc.createElement("wbr"));
    node.appendChild(doc.createTextNode(C.email.slice(at)));
  });
  $$("[data-year]").forEach(function (node) { node.textContent = new Date().getFullYear(); });

  /* 3. Images and logos ---------------------------------------------------- */

  function watchImage(img) {
    var wrap = img.closest(".skel");
    if (!wrap) { return; }
    function done() {
      wrap.classList.add("is-loaded");
      /* Hand the loaded picture to the progressive blur layers. */
      var blur = $(".pblur", wrap);
      var src = img.currentSrc || img.src;
      if (blur && src && img.naturalWidth) { blur.style.setProperty("--img", "url(" + JSON.stringify(src) + ")"); }
    }
    function broken() { wrap.classList.add("is-broken"); done(); }
    img.addEventListener("load", done);
    img.addEventListener("error", broken);
    if (img.complete) { if (img.getAttribute("src") && !img.naturalWidth) { broken(); } else { done(); } }
  }
  $$(".skel > img").forEach(watchImage);

  /* If the wordmark image cannot load, show the name in type instead. */
  $$('img[data-logo="word"]').forEach(function (img) {
    function fail() {
      var holder = img.closest(".logo");
      var text = holder && $(".logo__text", holder);
      if (holder && text) { holder.classList.add("is-text"); text.hidden = false; }
    }
    img.addEventListener("error", fail);
    if (img.complete && img.getAttribute("src") && !img.naturalWidth) { fail(); }
  });
  $$('img[data-logo="symbol"], img[data-logo="lockup"]').forEach(function (img) {
    function hide() { img.style.visibility = "hidden"; }
    img.addEventListener("error", hide);
    /* It may have failed before this script ran. */
    if (img.complete && img.getAttribute("src") && !img.naturalWidth) { hide(); }
  });

  /* 4. Theme switch -------------------------------------------------------- */

  var fields = [];
  var themeBtn = $("[data-theme-toggle]");
  var themeMeta = $('meta[name="theme-color"]');

  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("pa-theme", theme); } catch (e) { /* not stored, still switched */ }
    if (themeMeta) { themeMeta.setAttribute("content", theme === "light" ? "#EFEBE3" : "#0C0D10"); }
    if (themeBtn) { themeBtn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode"); }
    fields.forEach(function (f) { f.setTheme(theme); });
  }

  if (themeBtn) {
    themeBtn.setAttribute("aria-label", currentTheme() === "light" ? "Switch to dark mode" : "Switch to light mode");
    if (themeMeta && currentTheme() === "light") { themeMeta.setAttribute("content", "#EFEBE3"); }

    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      if (!motion || typeof doc.startViewTransition !== "function") { applyTheme(next); return; }

      /* The new colours sweep out in a circle from the button. */
      var r = themeBtn.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add("theme-switch");
      var vt = doc.startViewTransition(function () { applyTheme(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + reach + "px at " + x + "px " + y + "px)"] },
          { duration: 750, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () { /* the switch itself already happened */ });
      vt.finished.then(function () { root.classList.remove("theme-switch"); }, function () { root.classList.remove("theme-switch"); });
    });
  }

  /* 5. Loader -------------------------------------------------------------- */

  var hero = $(".hero") || $(".phero");
  var heroStarted = false;

  function startHero() {
    if (heroStarted) { return; }
    heroStarted = true;
    mountFields();
    if (!hero) { return; }
    requestAnimationFrame(function () {
      hero.classList.add("is-in");
      $$("[data-reveal-lines]", hero).forEach(function (h) { h.classList.add("is-in"); });
      $$("[data-reveal]", hero).forEach(function (node, i) {
        node.style.setProperty("--i", i + 2);
        node.classList.add("is-in");
      });
      startRoll();
    });
  }

  var loader = $(".loader");
  if (loader && !root.classList.contains("no-loader")) {
    var countEl = $("[data-loader-count]", loader);
    var barEl = $("[data-loader-bar]", loader);
    var shown = 0;
    var target = 0.84;
    var began = performance.now();
    doc.body.classList.add("is-locked");
    try { window.sessionStorage.setItem("pa-intro", "1"); } catch (e) { /* plays again next page, harmless */ }
    /* The hello has now been said. Next visit gets the line of the day. */
    var shownDay = root.getAttribute("data-day") || "";
    if (shownDay === "hello") { try { window.localStorage.setItem("pa-hello", "1"); } catch (e) { /* it will say hello again */ } }
    /* A line with the studio's sentence under it gets a little longer on screen. */
    var holdFor = $('.loader__quote[data-day="' + shownDay.replace(/[^a-z0-9]/g, "") + '"] .loader__take', loader) ? 3000 : 2300;

    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    var pageLoaded = new Promise(function (resolve) {
      if (doc.readyState === "complete") { resolve(); } else { window.addEventListener("load", resolve, { once: true }); }
    });
    var giveUp = new Promise(function (resolve) { setTimeout(resolve, 3600); });
    Promise.race([Promise.all([fontsReady, pageLoaded]), giveUp]).then(function () {
      /* Long enough to read the line of the day, short enough not to annoy. */
      var wait = Math.max(0, holdFor - (performance.now() - began));
      setTimeout(function () { target = 1; }, wait);
    });

    /* The count follows the clock, not the frame rate, so a slow device
       sees the same two seconds as a fast one. */
    var lastTick = 0;
    var tickLoader = function (now) {
      var dt = lastTick ? Math.min(0.25, (now - lastTick) / 1000) : 0.016;
      lastTick = now;
      shown += Math.max(0.24 * dt, (target - shown) * (1 - Math.exp(-5.2 * dt)));
      if (shown > target) { shown = target; }
      countEl.textContent = String(Math.round(shown * 100));
      barEl.style.transform = "scaleX(" + shown.toFixed(4) + ")";
      if (target === 1 && shown >= 0.999) {
        countEl.textContent = "100";
        barEl.style.transform = "scaleX(1)";
        setTimeout(function () {
          loader.classList.add("is-done");
          doc.body.classList.remove("is-locked");
          setTimeout(startHero, 240);
          setTimeout(function () { loader.classList.add("is-gone"); }, 1100);
        }, 220);
        return;
      }
      requestAnimationFrame(tickLoader);
    };
    requestAnimationFrame(tickLoader);
  } else {
    var ready = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    Promise.race([ready, new Promise(function (r) { setTimeout(r, 700); })]).then(startHero);
  }

  /* 6. Reveal on scroll ---------------------------------------------------- */

  var revealTargets = $$("[data-reveal], [data-reveal-lines]").filter(function (node) {
    return !hero || !hero.contains(node);
  });

  $$("[data-stagger]").forEach(function (parent) {
    $$("[data-reveal]", parent).forEach(function (child, i) { child.style.setProperty("--i", i); });
  });
  $$("[data-reveal-lines]").forEach(function (heading) {
    $$(".mask > span", heading).forEach(function (line, i) { line.style.setProperty("--i", i); });
  });

  if (motion && "IntersectionObserver" in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    revealTargets.forEach(function (node) { revealer.observe(node); });
  } else {
    revealTargets.forEach(function (node) { node.classList.add("is-in"); });
  }

  /* From here on hidden text has something that will reveal it. js/boot.js
     watches for this and shows everything plainly if it never comes. */
  root.classList.add("is-live");

  /* 7. Hero ---------------------------------------------------------------- */

  var heroCopy = hero && $(".hero__copy", hero);

  /* The satin starts once the loader has cleared, so the two never compete. */
  var fieldsMounted = false;
  function mountFields() {
    if (fieldsMounted) { return; }
    fieldsMounted = true;
    $$("canvas[data-field]").forEach(mountField);
  }

  function mountField(canvas) {
    if (!window.ArthouseField) { return; }
    var look = canvas.getAttribute("data-field");
    var handle = window.ArthouseField.mount(canvas, {
      look: look,
      theme: currentTheme(),
      scale: window.innerWidth < 760 ? 0.5 : 0.62,
      still: !motion,
      time: look === "ribbon" ? 5 : 12,
      gain: look === "ribbon" ? 0.72 : 1,
      seed: 0,
      shift: look === "silk" ? function () { return window.scrollY / Math.max(1, window.innerHeight); } : null
    });
    if (handle) { fields.push(handle); }
  }

  /* The changing word in the headline. */
  var words = $$("[data-word]");
  var rollAt = Math.max(0, words.findIndex(function (w) { return w.classList.contains("is-on"); }));
  var rollTimer = 0;

  function rollTo(next) {
    var prev = rollAt;
    if (next === prev) { return; }
    rollAt = next;
    if (words[prev]) {
      var old = words[prev];
      old.classList.remove("is-on");
      old.classList.add("is-out");
      setTimeout(function () {
        /* Put it back below the line without letting it slide through view. */
        old.style.transition = "none";
        old.classList.remove("is-out");
        void old.offsetWidth;
        old.style.transition = "";
      }, 950);
    }
    if (words[next]) { words[next].classList.add("is-on"); }
  }

  function startRoll() {
    if (!motion || words.length < 2 || rollTimer) { return; }
    rollTimer = setInterval(function () {
      if (doc.hidden || window.scrollY > window.innerHeight) { return; }
      rollTo((rollAt + 1) % words.length);
    }, 2900);
  }

  function driftHero() {
    if (!heroCopy || !motion) { return; }
    var p = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1);
    heroCopy.style.transform = "translate3d(0," + (p * 70).toFixed(1) + "px,0)";
    heroCopy.style.opacity = String(clamp(1 - p * 1.5, 0, 1));
  }

  /* 8. Marquee -------------------------------------------------------------- */

  var marquee = $("[data-marquee]");
  var boost = 0;
  if (marquee && motion) {
    var track = $(".marquee__track", marquee);
    var mx = 0;
    var mLast = 0;
    var mOn = false;
    var mRaf = 0;
    var stepMarquee = function (now) {
      var dt = mLast ? Math.min(0.05, (now - mLast) / 1000) : 0;
      mLast = now;
      var loop = track.scrollWidth / 3;
      mx -= (52 + boost) * dt;
      boost *= 0.92;
      if (loop > 0 && mx <= -loop) { mx += loop; }
      track.style.transform = "translate3d(" + mx.toFixed(1) + "px,0,0)";
      mRaf = mOn ? requestAnimationFrame(stepMarquee) : 0;
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        mOn = entries[0].isIntersecting;
        if (mOn && !mRaf) { mLast = 0; mRaf = requestAnimationFrame(stepMarquee); }
      }).observe(marquee);
    }
  }

  /* 9. Statement ----------------------------------------------------------- */

  var wordGroups = [];
  if (motion) {
    $$("[data-words]").forEach(function (block) {
      var parts = block.textContent.trim().split(/\s+/);
      block.textContent = "";
      var spans = parts.map(function (w, i) {
        var s = el("span", "word", w);
        s.style.opacity = "0.16";
        block.appendChild(s);
        if (i < parts.length - 1) { block.appendChild(doc.createTextNode(" ")); }
        return s;
      });
      wordGroups.push({ block: block, spans: spans });
    });
  }

  function lightWords() {
    var vh = window.innerHeight;
    wordGroups.forEach(function (g) {
      var r = g.block.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) { return; }
      var p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.42), 0, 1);
      var n = g.spans.length;
      var soft = 5;
      g.spans.forEach(function (s, i) {
        var o = clamp((p * (n + soft) - i) / soft, 0, 1);
        s.style.opacity = (0.16 + 0.84 * o).toFixed(3);
      });
    });
  }

  /* 10. Cursor follower ----------------------------------------------------- */

  if (motion && finePointer) {
    var cursor = el("div", "cursor");
    var cursorLabel = el("span", "cursor__label");
    cursor.setAttribute("aria-hidden", "true");
    cursor.appendChild(cursorLabel);
    doc.body.appendChild(cursor);

    var cx = 0, cy = 0, tx = 0, ty = 0, cursorRaf = 0, cursorSeen = false;

    var stepCursor = function () {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      cursorRaf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.2 ? requestAnimationFrame(stepCursor) : 0;
    };

    doc.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") { return; }
      tx = ev.clientX;
      ty = ev.clientY;
      if (!cursorSeen) { cursorSeen = true; cx = tx; cy = ty; }
      cursor.classList.add("is-on");

      var target = ev.target instanceof Element ? ev.target : null;
      var labelled = target && target.closest("[data-cursor]");
      var typing = target && target.closest("input[type='text'], textarea");
      var link = target && target.closest("a, button, summary, .tick, input[type='file']");
      if (labelled) {
        var text = labelled.getAttribute("data-cursor");
        if (cursorLabel.textContent !== text) { cursorLabel.textContent = text; }
      }
      cursor.classList.toggle("is-label", !!labelled);
      cursor.classList.toggle("is-link", !labelled && !!link && !typing);
      if (!cursorRaf) { cursorRaf = requestAnimationFrame(stepCursor); }
    }, { passive: true });

    doc.documentElement.addEventListener("mouseleave", function () { cursor.classList.remove("is-on"); });
  }

  /* 11. Tilt, spotlight, magnetic buttons ----------------------------------- */

  function addTilt(card) {
    /* The hover look (colour, blur, what is included) is for mouse and
       keyboard alike, with or without motion. Only the tilt needs motion. */
    card.addEventListener("focus", function () { if (card.matches(":focus-visible")) { card.classList.add("is-hover"); } });
    card.addEventListener("blur", function () { card.classList.remove("is-hover"); });
    if (!motion || !finePointer) {
      card.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "mouse") { card.classList.add("is-hover"); } });
      card.addEventListener("pointerleave", function () { card.classList.remove("is-hover"); });
      return;
    }
    var spot = $(".spot", card);
    var factor = card.classList.contains("frame") ? 9 : 6;
    var rx = 0, ry = 0, trx = 0, try_ = 0, raf = 0;

    function step() {
      rx += (trx - rx) * 0.11;
      ry += (try_ - ry) * 0.11;
      card.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      raf = Math.abs(trx - rx) + Math.abs(try_ - ry) > 0.01 ? requestAnimationFrame(step) : 0;
    }
    function kick() { if (!raf) { raf = requestAnimationFrame(step); } }

    card.addEventListener("pointerenter", function (ev) {
      if (ev.pointerType === "mouse") { card.classList.add("is-hover"); }
    });
    card.addEventListener("pointermove", function (ev) {
      if (ev.pointerType !== "mouse") { return; }
      var r = card.getBoundingClientRect();
      var nx = (ev.clientX - r.left) / r.width;
      var ny = (ev.clientY - r.top) / r.height;
      trx = (ny - 0.5) * 2 * factor;
      try_ = (0.5 - nx) * 2 * factor;
      if (spot) { spot.style.transform = "translate3d(" + (nx * r.width).toFixed(1) + "px," + (ny * r.height).toFixed(1) + "px,0)"; }
      kick();
    });
    card.addEventListener("pointerleave", function () {
      card.classList.remove("is-hover");
      trx = 0;
      try_ = 0;
      kick();
    });
  }
  $$("[data-tilt]").forEach(addTilt);

  if (motion && finePointer) {
    $$("[data-magnet]").forEach(function (link) {
      var disc = $(".round__disc", link) || link;
      link.addEventListener("pointermove", function (ev) {
        var r = disc.getBoundingClientRect();
        var dx = ev.clientX - (r.left + r.width / 2);
        var dy = ev.clientY - (r.top + r.height / 2);
        disc.style.transition = "transform 0.2s ease-out";
        disc.style.transform = "translate(" + (clamp(dx, -40, 40) * 0.3).toFixed(1) + "px," + (clamp(dy, -40, 40) * 0.3).toFixed(1) + "px)";
      });
      link.addEventListener("pointerleave", function () {
        disc.style.transition = "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
        disc.style.transform = "";
      });
    });
  }

  /* 12. Quote reel ----------------------------------------------------------- */

  var reel = $("[data-reel]");
  var reelBg = $(".reel__bg");
  if (reel) {
    var takes = $$("[data-take]", reel);
    var reelNo = $("[data-reel-no]", reel);
    var reelLive = $("[data-reel-live]", reel);
    var at = 0;
    var showTake = function (next) {
      next = (next + takes.length) % takes.length;
      if (next === at) { return; }
      var old = takes[at];
      old.classList.remove("is-on");
      old.classList.add("is-out");
      old.setAttribute("aria-hidden", "true");
      setTimeout(function () {
        old.style.transition = "none";
        old.classList.remove("is-out");
        void old.offsetWidth;
        old.style.transition = "";
      }, 600);
      takes[next].classList.add("is-on");
      takes[next].removeAttribute("aria-hidden");
      at = next;
      if (reelNo) { reelNo.textContent = pad(at + 1); }
      /* Say the new line for people who cannot see it change. */
      if (reelLive) {
        var q = $("blockquote", takes[at]);
        var from = $(".reel__from", takes[at]);
        reelLive.textContent = (q ? q.textContent.trim() : "") + " " + (from ? from.textContent.trim() : "");
      }
    };
    var nextBtn = $("[data-reel-next]", reel);
    var prevBtn = $("[data-reel-prev]", reel);
    if (nextBtn) { nextBtn.addEventListener("click", function () { showTake(at + 1); }); }
    if (prevBtn) { prevBtn.addEventListener("click", function () { showTake(at - 1); }); }
    reel.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight") { showTake(at + 1); }
      if (ev.key === "ArrowLeft") { showTake(at - 1); }
    });
  }

  function driftReel() {
    if (!reelBg || !motion) { return; }
    var r = reelBg.parentElement.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) { return; }
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    reelBg.style.transform = "translate3d(0," + (p * -7).toFixed(2) + "%,0)";
  }

  /* 14. Questions and plans --------------------------------------------------- */

  /* Questions and rate-card plans open the same way. In a rate card only one
     plan is open at a time, so the list stays short enough to compare. */
  /* A link straight to one plan (rates.html#plan-wedding-invitation) opens it. */
  function openLinkedPlan() {
    var linked = window.location.hash.length > 1 ? doc.getElementById(window.location.hash.slice(1)) : null;
    if (linked && linked.classList.contains("plan")) {
      $$(".plan", linked.parentElement).forEach(function (other) { other.open = other === linked; });
    }
  }
  openLinkedPlan();
  window.addEventListener("hashchange", openLinkedPlan);

  var canAnimate = motion && typeof Element.prototype.animate === "function";
  var closers = [];

  $$(".faq, .plan").forEach(function (item) {
    var group = item.closest("[data-plans]");
    var summary = $("summary", item);
    var body = $(".faq__a, .plan__body", item);
    if (!summary || !body) { return; }

    if (!canAnimate) {
      /* No animation: the browser opens and closes it. Keep one plan open. */
      item.addEventListener("toggle", function () {
        if (!group || !item.open) { return; }
        $$(".plan", group).forEach(function (other) { if (other !== item) { other.open = false; } });
      });
      return;
    }

    (function () {
      var busy = null;
      /* What the visitor last asked for. A click during the animation turns
         it round from where it is, so quick clicks always end where expected. */
      var wantOpen = item.open;
      var set = function (open) {
        if (open === wantOpen) { return; }
        wantOpen = open;
        var from = item.open ? body.offsetHeight : 0;
        if (busy) { busy.onfinish = null; busy.cancel(); busy = null; }
        if (wantOpen) { item.open = true; }
        var full = body.scrollHeight;
        var part = full ? clamp(from / full, 0, 1) : 0;
        var run = body.animate(
          { height: [from + "px", (wantOpen ? full : 0) + "px"], opacity: [part, wantOpen ? 1 : 0] },
          { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        );
        busy = run;
        run.onfinish = function () {
          if (busy !== run) { return; }
          if (!wantOpen) { item.open = false; }
          busy = null;
        };
      };
      closers.push({ item: item, group: group, close: function () { set(false); } });
      /* The browser can open a row by itself, for example when "find in
         page" lands inside it. Keep in step, and keep one plan open. */
      item.addEventListener("toggle", function () {
        if (busy || item.open === wantOpen) { return; }
        wantOpen = item.open;
        if (wantOpen && group) {
          closers.forEach(function (c) { if (c.group === group && c.item !== item) { c.close(); } });
        }
      });
      summary.addEventListener("click", function (ev) {
        /* A link or button inside the row is not a request to open it. */
        if (ev.target instanceof Element && ev.target.closest("a, button")) { return; }
        ev.preventDefault();
        var opening = !wantOpen;
        if (opening && group) {
          closers.forEach(function (c) { if (c.group === group && c.item !== item) { c.close(); } });
        }
        set(opening);
      });
    })();
  });

  /* 15. Process -------------------------------------------------------------- */

  var steps = $(".steps");
  var stepFill = steps && $(".steps__fill", steps);
  var stepItems = steps ? $$(".step", steps) : [];

  function fillSteps() {
    if (!steps) { return; }
    var vh = window.innerHeight;
    var r = steps.getBoundingClientRect();
    if (r.bottom < -40 || r.top > vh + 40) { return; }
    var p = clamp((vh * 0.62 - r.top) / Math.max(1, r.height), 0, 1);
    if (stepFill) { stepFill.style.transform = "scaleY(" + (motion ? p : 1).toFixed(4) + ")"; }
    stepItems.forEach(function (item) {
      item.classList.toggle("is-on", item.getBoundingClientRect().top < vh * 0.64);
    });
  }

  /* 16. Work ----------------------------------------------------------------- */

  var workSection = $("#work");
  var workList = $(".work__list");

  if (workSection && workList && WORK.length) {
    WORK.forEach(function (item) {
      if (!item || typeof item !== "object") { return; }
      var li = el("li", "work__item");
      var link = safeUrl(item.link);
      var face = el(link ? "a" : "div", "card__face work__face");
      if (link) {
        face.href = link;
        face.setAttribute("data-cursor", "View");
        if (/^https:/i.test(link)) { face.rel = "noopener noreferrer"; }
      }
      face.setAttribute("data-tilt", "");

      var src = safeUrl(item.image);
      if (src) {
        var media = el("span", "card__media skel");
        var img = doc.createElement("img");
        img.alt = String(item.alt || "");
        img.loading = "lazy";
        img.decoding = "async";
        media.appendChild(img);
        if (item.summary) {
          var blur = el("span", "pblur");
          for (var i = 0; i < 4; i++) { blur.appendChild(doc.createElement("i")); }
          media.appendChild(blur);
        }
        face.appendChild(media);
        watchImage(img);
        img.src = src;
      }
      face.appendChild(el("span", "spot"));

      if (item.summary) {
        var over = el("span", "card__over");
        over.appendChild(el("span", "", String(item.summary)));
        face.appendChild(over);
      }

      li.appendChild(face);
      li.appendChild(el("h3", "work__title", String(item.title || "")));
      li.appendChild(el("p", "work__meta", [item.service, item.year].filter(Boolean).join(", ")));
      workList.appendChild(li);
      addTilt(face);
    });
    workSection.hidden = false;
  }

  /* 17. Brief form ----------------------------------------------------------- */

  var form = $(".brief");
  var NEEDS = Array.isArray(C.services) ? C.services : [];
  var FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  var FILE_MAX = 5 * 1024 * 1024;

  /* A link that leads to the brief can tick a service on the way, and
     "Start with this plan" also writes the plan into the details box. */
  var planLine = "";
  $$("[data-pick]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (!form) { return; }
      $$('input[name="need"]', form).forEach(function (box) {
        if (box.value === link.getAttribute("data-pick")) { box.checked = true; }
      });
      var plan = link.getAttribute("data-plan");
      var price = plan ? link.getAttribute("data-price-" + currentCurrency().toLowerCase()) : "";
      if (plan && price) { plan += " (" + price + ")"; }
      var about = form.elements.about;
      if (plan && about) {
        /* Take out only the line this script wrote earlier, wherever it now
           sits, and never a line the visitor typed. */
        var rest = about.value;
        var was = planLine ? rest.indexOf(planLine) : -1;
        if (was > -1) { rest = rest.slice(0, was) + rest.slice(was + planLine.length); }
        planLine = "Plan: " + plan + "\n";
        about.value = planLine + rest;
        /* Let the page finish scrolling to the form, then put the cursor in it. */
        setTimeout(function () { try { about.focus({ preventScroll: true }); about.setSelectionRange(about.value.length, about.value.length); } catch (e) { /* older browsers */ } }, 700);
      }
    });
  });

  /* Currency. Every price is in the page once per currency and the stylesheet
     shows the one named on <html>. js/boot.js chose a starting value before
     anything was drawn; the buttons on the rate card change it. */
  var CURRENCIES = Array.isArray(C.currencies) ? C.currencies : [];
  function currentCurrency() {
    var now = root.getAttribute("data-currency") || "";
    return CURRENCIES.indexOf(now) > -1 ? now : (CURRENCIES[0] || "");
  }
  function showCurrency(code, byVisitor) {
    if (CURRENCIES.indexOf(code) === -1) { code = CURRENCIES[0] || ""; }
    if (!code) { return; }
    root.setAttribute("data-currency", code);
    $$("[data-currency-set]").forEach(function (btn) { btn.setAttribute("aria-pressed", String(btn.getAttribute("data-currency-set") === code)); });
    if (!byVisitor) { return; }
    try { window.localStorage.setItem("pa-currency", code); } catch (e) { /* not remembered, still switched */ }
    if (motion && typeof Element.prototype.animate === "function") {
      $$('.plan__price [data-cur="' + code + '"]').forEach(function (node, i) {
        node.animate({ opacity: [0, 1], transform: ["translateY(10px)", "none"] }, { duration: 420, delay: i * 35, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
      });
    }
  }
  showCurrency(currentCurrency(), false);
  $$("[data-currency-set]").forEach(function (btn) {
    btn.addEventListener("click", function () { showCurrency(btn.getAttribute("data-currency-set"), true); });
  });

  /* The hero preview: a clock counting down to midnight, like the real pages do. */
  var countdown = $("[data-countdown]");
  if (countdown) {
    var tick = function () {
      var now = new Date();
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var left = Math.max(0, Math.floor((end - now) / 1000));
      countdown.textContent = pad(Math.floor(left / 3600)) + ":" + pad(Math.floor(left / 60) % 60) + ":" + pad(left % 60);
    };
    tick();
    countdown.hidden = false;
    setInterval(function () { if (!doc.hidden) { tick(); } }, 1000);
  }

  if (form) {
    var note = $(".brief__note", form);
    var sendBtn = $(".brief__send", form);
    var waBtn = $("[data-wa-send]", form);
    var csrf = "";
    var lastSend = 0;

    var say = function (text) { note.textContent = text; };

    /* When the optional server runs the site it replaces js/server-mode.js
       with one line that sets ARTHOUSE_SERVER. Then the form posts to the
       server and the file field appears. On a plain static host that file is
       empty and the form opens the visitor's email app or WhatsApp instead. */
    var getToken = function () {
      return fetch("api/csrf", { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (res) {
          var type = res.headers.get("content-type") || "";
          if (!res.ok || type.indexOf("application/json") === -1) { throw new Error("no server"); }
          return res.json();
        })
        .then(function (data) {
          if (!data || typeof data.token !== "string") { throw new Error("no token"); }
          csrf = data.token;
          $$("[data-server-only]", form).forEach(function (node) { node.hidden = false; });
          return csrf;
        });
    };
    /* An email or WhatsApp link can only carry so much text, so without the
       server the details box is shorter. The server takes the full length. */
    var LINK_MAX = 1500;
    var SERVER_MAX = 4000;
    var aboutBox = form.elements.about;
    if (aboutBox) { aboutBox.maxLength = LINK_MAX; }
    if (window.ARTHOUSE_SERVER === true) {
      getToken().then(function () { if (aboutBox) { aboutBox.maxLength = SERVER_MAX; } }).catch(function () { csrf = ""; });
    }
    if (waBtn && waOk) { waBtn.hidden = false; }

    var readForm = function () {
      var nameEl = form.elements.name;
      var reachEl = form.elements.reach;
      var aboutEl = form.elements.about;
      var fileEl = form.elements.attachment;
      var name = nameEl.value.replace(/\s+/g, " ").trim();
      var reach = reachEl.value.trim();
      var about = aboutEl.value.trim();
      var needs = $$('input[name="need"]:checked', form).map(function (b) { return b.value; })
        .filter(function (v) { return NEEDS.indexOf(v) > -1; });
      var file = fileEl && fileEl.files && fileEl.files[0];
      var isEmail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(reach);
      var isPhone = /^\+?[0-9(][0-9 ()-]{6,18}$/.test(reach) && reach.replace(/\D/g, "").length >= 7;
      var aboutMax = csrf ? SERVER_MAX : LINK_MAX;

      var problem = "";
      var badEl = null;
      if (!name || name.length > 80) { problem = "Add your name (up to 80 characters)."; badEl = nameEl; }
      else if (!(isEmail || isPhone) || reach.length > 120) { problem = "Add an email address or phone number we can reach you on."; badEl = reachEl; }
      else if (about.length - (planLine && about.indexOf(planLine.trim()) === 0 ? planLine.length : 0) > aboutMax) { problem = "Keep the details under " + aboutMax.toLocaleString("en-IN") + " characters."; badEl = aboutEl; }
      else if (file && FILE_TYPES.indexOf(file.type) === -1) { problem = "The attachment must be a PDF, PNG, JPG or WebP file."; badEl = fileEl; }
      else if (file && file.size > FILE_MAX) { problem = "The attachment must be 5 MB or smaller."; badEl = fileEl; }

      [nameEl, reachEl, aboutEl].forEach(function (f) {
        f.setAttribute("aria-invalid", String(f === badEl));
        /* Tie the message to the field it is about. */
        if (f === badEl && note.id) { f.setAttribute("aria-describedby", note.id); } else { f.removeAttribute("aria-describedby"); }
      });
      return { name: name, reach: reach, about: about, needs: needs, file: file, problem: problem, badEl: badEl };
    };

    var asText = function (data) {
      return [
        "Hello Project Arthouse,",
        "",
        "Name: " + data.name,
        "Reach me at: " + data.reach,
        "I need: " + (data.needs.length ? data.needs.join(", ") : "Not sure yet"),
        "",
        data.about || "(No details added)"
      ].join("\n");
    };

    var checked = function () {
      var data = readForm();
      if (data.problem) {
        say(data.problem);
        if (data.badEl && data.badEl.focus) { data.badEl.focus(); }
        return null;
      }
      return data;
    };

    var showReceipt = function (id, receipt) {
      note.textContent = "Brief received. ";
      var a = el("a", "", "Keep this private link to view what you sent.");
      a.href = "brief.html#" + encodeURIComponent(id) + "." + encodeURIComponent(receipt);
      note.appendChild(a);
    };

    var sendToServer = function (data) {
      var body = new FormData();
      body.append("name", data.name);
      body.append("reach", data.reach);
      body.append("about", data.about);
      data.needs.forEach(function (n) { body.append("need", n); });
      body.append("company", form.elements.company.value);
      if (data.file) { body.append("attachment", data.file); }

      sendBtn.disabled = true;
      say("Sending your brief.");

      var post = function (token) {
        return fetch("api/briefs", {
          method: "POST",
          body: body,
          credentials: "same-origin",
          headers: { "X-CSRF-Token": token, Accept: "application/json" }
        });
      };

      post(csrf)
        .then(function (res) {
          /* A token can expire while the page sits open. Fetch a new one once. */
          if (res.status === 403) { return getToken().then(post); }
          return res;
        })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; });
        })
        .then(function (out) {
          if (out.res.status === 201 && out.json.id && out.json.receipt) {
            form.reset();
            showReceipt(String(out.json.id), String(out.json.receipt));
          } else if (out.res.status === 429) {
            say("Too many briefs from this connection. Try again later" + (emailOk ? " or write to " + C.email + "." : "."));
          } else {
            say(typeof out.json.error === "string" ? out.json.error : "The brief did not send. Try again in a minute.");
          }
        })
        .catch(function () {
          say("The brief did not send." + (emailOk ? " Email it to " + C.email + " instead." : " Try again in a minute."));
        })
        .then(function () { sendBtn.disabled = false; });
    };

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var data = checked();
      if (!data) { return; }
      /* A light brake on double clicks. The real limit is on the server. */
      if (Date.now() - lastSend < 4000) { return; }
      lastSend = Date.now();

      if (csrf) { sendToServer(data); return; }

      if (!emailOk) {
        say("The form cannot send from this page right now. Please try again later.");
        return;
      }
      window.location.href = "mailto:" + C.email +
        "?subject=" + encodeURIComponent("Project brief from " + data.name) +
        "&body=" + encodeURIComponent(asText(data));
      say("Your email app should now be open with the brief filled in. If it did not open, write to " + C.email + ".");
    });

    if (waBtn && waOk) {
      waBtn.addEventListener("click", function () {
        var data = checked();
        if (!data) { return; }
        window.open("https://wa.me/" + waNumber + "?text=" + encodeURIComponent(asText(data)), "_blank", "noopener,noreferrer");
        say("WhatsApp should open in a new tab with your brief. Review it there and press send.");
      });
    }
  }

  /* 18. Header, menu, progress bar ------------------------------------------- */

  var header = $(".site-header");
  /* Only links that point into this very page take part in "you are here". */
  var navLinks = $$(".site-nav a").filter(function (a) { return a.hash && a.pathname === window.location.pathname; });
  var sections = navLinks
    .map(function (a) { return (a.getAttribute("href") || "").split("#")[1]; })
    .filter(Boolean)
    .map(function (id) { return doc.getElementById(id); })
    .filter(function (node) { return node && !node.hidden; });
  var alwaysSolid = header && header.hasAttribute("data-solid");
  var progress = $("[data-progress]");
  var lastY = window.scrollY;
  var menuBtn = $(".menu-btn");
  var menu = $("#menu");

  function updateHeader() {
    if (!header) { return; }
    var y = window.scrollY;
    var delta = y - lastY;
    boost = clamp(boost + Math.abs(delta) * 2.2, 0, 900);
    header.classList.toggle("is-solid", alwaysSolid || y > 24);
    if (!menu || menu.hidden) {
      if (y > 480 && delta > 4 && !header.contains(doc.activeElement)) { header.classList.add("is-away"); }
      else if (delta < -4 || y <= 480) { header.classList.remove("is-away"); }
    }
    lastY = y;

    var probe = window.innerHeight * 0.4;
    var current = "";
    sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= probe) { current = sec.id; } });
    navLinks.forEach(function (a) {
      if (current && (a.getAttribute("href") || "").split("#")[1] === current) { a.setAttribute("aria-current", "true"); }
      else { a.removeAttribute("aria-current"); }
    });

    if (progress) {
      var span = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (span > 0 ? clamp(y / span, 0, 1) : 0).toFixed(4) + ")";
    }
  }

  function setMenu(open) {
    if (!menu || !menuBtn) { return; }
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
    doc.body.classList.toggle("is-locked", open);
    /* While the menu covers the page, nothing behind it can take focus. */
    $$("main, .footer").forEach(function (node) { node.inert = open; });
    if (open) { header.classList.add("is-solid"); header.classList.remove("is-away"); } else { lastY = window.scrollY; updateHeader(); }
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.addEventListener("click", function (ev) {
      if (ev.target instanceof Element && ev.target.closest("a")) { setMenu(false); }
    });
    doc.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !menu.hidden) { menuBtn.focus(); setMenu(false); }
    });
    window.addEventListener("resize", function () {
      if (!menu.hidden && window.innerWidth > 1080) { setMenu(false); }
    });
  }

  /* 19. One scroll loop ------------------------------------------------------ */

  var queued = false;
  function onFrame() {
    queued = false;
    updateHeader();
    driftHero();
    driftReel();
    lightWords();
    fillSteps();
  }
  function queue() {
    if (!queued) { queued = true; requestAnimationFrame(onFrame); }
  }

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  onFrame();
})();
