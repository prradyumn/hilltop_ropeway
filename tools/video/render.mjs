// Deterministic frame renderer. The page exposes window.READY (promise), window.renderAt(t) and a #c canvas.
// usage:
//   node render.mjs stills <page.html> <outdir> <t1,t2,...>
//   node render.mjs video  <page.html> <out.png-dir> <fps> <nframes>     (writes f_00000.png ...)
import { chromium } from 'playwright-core';
import fs from 'fs';
const [,, mode, pageName, out, a3, a4] = process.argv;
const PORT = process.env.PORT || 5541;
fs.mkdirSync(out, { recursive: true });
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-gpu-process-crash-limit'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); else console.log('page:', m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
await page.goto(`http://127.0.0.1:${PORT}/${pageName}`);
await page.waitForFunction(() => window.READY_DONE === true, null, { timeout: 120000 });
const grab = async t => {
  const b64 = await page.evaluate(t => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png').slice(22); }, t);
  return Buffer.from(b64, 'base64');
};
const t0 = Date.now();
if (mode === 'stills') {
  for (const t of a3.split(',').map(Number)) { const f = `${out}/t_${t.toFixed(3)}.png`; fs.writeFileSync(f, await grab(t)); console.log('wrote', f); }
} else {
  const fps = +a3, n = +a4;
  for (let i = 0; i < n; i++) {
    fs.writeFileSync(`${out}/f_${String(i).padStart(5, '0')}.png`, await grab(i / fps));
    if (i % 30 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none', 'time', ((Date.now() - t0) / 1000).toFixed(1) + 's');
await browser.close();
