// Tiny synthesized sound kit. Neutral on failure, never comic.
let ac=null, master=null, muted=false, motor=null, squeal=null;
export function unlock(){ if(ac) { if(ac.state==='suspended') ac.resume(); return; }
  try{ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=0.55; master.connect(ac.destination); loadSamples(); }catch(e){ ac=null; } }
/* ---------- recorded one-shots (Kenney CC0, assets/sfx/) — variations + slight pitch jitter; synth fallback until loaded ---------- */
const SAMPLES={ tick:['click_001','click_002','click_003','click_004','click_005'], select:['select_001','select_002','select_003'], pop:['drop_001','drop_002','drop_003','drop_004'],
  clack:['impactMetal_light_000','impactMetal_light_001','impactMetal_light_002'], bump:['impactSoft_heavy_000','impactSoft_heavy_001','impactSoft_heavy_002'],
  coin:['confirmation_001'], chime:['glass_001','glass_002'], tock:['tick_002'], sting:['jingle_STEEL02'], fanfare:['jingle_STEEL12'], bright:['jingle_PIZZI02'] };
const SGAIN={ tick:0.45, select:0.55, pop:0.55, clack:0.6, bump:0.75, coin:0.5, chime:0.6, tock:0.55, sting:0.6, fanfare:0.7, bright:0.6 };
const BUF={};
function loadSamples(){ const names=[...new Set(Object.values(SAMPLES).flat())];
  names.forEach(n=>fetch(`assets/sfx/${n}.mp3`).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(b=>new Promise((res,rej)=>ac.decodeAudioData(b,res,rej))).then(buf=>{ BUF[n]=buf; }).catch(()=>{})); }
let lastPick={};
function sample(kind,{jitter=0.06,delay=0}={}){ if(!ac||muted) return !!ac; const list=(SAMPLES[kind]||[]).filter(n=>BUF[n]); if(!list.length) return false;
  let n=list[Math.floor(Math.random()*list.length)]; if(list.length>1&&n===lastPick[kind]) n=list[(list.indexOf(n)+1)%list.length]; lastPick[kind]=n; // never the same take twice in a row
  const s=ac.createBufferSource(); s.buffer=BUF[n]; s.playbackRate.value=1+(Math.random()*2-1)*jitter; const g=ac.createGain(); g.gain.value=SGAIN[kind]||0.6; s.connect(g); g.connect(master); s.start(ac.currentTime+delay); return true; }
export function setMuted(m){ muted=m; if(master) master.gain.value=m?0:0.55; }
export function isMuted(){ return muted; }
function env(node, t0, a, d, peak){ const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(0.0001,t0+a+d); node.connect(g); g.connect(master); return g; }
function tone(freq, type='sine', a=0.005, d=0.12, peak=0.3, glide=null){ if(!ac) return; const t=ac.currentTime; const o=ac.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,t); if(glide) o.frequency.exponentialRampToValueAtTime(glide,t+a+d); env(o,t,a,d,peak); o.start(t); o.stop(t+a+d+0.05); }
function noise(d=0.08, peak=0.2, hp=1500){ if(!ac) return; const t=ac.currentTime; const b=ac.createBuffer(1,Math.ceil(ac.sampleRate*d),ac.sampleRate); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
  const s=ac.createBufferSource(); s.buffer=b; const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; s.connect(f); env(f,t,0.003,d,peak); s.start(t); }
