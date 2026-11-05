---
name: daylight-footer
description: Build website footers (or hero/section banners) with a painted landscape scene that changes with the real time of day — sunrise in the morning, blue midday, golden sunset, moonlit night — driven by actual sunrise/sunset times for a chosen city or the visitor's own timezone, fading into a standard multi-column footer that also re-composes properly on phones. Ships a dependency-free canvas engine, a footer template, extra scene presets, palettes (painterly, dreamcore, vintage) and a screenshot checker. Use this skill whenever someone wants a day/night or time-of-day footer, banner, header or background; a sunrise/sunset/dynamic-sky effect on a site; to reverse-engineer or recreate an illustrated "landscape that fades into the footer" design; or to port this effect into React, Vue, Next.js, Astro, WordPress, a landing page or a claude.ai artifact — including requests written in Chinese such as 随时间变化的页脚、日出日落页脚、昼夜变化横幅、动态天空背景 — even if they never say "canvas" or "skill".
---

# Daylight footer

A footer whose illustration follows the clock: the same composition is repainted with a palette that is interpolated across the solar day, so the change is continuous (no image swaps) and costs ~38 KB of JS (≈ 14 KB gzip) instead of megabytes of artwork.

## What's in the box

| Path | What it is | When to open it |
|---|---|---|
| `assets/daylight-scene.js` | The engine: solar math, palettes, painting toolkit, the `coast` preset, render loop. One global, `DaylightScene`. | Always copied into the project. Read the header + `create()` options; you rarely need to edit it. |
| `assets/presets/lake.js` | Second preset (mountains over a lake). | When the brand fits mountains/lakes better than sea cliffs, or as a model for a new preset. |
| `assets/footer-template.html` | Production footer: scene box, brand block, 3 link columns, socials, bottom bar, zh/en toggle, dark mode, phone layout. | Start every build from it. Every spot to customise is marked `EDIT:`. |
| `scripts/preview.js` | Playwright screenshots at 4 times of day × desktop + phone, plus checks (errors, sideways scroll, blank canvas). | After every build. |
| `scripts/inline_engine.py` | Inlines the engine into one HTML file. | claude.ai artifacts, single-file handoffs, CMS blocks. |
| `references/integration.md` | React / Vue / Next.js / Astro / WordPress / artifact recipes, client preview controls, performance notes. | Any target other than a plain HTML page. |
| `references/palettes.md` | Phase model, the 18 colour roles + 6 scalars, brand palettes, dark mode. | Re-theming, brand colours, "make it more 90s / dreamcore / film". |
| `references/scene-authoring.md` | Coordinate frame, toolkit API, how to write a preset, phone re-composition. | New landscape (city skyline, desert, rice terraces, snow…). |
| `references/ai-keyframes.md` | The alternative: AI-generated keyframe images cross-faded by solar phase; prompts in EN + 中文. | The user wants detailed illustrated art the procedural painter can't reach, or supplies their own artwork. |

## Workflow

### 1. Pin down the inputs

Pull answers from the conversation first; ask only for what is missing and would change the result. Sensible defaults are listed so you can proceed without asking.

- **Brand block** — name, logo (SVG or text), one-line tagline. Default: placeholders marked `EDIT:`.
- **Link columns + socials** — default three columns (main / company / legal) and four socials.
- **Whose clock** — a city key (`hcm`, `hanoi`, `bkk`, `sha`, `bj`, `szx`, `gz`, `hk`, `sg`), a custom `{lat, lon, timeZone, zh, en}` (IANA `timeZone` handles DST), or `'viewer'` for the visitor's own timezone (latitude is approximate). Default: the company's HQ city if known, else `'viewer'`.
- **Scene** — `coast` (sea cliff, islands; the classic) or `lake` (mountains, pines). Anything else → write a preset (step 3b).
- **Look** — palette `painterly` (saturated gouache), `dreamcore` (hazy lavender-pink), `vintage` (warm faded film), or brand-derived; film grain on/off.
- **Languages** — the template ships zh + en with a toggle; drop or extend.
- **Target** — plain HTML, a framework, or a claude.ai artifact.

### 2. Choose the route

