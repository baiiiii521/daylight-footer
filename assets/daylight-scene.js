/*! daylight-scene.js — a painted, time-of-day canvas scene for footers and banners.
 *  No dependencies. Works as a <script> (window.DaylightScene) or a side-effect import.
 *
 *  const scene = DaylightScene.create(el, { city: 'hcm', mode: 'live' });
 *
 *  Logical frame: 1600 × 600 units, horizon at y = 360. Presets paint into that frame;
 *  the engine cover-fits it on wide screens and asks the preset to re-compose on portrait.
 */
(function (root) {
"use strict";
const W = 1600, H = 600, HZ = 360;

/* ───────────── math + colour ───────────── */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const WHITE = [255, 255, 255];

/* ───────────── palettes (solar phase: 6 = sunrise, 12 = solar noon, 18 = sunset) ───────────── */
const CK = ['skyTop','skyMid','skyHor','glow','cloudLit','cloudShade','haze','islandLit','islandShade','cliffLit','cliffShade','tree','seaFar','seaNear','seaHi','seaLo','foam','reflect'];
const NK = ['sun','glowA','stars','moon','birds','warm'];
const NIGHT = ['#070b24','#121a45','#27306a','#6c74c9','#4a5290','#1b2152','#222a5c','#2a2f62','#121633','#3a3a6e','#15152f','#0b1424','#1a2860','#0a1233','#3a4c95','#0a1438','#8a96d0','#c9d2ff'];
const NIGHTN = [0, .15, 1, 1, 0, .5];
const RAW_PAINTERLY = [
  [0,    NIGHT, NIGHTN],
  [4.9,  ['#142257','#43478a','#c78aa2','#ffb09a','#c993b8','#4a4684','#6a5f9c','#6a4f86','#2c2552','#7a5a8e','#2e2650','#172238','#4b5a9e','#1c2a62','#8a8fd0','#22306a','#d8d4f0','#ffc6b0'], [0,.45,.35,.3,0,.4]],
  [6.1,  ['#3b6cc0','#d7a6cf','#ffc48c','#ffe2a8','#ffd0c0','#a68ac8','#b18fbf','#c27a8a','#5a4a7e','#e59a7a','#5e4a7c','#22344a','#7d8fd0','#2d5aa6','#c5d0f5','#2e57a2','#fff2ea','#ffe0a8'], [1,.95,0,0,.6,1]],
  [8,    ['#3f8fe6','#9fd0f4','#fff0d2','#fff6dc','#ffffff','#b9c8e8','#9fb3d8','#8f8fb0','#4f5a80','#d8a070','#6a5a70','#24452e','#5aa7e6','#1f6fc4','#b8e2fa','#1d5fae','#ffffff','#fff8e0'], [1,.5,0,0,1,.5]],
  [12,   ['#2a7be0','#6fb9f2','#cfeaf9','#ffffff','#ffffff','#b2c6e6','#93aed6','#8a8aa6','#4a557a','#cf9a68','#6a586a','#234a2c','#3f9de6','#1468c0','#9fdcf8','#1458a8','#ffffff','#ffffff'], [1,.35,0,0,1,.35]],
  [15.5, ['#2f80de','#84c0ee','#ffe6bc','#fff0c8','#fff4e2','#b7b8e0','#a2a6d4','#a0808f','#4f4f7c','#e0985a','#6a4f72','#23432e','#4a9be2','#1a62bc','#ade0f8','#1856a8','#ffffff','#fff2cc'], [1,.55,0,0,1,.6]],
  [17.4, ['#2a86ea','#f6b3a6','#ffb24a','#ffe38a','#ffd39c','#c19ad8','#9a86c8','#c86a4a','#5a3f6e','#f08a3a','#6e4676','#1f3c34','#4a74d6','#1d5cc4','#5ad0e6','#2a4aa8','#ffffff','#ffd27a'], [1,1,0,0,1,1]],
  [18.5, ['#2a3f86','#b06a9a','#ff7a4a','#ff9a5a','#ff9a78','#6c4c8e','#6a4f8c','#7a3e5a','#2e2348','#a64a4a','#3a2848','#141e2c','#4a4c9e','#1a2a72','#8a6ac0','#1c2a6a','#e8c8d8','#ff9a5a'], [1,.9,.1,0,.5,1]],
  [19.6, ['#121b4c','#343a7c','#8a5c8e','#c87a9a','#6a5a96','#252a5e','#33356e','#3a3266','#171838','#4a3a6a','#1a1838','#0c1422','#2c3478','#0e1844','#4a52a0','#0e1a4a','#a8a8d8','#c890b0'], [0,.4,.6,.6,0,.3]],
  [21,   NIGHT, NIGHTN],
  [24,   NIGHT, NIGHTN],
];
function buildPalette(raw) {
  return raw.map(([p, c, n]) => { const o = {p}; CK.forEach((k, i) => o[k] = hex(c[i])); NK.forEach((k, i) => o[k] = n[i]); return o; });
}
/** Derive a variant by pulling every colour toward a tint and optionally lifting it toward white. */
function tintPalette(kf, rgb, amount, lift = 0) {
  return kf.map(k => { const o = Object.assign({}, k); CK.forEach(key => o[key] = mix(mix(k[key], rgb, amount), WHITE, lift)); return o; });
}
const PAINTERLY = buildPalette(RAW_PAINTERLY);
const PALETTES = {
  painterly: PAINTERLY,                                    // saturated gouache / anime coast
  dreamcore: tintPalette(PAINTERLY, [232, 200, 240], .3, .06), // hazy lavender-pink, soft contrast
  vintage: tintPalette(PAINTERLY, [226, 190, 140], .2),        // warm faded film stock
};
function resolvePalette(p) {
  if (!p) return PAINTERLY;
  if (typeof p === 'string') return PALETTES[p] || PAINTERLY;
  if (Array.isArray(p) && Array.isArray(p[0])) return buildPalette(p);   // raw [phase, colours[18], numbers[6]]
  return p;
}
function paletteAt(kf, p) {
  p = ((p % 24) + 24) % 24;
  let i = 0; while (i < kf.length - 2 && kf[i + 1].p <= p) i++;
  const a = kf[i], b = kf[i + 1], t = sstep(0, 1, (p - a.p) / (b.p - a.p));
  const o = {}; CK.forEach(k => o[k] = mix(a[k], b[k], t)); NK.forEach(k => o[k] = lerp(a[k], b[k], t));
  return o;
}

/* ───────────── cities + solar times ───────────── */
const CITIES = {
  hcm:   {zh: '胡志明市', en: 'Ho Chi Minh City', lat: 10.82, lon: 106.63, timeZone: 'Asia/Ho_Chi_Minh', tz: 7},
  hanoi: {zh: '河内', en: 'Hanoi', lat: 21.03, lon: 105.85, timeZone: 'Asia/Ho_Chi_Minh', tz: 7},
  bkk:   {zh: '曼谷', en: 'Bangkok', lat: 13.75, lon: 100.50, timeZone: 'Asia/Bangkok', tz: 7},
  sha:   {zh: '上海', en: 'Shanghai', lat: 31.23, lon: 121.47, timeZone: 'Asia/Shanghai', tz: 8},
  bj:    {zh: '北京', en: 'Beijing', lat: 39.90, lon: 116.40, timeZone: 'Asia/Shanghai', tz: 8},
  szx:   {zh: '深圳', en: 'Shenzhen', lat: 22.54, lon: 114.06, timeZone: 'Asia/Shanghai', tz: 8},
  gz:    {zh: '广州', en: 'Guangzhou', lat: 23.13, lon: 113.26, timeZone: 'Asia/Shanghai', tz: 8},
  hk:    {zh: '香港', en: 'Hong Kong', lat: 22.32, lon: 114.17, timeZone: 'Asia/Hong_Kong', tz: 8},
  sg:    {zh: '新加坡', en: 'Singapore', lat: 1.35, lon: 103.82, timeZone: 'Asia/Singapore', tz: 8},
};
/** The visitor's own clock. Latitude is a rough guess (no geolocation), longitude follows the UTC offset. */
function viewerCity() {
  const tz = -new Date().getTimezoneOffset() / 60;
  let timeZone; try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  return {zh: '本地', en: 'Local time', lat: 22, lon: tz * 15, tz, timeZone};
}
function resolveCity(c) {
  if (c === 'viewer') return viewerCity();
  if (typeof c === 'string') return CITIES[c] || CITIES.hcm;
  return c || CITIES.hcm;
}
/** UTC offset in hours; honours DST when the city has an IANA timeZone. */
function tzOffset(city, date) {
  if (city.timeZone && typeof Intl !== 'undefined') {
    try {
      const f = new Intl.DateTimeFormat('en-US', {timeZone: city.timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
      const p = {}; f.formatToParts(date).forEach(x => p[x.type] = x.value);
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000) / 60;
    } catch (e) { /* fall through */ }
  }
  return city.tz || 0;
}
/** NOAA sunrise equation. Returns local clock hours. */
function sunTimes(city, date = new Date()) {
  city = resolveCity(city);
  const tz = tzOffset(city, date);
  const local = new Date(date.getTime() + tz * 3600e3);
  const N = Math.floor((local - Date.UTC(local.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  const g = 2 * Math.PI / 365 * (N - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lat = city.lat * Math.PI / 180;
  const arg = clamp(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl), -1, 1);
  const ha = Math.acos(arg) * 180 / Math.PI;
  let rise = (720 - 4 * (city.lon + ha) - eq) / 60 + tz, set = (720 - 4 * (city.lon - ha) - eq) / 60 + tz;
  if (set - rise < .25) { const m = (rise + set) / 2; rise = m - .125; set = m + .125; }     // polar night guard
  if (set - rise > 23.75) set = rise + 23.75;                                                // polar day guard
  return {rise, set, tz};
}
function cityHour(city, date = new Date()) {
  city = resolveCity(city);
  return (((date.getTime() / 3600e3 + tzOffset(city, date)) % 24) + 24) % 24;
}
/** Map a clock hour to solar phase so sunrise is always 6 and sunset always 18. */
function toPhase(h, rise, set) {
  if (h >= rise && h <= set) return 6 + 12 * (h - rise) / (set - rise);
  let d = h - set; if (d < 0) d += 24;
  return (18 + 12 * d / (24 - (set - rise))) % 24;
}
const PHASES = [[4.5,'night','夜晚','Night'],[5.7,'blue','黎明前','Blue hour'],[7,'sunrise','日出','Sunrise'],[11,'morning','上午','Morning'],[14,'midday','正午','Midday'],[16.8,'afternoon','午后','Afternoon'],[18.2,'sunset','日落','Sunset'],[19.8,'dusk','暮色','Dusk'],[24.01,'night','夜晚','Night']];
function phaseName(p) { const x = PHASES.find(r => p < r[0]) || PHASES[0]; return {key: x[1], zh: x[2], en: x[3]}; }
const fmt = h => { const m = Math.floor((((h % 24) + 24) % 24) * 60 + 1e-6); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

function sunState(p, layout) {
  const [s0, s1] = layout.sun, [m0, m1] = layout.moon;
  const u = (p - 6) / 12, e = Math.sin(Math.PI * u), uc = clamp(u, 0, 1);
  const sx = lerp(s0, s1, uc), sy = HZ - e * 300;
  const gx = p < 6 ? s0 : (p > 18 ? s1 : sx), gy = clamp(sy, 40, HZ);
  const q = ((((p - 18) % 24) + 24) % 24) / 12;
  let mx = 0, my = 0, mvis = 0;
  if (q <= 1) { mvis = Math.sin(Math.PI * q); mx = lerp(m0, m1, q); my = HZ - mvis * 270; }
  return {sx, sy, e, gx, gy, mx, my, mvis};
}

/* ───────────── painting toolkit (shared by all presets) ───────────── */
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function dab(c, x, y, l, w, a, col, al) { c.globalAlpha = al; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.max(.1, l), Math.max(.1, w), a, 0, 6.2832); c.fill(); }
function disc(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }

function drawSky(c, P, S) {
  const g = c.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, css(P.skyTop)); g.addColorStop(.5, css(P.skyMid)); g.addColorStop(1, css(P.skyHor));
  c.fillStyle = g; c.fillRect(-40, -40, W + 80, HZ + 60);
  const R = mulberry(11);
  for (let i = 0; i < 240; i++) {
    const y = Math.pow(R(), 1.1) * HZ, x = R() * W, t = y / HZ;
    const base = t < .5 ? mix(P.skyTop, P.skyMid, t * 2) : mix(P.skyMid, P.skyHor, (t - .5) * 2);
    dab(c, x, y, 40 + R() * 140, 2 + R() * 5, -0.12 + R() * .06, css(mix(base, R() < .5 ? WHITE : P.skyTop, .08 + R() * .08)), .2);
  }
  c.globalAlpha = 1;
  c.save(); c.translate(S.gx, HZ); c.scale(2.4, .62);
  const rg = c.createRadialGradient(0, 0, 0, 0, 0, 520);
  rg.addColorStop(0, css(P.glow, P.glowA * .9)); rg.addColorStop(.35, css(P.glow, P.glowA * .38)); rg.addColorStop(1, css(P.glow, 0));
  c.fillStyle = rg; c.fillRect(-900, -800, 1800, 1600); c.restore();
}
function drawSunMoon(c, P, S) {
  if (P.moon > .01 && S.mvis > 0) {
    c.globalAlpha = P.moon;
    const mg = c.createRadialGradient(S.mx, S.my, 0, S.mx, S.my, 120);
    mg.addColorStop(0, 'rgba(230,232,255,.45)'); mg.addColorStop(1, 'rgba(230,232,255,0)');
    c.fillStyle = mg; disc(c, S.mx, S.my, 120);
    c.fillStyle = '#f3f1ff'; disc(c, S.mx, S.my, 20);
    c.fillStyle = 'rgba(180,182,220,.35)'; disc(c, S.mx - 6, S.my - 4, 5); disc(c, S.mx + 7, S.my + 6, 3.5);
  }
  if (P.sun > .01 && S.sy < HZ + 40) {
    c.globalAlpha = P.sun;
    const core = mix(WHITE, P.glow, .22);
    const hg = c.createRadialGradient(S.sx, S.sy, 0, S.sx, S.sy, 150);
    hg.addColorStop(0, css(core, .75)); hg.addColorStop(.25, css(P.glow, .35)); hg.addColorStop(1, css(P.glow, 0));
    c.fillStyle = hg; disc(c, S.sx, S.sy, 150);
    c.fillStyle = css(core); disc(c, S.sx, S.sy, 30);
  }
  c.globalAlpha = 1;
}
/** Seeded cumulus: a cluster of overlapping puffs with a flat-ish base. */
function cumulus(G, x, y, w, h, n, alpha) {
  const puffs = [], bottom = y + h;
  for (let i = 0; i < n; i++) {
    const u = .08 + .84 * G(), bell = Math.sin(Math.PI * u);
    const r = (0.3 + 0.2 * G()) * h * (0.6 + 0.5 * bell);
    const py = bottom - r * 0.75 - (h - r * 1.5) * bell * G() * 0.95;
    puffs.push({x: x + w * u, y: py, r, v: G()});
  }
  return {puffs, cx: x + w / 2, cy: y + h / 2, bottom, alpha};
}
function makeCirrus(G, x0, x1, yTop, yBottom, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = G(), k = G(), x = x0 + u * (x1 - x0), y = yBottom - u * (yBottom - yTop) + (k - .5) * 130;
    if (y < -10) continue;
    out.push({x, y, l: 40 + G() * 110, w: 3 + G() * 6, a: -0.19 + (G() - .5) * .08, o: .4 + G() * .5});
  }
  return out;
}
function drawClouds(c, P, S, L, clouds, cirrus, cdx = 0) {
  const R = mulberry(17);
  for (const cl of clouds) {
    let dx = L.x - cl.cx, dy = L.y - cl.cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    c.globalAlpha = cl.alpha;
    c.fillStyle = css(mix(P.cloudShade, P.skyMid, .12));
    for (const p of cl.puffs) disc(c, p.x, p.y, p.r);
    for (const p of cl.puffs) {
      const near = clamp(1 - Math.hypot(p.x - S.gx, p.y - S.gy) / 750, 0, 1) * P.glowA * .55;
      c.fillStyle = css(mix(mix(P.cloudShade, P.cloudLit, .55 + .45 * p.v), P.glow, near));
      disc(c, p.x + dx * p.r * .12, p.y + dy * p.r * .12 - p.r * .1, p.r * .93);
    }
    const rim = css(mix(P.cloudLit, WHITE, .35)), mid = css(mix(P.cloudLit, P.cloudShade, .25));
    for (const p of cl.puffs) for (let k = 0; k < 5; k++) {
      const ang = Math.atan2(dy, dx) + (R() - .5) * 2, rr = p.r * (.15 + R() * .55);
      dab(c, p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, p.r * (.18 + R() * .14), p.r * (.07 + R() * .06), (R() - .5) * 1.2, k < 3 ? rim : mid, .38 * cl.alpha);
    }
    const under = css(mix(P.cloudShade, P.haze, .3));
    for (const p of cl.puffs) if (p.y + p.r > cl.bottom - 18) dab(c, p.x, p.y + p.r * .55, p.r * .62, p.r * .18, 0, under, .42 * cl.alpha);
  }
  const cc = mix(P.cloudLit, P.glow, .3), hi = mix(P.cloudLit, WHITE, .4);
  for (const s of cirrus || []) {
    dab(c, s.x + cdx, s.y, s.l, s.w, s.a, css(cc), .5 * s.o);
    dab(c, s.x + cdx + 6, s.y - 1.5, s.l * .7, s.w * .35, s.a, css(hi), .5 * s.o);
  }
  c.globalAlpha = 1;
}
function drawSea(c, P) {
  const sg = c.createLinearGradient(0, HZ, 0, H);
  sg.addColorStop(0, css(mix(P.seaFar, P.skyHor, .28))); sg.addColorStop(.25, css(P.seaFar)); sg.addColorStop(1, css(P.seaNear));
  c.fillStyle = sg; c.fillRect(-40, HZ, W + 80, H - HZ + 40);
  const R = mulberry(23);
  for (let i = 0; i < 1900; i++) {
    const t = Math.pow(R(), 1.5), y = HZ + 1 + t * (H - HZ), x = R() * W;
    let col = mix(P.seaLo, P.seaHi, sstep(.3, .8, noise(x / 150, y / 9)));
    if (t < .12) col = mix(col, P.skyHor, .35 * (1 - t / .12));
    dab(c, x, y, 6 + t * 80 + R() * 20, .8 + t * 4.5, (R() - .5) * .05, css(col), .5);
  }
  const foam = css(P.foam);
  for (let i = 0; i < 560; i++) {
    const t = .15 + R() * .85, y = HZ + t * (H - HZ), x = R() * W, n = noise(x / 110, y / 7);
    const l = 4 + t * 40;
    if (n < .7) continue;
    dab(c, x, y, l, .6 + t * 2.2, (R() - .5) * .08, foam, clamp((n - .6) * 2.5, 0, 1) * .75);
  }
  c.globalAlpha = 1;
}
/** Where the light column on the water sits and how strong it is (sun or afterglow, plus moon). */
function reflState(P, S) {
  const sunVis = sstep(-0.08, 0.03, S.e);
  return {ax: S.gx, str: P.warm * clamp(sunVis + .4 * P.glowA, 0, 1), mx: S.mx, mstr: P.moon * .55 * S.mvis};
}
function drawReflection(c, P, ax, str, seed) {
  if (str < .02) return;
  c.save(); c.globalCompositeOperation = 'screen';
  const R = mulberry(seed), col = css(P.reflect);
  for (let i = 0; i < 380; i++) {
    const t = Math.pow(R(), 1.25), y = HZ + 1 + t * (H - HZ - 30);
    const g = (R() + R() + R() - 1.5) / 1.5, x = ax + g * (8 + t * 170);
    dab(c, x, y, 4 + t * 38 + R() * 10, .7 + t * 2.6, 0, col, .85 * (1 - Math.abs(g)) * (1 - t * .55) * str);
  }
  const lg = c.createLinearGradient(ax - 280, 0, ax + 280, 0);
  lg.addColorStop(0, css(P.reflect, 0)); lg.addColorStop(.5, css(P.reflect, .9 * str)); lg.addColorStop(1, css(P.reflect, 0));
  c.globalAlpha = 1; c.fillStyle = lg; c.fillRect(ax - 280, HZ - 1.5, 560, 3);
  c.restore();
}
function drawReflections(c, P, refl) {
  drawReflection(c, P, refl.ax, refl.str, 31);
  if (refl.mstr > .02) drawReflection(c, P, refl.mx, refl.mstr, 37);
}
/** Faceted gouache rock / cliff: base fill + noise-driven light/shade dabs clipped to the shape. */
function paintRock(c, P, pts, bbox, count, bias, seed, lit = P.cliffLit, shade = P.cliffShade) {
  poly(c, pts); c.fillStyle = css(shade); c.fill();
  c.save(); poly(c, pts); c.clip();
  const R = mulberry(seed);
  for (let i = 0; i < count; i++) {
    const x = bbox[0] + R() * (bbox[2] - bbox[0]), y = bbox[1] + R() * (bbox[3] - bbox[1]);
    const f = noise(x / 42, y / 34) * .7 + noise(x / 13 + 50, y / 13) * .3;
    let col = mix(shade, lit, sstep(.38, .7, f + bias));
    if (R() < .25) col = mix(col, P.haze, .25);
    dab(c, x, y, 8 + R() * 20, 3.5 + R() * 7, -0.95 + (R() - .5) * .5, css(col), .92);
  }
  c.restore(); c.globalAlpha = 1;
}
/** Hazy silhouette (distant range, skyline, hills): gradient fill + a few facet dabs. */
function paintHaze(c, P, pts, bbox, seed) {
  const hg = c.createLinearGradient(0, bbox[1], 0, bbox[3]);
  hg.addColorStop(0, css(mix(P.haze, P.skyMid, .2))); hg.addColorStop(1, css(mix(P.haze, P.skyHor, .38)));
  poly(c, pts); c.fillStyle = hg; c.fill();
  c.save(); poly(c, pts); c.clip();
  const R = mulberry(seed);
  for (let i = 0; i < 140; i++) {
    const x = bbox[0] + R() * (bbox[2] - bbox[0]), y = bbox[1] + R() * (bbox[3] - bbox[1]);
    dab(c, x, y, 10 + R() * 18, 3 + R() * 4, -0.5, css(R() < .5 ? mix(P.haze, P.islandShade, .3) : mix(P.haze, P.glow, .18)), .5);
  }
  c.restore(); c.globalAlpha = 1;
}
/** Island / hill lit from the side facing the light. */
function paintIsland(c, P, isl, L, seed) {
  poly(c, isl.pts); c.fillStyle = css(P.islandShade); c.fill();
  c.save(); poly(c, isl.pts); c.clip();
  const R = mulberry(seed), side = Math.sign(L.x - isl.peak) || 1;
  const ys = isl.pts.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < 260; i++) {
    const x = isl.peak - isl.half * 1.1 + R() * isl.half * 2.2, y = y0 + R() * (y1 - y0 + 2);
    const lit = clamp(.5 + (x - isl.peak) / isl.half * .65 * side, 0, 1) * (.55 + .45 * noise(x / 14, y / 10));
    dab(c, x, y, 6 + R() * 12, 2.5 + R() * 4, -0.7 * side, css(mix(P.islandShade, P.islandLit, lit)), .9);
  }
  c.restore(); c.globalAlpha = 1;
}
function pine(c, x, base, h, P, side) {
  const w = h * .34, L = 6, ix = x | 0;
  const wk = k => w * (k / L) * (.75 + .25 * hash(k, ix));
  const yk = k => base - h + k * h / L;
  const pts = [[x, base - h]];
  for (let k = 1; k <= L; k++) { pts.push([x + wk(k), yk(k)]); if (k < L) pts.push([x + wk(k) * .42, yk(k) - h / L * .12]); }
  pts.push([x + w * .07, base + 6], [x - w * .07, base + 6]);
  for (let k = L; k >= 1; k--) { pts.push([x - wk(k), yk(k)]); if (k > 1) pts.push([x - wk(k - 1) * .42, yk(k - 1) - h / L * .12]); }
  poly(c, pts); c.globalAlpha = 1; c.fillStyle = css(P.tree); c.fill();
  const rim = css(mix(P.tree, P.cliffLit, .38));
  for (let k = 1; k <= L; k++) dab(c, x + side * wk(k) * .55, yk(k) - h / L * .35, wk(k) * .35, 2.2, side * .5, rim, .7);
  c.globalAlpha = 1;
}
function inClouds(clouds, x, y) { for (const cl of clouds) for (const p of cl.puffs) if ((x - p.x) ** 2 + (y - p.y) ** 2 < (p.r * 1.05) ** 2) return true; return false; }
function makeStars(G, clouds, n = 170) {
  const out = [];
  while (out.length < n) {
    const x = G() * W, y = Math.pow(G(), 1.4) * 330;
    if (inClouds(clouds, x, y)) continue;
    out.push({x, y, r: .7 + G() * 1.4, b: .5 + G() * .5, ph: G() * 6.28, sp: .6 + G() * 2});
  }
  return out;
}
const makeGlints = (G, n = 80) => Array.from({length: n}, () => ({t: Math.pow(G(), 1.3), g: (G() + G() + G() - 1.5) / 1.5, ph: G() * 6.28, sp: 1.5 + G() * 3}));
const makeBirds = (G, n = 4) => Array.from({length: n}, () => ({x0: G() * 1760, y: 140 + G() * 95, v: 16 + G() * 10, s: 8 + G() * 7, f: 5 + G() * 3, ph: G() * 6.28}));

function drawStars(c, P, t, stars, hidden, still) {
  if (P.stars <= .02) return;
  c.fillStyle = '#ffffff';
  for (const s of stars) {
    if (hidden && hidden(s.x, s.y)) continue;
    c.globalAlpha = P.stars * s.b * (still ? .8 : .55 + .45 * Math.sin(t * s.sp + s.ph));
    c.fillRect(s.x, s.y, s.r, s.r);
  }
  c.globalAlpha = 1;
}
function drawGlints(c, P, t, glints, refl) {
  if (!refl) return;
  const gl = css(mix(P.reflect, WHITE, .5));
  for (const [ax, str] of [[refl.ax, refl.str], [refl.mx, refl.mstr]]) {
    if (str < .03) continue;
    for (const g of glints) {
      const a = str * Math.pow(Math.max(0, Math.sin(t * g.sp + g.ph)), 4);
      if (a < .02) continue;
      dab(c, ax + g.g * (8 + g.t * 160), HZ + 2 + g.t * (H - HZ - 40), 3 + g.t * 16, .6 + g.t * 1.4, 0, gl, a);
    }
  }
  c.globalAlpha = 1;
}
function drawBirds(c, P, t, birds, span = 1760) {
  if (P.birds <= .02) return;
  c.strokeStyle = css(mix(P.cliffShade, [28, 20, 40], .5)); c.lineCap = 'round';
  for (const b of birds) {
    const x = ((b.x0 + t * b.v) % span) - 80, y = b.y + Math.sin(t * .7 + b.ph) * 6, f = Math.sin(t * b.f + b.ph), s = b.s;
    c.globalAlpha = P.birds * .9; c.lineWidth = s * .2;
    c.beginPath(); c.moveTo(x - s, y - s * .35 * f - s * .1);
    c.quadraticCurveTo(x - s * .45, y - s * .55 * f, x, y);
    c.quadraticCurveTo(x + s * .45, y - s * .55 * f, x + s, y - s * .35 * f - s * .1);
    c.stroke();
  }
  c.globalAlpha = 1;
}

const TOOLS = {W, H, HZ, clamp, lerp, sstep, mulberry, hash, noise, hex, mix, css, WHITE,
  poly, dab, disc, drawSky, drawSunMoon, cumulus, makeCirrus, drawClouds, drawSea, reflState, drawReflection, drawReflections,
  paintRock, paintHaze, paintIsland, pine, makeStars, makeGlints, makeBirds, drawStars, drawGlints, drawBirds};

/* ───────────── presets ───────────── */
const PRESETS = {};
/**
 * registerPreset(name, {
 *   seed,                         // number for the seeded geometry
 *   setup(G, T) -> data,          // build geometry once (G = seeded random 0..1)
 *   layout(vw, portrait) -> {sun:[x0,x1], moon:[x0,x1], ...anything paint() needs},
 *   paint(c, env),                // static layer; env = {P, S, L, layout, data, T}
 *   fx(c, env, t, still)          // optional animated layer (stars, glints, birds)
 * })
 */
function registerPreset(name, def) { PRESETS[name] = def; return def; }

/* Coastal cliff, islands and sea — the reference composition. */
registerPreset('coast', {
  seed: 5,
  setup(G, T) {
    const TOP = [[-20,118],[40,132],[90,148],[140,168],[190,186],[240,204],[285,226],[330,254],[370,282],[410,310],[445,333],[480,352],[515,370]];
    const topY = x => {
      if (x <= TOP[0][0]) return TOP[0][1];
      for (let i = 1; i < TOP.length; i++) if (x <= TOP[i][0]) { const a = TOP[i - 1], b = TOP[i]; return T.lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
      return 400;
    };
    const clouds = [
      T.cumulus(G, 110, 6, 480, 250, 34, 1),
      T.cumulus(G, 560, 150, 300, 110, 16, .95),
      T.cumulus(G, 1390, 110, 260, 150, 15, .95),
      T.cumulus(G, 880, 250, 360, 74, 12, .85),
      T.cumulus(G, 1160, 272, 300, 58, 10, .8),
    ];
    const cirrus = T.makeCirrus(G, 800, 1620, 15, 165, 38);
    const trees = [];
    for (let i = 0; i < 17; i++) { const x = -10 + i * 19 + G() * 12; trees.push({x, h: T.lerp(150, 46, T.clamp(x / 320, 0, 1)) * (.7 + G() * .5), base: topY(x) + 8}); }
    return {
      TOP, topY, clouds, cirrus, trees,
      CLIFF: [...TOP, [525,386],[470,410],[400,440],[330,470],[250,500],[160,525],[60,545],[-20,560]],
      FACE: [[525,386],[470,410],[400,440],[330,470],[250,500],[160,525],[60,545]],
      FG: [[-20,470],[60,455],[130,462],[200,490],[260,525],[310,565],[340,620],[-20,620]],
      ROCKS: [[[418,392],[440,362],[466,350],[492,356],[512,374],[536,393]], [[536,396],[556,380],[578,376],[600,384],[616,397]], [[640,368],[652,361],[668,363],[676,369]]],
      HAZE: [[200,300],[260,288],[330,284],[400,292],[470,306],[540,318],[600,330],[660,338],[720,346],[790,352],[860,357],[910,362],[200,362]],
      ISLANDS: [
        {pts: [[585,362],[610,345],[640,333],[665,327],[690,335],[720,347],[760,355],[788,362]], peak: 665, half: 110},
        {pts: [[780,362],[800,351],[830,338],[858,325],[882,330],[905,345],[935,355],[962,362]], peak: 860, half: 95},
        {pts: [[988,362],[1000,355],[1014,362]], peak: 1000, half: 14},
      ],
      stars: T.makeStars(G, clouds), glints: T.makeGlints(G), birds: T.makeBirds(G),
    };
  },
  layout(vw, portrait) {
    if (!portrait) return {kx: 1, ki: 1, ia: 585, sun: [1040, 1290], moon: [1380, 640], cdx: 0, bspan: 1760};
    // Phone: squeeze cliff into the left ~44 %, islands into the middle, sun path on the right.
    return {kx: clamp(.44 * vw / 540, .4, 1), ki: clamp(.4 * vw / 430, .4, 1), ia: .48 * vw,
      sun: [.62 * vw, .9 * vw], moon: [.88 * vw, .42 * vw], cdx: .3 * vw - 800, bspan: vw + 160};
  },
  paint(c, env) {
    const {P, S, L, layout: Y, data: D, T} = env;
    T.drawSky(c, P, S);
    T.drawSunMoon(c, P, S);
    T.drawClouds(c, P, S, L, D.clouds, D.cirrus, Y.cdx);
    // distant range + islands (own horizontal transform so phones can re-compose)
    c.save(); c.translate(Y.ia, 0); c.scale(Y.ki, 1); c.translate(-585, 0);
    const Li = {x: (L.x - Y.ia) / Y.ki + 585, y: L.y};
    T.paintHaze(c, P, D.HAZE, [200, 284, 910, 362], 19);
    D.ISLANDS.forEach((isl, i) => T.paintIsland(c, P, isl, Li, 20 + i));
    const ah = c.createLinearGradient(0, 326, 0, T.HZ + 2);
    ah.addColorStop(0, T.css(P.skyHor, 0)); ah.addColorStop(1, T.css(P.skyHor, .38));
    c.fillStyle = ah; c.fillRect(190, 326, 840, 37);
    c.restore();
    T.drawSea(c, P);
    env.refl = T.reflState(P, S);
    T.drawReflections(c, P, env.refl);
    // cliff, trees, shore (own horizontal squeeze)
    c.save(); c.scale(Y.kx, 1);
    const Lc = {x: L.x / Y.kx, y: L.y};
    T.paintRock(c, P, D.CLIFF, [-20, 112, 530, 565], 2300, Lc.x > 500 ? .06 : -.06, 41);
    c.save(); T.poly(c, D.CLIFF); c.clip();
    const R = T.mulberry(43);
    for (let i = 0; i < 380; i++) { const x = -20 + R() * 500, y = D.topY(x) + R() * 18; T.dab(c, x, y, 6 + R() * 12, 2.5 + R() * 3, -0.5, T.css(T.mix(P.tree, P.cliffLit, .38 + R() * .22)), .85); }
    const sh = c.createLinearGradient(0, 360, 0, 565);
    sh.addColorStop(0, T.css(P.cliffShade, 0)); sh.addColorStop(1, T.css(P.cliffShade, .6));
    c.globalAlpha = 1; c.fillStyle = sh; c.fillRect(-20, 360, 560, 210);
    c.restore();
    const side = Math.sign(Lc.x - 150) || 1;
    for (const t of D.trees) T.pine(c, t.x, t.base, t.h, P, side);
    D.ROCKS.forEach((r, i) => T.paintRock(c, P, r, [410, 345, 680, 400], 160, -.04, 50 + i));
    const R2 = T.mulberry(61), foam = T.css(P.foam);
    for (let i = 0; i < 420; i++) {
      const s = Math.floor(R2() * (D.FACE.length - 1)), a = D.FACE[s], b = D.FACE[s + 1], t = R2();
      const x = T.lerp(a[0], b[0], t), y = T.lerp(a[1], b[1], t), off = Math.pow(R2(), 1.6) * 38;
      T.dab(c, x + off * .6, y + off * .8 - 4, 5 + R2() * 14, 1.5 + R2() * 3, -0.35 + (R2() - .5) * .6, foam, .75 * (1 - off / 40));
    }
    for (let i = 0; i < 180; i++) {
      const ang = -Math.PI / 2 + (R2() - .5) * 2.2, rr = Math.pow(R2(), .7) * 70;
      T.dab(c, 300 + Math.cos(ang) * rr * 1.3, 478 + Math.sin(ang) * rr, 3 + R2() * 9, 2 + R2() * 4, ang, foam, .55 + R2() * .35);
    }
    for (const r of D.ROCKS) { const x0 = r[0][0], x1 = r[r.length - 1][0], y = r[0][1];
      for (let i = 0; i < 40; i++) T.dab(c, T.lerp(x0, x1, R2()), y + R2() * 6, 4 + R2() * 10, 1.2 + R2() * 1.8, 0, foam, .7); }
    T.paintRock(c, P, D.FG, [-20, 450, 345, 620], 700, -.1, 71);
    c.restore();
  },
  fx(c, env, t, still) {
    const {P, layout: Y, data: D, T} = env;
    T.drawStars(c, P, t, D.stars, (x, y) => { const xc = x / Y.kx; return xc < 540 && y > D.topY(xc) - 4; }, still);
    T.drawGlints(c, P, t, D.glints, env.refl);
    T.drawBirds(c, P, t, D.birds, Y.bspan);
  },
});

/* ───────────── film grain tile (shared) ───────────── */
let grainURL = null;
function grainTile() {
  if (grainURL) return grainURL;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), id = g.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  return (grainURL = c.toDataURL('image/png'));
}
let styleInjected = false;
function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return; styleInjected = true;
  const s = document.createElement('style');
  s.textContent = '.dls-layer{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}'
    + '.dls-grain{position:absolute;inset:-60px;opacity:.17;mix-blend-mode:overlay;pointer-events:none;background-size:128px 128px;animation:dls-grain .8s steps(4) infinite}'
    + '@keyframes dls-grain{0%{transform:translate(0,0)}25%{transform:translate(-22px,14px)}50%{transform:translate(18px,-26px)}75%{transform:translate(-10px,-12px)}}'
    + '@media (prefers-reduced-motion:reduce){.dls-grain{animation:none}}';
  document.head.appendChild(s);
}

/* ───────────── engine ───────────── */
const instances = [];
/**
 * create(container, options) -> scene
 * options: preset ('coast'), city (key | {lat,lon,tz,timeZone,zh,en} | 'viewer'), mode ('live'|'manual'|'demo'),
 *          hour (manual start, clock hours), demoSeconds (32), grain (true), palette ('painterly'|'dreamcore'|'vintage'|raw keyframes),
 *          dprCap (1.6), portraitBelow (aspect ratio, 1.4), focusX (0.56), onChange(state)
 */
function create(container, options = {}) {
  injectStyle();
  const o = Object.assign({preset: 'coast', city: 'hcm', mode: 'live', hour: 17.5, demoSeconds: 32, grain: true,
    palette: 'painterly', dprCap: 1.6, portraitBelow: 1.4, focusX: .56, onChange: null}, options);
  const preset = PRESETS[o.preset] || PRESETS.coast;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.style.overflow = 'hidden';
  const sky = document.createElement('canvas'), fx = document.createElement('canvas'), grain = document.createElement('div');
  sky.className = fx.className = 'dls-layer'; grain.className = 'dls-grain';
  sky.setAttribute('aria-hidden', 'true'); fx.setAttribute('aria-hidden', 'true'); grain.setAttribute('aria-hidden', 'true');
  grain.style.backgroundImage = `url(${grainTile()})`;
  grain.hidden = !o.grain;
  container.prepend(sky, fx, grain);

  const data = preset.setup(mulberry(preset.seed || 5), TOOLS);
  const env = {P: null, S: null, L: null, layout: preset.layout(W, false), data, T: TOOLS, refl: null};
  const st = {mode: o.mode, city: resolveCity(o.city), h: o.hour, p: -1, times: null, kf: resolvePalette(o.palette)};
  let view = {s: 1, ox: 0, oy: 0}, dirty = true, lastStatic = -1e9, lastTs = 0, lastLive = -1e9, raf = 0, visible = true, destroyed = false, lastEmit = '';

  const applyView = c => c.setTransform(view.s, 0, 0, view.s, -view.ox * view.s, -view.oy * view.s);
  function light() {
    const S = env.S;
    return S.e > -0.08 ? {x: S.sx, y: S.sy} : (S.mvis > .05 ? {x: S.mx, y: S.my} : {x: S.gx, y: HZ});
  }
  function recompute() { env.P = paletteAt(st.kf, st.p); env.S = sunState(st.p, env.layout); env.L = light(); dirty = true; }
  function setClock(h, force) {
    st.h = ((h % 24) + 24) % 24;
    const p = toPhase(st.h, st.times.rise, st.times.set);
    if (force || st.p < 0 || Math.abs(p - st.p) >= .004) { st.p = p; recompute(); }
    emit();
  }
  function state() {
    return {hour: st.h, time: fmt(st.h), phase: st.p, phaseName: phaseName(st.p), sunrise: st.times.rise, sunset: st.times.set,
      sunriseText: fmt(st.times.rise), sunsetText: fmt(st.times.set), mode: st.mode, city: st.city};
  }
  function emit() {
    if (!o.onChange) return;
    const key = fmt(st.h) + st.mode + st.city.en + st.p.toFixed(2);
    if (key === lastEmit) return; lastEmit = key;
    try { o.onChange(state()); } catch (e) { console.error(e); }
  }
  function resize() {
    const r = container.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, o.dprCap);
    const cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr));
    sky.width = fx.width = cw; sky.height = fx.height = ch;
    if (cw / ch < o.portraitBelow) {
      const s = ch / H, vw = cw / s;
      view = {s, ox: 0, oy: 0}; env.layout = preset.layout(vw, true);
    } else {
      const s = Math.max(cw / W, ch / H), vw = cw / s, vh = ch / s;
      view = {s, ox: clamp(W * o.focusX - vw / 2, 0, W - vw), oy: clamp(HZ - vh * .64, 0, H - vh)};
      env.layout = preset.layout(W, false);
    }
    if (st.times) recompute();
    kick();
  }
  function renderStatic() {
    const c = sky.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, sky.width, sky.height);
    applyView(c); preset.paint(c, env); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  function renderFx(ms) {
    const c = fx.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fx.width, fx.height);
    if (!preset.fx) return;
    applyView(c); preset.fx(c, env, reduce ? 4 : ms / 1000, reduce); c.globalAlpha = 1;
  }
  function frame(ts) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(.1, (ts - lastTs) / 1000); lastTs = ts;
    if (st.mode === 'live' && ts - lastLive > 1000) { lastLive = ts; setClock(cityHour(st.city)); }
    if (st.mode === 'demo') setClock(st.h + dt * 24 / o.demoSeconds);
    if (dirty && ts - lastStatic >= (st.mode === 'live' ? 0 : 50)) { renderStatic(); dirty = false; lastStatic = ts; }
    renderFx(ts);
    if (visible) raf = requestAnimationFrame(frame);   // pause entirely while off-screen
  }
  function kick() { if (!raf && !destroyed) raf = requestAnimationFrame(frame); }

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  ro ? ro.observe(container) : window.addEventListener('resize', resize);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) kick(); }, {rootMargin: '200px'}) : null;
  io && io.observe(container);

  st.times = sunTimes(st.city);
  setClock(st.mode === 'live' ? cityHour(st.city) : st.h, true);
  resize();

  const api = {
    setHour(h) { st.mode = 'manual'; setClock(+h); kick(); },
    setMode(m) { st.mode = m; lastLive = -1e9; if (m === 'live') setClock(cityHour(st.city)); else emit(); kick(); },
    setCity(c) { st.city = resolveCity(c); st.times = sunTimes(st.city); setClock(st.mode === 'live' ? cityHour(st.city) : st.h, true); kick(); },
    setPalette(p) { st.kf = resolvePalette(p); recompute(); kick(); },
    setGrain(on) { grain.hidden = !on; },
    /** CSS linear-gradient of the horizon colour across 24 clock hours — handy for a time slider track. */
    trackGradient() {
      const stops = [];
      for (let h = 0; h <= 24; h++) { const P = paletteAt(st.kf, toPhase(h === 24 ? 23.99 : h, st.times.rise, st.times.set)); stops.push(`${css(mix(P.skyHor, P.skyMid, .45))} ${(h / 24 * 100).toFixed(2)}%`); }
      return `linear-gradient(90deg, ${stops.join(',')})`;
    },
    getState: state,
    redraw() { dirty = true; kick(); },
    destroy() {
      destroyed = true; if (raf) cancelAnimationFrame(raf);
      ro ? ro.disconnect() : window.removeEventListener('resize', resize); io && io.disconnect();
      sky.remove(); fx.remove(); grain.remove();
      const i = instances.indexOf(api); if (i >= 0) instances.splice(i, 1);
    },
  };
  instances.push(api);
  return api;
}

const DaylightScene = {create, registerPreset, PRESETS, PALETTES, buildPalette, tintPalette, CITIES,
  sunTimes, cityHour, toPhase, phaseName, formatHour: fmt, paletteAt, tools: TOOLS, instances, version: '1.0.0'};
root.DaylightScene = DaylightScene;
if (typeof module === 'object' && module && module.exports) module.exports = DaylightScene;
})(typeof window !== 'undefined' ? window : globalThis);
