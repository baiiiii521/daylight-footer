#!/usr/bin/env node
/**
 * Screenshot a daylight-footer page at several times of day and widths, and report problems.
 *
 *   node scripts/preview.js <page.html | http://url> [--out dir] [--hours 6.2,12,17.3,22] [--widths 1440,390]
 *
 * Checks per width: page errors, horizontal overflow, blank scene canvas.
 * Needs Playwright (`npm i -D playwright` + `npx playwright install chromium`) unless it is preinstalled.
 * HTML fragments without <!doctype> (e.g. claude.ai artifact sources) are wrapped automatically.
 */
const fs = require('fs'), path = require('path'), os = require('os');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; }
const target = process.argv[2];
if (!target || target.startsWith('--')) { console.error('usage: node preview.js <page.html|url> [--out dir] [--hours 6.2,12,17.3,22] [--widths 1440,390]'); process.exit(2); }
const out = path.resolve(arg('out', 'daylight-preview'));
const hours = arg('hours', '6.2,12,17.3,22').split(',').map(Number);
const widths = arg('widths', '1440,390').split(',').map(Number);

let pw;
try { pw = require('playwright'); } catch (e) {
  console.error('Playwright not found. Install it with:\n  npm i -D playwright && npx playwright install chromium'); process.exit(3);
}

(async () => {
  fs.mkdirSync(out, {recursive: true});
  let url = target;
  if (!/^https?:|^file:/.test(target)) {
    const abs = path.resolve(target);
    let html = fs.readFileSync(abs, 'utf8');
    if (!/^\s*<!doctype/i.test(html)) {
      html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">' + html + '</body></html>';
      const tmp = path.join(path.dirname(abs), '.daylight-preview-' + path.basename(abs));
      fs.writeFileSync(tmp, html); url = 'file://' + tmp;
      process.on('exit', () => { try { fs.unlinkSync(tmp); } catch (e) {} });
    } else url = 'file://' + abs;
  }
  // Set CHROMIUM_PATH when the project pins a Playwright version that can't find its own browser.
  const browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
  const report = [];
  for (const w of widths) {
    const phone = w < 700;
    const page = await browser.newPage({viewport: {width: w, height: phone ? 844 : 900}, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.waitForTimeout(900);
    const hasEngine = await page.evaluate(() => !!(window.DaylightScene && window.DaylightScene.instances.length));
    const shots = [];
    for (const h of hours) {
      if (hasEngine) { await page.evaluate(h => window.DaylightScene.instances.forEach(s => s.setHour(h)), h); await page.waitForTimeout(350); }
      const file = path.join(out, `w${w}-h${String(h).replace('.', '_')}.png`);
      await page.screenshot({path: file, fullPage: true});
      shots.push(file);
      if (!hasEngine) break;
    }
    const checks = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const cv = document.querySelector('canvas.dls-layer');
      let blank = null, scene = null;
      if (cv) {
        const r = cv.getBoundingClientRect(); scene = {width: Math.round(r.width), height: Math.round(r.height)};
        try {
          const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lo = 255, hi = 0;
          for (let i = 0; i < d.length; i += 4 * 997) { const v = d[i] + d[i + 1] + d[i + 2]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
          blank = hi - lo < 30;
        } catch (e) {}
      }
      return {overflowPx: overflow, sceneBox: scene, sceneBlank: blank};
    });
    report.push({width: w, engineFound: hasEngine, errors, ...checks, screenshots: shots});
    await page.close();
  }
  await browser.close();
  const problems = report.flatMap(r => [
    ...(!r.engineFound ? [`w${r.width}: DaylightScene instance not found`] : []),
    ...r.errors.map(e => `w${r.width}: ${e}`),
    ...(r.overflowPx > 0 ? [`w${r.width}: page scrolls sideways by ${r.overflowPx}px`] : []),
    ...(r.sceneBlank ? [`w${r.width}: scene canvas looks blank`] : []),
  ]);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({report, problems}, null, 2));
  console.log(JSON.stringify({out, problems, report: report.map(r => ({width: r.width, sceneBox: r.sceneBox, overflowPx: r.overflowPx, shots: r.screenshots.length}))}, null, 2));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
