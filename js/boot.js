/* Runs first, in the head, before anything is drawn.
   It sets the theme, tells CSS that scripts are on and whether motion is
   welcome, and decides whether the opening loader should play.
   It is a separate file so the pages need no inline script. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");
  if (!reduce) { root.classList.add("motion"); }

  /* The site opens dark. A visitor's own choice is remembered on their device. */
  var theme = "dark";
  try {
    var saved = window.localStorage.getItem("pa-theme");
    if (saved === "light" || saved === "dark") { theme = saved; }
  } catch (e) { /* storage blocked: stay dark */ }
  root.setAttribute("data-theme", theme);

  /* The loading screen shows one line. On a first visit it is the hello;
     after that, a different line each day of the week (0 is Sunday). The
     page says which mode to use in data-hello; the stylesheet shows the
     line whose name matches data-day. */
  var day = String(new Date().getDay());
  var hello = root.getAttribute("data-hello");
  var met = false;
  try { met = window.localStorage.getItem("pa-hello") === "1"; } catch (e) { met = false; }
  if (hello === "always" || (hello === "first" && !met)) { day = "hello"; }
  root.setAttribute("data-day", day);

  /* Which currency the rate card shows. A visitor's own choice wins.
     Otherwise rupees for a device set to Indian time, dollars elsewhere. */
  var currency = "";
  try { currency = window.localStorage.getItem("pa-currency") || ""; } catch (e) { currency = ""; }
  if (!/^[A-Z]{3}$/.test(currency)) {
    var zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { zone = ""; }
    currency = /^Asia\/(Kolkata|Calcutta)$/.test(zone) ? "INR" : "USD";
  }
  root.setAttribute("data-currency", currency);

  /* The loader plays once per visit, and never for people who asked for less motion. */
  var seen = false;
  try { seen = window.sessionStorage.getItem("pa-intro") === "1"; } catch (e) { seen = false; }
  if (seen || reduce) { root.classList.add("no-loader"); }

  /* Safety net. The "motion" class keeps text hidden until js/main.js reveals
     it. If that script never arrives or stops with an error, give the page
     back as plain, fully visible content instead of leaving it blank. */
  function rescue() {
    if (root.classList.contains("is-live")) { return; }
    root.classList.remove("motion");
    root.classList.add("no-loader");
  }
  window.addEventListener("error", function (ev) {
    var from = ev.target && ev.target.tagName === "SCRIPT" ? ev.target.src : ev.filename;
    if (/\/js\/(main|config|field)\.js/.test(String(from || ""))) { rescue(); }
  }, true);
  window.setTimeout(rescue, 5000);
})();
