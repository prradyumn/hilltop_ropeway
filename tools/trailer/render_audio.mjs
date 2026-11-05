// Render the trailer soundtrack offline (audio.html → OfflineAudioContext) and loudness-normalise it to −16 LUFS / −1.5 dBTP.
// usage: node render_audio.mjs   → $TRAILER_WORK/audio_raw.wav, $TRAILER_WORK/audio.wav
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { launch, WORK, URL_BASE, ROOT } from './lib.mjs';
const edit = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/trailer/edit.json'), 'utf8'));
fs.mkdirSync(WORK, { recursive: true });
const b = await launch(); const page = await b.newPage();
page.on('pageerror', e => console.error('pageerror', e.message));
await page.goto(URL_BASE + 'tools/trailer/audio.html');
const r = await page.evaluate(e => window.renderTrailer(e), edit);
await b.close();
const raw = path.join(WORK, 'audio_raw.wav'), out = path.join(WORK, 'audio.wav');
fs.writeFileSync(raw, Buffer.from(r.wav, 'base64')); console.log('raw peak', r.peak.toFixed(3));
// loudness: gain to −16 LUFS integrated, then a sample-peak limiter at −2 dBFS (keeps true peak under −1 dB); one correction pass
const measure = f => { const t = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${f}" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary`]).toString();
  return { I: +t.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP: +t.match(/Peak:\s+(-?[\d.]+) dBFS/)[1] }; };
const m0 = measure(raw); console.log('raw', m0);
let gain = -16 - m0.I;
for (let pass = 0; pass < 3; pass++) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${Math.pow(10, -2 / 20).toFixed(4)}:attack=2:release=80:level=false`, '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  const m = measure(out); console.log('pass', pass, 'gain', gain.toFixed(2), m); if (Math.abs(m.I + 16) < 0.15) break; gain += -16 - m.I; }
console.log('wrote', out);
