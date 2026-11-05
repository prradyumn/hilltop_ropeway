import { world, SPANS, TOWERS, ROPE, WHEELS, setCtx, loadSprites, loadPack, addFX, updFX, towerLamp, gondolaPos, GONDOLA_DOCK, drawWorld, scr, spanPoint, makeBot, botWheelCenter, botBodyCenter } from './world.js';
const gsap = window.gsap; // loaded by js/vendor/gsap.min.js
import { createLens } from './lens.js';
import { sfx, unlock, setMuted, isMuted, mood } from './sfx.js';

/* ================= basics ================= */
const A = n => (window.ASSETS && window.ASSETS[n]) || '';
const $ = s => document.querySelector(s);
const stage=$('#stage'), canvas=$('#world'), ctx=canvas.getContext('2d'), UI=$('#ui'), PINS=$('#pins');
const IMG={}; ['ui_flag','ui_gondola'].forEach(n=>{ const i=new Image(); i.src=A(n); i.onload=()=>dirty(); IMG[n]=i; });
setCtx(ctx); world.onSprite=()=>dirty(); loadSprites(); loadPack(); world.itemImgs={}; ['camera','lamp','toolbox','battery'].forEach(k=>{ const i=new Image(); i.src=A('ui_item_'+k); world.itemImgs[k]=i; });
/* preload + decode every image up front (behind the title), so nothing pops in or decodes for the first time mid-run.
   Same URLs as world.js/DOM use, so the browser shares the fetched + decoded resource; `keep` holds them alive. */
const PRELOAD=(()=>{ const urls=new Set(); [window.ASSETS,window.PACK,window.SPRITES].forEach(o=>o&&Object.values(o).forEach(u=>{ if(typeof u==='string'&&u) urls.add(u); }));
  let n=0; const total=urls.size, keep=[];
  const p=Promise.all([...urls].map(u=>{ const i=new Image(); i.decoding='async'; i.src=u; keep.push(i);
    return (i.decode?i.decode():new Promise((r,j)=>{ i.onload=r; i.onerror=j; })).catch(()=>{}).then(()=>{ n++; }); }));
  return { p, keep, get progress(){ return total?n/total:1; } }; })();
const START_LABEL='LET’S INVESTIGATE'; // Figma action button 1315:5178
const html=(tag,cls,inner='')=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(inner) e.innerHTML=inner; return e; };
const img=(n,cls='')=>`<img src="${A(n)}" class="${cls}" alt="" draggable="false">`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); const lerp=(a,b,t)=>a+(b-a)*t;
const ease={ io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, out:t=>1-Math.pow(1-t,3), in:t=>t*t*t, q4:t=>t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2, lin:t=>t };

/* ================= scaling & render resolution (K11: 1920x1200) ================= */
// Responsive: 1600×1000 is the SAFE AREA (always fully visible, everything is designed for it). The stage itself grows to
// fill the window (SW×SH ≥ 1600×1000), so wider/taller screens show more world instead of black bars. Camera stays centred.
let scale=1, rscale=1, SW=1600, SH=1000;
function fit(){ const W=innerWidth, H=innerHeight; scale=Math.min(W/1600,H/1000); SW=Math.max(1600,Math.round(W/scale)); SH=Math.max(1000,Math.round(H/scale));
  stage.style.width=SW+'px'; stage.style.height=SH+'px'; stage.style.transform=`scale(${scale})`; world.W=SW; world.H=SH;
  rscale=clamp(scale*Math.min(devicePixelRatio||1,1.5),0.5,1.5); canvas.width=Math.round(SW*rscale); canvas.height=Math.round(SH*rscale); dirty(); }
addEventListener('resize',fit);

/* ================= state ================= */
const S = { clock:375, points:0, guess:null, dir:null, star:false, log:[], hintText:'', hintOn:false, firstT2Fail:true, changedBeforeFirst:false };
const log=(ev,p={})=>{ const e={t:+(performance.now()/1000).toFixed(1),ev,...p}; S.log.push(e); if(window.console) console.log('[log]',ev,p); };
const bot=makeBot(); bot.visible=false; world.bots=[bot];
const spare=makeBot(); spare.visible=false; spare.mode='rope'; spare.d=0; world.bots.push(spare);

/* ================= cancellable flow primitives ================= */
const CANCEL={cancel:true}; const pend=new Set();
function P(setup){ return new Promise((resolve,reject)=>{ const e={reject,cleanup:null}; pend.add(e); const done=v=>{ if(!pend.has(e)) return; pend.delete(e); e.cleanup&&e.cleanup(); resolve(v); }; e.cleanup=setup(done)||null; }); }
function abortAll(){ for(const e of [...pend]){ e.cleanup&&e.cleanup(); e.reject(CANCEL); } pend.clear(); motion=null; tweens.length=0; follow=null; rideFollow=null; sfx.stopAll(); gsap.killTweensOf(TS); gsap.killTweensOf(cam); TS.v=1; cine(false); vignette(false); clearNudges(); document.querySelectorAll('.wipe,.cpass,.titlecard,.timecard').forEach(e=>e.remove()); }
const wait=ms=>P(done=>{ const id=setTimeout(done,ms); return ()=>clearTimeout(id); });
const click=el=>P(done=>{ const h=e=>{ sfx.tick(); done(e); }; el.addEventListener('click',h); return ()=>el.removeEventListener('click',h); });

/* ================= tweens ================= */
const tweens=[]; let needDraw=true; const dirty=()=>{ needDraw=true; };
function tween(obj,to,dur,ez=ease.io,opt={}){ return P(done=>{ const from={}; for(const k in to) from[k]=obj[k]; const tw={obj,from,to,dur:Math.max(0.001,dur),t:0,ez,done,log:opt.logKeys||[]}; tweens.push(tw); return ()=>{ const i=tweens.indexOf(tw); if(i>=0) tweens.splice(i,1); }; }); }
function tweenFree(obj,to,dur,ez=ease.io){ const from={}; for(const k in to) from[k]=obj[k]; tweens.push({obj,from,to,dur,t:0,ez,done:null,log:[]}); }
function updTweens(dt){ for(let i=tweens.length-1;i>=0;i--){ const w=tweens[i]; w.t+=dt; const p=clamp(w.t/w.dur,0,1), e=w.ez(p);
  for(const k in w.to){ if(k==='zoom') w.obj[k]=Math.exp(lerp(Math.log(w.from[k]),Math.log(w.to[k]),e)); else w.obj[k]=lerp(w.from[k],w.to[k],e); }
  if(p>=1){ tweens.splice(i,1); w.done&&w.done(); } } }

/* ================= camera ================= */
const cam=world.cam; let follow=null, rideFollow=null; // rideFollow(dt): per-frame camera hook for the G7 gondola ride
function camTo(t,dur=1.6,ez='power2.inOut'){ const pr={x:cam.x,y:cam.y,lz:Math.log(cam.zoom),rot:cam.rot||0};
  return P(done=>{ const tw=gsap.to(pr,{x:t.x,y:t.y,lz:Math.log(t.zoom),rot:t.rot||0,duration:dur,ease:ez,onUpdate:()=>{ cam.x=pr.x; cam.y=pr.y; cam.zoom=Math.exp(pr.lz); cam.rot=pr.rot; dirty(); },onComplete:done}); return ()=>tw.kill(); }); }
// multi-shot camera path: [{x,y,zoom,rot,d,ease}, ...]
function camPath(shots){ const pr={x:cam.x,y:cam.y,lz:Math.log(cam.zoom),rot:cam.rot||0};
  return P(done=>{ const tl=gsap.timeline({onUpdate:()=>{ cam.x=pr.x; cam.y=pr.y; cam.zoom=Math.exp(pr.lz); cam.rot=pr.rot; dirty(); },onComplete:done});
    shots.forEach(s=>tl.to(pr,{x:s.x,y:s.y,lz:Math.log(s.zoom),rot:s.rot||0,duration:s.d||1.6,ease:s.ease||'power2.inOut'},s.at)); return ()=>tl.kill(); }); }
// crane: pull back + lift, then settle in with a little overshoot
function crane(to,dur=2.4){ const mid={x:(cam.x+to.x)/2,y:(cam.y+to.y)/2+1.2,zoom:Math.min(cam.zoom,to.zoom)*0.62,rot:-0.03};
  return camPath([{...mid,d:dur*0.45,ease:'power2.in'},{...to,rot:0,d:dur*0.55,ease:'back.out(1.15)'}]); }
const cine=on=>stage.classList.toggle('cine',on);
const vignette=on=>$('#vig').classList.toggle('on',on);
function flash(a=0.6){ const f=$('#flash'); gsap.fromTo(f,{opacity:a},{opacity:0,duration:0.6,ease:'power2.out'}); }
const TS={v:1};
function slowmo(hold=0.7,to=0.28){ gsap.killTweensOf(TS); gsap.timeline().to(TS,{v:to,duration:0.12,ease:'power2.out'}).to(TS,{v:1,duration:0.6,ease:'power2.in'},`+=${hold}`); }
function shake(a=0.6){ cam.shake=Math.max(cam.shake,a); }
function punch(f=1.35,hold=0.8){ if(!follow) return; const base=follow.zoom; gsap.killTweensOf(follow); gsap.timeline().to(follow,{zoom:base*f,duration:0.35,ease:'power3.out'}).to(follow,{zoom:base,duration:0.9,ease:'power2.inOut'},`+=${hold}`); }
function drama(kind,i){ if(follow&&follow.replay) return;
  if(kind==='slip'){ slowmo(0.8); punch(1.45,0.9); }
  if(kind==='stall'){ slowmo(0.5,0.4); punch(1.3,0.8); }
  if(kind==='bump'){ shake(0.7); }
  if(kind==='arrive'){ slowmo(0.25,0.35); world.lampBurst[i]=1; gsap.to(world.lampBurst,{[i]:0,duration:1.4,ease:'power2.out',onUpdate:dirty}); flash(0.35); punch(1.2,0.5); } }
function segView(i,shift=115){ if(i===0) return {x:5.2,y:3.5,zoom:112}; const s=SPANS[i]; const dx=Math.abs(s.b.x-s.a.x), dy=s.b.y-s.a.y; const z=Math.min(1250/(dx+3.2),520/(dy+2.8)); return {x:(s.a.x+s.b.x)/2, y:(s.a.y+s.b.y)/2 - shift/z, zoom:z}; }
const V={ wide:{x:16,y:10.5,zoom:31}, wideHigh:{x:17,y:14,zoom:24}, station:{x:-7.4,y:2.7,zoom:88}, gate:{x:-9.6,y:2.1,zoom:118},
  towers:{x:19,y:11.5,zoom:34}, tour:{x:1.9,y:2.5,zoom:135}, rope:{x:40.6,y:24.0,zoom:62}, rideStart:{x:-6.6,y:2.8,zoom:84} };
function updFollow(dt){ if(!follow) return; const b=follow.bot, w=botWheelCenter(b); let lx=0,ly=0; if(b.mode==='span'){ const s=SPANS[b.span]; lx=s.ux*follow.lead; ly=s.uy*follow.lead; } else ly=follow.lead;
  const tx=w.x+lx, ty=w.y+ly - (follow.shift||100)/cam.zoom; const k=1-Math.exp(-6*dt); cam.x+= (tx-cam.x)*k; cam.y+=(ty-cam.y)*k; if(follow.zoom) cam.zoom=Math.exp(lerp(Math.log(cam.zoom),Math.log(follow.zoom),k*0.5)); }

/* ================= sky & light keyed to the clock ================= */
const SKYK=[[375,'#2E3266','#E9A08C',0.30],[380,'#5F7FC0','#FFC79A',0.12],[390,'#86B7E3','#FFE6C2',0.03],[405,'#84BFEA','#E9F5FF',0],[420,'#7DBAEB','#DDF0FF',0]];
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const mix=(a,b,t)=>{ const A1=hex(a),B1=hex(b); return `rgb(${A1.map((v,i)=>Math.round(lerp(v,B1[i],t))).join(',')})`; };
let tintA=0.3, warmA=0;
function applySky(){ const m=clamp(S.clock,375,420); let i=0; while(i<SKYK.length-2&&m>SKYK[i+1][0]) i++; const a=SKYK[i], b=SKYK[i+1]; const t=clamp((m-a[0])/(b[0]-a[0]),0,1);
  stage.style.setProperty('--skyTop',mix(a[1],b[1],t)); stage.style.setProperty('--skyBot',mix(a[2],b[2],t)); tintA=lerp(a[3],b[3],t);
  const d=clamp((m-375)/45,0,1); stage.style.setProperty('--stars',String(clamp(1-d*5,0,1))); stage.style.setProperty('--sunX',(12+d*16)+'%'); stage.style.setProperty('--sunY',(86-Math.sin(clamp((m-372)/48,0,1)*Math.PI/2)*68)+'%');
  stage.style.setProperty('--cloudA',String(0.35+d*0.4)); world.warm=clamp(1-(m-375)/14,0,1); warmA=m<378?0:m<392?(m-378)/14*0.14:m<406?0.14:Math.max(0.06,0.14-(m-406)/14*0.08); dirty(); }

