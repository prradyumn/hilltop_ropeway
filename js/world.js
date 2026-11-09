import { grassTexture, rockTexture, treeSprite, rockSprite, farLayers, cloudSea, islets } from './art.js';
// 2D side-view diorama. World units = su (1 su = "10 cm" in bot-scale labels). +x uphill, +y up.
export const COL = {
  navy:'#23284A', slate:'#3B4058', slateHi:'#565C7E', charcoal:'#2E3140', yellow:'#FFC83D', yellowDk:'#E9A21F',
  teal:'#1FA898', tealGlow:'#43E0C8', coral:'#F0644A', cream:'#FFF6E6', grey:'#9AA0B5',
  grass:'#86C066', grassDk:'#679F4D', grassLip:'#B5DD86', dirt:'#E39A62', dirtDk:'#BF7046',
  rock:'#8B86A0', rockDk:'#69647F', rockDeep:'#545068', tree:'#3F8A62', treeHi:'#5DAA78', treeDk:'#2F6E4E'
};
export const P0 = {x:0, y:2.0};
export const TOWERS = [{x:9.85,y:3.74},{x:19.12,y:7.48},{x:28.45,y:13.31},{x:37.64,y:21.03}];
const PTS = [P0, ...TOWERS];
export const SPANS = TOWERS.map((b,i)=>{ const a=PTS[i]; const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
  return {a,b,len,ang:Math.atan2(dy,dx),ux:dx/len,uy:dy/len,nx:-dy/len,ny:dx/len}; });
export const ROPE = {x:40.25, y0:18.25, top:30.25};       // vertical hanging rope, 12 su = 120 cm
export const WHEELS = { smooth:{r:0.159,groove:0,band:0}, big_smooth:{r:0.239,groove:0,band:0},
  grooved:{r:0.159,groove:1,band:0}, band:{r:0.159,groove:1,band:1}, big_band:{r:0.239,groove:1,band:1} };

const GP = [[-16.6,-0.3],[-15.8,0],[-6,0],[0,0],[4,0.3],[9.85,1.25],[14,2.4],[19.12,4.1],[24,6.6],[28.45,9.1],[33,12.6],[37.64,16.4],[40.5,16.85],[42.6,16.5],[44.4,13.8],[45.8,9.0],[46.8,4.2],[47.5,1.0],[47.8,-0.2]];
export function ground(x){ if(x<=GP[0][0]) return GP[0][1]; for(let i=1;i<GP.length;i++){ if(x<=GP[i][0]){ const [x0,y0]=GP[i-1],[x1,y1]=GP[i]; const t=(x-x0)/(x1-x0); const s=t*t*(3-2*t); return y0+(y1-y0)*(0.35*t+0.65*s); } } return GP[GP.length-1][1]; }
const UNDER = [[47.8,-0.2],[46.6,-2.6],[43,-4.6],[37,-6.6],[30,-8.4],[22,-9.9],[15,-10.4],[9,-9.3],[3,-7.4],[-3,-5.3],[-8,-3.5],[-12.5,-2.2],[-15.2,-1.2],[-16.6,-0.3]];

// seeded random
let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
const TREES=[]; const TUFTS=[]; const FACE=[]; const ROOTS=[];
(function(){ for(let x=-12;x<45;x+=0.9+rnd()*1.6){ const near = TOWERS.some(t=>Math.abs(t.x-x)<1.6) || (x>-16&&x<3.4) || (x>38&&x<43) || (x>-10&&x<-5);
  if(near) continue; const back = rnd()<0.72; const r=rnd(); TREES.push({x, s:0.75+rnd()*0.7, back, kind:r<0.55?'round':r<0.85?'pine':'bush', v:Math.floor(rnd()*3)}); }
  for(let x=-12;x<45;x+=0.6+rnd()*0.9) TUFTS.push({x,s:0.5+rnd()*0.5});
  for(let x=-12;x<47;x+=1.4+rnd()*2.5) ROOTS.push([x,0.5+rnd()*1.6,(rnd()-0.5)*0.8]);
  for(let x=4;x<46;x+=1.1+rnd()*1.8){ const r=rnd(); FACE.push({x, depth:1.2+rnd()*Math.max(1,ground(x)*0.75), s:0.55+rnd()*0.5, rock:r<0.22, kind:r<0.6?'round':r<0.85?'pine':'bush', v:Math.floor(rnd()*3)}); } })();
const KIDCOL=['#F0644A','#1FA898','#6B5BD6','#FFC83D','#E86FA0','#3B7DD8','#F49A3E','#4FA36B'];

export const world = {
  cam:{x:15,y:11,zoom:30,rot:0,shake:0}, W:1600, H:1000, lampBurst:[0,0,0,0],
  lit:[false,false,false,false], lampFlash:[0,0,0,0], topLit:false,
  pulleyAngle:0, cableShift:0, cableMoving:false,
  gateOpen:0, kids:[], kidsVisible:true, kidsBob:false,
  gondola:{mode:'parked', d:0, alpha:1}, ruler:null, flags:[], ribbon:null, pathDots:false,
  dockOpen:0, ropeVisible:true, warm:1, fx:[], operator:{visible:true, anim:'idle', x:-8.0}, painted:false, mountFlash:0, t:0, bots:[], measureLabels:true,
  pulse:null, hidden:false, cover:false, bg:null, // cover: title page highlights the ropeway (cable glow, lamps on) // hidden: skip world drawing while a full-screen video covers it (start screen)
};
for(let i=0;i<8;i++) world.kids.push({x:-15.5+i*0.7, col:KIDCOL[i], ph:i*0.9, hop:0, alpha:1, dx:0, dy:0, n:i+1, anim:'idle', f0:Math.floor(i*2.7)%8});

export function toScreen(wx,wy,p=1){ const c=world.cam, bg=p!==1&&world.bg, cz=bg?world.bg.zoom:c.zoom, z=cz*(p===1?1:(0.55+0.45*p)); // world.bg: background layers framed independently (cover page)
  return [ (wx - c.x*p)*z + world.W/2, world.H/2 - (wy - (bg?world.bg.y:c.y)*p)*z ]; }
export function rotPt(x,y){ const r=world.cam.rot; if(!r) return [x,y]; const c=Math.cos(r), s=Math.sin(r), dx=x-world.W/2, dy=y-world.H/2; return [world.W/2+dx*c-dy*s, world.H/2+dx*s+dy*c]; }
export function scr(wx,wy){ const [x,y]=toScreen(wx,wy); return rotPt(x,y); }
export function spanPoint(i,d){ const s=SPANS[i]; return {x:s.a.x+s.ux*d, y:s.a.y+s.uy*d}; }

/* ---------- bot model ---------- */
export function makeBot(){ return { visible:true, mode:'span', span:0, d:0.35, wheel:'smooth', items:new Set(), angle:0,
  sway:0, swayV:0, jit:0, blink:0, blinkT:2+Math.random()*3, dim:false, beacon:true, drop:0, wheelPop:1, alpha:1, lookX:0, lookY:0 }; }
export function botWheelCenter(b){ const r=WHEELS[b.wheel].r;
  if(b.mode==='rope'){ return {x:ROPE.x-(r+0.045), y:ROPE.y0+b.d}; }
  const s=SPANS[b.span], p=spanPoint(b.span,b.d); return {x:p.x+s.nx*(r+0.045), y:p.y+s.ny*(r+0.045)+b.drop}; }
export function botBodyCenter(b){ const w=botWheelCenter(b); const L=0.62; return {x:w.x+Math.sin(b.sway)*L, y:w.y-Math.cos(b.sway)*L}; }

