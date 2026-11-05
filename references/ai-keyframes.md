# Route B: AI-generated keyframes, cross-faded by solar phase

Use this route when the user wants illustration detail the procedural painter can't produce (rich anime backgrounds, a recognisable real location, a mascot in the scene) or already has artwork. Keep the engine's solar maths so the images still follow real sunrise and sunset.

## Trade-off to state to the user

| | Procedural engine | AI keyframes |
|---|---|---|
| Payload | ≈ 14 KB gzip | 4–6 WebP at 150–300 KB each (0.6–1.8 MB) |
| Change | continuous | cross-fade between neighbouring keyframes |
| Detail | flat gouache shapes | anything the image model can draw |
| New brand / city | minutes | a new generation round |

## 1. Generate a consistent set

Composition must stay identical across images, or the cross-fade ghosts.

1. Generate the hero frame first (usually sunset), at 3:1 for desktop. Generate a separate 4:5 crop for phones in the same session.
2. Lock the composition for the other times of day:
   - Midjourney: reuse the hero as an image prompt, plus `--sref <hero>` and the same `--seed`.
   - Stable Diffusion / Flux: img2img from the hero at 0.35–0.5 denoise, with ControlNet Depth or Lineart extracted from the hero.
   - Image editing models: "same image, change only the lighting to …".
3. Change only the lighting phrase between frames.

Base prompt (EN):

> Wide panoramic anime-style gouache illustration, rocky coastal cliff with pine trees on the left, small islands on the horizon, ocean waves crashing on rocks, **{LIGHT}**, painterly brush strokes, soft film grain, 90s retro animation feel, bottom fades to plain white, 3:1 aspect ratio, no text

基础提示词（中文对照）:

> 宽幅全景，动画风格的水粉插画。左侧是长着松树的海岸岩崖，海平线上有几座小岛，海浪拍打礁石。**{光线}**。笔触感强，带轻微胶片颗粒，有 90 年代复古动画的味道，画面底部渐隐为纯白，比例 3:1，不出现文字。

| Frame | Phase | {LIGHT} | {光线} |
|---|---|---|---|
| dawn | 6 | soft dawn sunrise, pastel lilac and peach sky, sun just above the horizon | 柔和的黎明日出，淡紫与蜜桃色天空，太阳刚升出海平线 |
| noon | 12 | bright midday, clear blue sky, white cumulus clouds | 明亮的正午，晴朗蓝天，白色积云 |
| golden | 17.4 | golden-hour sunset, pink and orange clouds with lavender shadows, sun reflection on the sea | 黄金时刻的日落，粉橙色云带薰衣草紫暗部，海面有太阳倒影 |
| dusk | 18.7 | deep dusk after sunset, magenta and indigo sky, first stars | 日落后的暮色，品红与靛蓝天空，初现星光 |
| night | 0 | moonlit night, starry indigo sky, silver moon reflection on calm water | 月夜，靛蓝星空，平静海面上有银色月光倒影 |

Replace the subject words for other scenes, such as "Saigon river skyline" (西贡河天际线), "misty karst mountains" (云雾喀斯特山峰) or "rice terraces" (梯田), and keep the rest unchanged.

Export each frame as WebP (quality 80), 2400 px wide for desktop and 1080 px for phone.

## 2. Cross-fade by phase

```html
<div class="df-scene" id="daylight">
  <picture data-phase="0"><source media="(max-width:640px)" srcset="night-m.webp"><img src="night.webp" alt=""></picture>
  <picture data-phase="6"><source media="(max-width:640px)" srcset="dawn-m.webp"><img src="dawn.webp" alt=""></picture>
  <picture data-phase="12"><source media="(max-width:640px)" srcset="noon-m.webp"><img src="noon.webp" alt=""></picture>
  <picture data-phase="17.4"><source media="(max-width:640px)" srcset="golden-m.webp"><img src="golden.webp" alt=""></picture>
  <picture data-phase="18.7"><source media="(max-width:640px)" srcset="dusk-m.webp"><img src="dusk.webp" alt=""></picture>
</div>
<style>
  .df-scene picture, .df-scene img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:56% 50%; }
  .df-scene picture { opacity:0; transition:opacity 1.2s linear; }
</style>
<script src="daylight-scene.js"></script>
<script>
  // Only the solar maths is used here; no canvas is created.
  const city = 'hcm', frames = [...document.querySelectorAll('#daylight picture')]
    .map(el => ({el, p: +el.dataset.phase})).sort((a, b) => a.p - b.p);
  function update() {
    const D = DaylightScene, t = D.sunTimes(city), p = D.toPhase(D.cityHour(city), t.rise, t.set);
    const ring = [...frames, {...frames[0], p: frames[0].p + 24}];
    let i = 0; while (i < ring.length - 2 && ring[i + 1].p <= p) i++;
    const a = ring[i], b = ring[i + 1], k = (p - a.p) / (b.p - a.p);
    // Keep the lower layer (in DOM order) opaque and fade the upper one in or out, so the mix never dims.
    const idx = f => frames.findIndex(x => x.el === f.el);   // b is frames[0] again when wrapping past midnight
    const [lo, hi, wHi] = idx(a) < idx(b) ? [a, b, k] : [b, a, 1 - k];
    frames.forEach(f => f.el.style.opacity = 0);
    lo.el.style.opacity = 1; if (hi.el !== lo.el) hi.el.style.opacity = wHi;
  }
  update(); setInterval(update, 60e3);
</script>
```

Add `loading="lazy"` and `decoding="async"` to the images, because the footer is below the fold. Preload nothing.

## 3. Hybrid (optional)

Overlay the engine's animated layer on the images (stars at night, glints on the water, birds) by creating a scene with a preset whose `paint()` draws nothing and whose `fx()` calls only `drawStars`, `drawGlints` and `drawBirds`. Make sure the preset's `sun` range matches where the sun sits in the images.
