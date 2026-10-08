/*
  Script for the two sample occasion websites.
  It moves between scenes, throws confetti on the birthday finale and shows a
  preview of an RSVP. Nothing typed here is sent or stored anywhere.
*/
(function () {
  "use strict";

  var doc = document;
  var motion = doc.documentElement.classList.contains("motion");
  var scenes = Array.prototype.slice.call(doc.querySelectorAll("[data-scene]"));
  var counter = doc.querySelector("[data-scene-no]");
  var at = 0;

  Array.prototype.forEach.call(doc.querySelectorAll(".skel > img"), function (img) {
    function done() { img.parentElement.classList.add("is-loaded"); }
    function broken() { img.parentElement.classList.add("is-broken"); done(); }
    img.addEventListener("load", done);
    img.addEventListener("error", broken);
    if (img.complete) { if (img.getAttribute("src") && !img.naturalWidth) { broken(); } else { done(); } }
  });

  var backBtn = doc.querySelector("[data-prev]");
  var turning = false;

  function show(next) {
    next = Math.max(0, Math.min(scenes.length - 1, next));
    /* One change at a time: a held key cannot stack several scenes. */
    if (next === at || turning) { return; }
    turning = true;
    var old = scenes[at];
    var fresh = scenes[next];
    scenes.forEach(function (scene) { if (scene !== old) { scene.classList.remove("is-on"); scene.hidden = scene !== fresh; } });
    old.classList.remove("is-on");
    fresh.hidden = false;
    at = next;
    if (counter) { counter.textContent = (at + 1 < 10 ? "0" : "") + (at + 1); }
    if (backBtn) { backBtn.hidden = at === 0; }
    setTimeout(function () { if (scenes[at] !== old) { old.hidden = true; } turning = false; }, motion ? 500 : 0);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (scenes[at] !== fresh) { return; }
        fresh.classList.add("is-on");
        var heading = fresh.querySelector("h1, h2, .scene__kicker");
        if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
        var canvas = fresh.querySelector("[data-confetti]");
        if (canvas && motion) { confetti(canvas); }
      });
    });
  }

  doc.addEventListener("click", function (ev) {
    var target = ev.target instanceof Element ? ev.target : null;
    if (!target) { return; }
    if (target.closest("[data-next]")) { show(at + 1); }
    if (target.closest("[data-prev]")) { show(at - 1); }
    if (target.closest("[data-restart]")) { show(0); }
  });

  doc.addEventListener("keydown", function (ev) {
    var typing = ev.target instanceof Element && ev.target.closest("input, textarea");
    if (typing) { return; }
    if (ev.key === "ArrowRight") { show(at + 1); }
    if (ev.key === "ArrowLeft") { show(at - 1); }
  });

  /* RSVP preview. The reply is shown back to the visitor and goes nowhere. */
  var rsvp = doc.querySelector("[data-rsvp]");
  if (rsvp) {
    var out = rsvp.querySelector(".rsvp__out");
    rsvp.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = String(rsvp.elements.guest.value || "").replace(/\s+/g, " ").trim().slice(0, 60);
      var yes = rsvp.elements.reply.value === "yes";
      if (!name) { out.textContent = "Add your name to see your reply."; rsvp.elements.guest.focus(); return; }
      out.textContent = yes
        ? name + " joyfully accepts. See you on the 12th."
        : name + " sends love and regrets. You will be missed.";
    });
  }

  /* Confetti: small paper pieces fall once, then the canvas clears. */
  function confetti(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    var w = canvas.width = canvas.offsetWidth;
    var h = canvas.height = canvas.offsetHeight;
    var colours = ["#F2A65A", "#F0EDE7", "#C97B3A", "#9B978F"];
    var pieces = [];
    for (var i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.6,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2 + Math.random() * 3.4,
        size: 5 + Math.random() * 8,
        spin: Math.random() * 6.28,
        turn: (Math.random() - 0.5) * 0.3,
        colour: colours[i % colours.length]
      });
    }
    var began = performance.now();
    function frame(now) {
      var age = now - began;
      ctx.clearRect(0, 0, w, h);
      if (age > 5200 || !canvas.closest(".scene").classList.contains("is-on")) { return; }
      pieces.forEach(function (p) {
        p.x += p.vx + Math.sin((age + p.y) / 260) * 0.6;
        p.y += p.vy;
        p.spin += p.turn;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.globalAlpha = Math.max(0, 1 - age / 5200);
        ctx.fillStyle = p.colour;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