export const sfx = {
  tick(){ sample('tick')||tone(1400,'triangle',0.002,0.05,0.18); },
  pop(){ sample('pop')||tone(520,'sine',0.004,0.1,0.28,880); },
  select(){ sample('select')||(tone(880,'triangle',0.003,0.07,0.2), tone(1320,'sine',0.003,0.06,0.08)); },
  clack(){ sample('clack',{jitter:0.08})||(noise(0.06,0.35,900), tone(180,'square',0.002,0.06,0.12)); },
  chime(){ if(!sample('chime',{jitter:0.02})){ tone(988,'sine',0.005,0.5,0.22); setTimeout(()=>tone(1319,'sine',0.005,0.6,0.18),110); } },
  coin(){ if(!sample('coin',{jitter:0.02})){ tone(1046,'square',0.002,0.06,0.09); setTimeout(()=>tone(1568,'square',0.002,0.12,0.09),70); } },
  tock(){ if(!sample('tock',{jitter:0})){ tone(420,'sine',0.003,0.09,0.25); setTimeout(()=>tone(320,'sine',0.003,0.11,0.22),130); } else sample('tock',{jitter:0,delay:0.13}); }, // neutral clock tick (also used after a failed run)
  whoosh(){ noise(0.35,0.12,600); },
  bump(){ sample('bump',{jitter:0.05})||tone(110,'sine',0.004,0.18,0.35,70); }, // soft neutral thud, never comic
  shutter(){ noise(0.04,0.3,2500); setTimeout(()=>noise(0.05,0.25,1800),70); },
  fanfare(){ if(!sample('fanfare',{jitter:0})) [784,988,1175,1568].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',0.004,0.22,0.16),i*110)); },
  sting(){ sample('sting',{jitter:0})||this.chime(); },   // tower cleared (success only)
  bright(){ sample('bright',{jitter:0})||this.chime(); }, // exact prediction (success only)
  motor(on, rate=1){ if(!ac) return; if(on){ if(!motor){ const o=ac.createOscillator(); o.type='sawtooth'; const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900; const g=ac.createGain(); g.gain.value=0.0; o.connect(f); f.connect(g); g.connect(master); o.start(); motor={o,f,g}; }
      motor.o.frequency.setTargetAtTime(70+rate*90, ac.currentTime, 0.05); motor.g.gain.setTargetAtTime(rate>0.02?0.06:0.0, ac.currentTime, 0.05); }
    else if(motor){ motor.g.gain.setTargetAtTime(0,ac.currentTime,0.05); const m=motor; motor=null; setTimeout(()=>{ try{m.o.stop();}catch(e){} },300); } },
  squeal(on){ if(!ac) return; if(on&&!squeal){ const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=1900; const l=ac.createOscillator(); l.frequency.value=13; const lg=ac.createGain(); lg.gain.value=120; l.connect(lg); lg.connect(o.frequency); const g=ac.createGain(); g.gain.value=0.035; o.connect(g); g.connect(master); o.start(); l.start(); squeal={o,l,g}; }
    if(!on&&squeal){ const s=squeal; squeal=null; s.g.gain.setTargetAtTime(0,ac.currentTime,0.04); setTimeout(()=>{ try{s.o.stop(); s.l.stop();}catch(e){} },250); } },
  stopAll(){ this.motor(false); this.squeal(false); }
};

/* ---------- ambience + adaptive music bed (all synthesized, scheduled ahead on the audio clock) ----------
   bed(level): 0 = off, 1 = pad, 2 = + pluck arpeggio, 3 = + bass, 4 = + soft shaker, 5 = + bell line (top cleared).
   duck(on): dips music under narration. Calm, neutral: the bed never reacts to a failed run. */
let bedBus=null, ambBus=null, bedLevel=0, nextBeat=0, beat=0, schedId=null, ambNodes=null, birdT=null, ducked=false;
const BPM=72, SPB=60/BPM; // ~0.83 s per beat; one chord per bar of 4 beats
const CHORDS=[[53,57,60,64],[50,53,57,60],[46,50,53,57],[48,52,55,58]]; // Fmaj7, Dm7, Bbmaj7, C7 (MIDI)
const mtof=m=>440*Math.pow(2,(m-69)/12);
function buses(){ if(bedBus||!ac) return; bedBus=ac.createGain(); bedBus.gain.value=0; bedBus.connect(master); ambBus=ac.createGain(); ambBus.gain.value=0; ambBus.connect(master); }
function note(m,t,dur,{type='sine',peak=0.05,a=0.02,cut=2400,bus=bedBus}={}){ const o=ac.createOscillator(); o.type=type; o.frequency.value=mtof(m);
  const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=cut; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+0.05); }
function tickNoise(t,peak){ const b=ac.createBuffer(1,Math.ceil(ac.sampleRate*0.05),ac.sampleRate), ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=(Math.random()*2-1)*(1-i/ch.length);
  const s=ac.createBufferSource(); s.buffer=b; const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=6000; const g=ac.createGain(); g.gain.value=peak; s.connect(f); f.connect(g); g.connect(bedBus); s.start(t); }
