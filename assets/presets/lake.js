/*! daylight-scene preset: "lake" — mountain ridges over a still lake, pine shores in front.
 *  Load after daylight-scene.js, then DaylightScene.create(el, { preset: 'lake' }).
 *  Doubles as the worked example in references/scene-authoring.md.
 */
(function (root) {
"use strict";
const D = root.DaylightScene;
if (!D) { console.error('lake preset: load daylight-scene.js first'); return; }

D.registerPreset('lake', {
  seed: 9,
  setup(G, T) {
    // Jagged ridge from x0..x1. peaks = [[x, y, halfWidth]]; slopes are slightly concave.
    const ridge = (x0, x1, base, peaks, rough) => {
      const pts = [[x0, T.HZ + 2]];
      for (let x = x0; x <= x1; x += 18) {
        let y = base;
        for (const [px, py, hw] of peaks) y = Math.min(y, py + Math.pow(Math.min(1, Math.abs(x - px) / hw), .8) * (base - py));
        pts.push([x, y + (G() - .5) * rough]);
      }
      pts.push([x1, T.HZ + 2]);
      return pts;
    };
    const clouds = [T.cumulus(G, 980, 40, 420, 170, 22, .95), T.cumulus(G, 120, 90, 300, 110, 14, .9)];
    const shoreL = [[-20, 470], [80, 462], [200, 470], [330, 492], [420, 520], [470, 560], [500, 620], [-20, 620]];
    const shoreR = [[1620, 455], [1500, 452], [1380, 468], [1290, 500], [1240, 540], [1220, 620], [1620, 620]];
    const trees = [];
    for (let i = 0; i < 12; i++) trees.push({x: 10 + i * 34 + G() * 14, h: 70 + G() * 70});
    for (let i = 0; i < 10; i++) trees.push({x: 1260 + i * 36 + G() * 14, h: 60 + G() * 80});
    trees.forEach(t => {
      const s = t.x < 800 ? shoreL : shoreR;
      t.base = Math.min(...s.filter(p => Math.abs(p[0] - t.x) < 90).map(p => p[1]).concat([600])) + 10;
    });
    return {
      clouds, cirrus: T.makeCirrus(G, 300, 1100, 20, 120, 22),
      far: ridge(-20, 1620, 330, [[260, 250, 320], [700, 232, 380], [1120, 245, 340], [1480, 262, 260]], 8),
      left: ridge(-20, 760, 362, [[250, 150, 400], [560, 238, 260]], 10),
      right: ridge(880, 1620, 362, [[1240, 182, 380], [1520, 262, 220]], 10),
      shoreL, shoreR, trees,
      stars: T.makeStars(G, clouds), glints: T.makeGlints(G), birds: T.makeBirds(G, 3),
    };
  },
  // kx squeezes the land on phones; the sun path follows the visible window.
  layout(vw, portrait) {
    if (!portrait) return {kx: 1, sun: [760, 980], moon: [1300, 420], bspan: 1760};
    const kx = Math.max(.4, Math.min(1, vw / 1300));
    return {kx, sun: [.45 * vw, .62 * vw], moon: [.85 * vw, .3 * vw], bspan: vw + 160};
  },
  paint(c, env) {
    const {P, S, L, layout: Y, data: Dd, T} = env;
    T.drawSky(c, P, S);
    T.drawSunMoon(c, P, S);
    T.drawClouds(c, P, S, L, Dd.clouds, Dd.cirrus, 0);
    c.save(); c.scale(Y.kx, 1);
    const Lk = {x: L.x / Y.kx, y: L.y};
    T.paintHaze(c, P, Dd.far, [-20, 230, 1620, 362], 3);
    T.paintRock(c, P, Dd.left, [-20, 140, 770, 364], 900, Lk.x > 400 ? .05 : -.05, 5, P.islandLit, P.islandShade);
    T.paintRock(c, P, Dd.right, [870, 170, 1620, 364], 800, Lk.x < 1200 ? .05 : -.05, 6, P.islandLit, P.islandShade);
    c.restore();
    T.drawSea(c, P);                       // the lake (calmer look comes from the palette, not new code)
    env.refl = T.reflState(P, S);
    T.drawReflections(c, P, env.refl);
    c.save(); c.scale(Y.kx, 1);
    T.paintRock(c, P, Dd.shoreL, [-20, 450, 510, 620], 500, -.12, 7);
    T.paintRock(c, P, Dd.shoreR, [1210, 445, 1620, 620], 450, -.12, 8);
    const side = Math.sign(Lk.x - 800) || 1;
    for (const t of Dd.trees) T.pine(c, t.x, t.base, t.h, P, t.x < 800 ? side : -side);
    c.restore();
  },
  fx(c, env, t, still) {
    const {P, layout: Y, data: Dd, T} = env;
    // Hide stars that would sit on the mountains: anything below the near ridges' top band.
    T.drawStars(c, P, t, Dd.stars, (x, y) => y > 300 || (x / Y.kx < 760 && y > 160), still);
    T.drawGlints(c, P, t, Dd.glints, env.refl);
    T.drawBirds(c, P, t, Dd.birds, Y.bspan);
  },
});
})(typeof window !== 'undefined' ? window : globalThis);
