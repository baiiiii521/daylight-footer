# Palettes

## The phase model

Clock time is converted to a **solar phase** before any colour is chosen: sunrise is always phase 6, sunset always 18, the daylight hours are stretched or squeezed to fit 6→18 and the night to 18→30 (wrapping to 0→6). That is why the same palette works in Singapore (12 h day all year) and Beijing in December (9.5 h day) — the golden-hour colours land on the real golden hour.

```js
const t = DaylightScene.sunTimes('bj');               // {rise, set, tz} in local clock hours
const p = DaylightScene.toPhase(17.2, t.rise, t.set); // → solar phase
DaylightScene.phaseName(p);                           // {key:'sunset', zh:'日落', en:'Sunset'}
```

## Keyframe format

A palette is an array of keyframes sorted by phase, from 0 to 24 (repeat the night at both ends so the cycle closes). Each raw keyframe is `[phase, colours[18], numbers[6]]`; the engine interpolates linearly with smoothstep easing between neighbours.

Colour roles, in order:

| # | Role | Used for |
|---|---|---|
| 0 | `skyTop` | zenith |
| 1 | `skyMid` | mid sky, cloud ambient |
| 2 | `skyHor` | horizon band, aerial haze, the water near the horizon |
| 3 | `glow` | sun halo, warm tint on clouds near the sun |
| 4 | `cloudLit` | cloud faces toward the light |
| 5 | `cloudShade` | cloud shadow side (lavender reads better than grey) |
| 6 | `haze` | distant ranges, cool shadow tint in rocks |
| 7 | `islandLit` | lit side of mid-distance land |
| 8 | `islandShade` | shadow side of mid-distance land |
| 9 | `cliffLit` | lit facets of foreground rock |
| 10 | `cliffShade` | foreground rock shadow, birds |
| 11 | `tree` | pines, grass base |
| 12 | `seaFar` | water just below the horizon |
| 13 | `seaNear` | water at the bottom edge |
| 14 | `seaHi` | light wave strokes |
| 15 | `seaLo` | dark wave strokes |
| 16 | `foam` | surf, wave crests |
| 17 | `reflect` | light column on the water |

Scalars, in order: `sun` (disc opacity), `glowA` (halo strength), `stars`, `moon`, `birds` (opacity), `warm` (strength of the sun's reflection column).

Built-in keyframes sit at phases 0 night · 4.9 pre-dawn · 6.1 sunrise · 8 morning · 12 noon · 15.5 afternoon · 17.4 golden hour · 18.5 dusk · 19.6 blue hour · 21 night · 24 night.

## Built-in variants

- `painterly`: saturated gouache coast, the default.
- `dreamcore`: every colour pulled 30 % toward `#e8c8f0` and lifted 6 % toward white. It gives hazy, soft-contrast, nostalgic pastel scenes.
- `vintage`: everything pulled 20 % toward `#e2be8c`, like warm faded film stock. Pair it with `grain: true`.

## Making a brand palette

The quickest way is to tint the default so that every time of day keeps its character:

```js
const P = DaylightScene.tintPalette(DaylightScene.PALETTES.painterly, [255, 120, 80], .18); // pull toward brand coral
DaylightScene.create(el, { palette: P });
```

For full control, copy `RAW_PAINTERLY` from the engine, edit the hex values and pass the raw array as `palette`. Guidelines:

- Keep `cloudShade` and `haze` cooler than the lit colours. Warm light with cool shadows is what makes the painting read as lit.
- At night, keep `skyTop` dark enough (L* < 15) for stars to show, and keep `reflect` pale so the moon column still reads.
- Change one keyframe at a time and preview it with `scene.setHour(h)`. Neighbouring keyframes blend, so a garish noon also leaks into 10:00 and 14:00.
- The footer below always sits on `--df-bg`, not on the art. Brand colours belong in the palette and the logo, and link text never needs to contrast with the sky.

## Dark mode

The art is the same in both themes. Only the fade target changes: `.df-scene::after` blends into `--df-bg`, which the template redefines for dark mode. If a brand wants the footer always dark, make `--df-bg` dark in both themes so the transition into the night sky stays seamless.
