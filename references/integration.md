# Integration recipes

Contents: plain HTML · React · Next.js · Vue 3 · Astro · WordPress / CMS · claude.ai artifacts · client preview controls · performance and analytics

The engine is a classic script that sets `window.DaylightScene` (and `module.exports` under CommonJS). It touches `window` and `document` at mount time, so it must only run in the browser.

## Plain HTML

```html
<div class="df-scene" id="daylight"></div>
<script src="/vendor/daylight-scene.js" defer></script>
<script src="/vendor/presets/lake.js" defer></script> <!-- only if preset: 'lake' -->
<script defer>
  addEventListener('DOMContentLoaded', () =>
    DaylightScene.create(document.getElementById('daylight'), { city: 'hcm' }));
</script>
```

## React (Vite / CRA)

Put `daylight-scene.js` in `src/vendor/`. A side-effect import registers the global.

```jsx
import { useEffect, useRef } from 'react';
import './vendor/daylight-scene.js';
// import './vendor/presets/lake.js';

export function DaylightScene({ city = 'hcm', preset = 'coast', palette = 'painterly', onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    const scene = window.DaylightScene.create(ref.current, { city, preset, palette, onChange });
    return () => scene.destroy();
  }, [city, preset, palette]);           // onChange deliberately not a dependency
  return <div ref={ref} className="df-scene" aria-hidden="true" />;
}
```

Port the footer markup from `assets/footer-template.html` into JSX (`class` → `className`, `stroke-width` → `strokeWidth`, …) and move its `<style>` into the project's CSS (or a CSS module — keep the `.df-scene` height rules and `::after` fade).

## Next.js (App Router)

The engine must not execute during SSR. Make the component a client component and load the engine inside the effect:

```jsx
'use client';
import { useEffect, useRef } from 'react';

export default function DaylightScene(props) {
  const ref = useRef(null);
  useEffect(() => {
    let scene, cancelled = false;
    import('@/vendor/daylight-scene.js').then(() => {
      if (!cancelled) scene = window.DaylightScene.create(ref.current, props);
    });
    return () => { cancelled = true; scene?.destroy(); };
  }, []);
  return <div ref={ref} className="df-scene" aria-hidden="true" />;
}
```

Alternatively serve the file from `/public` and use `<Script src="/daylight-scene.js" strategy="lazyOnload" onLoad={…}>`.

## Vue 3

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import '@/vendor/daylight-scene.js';
const el = ref(null); let scene;
const props = defineProps({ city: { default: 'hcm' }, preset: { default: 'coast' }, palette: { default: 'painterly' } });
onMounted(() => { scene = window.DaylightScene.create(el.value, { ...props }); });
onBeforeUnmount(() => scene?.destroy());
</script>
<template><div ref="el" class="df-scene" aria-hidden="true" /></template>
```

Nuxt: wrap the component in `<ClientOnly>`.

## Astro

```astro
<div class="df-scene" id="daylight"></div>
<script>
  import '../vendor/daylight-scene.js';
  window.DaylightScene.create(document.getElementById('daylight'), { city: 'sha' });
</script>
```

## WordPress / Webflow / Shopify / any CMS

Run `python3 scripts/inline_engine.py footer.html` to get one self-contained block, then paste the scene `<div>`, the CSS and the inlined script into the theme footer (WordPress: a Custom HTML block or `footer.php`; Webflow: an Embed element; Shopify: `footer.liquid`). Keep a single instance per page.

## claude.ai artifacts

Artifacts can only load scripts from a few public CDNs, so inline the engine: `python3 scripts/inline_engine.py page.html -o page.single.html`. Fonts from Google Fonts are fine. Viewers' frames block geolocation, so use a city or `'viewer'`.

## Client preview controls

For presenting the footer to a client, add a strip with a time slider coloured by the day itself:

```html
<input type="range" id="dl-hour" min="0" max="24" step="0.01" aria-label="Time of day">
<button id="dl-live" type="button">Live</button>
<button id="dl-demo" type="button">24h demo</button>
<output id="dl-read"></output>
<script>
  const scene = DaylightScene.create(document.getElementById('daylight'), {
    city: 'hcm',
    onChange: s => {
      document.getElementById('dl-read').textContent = `${s.time} · ${s.phaseName.zh} · 日出 ${s.sunriseText} · 日落 ${s.sunsetText}`;
      if (document.activeElement !== hour) hour.value = s.hour.toFixed(2);
    },
  });
  const hour = document.getElementById('dl-hour');
  hour.style.background = scene.trackGradient();
  hour.addEventListener('input', () => scene.setHour(+hour.value));
  document.getElementById('dl-live').onclick = () => scene.setMode('live');
  document.getElementById('dl-demo').onclick = () => scene.setMode('demo');   // 24 h in 32 s
</script>
```

Style the range input with `appearance:none`, a 14 px track and a 20 px thumb (28 px on `pointer:coarse`). On phones, let the buttons scroll in one row (`flex-wrap:nowrap; overflow-x:auto`) rather than wrapping into a tall stack.

## Performance and analytics

- Payload: engine ≈ 38 KB unminified (≈ 14 KB gzip); a preset ≈ 4 KB (≈ 2 KB gzip). No images.
- CPU: the static layer repaints only when the solar phase moves (about once a minute in live mode, ~10–30 ms on a mid-range phone); the animated layer (stars, glints, birds) runs at display rate only while the footer is within 200 px of the viewport.
- It never blocks first paint if loaded with `defer`/`lazyOnload`; the footer is below the fold on almost every page, so it does not affect LCP.
- If the user wants to prove the effect earns its place, suggest an A/B test of the footer CTA click-through rate and scroll-depth-to-footer against the old static footer, with a pre-agreed minimum lift (e.g. +5 % CTR) before keeping it for conversion reasons rather than brand ones.
