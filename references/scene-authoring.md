# Writing a scene preset

Read this to paint a landscape the built-in `coast` and `lake` presets don't cover, such as a city skyline, rice terraces, desert dunes, snowy peaks or a harbour. `assets/presets/lake.js` is a complete worked example in about 100 lines, so open it next to this page.

## The frame

- Every preset paints into a fixed **1600 × 600 logical frame** with the **horizon at y = 360** (`T.W`, `T.H`, `T.HZ`). Sea, lake and reflection helpers assume that horizon.
- On wide screens the engine cover-fits the frame. It centres on `focusX` (default 0.56 of the width) and keeps the horizon about 64 % down the visible area.
- On portrait screens (aspect ratio below `portraitBelow`, 1.4 by default) the engine fits the frame by height, so only the leftmost `vw` units show (≈ 500 on a phone). It then calls `layout(vw, true)` so the preset can **re-compose** rather than crop. Squeeze land groups horizontally with `c.scale(kx, 1)` and move the sun path into `[0, vw]`.
- The bottom ~40 % of the scene fades into the page. Put the landmark (cliff, peak, skyline) in the upper 60 % and treat the foreground as texture.

## The preset contract

```js
DaylightScene.registerPreset('name', {
  seed: 7,                                  // seeds all geometry; the same seed gives the same scene
  setup(G, T) { return data; },             // once. G() → seeded 0..1. Build polygons, clouds, trees, stars.
  layout(vw, portrait) {                    // on every resize
    return { sun: [x0, x1], moon: [x0, x1], /* plus anything paint() reads */ };
  },
  paint(c, env) { /* static layer */ },     // env = {P, S, L, layout, data, T}; repainted when the phase moves
  fx(c, env, t, still) { /* optional */ },  // every frame while visible: stars, glints, birds
});
```

- `sun: [x0, x1]` is where the sun rises and sets on the x axis. The arc between them is computed for you. `moon` works the same way from moonrise to moonset.
- `env.P` is the interpolated palette (see `palettes.md` for the 18 colour roles). Paint with those roles instead of literal colours, and the time-of-day change comes for free.
- `env.S` is the sun/moon state: `sx, sy` (sun position), `e` (elevation, −1…1), `gx, gy` (glow anchor; it stays on the horizon after sunset), `mx, my, mvis` (moon).
- `env.L` is the current light source (sun, moon or afterglow). Use it to choose which side of each shape is lit.
- Set `env.refl = T.reflState(P, S)` in `paint()` if you call `T.drawReflections`, because `T.drawGlints` reads it in `fx()`.
- `still` is true under `prefers-reduced-motion`. Draw a static frame in that case.

## Toolkit (`T`)

| Function | Paints |
|---|---|
| `drawSky(c, P, S)` | gradient sky, brush texture, horizon glow |
| `drawSunMoon(c, P, S)` | sun disc and halo, moon disc and halo |
| `cumulus(G, x, y, w, h, n, alpha)` → cloud | seeded cloud cluster (call it in `setup`) |
| `makeCirrus(G, x0, x1, yTop, yBottom, n)` | streaky high clouds (call it in `setup`) |
| `drawClouds(c, P, S, L, clouds, cirrus, dx)` | lit clouds; `dx` shifts the cirrus for phone layouts |
| `paintHaze(c, P, pts, bbox, seed)` | distant silhouette: hills, skyline, far range |
| `paintIsland(c, P, {pts, peak, half}, L, seed)` | mid-distance landform lit from one side |
| `paintRock(c, P, pts, bbox, count, bias, seed, lit?, shade?)` | faceted gouache mass for cliffs, mountains and buildings (pass `P.islandLit/islandShade` for mid-distance) |
| `pine(c, x, base, h, P, side)` | layered pine with rim light |
| `drawSea(c, P)` | water from the horizon to the bottom, with strokes and crests |
| `reflState(P, S)`, `drawReflections(c, P, refl)` | light column under the sun or moon |
| `makeStars(G, clouds)`, `drawStars(c, P, t, stars, hidden, still)` | stars; `hidden(x, y)` returns true where land covers the sky |
| `makeGlints(G)`, `drawGlints(c, P, t, glints, refl)` | sparkles on the water |
| `makeBirds(G, n)`, `drawBirds(c, P, t, birds, span)` | flapping gulls that wrap across `span` |
| `dab, disc, poly, noise, hash, mix, css, lerp, clamp, sstep, mulberry` | primitives |

The painterly look comes from **dabs**: short rotated ellipses clipped to a shape, with colour picked by `noise()` between a lit and a shade role. Follow these principles and a new shape will match the house style:

1. Fill the shape with its shadow colour, clip to it, then lay 300–2500 dabs depending on its area.
2. Tie the dab angle to the material: diagonal (−0.9 rad) for rock, near-horizontal for water and sky, vertical for buildings.
3. Bias lit against shade by the light side (`Math.sign(L.x - shapeCentreX)`).
4. Mix about 25 % of dabs toward `P.haze` so shadows go cool, not grey.
5. Paint back to front: sky → sun/moon → clouds → far haze → mid land → water → reflections → foreground.

## Example ideas

- **City skyline** (HCMC, Bangkok, Shanghai): `paintHaze` for far towers, then `paintRock` with rectangles for near towers using vertical dabs. Add lit windows in `fx()` as small `fillRect`s whose alpha follows `P.stars`, so the windows switch on at dusk. Use a river from `drawSea`.
- **Rice terraces**: stacked `paintRock` bands with `lit = P.tree`, curved polygon edges and no water, or a thin `drawSea` strip as flooded paddies at sunrise.
- **Desert**: `paintHaze` dunes with `P.cliffLit` as the lit role, no trees, many stars (raise `stars` in a custom palette).

## Testing a preset

Load it after the engine, set `preset: 'name'` in the template, and run `scripts/preview.js`. Check the phone shot first: if the landmark is missing, widen the squeeze in `layout(vw, true)` and move the sun range inside `[0.4·vw, 0.9·vw]`.
