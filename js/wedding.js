/*
  The wedding invitation sample (demo-wedding.html).

  What this file does, top to bottom:
    the music, and falling petals
    the door that opens onto the invitation
    moving between the five parts, with a wipe from wherever you pressed
    the countdown
    the rite at the mandap: garlands, the knot, then the seven pheras (the
      3D picture itself is js/wedding-scene.js)
    the ceremonies, one card at a time
    the reply form (a preview: nothing is sent or kept)

  Loaded in the head so the "js" class is set before the page is drawn.
  If anything here fails, that class is taken off again and the page falls
  back to its plain, readable layout.
*/
(function () {
  "use strict";

  var root = document.documentElement;
  root.className += (root.className ? " " : "") + "js";

  function ready(fn) { if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", fn); } else { fn(); } }
  function all(scope, sel) { return Array.prototype.slice.call(scope.querySelectorAll(sel)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function focusOn(el) { if (!el) { return; } try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }

  /* ---- music -------------------------------------------------------------------
     With no recording named in tools/site.js, the page makes its own: a tanpura
     drone and a slow line in raga Bhoopali, built from oscillators. Name a
     recording there (demoWedding.music) and that plays instead; the bell and
     the notes for the seven pheras are still made here. */

  var Sound = (function () {
    var ctx = null, master = null, bus = null, on = false, timer = 0, sleep = 0, tNote = 0, tDrone = 0, iNote = 0, iDrone = 0, track = null;
    var SA = 293.66, BEAT = 0.64;
    /* the seven notes, sa to ni, and sa above */
    var SAPTAK = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
    /* [note as a ratio of sa, or 0 for a rest, length in beats] */
    var LINE = [[5 / 4, 2], [9 / 8, 1], [1, 3], [5 / 6, 1], [1, 1], [9 / 8, 1], [5 / 4, 3], [5 / 4, 1], [3 / 2, 1], [5 / 3, 2], [3 / 2, 1], [5 / 4, 3],
      [3 / 2, 1], [5 / 4, 1], [9 / 8, 1], [1, 3], [0, 2], [1, 1], [9 / 8, 1], [5 / 4, 1], [3 / 2, 2], [5 / 3, 1], [2, 4], [5 / 3, 1], [3 / 2, 1], [5 / 4, 1], [9 / 8, 1], [1, 4], [0, 4]];
    var DRONE = [3 / 4, 1, 1, 1 / 2];

    function make() {
      var AC = window.AudioContext || window.webkitAudioContext, delay, back, wet, comp;
      if (!AC) { return false; }
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      comp = ctx.createDynamicsCompressor();
      bus = ctx.createGain();
      delay = ctx.createDelay(1); delay.delayTime.value = 0.33;
      back = ctx.createGain(); back.gain.value = 0.27;
      wet = ctx.createGain(); wet.gain.value = 0.32;
      bus.connect(master); bus.connect(delay); delay.connect(back); back.connect(delay); delay.connect(wet); wet.connect(master);
      master.connect(comp); comp.connect(ctx.destination);
      return true;
    }
    /* a struck string, something like a santoor */
    function pluck(freq, t, loud, len) {
      var g = ctx.createGain(), parts = [[1, 1, "triangle"], [2, 0.32, "sine"], [3.01, 0.1, "sine"]];
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(loud, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0006, t + len);
      g.connect(bus);
      parts.forEach(function (p) {
        var o = ctx.createOscillator(), k = ctx.createGain();
        o.type = p[2]; o.frequency.value = freq * p[0]; k.gain.value = p[1];
        o.connect(k); k.connect(g); o.start(t); o.stop(t + len + 0.05);
      });
    }
    function drone(freq, t) {
      var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = freq;
      f.type = "lowpass"; f.frequency.value = 720; f.Q.value = 1.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0005, t + 3.4);
      o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.5);
    }
    function bellAt(t, base, loud) {
      [[1, 1, 2.6], [2.0, 0.5, 1.8], [2.76, 0.35, 1.3], [5.4, 0.18, 0.7], [8.9, 0.08, 0.4]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = base * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(loud * p[1], t + 0.004); g.gain.exponentialRampToValueAtTime(0.0004, t + p[2]);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + p[2] + 0.05);
      });
    }
    /* If the browser will not play the recording, the bells still ring. */
    function playTrack() { var p; if (!track) { return; } try { p = track.play(); if (p && p.catch) { p.catch(function () {}); } } catch (e) { /* nothing to do */ } }
    function schedule() {
      var now = ctx.currentTime, until = now + 0.9, n;
      if (track) { return; }
      /* If the page was held up, carry on from now; do not play the missed notes in a rush. */
      if (tNote < now) { tNote = now + 0.05; }
      if (tDrone < now) { tDrone = now + 0.05; }
      while (tNote < until) { n = LINE[iNote % LINE.length]; if (n[0]) { pluck(SA * n[0], tNote, 0.15, 1.2 + n[1] * 0.5); } tNote += n[1] * BEAT; iNote++; }
      while (tDrone < until) { drone(SA / 2 * DRONE[iDrone % 4], tDrone); tDrone += 0.92; iDrone++; }
    }
    function start() {
      if (!ctx && !make()) { return false; }
      clearTimeout(sleep);
      if (ctx.state === "suspended") { ctx.resume(); }
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.9);
      tNote = ctx.currentTime + 1.4; tDrone = ctx.currentTime + 0.1; iNote = 0;
      playTrack();
      clearInterval(timer); timer = setInterval(schedule, 250); schedule();
      return true;
    }
    function stop() {
      on = false; clearInterval(timer);
      if (track) { track.pause(); }
      if (!ctx) { return; }
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      /* once it has faded, let the sound hardware go */
      clearTimeout(sleep); sleep = setTimeout(function () { if (!on && ctx.state === "running") { ctx.suspend(); } }, 600);
    }
    return {
      isOn: function () { return on; },
      /* a recording to play in place of the made-up music */
      use: function (src) { if (!src || !window.Audio) { return; } track = new window.Audio(src); track.loop = true; track.volume = 0.6; track.preload = "none"; },
      set: function (want) { if (want) { return start(); } stop(); return false; },
      /* when the tab is put away, and when it comes back */
      rest: function (hidden) {
        if (!ctx || !on) { return; }
        if (hidden) { clearInterval(timer); if (track) { track.pause(); } ctx.suspend(); return; }
        ctx.resume(); playTrack(); clearInterval(timer); timer = setInterval(schedule, 250);
      },
      bell: function () { if (on) { bellAt(ctx.currentTime + 0.02, 660, 0.2); } },
      /* one note of the seven for each of the seven pheras */
      step: function (n) { if (on) { pluck(SA * SAPTAK[n], ctx.currentTime + 0.02, 0.26, 2.4); } },
      flourish: function () { var t; if (!on) { return; } t = ctx.currentTime + 0.02; [0, 2, 4, 7].forEach(function (n, i) { pluck(SA * SAPTAK[n], t + i * 0.13, 0.2, 2.2); }); bellAt(t + 0.5, 880, 0.14); }
    };
  }());

  /* ---- petals: a short shower that fades before it gets in the way of reading -- */

  function Petals(canvas, still) {
    var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null, list = [], raf = 0, last = 0, w = 0, h = 0, dpr = 1;
    var COLOURS = ["#F0A30A", "#E2700A", "#F5B93A", "#C4172C", "#D9455C"];
    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2); w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000 || 0.016), i, p, s;
      last = now; raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      for (i = list.length - 1; i >= 0; i--) {
        p = list[i];
        p.t += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.t * p.wob + p.ph) * 34) * dt; p.rot += p.vr * dt;
        if (p.t > p.life || p.y > h + 30) { list.splice(i, 1); continue; }
        s = p.size;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.t * p.flip + p.ph)));
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) / 0.9));
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.7, s * 0.75, 0, s); ctx.bezierCurveTo(-s * 0.7, s * 0.75, -s * 0.95, -s * 0.55, 0, -s); ctx.fill();
        ctx.restore();
      }
      if (list.length) { raf = requestAnimationFrame(frame); } else { ctx.clearRect(0, 0, w, h); }
    }
    return {
      resize: function () { if (ctx) { size(); } },
      fall: function (count, seconds) {
        var i;
        if (still || !ctx) { return; }
        size();
        for (i = 0; i < count; i++) {
          list.push({ x: rand(-20, w + 20), y: rand(-h * 0.3, -12), vx: rand(-14, 14), vy: rand(150, 280), rot: rand(0, 6.28), vr: rand(-2.2, 2.2), size: rand(6, 11), col: COLOURS[Math.floor(Math.random() * COLOURS.length)], t: 0, life: rand(seconds * 0.7, seconds), wob: rand(1.2, 2.6), flip: rand(1.5, 3.5), ph: rand(0, 6.28) });
        }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }
    };
  }

  /* ---- the page ------------------------------------------------------------------ */

  function init() {
    var app = document.querySelector("[data-wedding]");
    if (!app) { return; }
    var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var gate = app.querySelector("[data-gate]"), veil = app.querySelector("[data-veil]");
    var screens = all(app, "[data-screen]"), byId = Object.create(null), current = null, busy = false, wanted = "", opened = false;
    var chrome = all(app, "[data-chrome]").concat([app.querySelector("main")]);
    var navLinks = all(app, ".nav [data-go]");
    var petals = Petals(app.querySelector("[data-petals]"), still);
    /* The names, and the seven vows as they are written out in the page. */
    var data = { bride: app.getAttribute("data-bride") || "", groom: app.getAttribute("data-groom") || "", steps: all(app, "[data-rite-all] li").map(function (li) {
      var d = li.querySelector("span"), r = li.querySelector("i");
      return { dev: d ? d.textContent : "", roman: r ? r.textContent : "", means: li.lastChild ? li.lastChild.textContent.replace(/\s+/g, " ").trim() : "" };
    }) };

    screens.forEach(function (s) { byId[s.id] = s; });
    if (/^assets\/[\w./-]+$/.test(app.getAttribute("data-music") || "")) { Sound.use(app.getAttribute("data-music")); }

    /* ---- moving between the parts ---- */

    var hooks = { enter: Object.create(null), leave: Object.create(null) };

    function swap(next, focus) {
      if (current) { if (hooks.leave[current.id]) { hooks.leave[current.id](); } current.hidden = true; current.classList.remove("is-on"); }
      next.hidden = false; next.scrollTop = 0; next.classList.add("is-on"); current = next;
      navLinks.forEach(function (a) { if (a.getAttribute("data-go") === next.id) { a.setAttribute("aria-current", "true"); } else { a.removeAttribute("aria-current"); } });
      try { history.replaceState(null, "", "#" + next.id); } catch (e) { /* a file opened from disk may refuse; no matter */ }
      if (hooks.enter[next.id]) { hooks.enter[next.id](); }
      if (focus) { focusOn(next.querySelector("[tabindex='-1']")); }
    }

    function show(id, from) {
      var next = byId[id], a, o;
      if (!next || !opened) { return; }
      /* A press during the wipe is not lost: it is taken up when the wipe ends. */
      if (busy) { wanted = id; return; }
      if (next === current) { return; }
      if (still || !veil) { swap(next, true); return; }
      busy = true;
      /* the wipe opens from the middle of whatever was pressed */
      a = veil.getBoundingClientRect(); o = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null;
      veil.style.setProperty("--x", (o ? o.left + o.width / 2 - a.left : a.width / 2) + "px");
      veil.style.setProperty("--y", (o ? o.top + o.height / 2 - a.top : a.height) + "px");
      veil.classList.remove("is-out"); veil.classList.add("is-in");
      setTimeout(function () {
        try { swap(next, true); } finally {
          veil.classList.add("is-out");
          setTimeout(function () {
            var then = wanted;
            veil.classList.remove("is-in"); veil.classList.remove("is-out"); busy = false; wanted = "";
            if (then) { show(then); }
          }, 420);
        }
      }, 500);
    }

    app.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("[data-go]") : null;
      if (a && app.contains(a)) { e.preventDefault(); show(a.getAttribute("data-go"), a); }
    });
    window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });

    /* ---- the door ---- */

    function setInert(v) { chrome.forEach(function (el) { if (!el) { return; } if (v) { el.setAttribute("inert", ""); } else { el.removeAttribute("inert"); } }); }

    function enterApp(id, focus) {
      opened = true; setInert(false); app.classList.add("is-in");
      screens.forEach(function (s) { s.hidden = true; s.classList.remove("is-on"); });
      current = null; swap(byId[id] || screens[0], focus);
    }

    function openDoor(music) {
      var door, inner, d, g;
      if (gate.classList.contains("is-open")) {
        /* the door was pushed first, then "with music" chosen while it swings */
        if (music && !Sound.isOn()) { setSound(true); }
        return;
      }
      if (music) { setSound(true); Sound.bell(); }
      door = gate.querySelector("[data-door]"); inner = gate.querySelector(".gate__in");
      if (door && inner) { d = door.getBoundingClientRect(); g = inner.getBoundingClientRect(); inner.style.transformOrigin = (d.left + d.width / 2 - g.left) + "px " + (d.top + d.height * 0.62 - g.top) + "px"; }
      gate.classList.add("is-open");
      petals.fall(22, 3.4);
      setTimeout(function () { gate.classList.add("is-through"); enterApp("invitation", false); }, still ? 0 : 1650);
      setTimeout(function () {
        var at = document.activeElement, lost = !at || at === document.body || gate.contains(at);
        gate.hidden = true;
        /* take the reader to the names, unless they have already moved on */
        if (lost && current) { focusOn(current.querySelector("[tabindex='-1']")); }
      }, still ? 30 : 2800);
    }

    all(gate, "[data-open]").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); openDoor(b.getAttribute("data-open") === "music"); }); });
    var doorEl = gate.querySelector("[data-door]");
    if (doorEl) { doorEl.addEventListener("click", function () { openDoor(false); }); }

    /* ---- music switch ---- */

    var soundBtn = app.querySelector("[data-sound]"), soundLabel = app.querySelector("[data-sound-label]");
    function setSound(want) {
      var is = Sound.set(want);
      if (soundBtn) { soundBtn.setAttribute("aria-pressed", is ? "true" : "false"); }
      if (soundLabel) { soundLabel.textContent = is ? "Music is on" : "Music is off"; }
    }
    if (soundBtn) { soundBtn.addEventListener("click", function () { setSound(!Sound.isOn()); }); }

    /* ---- countdown ---- */

    (function () {
      var target = Date.parse(app.getAttribute("data-date")), box = app.querySelector("[data-count]"), cells, was = {};
      if (!box || isNaN(target)) { return; }
      cells = { days: box.querySelector("[data-count-days]"), hours: box.querySelector("[data-count-hours]"), mins: box.querySelector("[data-count-mins]"), secs: box.querySelector("[data-count-secs]") };
      function put(k, v, pulse) {
        var el = cells[k], s = k === "days" ? String(v) : (v < 10 ? "0" + v : String(v));
        if (!el || was[k] === s) { return; }
        el.textContent = s;
        if (pulse && was[k] !== undefined && !still) { el.classList.remove("is-tick"); void el.offsetWidth; el.classList.add("is-tick"); }
        was[k] = s;
      }
      function tick() {
        var left = target - Date.now(), s;
        if (left <= 0) {
          box.querySelector("[data-count-row]").hidden = true; box.querySelector("[data-count-label]").hidden = true; box.querySelector("[data-count-done]").hidden = false;
          return;
        }
        s = Math.floor(left / 1000);
        put("days", Math.floor(s / 86400), true); put("hours", Math.floor(s % 86400 / 3600), true); put("mins", Math.floor(s % 3600 / 60), true); put("secs", s % 60, false);
        setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
      }
      tick();
    }());

    /* ---- the rite at the mandap ----
       state: 0 before the garlands, 0.5 garlands done and the knot still to
       tie (only where nothing moves, so each has its own press), 1 knot
       tied, 2..8 that many pheras less one taken, 9 finished. */

    (function () {
      var stage = app.querySelector("[data-stage]"), canvas = app.querySelector("[data-canvas]"), turn = app.querySelector("[data-turn]");
      var card = app.querySelector("[data-rite-card]"), go = app.querySelector("[data-rite-go]"), label = app.querySelector("[data-rite-label]");
      var again = app.querySelector("[data-rite-again]"), onward = app.querySelector("[data-rite-next]");
      var lamps = all(app, ".rite__lamps li");
      var el = { step: app.querySelector("[data-rite-step]"), dev: app.querySelector("[data-rite-dev]"), roman: app.querySelector("[data-rite-roman]"), text: app.querySelector("[data-rite-text]") };
      var scene = null, tried = false, state = 0, waiting = 0, held = false, B = data.bride, G = data.groom, first;
      if (!stage || !card || !go) { return; }
      first = { step: el.step.textContent, text: el.text.textContent, label: label.textContent };

      function write(step, text, vow) {
        el.step.textContent = step; el.text.textContent = text;
        el.dev.hidden = !vow; el.roman.hidden = !vow;
        el.dev.textContent = vow ? vow.dev : ""; el.roman.textContent = vow ? vow.roman : "";
        if (!still) { card.classList.remove("is-new"); void card.offsetWidth; card.classList.add("is-new"); }
      }
      /* The button waits while the picture moves. It is not switched off the
         hard way, because that would throw keyboard focus off it. */
      function hold(ms, then) {
        clearTimeout(waiting);
        if (!ms) { held = false; go.removeAttribute("aria-disabled"); if (then) { then(); } return; }
        held = true; go.setAttribute("aria-disabled", "true");
        waiting = setTimeout(function () { held = false; go.removeAttribute("aria-disabled"); if (then) { then(); } }, ms);
      }
      function live(on) { stage.classList.toggle("is-live", on); if (turn) { turn.hidden = !on; } }
      function make() {
        if (tried) { return; }
        tried = true;
        if (!window.WeddingScene || !canvas) { return; }
        scene = window.WeddingScene.create(canvas, {
          still: still,
          onReady: function () { live(true); },
          onLost: function () { live(false); },
          onFail: function () { live(false); scene = null; }
        });
        if (scene && current && current.id === "couple") { scene.start(); }
      }
      function knot() {
        write("Gathbandhan", "Later, at the muhurat, " + B + "’s parents give her hand to " + G + " and the knot is tied between them. Now the seven pheras, keeping the fire on their right.");
        label.textContent = "Take the first phera"; state = 1;
      }

      go.addEventListener("click", function () {
        var n, vow, ms;
        if (held) { return; }
        if (state === 0) {
          Sound.bell();
          write("Varmala", B + " garlands " + G + " first, and he bows to take it. Then it is his turn.");
          ms = scene ? scene.varmala() : 0;
          if (ms) { state = 0.5; hold(ms, knot); } else { state = 0.5; label.textContent = "Tie the knot"; }
        } else if (state === 0.5) {
          knot();
        } else if (state <= 7) {
          n = state; state += 1; vow = data.steps[n - 1] || null;
          Sound.step(n - 1);
          if (lamps[n - 1]) { lamps[n - 1].classList.add("is-lit"); }
          write("Phera " + n + " of 7", vow ? vow.means : "", vow);
          label.textContent = n < 7 ? "Take phera " + (n + 1) : "Ask for blessings";
          hold(scene ? scene.step() : 0);
        } else if (state === 8) {
          state = 9; Sound.flourish(); petals.fall(46, 4.2);
          write("Saptapadi", "Seven pheras taken. In the old words, they are now friends for life. " + B + " takes her place on " + G + "’s left, and they turn to you for your blessings.");
          n = document.activeElement === go;
          go.hidden = true; again.hidden = false; onward.hidden = false;
          if (n) { focusOn(onward); }
          if (scene) { scene.finish(); }
        }
      });
      again.addEventListener("click", function () {
        state = 0; hold(0);
        lamps.forEach(function (l) { l.classList.remove("is-lit"); });
        write(first.step, first.text); label.textContent = first.label;
        go.hidden = false; again.hidden = true; onward.hidden = true;
        if (scene) { scene.reset(); }
        focusOn(go);
      });

      /* looking around: drag, or the two buttons */
      if (canvas) {
        var down = false, lx = 0, ly = 0, vx = 0, lt = 0;
        canvas.addEventListener("pointerdown", function (e) { if (!scene) { return; } down = true; lx = e.clientX; ly = e.clientY; vx = 0; lt = e.timeStamp; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } });
        canvas.addEventListener("pointermove", function (e) {
          var dx, dt;
          if (!down || !scene) { return; }
          dx = e.clientX - lx; dt = Math.max(1, e.timeStamp - lt);
          scene.drag(dx, e.clientY - ly); vx = vx * 0.6 + (dx / dt * 1000) * 0.4; lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) { canvas.addEventListener(name, function () { if (down && scene) { scene.release(still ? 0 : vx); } down = false; }); });
      }
      all(app, "[data-turn-by]").forEach(function (b) { b.addEventListener("click", function () { if (scene) { scene.turn(Number(b.getAttribute("data-turn-by"))); } }); });

      hooks.enter.couple = function () { make(); if (scene) { scene.start(); } };
      hooks.leave.couple = function () { if (scene) { scene.stop(); } };
      /* put the mandap up while the guest is reading the invitation */
      hooks.enter.invitation = function () { if (!tried) { setTimeout(make, 2600); } };
      document.addEventListener("visibilitychange", function () {
        Sound.rest(document.hidden);
        if (!scene || !current || current.id !== "couple") { return; }
        if (document.hidden) { scene.stop(); } else { scene.start(); }
      });
      window.addEventListener("resize", function () { petals.resize(); if (scene) { scene.redraw(); } });
    }());

    /* ---- the ceremonies ----
       On a phone and a tablet they sit in a row that slides sideways. On a wide
       screen all of them are laid out at once and nothing slides. */

    (function () {
      var screen = byId.celebrations, reel = app.querySelector("[data-reel]"), cards = all(app, "[data-rasm]"), nav = app.querySelector("[data-reel-nav]");
      var nowLabel = app.querySelector("[data-reel-now]"), days = all(app, "[data-days] [data-day]"), by = all(app, "[data-reel-by]"), now = -1, aim = 0, flying = 0, queued = false, tone = "";
      if (!reel || !cards.length) { return; }
      function slides() { return reel.scrollWidth > reel.clientWidth + 2; }
      function mark(i) {
        var name;
        if (i === now) { return; }
        now = i;
        cards.forEach(function (c, k) { c.classList.toggle("is-now", k === i); });
        tone = cards[i].getAttribute("data-tone"); if (current === screen) { app.setAttribute("data-tone", tone); }
        name = cards[i].querySelector(".rasm__name"); if (nowLabel && name) { nowLabel.textContent = name.lastChild ? name.lastChild.textContent : ""; }
        days.forEach(function (d) { d.setAttribute("aria-pressed", d.getAttribute("data-day") === cards[i].getAttribute("data-day") ? "true" : "false"); });
        by.forEach(function (b) { var to = i + Number(b.getAttribute("data-reel-by")); b.disabled = to < 0 || to >= cards.length; });
      }
      function nearest() {
        var r = reel.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, gap = Infinity;
        cards.forEach(function (c, k) { var b = c.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - mid); if (d < gap) { gap = d; best = k; } });
        return best;
      }
      function goTo(i) {
        var c, r, b;
        aim = i = Math.max(0, Math.min(cards.length - 1, i)); c = cards[i];
        if (!slides()) { mark(i); if (c.scrollIntoView) { c.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" }); } return; }
        r = reel.getBoundingClientRect(); b = c.getBoundingClientRect();
        /* while the row is sliding to where it was sent, the cards it passes do not count as chosen */
        flying = still ? 0 : Date.now() + 900;
        reel.scrollTo({ left: reel.scrollLeft + (b.left - r.left) - (r.width - b.width) / 2, behavior: still ? "auto" : "smooth" });
        if (still) { mark(i); }
      }
      reel.addEventListener("scroll", function () {
        if (queued) { return; }
        queued = true;
        requestAnimationFrame(function () { var k; queued = false; if (!slides()) { return; } k = nearest(); mark(k); if (k === aim || Date.now() > flying) { aim = k; flying = 0; } });
      }, { passive: true });
      reel.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(aim + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(aim - 1); }
      });
      by.forEach(function (b) { b.addEventListener("click", function () { goTo(aim + Number(b.getAttribute("data-reel-by"))); }); });
      days.forEach(function (d) { d.addEventListener("click", function () { var k; for (k = 0; k < cards.length; k++) { if (cards[k].getAttribute("data-day") === d.getAttribute("data-day")) { goTo(k); break; } } }); });
      cards.forEach(function (c, k) { c.addEventListener("click", function () { if (k !== now) { goTo(k); } }); });
      if (nav) { nav.hidden = false; }
      mark(0);
      hooks.enter.celebrations = function () { reel.scrollLeft = 0; now = -1; aim = 0; flying = 0; mark(0); app.setAttribute("data-tone", tone); };
      hooks.leave.celebrations = function () { app.removeAttribute("data-tone"); };
    }());

    /* ---- the reply: a preview only ---- */

    (function () {
      var form = app.querySelector("[data-rsvp]"), out, guests, more, count = 2;
      if (!form) { return; }
      out = form.querySelector("[data-rsvp-out]"); guests = form.querySelector("[data-guests]"); more = all(form, "[data-rsvp-more]");
      function coming() { var r = form.querySelector("input[name='reply']:checked"); return !r || r.value === "yes"; }
      function setCount(n) { count = Math.max(1, Math.min(8, n)); guests.textContent = String(count); }
      form.querySelector("[data-less]").addEventListener("click", function () { setCount(count - 1); });
      form.querySelector("[data-more]").addEventListener("click", function () { setCount(count + 1); });
      all(form, "input[name='reply']").forEach(function (r) { r.addEventListener("change", function () { more.forEach(function (m) { m.hidden = !coming(); }); out.textContent = ""; }); });
      form.addEventListener("submit", function (e) {
        var name = form.querySelector("input[name='guest']").value.replace(/\s+/g, " ").trim().slice(0, 60);
        var picked = all(form, "input[name='events']:checked").map(function (c) { return c.value; }), list;
        e.preventDefault();
        if (!coming()) { out.textContent = (name ? name + ", you" : "You") + " will be missed. Thank you for letting us know."; return; }
        if (!picked.length) { out.textContent = "Choose at least one ceremony to join us for."; return; }
        list = picked.length === 1 ? picked[0] : (picked.length === 2 ? picked.join(" and ") : picked.slice(0, -1).join(", ") + ", and " + picked[picked.length - 1]);
        out.textContent = "Thank you" + (name ? ", " + name : "") + ". " + (count === 1 ? "One guest" : count + " guests") + " for " + list + ". We will be looking out for you.";
      });
      var shower = app.querySelector("[data-shower]"), showerOut = app.querySelector("[data-shower-out]");
      if (shower) {
        shower.addEventListener("click", function () {
          petals.fall(70, 4.5); Sound.flourish();
          if (showerOut) { showerOut.textContent = "Your blessings are with " + data.bride + " and " + data.groom + "."; }
        });
      }
    }());

    /* ---- start: at the door, or straight in when the address names a part ---- */

    setInert(true);
    if (byId[location.hash.slice(1)]) { gate.hidden = true; enterApp(location.hash.slice(1), false); }
  }

  ready(function () {
    try { init(); } catch (e) { root.className = root.className.replace(/(^|\s)js(?=\s|$)/, ""); }
  });
}());
