// Shared helpers for the trailer renderer: browser launch + a deterministic frame clock for the live game.
// Time is fully virtual: Playwright's fake clock drives setTimeout/rAF/Date/performance.now (game loop + GSAP),
// and every Web Animation / CSS animation / CSS transition is paused and stepped by the same amount each frame.
import fs from 'fs';
import path from 'path';
import os from 'os';

export const FPS = 30, DT = 1000 / FPS;
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const WORK = process.env.TRAILER_WORK || path.join(os.tmpdir(), 'hilltop_trailer_work');
export const URL_BASE = 'http://localhost:5517/'; // the project's static server (python3 -m http.server 5517 from the project root)
const PW = process.env.PLAYWRIGHT_CORE || 'playwright-core'; // path to playwright-core/index.mjs if it isn't resolvable from here
export const { chromium } = await import(PW);

export async function launch() {
  const exe = process.env.CHROME || (process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  return chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined,
    // GPU (Metal) is ~20x faster than SwiftShader here and frames are clock-stepped either way; TRAILER_GL=swiftshader to fall back
    args: [...(process.env.TRAILER_GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal']),
      '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
}

// in-page: seeded Math.random, no Web Audio / speech (the trailer's audio is rendered offline), animation stepper
const INIT = () => {
  let s = 0x9e3779b9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.AudioContext = undefined; window.webkitAudioContext = undefined;
  try { Object.defineProperty(window, 'speechSynthesis', { value: { speak() {}, cancel() {} } }); } catch (e) {}
  window.SpeechSynthesisUtterance = function () {};
  const _play = HTMLMediaElement.prototype.play; // VO <audio> stays silent; <video> keeps playing
  HTMLMediaElement.prototype.play = function () { if (this instanceof HTMLAudioElement) return Promise.resolve(); return _play.call(this); };
  const tracked = new Set(), seen = new WeakSet(); // seen: never re-initialise an animation (finished fill:both/forwards ones stay listed)
  const adopt = a => { if (seen.has(a)) return false; seen.add(a); tracked.add(a); try { a.pause(); a.currentTime = 0; } catch (e) {} return true; };
  window.__anim = {
    // advance every animation by ms of virtual time (new ones start at 0)
    async step(ms) {
      for (const a of document.getAnimations()) if (adopt(a)) a.__fresh = true;
      const done = [];
      for (const a of [...tracked]) {
        if (a.playState === 'idle' || a.playState === 'finished') { tracked.delete(a); continue; }
        if (a.__fresh) { a.__fresh = false; continue; }
        try {
          const ct = (a.currentTime || 0) + ms * (a.playbackRate || 1);
          const end = a.effect ? a.effect.getComputedTiming().endTime : 0;
          if (isFinite(end) && ct >= end) { const h = a.onfinish; a.onfinish = null; a.currentTime = end; a.finish(); tracked.delete(a); if (h) done.push([h, a]); }
          else { if (a.playState !== 'paused') a.pause(); a.currentTime = ct; }
        } catch (e) { tracked.delete(a); }
      }
      // run finish handlers now (in virtual time), let their promise chains settle, then adopt whatever they started at t=0
      for (const [h, a] of done) { try { h.call(a, new Event('finish')); } catch (e) { console.error(e); } }
      for (let k = 0; k < 3; k++) await new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); });
      for (const a of document.getAnimations()) adopt(a);
    },
    count() { return tracked.size; },
  };
};

export const CLEAN_CSS = `#menuBtn,#fsBtn,.tip,#menu{display:none!important} html.__nolens #lens{visibility:hidden!important}`;

export async function openGame(browser, { chapter = null, dpr = 1, css = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dpr, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(INIT);
  await page.clock.install({ time: new Date('2026-06-01T06:15:00') });
  await page.clock.pauseAt(new Date('2026-06-01T06:15:01'));
  await page.goto(URL_BASE + 'index.html');
  await page.waitForFunction(() => !!window.__game);
  await page.addStyleTag({ content: CLEAN_CSS + css });
  await page.evaluate(() => document.fonts.ready);
  const g = new Game(page, errs); g.dpr = dpr;
  g.cdp = await page.context().newCDPSession(page);
  if (chapter !== null) await g.play(chapter);
  return g;
}

export class Game {
  constructor(page, errs) { this.page = page; this.errs = errs; this.t = 0; this.n = 0; this.dir = null; }
  async play(i) { await this.page.evaluate(i => { window.__game.play(i); }, i); await this.tick(1); }
  // advance one frame of virtual time
  async step(ms = DT) { await this.page.clock.runFor(ms); await this.page.evaluate(ms => window.__anim.step(ms), ms); this.t += ms; }
  async tick(n = 1) { for (let i = 0; i < n; i++) await this.step(); }
  async run(ms) { const n = Math.round(ms / DT); await this.tick(n); }           // fast-forward without shots (still frame-stepped)
  async until(js, maxMs = 30000) { for (let t = 0; t < maxMs; t += DT) { if (await this.page.evaluate(js)) return true; await this.step(); } throw new Error('timeout waiting for ' + js); }
  async click(sel) { const ok = await this.page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.click(); return true; }, sel); if (!ok) throw new Error('no element ' + sel); } // no time passes: callers step/record
  setOut(dir) { if (this.dir && this.meta) this.flushMeta(); this.dir = dir; fs.mkdirSync(dir, { recursive: true }); this.n = 0; this.meta = []; }
  flushMeta() { fs.writeFileSync(path.join(this.dir, 'meta.json'), JSON.stringify(this.meta)); }
  async probe() { return this.page.evaluate(() => { const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 10) / 10); };
    const L = document.querySelector('#lens'); const st = document.querySelector('#stage').getBoundingClientRect(), sc = st.width / (window.__game.world.W || 1600);
    const cam = window.__game.world.cam, W = window.__game.world; return { lens: L && L.classList.contains('on') ? r(L) : null, cam: { x: cam.x, y: cam.y, zoom: cam.zoom }, sc, sw: W.W, sh: W.H }; }); }
  async grab(file) { const r = await this.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, ...(this.dpr > 1 ? { clip: { x: 0, y: 0, width: 1920, height: 1080, scale: this.dpr } } : {}) }); // clip.scale → device pixels
    fs.writeFileSync(file, Buffer.from(r.data, 'base64')); }
  // altDir: also grab the same instant with the close-up panel hidden (no time passes; visibility isn't transitioned)
  async shot() { this.meta.push({ t: Math.round(this.t), ...(await this.probe()) }); const name = `f_${String(this.n).padStart(5, '0')}.png`;
    await this.grab(path.join(this.dir, name));
    if (this.altDir) { await this.page.evaluate(() => document.documentElement.classList.add('__nolens')); await this.grab(path.join(this.altDir, name)); await this.page.evaluate(() => document.documentElement.classList.remove('__nolens')); }
    this.n++; }
  async record(ms, log = '') { const n = Math.round(ms / DT); const t0 = Date.now(); for (let i = 0; i < n; i++) { await this.shot(); await this.step(); if (i % 30 === 0) console.log(`${log} frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); } this.flushMeta(); }
}
