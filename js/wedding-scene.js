/*
  The mandap scene on the wedding sample: a bride and groom, turned like
  lacquered wooden dolls, under a canopy with the sacred fire between them.

  Drawn with WebGL and nothing else. No library, no model files: every shape
  is built here from a few numbers, the way a lathe turns a doll from a
  profile. js/wedding.js drives it:

      var scene = WeddingScene.create(canvas, { still: reducedMotion, onReady, onLost, onFail });
      scene.start();            draw, and keep drawing
      scene.stop();             stop drawing (the screen is not showing)
      scene.varmala();          the garlands, then the knot. Returns milliseconds.
      scene.step();             one phera, once round the fire. Returns ms.
      scene.finish();           she takes her place on his left; both face the guests
      scene.reset();            back to the first pose
      scene.turn(1 or -1);      turn the view (the two buttons)
      scene.drag(dx, dy), scene.release(speed);   turn it with a finger or mouse

  create() returns null when the browser has no WebGL; the page then keeps
  the still picture that sits under the canvas. The shapes are built a part
  at a time after create() returns; onReady is called once the first frame
  has been drawn, onLost if the browser takes the picture away (it is rebuilt
  when the browser gives it back), onFail if it cannot be built at all.
*/
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* ---- maths: 4x4 matrices in columns, quaternions as [x, y, z, w] ------- */

  function mat() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(a, b) {
    var o = new Float32Array(16), c, r;
    for (c = 0; c < 4; c++) { for (r = 0; r < 4; r++) { o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; } }
    return o;
  }
  function mulAll() { var m = arguments[0], i; for (i = 1; i < arguments.length; i++) { m = mul(m, arguments[i]); } return m; }
  function translate(x, y, z) { var m = mat(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function scale(x, y, z) { var m = mat(); m[0] = x; m[5] = y === undefined ? x : y; m[10] = z === undefined ? x : z; return m; }
  function rotX(a) { var m = mat(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function rotY(a) { var m = mat(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function rotZ(a) { var m = mat(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = 2 * far * near / (near - far);
    return m;
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function lookAt(eye, target) {
    var z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x), m = mat();
    m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[8] = x[2]; m[9] = y[2]; m[10] = z[2];
    m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye);
    return m;
  }
  function point(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  /* What a matrix does to a surface direction, also right when it stretches. */
  function normalMat(m) {
    var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    var o = [e * i - f * h, f * g - d * i, d * h - e * g, c * h - b * i, a * i - c * g, b * g - a * h, b * f - c * e, c * d - a * f, a * e - b * d];
    var det = a * o[0] + b * o[1] + c * o[2];
    if (det < 0) { for (var k = 0; k < 9; k++) { o[k] = -o[k]; } }
    return o;
  }
  /* Turns the y axis to point along d. */
  function alongY(d) {
    var y = norm(d), ref = Math.abs(y[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], x = norm(cross(ref, y)), z = cross(x, y), m = mat();
    m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2];
    return m;
  }
  function qAxis(x, y, z, a) { var s = Math.sin(a / 2); return [x * s, y * s, z * s, Math.cos(a / 2)]; }
  function qMul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  function qSlerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1, k0, k1, th;
    if (d < 0) { d = -d; s = -1; }
    if (d > 0.9995) { k0 = 1 - t; k1 = t; } else { th = Math.acos(d); k0 = Math.sin((1 - t) * th) / Math.sin(th); k1 = Math.sin(t * th) / Math.sin(th); }
    return [k0 * a[0] + s * k1 * b[0], k0 * a[1] + s * k1 * b[1], k0 * a[2] + s * k1 * b[2], k0 * a[3] + s * k1 * b[3]];
  }
  function trs(p, q, s) {
    var x = q[0], y = q[1], z = q[2], w = q[3], m = mat();
    m[0] = (1 - 2 * (y * y + z * z)) * s; m[1] = 2 * (x * y + z * w) * s; m[2] = 2 * (x * z - y * w) * s;
    m[4] = 2 * (x * y - z * w) * s; m[5] = (1 - 2 * (x * x + z * z)) * s; m[6] = 2 * (y * z + x * w) * s;
    m[8] = 2 * (x * z + y * w) * s; m[9] = 2 * (y * z - x * w) * s; m[10] = (1 - 2 * (x * x + y * y)) * s;
    m[12] = p[0]; m[13] = p[1]; m[14] = p[2];
    return m;
  }

  /* Colours are written as they look on screen and worked with as light. */
  function hex(h) {
    var n = parseInt(h.slice(1), 16), f = function (v) { return Math.pow(v / 255, 2.2); };
    return [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)];
  }
  var C = {
    red: hex("#B8141D"), deep: hex("#86101A"), maroon: hex("#5C0B15"), rani: hex("#B4124F"),
    gold: hex("#E2B347"), goldPale: hex("#F3D98C"), ivory: hex("#F6EBD2"), cream: hex("#E8D5AA"),
    skinB: hex("#DDA57A"), skinG: hex("#CB9468"), hair: hex("#1C1210"), ink: hex("#22130F"), white: hex("#FFF8EC"),
    marigold: hex("#F5A20C"), saffron: hex("#E9740B"), rose: hex("#C4172C"), leaf: hex("#3E6B2B"), leafDark: hex("#2C5220"),
    marble: hex("#F1E6D0"), stone: hex("#D9C4A0"), brick: hex("#A4502C"), soot: hex("#2A1512"), pearl: hex("#FBF3E4"),
    emerald: hex("#0E6B4E"), brass: hex("#C99A3A"), coconut: hex("#6B4A2B"), pink: hex("#E26A7C"),
    flameLow: hex("#F2470E"), flameMid: hex("#FF9A1F"), flameTip: hex("#FFE28A")
  };
  var MATTE = 0, METAL = 1, GLOW = 2;

  /* ---- shapes -------------------------------------------------------------
     A Builder collects triangles. Each corner carries a place, the way the
     surface faces, a colour, and how it takes light (shine and kind). */

  function Builder() { this.chunks = []; this.v = []; this.i = []; this.n = 0; this.m = mat(); this.nm = normalMat(this.m); this.stack = []; }
  Builder.prototype.push = function (m) { this.stack.push(this.m); this.m = mul(this.m, m); this.nm = normalMat(this.m); };
  Builder.prototype.pop = function () { this.m = this.stack.pop(); this.nm = normalMat(this.m); };
  Builder.prototype.flush = function () { if (this.n) { this.chunks.push({ v: new Float32Array(this.v), i: new Uint16Array(this.i) }); } this.v = []; this.i = []; this.n = 0; };
  Builder.prototype.room = function (count) { if (this.n + count > 65000) { this.flush(); } };
  Builder.prototype.done = function () { this.flush(); return this.chunks; };
  Builder.prototype.vert = function (p, n, col, shine, kind) {
    var m = this.m, k = this.nm;
    var nx = k[0] * n[0] + k[3] * n[1] + k[6] * n[2], ny = k[1] * n[0] + k[4] * n[1] + k[7] * n[2], nz = k[2] * n[0] + k[5] * n[1] + k[8] * n[2];
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    this.v.push(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
      nx / l, ny / l, nz / l, col[0], col[1], col[2], shine, kind);
    return this.n++;
  };
  /* A sheet: P(u, v) gives a place for u and v from 0 to 1. Which way each
     corner faces is worked out from the corners beside it, so P is asked
     once per corner. Where that fails (the pole of a ball) it is asked again
     just off the pole. */
  Builder.prototype.surf = function (nu, nv, P, col, shine, kind) {
    var W = nu + 1, pts = [], e = 1e-3, i, j, n, v2, u, v, base, a, b, wrapU, wrapV, mid = (nv >> 1) * W, i0, i1, j0, j1;
    function near(p, q) { return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 1e-6; }
    for (j = 0; j <= nv; j++) { for (i = 0; i <= nu; i++) { pts.push(P(i / nu, j / nv)); } }
    wrapU = near(pts[mid], pts[mid + nu]) && near(pts[W], pts[W + nu]);
    wrapV = near(pts[nu >> 1], pts[nv * W + (nu >> 1)]) && near(pts[1], pts[nv * W + 1]);
    this.room(W * (nv + 1));
    base = this.n;
    for (j = 0; j <= nv; j++) {
      for (i = 0; i <= nu; i++) {
        i0 = i > 0 ? i - 1 : (wrapU ? nu - 1 : 0); i1 = i < nu ? i + 1 : (wrapU ? 1 : nu);
        j0 = j > 0 ? j - 1 : (wrapV ? nv - 1 : 0); j1 = j < nv ? j + 1 : (wrapV ? 1 : nv);
        n = cross(sub(pts[j1 * W + i], pts[j0 * W + i]), sub(pts[j * W + i1], pts[j * W + i0]));
        if (len(n) < 1e-9) {
          u = i / nu; v = j / nv; v2 = v < 0.5 ? v + 0.03 : v - 0.03;
          n = cross(sub(P(u, v2 + e), P(u, v2 - e)), sub(P(u + e, v2), P(u - e, v2)));
        }
        this.vert(pts[j * W + i], norm(n), typeof col === "function" ? col(i / nu, j / nv) : col, shine, kind || 0);
      }
    }
    for (j = 0; j < nv; j++) {
      for (i = 0; i < nu; i++) { a = base + j * W + i; b = a + W; this.i.push(a, b, a + 1, a + 1, b, b + 1); }
    }
  };
  /* The outline a lathe follows: points of [radius, height]. */
  function profile(pts, smooth) {
    var n = pts.length - 1;
    return function (t) {
      var s = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(s)), f = s - i, p0, p1, p2, p3, f2, f3, k;
      if (!smooth) { return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
      p0 = pts[Math.max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[Math.min(n, i + 2)]; f2 = f * f; f3 = f2 * f;
      k = function (c) { return 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * f + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * f3); };
      return [Math.max(0, k(0)), k(1)];
    };
  }
  /* Turned on a lathe round the y axis. o: smooth, segs, nv, a0 and a1 (part
     of the way round, angle 0 is the front), open(v) (a gap at the front that
     can change with height), ripple(angle, height) (pleats). */
  Builder.prototype.lathe = function (pts, col, shine, kind, o) {
    o = o || {};
    var f = profile(pts, o.smooth), a0 = o.a0 || 0, a1 = o.a1 === undefined ? TAU : o.a1, rip = o.ripple, open = o.open;
    this.surf(o.segs || 28, o.nv || (pts.length - 1) * (o.smooth ? 5 : 2), function (u, v) {
      var q = f(v), g = open ? open(v) : 0, t = open ? g + (TAU - 2 * g) * u : a0 + (a1 - a0) * u, r = q[0] * (rip ? rip(t, q[1]) : 1);
      return [r * Math.sin(t), q[1], r * Math.cos(t)];
    }, col, shine, kind);
  };
  Builder.prototype.ball = function (c, r, col, shine, kind, nu, nv) {
    var rx = r[0] === undefined ? r : r[0], ry = r[1] === undefined ? r : r[1], rz = r[2] === undefined ? r : r[2];
    this.surf(nu || 14, nv || 10, function (u, v) {
      var s = Math.sin(Math.PI * v), t = TAU * u;
      return [c[0] + rx * s * Math.sin(t), c[1] - ry * Math.cos(Math.PI * v), c[2] + rz * s * Math.cos(t)];
    }, col, shine, kind);
  };
  /* A ring lying flat (round the y axis). */
  Builder.prototype.torus = function (R, r, col, shine, kind, nu, nv, ry) {
    this.surf(nu || 32, nv || 8, function (u, v) {
      var t = TAU * u, p = TAU * v, d = R + r * Math.cos(p);
      return [d * Math.sin(t), (ry || r) * Math.sin(p), d * Math.cos(t)];
    }, col, shine, kind);
  };
  /* A rounded rod from a to b. */
  Builder.prototype.rod = function (a, b, ra, rb, col, shine, kind, segs) {
    var d = sub(b, a), l = len(d);
    this.push(mul(translate(a[0], a[1], a[2]), alongY(d)));
    this.lathe([[0, -ra], [ra * 0.7, -ra * 0.7], [ra, 0], [rb, l], [rb * 0.7, l + rb * 0.7], [0, l + rb]], col, shine, kind, { segs: segs || 12 });
    this.pop();
  };
  Builder.prototype.quad = function (a, b, c, d, col, shine, kind) {
    var n = norm(cross(sub(b, a), sub(d, a))), i;
    this.room(4);
    i = this.vert(a, n, col, shine, kind || 0); this.vert(b, n, col, shine, kind || 0); this.vert(c, n, col, shine, kind || 0); this.vert(d, n, col, shine, kind || 0);
    this.i.push(i, i + 1, i + 2, i, i + 2, i + 3);
  };
  Builder.prototype.box = function (c, w, h, d, col, shine, kind) {
    var x0 = c[0] - w / 2, x1 = c[0] + w / 2, y0 = c[1] - h / 2, y1 = c[1] + h / 2, z0 = c[2] - d / 2, z1 = c[2] + d / 2;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, shine, kind);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, shine, kind);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, shine, kind);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, shine, kind);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col, shine, kind);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, shine, kind);
  };
  /* A smooth path through points (Catmull-Rom), k points per span. */
  function path(pts, k) {
    var out = [], n = pts.length - 1, i, j, f, p0, p1, p2, p3, q, c;
    for (i = 0; i < n; i++) {
      p0 = pts[Math.max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[Math.min(n, i + 2)];
      for (j = 0; j < k; j++) {
        f = j / k; q = [];
        for (c = 0; c < 3; c++) { q[c] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * f + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f * f + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * f * f * f); }
        out.push(q);
      }
    }
    out.push(pts[n]);
    return out;
  }
  /* A band of cloth along a path. out(point) says which way is away from
     the body there, so the band lies flat against it. */
  Builder.prototype.band = function (pts, width, out, col, shine, edge) {
    var n = pts.length, i, t, w, nn, p, base, cc, a;
    this.room(n * 4);
    base = this.n;
    for (i = 0; i < n; i++) {
      p = pts[i]; t = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
      w = norm(cross(t, out(p, i / (n - 1)))); nn = norm(cross(w, t));
      cc = typeof col === "function" ? col(i / (n - 1)) : col;
      this.vert(add(p, [w[0] * width / 2, w[1] * width / 2, w[2] * width / 2]), nn, edge || cc, shine, 0);
      this.vert(add(p, [w[0] * width * 0.36, w[1] * width * 0.36, w[2] * width * 0.36]), nn, cc, shine, 0);
      this.vert(add(p, [-w[0] * width * 0.36, -w[1] * width * 0.36, -w[2] * width * 0.36]), nn, cc, shine, 0);
      this.vert(add(p, [-w[0] * width / 2, -w[1] * width / 2, -w[2] * width / 2]), nn, edge || cc, shine, 0);
    }
    for (i = 0; i < n - 1; i++) {
      for (a = 0; a < 3; a++) { p = base + i * 4 + a; this.i.push(p, p + 4, p + 1, p + 1, p + 4, p + 5); }
    }
  };

  /* A string of flowers along points: marigolds, with a white one now and then. */
  function flowers(b, pts, r, every) {
    var i, col;
    for (i = 0; i < pts.length; i++) {
      col = every && i % every === every - 1 ? C.white : (i % 2 ? C.marigold : C.saffron);
      b.ball(pts[i], [r, r * 0.82, r], col, 0.12, MATTE, 7, 5);
    }
  }

  /* ---- the bride ---------------------------------------------------------- */

  function face(b, cy, r, skin, o) {
    /* A place on the face: across (radians from straight ahead) and up. */
    function at(ax, ay, lift) { var k = r + (lift || 0); return [k * Math.sin(ax) * Math.cos(ay), cy + k * 1.03 * Math.sin(ay), k * Math.cos(ax) * Math.cos(ay)]; }
    var s, e, p;
    for (s = -1; s <= 1; s += 2) {
      e = at(s * 0.36, o.eyes === undefined ? 0.1 : o.eyes, -0.004);
      b.ball(e, [0.026, 0.034, 0.014], C.ink, 0.9, MATTE, 10, 8);
      b.ball(add(e, [s * -0.008 + 0.008, 0.012, 0.011]), 0.007, C.white, 0.2, GLOW, 6, 4);
      /* brow */
      b.rod(at(s * 0.2, (o.eyes === undefined ? 0.1 : o.eyes) + 0.26, 0.002), at(s * 0.52, (o.eyes === undefined ? 0.1 : o.eyes) + 0.24, 0.0), o.brow, o.brow * 0.6, C.hair, 0.3, MATTE, 6);
      /* a little colour in the cheek */
      p = at(s * 0.62, -0.2, -0.012);
      b.ball(p, [0.036, 0.028, 0.02], mix3(skin, C.pink, o.blush), 0.25, MATTE, 8, 6);
      /* ear */
      if (o.ears) { b.ball([s * (r - 0.004), cy - 0.01, 0], [0.022, 0.045, 0.032], skin, 0.3, MATTE, 8, 6); }
    }
    b.ball(at(0, -0.1, 0.004), [0.02, 0.022, 0.02], mix3(skin, C.brick, 0.12), 0.35, MATTE, 8, 6);
    return at;
  }

  function buildBride(b) {
    var pleat = function (t, y) { return 1 + 0.03 * Math.max(0, 1 - y / 0.9) * Math.cos(t * 18); };
    var skirtPts = [[0.6, 0.0], [0.597, 0.06], [0.585, 0.125], [0.545, 0.25], [0.44, 0.5], [0.31, 0.74], [0.212, 0.9]];
    var skirt = profile(skirtPts, true), i, j, t, q, r, row, count, at, s, a;

    /* lehenga: three turnings so the zari border stays crisp */
    b.lathe([[0.6, 0.0], [0.598, 0.04], [0.593, 0.085]], C.gold, 0.8, METAL, { segs: 72, nv: 3, ripple: pleat });
    b.lathe([[0.593, 0.085], [0.59, 0.105]], C.maroon, 0.4, MATTE, { segs: 72, nv: 1, ripple: pleat });
    b.lathe([[0.59, 0.105], [0.586, 0.128]], C.gold, 0.8, METAL, { segs: 72, nv: 1, ripple: pleat });
    b.surf(72, 30, function (u, v) {
      var tt = TAU * u, vv = 0.19 + 0.81 * v, p = skirt(vv), rr = p[0] * pleat(tt, p[1]);
      return [rr * Math.sin(tt), p[1], rr * Math.cos(tt)];
    }, function (u, v) { return mix3(C.deep, C.red, Math.min(1, 0.35 + v * 1.4)); }, 0.42, MATTE);
    b.lathe([[0.6, 0.0], [0.3, 0.004], [0, 0.004]], C.maroon, 0.1, MATTE, { segs: 24, nv: 2 });
    /* gold butti, set in staggered rows */
    for (row = 0; row < 5; row++) {
      t = 0.3 + row * 0.135; q = skirt(t); count = 16 - row * 2;
      for (j = 0; j < count; j++) {
        a = TAU * (j + (row % 2) * 0.5) / count; r = q[0] * pleat(a, q[1]) + 0.004;
        b.ball([r * Math.sin(a), q[1], r * Math.cos(a)], [0.02, 0.026, 0.02], C.gold, 0.85, METAL, 6, 4);
      }
    }
    /* waist, choli, shoulders, neck */
    b.push(translate(0, 0.9, 0)); b.torus(0.214, 0.02, C.gold, 0.85, METAL, 32, 6); b.pop();
    b.lathe([[0.2, 0.9], [0.19, 0.97], [0.215, 1.07], [0.243, 1.16], [0.24, 1.21], [0.2, 1.275], [0.128, 1.305]], C.deep, 0.42, MATTE, { smooth: true, segs: 32 });
    b.push(translate(0, 1.303, 0)); b.torus(0.128, 0.012, C.gold, 0.85, METAL, 28, 6); b.pop();
    b.lathe([[0.128, 1.305], [0.09, 1.325], [0.074, 1.345], [0.07, 1.42]], C.skinB, 0.3, MATTE, { smooth: true, segs: 24 });

    /* head and face */
    b.ball([0, 1.565, 0], [0.235, 0.243, 0.235], C.skinB, 0.32, MATTE, 32, 22);
    at = face(b, 1.565, 0.235, C.skinB, { brow: 0.008, blush: 0.45 });
    b.ball(at(0, 0.43, 0.002), [0.017, 0.017, 0.008], C.rose, 0.5, MATTE, 8, 6);                 /* bindi */
    b.ball(at(0, -0.36, 0.0), [0.034, 0.013, 0.012], C.rose, 0.6, MATTE, 10, 6);                 /* lips */
    b.push(mulAll(translate.apply(null, at(0.17, -0.14, 0.012)), rotZ(0.25), rotX(1.2)));       /* nath */
    b.torus(0.03, 0.0045, C.gold, 0.9, METAL, 14, 5); b.pop();

    /* hair, drawn back from a centre parting, and a bun */
    b.push(mulAll(translate(0, 1.565, 0), rotX(-0.62)));
    b.surf(28, 12, function (u, v) {
      var ph = v * 1.66, tt = TAU * u;
      return [0.249 * Math.sin(ph) * Math.sin(tt), 0.257 * Math.cos(ph), 0.249 * Math.sin(ph) * Math.cos(tt)];
    }, C.hair, 0.55, MATTE);
    b.pop();
    b.ball([0, 1.56, -0.235], [0.1, 0.105, 0.085], C.hair, 0.55, MATTE, 12, 8);
    /* maang tikka: a line of gold down the parting, a drop on the forehead */
    b.rod(at(0, 1.2, 0.02), at(0, 0.64, 0.016), 0.006, 0.006, C.gold, 0.9, METAL, 6);
    b.ball(at(0, 0.6, 0.012), [0.022, 0.026, 0.012], C.gold, 0.9, METAL, 8, 6);
    b.ball(at(0, 0.6, 0.022), 0.009, C.rose, 0.8, MATTE, 6, 4);
    /* jhumka */
    for (s = -1; s <= 1; s += 2) {
      b.ball([s * 0.238, 1.5, 0.03], 0.02, C.gold, 0.9, METAL, 8, 6);
      b.push(translate(s * 0.242, 1.415, 0.03));
      b.lathe([[0.0, 0.07], [0.032, 0.03], [0.038, 0.008], [0.0, 0.0]], C.gold, 0.9, METAL, { segs: 10 });
      b.pop();
    }

    /* necklace, close and long */
    b.push(mulAll(translate(0, 1.315, 0.02), rotX(0.3))); b.torus(0.105, 0.017, C.gold, 0.9, METAL, 28, 6); b.pop();
    b.push(mulAll(translate(0, 1.215, 0.085), rotX(0.74))); b.torus(0.215, 0.015, C.gold, 0.9, METAL, 32, 6); b.pop();
    b.ball([0, 1.085, 0.245], [0.036, 0.042, 0.016], C.gold, 0.9, METAL, 8, 6);
    b.ball([0, 1.085, 0.258], 0.014, C.emerald, 0.9, MATTE, 6, 4);

    /* arms, hands joined in a namaste, a stack of chooda at each wrist */
    for (s = -1; s <= 1; s += 2) {
      var sh = [s * 0.228, 1.19, 0.0], el = [s * 0.292, 0.985, 0.1], wr = [s * 0.075, 1.075, 0.292];
      b.ball(sh, 0.062, C.deep, 0.42, MATTE, 10, 8);
      b.rod(sh, mix3(sh, el, 0.62), 0.058, 0.052, C.deep, 0.42, MATTE, 12);
      b.rod(mix3(sh, el, 0.6), el, 0.048, 0.046, C.skinB, 0.3, MATTE, 12);
      b.rod(el, wr, 0.046, 0.036, C.skinB, 0.3, MATTE, 12);
      b.push(mul(translate(el[0], el[1], el[2]), alongY(sub(wr, el))));
      for (i = 0; i < 6; i++) { b.push(translate(0, 0.1 + i * 0.022, 0)); b.torus(0.045 - i * 0.0012, 0.0105, i % 3 === 2 ? C.gold : (i % 2 ? C.ivory : C.red), 0.8, i % 3 === 2 ? METAL : MATTE, 14, 5); b.pop(); }
      b.pop();
      b.ball([s * 0.026, 1.13, 0.305], [0.028, 0.075, 0.042], C.skinB, 0.3, MATTE, 10, 8);
    }

    /* the dupatta: over the head, open round the face, down the back */
    var veilPts = [[0.02, 1.848], [0.13, 1.83], [0.215, 1.775], [0.268, 1.68], [0.283, 1.565], [0.275, 1.45], [0.292, 1.32], [0.34, 1.16], [0.4, 0.9], [0.465, 0.62], [0.53, 0.36]];
    b.lathe(veilPts, function (u, v) {
      var e = Math.min(u, 1 - u);
      if (e < 0.035 || v > 0.955) { return C.gold; }
      if (e < 0.05 || v > 0.93) { return C.maroon; }
      return C.red;
    }, 0.38, MATTE, { smooth: true, segs: 64, nv: 56, open: function (v) {
      /* closed over the crown, drawn back to frame the face, behind the shoulders below */
      if (v < 0.12) { return 0.02 + v * 2.2; }
      if (v < 0.45) { return 0.284 + (v - 0.12) * 3.1; }
      return 1.307 + (v - 0.45) * 0.75;
    } });
    return { top: 1.86, hand: [0, 1.1, 0.33], tieBack: [0.06, 0.74, -0.45], tieSide: [-0.4, 0.8, 0.06], wornR: 0.35, wornTilt: 1.0, wornAt: [0, 1.16, 0.115], shadow: 0.8 };
  }

  /* ---- the groom ---------------------------------------------------------- */

  function buildGroom(b) {
    var coatPts = [[0.385, 0.27], [0.38, 0.33], [0.345, 0.66], [0.305, 0.98], [0.292, 1.14], [0.31, 1.3], [0.325, 1.4], [0.3, 1.465], [0.16, 1.52], [0.098, 1.545]];
    var coat = profile(coatPts, true), i, j, s, t, q, a, row, at, r;

    /* bare feet (shoes come off at the mandap), churidar */
    for (s = -1; s <= 1; s += 2) { b.ball([s * 0.105, 0.035, 0.13], [0.062, 0.036, 0.13], C.skinG, 0.3, MATTE, 12, 8); }
    b.lathe([[0.2, 0.02], [0.19, 0.1], [0.2, 0.3]], C.ivory, 0.35, MATTE, { segs: 20 });
    /* sherwani */
    b.lathe([[0.388, 0.265], [0.392, 0.28], [0.388, 0.33], [0.382, 0.345]], C.gold, 0.85, METAL, { segs: 48, nv: 4 });
    b.surf(48, 34, function (u, v) {
      var tt = TAU * u, p = coat(0.06 + 0.94 * v);
      return [p[0] * Math.sin(tt), p[1], p[0] * Math.cos(tt)];
    }, function (u, v) { return mix3(C.cream, C.ivory, Math.min(1, 0.3 + v * 1.2)); }, 0.45, MATTE);
    b.lathe([[0.385, 0.27], [0.2, 0.27]], C.cream, 0.2, MATTE, { segs: 24, nv: 1 });
    /* placket and buttons down the front */
    b.surf(3, 30, function (u, v) {
      var tt = (u - 0.5) * 0.17, p = coat(0.04 + 0.86 * v), rr = p[0] + 0.006;
      return [rr * Math.sin(tt), p[1], rr * Math.cos(tt)];
    }, C.gold, 0.85, METAL);
    for (i = 0; i < 6; i++) { q = coat(0.5 + i * 0.075); b.ball([0, q[1], q[0] + 0.012], 0.019, C.gold, 0.95, METAL, 8, 6); }
    /* butti */
    for (row = 0; row < 6; row++) {
      t = 0.12 + row * 0.115; q = coat(t);
      for (j = 0; j < 12; j++) {
        a = TAU * (j + (row % 2) * 0.5) / 12;
        if (Math.min(a, TAU - a) < 0.2) { continue; }
        r = q[0] + 0.003;
        b.ball([r * Math.sin(a), q[1], r * Math.cos(a)], [0.016, 0.02, 0.016], C.gold, 0.85, METAL, 6, 4);
      }
    }
    /* collar, neck */
    b.lathe([[0.1, 1.535], [0.106, 1.55], [0.102, 1.61], [0.094, 1.615]], C.gold, 0.85, METAL, { segs: 24 });
    b.lathe([[0.084, 1.55], [0.082, 1.68]], C.skinG, 0.3, MATTE, { segs: 18, nv: 1 });

    /* head and face */
    b.ball([0, 1.8, -0.03], [0.247, 0.25, 0.24], C.hair, 0.5, MATTE, 20, 14);
    b.ball([0, 1.79, 0], [0.24, 0.247, 0.24], C.skinG, 0.32, MATTE, 32, 22);
    at = face(b, 1.79, 0.24, C.skinG, { brow: 0.012, blush: 0.2, ears: true, eyes: 0.03 });
    for (s = -1; s <= 1; s += 2) {                                                               /* moustache */
      b.rod(at(s * 0.03, -0.27, 0.002), at(s * 0.3, -0.2, -0.002), 0.018, 0.006, C.hair, 0.4, MATTE, 8);
      b.rod(at(s * 0.3, -0.2, -0.002), at(s * 0.4, -0.08, 0.0), 0.006, 0.003, C.hair, 0.4, MATTE, 6);
    }
    b.rod(at(-0.12, -0.43, 0.0), at(0.12, -0.43, 0.0), 0.007, 0.007, mix3(C.skinG, C.rose, 0.55), 0.4, MATTE, 6);
    b.ball(at(0, 0.33, 0.0), [0.008, 0.022, 0.006], C.rose, 0.5, MATTE, 6, 6);                     /* tilak */

    /* safa: a turned shape with the folds wound over it */
    b.push(mulAll(translate(0, 1.79, 0), rotX(-0.1), rotZ(0.05), translate(0, -1.79, 0)));
    b.lathe([[0.236, 1.885], [0.286, 1.9], [0.318, 1.98], [0.3, 2.08], [0.23, 2.155], [0.11, 2.2], [0, 2.205]], C.rani, 0.4, MATTE, { smooth: true, segs: 36 });
    var folds = [[1.915, 0.29, 0.13, 0], [1.955, 0.308, -0.14, 1.3], [1.995, 0.308, 0.18, 2.5], [2.04, 0.295, -0.18, 3.9], [2.082, 0.268, 0.2, 5.2], [2.122, 0.222, -0.18, 0.8], [2.156, 0.165, 0.16, 2.2]];
    for (i = 0; i < folds.length; i++) {
      b.push(mulAll(translate(0, folds[i][0], 0), rotY(folds[i][3]), rotX(folds[i][2])));
      b.torus(folds[i][1], 0.03, i % 3 === 1 ? C.gold : (i % 2 ? C.rani : C.red), i % 3 === 1 ? 0.7 : 0.4, i % 3 === 1 ? METAL : MATTE, 36, 8, 0.036);
      b.pop();
    }
    b.ball([0, 2.205, 0], [0.07, 0.03, 0.07], C.red, 0.4, MATTE, 10, 6);
    /* kalgi: a jewel and a plume */
    b.ball([0, 2.0, 0.325], [0.04, 0.05, 0.022], C.gold, 0.95, METAL, 10, 8);
    b.ball([0, 2.0, 0.343], 0.017, C.emerald, 0.95, MATTE, 8, 6);
    b.push(mulAll(translate(0, 2.04, 0.325), rotX(-0.22)));
    b.lathe([[0.012, 0], [0.05, 0.1], [0.04, 0.2], [0, 0.3]], C.white, 0.3, MATTE, { smooth: true, segs: 10 });
    b.pop();
    /* the tail of the safa down the back */
    b.band(path([[0.06, 1.9, -0.3], [0.09, 1.7, -0.33], [0.1, 1.4, -0.36], [0.1, 1.05, -0.37]], 5), 0.15, function () { return [0, 0, -1]; }, C.rani, 0.4, C.gold);
    b.pop();

    /* pearls, three strands */
    for (i = 0; i < 3; i++) { b.push(mulAll(translate(0, 1.43 - i * 0.055, 0.09 + i * 0.012), rotX(0.78 + i * 0.05))); b.torus(0.2 + i * 0.045, 0.012, C.pearl, 0.9, MATTE, 36, 6); b.pop(); }

    /* arms, hands joined */
    for (s = -1; s <= 1; s += 2) {
      var sh = [s * 0.3, 1.39, 0.0], el = [s * 0.365, 1.13, 0.12], wr = [s * 0.085, 1.22, 0.33];
      b.ball(sh, 0.075, C.ivory, 0.45, MATTE, 10, 8);
      b.rod(sh, el, 0.07, 0.062, C.ivory, 0.45, MATTE, 12);
      b.rod(el, wr, 0.062, 0.05, C.ivory, 0.45, MATTE, 12);
      b.push(mul(translate(el[0], el[1], el[2]), alongY(sub(wr, el))));
      b.push(translate(0, len(sub(wr, el)) - 0.02, 0)); b.torus(0.05, 0.014, C.gold, 0.85, METAL, 14, 5); b.pop();
      b.pop();
      b.ball([s * 0.03, 1.28, 0.345], [0.032, 0.085, 0.048], C.skinG, 0.3, MATTE, 10, 8);
    }

    /* a maroon stole over the left shoulder */
    var stole = path([[0.2, 0.52, 0.335], [0.215, 0.95, 0.24], [0.235, 1.3, 0.2], [0.24, 1.49, 0.02], [0.225, 1.3, -0.2], [0.2, 0.9, -0.265], [0.19, 0.6, -0.31]], 6);
    b.band(stole, 0.17, function (p) { return norm([p[0] * 0.25, p[1] > 1.4 ? 1 : 0.1, p[2]]); }, C.maroon, 0.4, C.gold);
    return { top: 2.26, hand: [0, 1.25, 0.37], tieBack: [0.22, 0.86, 0.3], tieSide: [0.33, 0.86, 0.1], wornR: 0.37, wornTilt: 1.02, wornAt: [0, 1.37, 0.13], shadow: 0.62 };
  }

  /* ---- a garland: marigolds and tuberose in a ring, a tassel at the front -- */

  function buildGarland(b) {
    var n = 34, i, a, col;
    for (i = 0; i < n; i++) {
      a = TAU * i / n; col = i % 4 === 3 ? C.white : (i % 2 ? C.marigold : C.saffron);
      b.ball([Math.sin(a), 0, Math.cos(a)], i % 4 === 3 ? [0.085, 0.085, 0.085] : [0.115, 0.1, 0.115], col, 0.12, MATTE, 8, 6);
    }
    b.ball([0, 0, 1.14], 0.1, C.rose, 0.3, MATTE, 8, 6);
    b.ball([0, 0, 1.3], 0.08, C.white, 0.12, MATTE, 8, 6);
    b.ball([0, 0, 1.43], 0.06, C.gold, 0.9, METAL, 8, 6);
  }

  /* ---- the mandap: dais, fire pit, four pillars, canopy, flowers, lamps ---- */

  var PILLAR = 1.72, RING = 2.6, DAIS = 2.86, EAVE = 3.02, TOP = 3.02;

  function buildFloor(b) {
    var i, a;

    /* dais: two steps of marble, a red durrie, a ring of rangoli */
    b.lathe([[DAIS + 0.34, -0.5], [DAIS + 0.34, -0.3], [DAIS + 0.3, -0.27], [DAIS + 0.16, -0.27], [DAIS + 0.16, -0.05], [DAIS + 0.12, 0], [DAIS, 0]], C.marble, 0.5, MATTE, { segs: 96, nv: 12 });
    b.lathe([[DAIS + 0.17, -0.2], [DAIS + 0.175, -0.16], [DAIS + 0.17, -0.12]], C.gold, 0.8, METAL, { segs: 96, nv: 2 });
    b.surf(144, 44, function (u, v) { var r = DAIS * (1 - v), tt = TAU * u; return [r * Math.sin(tt), 0, r * Math.cos(tt)]; }, function (u, v) {
      var r = DAIS * (1 - v), tt = TAU * u, petal, d;
      if (r > DAIS - 0.2) { return C.marble; }
      if (r > DAIS - 0.27) { return C.gold; }
      if (r > DAIS - 0.6) { petal = Math.abs(Math.sin(tt * 18)); d = (r - DAIS + 0.6) / 0.33; return petal > 0.2 + d * 0.8 ? C.maroon : (petal > 0.08 + d * 0.5 ? C.marigold : C.gold); }
      if (r > DAIS - 0.66) { return C.gold; }
      if (r > 0.98) { return C.red; }
      if (r > 0.93) { return C.gold; }
      d = Math.abs(Math.sin(tt * 8));
      if (r > 0.58) { return d > 0.62 - (r - 0.58) * 0.9 ? C.marigold : (d > 0.3 ? C.white : C.rose); }
      return C.ivory;
    }, 0.3, MATTE);

    /* havan kund: three courses of brick, stepped in */
    b.box([0, 0.07, 0], 0.86, 0.14, 0.86, C.brick, 0.2, MATTE);
    b.box([0, 0.2, 0], 0.7, 0.12, 0.7, mix3(C.brick, C.rose, 0.25), 0.2, MATTE);
    b.box([0, 0.31, 0], 0.54, 0.1, 0.54, C.brick, 0.2, MATTE);
    b.box([0, 0.362, 0], 0.4, 0.004, 0.4, C.soot, 0.1, MATTE);
    for (i = 0; i < 4; i++) { b.push(rotY(i * Math.PI / 2)); b.box([0, 0.145, 0.432], 0.86, 0.012, 0.012, C.gold, 0.8, METAL); b.box([0, 0.262, 0.352], 0.7, 0.012, 0.012, C.gold, 0.8, METAL); b.pop(); }
    /* sticks of wood in the pit */
    for (i = 0; i < 5; i++) { a = i * 1.26; b.rod([Math.sin(a) * 0.16, 0.36, Math.cos(a) * 0.16], [Math.sin(a + 2.6) * 0.14, 0.44, Math.cos(a + 2.6) * 0.14], 0.022, 0.02, C.coconut, 0.2, MATTE, 6); }

  }

  function buildPillars(b) {
    var i, j, k, a, x, z, pts, t;

    var shaft = [[0.2, 0], [0.2, 0.1], [0.17, 0.13], [0.17, 0.22], [0.12, 0.3], [0.105, 0.6], [0.1, TOP - 0.38], [0.13, TOP - 0.28], [0.16, TOP - 0.24], [0.17, TOP - 0.16], [0.2, TOP - 0.08], [0.2, TOP]];
    for (k = 0; k < 4; k++) {
      x = (k % 2 ? 1 : -1) * PILLAR; z = (k < 2 ? 1 : -1) * PILLAR;
      b.push(translate(x, 0, z));
      b.lathe(shaft, C.ivory, 0.6, MATTE, { segs: 20 });
      b.lathe([[0.172, 0.14], [0.176, 0.175], [0.172, 0.21]], C.gold, 0.85, METAL, { segs: 20, nv: 2 });
      b.lathe([[0.132, TOP - 0.28], [0.165, TOP - 0.23], [0.172, TOP - 0.18]], C.gold, 0.85, METAL, { segs: 20, nv: 2 });
      /* marigolds wound up the shaft */
      pts = [];
      for (j = 0; j < 48; j++) { t = j / 47; a = t * TAU * 3.75 + k; pts.push([Math.sin(a) * 0.135, 0.36 + t * (TOP - 0.7), Math.cos(a) * 0.135]); }
      flowers(b, pts, 0.052, 6);
      /* a kalash with mango leaves and a coconut at the foot of the front pair */
      if (k < 2) {
        b.push(translate((k % 2 ? -1 : 1) * 0.52, 0, 0.26));
        b.lathe([[0, 0], [0.09, 0.005], [0.1, 0.03], [0.075, 0.06], [0.15, 0.14], [0.175, 0.22], [0.15, 0.3], [0.09, 0.345], [0.085, 0.37], [0.12, 0.395], [0.118, 0.405]], C.brass, 0.9, METAL, { smooth: true, segs: 24 });
        for (i = 0; i < 7; i++) { a = TAU * i / 7; b.push(mulAll(translate(Math.sin(a) * 0.1, 0.4, Math.cos(a) * 0.1), rotY(a), rotX(0.9))); b.ball([0, 0.08, 0], [0.036, 0.1, 0.008], i % 2 ? C.leaf : C.leafDark, 0.4, MATTE, 6, 6); b.pop(); }
        b.ball([0, 0.49, 0], [0.085, 0.105, 0.085], C.coconut, 0.25, MATTE, 12, 8);
        b.ball([0, 0.6, 0], [0.016, 0.03, 0.016], C.coconut, 0.2, MATTE, 6, 4);
        b.pop();
      }
      b.pop();
    }

  }

  function buildCanopy(b) {
    var i, j, k, a, s, p, pts, t;

    /* the ring the canopy sits on, with a scalloped gold-edged valance */
    b.lathe([[RING + 0.2, TOP], [RING + 0.24, TOP + 0.04], [RING + 0.24, TOP + 0.18], [RING + 0.2, TOP + 0.22], [RING - 0.12, TOP + 0.22]], C.ivory, 0.55, MATTE, { segs: 96, nv: 8 });
    b.lathe([[RING + 0.245, TOP + 0.08], [RING + 0.25, TOP + 0.11], [RING + 0.245, TOP + 0.14]], C.gold, 0.85, METAL, { segs: 96, nv: 2 });
    b.lathe([[RING + 0.2, TOP], [RING - 0.12, TOP], [RING - 0.12, TOP + 0.22]], C.cream, 0.3, MATTE, { segs: 64, nv: 2 });
    b.surf(192, 4, function (u, v) {
      var tt = TAU * u, drop = 0.16 + 0.15 * Math.abs(Math.sin(tt * 12)), r = RING + 0.21;
      return [r * Math.sin(tt), TOP + 0.02 - drop * v, r * Math.cos(tt)];
    }, function (u, v) { return v > 0.72 ? C.gold : (v > 0.5 ? C.maroon : C.red); }, 0.4, MATTE);

    /* canopy: a red shamiana in sixteen gores, gold piping, a kalash on top */
    var roof = profile([[EAVE, TOP + 0.17], [EAVE - 0.05, TOP + 0.22], [2.5, TOP + 0.33], [1.8, TOP + 0.5], [1.1, TOP + 0.72], [0.55, TOP + 0.98], [0.22, TOP + 1.22], [0.11, TOP + 1.32]], true);
    b.surf(256, 20, function (u, v) {
      var tt = TAU * u, p = roof(v), r = p[0] * (1 + 0.02 * Math.cos(tt * 16) * (1 - v));
      return [r * Math.sin(tt), p[1] - 0.045 * Math.abs(Math.sin(tt * 8)) * (1 - v), r * Math.cos(tt)];
    }, function (u, v) {
      var g = (u * 16) % 1, e = Math.min(g, 1 - g);
      if (v < 0.03) { return C.gold; }
      if (e < 0.022) { return C.gold; }
      return Math.floor(u * 16) % 2 ? C.red : mix3(C.red, C.deep, 0.55);
    }, 0.2, MATTE);
    b.surf(64, 4, function (u, v) { var tt = TAU * u, r = EAVE - 0.07 - (EAVE - RING - 0.27) * v; return [r * Math.sin(tt), TOP + 0.1 + 0.04 * v, r * Math.cos(tt)]; }, C.maroon, 0.2, MATTE);
    b.push(mul(translate(0, TOP + 1.3, 0), scale(0.82)));
    b.lathe([[0.12, 0], [0.2, 0.04], [0.1, 0.1], [0.19, 0.2], [0.23, 0.31], [0.17, 0.42], [0.08, 0.47], [0.11, 0.52], [0.04, 0.58], [0, 0.72]], C.gold, 0.95, METAL, { smooth: true, segs: 24 });
    b.pop();

    /* swags of marigold between the pillars, a few drops hanging from each */
    for (k = 0; k < 4; k++) {
      b.push(rotY(k * Math.PI / 2));
      pts = [];
      for (j = 0; j <= 30; j++) { t = j / 30; s = (t - 0.5) * 2; pts.push([s * (PILLAR - 0.12), TOP - 0.06 - 0.4 * (1 - s * s), PILLAR + 0.02 * (1 - s * s)]); }
      flowers(b, pts, 0.062, 5);
      for (i = -2; i <= 2; i++) {
        if (i === 0 && k === 0) { continue; }
        s = i / 2.6; pts = []; p = TOP - 0.08 - 0.4 * (1 - s * s);
        for (j = 1; j <= (i % 2 ? 4 : 6); j++) { pts.push([s * (PILLAR - 0.12), p - j * 0.105, PILLAR + 0.02]); }
        flowers(b, pts, 0.05, 3);
        b.ball([s * (PILLAR - 0.12), p - (pts.length + 0.7) * 0.105, PILLAR + 0.02], [0.03, 0.05, 0.03], C.gold, 0.9, METAL, 6, 4);
      }
      b.pop();
    }

    /* diyas round the edge of the dais */
    for (i = 0; i < 20; i++) {
      a = TAU * (i + 0.5) / 20;
      b.push(translate(Math.sin(a) * (DAIS + 0.23), -0.27, Math.cos(a) * (DAIS + 0.23)));
      b.lathe([[0, 0], [0.04, 0.004], [0.075, 0.035], [0.08, 0.055], [0.062, 0.05], [0, 0.03]], C.brick, 0.3, MATTE, { segs: 10 });
      b.lathe([[0, 0.04], [0.02, 0.06], [0.014, 0.1], [0, 0.135]], C.flameTip, 0, GLOW, { segs: 6, smooth: true });
      b.pop();
    }
  }

  function buildFlame(b) {
    b.lathe([[0, 0], [0.42, 0.1], [0.56, 0.3], [0.44, 0.56], [0.2, 0.82], [0, 1]], function (u, v) {
      return v < 0.45 ? mix3(C.flameLow, C.flameMid, v / 0.45) : mix3(C.flameMid, C.flameTip, (v - 0.45) / 0.55);
    }, 0, GLOW, { smooth: true, segs: 12, nv: 14 });
  }

  /* ---- shaders -------------------------------------------------------------- */

  var VS = [
    "attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec2 aMat;",
    "uniform mat4 uVP; uniform mat4 uM;",
    "varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vMat;",
    "void main() {",
    "  vec4 w = uM * vec4(aPos, 1.0);",
    "  vPos = w.xyz; vNor = (uM * vec4(aNor, 0.0)).xyz; vCol = aCol; vMat = aMat;",
    "  gl_Position = uVP * w;",
    "}"
  ].join("\n");
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec3 uEye; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uSky; uniform vec3 uGround;",
    "uniform vec3 uFirePos; uniform vec3 uFireCol; uniform vec3 uRim; uniform float uGlow;",
    "varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vMat;",
    "void main() {",
    "  vec3 col;",
    "  if (vMat.y > 1.5) {",
    "    col = vCol * uGlow;",
    "  } else {",
    "    vec3 N = normalize(vNor); if (!gl_FrontFacing) { N = -N; }",
    "    vec3 V = normalize(uEye - vPos);",
    "    float shine = vMat.x; float metal = step(0.5, vMat.y);",
    "    float nl = dot(N, uKeyDir);",
    "    float diff = max(nl * 0.8 + 0.2, 0.0); diff *= diff;",
    "    vec3 amb = mix(uGround, uSky, N.y * 0.5 + 0.5);",
    "    vec3 toF = uFirePos - vPos; float d2 = dot(toF, toF); vec3 Lf = toF * inversesqrt(d2);",
    "    float fall = 1.0 / (1.0 + d2 * 0.22);",
    "    float fire = max(dot(N, Lf) * 0.7 + 0.3, 0.0) * fall;",
    "    float power = mix(10.0, 110.0, shine);",
    "    float sp = pow(max(dot(N, normalize(uKeyDir + V)), 0.0), power) * shine;",
    "    float spf = pow(max(dot(N, normalize(Lf + V)), 0.0), power) * shine * fall;",
    "    float fres = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 3.0);",
    "    vec3 plain = vCol * (amb + uKeyCol * diff + uFireCol * fire) + uKeyCol * sp * 0.55 + uFireCol * spf * 0.5 + uRim * fres * (0.06 + 0.22 * shine);",
    "    vec3 R = reflect(-V, N);",
    "    float env = smoothstep(-0.35, 0.9, R.y) * 0.9 + 0.2 * smoothstep(0.55, 0.95, abs(R.x));",
    "    vec3 gold = vCol * (amb * 0.55 + uKeyCol * diff * 0.5 + uFireCol * fire * 0.8 + env * 0.75) + vCol * (uKeyCol * sp * 2.6 + uFireCol * spf * 2.2) + uRim * fres * 0.25;",
    "    col = mix(plain, gold, metal);",
    "  }",
    "  col = 1.0 - exp(-col * 1.25);",
    "  gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);",
    "}"
  ].join("\n");
  /* Soft round patches: shadows on the floor, the glow of the fire. */
  var SVS = [
    "attribute vec2 aQ; uniform mat4 uVP; uniform mat4 uM; varying vec2 vQ;",
    "void main() { vQ = aQ; gl_Position = uVP * uM * vec4(aQ.x, 0.0, aQ.y, 1.0); }"
  ].join("\n");
  var SFS = [
    "precision mediump float; uniform vec4 uCol; varying vec2 vQ;",
    "void main() { float a = 1.0 - smoothstep(0.0, 1.0, length(vQ)); a = a * a * uCol.a; gl_FragColor = vec4(uCol.rgb * a, a); }"
  ].join("\n");

  function program(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s) || "shader"); }
      return s;
    }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p) || "link"); }
    return p;
  }

  /* ---- easing --------------------------------------------------------------- */

  function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }

  /* ---- the scene ------------------------------------------------------------- */

  var WALK = 1.24;                 /* how far from the fire the couple walk */
  var APART = 0.5;                 /* each stands this far (radians) to one side of the front */
  var TURN = 0.92;                 /* how far they turn from each other toward the guests */

  function create(canvas, opts) {
    opts = opts || {};
    var gl = null, attrs = { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "low-power" };
    try { gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs); } catch (e) { gl = null; }
    if (!gl) { return null; }

    var still = !!opts.still, running = false, raf = 0, clock = 0, last = 0, dirty = true, lost = false, ready = false, building = 0;
    var prog, sprog, loc = {}, sloc = {}, meshes = {}, quadBuf, tieBuf, tieData = new Float32Array(14 * 4 * 11);
    var info = {}, anims = [], firstFrame = false;
    var ratio = Math.min(window.devicePixelRatio || 1, 2), slow = 0;

    /* a: where on the circle (0 is the front), r: how far from the fire,
       goal: where it is heading, ry: which way it faces, pitch: a bow,
       walk: how much it is stepping */
    var bride = { a: -APART, r: WALK, goal: -APART, ry: Math.PI / 2 - TURN, pitch: 0, walk: 0, lift: 0 };
    var groom = { a: APART, r: WALK, goal: APART, ry: -Math.PI / 2 + TURN, pitch: 0, walk: 0, lift: 0 };
    var garland = [{ t: 0 }, { t: 0 }];     /* 0 goes from the bride to the groom, 1 comes back */
    var tie = { k: 0, side: 0 };            /* the gathbandhan: how much of it is tied, and whether they stand in file (0) or side by side (1) */
    var cam = { yaw: 0.0, pitch: 0.075, sway: 1, vel: 0, zoom: 1 };
    var phase = 0;                          /* 0 meeting, 1 garlanded, 2..8 pheras taken, 9 done */

    function upload(chunks) {
      return chunks.map(function (c) {
        var vb = gl.createBuffer(), ib = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, c.v, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, c.i, gl.STATIC_DRAW);
        return { vb: vb, ib: ib, n: c.i.length };
      });
    }
    function made(fn) { var b = new Builder(), out = fn(b); return { mesh: upload(b.done()), info: out }; }

    /* The shaders are compiled at once, so a browser that cannot run them is
       found out before anything is promised. */
    function programs() {
      prog = program(gl, VS, FS); sprog = program(gl, SVS, SFS);
      ["uVP", "uM", "uEye", "uKeyDir", "uKeyCol", "uSky", "uGround", "uFirePos", "uFireCol", "uRim", "uGlow"].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
      ["aPos", "aNor", "aCol", "aMat"].forEach(function (n) { loc[n] = gl.getAttribLocation(prog, n); });
      ["uVP", "uM", "uCol"].forEach(function (n) { sloc[n] = gl.getUniformLocation(sprog, n); });
      sloc.aQ = gl.getAttribLocation(sprog, "aQ");
    }

    /* The shapes are made a part at a time, with a breath between parts, so
       the page never freezes while the mandap is being put up. */
    var PARTS = [
      function () { meshes.floor = made(buildFloor).mesh; },
      function () { meshes.pillars = made(buildPillars).mesh; },
      function () { meshes.canopy = made(buildCanopy).mesh; },
      function () { var m = made(buildBride); meshes.bride = m.mesh; info.bride = m.info; },
      function () { var m = made(buildGroom); meshes.groom = m.mesh; info.groom = m.info; },
      function () {
        var idx = [], k, a, p;
        meshes.garland = made(buildGarland).mesh; meshes.flame = made(buildFlame).mesh;
        quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        for (k = 0; k < 13; k++) { for (a = 0; a < 3; a++) { p = k * 4 + a; idx.push(p, p + 4, p + 1, p + 1, p + 4, p + 5); } }
        tieBuf = { vb: gl.createBuffer(), ib: gl.createBuffer(), n: idx.length };
        gl.bindBuffer(gl.ARRAY_BUFFER, tieBuf.vb); gl.bufferData(gl.ARRAY_BUFFER, tieData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tieBuf.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      }
    ];
    function build() {
      var run = ++building, n = 0;
      ready = false; firstFrame = false;
      function next() {
        if (run !== building || lost) { return; }
        try { PARTS[n](); } catch (e) { ready = false; if (opts.onFail) { opts.onFail(); } return; }
        n += 1;
        if (n < PARTS.length) { setTimeout(next, 0); } else { ready = true; kick(); }
      }
      setTimeout(next, 0);
    }

    /* Where a figure stands and how it is turned. */
    function figQuat(f) { return qMul(qMul(qAxis(0, 1, 0, f.ry), qAxis(1, 0, 0, f.pitch)), qAxis(0, 0, 1, f.roll || 0)); }
    function figPos(f) { return [f.r * Math.sin(f.a), f.lift, f.r * Math.cos(f.a)]; }
    function figMat(f) { return trs(figPos(f), figQuat(f), 1); }

    function garlandMat(g, giver, taker, gi, ti) {
      var gq = figQuat(giver), gm = figMat(giver), tq = figQuat(taker), tm = figMat(taker);
      var held = { p: point(gm, add(gi.hand, [0, -0.26, 0.0])), q: qMul(gq, qAxis(1, 0, 0, 1.36)), s: 0.23 };
      var over = { p: point(tm, [0, ti.top + 0.2, 0.02]), q: qMul(tq, qAxis(1, 0, 0, 0.3)), s: ti.wornR + 0.02 };
      var worn = { p: point(tm, ti.wornAt), q: qMul(tq, qAxis(1, 0, 0, ti.wornTilt)), s: ti.wornR };
      var t = g.t, a, b, k;
      if (t <= 0) { return trs(held.p, held.q, held.s); }
      if (t >= 1) { return trs(worn.p, worn.q, worn.s); }
      if (t < 0.6) { a = held; b = over; k = inOut(t / 0.6); } else { a = over; b = worn; k = inOut((t - 0.6) / 0.4); }
      return trs(mix3(a.p, b.p, k), qSlerp(a.q, b.q, k), a.s + (b.s - a.s) * k);
    }

    /* The cloth between them: a strip from his stole to her dupatta that sags. */
    function updateTie(bm, gm) {
      var a = point(gm, mix3(info.groom.tieBack, info.groom.tieSide, tie.side)), b = point(bm, mix3(info.bride.tieBack, info.bride.tieSide, tie.side));
      var n = 14, i, t, p, w, nn, d, o = 0, col, k = tie.k, side = norm(cross(sub(b, a), [0, 1, 0]));
      function put(q, nr, c) { tieData[o++] = q[0]; tieData[o++] = q[1]; tieData[o++] = q[2]; tieData[o++] = nr[0]; tieData[o++] = nr[1]; tieData[o++] = nr[2]; tieData[o++] = c[0]; tieData[o++] = c[1]; tieData[o++] = c[2]; tieData[o++] = 0.35; tieData[o++] = 0; }
      for (i = 0; i < n; i++) {
        t = i / (n - 1) * k;
        p = mix3(a, b, t); p[1] -= 0.2 * Math.sin(Math.PI * i / (n - 1)) * k;
        d = norm(sub(mix3(a, b, Math.min(1, t + 0.05)), mix3(a, b, Math.max(0, t - 0.05))));
        w = norm(cross(d, side)); nn = norm(cross(w, d));
        col = Math.abs(i / (n - 1) - 0.5) < 0.09 ? C.gold : C.marigold;
        put(add(p, [w[0] * 0.07, w[1] * 0.07, w[2] * 0.07]), nn, C.gold);
        put(add(p, [w[0] * 0.048, w[1] * 0.048, w[2] * 0.048]), nn, col);
        put(add(p, [-w[0] * 0.048, -w[1] * 0.048, -w[2] * 0.048]), nn, col);
        put(add(p, [-w[0] * 0.07, -w[1] * 0.07, -w[2] * 0.07]), nn, C.gold);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, tieBuf.vb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, tieData);
    }

    function drawMesh(list, m) {
      var i, c;
      gl.uniformMatrix4fv(loc.uM, false, m);
      for (i = 0; i < list.length; i++) {
        c = list[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, c.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c.ib);
        gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 44, 0);
        gl.vertexAttribPointer(loc.aNor, 3, gl.FLOAT, false, 44, 12);
        gl.vertexAttribPointer(loc.aCol, 3, gl.FLOAT, false, 44, 24);
        gl.vertexAttribPointer(loc.aMat, 2, gl.FLOAT, false, 44, 36);
        gl.drawElements(gl.TRIANGLES, c.n, gl.UNSIGNED_SHORT, 0);
      }
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(2, Math.round(r.width * ratio)), h = Math.max(2, Math.round(r.height * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
    }

    function frame(now) {
      raf = 0;
      if (lost) { return; }
      var gap = (now - last) / 1000 || 0, dt = Math.min(0.05, gap), i, a, p, moving = false;
      last = now;
      if (!still) { clock += dt; }

      /* A device that cannot keep up gets a coarser picture, not a slower one. */
      if (running && ready && !still && ratio > 1) {
        slow = gap > 0.045 ? slow + 1 : Math.max(0, slow - 2);
        if (slow > 45) { ratio = Math.max(1, ratio - 0.5); slow = 0; dirty = true; }
      }

      /* tweens */
      for (i = anims.length - 1; i >= 0; i--) {
        a = anims[i];
        if (now < a.t0) { moving = true; continue; }
        if (a.from === null) { a.from = a.o[a.k]; }
        p = a.d > 0 ? clamp01((now - a.t0) / a.d) : 1;
        a.o[a.k] = a.from + (a.to - a.from) * a.e(p);
        if (p >= 1) { anims.splice(i, 1); } else { moving = true; }
      }
      /* the view keeps turning a little after a drag */
      if (Math.abs(cam.vel) > 0.0004) { cam.yaw += cam.vel * dt; cam.vel *= Math.pow(0.04, dt); moving = true; }

      if (running && ready && (!still || moving || dirty)) { draw(); dirty = false; }
      if (running && (!still || moving || !ready)) { raf = requestAnimationFrame(frame); }
    }

    function draw() {
      resize();
      var w = canvas.width, h = canvas.height, aspect = w / h, fov = 0.5, tanH = Math.tan(fov / 2);
      /* Stand far enough back for the whole mandap, whichever way the screen is.
         The front of the dais is nearer than the middle, so it needs more room. */
      var dist = Math.max(DAIS + 0.34 + 2.72 / tanH, 3.5 / (tanH * aspect)) * cam.zoom;
      var yaw = cam.yaw + (still ? 0 : Math.sin(clock * 0.42) * 0.16 * cam.sway), pitch = cam.pitch + (still ? 0 : Math.sin(clock * 0.31 + 1) * 0.012 * cam.sway);
      var target = [0, 1.96, 0];
      var eye = [target[0] + dist * Math.sin(yaw) * Math.cos(pitch), target[1] + dist * Math.sin(pitch), target[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
      var vp = mul(perspective(fov, aspect, 0.5, 80), lookAt(eye, target));
      var flick = still ? 1 : 0.86 + 0.1 * Math.sin(clock * 11.3) + 0.06 * Math.sin(clock * 23.7 + 1.3);
      var i, bm, gm, m, s, t, g, f, world = mat();

      /* doll-like life: a breath of sway at rest, a rock and a hop when walking */
      [bride, groom].forEach(function (fig, n) {
        var hop = Math.abs(Math.sin(fig.a * 10.5));
        fig.roll = (still ? 0 : Math.sin(clock * 1.3 + n * 2.1) * 0.012) + fig.walk * Math.sin(fig.a * 21) * 0.045;
        fig.lift = fig.walk * hop * 0.035;
      });
      bm = figMat(bride); gm = figMat(groom);

      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);

      gl.useProgram(prog);
      gl.enableVertexAttribArray(loc.aPos); gl.enableVertexAttribArray(loc.aNor); gl.enableVertexAttribArray(loc.aCol); gl.enableVertexAttribArray(loc.aMat);
      gl.uniformMatrix4fv(loc.uVP, false, vp);
      gl.uniform3fv(loc.uEye, eye);
      /* the main light rides with the viewer, a little up and to the left */
      gl.uniform3fv(loc.uKeyDir, norm([Math.sin(yaw - 0.6), 0.85, Math.cos(yaw - 0.6)]));
      gl.uniform3f(loc.uKeyCol, 1.02, 0.94, 0.82);
      gl.uniform3f(loc.uSky, 0.46, 0.4, 0.38);
      gl.uniform3f(loc.uGround, 0.3, 0.17, 0.12);
      gl.uniform3f(loc.uFirePos, 0, 0.95, 0);
      gl.uniform3f(loc.uFireCol, 1.5 * flick, 0.72 * flick, 0.2 * flick);
      gl.uniform3f(loc.uRim, 1.0, 0.78, 0.42);
      gl.uniform1f(loc.uGlow, 1.25);

      drawMesh(meshes.floor, world); drawMesh(meshes.pillars, world); drawMesh(meshes.canopy, world);
      drawMesh(meshes.bride, bm);
      drawMesh(meshes.groom, gm);
      drawMesh(meshes.garland, garlandMat(garland[0], bride, groom, info.bride, info.groom));
      drawMesh(meshes.garland, garlandMat(garland[1], groom, bride, info.groom, info.bride));
      if (tie.k > 0.01) { updateTie(bm, gm); drawMesh([tieBuf], world); }
      gl.disableVertexAttribArray(loc.aNor); gl.disableVertexAttribArray(loc.aCol); gl.disableVertexAttribArray(loc.aMat);

      /* shadows */
      gl.useProgram(sprog);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(sloc.aQ); gl.vertexAttribPointer(sloc.aQ, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(sloc.uVP, false, vp);
      gl.uniform4f(sloc.uCol, 0.12, 0.0, 0.01, 0.62);
      [[bride, info.bride], [groom, info.groom]].forEach(function (pair) {
        var p = figPos(pair[0]);
        gl.uniformMatrix4fv(sloc.uM, false, mul(translate(p[0], 0.006, p[2]), scale(pair[1].shadow * (1 - pair[0].lift * 3))));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      gl.uniform4f(sloc.uCol, 0.12, 0.0, 0.01, 0.4);
      for (i = 0; i < 4; i++) {
        gl.uniformMatrix4fv(sloc.uM, false, mul(translate((i % 2 ? 1 : -1) * PILLAR, 0.006, (i < 2 ? 1 : -1) * PILLAR), scale(0.42)));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      /* firelight on the floor */
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform4f(sloc.uCol, 1.0, 0.5, 0.12, 0.16 * flick);
      gl.uniformMatrix4fv(sloc.uM, false, mul(translate(0, 0.008, 0), scale(1.9)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      /* and a glow that always faces the viewer */
      gl.uniform4f(sloc.uCol, 1.0, 0.5, 0.14, 0.24 * flick);
      gl.uniformMatrix4fv(sloc.uM, false, mulAll(translate(0, 0.86, 0), rotY(yaw), rotX(Math.PI / 2 - pitch), scale(0.95)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(sloc.aQ);

      /* the fire: tongues of flame that lean and stretch, each on its own beat */
      gl.useProgram(prog);
      gl.enableVertexAttribArray(loc.aPos); gl.enableVertexAttribArray(loc.aNor); gl.enableVertexAttribArray(loc.aCol); gl.enableVertexAttribArray(loc.aMat);
      for (i = 0; i < 7; i++) {
        t = clock * (5.2 + i * 0.83) + i * 1.7; s = i === 0 ? 1 : 0.62 + 0.1 * (i % 3);
        g = still ? 1 : 0.86 + 0.2 * Math.sin(t) + 0.08 * Math.sin(t * 2.3);
        f = i === 0 ? [0, 0] : [Math.sin(i * 1.05) * 0.13, Math.cos(i * 1.05) * 0.13];
        m = mulAll(translate(f[0], 0.37, f[1]), rotZ(still ? 0 : Math.sin(t * 0.7) * 0.14), rotX(still ? 0 : Math.cos(t * 0.6) * 0.14), scale(0.2 * s, 0.82 * s * g, 0.2 * s));
        gl.uniform1f(loc.uGlow, 0.2);
        drawMesh(meshes.flame, m);
        gl.uniform1f(loc.uGlow, 0.24);
        drawMesh(meshes.flame, mul(m, scale(0.55, 0.62, 0.55)));
      }
      gl.depthMask(true); gl.disable(gl.BLEND);

      if (!firstFrame) { firstFrame = true; if (opts.onReady) { opts.onReady(); } }
    }

    function kick() { dirty = true; if (running && !raf && !lost) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function tween(o, k, to, dur, delay, ease) {
      /* With motion switched off there is nothing to play: go straight there. */
      if (still) { o[k] = to; return; }
      anims.push({ o: o, k: k, from: null, to: to, t0: performance.now() + (delay || 0), d: dur, e: ease || inOut });
    }
    /* The nearest whole turn to where something is facing now. */
    function front(v) { return Math.round(v / TAU) * TAU; }

    var api = {
      start: function () { if (running || lost) { return; } running = true; kick(); },
      stop: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      redraw: kick,
      setStill: function (v) { still = !!v; kick(); },
      phase: function () { return phase; },
      turn: function (by) { if (still) { cam.yaw -= by * 0.6; } else { cam.vel -= by * 3.2; cam.sway = 0.35; } kick(); },
      drag: function (dx, dy) { cam.yaw -= dx * 0.008; cam.pitch = Math.max(0.03, Math.min(0.42, cam.pitch + dy * 0.004)); cam.vel = 0; cam.sway = 0; kick(); },
      release: function (vx) { cam.vel = -vx * 0.008; tween(cam, "sway", 0.5, 2400, 1500); kick(); },

      /* The garlands, then the knot. Returns how long it plays, in milliseconds. */
      varmala: function () {
        if (phase !== 0) { return 0; }
        phase = 1;
        /* she garlands him: he bows to take it */
        tween(groom, "pitch", 0.2, 700, 250); tween(groom, "pitch", 0, 800, 1500);
        tween(garland[0], "t", 1, 1900, 0);
        /* then he garlands her */
        tween(bride, "pitch", 0.14, 700, 2200); tween(bride, "pitch", 0, 800, 3400);
        tween(garland[1], "t", 1, 1900, 2000);
        /* they turn to walk, she ahead, the fire on their right, and the knot is tied */
        tween(bride, "ry", bride.goal - Math.PI / 2, 1000, 4100); tween(groom, "ry", groom.goal - Math.PI / 2, 1000, 4100);
        tween(tie, "k", 1, 1100, 4800, outCubic);
        tween(cam, "sway", 0.6, 900, 4100);
        kick();
        return still ? 0 : 6000;
      },
      /* One phera: once round the fire. */
      step: function () {
        if (phase < 1 || phase >= 8) { return 0; }
        phase += 1;
        [bride, groom].forEach(function (f) {
          f.goal -= TAU;
          tween(f, "a", f.goal, 3400, 0);
          tween(f, "ry", f.goal - Math.PI / 2, 3400, 0);
          tween(f, "walk", 1, 300, 0, outCubic); tween(f, "walk", 0, 400, 3000);
        });
        kick();
        return still ? 0 : 3500;
      },
      /* They turn to the guests, and she takes her place on his left. */
      finish: function () {
        if (phase !== 8) { return 0; }
        phase = 9;
        tween(bride, "ry", front(bride.ry) + 0.0, 900, 0); tween(groom, "ry", front(groom.ry) + 0.0, 900, 0);
        /* she passes in front of him, he steps back to let her */
        tween(bride, "r", 2.02, 900, 700); tween(bride, "r", WALK, 900, 1600);
        tween(groom, "r", 1.0, 900, 700); tween(groom, "r", WALK, 900, 1600);
        tween(bride, "a", bride.goal + 2 * APART, 1800, 700); tween(groom, "a", groom.goal - 2 * APART, 1800, 700);
        tween(tie, "side", 1, 1800, 700);
        tween(bride, "ry", front(bride.ry) - 0.18, 600, 2500); tween(groom, "ry", front(groom.ry) + 0.18, 600, 2500);
        tween(bride, "pitch", 0.12, 600, 3000); tween(bride, "pitch", 0, 700, 3700);
        tween(groom, "pitch", 0.12, 600, 3000); tween(groom, "pitch", 0, 700, 3700);
        tween(cam, "sway", 1, 1500, 0);
        tween(cam, "yaw", front(cam.yaw), 1500, 0);
        kick();
        return still ? 0 : 4400;
      },
      reset: function () {
        anims.length = 0; phase = 0;
        bride.a = bride.goal = -APART; bride.r = WALK; bride.ry = Math.PI / 2 - TURN; bride.pitch = 0; bride.walk = 0;
        groom.a = groom.goal = APART; groom.r = WALK; groom.ry = -Math.PI / 2 + TURN; groom.pitch = 0; groom.walk = 0;
        garland[0].t = 0; garland[1].t = 0; tie.k = 0; tie.side = 0; cam.sway = 1; cam.vel = 0;
        tween(cam, "yaw", front(cam.yaw), 900, 0);
        kick();
      }
    };

    /* A phone under pressure can take the picture away. Say so, so the page
       can show its still, and put everything back when it returns. */
    var wasRunning = false;
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); wasRunning = running; lost = true; ready = false; building += 1; api.stop();
      if (opts.onLost) { opts.onLost(); }
    });
    canvas.addEventListener("webglcontextrestored", function () {
      lost = false;
      try { programs(); } catch (e) { if (opts.onFail) { opts.onFail(); } return; }
      build();
      if (wasRunning) { api.start(); }
    });

    try { programs(); } catch (e) { return null; }
    build();
    return api;
  }

  window.WeddingScene = { create: create };
}());