Default to the **procedural engine**: continuous change, tiny payload, no art production, re-themable in minutes. Choose **AI keyframes** (`references/ai-keyframes.md`) only if the user needs illustration detail beyond flat gouache shapes, already has artwork, or wants a specific illustrated location. You can say in one line why you picked one.

### 3. Build

a. Copy `assets/daylight-scene.js` (and `assets/presets/<name>.js` if used) into the project's static/vendor folder, and adapt `assets/footer-template.html` — keep its CSS structure (`.df-scene` height rules and the `::after` fade) because the art is composed for those proportions.

b. **New landscape?** Follow `references/scene-authoring.md`. Reuse the toolkit (`drawSky`, `drawClouds`, `drawSea`, `paintRock`, `paintHaze`, `pine`, …) and write only the land shapes plus a `layout()` for phones. Test it the same way as built-in presets.

c. Mount it:

```js
const scene = DaylightScene.create(document.getElementById('daylight'), {
  city: 'hcm',            // or {lat, lon, timeZone, zh, en} or 'viewer'
  preset: 'coast',        // 'coast' | 'lake' | your registered preset
  palette: 'painterly',   // 'painterly' | 'dreamcore' | 'vintage' | keyframe array
  grain: true,
  onChange: s => { /* s.time, s.phaseName.zh/en, s.sunriseText, s.sunsetText, s.city */ },
});
```

The container needs only a height; the engine inserts its canvases, pauses itself while off-screen, honours `prefers-reduced-motion`, and re-composes for portrait screens (aspect ratio < 1.4 by default) instead of cropping the landmark away.

Instance API: `setHour(h)` (switches to manual), `setMode('live'|'manual'|'demo')`, `setCity(c)`, `setPalette(p)`, `setGrain(bool)`, `trackGradient()` (CSS gradient of the day for a slider), `getState()`, `redraw()`, `destroy()`.

d. For frameworks, use the recipe in `references/integration.md` (mount in an effect, `destroy()` on unmount, never run on the server).

### 4. Verify — look before you hand over

```bash
node <skill>/scripts/preview.js path/to/page.html --out daylight-preview
```

It writes screenshots for 06:12, 12:00, 17:18 and 22:00 at 1440 px and 390 px plus `report.json`, and exits non-zero on problems. Then open a desktop sunset and a phone sunrise screenshot and check:

- the landmark (cliff and trees / mountains) and the sun are both visible on the phone shot;
- footer text sits on the faded area, never on busy art;
- the night shot has stars and a moon reflection, the noon shot is not washed out;
- dark mode: the fade lands on the dark background (`--df-bg`), not white.

Fix what you see, then re-run once. If Playwright is missing, the script prints the install command; if installing is not possible, say the visual check was skipped.

### 5. Deliver

- **Plain site**: the HTML + `daylight-scene.js` (+ preset file).
- **claude.ai artifact**: run `python3 scripts/inline_engine.py page.html` first (artifacts cannot load your own script files from another host), strip the `<!doctype>/<html>/<head>/<body>` wrapper if the artifact rules ask for a fragment, then publish.
- Tell the user, briefly: whose clock drives the scene, today's sunrise/sunset it computed, the palette and preset, how to preview other hours (`scene.setHour(18)` in the console or the preview controls in `references/integration.md`), and anything you could not verify.

## Things that go wrong

- **Blank or squashed scene** — the container has no height, or `display:none` at mount; the engine resizes on `ResizeObserver`, so giving it a height later is fine.
- **Landmark missing on phones** — someone replaced the portrait `layout()` or forced a wide `portraitBelow`; keep the re-composition instead of cropping.
- **Server-side render crash** — the engine touches `window`/`document`; import it only on the client (see integration recipes).
- **Wrong hour** — a fixed `tz` ignores DST; give cities an IANA `timeZone`. `'viewer'` uses the visitor's device clock by design.
- **Footer text over art** — keep the bottom ~45 % of the scene inside the fade; don't shrink `.df-scene` height without moving the fade stops.
- **Performance** — static layer repaints only when the phase moves (≈ once a minute live); the animated layer stops while the footer is off-screen. Keep `dprCap` at 1.6 unless the user asks for retina-sharp art.