/* ---------- drawing ---------- */
let ctx; const ART={}; const mixc=(a,b,t)=>{ const h=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)); const A=h(a),B=h(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`; }; export function setCtx(c){ ctx=c; initArt(); }
function initArt(){ ART.cliffPending=true; ART.grass=ctx.createPattern(grassTexture(),'repeat'); ART.rock=ctx.createPattern(rockTexture(),'repeat');
  ART.tree={round:[0,1,2].map(v=>treeSprite('round',v)), pine:[0,1,2].map(v=>treeSprite('pine',v)), bush:[0,1,2].map(v=>treeSprite('bush',v))};
  ART.rocks=[rockSprite(0),rockSprite(1)]; ART.far=farLayers(); ART.sea=cloudSea(); ART.islets=islets([ART.tree.round[0],ART.tree.pine[1],ART.tree.round[2]]); }
const SP={}; export function loadSprites(){ const S=window.SPRITES||{}, M=window.SPRMETA||{}; Object.keys(S).forEach(k=>{ const im=new Image(); im.onload=()=>{ SP[k].ok=true; world.onSprite&&world.onSprite(); }; im.src=S[k]; SP[k]={img:im,meta:M[k],ok:false}; }); }
const has=n=>SP[n]&&SP[n].ok;
function sprA(name,key,wx,wy,scaleMul=1,rot=0,alpha=1){ const sp=SP[name]; if(!sp||!sp.ok) return false; const m=sp.meta, a=m.anchors[key]; const s=Z()/m.ppu*scaleMul; const [sx,sy]=toScreen(wx,wy);
  const W=m.w*s, H=m.h*s; if(!rot && (sx-a[0]*s>world.W||sx-a[0]*s+W<0||sy-a[1]*s>world.H||sy-a[1]*s+H<0)) return true;
  ctx.globalAlpha=alpha; if(rot){ ctx.save(); ctx.translate(sx,sy); ctx.rotate(rot); ctx.drawImage(sp.img,-a[0]*s,-a[1]*s,W,H); ctx.restore(); } else ctx.drawImage(sp.img,sx-a[0]*s,sy-a[1]*s,W,H); ctx.globalAlpha=1; return true; }
function anchorWorld(name,key){ const m=SP[name]&&SP[name].meta; if(!m) return null; const w=m.world[key]; return [w[0],w[2]]; }
function drawBaked(L){ const z=world.cam.zoom*(0.55+0.45*L.p); const [sx,sy]=toScreen(L.x0,L.y1,L.p); const w=(L.x1-L.x0)*z, h=(L.y1-L.y0)*z; if(sx>world.W||sy>world.H||sx+w<0||sy+h<0) return; ctx.drawImage(L.c,sx,sy,w,h); }
function patFill(pat,tileSu,alpha=1){ const z=Z(), k=z*tileSu/256; const [ox,oy]=toScreen(0,0); pat.setTransform(new DOMMatrix([k,0,0,k,ox,oy])); ctx.globalAlpha=alpha; ctx.fillStyle=pat; ctx.fill(); ctx.globalAlpha=1; }
function sprite(im,x,y,h,shadow=true){ const [sx,sy]=toScreen(x,y); const H=h*Z(), W=H*im.width/im.height; if(sx+W<0||sx-W>world.W) return;
  if(shadow){ ctx.fillStyle='rgba(30,50,40,0.22)'; ctx.beginPath(); ctx.ellipse(sx+W*0.06,sy,W*0.36,H*0.045+1,0,0,Math.PI*2); ctx.fill(); } ctx.drawImage(im,sx-W/2,sy-H*0.985,W,H); }
function path(pts,p=1){ ctx.beginPath(); pts.forEach(([x,y],i)=>{ const [sx,sy]=toScreen(x,y,p); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); }); }
function smoothPath(pts){ ctx.beginPath(); const S=pts.map(([x,y])=>toScreen(x,y)); ctx.moveTo(S[0][0],S[0][1]);
  for(let i=1;i<S.length-1;i++){ const mx=(S[i][0]+S[i+1][0])/2, my=(S[i][1]+S[i+1][1])/2; ctx.quadraticCurveTo(S[i][0],S[i][1],mx,my); }
  ctx.lineTo(S[S.length-1][0],S[S.length-1][1]); }
function circ(x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); }
function rrect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
const Z=()=>world.cam.zoom;

function drawFar(){ ART.far.forEach((L,i)=>{ drawBaked(L); if(i===1) drawBaked(ART.islets); }); drawBaked(ART.sea); }
function drawIsland(){
  const z=Z();
  // back ridge for depth
  const back=GP.map(([x,y])=>[x-0.6, y+ (x>-6&&x<44? 1.1+0.5*Math.sin(x*0.5):0)]);
  smoothPath(back); { const [ex,ey]=toScreen(47,-0.3), [bx,by]=toScreen(-13,-0.3); ctx.lineTo(ex,ey); ctx.lineTo(bx,by); ctx.closePath(); }
  ctx.fillStyle='#5E9A55'; ctx.fill();
  // underside: dirt band then rock
  path([[-13.2,-0.3],[47.8,-0.3],...UNDER]); ctx.closePath();
  const [,u0]=toScreen(0,-0.3), [,u1]=toScreen(0,-10.4); let g=ctx.createLinearGradient(0,u0,0,u1);
  g.addColorStop(0,COL.dirt); g.addColorStop(0.12,COL.dirtDk); g.addColorStop(0.2,COL.rock); g.addColorStop(1,COL.rockDeep); ctx.fillStyle=g; ctx.fill();
  patFill(ART.rock,8,0.9);
  { const [,f0]=toScreen(0,-4), [,f1]=toScreen(0,-10.4); const fg=ctx.createLinearGradient(0,f0,0,f1); fg.addColorStop(0,'rgba(226,222,240,0)'); fg.addColorStop(1,'rgba(226,222,240,0.55)'); ctx.fillStyle=fg; ctx.fill(); }
  ctx.strokeStyle='rgba(110,78,58,0.75)'; ctx.lineWidth=Math.max(1,z*0.05); ROOTS.forEach(([x,l,c])=>{ const [a,b2]=toScreen(x,-0.5), [,e]=toScreen(x,-0.5-l); ctx.beginPath(); ctx.moveTo(a,b2); ctx.quadraticCurveTo(a+c*z,(b2+e)/2,a+c*z*0.4,e); ctx.stroke(); });
  ctx.strokeStyle='rgba(84,80,104,0.28)'; ctx.lineWidth=Math.max(1,z*0.06); ctx.lineCap='round';
  [[-9,-2.2,4,-6.4],[8,-7.6,24,-8.6],[28,-5.6,42,-3.4],[-2,-3.2,10,-4.2]].forEach(([x0,y0,x1,y1])=>{ path([[x0,y0],[(x0+x1)/2,(y0+y1)/2-0.5],[x1,y1]]); ctx.stroke(); });
  // hill body (the face toward us) in grass greens
  smoothPath(GP); { const [ex,ey]=toScreen(47.8,-0.35), [bx,by]=toScreen(-13.2,-0.35); ctx.lineTo(ex,ey); ctx.lineTo(bx,by); ctx.closePath(); }
  const [,h0]=toScreen(0,21), [,h1]=toScreen(0,-0.3); g=ctx.createLinearGradient(0,h0,0,h1); g.addColorStop(0,'#93CB6E'); g.addColorStop(1,'#5F9E50'); ctx.fillStyle=g; ctx.fill();
  patFill(ART.grass,5.5,0.9);
  { const [lx]=toScreen(-13,0), [rx]=toScreen(48,0); const lg=ctx.createLinearGradient(lx,0,rx,0); lg.addColorStop(0,'rgba(255,236,200,0.16)'); lg.addColorStop(0.5,'rgba(255,236,200,0)'); lg.addColorStop(1,'rgba(30,40,90,0.16)'); ctx.fillStyle=lg; ctx.fill();
    const [,a0]=toScreen(0,4), [,a1]=toScreen(0,-0.35); const ao=ctx.createLinearGradient(0,a0,0,a1); ao.addColorStop(0,'rgba(20,50,35,0)'); ao.addColorStop(1,'rgba(20,50,35,0.28)'); ctx.fillStyle=ao; ctx.fill(); }
  // soft contour bands on the face
  ctx.save(); ctx.clip();
  ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=z*0.5;
  [2.2,5.2,8.6].forEach(o=>{ smoothPath(GP.map(([x,y])=>[x,y-o])); ctx.stroke(); });
  ctx.fillStyle='rgba(47,110,78,0.10)'; [[12,-0.3,5],[30,2,7],[42,6,6]].forEach(([x,y,r])=>{ const [sx,sy]=toScreen(x,y); ctx.beginPath(); ctx.ellipse(sx,sy,r*z,r*z*0.5,0,0,Math.PI*2); ctx.fill(); });
  FACE.forEach(f=>{ const y=ground(f.x)-f.depth; if(y<0.4) return;
    if(f.rock){ if(!sprA('rock_'+(f.v%2),'base',f.x,y,f.s*0.8)) sprite(ART.rocks[f.v%2],f.x,y,f.s*0.7,false); }
    else { const n=`tree_${f.kind}_${f.v%2}`; if(has(n)){ const [sx,sy]=toScreen(f.x,y); ctx.fillStyle='rgba(30,50,40,0.2)'; ctx.beginPath(); ctx.ellipse(sx,sy,Z()*0.45*f.s,Z()*0.07*f.s+1,0,0,Math.PI*2); ctx.fill(); sprA(n,'base',f.x,y,f.s*0.62); } else sprite(ART.tree[f.kind][f.v],f.x,y,f.s*(f.kind==='pine'?1.7:1.35)); } });
  ctx.restore();
  // dirt lip along the island edge
  ctx.strokeStyle=COL.dirt; ctx.lineWidth=Math.max(2,z*0.32); path([[-13.1,-0.32],[47.7,-0.32]]); ctx.stroke();
  // grass lip highlight on the skyline
  smoothPath(GP); ctx.strokeStyle=COL.grassLip; ctx.lineWidth=Math.max(1.5,z*0.12); ctx.lineJoin='round'; ctx.stroke();
}
function drawTree(t,front){ const y=ground(t.x)+(front?-0.2:0.04); const n=`tree_${t.kind}_${t.v%2}`;
  if(has(n)){ const [sx,sy]=toScreen(t.x,y); const z=Z(); ctx.fillStyle='rgba(30,50,40,0.22)'; ctx.beginPath(); ctx.ellipse(sx+z*0.1*t.s,sy,z*0.75*t.s,z*0.1*t.s+1,0,0,Math.PI*2); ctx.fill(); sprA(n,'base',t.x,y,t.s*(front?1.12:1)*(t.kind==='bush'?1.2:1)); return; }
  const h=t.s*(t.kind==='pine'?2.7:t.kind==='bush'?1.3:2.3)*(front?1.1:1); sprite(ART.tree[t.kind][t.v],t.x,y,h); }
function drawTufts(){ const z=Z(); if(z<45) return; const xl=world.cam.x-world.W/2/z-1, xr=world.cam.x+world.W/2/z+1; const step=Math.max(0.06,9/z);
  ctx.fillStyle='#A9D97C'; ctx.beginPath(); for(let x=Math.max(-12.8,xl); x<Math.min(47,xr); x+=step){ const y=ground(x); const [sx,sy]=toScreen(x,y); const h=z*(0.1+0.08*Math.abs(Math.sin(x*12.9898)*1.7%1)), w=z*0.035;
    ctx.moveTo(sx-w,sy+1); ctx.quadraticCurveTo(sx-w*0.2,sy-h*0.6,sx+w*0.6,sy-h); ctx.quadraticCurveTo(sx+w*0.3,sy-h*0.4,sx+w,sy+1); } ctx.fill(); }
function drawStation(){
  const z=Z(); if(has('station')){ drawStationSprite(); return; } const [x0,y0]=toScreen(-4.7,0), [x1,y1]=toScreen(-0.25,3.1);
  // body
  ctx.fillStyle=COL.cream; rrect(x0,y1,x1-x0,y0-y1,z*0.12); ctx.fill();
  ctx.save(); rrect(x0,y1,x1-x0,y0-y1,z*0.12); ctx.clip();
  ctx.strokeStyle='rgba(150,110,70,0.16)'; ctx.lineWidth=Math.max(1,z*0.025); ctx.beginPath(); for(let x=x0+z*0.32;x<x1;x+=z*0.32){ ctx.moveTo(x,y1); ctx.lineTo(x,y0); } ctx.stroke();
  let sg=ctx.createLinearGradient(0,y1,0,y1+z*0.7); sg.addColorStop(0,'rgba(35,40,74,0.28)'); sg.addColorStop(1,'rgba(35,40,74,0)'); ctx.fillStyle=sg; ctx.fillRect(x0,y1,x1-x0,z*0.7);
  sg=ctx.createLinearGradient(x0,0,x1,0); sg.addColorStop(0,'rgba(255,240,215,0.25)'); sg.addColorStop(1,'rgba(35,40,74,0.10)'); ctx.fillStyle=sg; ctx.fillRect(x0,y1,x1-x0,y0-y1);
  ctx.fillStyle='#A9A3B6'; ctx.fillRect(x0,y0-z*0.5,x1-x0,z*0.5); ctx.strokeStyle='rgba(60,50,80,0.35)'; ctx.lineWidth=Math.max(1,z*0.02); ctx.beginPath(); ctx.moveTo(x0,y0-z*0.25); ctx.lineTo(x1,y0-z*0.25);
  for(let x=x0,k=0;x<x1;x+=z*0.45,k++){ ctx.moveTo(x+(k%2)*z*0.22,y0-z*0.5); ctx.lineTo(x+(k%2)*z*0.22,y0-z*0.25); ctx.moveTo(x,y0-z*0.25); ctx.lineTo(x,y0); } ctx.stroke(); ctx.restore();
  // roof
  const [rx0,ry]=toScreen(-5.1,3.0), [rx1]=toScreen(0.15,3.0), [px,py]=toScreen(-2.5,4.35);
  ctx.fillStyle=COL.slate; ctx.beginPath(); ctx.moveTo(rx0,ry); ctx.lineTo(px,py); ctx.lineTo(rx1,ry); ctx.closePath(); ctx.fill();
  ctx.fillStyle=COL.slateHi; ctx.beginPath(); ctx.moveTo(rx0,ry); ctx.lineTo(px,py); ctx.lineTo(px,py+z*0.18); ctx.lineTo(rx0+z*0.2,ry); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(rx0,ry); ctx.lineTo(px,py); ctx.lineTo(rx1,ry); ctx.closePath(); ctx.clip(); ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=Math.max(1,z*0.04); ctx.beginPath(); for(let y=ry;y>py;y-=z*0.22){ ctx.moveTo(rx0,y); ctx.lineTo(rx1,y); } ctx.stroke(); ctx.restore();
  ctx.fillStyle='#8E6A55'; const [chx,chy]=toScreen(-1.3,4.3); ctx.fillRect(chx,chy,z*0.36,z*0.7);
  // windows + door
  const [wx,wy]=toScreen(-3.1,2.65); if(world.warm>0.02){ const rg=ctx.createRadialGradient(wx+z*0.4,wy+z*0.3,0,wx+z*0.4,wy+z*0.3,z*1.4); rg.addColorStop(0,`rgba(255,214,130,${0.45*world.warm})`); rg.addColorStop(1,'rgba(255,214,130,0)'); ctx.fillStyle=rg; circ(wx+z*0.4,wy+z*0.3,z*1.4); ctx.fill(); }
  ctx.fillStyle=world.warm>0.02?mixc('#8FD8E6','#FFD98A',world.warm):'#8FD8E6'; rrect(wx,wy,z*0.8,z*0.62,z*0.12); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(wx+z*0.1,wy+z*0.5); ctx.lineTo(wx+z*0.42,wy+z*0.08); ctx.lineTo(wx+z*0.56,wy+z*0.08); ctx.lineTo(wx+z*0.24,wy+z*0.5); ctx.fill();
  ctx.strokeStyle=COL.cream; ctx.lineWidth=Math.max(1,z*0.05); ctx.beginPath(); ctx.moveTo(wx+z*0.4,wy); ctx.lineTo(wx+z*0.4,wy+z*0.62); ctx.stroke();
  ctx.fillStyle=COL.slate; const [dx,dy]=toScreen(-4.35,1.55); rrect(dx,dy,z*0.95,z*1.55,z*0.14); ctx.fill();
  // dock hatch (bot comes out)
  const [hx,hy]=toScreen(-1.15,2.55); ctx.fillStyle=world.dockOpen>0.5?'#1E2238':COL.slateHi; rrect(hx,hy,z*0.75,z*0.6,z*0.1); ctx.fill();
  // sign
  const [sx,sy]=toScreen(-4.25,3.95); ctx.font=`900 ${Math.max(6,z*0.24)}px Nunito, system-ui, sans-serif`; const tw=ctx.measureText('FIRST RIDE 7:00').width; ctx.fillStyle='#fff'; rrect(sx,sy,tw+z*0.36,z*0.5,z*0.12); ctx.fill();
  ctx.fillStyle=COL.navy; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText('FIRST RIDE 7:00',sx+z*0.18,sy+z*0.26);
  // pulley stand + wheel (centre (0,1.2), r .8)
  const [cx,cy]=toScreen(0,1.2), R=z*0.8;
  ctx.fillStyle=COL.slate; ctx.beginPath(); ctx.moveTo(cx-z*0.35,toScreen(0,0)[1]); ctx.lineTo(cx,cy); ctx.lineTo(cx+z*0.35,toScreen(0,0)[1]); ctx.closePath(); ctx.fill();
  drawWheelFace(cx,cy,R,world.pulleyAngle,{groove:1,big:true,spokes:6});
}
function drawStationSprite(){ const z=Z();
  sprA('station','origin',0,0);
  const sg=anchorWorld('station','sign'); if(sg){ const [sx,sy]=toScreen(sg[0],sg[1]); ctx.font=`900 ${Math.max(6,z*0.27)}px Nunito, system-ui, sans-serif`; const tw=ctx.measureText('FIRST RIDE 7:00').width; ctx.fillStyle='#fff'; rrect(sx-tw/2-z*0.2,sy-z*0.27,tw+z*0.4,z*0.54,z*0.12); ctx.fill(); ctx.fillStyle=COL.navy; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('FIRST RIDE 7:00',sx,sy+z*0.02); ctx.textAlign='left'; }
  const wn=anchorWorld('station','window'); if(wn&&world.warm>0.02){ const [wx,wy]=toScreen(wn[0],wn[1]); const rg=ctx.createRadialGradient(wx,wy,0,wx,wy,z*1.6); rg.addColorStop(0,`rgba(255,214,130,${0.4*world.warm})`); rg.addColorStop(1,'rgba(255,214,130,0)'); ctx.fillStyle=rg; circ(wx,wy,z*1.6); ctx.fill(); }
  if(world.dockOpen>0.5){ const [hx,hy]=toScreen(-1.18,3.17); ctx.fillStyle='#14172A'; rrect(hx,hy,z*0.8,z*0.64,z*0.08); ctx.fill(); }
  wheelSprite('pulley',0,1.2,world.pulleyAngle,0.8); { const [gx,gy]=toScreen(0,1.2); glossDisc(gx,gy,Z()*0.8); } }
// gloss pass for metal wheels: light is fixed (top-left) so the sheen stays put while the wheel turns
function glossDisc(cx,cy,R){ if(R<4) return; ctx.save(); circ(cx,cy,R); ctx.clip();
  const g=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R); g.addColorStop(0,'rgba(255,255,255,0.46)'); g.addColorStop(0.38,'rgba(255,255,255,0.1)'); g.addColorStop(0.5,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(12,16,44,0.22)');
  ctx.fillStyle=g; ctx.fillRect(cx-R,cy-R,R*2,R*2);
  const h=ctx.createRadialGradient(cx-R*0.42,cy-R*0.46,0,cx-R*0.42,cy-R*0.46,R*0.42); h.addColorStop(0,'rgba(255,255,255,0.62)'); h.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=h; ctx.fillRect(cx-R,cy-R,R*2,R*2);
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(-0.62); const sw=R*0.16, st=ctx.createLinearGradient(0,-R*0.34-sw,0,-R*0.34+sw); st.addColorStop(0,'rgba(255,255,255,0)'); st.addColorStop(0.5,'rgba(255,255,255,0.3)'); st.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=st; ctx.fillRect(-R,-R*0.34-sw,R*2,sw*2); ctx.restore(); // lacquer streak
  ctx.lineCap='round'; ctx.strokeStyle='rgba(255,255,255,0.88)'; ctx.lineWidth=Math.max(1.5,R*0.06); ctx.beginPath(); ctx.arc(cx,cy,R*0.92,Math.PI*1.06,Math.PI*1.44); ctx.stroke();
  ctx.strokeStyle='rgba(190,220,255,0.35)'; ctx.lineWidth=Math.max(1,R*0.035); ctx.beginPath(); ctx.arc(cx,cy,R*0.92,Math.PI*0.08,Math.PI*0.32); ctx.stroke(); // cool rim bounce, lower-right
  ctx.restore(); }
function wheelSprite(kind,x,y,ang,R,mul=1){ if(!has('wheel_'+kind)) return false; return sprA('wheel_'+kind,'center',x,y,mul,ang); }
export function drawWheelFace(cx,cy,R,ang,o={}){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang);
  ctx.fillStyle=COL.slate; circ(0,0,R); ctx.fill();
  if(o.band){ ctx.strokeStyle=COL.coral; ctx.lineWidth=R*0.2; circ(0,0,R*0.88); ctx.stroke(); }
  if(o.groove){ ctx.strokeStyle='#7C82A6'; ctx.lineWidth=Math.max(1,R*0.07); circ(0,0,R*(o.band?0.74:0.8)); ctx.stroke(); }
  ctx.fillStyle='#4A5072'; circ(0,0,R*(o.groove?0.66:0.78)); ctx.fill();
  ctx.strokeStyle='#E9E6DE'; ctx.lineWidth=Math.max(1,R*0.12); ctx.lineCap='round'; const n=o.spokes||5;
  for(let i=0;i<n;i++){ const a=i*Math.PI*2/n; ctx.beginPath(); ctx.moveTo(Math.cos(a)*R*0.2,Math.sin(a)*R*0.2); ctx.lineTo(Math.cos(a)*R*0.6,Math.sin(a)*R*0.6); ctx.stroke(); }
  ctx.fillStyle='#F4F1EA'; circ(0,0,R*0.26); ctx.fill(); ctx.fillStyle=COL.navy; circ(0,0,R*0.1); ctx.fill();
  ctx.fillStyle=COL.yellow; circ(R*(o.groove?0.56:0.66),0,Math.max(1.2,R*0.11)); ctx.fill();
  ctx.restore();
}
function drawTower(i){ const t=TOWERS[i], gy=ground(t.x)-0.1, z=Z();
  if(has('tower_'+i)){ const [gx,gyy]=toScreen(t.x+0.15,gy+0.02); ctx.fillStyle='rgba(30,50,40,0.25)'; ctx.beginPath(); ctx.ellipse(gx,gyy,z*1.0,z*0.13,0,0,Math.PI*2); ctx.fill();
    sprA('tower_'+i,'saddle',t.x,t.y); const L=anchorWorld('tower_'+i,'lamp'); const [lx,ly]=toScreen(L[0],L[1]); const lit=world.lit[i], fl=world.lampFlash[i];
    if(lit||fl>0){ ctx.fillStyle=lit?'rgba(67,224,200,0.30)':'rgba(255,255,255,0.4)'; circ(lx,ly,z*0.42); ctx.fill(); ctx.fillStyle=lit?COL.tealGlow:'#fff'; circ(lx,ly,z*0.12); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.7)'; circ(lx-z*0.035,ly-z*0.035,z*0.04); ctx.fill(); }
    lampBurst(i,lx,ly); return; } const [bx,by]=toScreen(t.x,gy), [tx,ty]=toScreen(t.x,t.y-0.12);
  const wb=z*0.55, wt=z*0.16;
  ctx.fillStyle='rgba(30,50,40,0.25)'; ctx.beginPath(); ctx.ellipse(bx+z*0.2,by+z*0.05,z*0.95,z*0.14,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#B3AEC0'; ctx.beginPath(); ctx.moveTo(bx-wb-z*0.2,by+z*0.08); ctx.lineTo(bx-wb+z*0.05,by-z*0.22); ctx.lineTo(bx+wb-z*0.05,by-z*0.22); ctx.lineTo(bx+wb+z*0.2,by+z*0.08); ctx.closePath(); ctx.fill();
  ctx.lineCap='round'; ctx.lineWidth=Math.max(1.5,z*0.1);
  ctx.strokeStyle='#5A6185'; ctx.beginPath(); ctx.moveTo(bx-wb,by-z*0.15); ctx.lineTo(tx-wt,ty); ctx.stroke();
  ctx.strokeStyle='#2F3449'; ctx.beginPath(); ctx.moveTo(bx+wb,by-z*0.15); ctx.lineTo(tx+wt,ty); ctx.stroke(); ctx.strokeStyle=COL.slate;
  ctx.lineWidth=Math.max(1,z*0.045); const n=Math.max(2,Math.round((by-ty)/(z*0.8)));
  for(let k=0;k<n;k++){ const f0=k/n,f1=(k+1)/n; const l0=bx-wb+(tx-wt-(bx-wb))*f0, r0=bx+wb+(tx+wt-(bx+wb))*f0, y0=by+(ty-by)*f0;
    const l1=bx-wb+(tx-wt-(bx-wb))*f1, r1=bx+wb+(tx+wt-(bx+wb))*f1, y1=by+(ty-by)*f1;
    ctx.beginPath(); ctx.moveTo(l0,y0); ctx.lineTo(r1,y1); ctx.moveTo(r0,y0); ctx.lineTo(l1,y1); ctx.moveTo(l1,y1); ctx.lineTo(r1,y1); ctx.stroke(); }
  // crossbar + cap + saddle
  ctx.fillStyle=COL.slate; rrect(tx-z*0.55,ty-z*0.05,z*1.1,z*0.16,z*0.06); ctx.fill();
  ctx.fillStyle=COL.yellow; rrect(tx-z*0.22,ty-z*0.2,z*0.44,z*0.18,z*0.06); ctx.fill();
  ctx.fillStyle=COL.charcoal; circ(tx,ty-z*0.06,z*0.11); ctx.fill();
  // lamp
  const lit=world.lit[i], fl=world.lampFlash[i]; const [lx,ly]=[tx+z*0.45,ty-z*0.32];
  ctx.fillStyle=COL.slate; ctx.fillRect(lx-z*0.03,ly,z*0.06,z*0.3);
  if(lit){ ctx.fillStyle='rgba(67,224,200,0.28)'; circ(lx,ly,z*0.36); ctx.fill(); }
  ctx.fillStyle=lit?COL.tealGlow:(fl>0?'#FFFFFF':COL.grey); circ(lx,ly,z*0.14); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)'; circ(lx-z*0.04,ly-z*0.04,z*0.045); ctx.fill();
  lampBurst(i,lx,ly);
}
function lampBurst(i,lx,ly){ const z=Z(); const lb=world.lampBurst[i]; if(lb>0.01){ const rg=ctx.createRadialGradient(lx,ly,0,lx,ly,z*3*lb+z*0.4); rg.addColorStop(0,`rgba(180,255,240,${0.85*lb})`); rg.addColorStop(1,'rgba(67,224,200,0)'); ctx.fillStyle=rg; circ(lx,ly,z*3*lb+z*0.4); ctx.fill();
    ctx.strokeStyle=`rgba(255,255,255,${0.7*lb})`; ctx.lineWidth=Math.max(1,z*0.05); ctx.beginPath(); for(let k=0;k<10;k++){ const a=k*Math.PI/5, r0=z*(0.5+ (1-lb)*1.2), r1=r0+z*0.6*lb; ctx.moveTo(lx+Math.cos(a)*r0,ly+Math.sin(a)*r0); ctx.lineTo(lx+Math.cos(a)*r1,ly+Math.sin(a)*r1); } ctx.stroke(); }
}
function coverCable(){ const z=Z(), pts=[[0,2.04],...TOWERS.map(t=>[t.x,t.y])];
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(255,226,160,0.34)'; ctx.lineWidth=Math.max(16,z*0.42); path(pts); ctx.stroke();
  ctx.strokeStyle='rgba(255,246,220,0.7)'; ctx.lineWidth=Math.max(5,z*0.16); path(pts); ctx.stroke(); ctx.restore();
  let L=0; const seg=[]; for(let i=1;i<pts.length;i++){ const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); seg.push(l); L+=l; }
  const at=f=>{ let d=f*L; for(let i=0;i<seg.length;i++){ if(d<=seg[i]){ const t=d/seg[i]; return [pts[i][0]+(pts[i+1][0]-pts[i][0])*t, pts[i][1]+(pts[i+1][1]-pts[i][1])*t]; } d-=seg[i]; } return pts[pts.length-1]; };
  for(let k=0;k<3;k++){ const f=((world.t*0.07)+k/3)%1, a=Math.sin(f*Math.PI); const [sx,sy]=toScreen(...at(f)); const r=Math.max(26,z*0.9);
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r); g.addColorStop(0,`rgba(255,250,225,${0.95*a})`); g.addColorStop(0.35,`rgba(255,214,130,${0.55*a})`); g.addColorStop(1,'rgba(255,214,130,0)'); ctx.fillStyle=g; circ(sx,sy,r); ctx.fill(); } }
function drawCable(){ const z=Z(); if(world.cover) coverCable();
  const [cx,cy]=toScreen(0,1.2);
  ctx.strokeStyle=COL.charcoal; ctx.lineWidth=Math.max(1.6,z*0.07); ctx.lineCap='round'; ctx.lineJoin='round';
  // over the pulley top + into the station
  ctx.beginPath(); ctx.arc(cx,cy,z*0.84,Math.PI,Math.PI*1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-z*0.84,cy); ctx.lineTo(cx-z*0.84,cy+z*0.4); ctx.stroke();
  path([[0,2.04],...TOWERS.map(t=>[t.x,t.y])]); ctx.stroke();
  if(z>40){ ctx.save(); ctx.translate(-z*0.012,-z*0.022); ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=Math.max(1,z*0.018); path([[0,2.04],...TOWERS.map(t=>[t.x,t.y])]); ctx.stroke(); ctx.restore(); }
  if(z>60){ // rope texture ticks (moving only during Station Tour)
    ctx.strokeStyle='rgba(255,255,255,0.28)'; ctx.lineWidth=Math.max(1,z*0.022); ctx.beginPath();
    SPANS.forEach(s=>{ const step=0.35; const off=((world.cableShift%step)+step)%step; for(let d=off; d<s.len; d+=step){ const x=s.a.x+s.ux*d, y=s.a.y+s.uy*d; const [px,py]=toScreen(x,y); const k=z*0.035;
      ctx.moveTo(px-s.nx*k-s.ux*k, py+s.ny*k+s.uy*k); ctx.lineTo(px+s.nx*k+s.ux*k, py-s.ny*k-s.uy*k); } }); ctx.stroke(); }
}
function drawMast(){ const z=Z(); const mx=40.45, gy=ground(mx);
  if(has('mast')){ sprA('mast','ref',ROPE.x,ROPE.top); const mt=anchorWorld('mast','mount'); const [mxs,mys]=toScreen(mt[0],mt[1]);
    if(world.mountFlash>0){ ctx.fillStyle=`rgba(255,226,140,${world.mountFlash})`; circ(mxs,mys,z*0.9*world.mountFlash+z*0.2); ctx.fill(); }
    ropeAndRuler(z); return; }
  const [bx,by]=toScreen(mx,gy), [tx,ty]=toScreen(mx,ROPE.top+0.6), [ax]=toScreen(ROPE.x-0.25,0);
  // deck
  const [d0x,d0y]=toScreen(38.2,ROPE.y0-0.95), [d1x]=toScreen(41.6,0); ctx.fillStyle='#C9A57E'; rrect(d0x,d0y,d1x-d0x,z*0.22,z*0.06); ctx.fill();
  ctx.fillStyle='#A7835F'; ctx.fillRect(d0x+z*0.3,d0y+z*0.22,z*0.12,toScreen(0,gy)[1]-d0y); ctx.fillRect(d1x-z*0.42,d0y+z*0.22,z*0.12,toScreen(0,gy)[1]-d0y);
  // store hatch
  const [hx,hy]=toScreen(40.7,ROPE.y0-0.2); ctx.fillStyle=COL.slateHi; rrect(hx,hy,z*0.8,z*0.75,z*0.1); ctx.fill(); ctx.fillStyle=COL.slate; rrect(hx+z*0.12,hy+z*0.12,z*0.56,z*0.12,z*0.04); ctx.fill();
  ctx.strokeStyle=COL.slate; ctx.lineWidth=Math.max(2,z*0.13); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.lineTo(ax,ty); ctx.stroke();
  // camera mount
  const [mxs,mys]=toScreen(ROPE.x,ROPE.top+0.38); ctx.fillStyle=COL.charcoal; rrect(mxs-z*0.42,mys-z*0.22,z*0.84,z*0.46,z*0.1); ctx.fill();
  ctx.fillStyle='#8FD8E6'; circ(mxs-z*0.2,mys,z*0.12); ctx.fill();
  if(world.mountFlash>0){ ctx.fillStyle=`rgba(255,226,140,${world.mountFlash})`; circ(mxs-z*0.2,mys,z*0.9*world.mountFlash+z*0.2); ctx.fill(); }
  ropeAndRuler(z);
}
function ropeAndRuler(z){
  if(world.ropeVisible){ const [rx,ry0]=toScreen(ROPE.x,ROPE.top+0.1), [,ry1]=toScreen(ROPE.x,ROPE.y0-0.9);
    ctx.strokeStyle=COL.charcoal; ctx.lineWidth=Math.max(1.4,z*0.06); ctx.beginPath(); ctx.moveTo(rx,ry0); ctx.lineTo(rx,ry1); ctx.stroke();
    if(world.ropeRuler){ const [qx]=toScreen(ROPE.x-1.0,0), [,qy0]=toScreen(0,ROPE.y0), [,qy1]=toScreen(0,ROPE.y0+12);
      ctx.strokeStyle='rgba(35,40,74,0.55)'; ctx.lineWidth=Math.max(1,z*0.035); ctx.setLineDash([z*0.18,z*0.14]); ctx.beginPath(); ctx.moveTo(qx,qy0); ctx.lineTo(qx,qy1); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(qx-z*0.18,qy0); ctx.lineTo(qx+z*0.18,qy0); ctx.moveTo(qx-z*0.18,qy1); ctx.lineTo(qx+z*0.18,qy1); ctx.stroke();
      label('120 cm', qx-z*0.3, (qy0+qy1)/2, Math.max(12,z*0.36), 'center'); } }
}
function label(t,x,y,size,align='center',fill=COL.navy,bg='#fff'){ ctx.font=`800 ${size}px Nunito, system-ui, sans-serif`; const w=ctx.measureText(t).width, h=size*1.45, pad=size*0.45;
  let bx = align==='center'?x-w/2-pad: x; ctx.fillStyle=bg; rrect(bx,y-h/2,w+pad*2,h,h/2); ctx.fill(); ctx.fillStyle=fill; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText(t,bx+pad,y+size*0.04); }

function drawRuler(){ const R=world.ruler; if(!R) return; const s=SPANS[R.span], z=Z(); const off=0.55;
  const P=(d)=>{ const p=spanPoint(R.span,d); return toScreen(p.x - s.nx*off, p.y - s.ny*off); };
  const L=R.len*R.reveal; const [ax,ay]=P(R.d0), [bx,by]=P(R.d0+L);
  ctx.strokeStyle='#FFF0BD'; ctx.lineWidth=z*0.34; ctx.lineCap='butt'; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='#E7C66A'; ctx.lineWidth=Math.max(1,z*0.03); ctx.beginPath();
  for(let k=0;k<=Math.floor(L+1e-6);k++){ const [px,py]=P(R.d0+k); const tl=(k%5===0?0.17:0.1)*z; ctx.moveTo(px+s.nx*z*0.17*1, py-s.ny*z*0.17); ctx.lineTo(px+s.nx*(z*0.17-tl), py-s.ny*(z*0.17-tl)); }
  ctx.strokeStyle=COL.navy; ctx.stroke();
  if(world.measureLabels) for(let k=0;k<=Math.floor(L+1e-6);k+=2){ const [px,py]=P(R.d0+k); ctx.save(); ctx.translate(px - s.nx*z*0.02, py + s.ny*z*0.02); ctx.rotate(-s.ang);
    ctx.fillStyle=COL.navy; ctx.font=`800 ${Math.max(9,z*0.17)}px Nunito, system-ui, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(k*10),0,z*0.02); ctx.restore(); }
}
/* G4 "the wheel unrolls": the distance once around the wheel is laid on the cable as a coloured strip, one colour per turn
   (the same colours as the bar blocks in the G4 panel), with a white notch between turns. */