/* ================= lens ================= */
const lensEl=$('#lens'); let lens=null; try{ lens=createLens($('#lensCanvas')); }catch(e){ lens=null; } if(!lens) lensEl.classList.add('nogl');
let lensBot=null;
function lensShow(mode,name,fallbackImg){ lensEl.querySelector('.name').textContent=name||''; lensEl.querySelector('.fallback').src=A(fallbackImg||'ui_profile_smooth'); lensEl.classList.add('on'); lensEl.classList.toggle('compact',mode==='idle'); stage.classList.add('lens-on'); if(lens){ lens.size(438,274,Math.min(1.5,rscale)); lens.show(mode); } }
function lensHide(){ lensEl.classList.remove('on'); stage.classList.remove('lens-on'); setTimeout(()=>{ if(!lensEl.classList.contains('on')&&lens) lens.hide(); },300); lensBot=null; }
const WNAME={smooth:'Smooth wheel',big_smooth:'Big smooth wheel',grooved:'Grooved wheel',band:'Grooved + band',big_band:'Big grooved + band'};
const WPROF={smooth:'ui_profile_smooth',big_smooth:'ui_profile_big_smooth',grooved:'ui_profile_grooved',band:'ui_profile_band',big_band:'ui_profile_big_band'};

/* ================= HUD ================= */
const H={ clock:$('#clock'), banner:$('#banner'), tracker:$('#tracker'), notebook:$('#notebook'), mission:$('#mission') };
H.notebook.querySelector('img').src=A('ui_notebook'); H.mission.querySelector('.bg').src=A('ui_mission_card');
const fmt=m=>`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;
function paintClock(){ H.clock.querySelector('.time').textContent=fmt(S.clock); applySky(); }
const show=(el,on=true)=>el.classList.toggle('hide',!on);
// trackLit: what the HUD shows. It lags world.lit on purpose: a tower's icon lights when its spark lands (sparkTo)
const trackLit=[false,false,false,false]; let trackTop=false;
function paintTracker(popIdx=-1){ const n=trackLit.filter(Boolean).length+(trackTop?1:0); H.tracker.querySelectorAll('.segs path').forEach((p,k)=>{ const was=p.classList.contains('on'), on=k<n*2; p.classList.toggle('on',on); if(on&&!was&&popIdx>=0){ p.classList.add('flash'); setTimeout(()=>p.classList.remove('flash'),180+k*40); } });
  const c=H.tracker.querySelector('.count'); c.textContent=`${n}/5`; H.tracker.querySelector('.pts b').textContent=S.points; if(popIdx>=0){ c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
// a spark flies (arcing) from a stage point into tracker slot idx (0-3 towers, 4 = star)
function sparkTo(sx,sy,idx){ const n=trackLit.filter(Boolean).length+(trackTop?1:0), t=H.tracker.querySelectorAll('.segs path')[Math.min(9,n*2+1)]; /* next pair of rail segments */ if(!t) return Promise.resolve(); const R=stageRect(t); const e=html('div','spark'); e.style.left=sx+'px'; e.style.top=sy+'px'; UI.appendChild(e);
  const dx=R.x+R.w/2-sx, dy=R.y+R.h/2-sy, T=(x,y,s)=>`translate(-50%,-50%) translate(${x}px,${y}px) scale(${s})`;
  return P(done=>{ const an=e.animate([{transform:T(0,0,.4),opacity:0},{transform:T(0,-20,1.3),opacity:1,offset:.14},{transform:T(dx*.45,dy*.35-140,1),offset:.55},{transform:T(dx,dy,.6),opacity:1}],{duration:850,easing:'cubic-bezier(.45,0,.35,1)'});
    an.onfinish=()=>{ e.remove(); done(); }; return ()=>{ an.cancel(); e.remove(); }; }); }
async function addClock(m,kind){ if(kind){ { const r=stageRect(H.clock); floatAt(kind===2?'ui_badge_2min':'ui_badge_4min',r.x+r.w/2,r.y+r.h+24); } sfx.tock(); }
  for(let i=0;i<m;i++){ S.clock++; paintClock(); await wait(90); } }
function floatAt(n,x,y,w=150){ const e=html('img','floatimg'+(/^ui_badge_\d+$/.test(n)?' shine':'')); e.src=A(n); e.style.left=x+'px'; e.style.top=y+'px'; e.style.width=w+'px'; e.style.marginLeft=(-w/2)+'px'; UI.appendChild(e); setTimeout(()=>e.remove(),1200); }
function botScreen(b=bot){ const c=botBodyCenter(b); return scr(c.x,c.y); }
/* sunrise moment: once, the first calm beat after the clock passes 6:20 (never on top of a run or outcome sheet).
   One small soft-ray layer scaled up by the compositor; only transform/opacity animate. */
function maybeSunrise(){ if(S.sunrise||S.clock<380) return; S.sunrise=true; const r=html('div','rays'); $('#world').after(r); sfx.chime(); log('sunrise',{clock:fmt(S.clock)});
  const an=r.animate([{opacity:0,transform:'translate(-50%,-50%) scale(1.6) rotate(-6deg)'},{opacity:1,offset:.3},{opacity:.85,offset:.7},{opacity:0,transform:'translate(-50%,-50%) scale(2.3) rotate(8deg)'}],{duration:4200,easing:'ease-in-out'});
  an.onfinish=()=>r.remove(); }
async function banner(eyebrow,name){ maybeSunrise(); await titleCard(eyebrow,name); H.banner.innerHTML=`<b>${eyebrow}</b>${name}`; show(H.banner,true); sfx.clack(); await wait(900); }

/* ================= UI pieces ================= */
function clearUI(){ clearNudges(); UI.innerHTML=''; PINS.innerHTML=''; pins.length=0; $('#dim').classList.remove('on'); }
/* ---------- nudges: glow + pulse on what to tap, tips only the first time ---------- */
const NG={seen:new Set(), active:[]};
function stageRect(el){ const r=el.getBoundingClientRect(), s=stage.getBoundingClientRect(); return {x:(r.left-s.left)/scale, y:(r.top-s.top)/scale, w:r.width/scale, h:r.height/scale}; }
// arrow:false = a tip for a whole group of choices; no arrow, so it can't seem to point at one option
function makeTip(el,text,place='top',arrow=true){ const t=html('div','tip '+place+(arrow?'':' noarrow'),`<span>${text}</span>`); UI.appendChild(t); const R=stageRect(el);
  const tw=t.offsetWidth, th=t.offsetHeight; let x=R.x+R.w/2-tw/2, y=place==='top'?R.y-th-18:R.y+R.h+18; if(place==='left'){ x=R.x-tw-22; y=R.y+R.h/2-th/2; }
  x=Math.max(16,Math.min(SW-tw-16,x)); y=Math.max(12,y); t.style.left=x+'px'; t.style.top=y+'px'; return t; }
function nudge(el,{tip=null,key=null,delay=0,round=false,place='top',ring=true,arrow=true}={}){ if(!el) return ()=>{}; let tipEl=null, done=false;
  const showTip=()=>{ if(done||!el.isConnected) return; if(document.querySelector('.tip:not(.exit)')){ setTimeout(showTip,400); return; } tipEl=makeTip(el,tip,place,arrow); }; // one tip at a time
  const showIt=()=>{ if(done||!el.isConnected) return; if(ring){ el.classList.add('nudge'); if(round) el.classList.add('round'); } if(tip&&(!key||!NG.seen.has(key))) showTip(); };
  const id=setTimeout(showIt,delay); const clear=()=>{ if(done) return; done=true; clearTimeout(id); el.classList.remove('nudge','round'); tipEl&&tipEl.remove(); if(key&&tipEl) NG.seen.add(key); el.removeEventListener('click',clear,true); };
  el.addEventListener('click',clear,true); NG.active.push(clear); return clear; }
function clearNudges(){ NG.active.splice(0).forEach(f=>f()); document.querySelectorAll('.tip').forEach(t=>t.remove()); }
function clearTrayTip(){ document.querySelectorAll('.tip').forEach(t=>{ if(t.textContent.startsWith('Pick')||t.textContent.startsWith('Tap a')||t.textContent.startsWith('Tap items')) t.remove(); }); }
/* ---------- cinematic chapter card ---------- */
async function titleCard(eyebrow,name,sub=''){ const c=html('div','titlecard',`<div class="tc-eb">${eyebrow}</div><div class="tc-name">${name}</div>${sub?`<div class="tc-sub">${sub}</div>`:''}<i class="tc-line"></i>`); UI.appendChild(c); sfx.whoosh();
  await wait(1700); c.classList.add('out'); await wait(450); c.remove(); }
function cloudPass(){ const w=html('div','cpass'); ['cloud_04','cloud_01','cloud_06'].forEach((n,i)=>{ const im=new Image(); im.src=(window.PACK&&window.PACK[n])||''; im.className='cp c'+i; w.appendChild(im); }); stage.appendChild(w); setTimeout(()=>w.remove(),2600); }
/* ---------- cloud wipe transition ---------- */
async function cloudWipe(mid){ const w=html('div','wipe'); ['cloud_01','cloud_05','cloud_03','cloud_06','cloud_02'].forEach((n,i)=>{ const im=new Image(); im.src=(window.PACK&&window.PACK[n])||''; im.className='wc w'+i; w.appendChild(im); }); stage.appendChild(w); sfx.whoosh();
  await wait(20); w.classList.add('in'); await wait(650); try{ mid&&mid(); }catch(e){} dirty(); await wait(250); w.classList.add('out'); await wait(800); w.remove(); }
/* ---------- read-aloud: recorded lines (Kokoro TTS, assets/voice/<id>.mp3), browser speech as fallback ---------- */
const VO={'6:15 am. Your class is first in line.':'s1_queue','No ride until the bot checks the cable.':'s1_check','Four towers. Each one steeper.':'s1_towers',
  'This is the inspection bot. It came with a smooth wheel.':'s2_bot','Will it reach the top tower?':'s3_q','Tap the big wheel.':'s4_tapwheel',
  'The wheel turns. The rope moves with it.':'s4_turns','Now tap the bot.':'s4_tapbot','Same kind of wheel. Watch it on the bot.':'s4_same',
  'In the bot, what stays still?':'s4_q','The rope stays still, so the wheel moves itself along it.':'s4_rope','Pulley. A wheel with a groove that guides a rope.':'s4_pulley',
  'How many turns to the flag?':'g4_q','Which sentence is true?':'g5_q','Grip is what stops the slipping.':'g5_end',
  'At Tower 2, the big smooth wheel slipped too.':'g5_bigslip','At Tower 2, the wheel was already spinning fast. It still slipped.':'g5_fastslip',
  'Watch which way the top of the wheel moves.':'h_g1','Look at where the wheel touches the cable.':'h_g2','Read the mission card again.':'h_g3','How far does one turn go?':'h_g4','Check all three: turn, wheel, load.':'h_g6'};
let voEl=null, lastLine='';
// auto-narration: only lines we have a recording for (never browser TTS unprompted), after audio is unlocked by a tap
function narrate(text){ const t=String(text).replace(/<[^>]+>/g,'').trim(); if(!VO[t]||!ac_ok()) return; setTimeout(()=>speak(t),250); }
const ac_ok=()=>{ try{ return navigator.userActivation?navigator.userActivation.hasBeenActive:true; }catch(e){ return true; } };
function speak(t,id){ t=t.replace(/<[^>]+>/g,'').trim(); const key=id||VO[t]; try{ speechSynthesis.cancel(); }catch(e){} if(voEl){ voEl.pause(); voEl=null; }
  if(isMuted()) return; unlock();
  const fallback=()=>{ try{ const u=new SpeechSynthesisUtterance(t); u.rate=0.95; u.onend=()=>mood.duck(false); mood.duck(true); speechSynthesis.speak(u); }catch(e){} };
  if(!key){ fallback(); return; }
  const a=new Audio(`assets/voice/${key}.mp3`); voEl=a; mood.duck(true); const talk=on=>document.querySelectorAll('#caption .spk,#question .spk').forEach(e=>e.classList.toggle('talking',on)); talk(true);
  a.onended=()=>{ talk(false); if(voEl===a){ voEl=null; mood.duck(false); } }; a.onpause=()=>talk(false); a.onerror=()=>{ if(voEl===a){ voEl=null; fallback(); } };
  a.play().catch(()=>{ if(voEl===a){ voEl=null; fallback(); } }); }
function caption(text,{next=true}={}){ lastLine=text; narrate(text); const old=$('#caption'); if(old) old.remove(); const c=html('div','fade'); c.id='caption';
  c.innerHTML=`<div class="txt"><button class="spk" aria-label="Read aloud">${img('skai_icon_speaker')}</button><span>${text}</span></div>`+(next?`<button class="btn next" aria-label="Next">NEXT</button>`:'');
  c.querySelector('.spk').onclick=()=>speak(text.replace(/<[^>]+>/g,'')); UI.appendChild(c); return c; }
async function say(text){ const c=caption(text); const nb=c.querySelector('.next'); nudge(nb,{tip:'Tap to continue',key:'next',delay:1600}); await click(nb); c.remove(); }
function question(text){ lastLine=text; narrate(text); const old=$('#question'); if(old) old.remove(); const q=html('div','fade'); q.id='question'; q.innerHTML=`<button class="spk" aria-label="Read aloud">${img('skai_icon_speaker')}</button><span>${text}</span>`; q.querySelector('.spk').onclick=()=>speak(text); UI.appendChild(q); return q; }
const rmq=()=>{ const q=$('#question'); if(q) q.remove(); };

// projected pins
const pins=[];
function pin(el, at, ox=0, oy=0){ PINS.appendChild(el); const p={el,at,ox,oy}; pins.push(p); placePin(p); return p; }
function placePin(p){ const [wx,wy]=p.at(); const [x,y]=scr(wx,wy); p.el.style.transform=`translate(${x+p.ox}px,${y+p.oy}px)`; }
function unpin(p){ const i=pins.indexOf(p); if(i>=0) pins.splice(i,1); p.el.remove(); }

// run + hint buttons
let runBtn, hintBtn;
function buildRun(){ runBtn=html('button','btn hide'); runBtn.id='run'; runBtn.setAttribute('aria-label','Run'); runBtn.innerHTML='<span class="lbl">RUN</span>'; UI.appendChild(runBtn);
  hintBtn=html('button','imgbtn hide'); hintBtn.id='hint'; hintBtn.setAttribute('aria-label','Hint'); hintBtn.innerHTML=img('skai_note_hint')+'<span class="cost">+2 min</span>'; UI.appendChild(hintBtn);
  hintBtn.onclick=async()=>{ if(!S.hintText||S.hintOn) return; S.hintOn=true; sfx.tick(); const b=html('div','fade'); b.id='hintBubble'; b.textContent=S.hintText; UI.appendChild(b); speak(S.hintText); log('hint_requested',{at:S.chapter}); addClock(2,2).catch(()=>{}); setTimeout(()=>{ b.remove(); S.hintOn=false; },4200); }; }
let runNudge=null;
function runState(on,enabled=true,label='RUN'){ if(!runBtn) buildRun(); runNudge&&runNudge(); runNudge=null; if(on&&enabled) runNudge=nudge(runBtn,{delay:2600,tip:'Press RUN',key:'run',place:'left'}); runBtn.classList.toggle('hide',!on); runBtn.classList.toggle('off',!enabled); runBtn.querySelector('.lbl').textContent=label; hintBtn.classList.toggle('hide',!on||!S.hintText); }

// tray
function tray({options, selected, multi=false, onPick, tabs, carry, custom, onRender}){ let t=$('#tray'); if(t) t.remove(); t=html('div','fade'); t.id='tray';
  let cur = multi? new Set(selected||[]) : selected;
  const render=()=>{ t.innerHTML=(tabs?`<div class="tabs">${tabs.items.map(x=>`<button class="tab ${x.id===tabs.active?'on':''}" data-tab="${x.id}">${img(x.icon)}${x.label}</button>`).join('')}</div>`:'')+
    (carry?`<div id="carry">${carry}</div>`:'')+
    (custom?custom():`<div class="row">${options.map((o,oi)=>`<button style="--i:${oi}" class="opt ${multi?(cur.has(o.id)?'on':''):(cur===o.id?'on':'')}" data-id="${o.id}" aria-label="${o.aria||o.label||o.id}">${multi?'<span class="chk"></span>':''}${img(o.icon,'main')}${o.badge?img(o.badge,'badge'):''}${o.label?`<span>${o.label}</span>`:''}</button>`).join('')}</div>`);
    t.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ const id=b.dataset.id; if(multi){ cur.has(id)?cur.delete(id):cur.add(id); } else cur=id; sfx.select(); render(); const nb=t.querySelector(`.opt[data-id="${id}"]`); nb&&nb.classList.add('sweep'); botLook(nb); onPick&&onPick(multi?new Set(cur):cur); });
    t.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{ sfx.tick(); tabs.onTab(b.dataset.tab); }); onRender&&onRender(t); };
  render(); UI.appendChild(t); return { el:t, get value(){ return cur; }, hide(){ t.classList.add('hide'); }, show(){ t.classList.remove('hide'); }, remove(){ t.remove(); } };
}
const trayHide=()=>{ const t=$('#tray'); if(t) t.classList.add('hide'); };
// the bot's eyes glance at whatever was just tapped, then drift back (same reaction for every choice: never a cue)
let lookTimer=null;
function botLook(el){ const b=spare.visible?spare:bot; if(!b.visible||!el) return; const R=stageRect(el), [bx,by]=botScreen(b); const dx=R.x+R.w/2-bx, dy=R.y+R.h/2-by, d=Math.hypot(dx,dy)||1;
  gsap.to(b,{lookX:dx/d,lookY:-dy/d,duration:0.25,ease:'power2.out',onUpdate:dirty}); clearTimeout(lookTimer);
  lookTimer=setTimeout(()=>gsap.to(b,{lookX:0,lookY:0,duration:0.6,ease:'power2.inOut',onUpdate:dirty}),1400); }

/* ================= outcome sheet ================= */
const OUT=[['climbed','Climbed to the tower','ui_outcome_climbed'],['spun','Spun in place','ui_outcome_spun'],['slid','Slid back','ui_outcome_slid'],['wrongway','Went the wrong way','ui_outcome_wrongway'],['stopped','Stopped halfway','ui_outcome_stopped']];
function outcomeSheet(actual, ctxInfo){ const s=html('div','fade'); s.id='sheet'; s.innerHTML=`<h3>What did the bot do?</h3><div class="row">${OUT.map(([id,l,ic])=>`<button class="opt" data-id="${id}">${img(ic,'main')}<span>${l}</span></button>`).join('')}</div>`;
  UI.appendChild(s); const sn=nudge(s.querySelector('h3'),{ring:false,tip:'Tap what the bot actually did',key:'sheet',delay:500}); s.classList.add('glow');
  return P(done=>{ s.querySelectorAll('.opt').forEach(b=>b.onclick=async()=>{ sn(); s.classList.remove('glow'); sfx.select(); botLook(b); s.querySelectorAll('.opt').forEach(x=>x.onclick=null); b.classList.add('on'); const tapped=b.dataset.id, match=tapped===actual;
    log('outcome_tapped',{...ctxInfo,tapped,actual,match}); if(!match){ s.querySelector(`.opt[data-id="${actual}"]`).classList.add('actual'); setTimeout(()=>{ s.remove(); done(tapped); },1500); } else setTimeout(()=>{ s.remove(); done(tapped); },450); }); return ()=>s.remove(); }); }

/* ================= bot motion ================= */
let motion=null;
const R=b=>WHEELS[b.wheel].r; const pathLen=b=>b.mode==='rope'?12:SPANS[b.span].len;
function runPhases(b,phases,speed=1){ return P(done=>{ motion={b,phases,i:0,t:0,v:0,speed,done}; phases[0].start&&phases[0].start(motion); return ()=>{ motion=null; sfx.motor(false); sfx.squeal(false); b.jit=0; }; }); }
function updMotion(dt){ if(!motion) return; const m=motion, d=dt*m.speed*TS.v; const ph=m.phases[m.i]; const fin=ph.up(m,d); m.t+=d;
  if(fin){ ph.end&&ph.end(m); m.i++; m.t=0; if(m.i>=m.phases.length){ motion=null; sfx.motor(false); sfx.squeal(false); m.b.jit=0; m.done(); } else { const n=m.phases[m.i]; n.start&&n.start(m); } } dirty(); }
const PH={
  climb:(to,v=2)=>({ start(m){ m.b.expr='focused'; }, end(m){ m.b.v=0; }, up(m,dt){ const b=m.b; b.v=v; const st=Math.min(v*dt,to-b.d); b.d+=st; b.angle+=st/R(b); sfx.motor(true,v/2); m.dustT=(m.dustT??0.15)-dt; if(m.dustT<=0&&v>=1){ m.dustT=0.3; cableDust(b); } return b.d>=to-1e-6; } }),
  drive:(to,v=2)=>({ end(m){ m.b.v=0; }, up(m,dt){ const b=m.b; b.v=0; const st=Math.min(v*dt,b.d-to); b.d-=st; b.angle-=st/R(b); sfx.motor(true,v/2); return b.d<=to+1e-6; } }),
  spin:(dur,slide=0)=>({ start(m){ sfx.squeal(true); drama('slip'); m.b.expr='surprised'; m.fxT=0; }, up(m,dt){ const b=m.b; m.fxT-=dt; if(m.fxT<=0){ m.fxT=0.45; sparks(b); } b.angle+=2/R(b)*dt; b.jit=0.035; sfx.motor(true,1); if(slide&&m.t>0.3) b.d=Math.max(0.05,b.d-slide*dt/(dur-0.3)); return m.t>=dur; }, end(m){ m.b.jit=0; sfx.squeal(false); } }),
  slide:(to)=>({ start(m){ m.v=0; sfx.squeal(true); kick(m.b,0.25); drama('slip'); m.b.expr='surprised'; sparks(m.b); }, up(m,dt){ const b=m.b; m.v+=3*dt; const st=Math.min(m.v*dt,b.d-to); b.d-=st; b.angle-=0.6*st/R(b); b.jit=0.02; sfx.motor(true,0.4); return b.d<=to+1e-6; }, end(m){ m.b.jit=0; sfx.squeal(false); sfx.bump(); kick(m.b,-0.3); drama('bump'); dust(m.b); } }),
  decay:(dur=1.2)=>({ start(m){ drama('stall'); m.b.expr='surprised'; }, up(m,dt){ const b=m.b; const v=2*Math.exp(-2.5*m.t); const st=v*dt; b.d=Math.min(pathLen(b)-0.4,b.d+st); b.angle+=st/R(b); sfx.motor(true,v/2); return m.t>=dur; }, end(m){ sfx.motor(false); kick(m.b,0.35); } }),
  hold:(dur)=>({ up(m){ sfx.motor(false); return m.t>=dur; } }),
  call:(fn)=>({ up(m){ fn(m); return true; } }),
};
function kick(b,a){ b.swayV+=a*3; }
// sparks/dust skip invisible bots: the G5 ghost bot exists only for the lens, so no FX on an empty cable
function sparks(b){ if(!b.visible) return; const W=WHEELS[b.wheel]; addFX('vfx_slip_sparks',0,0,0.9,{follow:()=>{ const w=botWheelCenter(b); if(b.mode==='rope') return [w.x+W.r,w.y]; const s=SPANS[b.span]; return [w.x-s.nx*W.r,w.y-s.ny*W.r]; }}); }
function cableDust(b){ if(!b.visible) return; const p=b.mode==='rope'?{x:ROPE.x,y:botWheelCenter(b).y}:spanPoint(b.span,b.d); addFX('vfx_dust_puff',p.x,p.y-0.05,0.32); } // little puffs where the wheel grips
function dust(b){ if(!b.visible) return; const c=botBodyCenter(b); addFX('vfx_dust_puff',c.x,c.y-0.35,0.9); }
function updBots(dt){ world.bots.forEach(b=>{ if(!b.visible) return; if(!(motion&&motion.b===b)){ b.idleT=(b.idleT??3)-dt; if(b.idleT<0){ b.swayV+=0.13*(Math.random()<0.5?-1:1); b.idleT=3+Math.random()*3; } } const k=18, c=2.2; const acc=-k*b.sway - c*b.swayV; b.swayV+=acc*dt; b.sway+=b.swayV*dt; if(Math.abs(b.sway)>0.0005||Math.abs(b.swayV)>0.0005) dirty();
  b.blinkT-=dt; if(b.blinkT<0){ b.blink=0.14; b.blinkT=2.5+Math.random()*3.5; } if(b.blink>0){ b.blink-=dt; dirty(); } }); }

const D0S=[1.25,1.5,1.5,1.5]; const D0=0.4; const d0=i=>D0S[i]; // start distance on a span
function outcome(tw,s){ if(s.dir!=='cw') return {type:'wrong'}; const grip={smooth:0,big_smooth:0,grooved:1,band:2,big_band:2}[s.wheel]; const need=tw===1?0:2;
  if(grip<need) return grip===1?{type:'slid',at:.55}:{type:'spun',big:s.wheel==='big_smooth'};
  const extra=[...s.items].filter(i=>i!=='camera').length; if(extra>0) return {type:'stalled',at:[.70,.55,.45][extra-1]};
  return {type:'climbed', jobDone: (tw===1||tw===2)?true:s.items.has('camera')}; }
const ACTUAL={climbed:'climbed',wrong:'wrongway',spun:'spun',slid:'slid',stalled:'stopped'};
function phasesFor(b,o){ const L=pathLen(b), end=L-(b.mode==='rope'?0.25:0.32);
  switch(o.type){
    case 'climbed': return [PH.climb(end), PH.call(m=>{ sfx.clack(); kick(m.b,0.4); m.b.expr='happy'; if(m.b.mode==='span'){ drama('arrive',m.b.span); const L=towerLamp(m.b.span); addFX('vfx_lamp_flare',L[0],L[1],1.6); addFX('vfx_arrival_sparkle',L[0],L[1]-0.6,2.2); } })];
    case 'wrong': return [PH.drive(b.mode==='span'&&b.span===0?0.95:0.05), PH.call(m=>{ sfx.bump(); kick(m.b,-0.5); drama('bump'); dust(m.b); m.b.expr='surprised'; }), PH.hold(0.5)];
    case 'spun': return [PH.climb(b.d+0.6), PH.spin(2.6,o.big?0.3:0), PH.hold(0.4)];
    case 'slid': return [PH.climb(L*o.at), PH.hold(0.25), PH.slide(D0*0.4), PH.hold(0.4)];
    case 'stalled': return [PH.climb(Math.max(b.d+0.3,L*o.at-0.76)), PH.decay(1.2), PH.hold(0.8)];
  } }

/* Perform a run with follow cam + lens; returns {o, actual} */
async function performRun(b, tw, setup, {speed=1, replay=false}={}){
  const o=outcome(tw,setup); clearNudges(); trayHide(); runState(false); show(H.banner,false); // clearNudges: tray tips must not float over the run / outcome sheet
  vignette(true); follow={bot:b, lead:1.2, zoom:cam.zoom, shift:b.mode==='rope'?60:110, replay}; gsap.to(follow,{zoom:b.mode==='rope'?120:150,duration:1.1,ease:'power2.inOut'}); lensBot=b; lensShow('contact',WNAME[b.wheel],WPROF[b.wheel]);
  await runPhases(b,phasesFor(b,o),speed); gsap.killTweensOf(follow); follow=null; vignette(false); setTimeout(()=>{ b.expr='idle'; dirty(); },1400); return {o, actual:ACTUAL[o.type]};
}
async function resetBot(b,d=(b.mode==='span'?d0(b.span):0)){ if(Math.abs(b.d-d)<0.01) return; await tween(b,{d},0.6,ease.io); }

/* ================= world helpers ================= */
function placeBotSpan(b,i,d=d0(i)){ b.mode='span'; b.span=i; b.d=d; b.visible=true; dirty(); }
async function towerArrive(i){ world.lit[i]=true; S.points+=100; const [x,y]=botScreen(); floatAt('ui_badge_100',x,y-60); sfx.coin(); dirty();
  world.pulse={from:i,p:0}; gsap.to(world.pulse,{p:1,duration:1.3,ease:'power1.inOut',onUpdate:dirty,onComplete:()=>{ world.pulse=null; dirty(); }}); // light runs down the cable
  const [lx,ly]=scr(...towerLamp(i)); await sparkTo(lx,ly,i); trackLit[i]=true; paintTracker(i); sfx.sting(); mood.bed(Math.min(4,2+i)); }

/* ================= chapters ================= */
async function S1(){ S.chapter='S1';
  // Cover: minimal. The real ropeway hill as one clean wide shot (cable glow + light beads climbing it), a big title, "Tap to start".
  // Framed so the summit sits just under the title band; extra width/height on other aspects is just more sky/cloud.
  Object.assign(cam,{x:15.7,y:21.77,zoom:22,rot:0}); // hill fills the frame: station low-left, cable climbing to the summit right; title sits in the empty sky top-left world.bg={zoom:31,y:10.5}; // background layers framed like the wide gameplay view (no flat colour bands)
  applySky(); cine(true); stage.classList.add('nobars','cover'); world.cover=true; dirty();
  const st=html('div',''); st.id='start'; st.innerHTML=img('ui_title_lockup_2x','title')+`<button class="tapstart" id="startBtn" aria-label="Start">Tap to start</button>`; UI.appendChild(st);
  const drift=gsap.to(cam,{x:cam.x+1.2,y:cam.y-0.35,duration:18,ease:'sine.inOut',yoyo:true,repeat:-1,onUpdate:()=>{ if(!world.painted) dirty(); }}); // ambient 30 fps redraw picks it up
  { const sb=$('#startBtn'); if(PRELOAD.progress<1){ sb.disabled=true; const lab=()=>{ sb.textContent=`Loading ${Math.round(PRELOAD.progress*100)}%`; }; lab(); const li=setInterval(lab,150);
      try{ await Promise.race([PRELOAD.p, wait(15000)]); } finally { clearInterval(li); } sb.disabled=false; sb.textContent='Tap to start'; log('preload',{done:Math.round(PRELOAD.progress*100)}); } }
  st.classList.add('ready');
  await click(st); unlock(); mood.ambience(true); mood.bed(1); drift.kill(); introOff(); world.cover=false; world.bg=null; stage.classList.remove('nobars','cover'); goFullscreen(true); st.classList.add('leave'); sfx.whoosh(); world.kidsBob=true;
  await wait(500); st.remove();
  const fly=camPath([{x:27,y:16,zoom:22,rot:-0.05,d:2.8,ease:'power2.inOut'},{x:9,y:5.5,zoom:46,rot:0.035,d:2.2,ease:'sine.inOut'},{...V.station,rot:0,d:1.8,ease:'power3.out'}]);
  setTimeout(()=>cloudPass(),900);
  await fly; cine(false);
  const tc=html('div','timecard',`<div class="t">6:15<small>am</small></div><div class="s">Hilltop Ropeway · Lower Station</div>`); UI.appendChild(tc); sfx.chime(); await wait(1900); tc.classList.add('out'); await wait(500); tc.remove();
  show(H.clock,true); paintClock();
  await say('6:15 am. Your class is first in line.');
  await camTo(V.gate,1.2); world.operator.anim='point';
  await say('No ride until the bot checks the cable.'); world.operator.anim='clipboard';
  cine(true); sfx.whoosh();
  const cp=camPath([...TOWERS.map((t,i)=>({x:t.x+0.8,y:t.y-0.5,zoom:64,rot:-SPANS[i].ang*0.14,d:i?1.25:1.7,ease:i?'sine.inOut':'power2.in'})),{...V.towers,rot:0,d:2.0,ease:'power3.out'}]);
  for(let i=0;i<4;i++){ await wait(i?1250:1600); world.lampFlash[i]=1; dirty(); sfx.tick(); setTimeout(()=>{ world.lampFlash[i]=0; dirty(); },300); }
  await cp; cine(false); await say('Four towers. Each one steeper.');
}
// fade the intro video out; the world is drawn again underneath while it fades, then the video stops decoding
function introOff(){ const iv=$('#intro'); world.hidden=false; dirty(); if(!iv||!iv.classList.contains('on')) return; iv.classList.remove('on'); setTimeout(()=>{ if(!iv.classList.contains('on')) iv.pause(); },900); }
async function S2(){ S.chapter='S2'; world.kidsBob=false;
  await camTo({x:0.2,y:2.2,zoom:150},1.4); world.dockOpen=1; dirty(); sfx.pop(); await wait(300);
  placeBotSpan(bot,0,1.25); bot.drop=0.9; bot.alpha=0; await tween(bot,{drop:0,alpha:1},0.5,ease.out); kick(bot,0.5); sfx.clack(); world.dockOpen=0; dust(bot); bot.expr='happy'; world.kids.forEach(k=>{ if(k.n<=4) k.anim='wave'; }); setTimeout(()=>{ world.kids.forEach(k=>k.anim='idle'); bot.expr='idle'; },3200);
  await camPath([{x:botWheelCenter(bot).x+0.9,y:botWheelCenter(bot).y-0.75,zoom:250,rot:0.03,d:1.6,ease:'power3.inOut'},{x:botWheelCenter(bot).x+0.8,y:botWheelCenter(bot).y-0.75,zoom:262,rot:0,d:2.5,ease:'sine.inOut',at:'-=0.1'}]);
  const tag=html('div','tagpin','smooth wheel'); const p=pin(tag,()=>{ const w=botWheelCenter(bot); return [w.x+0.2,w.y+0.05]; });
  await say('This is the inspection bot. It came with a smooth wheel.'); unpin(p);
}
async function S3(){ S.chapter='S3';
  await camTo({x:17,y:9.6,zoom:30},1.6); world.pathDots=true; question('Will it reach the top tower?');
  const g=html('div','guesses'); g.innerHTML=[['yes','Yes','ui_guess_yes'],['partway','Partway','ui_guess_partway'],['no','No','ui_guess_no']].map(([id,l,ic])=>`<button class="guess" data-id="${id}">${img(ic)}<span>${l}</span></button>`).join(''); UI.appendChild(g); nudge(g,{ring:false,arrow:false,tip:'Tap your guess',key:'guess',delay:1400}); g.classList.add('bob');
  const pick=await P(done=>{ g.querySelectorAll('.guess').forEach(b=>b.onclick=()=>{ sfx.select(); done(b); }); });
  S.guess=pick.dataset.id; log('story_guess',{choice:S.guess}); rmq();
  const label={yes:'Yes',partway:'Partway',no:'No'}[S.guess]; const r=pick.getBoundingClientRect(), sr=stage.getBoundingClientRect();
  const chip=html('div','chipfly',`Your guess: ${label}`); chip.style.left=((r.left-sr.left)/scale+40)+'px'; chip.style.top=((r.top-sr.top)/scale+80)+'px'; UI.appendChild(chip); g.remove(); sfx.whoosh();
  chip.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${stageRect(infoBtn).x-((r.left-sr.left)/scale+40)}px,${stageRect(infoBtn).y+30-((r.top-sr.top)/scale+80)}px) scale(.5)`,opacity:.4}],{duration:650,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
  await wait(650); chip.remove(); infoBtn.animate([{transform:'scale(1)'},{transform:'scale(1.18) rotate(-4deg)'},{transform:'scale(1)'}],{duration:500}); sfx.pop(); world.pathDots=false; dirty(); await wait(400);
}
async function S4(){ S.chapter='S4';
  await camTo(V.tour,1.4);
  // 1. station wheel
  const c1=caption('Tap the big wheel.',{next:false});
  const hot=html('button','hot',img('ui_hotspot')+img('ui_hotspot','pulse')); hot.setAttribute('aria-label','Big wheel'); const hp=pin(hot,()=>[0,1.2]); setTimeout(()=>nudge(hot,{ring:false,tip:'Tap here',key:'hot',delay:300}),50);
  await click(hot); unpin(hp); c1.remove();
  world.cableMoving=true; lensShow('pulley','Station pulley','ui_pulley');
  const lc=html('div','panel labelcard fade',`${img('ui_pulley')}<div><b>Pulley</b><span>A wheel with a groove that guides a rope.</span></div><button class="spk" aria-label="Read aloud">${img('skai_icon_speaker')}</button>`); lc.style.left='540px'; lc.style.top='120px'; UI.appendChild(lc);
  lc.querySelector('.spk').onclick=()=>speak('Pulley. A wheel with a groove that guides a rope.');
  const c2=caption('The wheel turns. The rope moves with it.',{next:false});
  await wait(2600);
  // 2. bot
  c2.querySelector('span').textContent='Now tap the bot.'; lastLine='Now tap the bot.'; narrate(lastLine); const hot2=html('button','hot',img('ui_hotspot')+img('ui_hotspot','pulse')); const hp2=pin(hot2,()=>{ const c=botBodyCenter(bot); return [c.x,c.y]; });
  await click(hot2); unpin(hp2); c2.remove(); lc.remove(); world.cableMoving=false; lensHide(); dirty();
  await lookCloser(bot);
  const clampAt=d=>{ const p=spanPoint(0,d); return [p.x,p.y]; };
  const cl1=html('img','icopin'); cl1.src=A('ui_clamp'); const cl2=cl1.cloneNode(); const q1=pin(cl1,()=>clampAt(0.95),0,-6), q2=pin(cl2,()=>clampAt(4.2),0,-6); sfx.clack();
  const c3=caption('Same kind of wheel. Watch it on the bot.',{next:false});
  const demo=async(spd=1)=>{ for(let k=0;k<2;k++){ bot.d=1.25; dirty(); await runPhases(bot,[PH.climb(3.3,1.2)],spd); await wait(350); await tween(bot,{alpha:0},0.2); bot.d=1.25; await tween(bot,{alpha:1},0.2); } };
  await demo(); c3.remove();
  // 3. question
  question('In the bot, what stays still?');
  const mk=(n,l)=>{ const e=html('button','pin',`${img(n)}<span>${l}</span>`); return e; };
  const pw=mk('ui_pin_wheel','Wheel'), pr=mk('ui_pin_rope','Rope'), pb=mk('ui_pin_bot','Bot');
  [pw,pr,pb].forEach(e=>e.classList.add('bob')); const P1=pin(pw,()=>{ const w=botWheelCenter(bot); return [w.x,w.y+0.2]; }), P2=pin(pr,()=>clampAt(2.2)), P3=pin(pb,()=>{ const c=botBodyCenter(bot); return [c.x+0.75,c.y-0.1]; },0,90);
  let attempt=0, answered=false;
  while(!answered){ attempt++;
    const ch=await P(done=>{ [pw,pr,pb].forEach(b=>b.onclick=()=>{ sfx.select(); done(b); }); });
    const choice=ch===pr?'rope':ch===pw?'wheel':'bot'; log('still_answer',{choice,attempt});
    if(choice==='rope'||attempt>=2){ answered=true; pr.classList.add('ok'); [pw,pb].forEach(x=>x.style.opacity='.4'); sfx.chime(); }
    else { ch.classList.add('dashed'); await demo(0.5); ch.classList.remove('dashed'); }
  }
  rmq(); await say('The rope stays still, so the wheel moves itself along it.');
  [P1,P2,P3,q1,q2].forEach(unpin);
  bot.d=d0(0); dirty();
}
/* S4 "look closer": one continuous push from the hill into the wheel-on-rope contact, with a scale ruler (1 m → 10 cm → 1 cm).
   Story-only (never during a failed replay: that would point at the cause). Lens goes full-stage, animated by transform only. */
