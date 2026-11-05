// Capture the trailer's game footage as clock-stepped 30 fps PNG sequences (one folder per segment under $TRAILER_WORK/seg_<name>).
// usage: node capture.mjs [segment ...]   (default: all)
import fs from 'fs';
import { launch, openGame, WORK } from './lib.mjs';
const vis = sel => `(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); return !!e && !e.classList.contains('hide') && !e.disabled; })()`;
const SEG = {
  // S1: the in-game cover (title lockup flies in over the glowing hill; "Tap to start" pill hidden), then — after the two
  // story lines — the tower-by-tower fly-through in letterbox
  async s1(b) { const g = await openGame(b); g.setOut(WORK + '/seg_cover'); await g.record(4500, 'cover');
    await g.until(`!!document.querySelector('#start.ready')`); await g.click('#start'); await g.step();
    for (let k = 0; k < 2; k++) { await g.until(`!!document.querySelector('#caption .next')`); await g.run(300); await g.click('#caption .next'); await g.step(); }
    g.setOut(WORK + '/seg_s1towers'); await g.record(8500, 's1towers'); return g; },
  // S4: tap the station pulley, tap the bot → look closer (camera push → full-screen 3D close-up with 1 m / 10 cm / 1 cm ruler)
  async s4(b) { const g = await openGame(b, { chapter: 3 }); await g.until(`!!document.querySelector('.hot')`); await g.run(800); await g.click('.hot'); await g.run(400);
    await g.until(`!!document.querySelector('.hot')`); await g.run(600);
    g.setOut(WORK + '/seg_s4'); await g.record(300); await g.click('.hot'); await g.record(6800, 's4'); return g; },
  // G2: default smooth wheel → RUN → slip (slow-mo, sparks, close-up lens)
  // 1.5x: the edit punches in on the bot. Each frame is also grabbed with the close-up panel hidden (seg_g2slip_nolens),
  // so the zoomed world is clean and the panel is laid back on top un-zoomed.
  async g2slip(b) { const g = await openGame(b, { chapter: 5, dpr: 1.5 });
    g.setOut(WORK + '/seg_g2title'); await g.run(2000); await g.record(3200, 'g2title'); // the chapter title card (crane lands at 2.4 s)
    await g.until(vis('#run')); await g.run(1200);
    g.setOut(WORK + '/seg_g2slip'); g.altDir = WORK + '/seg_g2slip_nolens'; fs.mkdirSync(g.altDir, { recursive: true });
    await g.record(300); await g.click('#run'); await g.record(5000, 'g2slip'); return g; },
  // G2: grooved + band wheel → RUN → climbs, lamp burst, light pulse down the cable, spark into the rail
  async g2climb(b) { const g = await openGame(b, { chapter: 5, dpr: 1.5 }); await g.until(vis('#run')); await g.run(800); await g.click('#tray .opt[data-id=band]'); await g.run(1500);
    g.setOut(WORK + '/seg_g2climb'); await g.record(300); await g.click('#run'); await g.record(8000, 'g2climb'); return g; },
  // G4: one turn → "10 cm" tape stamp flies into the table
  async g4(b) { const g = await openGame(b, { chapter: 7 }); await g.until(`!!document.querySelector('#oneTurn')`); await g.run(900);
    g.setOut(WORK + '/seg_g4'); await g.record(500); await g.click('#oneTurn'); await g.record(3200, 'g4');
    await g.until(`!!document.querySelector('#oneTurn') && !document.querySelector('#oneTurn').disabled`); await g.run(500);
    g.setOut(WORK + '/seg_g4b'); await g.record(300); await g.click('#oneTurn'); await g.record(3000, 'g4b'); return g; },
  // G5: pick the grip sentence, lock in → blueprint field notes, rule lights word by word
  async g5(b) { const g = await openGame(b, { chapter: 8 }); await g.until(`!!document.querySelector('.rule[data-id=grip]')`); await g.run(800);
    g.setOut(WORK + '/seg_g5'); await g.record(400); await g.click('.rule[data-id=grip]'); await g.record(700); await g.click('#lockIn'); await g.record(10500, 'g5'); return g; },
  // G7: cloud wipe, class boards, gondola rides up past all four towers, shutter flash, pull back
  async g7(b) { const g = await openGame(b, { chapter: 10 }); g.setOut(WORK + '/seg_g7'); await g.record(21000, 'g7'); return g; },
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SEG);
const b = await launch();
for (const n of names) { const t0 = Date.now(); const g = await SEG[n](b); console.log(`${n}: ${g.n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s, errors: ${g.errs.length ? g.errs.join(' | ') : 'none'}`); await g.page.close(); }
await b.close();