export const RIBBON_COLS=['#F0644A','#1FA898'];
function drawRibbon(){ const R=world.ribbon; if(!R||R.len<=0) return; const s=SPANS[R.span]; const z=Z(); const seg=R.seg||R.len;
  const at=d=>{ const p=spanPoint(R.span,R.d0+d); return toScreen(p.x+s.nx*0.06,p.y+s.ny*0.06); };
  ctx.lineWidth=Math.max(3,z*0.075); ctx.lineCap='butt';
  for(let k=0, d=0; d<R.len-1e-6; k++, d+=seg){ const e=Math.min(R.len,d+seg); const [ax,ay]=at(d), [bx,by]=at(e);
    ctx.strokeStyle=RIBBON_COLS[(k+(R.c0||0))%2]; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke(); }
  if(R.seg){ ctx.strokeStyle='#fff'; ctx.lineWidth=Math.max(1.5,z*0.03); ctx.beginPath(); const h=z*0.1;
    for(let d=R.seg; d<=R.len+1e-6; d+=R.seg){ const [px,py]=at(d); ctx.moveTo(px-s.nx*h,py+s.ny*h); ctx.lineTo(px+s.nx*h,py-s.ny*h); } ctx.stroke(); } }
/* the rim still to be laid: a coloured arc on the wheel that shrinks as the strip grows (peel.k = 0..1 of this turn) */
function drawPeel(){ const R=world.ribbon; if(!R||!R.peel) return; const b=R.peel.b; if(!b||!b.visible) return; const W=WHEELS[b.wheel], z=Z(); const s=SPANS[b.span];
  const w=botWheelCenter(b); const [cx,cy]=toScreen(w.x,w.y); const r=W.r*z*(b.wheelPop||1); const left=(1-R.peel.k)*Math.PI*2; if(left<0.02) return;
  const a0=Math.atan2(s.ny,-s.nx); // screen angle of the contact point (towards the cable)
  ctx.lineCap='round'; ctx.lineWidth=Math.max(3,r*0.3); ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(cx,cy,r*0.93,a0,a0-left,true); ctx.stroke();
  ctx.lineWidth=Math.max(2,r*0.2); ctx.strokeStyle=RIBBON_COLS[R.peel.c%2]; ctx.beginPath(); ctx.arc(cx,cy,r*0.93,a0,a0-left,true); ctx.stroke(); }
