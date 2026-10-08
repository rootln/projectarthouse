/*
  The moving material behind the hero and the closing section.
  One WebGL fragment shader, two looks:

    silk    slow folds of black satin (hero, and the service images)
    ribbon  a single band of the same material (closing section)

  ArthouseField.mount(canvas, { look, theme, seed, zoom, angle, tint, gain, fade, top, scale, still, time })
  returns { redraw, setTheme, destroy }, or null when WebGL is not available. In that
  case the still image set as the CSS background behind the canvas stays visible.
*/
(function () {
  "use strict";

  var LOOKS = { silk: 0, ribbon: 1 };

  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  var FRAG = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;",
    "uniform vec2 uRes; uniform float uTime; uniform vec2 uPointer;",
    "uniform float uLook; uniform float uSeed; uniform float uShift;",
    "uniform float uZoom; uniform float uAngle; uniform float uTint; uniform float uGain; uniform float uFade; uniform float uTop;",
    "uniform float uLight; uniform vec3 uBg;",

    "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
    "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }",
    "float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; } return s; }",

    /* Height of the cloth at a point. Long diagonal folds, bent by slow noise. */
    "float cloth(vec2 p, float t){",
    "  p = mat2(0.82, -0.57, 0.57, 0.82) * p;",
    "  p.y *= 0.42;",
    "  vec2 q = p;",
    "  q += 0.30 * vec2(sin(p.y * 2.1 + t * 0.17 + uSeed), cos(p.x * 0.9 - t * 0.13 + uSeed * 1.7));",
    "  q += 0.85 * (vec2(fbm(p * 0.9 + t * 0.04 + uSeed), fbm(p * 0.9 + 7.3 - t * 0.035 + uSeed)) - 0.5);",
    "  float h = sin(q.x * 2.4 + q.y * 0.9 + t * 0.20);",
    "  h += 0.55 * sin(q.x * 4.7 - q.y * 1.9 - t * 0.15 + 1.7);",
    "  h += 0.28 * sin(q.x * 8.9 + q.y * 1.1 + t * 0.10 + 4.1);",
    "  h += 0.12 * sin(q.x * 15.3 - q.y * 2.3 - t * 0.08 + 0.6);",
    "  return h;",
    "}",

    /* Satin shading: the surface normal looks up a striped sky, which gives the
       long bright seams that polished cloth and chrome have. */
    "vec3 satin(vec2 p, float t){",
    "  float e = 0.006;",
    "  float h = cloth(p, t);",
    "  vec2 g = vec2(cloth(p + vec2(e, 0.0), t) - h, cloth(p + vec2(0.0, e), t) - h) / e;",
    "  vec3 n = normalize(vec3(-g * 0.34, 1.0));",
    "  float a = n.x * 0.83 + n.y * 0.56 + uPointer.x * 0.05;",
    "  float sky = 0.5 + 0.5 * sin(a * 6.2 + 0.9);",
    "  float seam = pow(sky, 9.0);",
    "  float sheen = pow(0.5 + 0.5 * sin(a * 2.9 - 1.2 + uPointer.y * 0.2), 3.0);",
    "  float depth = 0.5 + 0.5 * h / 1.95;",
    "  float edge = pow(1.0 - n.z, 1.6);",
    "  vec3 warm = vec3(0.94, 0.91, 0.86);",
    "  vec3 cool = vec3(0.58, 0.63, 0.74);",
    "  vec3 col = warm * (0.012 + 0.11 * sheen * depth);",
    "  col += warm * seam * (0.35 + 0.65 * depth) * 0.9;",
    "  col += cool * edge * 0.16;",
    "  return col;",
    "}",

    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float asp = uRes.x / uRes.y;",
    "  vec2 p = (uv - 0.5) * vec2(asp, 1.0);",
    "  float t = uTime;",
    "  vec3 col = vec3(0.0);",

    "  if (uLook < 0.5) {",
    "    float ca = cos(uAngle), sa = sin(uAngle);",
    "    vec2 q = mat2(ca, -sa, sa, ca) * p * uZoom + vec2(0.0, uShift * 0.35) + uPointer * 0.04;",
    "    col = satin(q, t);",
    "    float top = smoothstep(0.98, 0.35, uv.y);",
    "    float bottom = smoothstep(0.0, 0.42, uv.y);",
    "    float side = smoothstep(1.05, 0.25, abs(uv.x - 0.5) * 2.0);",
    "    float fade = mix(0.35, 1.0, top) * bottom * mix(0.55, 1.0, side);",
    "    float calm = mix(0.30, 1.0, smoothstep(0.10, 0.66, length((uv - vec2(0.5, 0.53)) * vec2(1.0, 1.45))));",
    "    col *= mix(1.0, fade * calm, uFade);",
    "    col *= mix(1.0, mix(0.22, 1.0, smoothstep(1.0, 0.70, uv.y)), uTop);",
    "  } else {",
    "    float x = p.x;",
    "    float mid = 0.16 * sin(x * 1.7 + t * 0.20 + uSeed) + 0.07 * sin(x * 3.9 - t * 0.14);",
    "    float half_ = 0.19 + 0.07 * sin(x * 2.3 + t * 0.17 + 1.3);",
    "    float d = abs(p.y - mid) / half_;",
    "    float band = 1.0 - smoothstep(0.82, 1.0, d);",
    "    vec2 q = vec2(x * 1.3, (p.y - mid) / half_ * 0.9) + vec2(t * 0.03, 0.0);",
    "    col = satin(q * 1.4, t) * 1.25;",
    "    col *= band * (1.0 - 0.55 * d * d);",
    "    col *= smoothstep(1.02, 0.55, abs(uv.x - 0.5) * 2.0) * 0.9 + 0.1;",
    "  }",

    "  float lum = dot(col, vec3(0.3, 0.6, 0.1));",
    "  col = mix(col, lum * vec3(0.70, 0.78, 0.95) * 1.12, uTint);",
    "  col *= uGain;",
    "  col = col / (0.78 + 0.34 * col);",
    "  float grain = hash(gl_FragCoord.xy + fract(t) * 91.7) - 0.5;",
    /* Dark theme: light seams on the page colour. Light theme: the same folds
       drawn as soft shading on paper. */
    "  vec3 dark = pow(max(col + grain * 0.022, 0.0), vec3(0.92)) + uBg;",
    "  float fold = clamp(dot(col, vec3(0.3, 0.6, 0.1)) * 1.35, 0.0, 1.0);",
    "  vec3 lite = uBg * (1.0 - 0.36 * fold) + grain * 0.012;",
    "  gl_FragColor = vec4(mix(dark, lite, uLight), 1.0);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log);
    }
    return s;
  }

  function mount(canvas, opts) {
    opts = opts || {};
    var gl;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: !!opts.still, powerPreference: "low-power" });
    } catch (e) { gl = null; }
    if (!gl || !gl.getExtension("OES_standard_derivatives")) { return null; }

    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(prog)); }
    } catch (e) {
      if (window.console) { console.warn("Field shader did not compile.", e.message); }
      return null;
    }

    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ["uRes", "uTime", "uPointer", "uLook", "uSeed", "uShift", "uZoom", "uAngle", "uTint", "uGain", "uFade", "uTop", "uLight", "uBg"].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform1f(U.uLook, LOOKS[opts.look] || 0);
    gl.uniform1f(U.uSeed, opts.seed || 0);
    gl.uniform1f(U.uZoom, opts.zoom || 1.55);
    gl.uniform1f(U.uAngle, opts.angle || 0);
    gl.uniform1f(U.uTint, opts.tint || 0);
    gl.uniform1f(U.uGain, opts.gain || 1);
    gl.uniform1f(U.uFade, opts.fade === undefined ? 1 : opts.fade);
    gl.uniform1f(U.uTop, opts.top || 0);

    function paint(theme) {
      var light = theme === "light";
      gl.uniform1f(U.uLight, light ? 1 : 0);
      if (light) { gl.uniform3f(U.uBg, 239 / 255, 235 / 255, 227 / 255); }
      else { gl.uniform3f(U.uBg, 12 / 255, 13 / 255, 16 / 255); }
    }
    paint(opts.theme);

    var scale = opts.scale || 0.6;
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var running = false, visible = true, raf = 0, last = 0, clock = opts.time || 0, dead = false;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(2, Math.round(r.width * scale));
      var h = Math.max(2, Math.round(r.height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
    }

    function draw() {
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      gl.uniform1f(U.uTime, clock);
      gl.uniform2f(U.uPointer, pointer.x, pointer.y);
      gl.uniform1f(U.uShift, opts.shift ? opts.shift() : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      if (!running) { return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt * (opts.speed || 1);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function setRunning(on) {
      if (dead || opts.still) { return; }
      if (on && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
      if (!on && running) { running = false; cancelAnimationFrame(raf); }
    }

    function onMove(ev) {
      pointer.tx = (ev.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = 1 - (ev.clientY / window.innerHeight) * 2;
    }

    function onResize() { resize(); if (!running) { draw(); } }

    resize();
    draw();
    canvas.setAttribute("data-live", "true");

    var io = null;
    if (!opts.still) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", function () { setRunning(visible && !document.hidden); });
      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          setRunning(visible && !document.hidden);
        });
        io.observe(canvas);
      } else {
        setRunning(true);
      }
    }

    return {
      redraw: function () { resize(); draw(); },
      setTheme: function (theme) { paint(theme); if (!running) { draw(); } },
      destroy: function () {
        dead = true;
        running = false;
        cancelAnimationFrame(raf);
        if (io) { io.disconnect(); }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
      }
    };
  }

  window.ArthouseField = { mount: mount };
})();