async function lookCloser(b){ const back={x:cam.x,y:cam.y,zoom:cam.zoom,rot:cam.rot||0}, w=botWheelCenter(b);
  const ru=html('div','scaleRuler',['1 m','10 cm','1 cm'].map((l,i)=>`<span data-i="${i}">${l}</span>`).join('')+'<i class="mk"></i>'); UI.appendChild(ru);
  const step=i=>{ ru.querySelectorAll('span').forEach(s=>s.classList.toggle('on',+s.dataset.i===i)); ru.querySelector('.mk').style.transform=`translateY(${i*58}px)`; sfx.tick(); };
  step(0); cine(true); sfx.whoosh(); const t10=setTimeout(()=>step(1),900);
  try{
    await camTo({x:w.x,y:w.y+0.02,zoom:620,rot:0},1.7,'power3.in');
    if(lens){ lensEl.querySelector('.name').textContent=WNAME[b.wheel]; lensEl.querySelector('.fallback').src=A(WPROF[b.wheel]);
      lensEl.classList.add('full','on'); lens.size(SW,SH,Math.min(1.25,rscale)); lensBot=b; lens.macro=0; lens.show('contact'); flash(0.5);
      const corner=`translate(126px,${SH-32-274}px) scale(${438/SW},${274/SH})`; // the small close-up box, in full-stage terms
      const grow=lensEl.animate([{transform:corner},{transform:'none'}],{duration:650,easing:'cubic-bezier(.6,0,.2,1)'}); await P(done=>{ grow.onfinish=done; return ()=>grow.cancel(); });
      gsap.to(lens,{macro:1,duration:2.6,ease:'power2.inOut'}); setTimeout(()=>step(2),1300);
      await runPhases(b,[PH.climb(b.d+0.45,0.22)]); await wait(700);
      gsap.to(lens,{macro:0,duration:0.7,ease:'power2.in'});
      const shrink=lensEl.animate([{transform:'none'},{transform:corner,opacity:0}],{duration:600,easing:'cubic-bezier(.6,0,.4,1)',fill:'forwards'}); await P(done=>{ shrink.onfinish=done; return ()=>shrink.cancel(); });
      lensEl.classList.remove('full'); lensHide(); shrink.cancel(); } // hold the end frame until 'on' is off, so nothing pops back for a frame
    else { await wait(1800); step(2); await wait(800); }
    await camTo(back,1.2,'power2.inOut');
  } finally { clearTimeout(t10); ru.remove(); cine(false); lensEl.classList.remove('full'); b.expr='idle'; dirty(); }
}
async function G1(){ S.chapter='G1'; S.dir=null; S.hintText='Watch which way the top of the wheel moves.'; S.changedBeforeFirst=false;
  world.operator.visible=false; // brief: operator appears in story slides only (preset() covers menu jumps, this covers play-through)
  show(H.tracker,true); paintTracker(); await crane(segView(0),2.4); await banner('TOWER 1','GENTLE SLOPE');
  const setup=()=>({dir:S.dir,wheel:bot.wheel,items:new Set()});
  const tr=tray({ options:[{id:'cw',icon:'ui_turn_cw',aria:'Clockwise'},{id:'ccw',icon:'ui_turn_ccw',aria:'Anticlockwise'}], selected:S.dir, onPick:v=>{ S.dir=v; log('setting_changed',{tower:1,variable:'dir',to:v}); runState(true,true); clearTrayTip(); } });
  runState(true,!!S.dir); nudge(tr.el.querySelector('.row'),{tip:'Pick which way the wheel turns',key:'tray-dir',delay:500});
  await towerLoop(1,setup,()=>{ tr.show(); runState(true,!!S.dir); });
  tr.remove();
}
async function towerLoop(tw,getSetup,reopen,{onSuccess}={}){
  let run=0, prev=null;
  while(true){
    reopen(); show(H.banner,false); maybeSunrise();
    await click(runBtn); const s=getSetup(); run++;
    const same=prev&&JSON.stringify([s.dir,s.wheel,[...s.items].sort()])===JSON.stringify([prev.dir,prev.wheel,[...prev.items].sort()]);
    log('run_started',{tower:tw,run,setup:{dir:s.dir,wheel:s.wheel,items:[...s.items]},same_as_previous:!!same,anticipated:run===1&&S.changedBeforeFirst});
    const {o,actual}=await performRun(bot,tw,s);
    const success=o.type==='climbed'&&o.jobDone; log('run_result',{tower:tw,run,actual,progress:+(bot.d/pathLen(bot)).toFixed(2)});
    if(success){ await towerArrive(tw-1); if(onSuccess) await onSuccess(); }
    else { if(o.type==='climbed'&&!o.jobDone){ /* camera missing */ const [x,y]=botScreen(); floatAt('ui_glyph_film',x,y-70,90); } await addClock(4,4); }
    lensHide(); await wait(400);
    await outcomeSheet(actual,{tower:tw,run});
    if(success){ await addClock(4); return {run}; }
    // neutral replay
    await replay(tw,s); prev=s;
  }
}
async function replay(tw,s){ bot.d=d0(bot.span); dirty(); const tag=html('div','chip fade',`${img('ui_replay')}Replay`); tag.style.left='32px'; tag.style.bottom='322px'; UI.appendChild(tag);
  let gchip=null; if(tw===2&&S.firstT2Fail&&S.guess){ S.firstT2Fail=false; gchip=html('div','chip fade',`${img('ui_notebook')}You guessed: ${({yes:'Yes',partway:'Partway',no:'No'})[S.guess]}`); gchip.style.left='32px'; gchip.style.bottom='384px'; UI.appendChild(gchip); }
  await camTo({...segView(bot.span)},0.6);
  await performRun(bot,tw,s,{speed:0.75,replay:true}); await wait(500); tag.remove(); gchip&&gchip.remove(); lensHide();
  await resetBot(bot); await camTo(segView(bot.span),0.8);
}
async function G2(){ S.chapter='G2'; S.hintText='Look at where the wheel touches the cable.'; S.changedBeforeFirst=false;
  bot.d=SPANS[0].len-0.32; placeBotSpan(bot,1); await crane(segView(1),2.4); await banner('TOWER 2','STEEP SLOPE');
  let firstRunDone=false;
  const opts=[{id:'smooth',icon:'ui_wheel_smooth',badge:'ui_profile_smooth',label:'Smooth'},{id:'big_smooth',icon:'ui_wheel_big_smooth',badge:'ui_profile_big_smooth',label:'Big smooth'},{id:'grooved',icon:'ui_wheel_grooved',badge:'ui_profile_grooved',label:'Grooved'},{id:'band',icon:'ui_wheel_band',badge:'ui_profile_band',label:'Grooved + band'}];
  const tr=tray({ options:opts, selected:bot.wheel, carry:`${img('ui_turn_cw')}Turn kept from Tower 1`, onPick:async v=>{ if(!firstRunDone) S.changedBeforeFirst=true; log('setting_changed',{tower:2,variable:'wheel',from:bot.wheel,to:v,anticipated:!firstRunDone});
    await swapWheel(bot,v); lensShow('idle',WNAME[v],WPROF[v]); } });
  lensShow('idle',WNAME[bot.wheel],WPROF[bot.wheel]); lensBot=bot; nudge(tr.el,{ring:false,tip:'Tap a wheel to swap it',key:'tray-wheel',delay:600}); // on the tray, not the row: keeps the "Turn kept" line readable
  await towerLoop(2,()=>{ firstRunDone=true; return {dir:S.dir||'cw',wheel:bot.wheel,items:new Set()}; },()=>{ tr.show(); runState(true,true); lensBot=bot; lensShow('idle',WNAME[bot.wheel],WPROF[bot.wheel]); });
  tr.remove(); lensHide();
}
async function swapWheel(b,v){ sfx.pop(); await tween(b,{wheelPop:0.01},0.16,ease.in); b.wheel=v; await tween(b,{wheelPop:1},0.3,ease.out); kick(b,0.2); sfx.clack(); }
const ITEMS=[{id:'camera',icon:'ui_item_camera',label:'Camera'},{id:'lamp',icon:'ui_item_lamp',label:'Lamp'},{id:'toolbox',icon:'ui_item_toolbox',label:'Toolbox'},{id:'battery',icon:'ui_item_battery',label:'Spare battery'}];
function missionCard(done=false){ H.mission.querySelector('.lines').innerHTML=`<div class="ln ${done?'done':''}" id="jobLine">${img('ui_glyph_film')}<span>Film the cable.</span><i class="tick"></i></div><div class="ln">${img('ui_glyph_sunrise')}<span>Sunrise: 6:20</span></div><div class="ln">${img('ui_glyph_battery')}<span>Battery: full</span></div>`; }
async function G3(){ S.chapter='G3'; S.hintText='Read the mission card again.'; S.changedBeforeFirst=false;
  placeBotSpan(bot,2); bot.items=new Set(['camera','lamp','toolbox','battery']); await crane(segView(2,135),2.4); await banner('TOWER 3','STEEPER, WITH LOAD');
  missionCard(false); show(H.mission,true); sfx.pop(); H.mission.classList.add('attn'); setTimeout(()=>H.mission.classList.remove('attn'),2600);
  let firstRunDone=false;
  const tr=tray({ options:ITEMS, selected:[...bot.items], multi:true, onPick:v=>{ if(!firstRunDone) S.changedBeforeFirst=true; bot.items=v; kick(bot,0.25); dirty(); log('setting_changed',{tower:3,variable:'load',items:[...v],anticipated:!firstRunDone}); } }); nudge(tr.el.querySelector('.row'),{ring:false,tip:'Tap items to pack or unpack',key:'tray-load',delay:700});
  await towerLoop(3,()=>{ firstRunDone=true; return {dir:S.dir||'cw',wheel:bot.wheel,items:new Set(bot.items)}; },()=>{ tr.show(); runState(true,true); },{ onSuccess:async()=>{ sfx.shutter(); missionCard(true); } });
  tr.remove(); await wait(600); show(H.mission,false);
}
const G4D=1.6;
async function G4(){ S.chapter='G4'; S.hintText='How far does one turn go?';
  placeBotSpan(bot,3,G4D); bot.items=new Set(['camera']); if(bot.wheel!=='band') bot.wheel='band';
  const mp=spanPoint(3,5.6); const view={x:mp.x+0.6,y:mp.y-40/82,zoom:82}; await crane(view,2.4); await banner('TOWER 4','COUNT THE CLIMB'); show(H.banner,false);
  world.ruler={span:3,d0:G4D,len:9.4,reveal:0}; sfx.whoosh(); await tween(world.ruler,{reveal:1},0.9,ease.out);
  const tb=html('div','panel fade'); tb.id='table'; UI.appendChild(tb);
  const rows=[]; const paintTable=()=>{ tb.innerHTML=`<div class="hd"><span>${img('ui_hdr_turns')}Turns</span><span>${img('ui_hdr_distance')}Distance</span></div>`+rows.map(r=>r.grp?`<div class="grp">${r.grp}</div>`:`<div class="r ${r.n?'new':''}"><span>${r.t}</span><span>${r.d}</span></div>`).join(''); rows.forEach(r=>r.n=false); };
  paintTable();
  // tape stamp: "N cm" pops on the stretch of cable this turn covered, then flies into its new table row
  const stampToRow=cm=>{ const C=2*Math.PI*R(bot), s=SPANS[3], mp=spanPoint(3,bot.d-C/2); const [x,y]=scr(mp.x-s.nx*0.55,mp.y-s.ny*0.55);
    const st=html('div','stamp',`${img('ui_tape')}<span>${cm} cm</span>`); st.style.left=x+'px'; st.style.top=y+'px'; UI.appendChild(st);
    const rowEl=[...tb.querySelectorAll('.r')].pop(); if(rowEl) rowEl.style.visibility='hidden'; const R2=rowEl?stageRect(rowEl):{x:x,y:y,w:0,h:0};
    const dx=R2.x+R2.w*0.72-x, dy=R2.y+R2.h/2-y, T=(a,b,s)=>`translate(-50%,-50%) translate(${a}px,${b}px) scale(${s})`;
    return P(done=>{ const an=st.animate([{transform:T(0,10,.3),opacity:0},{transform:T(0,-6,1.12),opacity:1,offset:.22},{transform:T(0,0,1),offset:.45},{transform:T(dx,dy,.62),opacity:.9}],{duration:1150,easing:'cubic-bezier(.4,0,.3,1)'});
      const fin=()=>{ st.remove(); if(rowEl) rowEl.style.visibility=''; }; an.onfinish=()=>{ fin(); done(); }; return ()=>{ an.cancel(); fin(); }; }); };
  const turnOnce=async()=>{ const r=R(bot), C=2*Math.PI*r; world.ribbon=world.ribbon||{span:3,d0:G4D,len:0}; world.ribbon.seg=C; const from=bot.d; await P(done=>{ motion={b:bot,phases:[{up(m,dt){ const st=Math.min(C/1.2*dt, from+C-bot.d); bot.d+=st; bot.angle+=st/r; world.ribbon.len=bot.d-G4D; sfx.motor(true,0.6); return bot.d>=from+C-1e-6; }}],i:0,t:0,speed:1,done}; return ()=>{ motion=null; }; }); sfx.motor(false); };
  async function watchTurns(n,cm){ const t=html('div','fade'); t.id='tray'; t.innerHTML=`<div class="row"><button class="opt wide" id="oneTurn">${img('ui_one_turn','main')}<span>1 turn</span></button></div>`; UI.appendChild(t);
    for(let k=1;k<=n;k++){ nudge($('#oneTurn'),{tip:'Tap to turn the wheel once',key:'oneturn',delay:500}); await click($('#oneTurn')); $('#oneTurn').disabled=true; await turnOnce(); rows.push({t:k,d:`${k*cm} cm`,n:true}); paintTable(); sfx.pop(); await stampToRow(cm); sfx.chime(); $('#oneTurn').disabled=false; } t.remove(); }
  async function predictRun(target,cm,ctxName){ bot.d=G4D; world.ribbon.len=0; dirty();
    world.flags=[{span:3,d:G4D+target/10}]; sfx.pop();
    question('How many turns to the flag?');
    let val=3; const t=html('div','fade'); t.id='tray'; t.innerHTML=`<div class="steplbl">Your turns</div><div class="stepper"><button class="imgbtn" id="minus" aria-label="Fewer">${img('ui_btn_minus')}</button><div class="val" id="sv">${val}</div><button class="imgbtn" id="plus" aria-label="More">${img('ui_btn_plus')}</button></div>`; UI.appendChild(t);
    $('#minus').onclick=()=>{ val=Math.max(1,val-1); $('#sv').textContent=val; sfx.tick(); }; $('#plus').onclick=()=>{ val=Math.min(99,val+1); $('#sv').textContent=val; sfx.tick(); };
    nudge(t.querySelector('.stepper'),{ring:false,tip:'Use − and + to set your turns',key:'stepper',delay:600}); runState(true,true); await click(runBtn); runState(false); t.remove(); rmq();
    const needed=Math.round(target/cm); const r=R(bot), C=2*Math.PI*r; world.ribbon.seg=C; const cnt=html('div','counter'); cnt.style.backgroundImage=`url(${A('ui_counter_bubble')})`; const cp=pin(cnt,()=>{ const w=botWheelCenter(bot); return [w.x,w.y]; });
    const maxD=SPANS[3].len-0.4; let k=0;
    for(k=1;k<=val;k++){ const from=bot.d; if(from+C>maxD) break; await P(done=>{ motion={b:bot,phases:[{up(m,dt){ const st=Math.min(C/0.6*dt, from+C-bot.d); bot.d+=st; bot.angle+=st/r; world.ribbon.len=bot.d-G4D; sfx.motor(true,1); return bot.d>=from+C-1e-6; }}],i:0,t:0,speed:1,done}; return ()=>{ motion=null; }; }); cnt.textContent=k; sfx.tick(); }
    sfx.motor(false); await wait(400);
    const delta=val-needed; let pts=delta===0?50:Math.abs(delta)===1?25:0; S.points+=pts; paintTracker();
    log('prediction',{context:ctxName,wheel_cm:cm,predicted:val,needed,delta,points:pts});
    const gap=(bot.d-G4D)*10-target; const [x,y]=botScreen();
    if(delta===0){ sfx.bright(); floatAt('ui_badge_50',x,y-90); const fp=spanPoint(3,G4D+target/10); addFX('vfx_arrival_sparkle',fp.x,fp.y+0.6,1.8); }
    else { if(pts) floatAt('ui_badge_25',x,y-90); const msg=gap<0?`${Math.round(-gap)} cm to go`:`${Math.round(gap)} cm past`; const ch=html('div','chip fade',msg); ch.style.padding='12px 18px'; const pp=pin(ch,()=>{ const p=spanPoint(3,G4D+target/10); return [p.x,p.y]; },-60,-130); await wait(1800); unpin(pp); }
    await addClock(2); await wait(900); unpin(cp); }
  await watchTurns(3,10);
  await predictRun(80,10,'T4a');
  // bigger wheel
  const nx=html('div','fade'); nx.id='tray'; nx.innerHTML=`<div class="row"><button class="opt wide" id="nextWheel">${img('ui_wheel_big_band','main')}<span>Next wheel: bigger</span></button></div>`; UI.appendChild(nx);
  nudge($('#nextWheel'),{delay:800}); await click($('#nextWheel')); nx.remove(); bot.d=G4D; world.ribbon.len=0; world.flags=[]; dirty(); await swapWheel(bot,'big_band');
  rows.push({grp:'BIGGER WHEEL'}); paintTable();
  await watchTurns(2,15);
  await predictRun(90,15,'T4b');
  // finish the span
  tb.remove(); world.flags=[]; world.ribbon=null; world.ruler=null; dirty();
  await performRun(bot,4,{dir:'cw',wheel:bot.wheel,items:new Set(['camera'])}); lensHide(); await towerArrive(3); await addClock(4);
}
async function G5(){ S.chapter='G5'; S.hintText='';
  cine(true); await camPath([{x:30,y:16,zoom:24,rot:-0.03,d:1.6,ease:'power2.inOut'},{x:16,y:10.5,zoom:30,rot:0,d:1.8,ease:'power3.out'}]); cine(false); $('#dim').classList.add('on');
  const R0=[{id:'grip',t:'The steeper the rope, the <b>more grip</b> the wheel needs, so a slipping bot needs a grippier wheel or a lighter load.',ok:true},
    {id:'motor',t:'The steeper the rope, the <b>faster</b> the wheel should spin, so a slipping bot needs a stronger motor.'},
    {id:'big',t:'The steeper the rope, the <b>bigger</b> the wheel should be, because a big wheel covers more rope each turn.'}].sort(()=>Math.random()-0.5);
  await titleCard('THE BIG IDEA','SAY THE RULE'); question('Which sentence is true?');
  const box=html('div',''); box.id='rules'; box.innerHTML=R0.map(r=>`<button class="rule fade" data-id="${r.id}"><span class="rs" aria-label="Read aloud">${img('skai_icon_speaker')}</span><span class="rt">${r.t}</span></button>`).join('')+`<div style="text-align:center;margin-top:10px"><button class="btn teal" id="lockIn" disabled>${img('ui_btn_lock')}Lock in</button></div>`; UI.appendChild(box);
  /* no extra tip here: the question already says what to do */
  let sel=null; box.querySelectorAll('.rule').forEach(b=>b.onclick=e=>{ if(e.target.closest('.rs')){ speak(b.textContent,'g5_'+b.dataset.id); return; } // speaker icon reads the sentence, doesn't pick it
    clearNudges(); nudge($('#lockIn'),{delay:600,tip:'Then lock it in',key:'lock'}); sel=b.dataset.id; sfx.select(); box.querySelectorAll('.rule').forEach(x=>x.classList.toggle('on',x===b)); $('#lockIn').disabled=false; });
  await click($('#lockIn')); $('#lockIn').disabled=true; box.querySelectorAll('.rule').forEach(b=>b.onclick=null);
  const ok=sel==='grip'; log('rule_chosen',{sentence_id:sel,correct:ok}); rmq();
  if(!ok){ const wheel=sel==='big'?'big_smooth':'smooth'; const line=sel==='big'?'At Tower 2, the big smooth wheel slipped too.':'At Tower 2, the wheel was already spinning fast. It still slipped.';
    box.style.top='130px'; lensShow('contact',WNAME[wheel],WPROF[wheel]); const ghost=makeBot(); ghost.wheel=wheel; ghost.visible=false; lensBot=ghost; ghost.mode='span'; ghost.span=1; ghost.d=1;
    const c=caption(line,{next:false}); await runPhases(ghost,[PH.spin(2.4)]); c.remove(); lensHide(); }
  box.querySelectorAll('.rule').forEach(b=>{ if(b.dataset.id==='grip'){ b.classList.remove('on'); b.classList.add('right'); } else b.classList.add('fadeout'); }); sfx.chime();
  await wait(1200); box.remove(); await blueprint();
  await say('Grip is what stops the slipping.'); $('#dim').classList.remove('on');
}
/* G5 blueprint: the three towers redrawn as field notes (slope, grip needed, what worked), then the rule word by word.
   Plays after lock-in whatever was chosen. One panel slides (transform); tiles/meters/words are small CSS animations. */