// light pulse running down the cable from a tower that was just cleared (world.pulse = {from: tower index, p: 0..1})
function drawPulse(){ const P=world.pulse; if(!P) return; const z=Z(); const pts=[P0,...TOWERS.slice(0,P.from+1)];
  let total=0; const segs=[]; for(let i=1;i<pts.length;i++){ const l=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y); segs.push(l); total+=l; }
  const at=f=>{ let d=Math.max(0,Math.min(1,f))*total; for(let i=segs.length-1;i>=0;i--){ if(d<=segs[i]){ const a=pts[i+1], b=pts[i], t=d/segs[i]; return [a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t]; } d-=segs[i]; } return [P0.x,P0.y]; };
  for(let k=5;k>=0;k--){ const [wx,wy]=at(P.p-k*0.018); const [sx,sy]=toScreen(wx,wy); const r=Math.max(2,z*(0.16-k*0.018)); ctx.globalAlpha=(1-k/6)*(1-Math.max(0,P.p-0.85)/0.15);
    ctx.fillStyle=k?'rgba(140,255,232,0.55)':'#fff'; circ(sx,sy,r); ctx.fill(); }
  const [hx,hy]=toScreen(...at(P.p)); const g=ctx.createRadialGradient(hx,hy,0,hx,hy,z*0.9); g.addColorStop(0,'rgba(180,255,240,0.6)'); g.addColorStop(1,'rgba(67,224,200,0)'); ctx.fillStyle=g; circ(hx,hy,z*0.9); ctx.fill(); ctx.globalAlpha=1; }
