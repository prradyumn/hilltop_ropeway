// Composite the trailer (compose.html: footage + punch-ins + overlay cards/end card), encode with the soundtrack, write the poster.
// usage: node compose.mjs [--frames a,b,c]   (--frames: only render those output frames as stills, for checking)
// needs: $TRAILER_WORK/seg_* (capture.mjs), $TRAILER_WORK/audio.wav (render_audio.mjs)
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { launch, WORK, URL_BASE, ROOT } from './lib.mjs';
const edit = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/trailer/edit.json'), 'utf8'));
const only = (() => { const i = process.argv.indexOf('--frames'); return i > 0 ? process.argv[i + 1].split(',').map(Number) : null; })();
const N = Math.round(edit.duration * edit.fps);

// optional plate (src 'intro'): the game's intro loop (1920×1200) → centre 1920×1080 frames; the current edit opens on the live cover instead
const intro = path.join(WORK, 'intro');
if (edit.shots.some(s => s.src === 'intro') && !fs.existsSync(path.join(intro, 'f_00000.png'))) { fs.mkdirSync(intro, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(ROOT, 'assets/video/intro_loop.mp4'), '-vf', 'crop=1920:1080:0:60', '-frames:v', '200', '-start_number', '0', path.join(intro, 'f_%05d.png')]); }

const META = {}; for (const s of new Set(edit.shots.flatMap(s => [s.src, s.lensFrom].filter(Boolean)))) { const f = path.join(WORK, s, 'meta.json'); if (fs.existsSync(f)) META[s] = JSON.parse(fs.readFileSync(f, 'utf8')); }
const outDir = path.join(WORK, only ? 'stills' : 'out'); fs.mkdirSync(outDir, { recursive: true });
const b = await launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('pageerror', e.message));
await page.route('**/work/**', r => { const rel = decodeURIComponent(new URL(r.request().url()).pathname.replace(/^\/work\//, '')); const f = path.join(WORK, rel);
  fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/png' }) : r.fulfill({ status: 404, body: 'missing ' + rel }); });
await page.goto(URL_BASE + 'tools/trailer/compose.html');
await page.evaluate(async ([e, m]) => { window.META = m; await window.setup(e); }, [edit, META]);
const cdp = await page.context().newCDPSession(page);
const t0 = Date.now(); const frames = only || [...Array(N).keys()];
for (const i of frames) { const t = i / edit.fps;
  const info = await page.evaluate(async t => { const r = await window.drawBase(t); window.renderAt(t); return r; }, t);
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  fs.writeFileSync(path.join(outDir, only ? `t_${t.toFixed(2).padStart(5, "0")}.png` : `f_${String(i).padStart(5, '0')}.png`), Buffer.from(r.data, 'base64'));
  if (only || i % 60 === 0) console.log(`frame ${i} t=${t.toFixed(2)} ${info.shot} ${info.src}#${info.fi} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
await b.close();
if (only) process.exit(0);

const audio = path.join(WORK, 'audio.wav'), mp4 = path.join(ROOT, 'trailer/hilltop_ropeway_trailer.mp4');
fs.mkdirSync(path.dirname(mp4), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(edit.fps), '-i', path.join(outDir, 'f_%05d.png'), '-i', audio,
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '17', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p', '-r', String(edit.fps), '-g', '60',
  '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000', '-t', String(edit.duration), '-movflags', '+faststart', mp4], { stdio: 'inherit' });
// poster: the end card
const pf = Math.round((edit.poster ?? edit.duration - 0.4) * edit.fps);
// (Pillow: this ffmpeg build has no WebP encoder)
execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=86, method=6)', path.join(outDir, `f_${String(pf).padStart(5, '0')}.png`), path.join(ROOT, 'trailer/poster.webp')]);
console.log('wrote', mp4);