async function blueprint(){
  const T=[{n:'Tower 1',d:'gentle',h:40,need:1,wheel:'ui_wheel_smooth',w:'Smooth wheel'},{n:'Tower 2',d:'steep',h:108,need:2,wheel:'ui_wheel_band',w:'Grooved + band'},{n:'Tower 3',d:'steep + load',h:108,need:3,wheel:'ui_wheel_band',w:'Band + light load',bag:true}];
  const bp=html('div',''); bp.id='bp';
  bp.innerHTML=`<div class="bp-eb">FIELD NOTES · GRIP</div><div class="bp-tiles">${T.map((t,i)=>`<div class="bp-tile" style="--i:${i}">
      <svg viewBox="0 0 320 200" aria-hidden="true"><line class="gnd" x1="6" y1="188" x2="314" y2="188"/><line class="slope" x1="20" y1="182" x2="304" y2="${182-t.h}"/>
        <g class="whl" style="--h:${t.h}"><circle r="15"/><line x1="-15" x2="15"/><line y1="-15" y2="15"/>${t.bag?'<rect x="-11" y="20" width="22" height="18" rx="5"/>':''}</g></svg>
      <div class="bp-n"><b>${t.n}</b> · ${t.d}</div>
      <div class="bp-meter">${[0,1,2].map(k=>`<i class="${k<t.need?'f':''}" style="--k:${k}"></i>`).join('')}<span>grip needed</span></div>
      <div class="bp-w">${img(t.wheel)}${t.bag?img('ui_bag_light'):''}<span>${t.w}</span></div></div>`).join('')}</div>
    <div class="bp-rule"><button class="spk" aria-label="Read aloud">${img('skai_icon_speaker')}</button><p>${'The steeper the rope, the more grip the wheel needs.'.split(' ').map((w,i)=>`<span style="--w:${i}">${w}</span>`).join(' ')}</p></div>`;
  bp.querySelector('.spk').onclick=()=>speak('The steeper the rope, the more grip the wheel needs, so a slipping bot needs a grippier wheel or a lighter load.','g5_grip');
  UI.appendChild(bp); sfx.whoosh(); log('blueprint_shown');
  const go=(from,to,ms)=>P(done=>{ const a=bp.animate([{transform:from},{transform:to}],{duration:ms,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'}); a.onfinish=done; return ()=>a.cancel(); });
  try{ await go('translateX(-102%)','none',650); setTimeout(()=>sfx.tick(),1300); setTimeout(()=>sfx.tick(),1800); setTimeout(()=>sfx.tick(),2300); setTimeout(()=>sfx.chime(),3900);
    await wait(6800); sfx.whoosh(); await go('none','translateX(102%)',550); } finally { bp.remove(); } }
async function G6(){ S.chapter='G6'; S.hintText='Check all three: turn, wheel, load.';
  placeBotSpan(bot,3,SPANS[3].len-0.32); bot.dim=true; bot.beacon=false; world.ropeRuler=true;
  spare.visible=false; spare.mode='rope'; spare.d=0; spare.wheel='smooth'; spare.items=new Set(['camera','lamp','toolbox','battery']); spare.angle=0; spare.dim=false;
  cine(true); await camPath([{x:36,y:19,zoom:48,rot:0.05,d:1.3,ease:'power2.in'},{...V.rope,rot:0,d:1.8,ease:'back.out(1.2)'}]); cine(false); await banner('THE TOP','THE HANGING ROPE'); show(H.banner,false);
  sfx.clack(); spare.visible=true; spare.alpha=0; spare.drop=0; await tween(spare,{alpha:1},0.35); kick(spare,0.5);
  const ft=html('div','chip fade',`${img('ui_factory_tag')}Factory set-up`); const fp=pin(ft,()=>{ const c=botBodyCenter(spare); return [c.x,c.y]; },70,-150); await wait(1800); unpin(fp);
  const st={dir:'ccw',wheel:'smooth',items:new Set(spare.items)}; let tab='dir'; let pred=null;
  let tr; const turnsLabel=()=>pred===null?'Turns ?':`Turns · ${pred}`;
  const tabs={ get items(){ return [{id:'dir',icon:'ui_tab_direction',label:'Turn'},{id:'wheel',icon:'ui_tab_wheel',label:'Wheel'},{id:'load',icon:'ui_tab_load',label:'Load'},{id:'turns',icon:'ui_hdr_turns',label:turnsLabel()}]; }, get active(){ return tab; }, onTab:t=>{ tab=t; build(); } };
  function build(){ const common={tabs};
    if(tab==='dir') tr=tray({...common, options:[{id:'cw',icon:'ui_turn_cw',aria:'Clockwise'},{id:'ccw',icon:'ui_turn_ccw',aria:'Anticlockwise'}], selected:st.dir, onPick:v=>{ st.dir=v; log('setting_changed',{tower:'rope',variable:'dir',to:v}); } });
    if(tab==='wheel') tr=tray({...common, options:[{id:'smooth',icon:'ui_wheel_smooth',badge:'ui_profile_smooth',label:'Smooth'},{id:'big_smooth',icon:'ui_wheel_big_smooth',badge:'ui_profile_big_smooth',label:'Big smooth'},{id:'band',icon:'ui_wheel_band',badge:'ui_profile_band',label:'Band · 10 cm'},{id:'big_band',icon:'ui_wheel_big_band',badge:'ui_profile_big_band',label:'Band · 15 cm'}], selected:st.wheel, onPick:async v=>{ st.wheel=v; log('setting_changed',{tower:'rope',variable:'wheel',to:v}); await swapWheel(spare,v); } });
    if(tab==='turns') tr=tray({...common, options:[], custom:()=>`<div class="turnsPane"><div class="steplbl">How many turns to the top? (120 cm)</div><div class="stepper"><button class="imgbtn" id="minus" aria-label="Fewer">${img('ui_btn_minus')}</button><div class="val ${pred===null?'unset':''}" id="sv">${pred??'?'}</div><button class="imgbtn" id="plus" aria-label="More">${img('ui_btn_plus')}</button></div></div>`,
      onRender:t=>{ const setv=v=>{ pred=v; const e=t.querySelector('#sv'); e.textContent=v; e.classList.remove('unset'); const tb=t.querySelector('.tab[data-tab="turns"]'); if(tb) tb.lastChild.textContent=turnsLabel(); sfx.tick(); log('setting_changed',{tower:'rope',variable:'turns',to:v}); };
        t.querySelector('#minus').onclick=()=>setv(Math.max(1,(pred??9)-1)); t.querySelector('#plus').onclick=()=>setv(Math.min(99,(pred??7)+1)); } });
    if(tab==='load') tr=tray({...common, options:ITEMS, multi:true, selected:[...st.items], onPick:v=>{ st.items=v; spare.items=new Set(v); kick(spare,0.2); dirty(); log('setting_changed',{tower:'rope',variable:'load',items:[...v]}); } });
    stage.classList.add('tray-left'); tr.el.style.left=(tr.el.offsetWidth/2+126)+'px'; } // left-anchored, right of the hint note, so the bot at the rope base stays visible // left-anchored so the bot at the rope base (screen x≈780) stays visible
  build(); setTimeout(()=>{ const tb=$('#tray .tabs'); tb&&nudge(tb,{ring:false,tip:'Use these tabs to set up the bot',key:'tabs',delay:200}); },400);
  let runs=0, success=false, wentGo=false;
  while(runs<2&&!success){
    runState(true,true); if(runs===1){ runBtn.querySelector('.lbl').innerHTML='RUN<br><small style="font-size:16px">1 run left</small>'; }
    const goBtn = runs===1? (()=>{ const g=html('button','btn teal fade','Go to the ride'); g.style.cssText='position:absolute;left:50%;top:118px;--tx:-50%;transform:translateX(-50%)'; UI.appendChild(g); nudge(g,{delay:1500}); return g; })() : null;
    const which=await P(done=>{ const h=async()=>{ if(pred===null){ tab='turns'; build(); const e=$('#tray .stepper'); e&&e.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:400}); return; } /* no guess yet: open the Turns tab */ done('run'); }; runBtn.addEventListener('click',h); const g=()=>done('go'); goBtn&&goBtn.addEventListener('click',g); return ()=>{ runBtn.removeEventListener('click',h); goBtn&&goBtn.removeEventListener('click',g); }; });
    goBtn&&goBtn.remove(); if(which==='go'){ wentGo=true; break; }
    runs++; if(runs===2) log('rope_retry',{initiated:true});
    tr.hide(); spare.d=0; log('run_started',{tower:'rope',run:runs,setup:{dir:st.dir,wheel:st.wheel,items:[...st.items]},predicted:pred});
    const {o,actual}=await performRun(spare,'rope',{dir:st.dir,wheel:st.wheel,items:new Set(st.items)});
    success=o.type==='climbed'&&o.jobDone; const cm=st.wheel.startsWith('big')?15:10, needed=120/cm;
    if(success){ world.mountFlash=1; sfx.shutter(); tween(world,{mountFlash:0},0.8).catch(()=>{}); world.topLit=true;
      { const [mx,my]=scr(ROPE.x,ROPE.top+0.38); sparkTo(mx,my,4).then(()=>{ trackTop=true; paintTracker(4); mood.bed(5); }).catch(()=>{}); } addFX('vfx_arrival_sparkle',ROPE.x,ROPE.top+0.4,2.4); addFX('vfx_confetti',ROPE.x,ROPE.top-2,6,{fps:10}); S.points+=100; const [x,y]=botScreen(spare); floatAt('ui_badge_100',x+60,y-80);
      const mi=html('img','icopin'); mi.src=A('ui_mount_success'); mi.style.width='120px'; mi.style.height='120px'; const mp=pin(mi,()=>[ROPE.x-0.6,ROPE.top+1.4]); setTimeout(()=>unpin(mp),2200);
      const d=pred-needed, pts=d===0?50:Math.abs(d)===1?25:0; S.points+=pts; paintTracker(4); if(pts) setTimeout(()=>floatAt(pts===50?'ui_badge_50':'ui_badge_25',x-60,y-80),500); sfx.fanfare(); log('prediction',{context:'rope',wheel_cm:cm,predicted:pred,needed,delta:d,points:pts}); }
    else await addClock(4,4);
    lensHide(); await wait(400); await outcomeSheet(actual,{tower:'rope',run:runs});
    if(!success){ await replayRope(st); } tr.show(); follow=null; await camTo(V.rope,0.8);
  }
  runState(false); tr.remove(); stage.classList.remove('tray-left'); if(success) await addClock(4);
  if(!wentGo){ const g=html('button','btn teal fade','Go to the ride'); g.style.cssText='position:absolute;right:56px;bottom:56px'; UI.appendChild(g); nudge(g,{delay:900}); await click(g); g.remove(); }
}
async function replayRope(st){ spare.d=0; const tag=html('div','chip fade',`${img('ui_replay')}Replay`); tag.style.left='32px'; tag.style.bottom='322px'; UI.appendChild(tag);
  await performRun(spare,'rope',{dir:st.dir,wheel:st.wheel,items:new Set(st.items)},{speed:0.75,replay:true}); await wait(400); tag.remove(); lensHide(); spare.d=0; dirty(); }
async function G7(){ S.chapter='G7'; S.hintText=''; runState(false); show(H.banner,false);
  const onTime=S.clock<=420; S.star=onTime;
  cine(true); await cloudWipe(()=>{ Object.assign(cam,V.rideStart,{rot:0}); }); shake(0.3); world.kidsVisible=true;
  await tween(world,{gateOpen:1},0.6,ease.out); sfx.clack();
  world.gondola.variant='gondola_open_empty'; sfx.pop(); world.operator.visible=false;
  for(let i=world.kids.length-1;i>=0;i--){ const k=world.kids[i]; k.anim='hop'; tweenFree(k,{dx:GONDOLA_DOCK[0]-k.x+(i%3-1)*0.25},1.2,ease.io); setTimeout(()=>{ tweenFree(k,{dy:0.5,alpha:0},0.35,ease.in); },1000); sfx.pop(); await wait(140); }
  await wait(900); world.gondola.variant='gondola_open_kids'; sfx.chime(); await wait(500); world.gondola.variant='gondola_closed_kids'; sfx.clack(); await wait(400);
  world.gondola.mode='move'; world.gondola.x=GONDOLA_DOCK[0]; world.gondola.y=GONDOLA_DOCK[1]; await tween(world.gondola,{x:1.4,y:2.28},1.4,ease.io); world.gondola.mode='ride'; world.gondola.d=1.42; dirty(); sfx.chime();
  const total=SPANS.reduce((a,s)=>a+s.len,0)-0.4;
  const g=world.gondola; const spanAt=()=>{ let d=g.d,i=0; while(i<3&&d>SPANS[i].len){ d-=SPANS[i].len; i++; } return {i,p:spanPoint(i,Math.min(d,SPANS[i].len))}; };
  const zp={z:cam.zoom}; gsap.to(zp,{z:60,duration:4,ease:'sine.inOut'});
  // camera follows the gondola inside the frame loop (was a 16 ms setInterval, out of step with rAF → judder)
  rideFollow=dt=>{ const {i,p}=spanAt(); const kp=1-Math.exp(-4.3*dt), kr=1-Math.exp(-3.1*dt);
    cam.x+=(p.x+1.2-cam.x)*kp; cam.y+=(p.y+0.3-cam.y)*kp; cam.zoom=zp.z; cam.rot+=(-SPANS[i].ang*0.18-cam.rot)*kr;
    TOWERS.forEach((t,k)=>{ if(Math.abs(p.x-t.x)<0.25&&!world.lampBurst[k]){ world.lampBurst[k]=1; gsap.to(world.lampBurst,{[k]:0,duration:1.2}); sfx.tick(); } }); };
  try{ await tween(g,{d:total},9,ease.io); } finally { rideFollow=null; }
  const shot=snapPostcard(); sfx.shutter(); flash(0.85); await wait(500);
  await camPath([{x:18,y:12,zoom:28,rot:0,d:2.2,ease:'power3.inOut'}]); cine(false);
  const card=html('div','panel fade'); card.id='endcard'; card.style.position='absolute';
  card.innerHTML=`<div class="tk"><div class="postcard"><div class="pc-photo"></div><div class="pc-cap">Hilltop Ropeway · Left at ${fmt(S.clock)}</div></div>${onTime?img('ui_star_burst','burst'):''}</div>
    <div><h2>${onTime?'On time. Your class is riding up.':'Your class is riding up.'}</h2><p>${onTime?'The bot cleared every tower before 7:00.':'A little late, but every tower was checked.'}</p>
    <div class="stats"><span>${world.lit.filter(Boolean).length+(world.topLit?1:0)} / 5 checks</span><span>${S.points} points</span></div>
    <div class="kit"><video class="teaser" muted playsinline preload="auto" poster="assets/video/tarzan_teaser.webp" src="assets/video/tarzan_teaser.mp4" aria-label="Tarzan Bot kit"></video><span>Next class, your team builds Tarzan Bot and sends it up a real rope.</span></div>
    <div style="margin-top:20px"><button class="btn ghost" id="again">Play again</button></div></div>`;
  UI.appendChild(card); card.querySelector('.pc-photo').appendChild(shot.canvas);
  { const tv=card.querySelector('.teaser'), toImg=()=>{ const i=new Image(); i.src=A('ui_kit_bridge'); i.alt=''; tv.replaceWith(i); }; // teaser plays once, holds its last frame
    tv.onerror=toImg; setTimeout(()=>{ const pr=tv.play(); pr&&pr.catch(toImg); },1200); }
  { const pc=card.querySelector('.postcard'), R0=stageRect(pc); // FLIP: the photo flies from where the gondola was into the card
    pc.animate([{transform:`translate(${shot.x-(R0.x+R0.w/2)}px,${shot.y-(R0.y+R0.h/2)}px) scale(.3) rotate(0deg)`,opacity:.2},{transform:'rotate(-4deg)',opacity:1}],{duration:900,easing:'cubic-bezier(.2,.9,.25,1.1)'}); }
  if(onTime) sfx.fanfare(); const gpp=gondolaPos(); addFX('vfx_confetti',gpp[0],gpp[1]+1.5,8,{fps:10}); addFX('vfx_arrival_sparkle',gpp[0],gpp[1]+1,5); log('mission_end',{towers:world.lit.filter(Boolean).length+(world.topLit?1:0),points:S.points,on_time:onTime,depart_time:fmt(S.clock)});
  nudge($('#again'),{delay:2500}); await click($('#again')); play(0);
}

/* G7 postcard: copy a crop of the live world canvas around the gondola (sky is CSS behind the canvas, so paint it in first).
   A GPU canvas-to-canvas copy, no image encoding. Returns {canvas, x, y} with the gondola's stage position for the FLIP. */
let postcard=null;
function snapPostcard(){ const [gx,gy]=scr(...gondolaPos()); const W=640, H=400; let x0=clamp(gx-W/2,0,SW-W), y0=clamp(gy-H/2+70,0,SH-H);
  const c=document.createElement('canvas'); c.width=600; c.height=375; const g=c.getContext('2d'); const cs=getComputedStyle(stage);
  const sky=g.createLinearGradient(0,0,0,c.height); sky.addColorStop(0,cs.getPropertyValue('--skyTop').trim()||'#7DBAEB'); sky.addColorStop(1,cs.getPropertyValue('--skyBot').trim()||'#DDF0FF'); g.fillStyle=sky; g.fillRect(0,0,c.width,c.height);
  g.drawImage(canvas,x0*rscale,y0*rscale,W*rscale,H*rscale,0,0,c.width,c.height); postcard={canvas:c,x:gx,y:gy+60}; log('postcard_taken',{clock:fmt(S.clock)}); return postcard; }
/* ================= chapter state presets (for jumping) ================= */
const CH=[['S1','Queue at Dawn',S1],['S2','Meet the Bot',S2],['S3','Your Call',S3],['S4','Station Tour',S4],['G1','Tower 1 · Gentle Slope',G1],['G2','Tower 2 · Steep Slope',G2],['G3','Tower 3 · With Load',G3],['G4','Tower 4 · Count the Climb',G4],['G5','Say the Rule',G5],['G6','The Hanging Rope',G6],['G7','First Ride',G7]];
function preset(idx){ const id=CH[idx][0]; const lit=n=>world.lit=[0,1,2,3].map(i=>i<n);
  Object.assign(S,{clock:375,points:0,dir:null,firstT2Fail:true,hintText:'',hintOn:false,changedBeforeFirst:false,star:false}); world.topLit=false; lit(0); world.ruler=null; world.ribbon=null; world.flags=[]; world.ropeRuler=false; world.gateOpen=0; world.kidsVisible=true; world.kidsBob=false; world.kids.forEach(k=>{k.dx=0;k.dy=0;k.alpha=1;k.hop=0;}); world.gondola={mode:'parked',d:0,alpha:1,variant:'gondola_closed_empty'}; world.operator={visible:idx<4,anim:'idle',x:-6.95}; world.fx=[]; world.kids.forEach(k=>{k.anim='idle';}); world.pathDots=false; world.cableMoving=false; world.mountFlash=0;
  Object.assign(bot,{expr:'idle', visible:idx>=2, mode:'span', span:0, d:d0(0), wheel:'smooth', items:new Set(), dim:false, beacon:true, drop:0, alpha:1, wheelPop:1, sway:0, swayV:0});
  spare.visible=false;
  const P2={G2:[1,379,100],G3:[2,387,200],G4:[3,395,300],G5:[4,403,450],G6:[4,403,450],G7:[4,407,600]}[id]; // clean-path values: [towers lit, clock, points]; G7 = G6 403 + 4 for clearing the top
  if(P2){ lit(P2[0]); S.clock=P2[1]; S.points=P2[2]; S.dir='cw'; S.guess=S.guess||'yes'; }
  if(['G3','G4','G5','G6','G7'].includes(id)) bot.wheel='band';
  if(id==='G5'||id==='G7') placeBotSpan(bot,3,SPANS[3].len-0.32);
  if(id==='G7'){ world.topLit=true; spare.visible=true; spare.mode='rope'; spare.d=12-0.25; spare.wheel='band'; spare.items=new Set(['camera']); bot.dim=true; world.ropeRuler=false; }
  introOff(); closeNotes(); world.cover=false; world.bg=null; stage.classList.remove('cover'); stage.classList.remove('tray-left'); world.lit.forEach((l,i)=>trackLit[i]=l); trackTop=world.topLit; world.pulse=null; S.sunrise=S.clock>=380; postcard=null;
  if(idx>0){ mood.ambience(true); mood.bed(world.topLit?5:Math.min(4,1+world.lit.filter(Boolean).length)); } else { mood.bed(0); mood.ambience(false); }
  paintClock(); paintTracker(); show(H.clock,idx>0); show(H.tracker,idx>=4); show(H.banner,false); show(H.mission,false);
  show(H.notebook,false); /* "Your guess" now lives in the info note */
  if(idx===0) S.guess=null;
  if(idx>0&&idx<4) Object.assign(cam, V.station);
  if(idx>=4) Object.assign(cam, V.wide);
  lensHide(); dirty(); }
let playing=0;
async function play(idx){ abortAll(); clearUI(); runBtn=null; hintBtn=null; buildRun(); preset(idx); const my=++playing;
  try{ for(let i=idx;i<CH.length;i++){ if(my!==playing) return; S.chapterIdx=i; await CH[i][2](); } }catch(e){ if(e!==CANCEL) console.error(e); } }

/* ================= review menu + mute ================= */
const menu=$('#menu');
$('#menuBtn').onclick=()=>{ sfx.tick(); if(!menu.classList.contains('hidden')){ menu.classList.add('hidden'); return; }
  menu.innerHTML='<h4>REVIEW · JUMP TO</h4>'+CH.map((c,i)=>`<button data-i="${i}"><b>${c[0]}</b>${c[1]}</button>`).join('')+`<h4 style="margin-top:14px">EVIDENCE LOG</h4><pre>${S.log.slice(-14).map(e=>e.ev+' '+JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k])=>k!=='ev'&&k!=='t')))).join('\n')||'—'}</pre>`;
  menu.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{ menu.classList.add('hidden'); unlock(); play(+b.dataset.i); }); menu.classList.remove('hidden'); };
/* SKAI shell controls (Figma 618:12456): sound note → dropdown (Replay Narration / Mute All Sounds), info note → goal, exit tab */
const soundBtn=$('#soundBtn'), soundMenu=$('#soundMenu'), infoBtn=$('#infoBtn'), infoNote=$('#infoNote');
function closeNotes(except){ [[soundBtn,soundMenu],[infoBtn,infoNote]].forEach(([b,m])=>{ if(m!==except){ m.classList.add('hidden'); b.setAttribute('aria-expanded','false'); } }); }
function toggleNote(b,m){ const open=m.classList.contains('hidden'); closeNotes(m); m.classList.toggle('hidden',!open); b.setAttribute('aria-expanded',String(open)); sfx.tick(); }
function paintMute(){ const m=isMuted(); soundBtn.classList.toggle('muted',m); soundMenu.querySelector('.ml').innerHTML=m?'Unmute All<br>Sounds':'Mute All<br>Sounds'; }
soundBtn.onclick=e=>{ e.stopPropagation(); unlock(); toggleNote(soundBtn,soundMenu); };
soundMenu.onclick=e=>{ e.stopPropagation(); const a=e.target.closest('button'); if(!a) return;
  if(a.dataset.a==='replay'){ if(lastLine) speak(lastLine); closeNotes(); }
  if(a.dataset.a==='fs'){ goFullscreen(); closeNotes(); }
  if(a.dataset.a==='mute'){ setMuted(!isMuted()); if(isMuted()&&voEl){ voEl.pause(); voEl=null; } try{ if(isMuted()) speechSynthesis.cancel(); }catch(err){} paintMute(); sfx.tick(); } };
const GOALS={S1:'Your class wants the first ride at 7:00. The bot must check the cable first.',S2:'Meet the inspection bot.',S3:'Make your guess.',S4:'Explore the station.',
  G1:'Get the bot to Tower 1.',G2:'Get the bot to Tower 2.',G3:'Get the bot to Tower 3 and film the cable.',G4:'Count the turns to Tower 4.',G5:'Pick the true sentence.',G6:'Set up the bot to climb the hanging rope.',G7:'Ride up the hill!'};
infoBtn.onclick=e=>{ e.stopPropagation(); infoNote.querySelector('.txt').innerHTML=`<b>${GOALS[S.chapter]||GOALS.S1}</b>${S.guess?`<span>Your guess: ${({yes:'Yes',partway:'Partway',no:'No'})[S.guess]}</span>`:''}<span>First ride 7:00 · now ${fmt(S.clock)} am</span>`; toggleNote(infoBtn,infoNote); };
infoNote.onclick=e=>e.stopPropagation();
document.addEventListener('click',()=>closeNotes());
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return; const r=stage.getBoundingClientRect(); const x=(e.clientX-r.left)/scale, y=(e.clientY-r.top)/scale;
  const f=html('div','tapfx'); f.style.left=x+'px'; f.style.top=y+'px'; UI.appendChild(f); const an=f.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.55},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:380,easing:'cubic-bezier(.2,.7,.3,1)'}); an.onfinish=()=>f.remove(); },{passive:true}); paintMute();