function scheduleBeat(t,k){ const bar=Math.floor(k/4)%CHORDS.length, b=k%4, ch=CHORDS[bar];
  if(b===0) ch.forEach((m,i)=>note(m,t+i*0.012,SPB*4.2,{type:'triangle',peak:0.022,a:0.6,cut:1300}));           // pad
  if(bedLevel>=2) note(ch[(b*2+1)%4]+12,t,SPB*0.9,{type:'triangle',peak:0.03,a:0.006,cut:2600});                   // pluck arpeggio
  if(bedLevel>=2) note(ch[(b*2+3)%4]+12,t+SPB/2,SPB*0.8,{type:'triangle',peak:0.022,a:0.006,cut:2600});
  if(bedLevel>=3&&(b===0||b===2)) note(ch[0]-12,t,SPB*1.6,{type:'sine',peak:0.06,a:0.01,cut:500});                  // bass
  if(bedLevel>=4){ tickNoise(t+SPB/2,0.025); if(b===3) tickNoise(t+SPB*0.75,0.018); }                               // shaker
  if(bedLevel>=5&&(b===1||b===3)) note([72,74,77,79,81][(bar+b)%5],t,SPB*1.8,{type:'sine',peak:0.03,a:0.004,cut:5000}); } // bell
function scheduler(){ if(!ac) return; while(nextBeat<ac.currentTime+0.25){ scheduleBeat(nextBeat,beat); nextBeat+=SPB; beat++; } }
const BED_GAIN=0.9, AMB_GAIN=0.6;
export const mood = {
  bed(level){ if(!ac) return; buses(); bedLevel=Math.max(0,Math.min(5,level));
    if(bedLevel>0&&!schedId){ nextBeat=ac.currentTime+0.1; beat=0; schedId=setInterval(scheduler,60); }
    if(bedLevel===0&&schedId){ clearInterval(schedId); schedId=null; }
    bedBus.gain.setTargetAtTime(bedLevel?BED_GAIN*(ducked?0.35:1):0,ac.currentTime,0.6); },
  duck(on){ ducked=on; if(bedBus&&bedLevel) bedBus.gain.setTargetAtTime(BED_GAIN*(on?0.35:1),ac.currentTime,0.12); if(ambBus&&ambNodes) ambBus.gain.setTargetAtTime(AMB_GAIN*(on?0.5:1),ac.currentTime,0.12); },
  ambience(on){ if(!ac) return; buses();
    if(on&&!ambNodes){ // wind: looping filtered noise with a slow swell; cable hum: low sine with a gentle wobble
      const len=ac.sampleRate*4, b=ac.createBuffer(1,len,ac.sampleRate), ch=b.getChannelData(0); let last=0; for(let i=0;i<len;i++){ last=(last+0.02*(Math.random()*2-1))/1.02; ch[i]=last*3.2; }
      const wind=ac.createBufferSource(); wind.buffer=b; wind.loop=true; const wf=ac.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=420; wf.Q.value=0.6; const wg=ac.createGain(); wg.gain.value=0.05;
      const lfo=ac.createOscillator(); lfo.frequency.value=0.07; const lg=ac.createGain(); lg.gain.value=0.03; lfo.connect(lg); lg.connect(wg.gain);
      wind.connect(wf); wf.connect(wg); wg.connect(ambBus); wind.start(); lfo.start();
      const hum=ac.createOscillator(); hum.frequency.value=58; const hg=ac.createGain(); hg.gain.value=0.012; const hl=ac.createOscillator(); hl.frequency.value=0.3; const hlg=ac.createGain(); hlg.gain.value=1.5; hl.connect(hlg); hlg.connect(hum.frequency);
      hum.connect(hg); hg.connect(ambBus); hum.start(); hl.start();
      ambNodes=[wind,lfo,hum,hl]; ambBus.gain.setTargetAtTime(AMB_GAIN,ac.currentTime,1.2);
      const bird=()=>{ if(!ambNodes) return; const t=ac.currentTime+0.05, n=2+Math.floor(Math.random()*3), base=2600+Math.random()*1400;
        const p=ac.createStereoPanner?ac.createStereoPanner():null; if(p){ p.pan.value=Math.random()*1.6-0.8; p.connect(ambBus); }
        for(let k=0;k<n;k++){ const o=ac.createOscillator(); o.type='sine'; const t0=t+k*0.11; o.frequency.setValueAtTime(base,t0); o.frequency.exponentialRampToValueAtTime(base*(1.25+Math.random()*0.3),t0+0.06);
          const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.025,t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.08); o.connect(g); g.connect(p||ambBus); o.start(t0); o.stop(t0+0.1); }
        birdT=setTimeout(bird,2200+Math.random()*4500); };
      birdT=setTimeout(bird,1500); }
    if(!on&&ambNodes){ const nodes=ambNodes; ambNodes=null; clearTimeout(birdT); ambBus.gain.setTargetAtTime(0,ac.currentTime,0.4); setTimeout(()=>nodes.forEach(n=>{ try{n.stop();}catch(e){} }),1500); } },
};