function drawFlags(img){ world.flags.forEach(f=>{ const p=spanPoint(f.span,f.d); const [sx,sy]=toScreen(p.x,p.y); const h=Z()*1.25*(f.scale||1); if(!img||!img.complete) return;
  const w=h*img.naturalWidth/img.naturalHeight; ctx.drawImage(img, sx-w*0.28, sy-h, w, h); }); }

function drawPathDots(){ if(!world.pathDots) return; ctx.fillStyle='rgba(255,255,255,0.95)'; const z=Z(); const ph=(world.t*0.6)%0.9;
  SPANS.forEach(s=>{ for(let d=ph; d<s.len; d+=0.9){ const p=spanPoint(SPANS.indexOf(s),d); const [x,y]=toScreen(p.x+s.nx*0.28,p.y+s.ny*0.28); circ(x,y,Math.max(1.6,z*0.06)); ctx.fill(); } }); }

function drawKids(){ if(!world.kidsVisible) return; const z=Z();
  world.kids.forEach((k,i)=>{ if(k.alpha<=0) return; ctx.globalAlpha=k.alpha; const bob=world.kidsBob?Math.abs(Math.sin(world.t*3.2+k.ph))*0.08:0;
    const x=k.x+k.dx, y=0+bob+k.hop+k.dy; const [sx,sy]=toScreen(x,y); const h=z*1.05, w=z*0.46;
    ctx.fillStyle=k.col; rrect(sx-w/2,sy-h*0.72,w,h*0.72,w*0.45); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.12)'; rrect(sx-w/2-z*0.06,sy-h*0.62,w*0.42,h*0.42,w*0.18); ctx.fill();
    ctx.fillStyle='#F5D0B0'; if(i%3===1) ctx.fillStyle='#C98D63'; if(i%3===2) ctx.fillStyle='#8D5A3B';
    circ(sx,sy-h*0.86,w*0.5); ctx.fill(); ctx.fillStyle=COL.navy; circ(sx+w*0.14,sy-h*0.87,Math.max(1,z*0.04)); ctx.fill(); circ(sx+w*0.34,sy-h*0.87,Math.max(1,z*0.04)); ctx.fill();
    ctx.globalAlpha=1; });
}
function drawGate(){ const z=Z(); const R=world.painted; const [px,py]=toScreen(R?-10.2:-5.05,0), [,ty]=toScreen(0,1.15);
  ctx.fillStyle=COL.slate; rrect(px-z*0.09,ty,z*0.18,py-ty,z*0.05); ctx.fill();
  ctx.save(); ctx.translate(px,ty+z*0.2); ctx.rotate(-world.gateOpen*1.35);
  const dir=R?1:-1; for(let k=0;k<5;k++){ ctx.fillStyle=k%2?'#fff':COL.coral; ctx.fillRect(R?k*z*0.32:-z*1.7+k*z*0.34,-z*0.08,z*(R?0.32:0.34),z*0.16); }
  if(world.gateOpen<0.1){ ctx.fillStyle=COL.yellow; rrect(R?z*0.75:-z*1.0,-z*0.08,z*0.22,z*0.26,z*0.05); ctx.fill(); }
  ctx.restore(); }
function drawGondola(img){ const g=world.gondola; if(!img||!img.complete||g.alpha<=0) return; let x,y;
  if(g.mode==='parked'){ x=-1.65; y=2.75; } else { let d=g.d, i=0; while(i<3&&d>SPANS[i].len){ d-=SPANS[i].len; i++; } d=Math.min(d,SPANS[i].len); const p=spanPoint(i,d); x=p.x; y=p.y+0.08; }
  const [sx,sy]=toScreen(x,y); const h=Z()*1.9, w=h*img.naturalWidth/img.naturalHeight; ctx.globalAlpha=g.alpha; ctx.drawImage(img,sx-w*0.5,sy-h*0.12,w,h); ctx.globalAlpha=1; }