let exitArm=0; // exit tab: tap twice to go back to the title (a single stray tap never loses progress)
$('#exitBtn').onclick=e=>{ e.stopPropagation(); sfx.tick(); const now=performance.now();
  if(now-exitArm<2600){ exitArm=0; document.querySelectorAll('.tip.exit').forEach(t=>t.remove()); log('exit_to_title',{at:S.chapter}); play(0); return; }
  exitArm=now; const t=makeTip($('#brand'),'Tap again to go back to the start','below',false); t.classList.add('exit'); t.style.left='232px'; t.style.top='30px'; /* beside the panel: never over the notebook/mission card */ setTimeout(()=>t.remove(),2600); };
/* fullscreen: button for everyone; on touch devices Start also goes fullscreen (hides the browser bars on the tablet) */
const fsOK=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
function goFullscreen(auto=false){ if(!fsOK) return; if(auto&&!matchMedia('(pointer:coarse)').matches) return; const d=document, el=d.documentElement;
  if(d.fullscreenElement||d.webkitFullscreenElement){ if(!auto) (d.exitFullscreen||d.webkitExitFullscreen).call(d); return; }
  try{ const r=(el.requestFullscreen||el.webkitRequestFullscreen).call(el,{navigationUI:'hide'}); r&&r.catch&&r.catch(()=>{}); }catch(e){} }
