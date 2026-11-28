/* Eased wheel scrolling, using Lenis (MIT licence, darkroom.engineering).
   Only for a mouse or trackpad: touch screens keep their own scrolling.
   Keyboard, find-in-page and the scroll bar work as usual, and nothing
   changes for visitors who ask for less motion. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  if (typeof window.Lenis !== "function" || !root.classList.contains("motion")) { return; }
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }

  var lenis = new window.Lenis({
    lerp: 0.11,
    smoothWheel: true,
    autoRaf: true,
    anchors: false,
    stopInertiaOnNavigate: true,
    prevent: function (node) { return !!(node && node.closest && node.closest(".menu, textarea, [data-lenis-prevent]")); }
  });
  window.ArthouseScroll = lenis;

  /* The loader and the open menu lock the page, and so does the easing. */
  var sync = function () { if (doc.body.classList.contains("is-locked")) { lenis.stop(); } else { lenis.start(); } };
  new MutationObserver(sync).observe(doc.body, { attributes: true, attributeFilter: ["class"] });
  sync();

  /* Links to a place on this page glide there instead of jumping. */
  doc.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) { return; }
    var a = ev.target instanceof Element ? ev.target.closest("a[href*='#']") : null;
    if (!a || a.classList.contains("skip") || a.target) { return; }
    var url;
    try { url = new URL(a.href, window.location.href); } catch (e) { return; }
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.hash.length < 2) { return; }
    var target = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) { return; }
    ev.preventDefault();
    setTimeout(function () {
      lenis.start();
      lenis.scrollTo(target, { duration: 1.2 });
      if (window.history && window.history.pushState) { window.history.pushState(null, "", url.hash); }
    }, 0);
  });
})();