export function drawBot(b){ if(!b.visible||b.alpha<=0) return; const z=Z(); const W=WHEELS[b.wheel]; ctx.globalAlpha=b.alpha;
  const wc=botWheelCenter(b), bc=botBodyCenter(b); const jx=(Math.random()-0.5)*b.jit, jy=(Math.random()-0.5)*b.jit;
  const [wx,wy]=toScreen(wc.x+jx,wc.y+jy), [bx,by]=toScreen(bc.x+jx,bc.y+jy);
  if(b.v>1.2 && b.mode==='span'){ const s=SPANS[b.span]; ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineCap='round'; ctx.lineWidth=Math.max(1.5,z*0.035);
    for(let k=0;k<3;k++){ const o=(k-1)*0.22, L=0.7+0.3*k, ph=(world.t*7+k*0.37)%1; const bx0=bc.x - s.ux*(0.5+ph*0.3) + s.nx*o, by0=bc.y - s.uy*(0.5+ph*0.3) + s.ny*o; const [a1,b1]=toScreen(bx0,by0), [a2,b2]=toScreen(bx0-s.ux*L,by0-s.uy*L); ctx.globalAlpha=b.alpha*(1-ph)*0.9; ctx.beginPath(); ctx.moveTo(a1,b1); ctx.lineTo(a2,b2); ctx.stroke(); } ctx.globalAlpha=b.alpha; }
  // arm
  ctx.strokeStyle=COL.slate; ctx.lineWidth=Math.max(2,z*0.07); ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(bx,by-z*0.2); ctx.stroke();
  if(has('bot_body')){ const n=b.items.size; const rot=-b.sway*0.6;
    if(n>0){ const topW=[bc.x+jx+Math.sin(b.sway)*0.0, bc.y+jy-0.25];
      const its=[...b.items]; its.forEach((it,k)=>{ const im=world.itemImgs&&world.itemImgs[it]; if(!im||!im.complete) return; const [ix,iy]=toScreen(topW[0]-0.12*(its.length-1)/2+k*0.12, topW[1]-0.02); const h=z*0.2, w=h*im.naturalWidth/im.naturalHeight; ctx.drawImage(im,ix-w/2,iy-h*0.85,w,h); });
      sprA('bag_'+Math.min(4,n),'top',topW[0],topW[1]+0.04,1,rot); }
    { const [gx,gy]=toScreen(bc.x+jx,bc.y+jy), hr=z*0.5, ha=Math.max(0.12,Math.min(1,(150-z)/80)); // soft halo: the bot reads at every zoom
      const hg=ctx.createRadialGradient(gx,gy,hr*0.25,gx,gy,hr); hg.addColorStop(0,`rgba(255,248,220,${(0.42*ha).toFixed(3)})`); hg.addColorStop(1,'rgba(255,248,220,0)'); ctx.fillStyle=hg; circ(gx,gy,hr); ctx.fill();
      const cp=b.mode==='rope'?[ROPE.x,wc.y]:(()=>{ const q=spanPoint(b.span,b.d); return [q.x,q.y]; })(); const [cx2,cy2]=toScreen(cp[0],cp[1]), cr=Math.max(4,z*0.14), ca=(b.v||0)>0?0.55:0.28; // wheel–cable contact glow
      const cg=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,cr); cg.addColorStop(0,`rgba(255,226,150,${ca})`); cg.addColorStop(1,'rgba(255,226,150,0)'); ctx.fillStyle=cg; circ(cx2,cy2,cr); ctx.fill(); ctx.globalAlpha=b.alpha; }
    if(world.painted&&has('bot_face')&&pk('bot_eyes_idle')){ sprA('bot_face','center',bc.x+jx,bc.y+jy,1,rot,b.alpha); const en=eyesFor(b), im=pk(en)||pk('bot_eyes_idle'); const ew=0.4, eh=ew*im.height/im.width; const ox=-Math.sin(rot)*0.02+(b.lookX||0)*0.05, oy=Math.cos(rot)*0.02+(b.lookY||0)*0.035; // lookX/Y in -1..1: eyes glance toward what was tapped
      pimg(en,bc.x+jx+ox,bc.y+jy+oy,eh,0.5,0.5,{rot,alpha:b.alpha}); }
    else sprA(b.dim||b.blink>0?'bot_blink':'bot_body','center',bc.x+jx,bc.y+jy,1,rot,b.alpha);
    ctx.globalAlpha=b.alpha;
    if(!wheelSprite(b.wheel,wc.x+jx,wc.y+jy,b.angle,W.r,b.wheelPop)) drawWheelFace(wx,wy,W.r*z*b.wheelPop,b.angle,{groove:W.groove,band:W.band}); glossDisc(wx,wy,W.r*z*b.wheelPop);
    { const av=Math.abs(b.angle-(b._pa??b.angle)); b._pa=b.angle; const ba=Math.max(0,Math.min(0.5,(av-0.1)*1.6)); if(ba>0.01){ const rr=W.r*z*b.wheelPop; // spokes blur into a disc at speed
      ctx.fillStyle=`rgba(78,86,122,${ba.toFixed(3)})`; circ(wx,wy,rr*0.8); ctx.fill(); ctx.strokeStyle=`rgba(255,255,255,${(ba*0.5).toFixed(3)})`; ctx.lineWidth=Math.max(1,rr*0.06); circ(wx,wy,rr*0.5); ctx.stroke(); } }
    if(b.beacon && z<70){ ctx.strokeStyle='rgba(255,200,61,0.9)'; ctx.lineWidth=2.5; circ(bx,by-z*0.1,14+3*Math.sin(world.t*4)); ctx.stroke(); }
    ctx.globalAlpha=1; return; }
  ctx.save(); ctx.translate(bx,by); ctx.rotate(-b.sway*0.6);
  // bag
  const n=b.items.size; if(n>0){ const bw=z*(0.34+n*0.07), bh=z*(0.3+n*0.06), top=z*0.22;
    ctx.fillStyle='#E9845A'; ctx.beginPath(); ctx.moveTo(-bw*0.42,top); ctx.quadraticCurveTo(-bw*0.75,top+bh*1.1,0,top+bh*1.05); ctx.quadraticCurveTo(bw*0.75,top+bh*1.1,bw*0.42,top); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#F6A47C'; ctx.beginPath(); ctx.ellipse(-bw*0.12,top+bh*0.45,bw*0.18,bh*0.22,0,0,Math.PI*2); ctx.fill();
    const peek={camera:COL.slate,lamp:'#FFE9B8',toolbox:COL.coral,battery:COL.teal}; let k=0; for(const it of b.items){ ctx.fillStyle=peek[it]; rrect(-bw*0.36+k*bw*0.2,top-z*0.08,bw*0.17,z*0.14,z*0.04); ctx.fill(); k++; }
    ctx.strokeStyle='#B85A38'; ctx.lineWidth=Math.max(1,z*0.03); ctx.beginPath(); ctx.moveTo(-bw*0.42,top+z*0.02); ctx.lineTo(bw*0.42,top+z*0.02); ctx.stroke(); }
  // body
  const w=z*0.66, h=z*0.5; let g=ctx.createLinearGradient(0,-h/2,0,h/2); g.addColorStop(0,'#FFD966'); g.addColorStop(1,'#F2AA1E');
  ctx.fillStyle=COL.slate; circ(-w/2,0,z*0.09); ctx.fill(); circ(w/2,0,z*0.09); ctx.fill();
  ctx.fillStyle=g; rrect(-w/2,-h/2,w,h,z*0.14); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.35)'; rrect(-w/2+z*0.06,-h/2+z*0.04,w*0.5,z*0.07,z*0.035); ctx.fill();
  ctx.fillStyle='#262B47'; rrect(-w*0.37,-h*0.28,w*0.74,h*0.5,z*0.09); ctx.fill();
  const eh=b.dim?0.25:(b.blink>0?0.15:1); ctx.fillStyle=b.dim?'#5B6D86':'#74E3F2';
  [-1,1].forEach(sg=>{ ctx.beginPath(); ctx.ellipse(sg*w*0.16,-h*0.03,z*0.07,z*0.08*eh,0,0,Math.PI*2); ctx.fill(); });
  if(!b.dim&&b.blink<=0){ ctx.fillStyle='#fff'; [-1,1].forEach(sg=>{ circ(sg*w*0.16-z*0.022,-h*0.07,z*0.022); ctx.fill(); }); }
  ctx.restore();
  // wheel
  const R=W.r*z*b.wheelPop; drawWheelFace(wx,wy,R,b.angle,{groove:W.groove,band:W.band});
  if(b.beacon && z<70){ ctx.strokeStyle='rgba(255,200,61,0.9)'; ctx.lineWidth=2.5; circ(bx,by-z*0.1,14+3*Math.sin(world.t*4)); ctx.stroke(); }
  ctx.globalAlpha=1;
}

export function drawWorld(imgs){
  if(world.painted&&pk('station_v2')){ drawPainted(imgs); return; }
  drawFar(); drawIsland();
  TREES.filter(t=>t.back).forEach(t=>drawTree(t,false));
  drawStation(); TOWERS.forEach((_,i)=>drawTower(i)); drawMast();
  drawRuler(); drawCable(); drawPulse(); drawRibbon(); drawPathDots(); drawFlags(imgs.flag);
  drawGondola(imgs.gondola);
  world.bots.forEach(drawBot); drawPeel();
  drawGate(); drawKids();
  TREES.filter(t=>!t.back).forEach(t=>drawTree(t,true)); drawTufts();
}

/* ================= Painted world pack (ChatGPT art + Blender bot) ================= */
const PK={}; let PKM={};
export function loadPack(){ const S=window.PACK||{}; PKM=window.PACKMETA||{}; Object.keys(S).forEach(k=>{ const im=new Image(); PK[k]={img:im,ok:false}; im.onload=()=>{ PK[k].ok=true; world.painted=true; world.onSprite&&world.onSprite(); }; im.src=S[k]; }); }
export const pk=n=>PK[n]&&PK[n].ok?PK[n].img:null;
function pimg(n,x,y,h,ax=0.5,ay=1,o={}){ const im=pk(n); if(!im) return false; const p=o.p||1; const z=p!==1?(world.bg?world.bg.zoom:Z())*(0.55+0.45*p):Z(); const H=h*z, W=H*im.width/im.height*(o.sx||1); const [sx,sy]=toScreen(x,y,p);
  const L=sx-W*ax, T=sy-H*ay; if(!o.rot&&(L>world.W||T>world.H||L+W<0||T+H<0)) return true;
  ctx.globalAlpha=(o.alpha??1)*(ctx._a??1); if(o.flip||o.rot){ ctx.save(); ctx.translate(sx,sy); if(o.rot) ctx.rotate(o.rot); if(o.flip) ctx.scale(-1,1); ctx.drawImage(im,-W*ax,-H*ay,W,H); ctx.restore(); } else ctx.drawImage(im,L,T,W,H); ctx.globalAlpha=1; return true; }
function psheet(n,frame,x,y,h,ax=0.5,ay=1,o={}){ const im=pk(n), m=PKM[n]; if(!im||!m) return false; const f=((Math.floor(frame)%m.frames)+m.frames)%m.frames; const cx=(f%m.cols)*m.fw, cy=Math.floor(f/m.cols)*m.fh;
  const z=Z(); const H=h*z, W=H*m.fw/m.fh; const [sx,sy]=toScreen(x,y); const L=sx-W*ax, T=sy-H*ay; if(L>world.W||T>world.H||L+W<0||T+H<0) return true;
  ctx.globalAlpha=o.alpha??1; if(o.flip||o.rot){ ctx.save(); ctx.translate(sx,sy); if(o.rot) ctx.rotate(o.rot); if(o.flip) ctx.scale(-1,1); ctx.drawImage(im,cx,cy,m.fw,m.fh,-W*ax,-H*ay,W,H); ctx.restore(); } else ctx.drawImage(im,cx,cy,m.fw,m.fh,L,T,W,H); ctx.globalAlpha=1; return true; }
function pano(n,p,baseY,h,fill){ const im=pk(n); if(!im) return; const z=(world.bg?world.bg.zoom:Z())*(0.55+0.45*p); const H=h*z, W=H*im.width/im.height; const [sx,sy]=toScreen(0,baseY,p);
  const k0=Math.ceil(sx/W); let x0=sx-k0*W; for(let x=x0,k=-k0; x<world.W; x+=W-1,k++){ if(k&1){ ctx.save(); ctx.translate(x+W,sy-H); ctx.scale(-1,1); ctx.drawImage(im,0,0,W,H); ctx.restore(); } else ctx.drawImage(im,x,sy-H,W,H); }
  if(fill&&sy<world.H+400){ ctx.fillStyle=fill; ctx.fillRect(-400,sy-2,world.W+800,world.H+800); } }
const CLOUDS=[[-30,22,0.32,5],[-6,30,0.42,6],[14,24,0.3,4.5],[34,33,0.45,7],[58,26,0.35,5.5],[80,31,0.4,6],[100,23,0.3,5]];
const COVER_PUFFS=[[-14,'cloud_01'],[-4,'cloud_05'],[6,'cloud_03'],[16,'cloud_06'],[26,'cloud_02'],[36,'cloud_04'],[46,'cloud_05']];
const ISLETS=[[-26,15,0.42,6.5,'floating_islet_01'],[70,23,0.5,8,'floating_islet_03'],[84,7,0.38,5,'floating_islet_02'],[-44,27,0.3,4,'floating_islet_02']];
const PTREE={round:['tree_oak','tree_cluster','tree_blossom','tree_birch'], pine:['tree_pine','tree_tall_pine'], bush:['tree_bush_round','tree_bush_flower','tree_bush_tall']};
const PTH={tree_oak:2.6,tree_cluster:2.4,tree_blossom:2.5,tree_birch:3.0,tree_pine:2.6,tree_tall_pine:3.4,tree_bush_round:1.05,tree_bush_flower:1.0,tree_bush_tall:1.35};
const SCAT=[]; const PROCKS=[];
(function(){ seed=99; const names=['scatter_flower_yellow','scatter_flower_coral','scatter_flower_white','scatter_flower_blue','scatter_flower_pair','scatter_flower_sprig','scatter_grass_short','scatter_grass_tall','scatter_grass_curved','scatter_pebble_round','scatter_pebble_pair','scatter_pebble_moss'];
  for(let x=-16;x<47;x+=0.55+rnd()*1.2){ if(x>-16.2&&x<1.2) { if(rnd()<0.85) continue; } if(TOWERS.some(t=>Math.abs(t.x-x)<0.9)) continue; SCAT.push({x, n:names[Math.floor(rnd()*names.length)], h:0.28+rnd()*0.22, flip:rnd()<0.5}); }
  const rn=['rock_round','rock_flat','rock_tall','rock_moss','rock_grass','rock_cluster']; for(let x=6.5;x<46;x+=4+rnd()*5){ if(TOWERS.some(t=>Math.abs(t.x-x)<1.8)||(x>38.5&&x<43.5)) continue; PROCKS.push({x, n:rn[Math.floor(rnd()*rn.length)], h:0.55+rnd()*0.5, flip:rnd()<0.5}); } })();