const fsRow=soundMenu.querySelector('[data-a="fs"]'); const paintFs=()=>{ fsRow.querySelector('span').innerHTML=document.fullscreenElement?'Exit Full<br>Screen':'Full<br>Screen'; };
if(fsOK){ document.addEventListener('fullscreenchange',()=>{ paintFs(); setTimeout(fit,60); }); paintFs(); } else { fsRow.remove(); soundMenu.classList.add('two'); }
/* chapter-jump menu: reviewers only (add ?review to the URL) */
if(!/(^|[?&#])review\b/.test(location.search+location.hash)) $('#menuBtn').remove();

/* ================= foreground depth corners (cine moments) ================= */
(function(){ const fg=$('#fg'); if(!fg||!window.PACK) return; ['top_left','top_right','bottom_left','bottom_right'].forEach(c=>{ const i=new Image(); i.src=window.PACK['foreground_'+c]; i.className='fg '+c; i.alt=''; fg.appendChild(i); }); $('#clouds').style.display='none'; })();
/* ================= clouds ================= */
(function(){ const c=$('#clouds'); [[120,90,260,70],[260,240,180,95],[420,160,220,120],[600,60,160,80],[760,300,240,110]].forEach(([y,_,w,dur],i)=>{ const e=html('div','cloud'); e.style.top=y+'px'; e.style.width=w+'px'; e.style.animationDuration=dur+'s'; e.style.animationDelay=(-dur*(i*0.23))+'s'; c.appendChild(e); }); })();

/* ================= main loop ================= */
let last=performance.now(), lastTint=-1, lastAmb=0;
function frame(now){ const dt=Math.min(0.05,(now-last)/1000); if(gsap.globalTimeline.getChildren(true,true,true).length) dirty(); last=now; world.t+=dt;
  if(tweens.length) dirty(); updTweens(dt); updMotion(dt); if(follow){ updFollow(dt); dirty(); } if(rideFollow){ rideFollow(dt); dirty(); } updBots(dt);
  if(world.cableMoving){ world.cableShift+=dt*1.0; world.pulleyAngle+=dt*1.0/0.8; dirty(); }
  if(world.kidsBob||world.pathDots||world.mountFlash>0) dirty();
  if(updFX(dt)) dirty();
  if(world.painted&&now-lastAmb>33){ lastAmb=now; dirty(); }
  if(cam.shake>0.01){ cam.shake*=Math.exp(-7*dt); dirty(); } else cam.shake=0;
  if(needDraw&&!world.hidden){ ctx.setTransform(rscale,0,0,rscale,0,0); ctx.clearRect(0,0,SW,SH); const sx=(Math.random()-0.5)*cam.shake*14, sy=(Math.random()-0.5)*cam.shake*14; ctx.translate(SW/2+sx,SH/2+sy); ctx.rotate(cam.rot||0); ctx.translate(-SW/2,-SH/2); drawWorld({flag:IMG.ui_flag,gondola:IMG.ui_gondola});
    if(tintA>0.002){ ctx.globalCompositeOperation='source-atop'; ctx.fillStyle=`rgba(46,50,110,${tintA})`; ctx.fillRect(-300,-300,SW+600,SH+600); ctx.globalCompositeOperation='source-over'; }
    if(warmA>0.002){ ctx.globalCompositeOperation='source-atop'; const wg=ctx.createLinearGradient(0,0,SW*0.75,SH*0.35); wg.addColorStop(0,`rgba(255,184,110,${warmA.toFixed(3)})`); wg.addColorStop(1,'rgba(255,184,110,0)'); ctx.fillStyle=wg; ctx.fillRect(-300,-300,SW+600,SH+600); ctx.globalCompositeOperation='source-over'; } // morning sun from the left
    pins.forEach(placePin); needDraw=false; }
  if(lens&&lens.visible){ if(lensBot){ const b=lensBot; lens.sync({wheel:b.wheel,angle:b.angle,dist:b.d,slope:b.mode==='rope'?Math.PI/2:SPANS[b.span].ang,slip:b.jit>0?1:0}); } lens.render(dt); }
  requestAnimationFrame(frame); }
fit(); applySky(); paintClock(); paintTracker(); buildRun();
requestAnimationFrame(frame);
window.__game={play,S,world,CH};
play(0);