const FLOWERS=[]; (function(){ seed=133; const fl=['scatter_flower_yellow','scatter_flower_coral','scatter_flower_white','scatter_flower_blue','scatter_flower_pair','scatter_flower_sprig','scatter_grass_tall','scatter_grass_curved'];
  for(let x=3;x<45;x+=1.1+rnd()*1.8){ if(TOWERS.some(t=>Math.abs(t.x-x)<1.0)) continue; const n=1+Math.floor(rnd()*3), d0=0.8+rnd()*Math.max(1,ground(x)*0.7);
    for(let k=0;k<n;k++) FLOWERS.push({x:x+rnd()*0.6, depth:d0+rnd()*0.5, n:fl[Math.floor(rnd()*fl.length)], h:0.22+rnd()*0.16, flip:rnd()<0.5}); } })();
function treeName(t,salt=0){ const L=PTREE[t.kind]; return L[(Math.floor(Math.abs(t.x*7.31))+salt)%L.length]; }

function drawPainted(imgs){
  const z=Z(), t=world.t; if(!ART.cliff) initCliff();
  // 1. distant layers
  pano('panorama_far_snow',0.12,-2,15,PKM.panorama_far_snow&&PKM.panorama_far_snow.bottom);
  CLOUDS.slice(0,3).forEach(([x,y,p,h],i)=>pimg('cloud_0'+(i+1),x+((t*0.25*(i%2?1:-1))%40),y,h*0.45,0.5,0.5,{p,alpha:0.92}));
  pano('panorama_mid_range',0.26,-2,11,!world.cover&&PKM.panorama_mid_range&&PKM.panorama_mid_range.bottom); // cover: no flat fill under the layer (reads as haze, not a band)
  if(!world.cover) ISLETS.forEach(([x,y,p,h,n])=>pimg(n,x,y+Math.sin(t*0.4+x)*0.25,h,0.5,0.5,{p}));
  CLOUDS.slice(3).forEach(([x,y,p,h],i)=>pimg('cloud_0'+(i+4>6?6:i+4),x+((t*0.35)%60),y,h*0.45,0.5,0.5,{p,alpha:0.9}));
  if(!world.cover) pano('panorama_forest_hills',0.45,-3,8,PKM.panorama_forest_hills&&PKM.panorama_forest_hills.bottom); // cover: minimal — sky, far + mid mountains, clouds, the hill
  if(world.cover){ // cover: one cloud row tucked under the mountains, a soft mist gradient below, big slow puffs behind the island
    const csb=PKM.cloud_sea&&PKM.cloud_sea.bottom||'#B7B3D6'; const g=ctx.createLinearGradient(0,world.H*0.6,0,world.H); g.addColorStop(0,csb); g.addColorStop(1,'rgba(214,206,232,1)');
    pano('cloud_sea',0.7,2.3,7,g);
    COVER_PUFFS.forEach(([x,n],i)=>pimg(n,x+Math.sin(t*0.05+i*1.3)*0.6,-5.1+Math.sin(t*0.12+i)*0.12,5.2,0.5,0.5,{p:0.8,alpha:0.95,flip:i%2===1})); }
  else pano('cloud_sea',0.7,-5.5,7,PKM.cloud_sea&&PKM.cloud_sea.bottom);
  { const g=ctx.createLinearGradient(0,0,0,world.H); g.addColorStop(0,'rgba(232,232,248,0)'); g.addColorStop(0.55,'rgba(228,230,248,0.10)'); g.addColorStop(1,'rgba(228,230,248,0.22)'); ctx.fillStyle=g; ctx.fillRect(0,0,world.W,world.H); } // depth haze: background recedes
  // 2. island
  drawIslandPainted(); drawIslandMist();
  TREES.filter(tr=>tr.back).forEach(tr=>{ const n=treeName(tr); pimg(n,tr.x,ground(tr.x)+0.05,PTH[n]*Math.min(1.15,Math.max(0.8,tr.s))*0.95,0.5,0.97,{flip:tr.v===1}); });
  PROCKS.forEach(r=>pimg(r.n,r.x,ground(r.x)+0.02,r.h,0.5,0.92,{flip:r.flip}));
  drawStationPainted();
  TOWERS.forEach((_,i)=>drawTowerPainted(i));
  drawMastPainted();
  drawRuler(); drawCable(); drawPulse(); drawRibbon(); drawPathDots(); drawFlags(imgs.flag);
  drawGondolaPainted();
  drawButterflies();
  world.bots.forEach(drawBot); drawPeel();
  drawGate(true); drawOperator(); drawKidsPainted();
  TREES.filter(tr=>!tr.back).forEach(tr=>{ const n=treeName(tr,1); pimg(n,tr.x,ground(tr.x)-0.2,PTH[n]*Math.min(1.15,Math.max(0.85,tr.s)),0.5,0.97,{flip:tr.v===2}); });
  drawGrassEdge();
  SCAT.forEach(c=>pimg(c.n,c.x,ground(c.x)-0.06,c.h,0.5,0.9,{flip:c.flip}));
  drawFX(); drawBirds();
}
function drawIslandPainted(){ const z=Z();
  // back ridge
  // (ends pinned to the island tips: the old -0.6 shift poked a green wedge past the cliff on the left)
  const back=GP.map(([x,y],i)=>[i===0||i===GP.length-1?x:x-0.6, y+(x>-10&&x<44?1.1+0.5*Math.sin(x*0.5):0)]);
  smoothPath(back); { const [ex,ey]=toScreen(47,-0.3), [bx,by]=toScreen(-16.4,-0.3); ctx.lineTo(ex,ey); ctx.lineTo(bx,by); ctx.closePath(); } ctx.fillStyle='#5A9650'; ctx.fill();
  // underside with painted cliff texture: a smooth rounded silhouette (was straight segments → a hard diagonal cut against the cloud sea)
  underPath(); ctx.fillStyle='#8A6A55'; ctx.fill();
  if(ART.cliff){ const k=z*10/512; const [ox,oy]=toScreen(0,-0.25); ART.cliff.setTransform(new DOMMatrix([k,0,0,k,ox,oy])); ctx.fillStyle=ART.cliff; ctx.fill(); }
  { const [,f0]=toScreen(0,-2.5), [,f1]=toScreen(0,-10.4); const fg=ctx.createLinearGradient(0,f0,0,f1); fg.addColorStop(0,'rgba(60,40,70,0)'); fg.addColorStop(0.55,'rgba(70,60,100,0.35)'); fg.addColorStop(1,'rgba(220,222,240,0.85)'); ctx.fillStyle=fg; ctx.fill(); }
  // rock rim: darker band just inside the silhouette so the edge reads as rounded rock, not a cut-out
  ctx.save(); ctx.clip(); ctx.strokeStyle='rgba(48,34,58,0.32)'; ctx.lineWidth=Math.max(6,z*0.9); ctx.lineJoin='round'; underPath(); ctx.stroke(); ctx.restore();
  // hill face
  smoothPath(GP); { const [ex,ey]=toScreen(47.8,-0.35), [bx,by]=toScreen(-16.6,-0.35); ctx.lineTo(ex,ey); ctx.lineTo(bx,by); ctx.closePath(); }
  const [,h0]=toScreen(0,21), [,h1]=toScreen(0,-0.3); let g=ctx.createLinearGradient(0,h0,0,h1); g.addColorStop(0,'#8FCB64'); g.addColorStop(1,'#5E9F4A'); ctx.fillStyle=g; ctx.fill();
  patFill(ART.grass,5.5,0.85);
  { const [lx]=toScreen(-16,0), [rx]=toScreen(48,0); const lg=ctx.createLinearGradient(lx,0,rx,0); lg.addColorStop(0,'rgba(255,236,200,0.18)'); lg.addColorStop(0.5,'rgba(255,236,200,0)'); lg.addColorStop(1,'rgba(30,40,90,0.16)'); ctx.fillStyle=lg; ctx.fill();
    const [,a0]=toScreen(0,3.5), [,a1]=toScreen(0,-0.35); const ao=ctx.createLinearGradient(0,a0,0,a1); ao.addColorStop(0,'rgba(20,50,35,0)'); ao.addColorStop(1,'rgba(20,50,35,0.30)'); ctx.fillStyle=ao; ctx.fill(); }
  ctx.save(); ctx.clip();
  ctx.strokeStyle='rgba(255,255,255,0.09)'; ctx.lineWidth=z*0.5; [2.2,5.2,8.6].forEach(o=>{ smoothPath(GP.map(([x,y])=>[x,y-o])); ctx.stroke(); });
  { const pts=[]; for(let x=1.2,k=0;x<38.5;x+=3.1,k++) pts.push([x,ground(x)-(k%2?2.5:0.95)]); // switchback footpath up the face
    ctx.lineJoin='round'; ctx.lineCap='round'; smoothPath(pts); ctx.strokeStyle='rgba(214,188,132,0.42)'; ctx.lineWidth=Math.max(2,z*0.24); ctx.stroke(); ctx.strokeStyle='rgba(255,240,205,0.32)'; ctx.lineWidth=Math.max(1,z*0.1); ctx.stroke(); }
  FLOWERS.forEach(f=>{ const y=ground(f.x)-f.depth; if(y<0.4) return; pimg(f.n,f.x,y,f.h,0.5,0.9,{flip:f.flip}); });
  FACE.forEach(f=>{ const y=ground(f.x)-f.depth; if(y<0.5) return; if(f.rock) pimg(['rock_moss','rock_round','rock_grass'][f.v%3],f.x,y,f.s*0.7,0.5,0.9); else { const n=treeName(f,2); pimg(n,f.x,y,PTH[n]*f.s*0.55,0.5,0.97,{flip:f.v===1}); } });
  { const t=world.t; [[0,6.5],[1,9],[2,7.5]].forEach(([i,r])=>{ const x=((t*0.32+i*24)%72)-14, y=ground(x)*0.55; const [sx,sy]=toScreen(x,y), RR=z*r; // cloud shadows drifting across the hill
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,RR); g.addColorStop(0,'rgba(18,40,62,0.17)'); g.addColorStop(1,'rgba(18,40,62,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(sx,sy,RR,RR*0.55,-0.25,0,Math.PI*2); ctx.fill(); }); }
  ctx.restore();
}
// island underside outline, smoothed (top edge stays straight; tips and belly curve)
function underPath(){ // top edge stays straight (meets the hill face); only the rocky belly is smoothed
  const S=[[47.8,-0.3],...UNDER.slice(1,-1),[-16.6,-0.3]].map(([x,y])=>toScreen(x,y)); const [ax,ay]=toScreen(-16.6,-0.3);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(S[0][0],S[0][1]);
  for(let i=1;i<S.length-1;i++){ const mx=(S[i][0]+S[i+1][0])/2, my=(S[i][1]+S[i+1][1])/2; ctx.quadraticCurveTo(S[i][0],S[i][1],mx,my); }
  ctx.lineTo(S[S.length-1][0],S[S.length-1][1]); ctx.closePath(); }
// cloud puffs wrapped around the island's lower outline, in FRONT of the cliff: the island sits in the clouds instead of
// on top of a pasted cloud band. All tops stay below y≈-0.7, so they never cover ground, characters or buildings.
const MIST=[[-16.4,-2.3,2.6,'cloud_02'],[-13.4,-3.4,3.0,'cloud_05'],[-8.8,-4.9,3.2,'cloud_03'],[-2.6,-6.8,3.4,'cloud_01'],[4.4,-8.6,3.6,'cloud_06'],
  [12.5,-10.1,3.8,'cloud_04'],[21.5,-10.5,3.8,'cloud_02'],[30.5,-9.1,3.6,'cloud_05'],[38.2,-7.0,3.4,'cloud_03'],[44.2,-4.7,3.0,'cloud_01'],[47.6,-2.4,2.6,'cloud_06']];
function drawIslandMist(){ const t=world.t; MIST.forEach(([x,y,h,n],i)=>{ const dx=Math.sin(t*0.13+i*1.7)*0.35, dy=Math.sin(t*0.21+i)*0.08;
  pimg(n,x+dx,y+dy,h,0.5,0.5,{alpha:0.94,flip:i%2===1}); }); }
function drawGrassEdge(){ const im=pk('grass_edge'); if(!im) return; const z=Z(); const xl=world.cam.x-world.W/2/z-1, xr=world.cam.x+world.W/2/z+1; const tile=6, ws=Math.max(0.25,Math.min(0.8,40/z)); const H=0.75*z;
  for(let x=Math.max(-16.5,Math.floor(xl/ws)*ws); x<Math.min(47.6,xr); x+=ws){ const y0=ground(x), y1=ground(x+ws); const [ax,ay]=toScreen(x,y0), [bx,by]=toScreen(x+ws,y1); const ang=Math.atan2(by-ay,bx-ax), len=Math.hypot(bx-ax,by-ay);
    const u=((x%tile)+tile)%tile/tile*im.width, uw=ws/tile*im.width; ctx.save(); ctx.translate(ax,ay); ctx.rotate(ang); ctx.drawImage(im,u,0,Math.min(uw,im.width-u),im.height,-0.5,-H*0.58,len+1,H); ctx.restore(); } }
const ST={cx:-4.0,w:6.1,h:4.1,y:-0.08}; const stX=r=>ST.cx-ST.w/2+r*ST.w, stY=r=>ST.y+ST.h*(1-r);
function drawStationPainted(){ const z=Z();
  pimg('prop_lamp_post',-16.25,0.02,2.3,0.5,0.97);
  pimg('station_v2',ST.cx,ST.y,ST.h,0.5,1);
  { const [sx,sy]=toScreen(stX(0.411),stY(0.407)); ctx.fillStyle=COL.navy; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`900 ${Math.max(5,z*0.17)}px Nunito, system-ui, sans-serif`; ctx.fillText('FIRST RIDE',sx,sy-z*0.13); ctx.font=`900 ${Math.max(6,z*0.25)}px Nunito, system-ui, sans-serif`; ctx.fillText('7:00',sx,sy+z*0.15); ctx.textAlign='left'; }
  if(world.warm>0.02){ [[0.45,0.25,1.6],[0.36,0.72,1.3]].forEach(([rx,ry,r])=>{ const [wx,wy]=toScreen(stX(rx),stY(ry)); const rg=ctx.createRadialGradient(wx,wy,0,wx,wy,z*r); rg.addColorStop(0,`rgba(255,210,120,${0.32*world.warm})`); rg.addColorStop(1,'rgba(255,210,120,0)'); ctx.fillStyle=rg; circ(wx,wy,z*r); ctx.fill(); }); }
  const [cx,cy]=toScreen(0,1.2), [,gy]=toScreen(0,0); ctx.fillStyle=COL.slate; ctx.beginPath(); ctx.moveTo(cx-z*0.42,gy); ctx.lineTo(cx-z*0.08,cy); ctx.lineTo(cx+z*0.08,cy); ctx.lineTo(cx+z*0.42,gy); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#B8B3C6'; rrect(cx-z*0.6,gy-z*0.12,z*1.2,z*0.18,z*0.05); ctx.fill();
  if(!wheelSprite('pulley',0,1.2,world.pulleyAngle,0.8)) drawWheelFace(cx,cy,z*0.8,world.pulleyAngle,{groove:1,spokes:6}); glossDisc(cx,cy,z*0.8);
}
export const GONDOLA_DOCK=[stX(0.74),stY(0.47)];
function towerGeom(i){ const t=TOWERS[i], gy=ground(t.x)-0.12; const Hs=(t.y-gy)/(1-0.195); const W=1.55+0.22*(Hs-3); const nat=Hs*420/760; return {t,gy,Hs,sx:W/nat}; }
export function towerLamp(i){ const g=towerGeom(i); return [g.t.x, g.gy+g.Hs*(1-0.035)]; }
function drawTowerPainted(i){ const g=towerGeom(i), z=Z(); const [bx,by]=toScreen(g.t.x+0.15,g.gy+0.05); ctx.fillStyle='rgba(30,50,40,0.25)'; ctx.beginPath(); ctx.ellipse(bx,by,z*1.1,z*0.14,0,0,Math.PI*2); ctx.fill();
  const n=world.lampFlash[i]>0?'tower_flash':(world.lit[i]||world.cover)?'tower_lit':'tower_off'; pimg(n,g.t.x,g.gy,g.Hs,0.5,1,{sx:g.sx});
  const [lx,ly]=toScreen(...towerLamp(i)); if(world.lit[i]||world.cover){ const br=0.8+0.2*Math.sin(world.t*2.2+i*1.3), rr=z*0.7*(0.9+0.2*br); /* lit lamps breathe */ const rg=ctx.createRadialGradient(lx,ly,0,lx,ly,rr); rg.addColorStop(0,`rgba(120,255,230,${(0.45*br).toFixed(3)})`); rg.addColorStop(1,'rgba(67,224,200,0)'); ctx.fillStyle=rg; circ(lx,ly,rr); ctx.fill(); }
  lampBurst(i,lx,ly); }
function drawMastPainted(){ const z=Z(); const mx=41.75; const deckX=40.9, gy=ground(deckX);
  pimg('top_deck_camera',deckX,gy+0.02,3.3,0.5,1);
  const [bx,by]=toScreen(mx,ROPE.y0-0.2), [tx,ty]=toScreen(mx,ROPE.top+0.6), [ax]=toScreen(ROPE.x-0.3,0);
  ctx.strokeStyle='#2E3550'; ctx.lineCap='round'; ctx.lineWidth=Math.max(2,z*0.14); ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.lineTo(ax,ty); ctx.stroke();
  ctx.strokeStyle='#4A5272'; ctx.lineWidth=Math.max(1,z*0.05); ctx.beginPath(); ctx.moveTo(bx-z*0.04,by); ctx.lineTo(tx-z*0.04,ty); ctx.stroke();
  const [mxs,mys]=toScreen(ROPE.x,ROPE.top+0.38); ctx.fillStyle=COL.charcoal; rrect(mxs-z*0.45,mys-z*0.24,z*0.9,z*0.48,z*0.12); ctx.fill(); ctx.fillStyle='#FFC83D'; rrect(mxs-z*0.45,mys-z*0.24,z*0.9,z*0.1,z*0.05); ctx.fill();
  ctx.fillStyle='#8FD8E6'; circ(mxs-z*0.2,mys+z*0.02,z*0.12); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.7)'; circ(mxs-z*0.24,mys-z*0.02,z*0.04); ctx.fill();
  if(world.mountFlash>0){ ctx.fillStyle=`rgba(255,226,140,${world.mountFlash})`; circ(mxs-z*0.2,mys,z*0.9*world.mountFlash+z*0.2); ctx.fill(); }
  ropeAndRuler(z); }
export function gondolaPos(){ const g=world.gondola; if(g.mode==='parked') return GONDOLA_DOCK; if(g.mode==='move') return [g.x,g.y]; let d=g.d,i=0; while(i<3&&d>SPANS[i].len){ d-=SPANS[i].len; i++; } d=Math.min(d,SPANS[i].len); const p=spanPoint(i,d); return [p.x,p.y+0.05]; }
function drawGondolaPainted(){ const g=world.gondola; if(g.alpha<=0) return; const [x,y]=gondolaPos(); const sw=g.mode==='ride'?Math.sin(world.t*2.2)*0.03:0; pimg(g.variant||'gondola_closed_empty',x,y,1.85,0.5,0.0,{alpha:g.alpha,rot:sw}); }
function drawOperator(){ const o=world.operator; if(!o.visible) return; psheet('operator_'+o.anim, world.t*6, o.x, 0.02, 2.05, 0.5, 278/288); }
function drawKidsPainted(){ if(!world.kidsVisible) return; world.kids.forEach((k,i)=>{ if(k.alpha<=0) return; const an=(k.n<=4)?k.anim:'idle'; const fps=an==='idle'?6:10; const name=`kid_0${k.n}_${an}`;
  const [sx,sy]=toScreen(k.x+k.dx,0); const z=Z(); ctx.fillStyle='rgba(30,50,40,0.22)'; ctx.beginPath(); ctx.ellipse(sx,sy,z*0.32,z*0.07,0,0,Math.PI*2); ctx.globalAlpha=k.alpha; ctx.fill(); ctx.globalAlpha=1;
  psheet(name, world.t*fps+k.f0, k.x+k.dx, 0.02+k.dy+k.hop, 1.4, 0.5, 277/288, {alpha:k.alpha}); }); }
const BFLY=[['butterfly_coral_flap',-1.2,1.3,0],['butterfly_yellow_flap',-9.5,1.8,2.1],['butterfly_yellow_flap',11.6,ground(11.6)+1.0,1.3],['butterfly_coral_flap',21.2,ground(21.2)+1.1,3.7],['butterfly_yellow_flap',30.6,ground(30.6)+1.2,5.1]];
function drawButterflies(){ const z=Z(); if(z<55) return; BFLY.forEach(([n,x,y,ph])=>{ const tt=world.t*0.7+ph; psheet(n,world.t*10,x+Math.sin(tt)*1.4,y+Math.sin(tt*2.3)*0.35,0.42,0.5,0.5,{flip:Math.cos(tt)<0}); }); }
function drawSwallows(){ const z=Z(); if(z<70) return; const T=42, tt=(world.t%T)/T; if(tt>0.4) return; const c=world.cam, f=tt/0.4; // a small pair crosses closer views now and then
  const x=c.x-world.W/2/z-1+f*(world.W/z+2), y=c.y+world.H*0.3/z+Math.sin(f*8)*0.25; psheet('bird_flock_flap',world.t*9,x,y,1.0,0.5,0.5); }
function drawBirds(){ drawSwallows(); const z=Z(); if(z>70) return; const T=36, tt=(world.t%T)/T; if(tt>0.55) return; const x=-20+tt/0.55*80, y=26+Math.sin(tt*9)*1.2; psheet('bird_flock_flap',world.t*8,x,y,2.2,0.5,0.5); }
export function addFX(name,x,y,h=1.2,o={}){ const m=PKM[name]; if(!m) return; world.fx.push({name,x,y,h,t:0,fps:o.fps||m.fps||12,frames:m.frames,ay:name==='vfx_dust_puff'?1:0.5,follow:o.follow}); }
function drawFX(){ world.fx=world.fx.filter(f=>f.t*f.fps<f.frames); world.fx.forEach(f=>{ let x=f.x,y=f.y; if(f.follow){ const p=f.follow(); x=p[0]; y=p[1]; } psheet(f.name,f.t*f.fps,x,y,f.h,0.5,f.ay); }); }
export function updFX(dt){ world.fx.forEach(f=>f.t+=dt); return world.fx.length>0; }
export function eyesFor(b){ if(b.dim) return 'bot_eyes_sleepy'; if(b.blink>0) return 'bot_eyes_blink'; return 'bot_eyes_'+(b.expr||'idle'); }

export function initCliff(){ const im=pk('cliff_texture'); if(im&&!ART.cliff){ ART.cliff=ctx.createPattern(im,'repeat'); } }
